package repository

import (
	"context"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/k1ngErr0r/ITSecBase/api/internal/database"
	"github.com/k1ngErr0r/ITSecBase/api/internal/middleware"
	"github.com/k1ngErr0r/ITSecBase/api/internal/model"

	"github.com/jackc/pgx/v5"
)

var testDB *database.DB

func TestMain(m *testing.M) {
	host := getTestEnv("POSTGRES_HOST", "localhost")
	port := getTestEnv("POSTGRES_PORT", "5432")
	user := getTestEnv("POSTGRES_USER", "secbase")
	pass := getTestEnv("POSTGRES_PASSWORD", "changeme_in_production")
	dbName := getTestEnv("POSTGRES_DB", "secbase_test")
	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, pass, host, port, dbName)

	if err := database.RunMigrations(dsn); err != nil {
		fmt.Fprintf(os.Stderr, "migration error (skipping repo tests): %v\n", err)
		os.Exit(0)
	}

	ctx := context.Background()
	db, err := database.NewDB(ctx, dsn)
	if err != nil {
		fmt.Fprintf(os.Stderr, "db connect error (skipping repo tests): %v\n", err)
		os.Exit(0)
	}
	testDB = db
	code := m.Run()
	testDB.Close()
	os.Exit(code)
}

func getTestEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// setupTestOrg creates a test organization and returns the org ID and a context
// with that org ID set for RLS. It cleans up the org (and all cascading data)
// when the test completes.
func setupTestOrg(t *testing.T) (string, context.Context) {
	t.Helper()
	ctx := context.Background()

	slug := fmt.Sprintf("test-%d", time.Now().UnixNano())
	// Sanitise test name for slug (remove slashes, spaces)
	safeName := strings.NewReplacer("/", "-", " ", "-", "#", "").Replace(t.Name())
	if len(safeName) > 30 {
		safeName = safeName[:30]
	}
	slug = safeName + "-" + slug

	var orgID string
	err := testDB.Pool.QueryRow(ctx,
		"INSERT INTO organisations (name, slug) VALUES ($1, $2) RETURNING id",
		"Test Org "+t.Name(), slug,
	).Scan(&orgID)
	if err != nil {
		t.Fatalf("create test org: %v", err)
	}
	t.Cleanup(func() {
		testDB.Pool.Exec(context.Background(), "DELETE FROM organisations WHERE id = $1", orgID)
	})
	return orgID, middleware.WithOrgID(ctx, orgID)
}

// createTestUser is a helper to create a user for FK references.
func createTestUser(t *testing.T, ctx context.Context, tx pgx.Tx, orgID, email string) *model.User {
	t.Helper()
	u := &model.User{
		OrgID:        orgID,
		Email:        email,
		PasswordHash: "testhash",
		DisplayName:  "Test User",
		Status:       "active",
	}
	repo := NewUserRepo()
	if err := repo.Create(ctx, tx, u); err != nil {
		t.Fatalf("create test user: %v", err)
	}
	return u
}

// createTestAsset is a helper to create an asset for FK references.
func createTestAsset(t *testing.T, ctx context.Context, tx pgx.Tx, orgID, name string) *model.Asset {
	t.Helper()
	a := &model.Asset{
		OrgID:     orgID,
		Name:      name,
		AssetType: "server",
		Status:    "active",
	}
	repo := NewAssetRepo()
	if err := repo.Create(ctx, tx, a); err != nil {
		t.Fatalf("create test asset: %v", err)
	}
	return a
}
