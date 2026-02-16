package repository

import (
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/k1ngErr0r/ITSecBase/api/internal/model"
)

func TestDrPlanRepo_CreateAndGetByID(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewDrPlanRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		p := &model.DrPlan{
			OrgID:    orgID,
			Name:     "Main DR Plan",
			Scope:    "All critical systems",
			Version:  "1.0",
			Playbook: "Step 1: ...",
			Status:   "draft",
		}
		if err := repo.Create(ctx, tx, p); err != nil {
			return err
		}
		if p.ID == "" {
			t.Error("expected ID to be set")
		}

		got, err := repo.GetByID(ctx, tx, p.ID)
		if err != nil {
			return err
		}
		if got.Name != "Main DR Plan" {
			t.Errorf("Name = %q, want %q", got.Name, "Main DR Plan")
		}
		if got.Scope != "All critical systems" {
			t.Errorf("Scope = %q, want %q", got.Scope, "All critical systems")
		}
		if got.Status != "draft" {
			t.Errorf("Status = %q, want %q", got.Status, "draft")
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestDrPlanRepo_ListWithFilters(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewDrPlanRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		plans := []*model.DrPlan{
			{OrgID: orgID, Name: "Plan A", Status: "active"},
			{OrgID: orgID, Name: "Plan B", Status: "draft"},
			{OrgID: orgID, Name: "Plan C", Status: "active"},
		}
		for _, p := range plans {
			if err := repo.Create(ctx, tx, p); err != nil {
				return err
			}
		}

		// Filter by status
		status := "active"
		results, pr, err := repo.List(ctx, tx, PaginationParams{First: 10}, &DrPlanFilter{Status: &status})
		if err != nil {
			return err
		}
		if len(results) != 2 {
			t.Errorf("status filter: got %d, want 2", len(results))
		}
		if pr.TotalCount != 2 {
			t.Errorf("TotalCount = %d, want 2", pr.TotalCount)
		}

		// No filter
		all, pr2, err := repo.List(ctx, tx, PaginationParams{First: 10}, nil)
		if err != nil {
			return err
		}
		if len(all) != 3 {
			t.Errorf("no filter: got %d, want 3", len(all))
		}
		if pr2.TotalCount != 3 {
			t.Errorf("TotalCount = %d, want 3", pr2.TotalCount)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestDrPlanRepo_Update(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewDrPlanRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		p := &model.DrPlan{OrgID: orgID, Name: "Before", Status: "draft"}
		if err := repo.Create(ctx, tx, p); err != nil {
			return err
		}
		p.Name = "After"
		p.Status = "active"
		p.Scope = "Updated scope"
		rto := 120
		p.RTOMinutes = &rto
		if err := repo.Update(ctx, tx, p); err != nil {
			return err
		}
		got, err := repo.GetByID(ctx, tx, p.ID)
		if err != nil {
			return err
		}
		if got.Name != "After" {
			t.Errorf("Name = %q, want %q", got.Name, "After")
		}
		if got.Status != "active" {
			t.Errorf("Status = %q, want %q", got.Status, "active")
		}
		if got.RTOMinutes == nil || *got.RTOMinutes != 120 {
			t.Errorf("RTOMinutes = %v, want 120", got.RTOMinutes)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestDrPlanRepo_Delete(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewDrPlanRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		p := &model.DrPlan{OrgID: orgID, Name: "ToDelete", Status: "draft"}
		if err := repo.Create(ctx, tx, p); err != nil {
			return err
		}
		if err := repo.Delete(ctx, tx, p.ID); err != nil {
			return err
		}
		_, err := repo.GetByID(ctx, tx, p.ID)
		if err == nil {
			t.Error("expected error getting deleted plan")
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestDrPlanRepo_TestCRUD(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewDrPlanRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		p := &model.DrPlan{OrgID: orgID, Name: "TestPlan", Status: "active"}
		if err := repo.Create(ctx, tx, p); err != nil {
			return err
		}

		planned := time.Now().Add(7 * 24 * time.Hour)
		dt := &model.DrTest{
			DrPlanID:     p.ID,
			TestType:     "tabletop",
			PlannedDate:  &planned,
			Result:       "pending",
			Observations: "Initial plan",
		}
		if err := repo.CreateTest(ctx, tx, dt); err != nil {
			return err
		}
		if dt.ID == "" {
			t.Error("test ID should be set")
		}

		tests, err := repo.ListTests(ctx, tx, p.ID)
		if err != nil {
			return err
		}
		if len(tests) != 1 {
			t.Errorf("ListTests returned %d, want 1", len(tests))
		}

		now := time.Now()
		dt.ActualDate = &now
		dt.Result = "passed"
		dt.Observations = "All objectives met"
		if err := repo.UpdateTest(ctx, tx, dt); err != nil {
			return err
		}

		tests2, err := repo.ListTests(ctx, tx, p.ID)
		if err != nil {
			return err
		}
		if tests2[0].Result != "passed" {
			t.Errorf("Result = %q, want %q", tests2[0].Result, "passed")
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestDrPlanRepo_LinkAssetAndGetLinkedIDs(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewDrPlanRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		p := &model.DrPlan{OrgID: orgID, Name: "AssetPlan", Status: "active"}
		if err := repo.Create(ctx, tx, p); err != nil {
			return err
		}

		a1 := createTestAsset(t, ctx, tx, orgID, "DR Asset 1")
		a2 := createTestAsset(t, ctx, tx, orgID, "DR Asset 2")

		if err := repo.LinkAsset(ctx, tx, p.ID, a1.ID); err != nil {
			return err
		}
		if err := repo.LinkAsset(ctx, tx, p.ID, a2.ID); err != nil {
			return err
		}
		// Duplicate link should not error
		if err := repo.LinkAsset(ctx, tx, p.ID, a1.ID); err != nil {
			return err
		}

		ids, err := repo.GetLinkedAssetIDs(ctx, tx, p.ID)
		if err != nil {
			return err
		}
		if len(ids) != 2 {
			t.Errorf("GetLinkedAssetIDs returned %d, want 2", len(ids))
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}
