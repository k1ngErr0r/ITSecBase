package database

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/jmcintyre/secbase/api/internal/middleware"
	"github.com/pressly/goose/v3"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

//go:embed migrations/*.sql
var migrations embed.FS

// DB wraps a pgx connection pool and provides helpers for
// transactional access with RLS tenant context.
type DB struct {
	Pool *pgxpool.Pool
}

// NewDB creates a new database connection pool.
func NewDB(ctx context.Context, connString string) (*DB, error) {
	config, err := pgxpool.ParseConfig(connString)
	if err != nil {
		return nil, fmt.Errorf("parse db config: %w", err)
	}

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("create db pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping db: %w", err)
	}

	slog.Info("database connected", "host", config.ConnConfig.Host, "database", config.ConnConfig.Database)
	return &DB{Pool: pool}, nil
}

// Close shuts down the connection pool.
func (db *DB) Close() {
	db.Pool.Close()
}

var dbTracer = otel.Tracer("secbase-api/database")

// WithTx executes fn within a transaction. If the context carries an org_id
// (set by auth/tenant middleware), it sets the PostgreSQL session variable
// for Row-Level Security before executing fn. Creates an OTel span for
// database transaction visibility.
func (db *DB) WithTx(ctx context.Context, fn func(tx pgx.Tx) error) error {
	ctx, span := dbTracer.Start(ctx, "db.transaction",
		trace.WithSpanKind(trace.SpanKindClient),
		trace.WithAttributes(
			attribute.String("db.system", "postgresql"),
		),
	)
	defer span.End()

	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		span.RecordError(err)
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() {
		if err := tx.Rollback(ctx); err != nil && err != pgx.ErrTxClosed {
			slog.Error("rollback failed", "error", err)
		}
	}()

	// Set RLS context if org_id is present
	if orgID, ok := middleware.OrgIDFromContext(ctx); ok {
		span.SetAttributes(attribute.String("tenant.org_id", orgID))
		if _, err := tx.Exec(ctx, "SELECT set_config('app.current_org_id', $1, true)", orgID); err != nil {
			span.RecordError(err)
			return fmt.Errorf("set tenant context: %w", err)
		}
	}

	if err := fn(tx); err != nil {
		span.RecordError(err)
		return err
	}

	return tx.Commit(ctx)
}

// RunMigrations applies all pending database migrations using goose.
func RunMigrations(connString string) error {
	goose.SetBaseFS(migrations)

	db, err := sql.Open("pgx", connString)
	if err != nil {
		return fmt.Errorf("open db for migrations: %w", err)
	}
	defer db.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("set goose dialect: %w", err)
	}

	if err := goose.Up(db, "migrations"); err != nil {
		return fmt.Errorf("run migrations: %w", err)
	}

	slog.Info("database migrations applied successfully")
	return nil
}
