package repository

import (
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jmcintyre/secbase/api/internal/model"
)

func TestAssetRepo_CreateAndGetByID(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewAssetRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		a := &model.Asset{
			OrgID:       orgID,
			Name:        "Test Server",
			AssetType:   "server",
			Environment: "production",
			Criticality: 3,
			Status:      "active",
			FQDN:        "test.example.com",
		}
		if err := repo.Create(ctx, tx, a); err != nil {
			return err
		}
		if a.ID == "" {
			t.Error("expected ID to be set after create")
		}

		got, err := repo.GetByID(ctx, tx, a.ID)
		if err != nil {
			return err
		}
		if got.Name != "Test Server" {
			t.Errorf("Name = %q, want %q", got.Name, "Test Server")
		}
		if got.AssetType != "server" {
			t.Errorf("AssetType = %q, want %q", got.AssetType, "server")
		}
		if got.Environment != "production" {
			t.Errorf("Environment = %q, want %q", got.Environment, "production")
		}
		if got.Criticality != 3 {
			t.Errorf("Criticality = %d, want 3", got.Criticality)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestAssetRepo_ListWithFilters(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewAssetRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		assets := []*model.Asset{
			{OrgID: orgID, Name: "Prod Server", AssetType: "server", Environment: "production", Status: "active"},
			{OrgID: orgID, Name: "Dev DB", AssetType: "database", Environment: "development", Status: "active"},
			{OrgID: orgID, Name: "Staging App", AssetType: "server", Environment: "staging", Status: "active"},
		}
		for _, a := range assets {
			if err := repo.Create(ctx, tx, a); err != nil {
				return err
			}
		}

		// Filter by type
		serverType := "server"
		results, pr, err := repo.List(ctx, tx, PaginationParams{First: 10}, &AssetFilter{AssetType: &serverType})
		if err != nil {
			return err
		}
		if len(results) != 2 {
			t.Errorf("server filter: got %d, want 2", len(results))
		}
		if pr.TotalCount != 2 {
			t.Errorf("server filter TotalCount = %d, want 2", pr.TotalCount)
		}

		// Filter by search
		search := "Prod"
		results2, _, err := repo.List(ctx, tx, PaginationParams{First: 10}, &AssetFilter{Search: &search})
		if err != nil {
			return err
		}
		if len(results2) != 1 {
			t.Errorf("search filter: got %d, want 1", len(results2))
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestAssetRepo_Update(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewAssetRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		a := &model.Asset{OrgID: orgID, Name: "Before", AssetType: "server", Status: "active"}
		if err := repo.Create(ctx, tx, a); err != nil {
			return err
		}
		a.Name = "After"
		a.Environment = "staging"
		if err := repo.Update(ctx, tx, a); err != nil {
			return err
		}
		got, err := repo.GetByID(ctx, tx, a.ID)
		if err != nil {
			return err
		}
		if got.Name != "After" {
			t.Errorf("Name = %q, want %q", got.Name, "After")
		}
		if got.Environment != "staging" {
			t.Errorf("Environment = %q, want %q", got.Environment, "staging")
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestAssetRepo_Delete(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewAssetRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		a := &model.Asset{OrgID: orgID, Name: "ToDelete", AssetType: "server", Status: "active"}
		if err := repo.Create(ctx, tx, a); err != nil {
			return err
		}
		if err := repo.Delete(ctx, tx, a.ID); err != nil {
			return err
		}
		_, err := repo.GetByID(ctx, tx, a.ID)
		if err == nil {
			t.Error("expected error after deleting asset")
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}
