package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/jmcintyre/secbase/api/internal/auth"
	"github.com/jmcintyre/secbase/api/internal/config"
	"github.com/jmcintyre/secbase/api/internal/database"
	"github.com/jmcintyre/secbase/api/internal/graph"
	"github.com/jmcintyre/secbase/api/internal/middleware"
	"github.com/jmcintyre/secbase/api/internal/telemetry"
)

func main() {
	// Structured JSON logging
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Optional: Initialize OpenTelemetry
	if cfg.OTel.Endpoint != "" {
		shutdown, err := telemetry.InitTracer(ctx, cfg.OTel.Endpoint, cfg.OTel.ServiceName)
		if err != nil {
			slog.Warn("failed to initialize telemetry, continuing without tracing", "error", err)
		} else {
			defer func() {
				shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer shutdownCancel()
				if err := shutdown(shutdownCtx); err != nil {
					slog.Error("telemetry shutdown error", "error", err)
				}
			}()
		}
	}

	// Run database migrations
	slog.Info("running database migrations")
	if err := database.RunMigrations(cfg.Postgres.DSN()); err != nil {
		slog.Error("failed to run migrations", "error", err)
		os.Exit(1)
	}

	// Connect to database
	db, err := database.NewDB(ctx, cfg.Postgres.DSN())
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	// Setup GraphQL server
	resolver := &graph.Resolver{
		DB:     db,
		Config: cfg,
	}

	// NOTE: generated.NewExecutableSchema will be available after running gqlgen generate.
	// For now, we set up the router structure. The GraphQL handler will be added
	// once the schema is generated.
	_ = resolver

	// Build router
	r := chi.NewRouter()

	// Global middleware
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.RequestLogger)
	r.Use(chimw.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:5173"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Auth and tenant middleware
	r.Use(auth.Middleware(cfg.JWT.Secret))
	r.Use(middleware.TenantMiddleware)

	// GraphQL endpoint
	// TODO: Replace with actual gqlgen handler after running `go run github.com/99designs/gqlgen generate`
	// srv := handler.NewDefaultServer(generated.NewExecutableSchema(generated.Config{Resolvers: resolver}))
	// r.Handle("/graphql", srv)

	// Placeholder handler until gqlgen is generated
	r.Handle("/graphql", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"data":null,"errors":[{"message":"GraphQL schema not yet generated. Run: go run github.com/99designs/gqlgen generate"}]}`))
	}))

	// Playground
	r.Get("/", playground.Handler("SecBase GraphQL", "/graphql"))

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Start server
	srv := &http.Server{
		Addr:         cfg.API.Addr(),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		sig := <-sigCh
		slog.Info("shutdown signal received", "signal", sig)

		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer shutdownCancel()

		if err := srv.Shutdown(shutdownCtx); err != nil {
			slog.Error("server shutdown error", "error", err)
		}
		cancel()
	}()

	slog.Info("starting server", "addr", cfg.API.Addr())
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("server error", "error", err)
		os.Exit(1)
	}

	slog.Info("server stopped")
}

// gqlgenHandler creates the GraphQL handler once generated code is available.
// Uncomment and use after running gqlgen generate.
func gqlgenHandler(resolver *graph.Resolver) http.Handler {
	_ = handler.NewDefaultServer
	// return handler.NewDefaultServer(generated.NewExecutableSchema(generated.Config{Resolvers: resolver}))
	return nil
}
