package repository

import (
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/k1ngErr0r/ITSecBase/api/internal/model"
)

func TestRiskRepo_CreateAndGetByID(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewRiskRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		r := &model.Risk{
			OrgID:              orgID,
			Title:              "Data Breach Risk",
			Description:        "Unauthorized access to PII",
			Category:           "security",
			InherentLikelihood: 4,
			InherentImpact:     5,
			ResidualLikelihood: 2,
			ResidualImpact:     3,
			Status:             "identified",
		}
		if err := repo.Create(ctx, tx, r); err != nil {
			return err
		}
		if r.ID == "" {
			t.Error("expected ID to be set")
		}

		got, err := repo.GetByID(ctx, tx, r.ID)
		if err != nil {
			return err
		}
		if got.Title != "Data Breach Risk" {
			t.Errorf("Title = %q, want %q", got.Title, "Data Breach Risk")
		}
		if got.InherentLikelihood != 4 {
			t.Errorf("InherentLikelihood = %d, want 4", got.InherentLikelihood)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestRiskRepo_ListWithFilters(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewRiskRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		risks := []*model.Risk{
			{OrgID: orgID, Title: "Risk A", Category: "security", Status: "identified"},
			{OrgID: orgID, Title: "Risk B", Category: "operational", Status: "identified"},
			{OrgID: orgID, Title: "Risk C", Category: "security", Status: "accepted"},
		}
		for _, r := range risks {
			if err := repo.Create(ctx, tx, r); err != nil {
				return err
			}
		}

		cat := "security"
		results, pr, err := repo.List(ctx, tx, PaginationParams{First: 10}, &RiskFilter{Category: &cat})
		if err != nil {
			return err
		}
		if len(results) != 2 {
			t.Errorf("category filter: got %d, want 2", len(results))
		}
		if pr.TotalCount != 2 {
			t.Errorf("TotalCount = %d, want 2", pr.TotalCount)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestRiskRepo_Update(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewRiskRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		r := &model.Risk{OrgID: orgID, Title: "Before", Status: "identified"}
		if err := repo.Create(ctx, tx, r); err != nil {
			return err
		}
		r.Title = "After"
		r.Status = "assessed"
		r.ResidualLikelihood = 3
		if err := repo.Update(ctx, tx, r); err != nil {
			return err
		}
		got, err := repo.GetByID(ctx, tx, r.ID)
		if err != nil {
			return err
		}
		if got.Title != "After" {
			t.Errorf("Title = %q, want %q", got.Title, "After")
		}
		if got.Status != "assessed" {
			t.Errorf("Status = %q, want %q", got.Status, "assessed")
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestRiskRepo_Delete(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewRiskRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		r := &model.Risk{OrgID: orgID, Title: "ToDelete", Status: "identified"}
		if err := repo.Create(ctx, tx, r); err != nil {
			return err
		}
		if err := repo.Delete(ctx, tx, r.ID); err != nil {
			return err
		}
		_, err := repo.GetByID(ctx, tx, r.ID)
		if err == nil {
			t.Error("expected error after deleting risk")
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestRiskRepo_TreatmentCRUD(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewRiskRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		r := &model.Risk{OrgID: orgID, Title: "TreatmentRisk", Status: "identified"}
		if err := repo.Create(ctx, tx, r); err != nil {
			return err
		}

		tr := &model.RiskTreatment{
			RiskID: r.ID,
			Action: "Implement MFA",
			Status: "open",
		}
		if err := repo.CreateTreatment(ctx, tx, tr); err != nil {
			return err
		}
		if tr.ID == "" {
			t.Error("treatment ID should be set")
		}

		treatments, err := repo.ListTreatments(ctx, tx, r.ID)
		if err != nil {
			return err
		}
		if len(treatments) != 1 {
			t.Errorf("ListTreatments returned %d, want 1", len(treatments))
		}

		tr.Action = "Implement MFA and SSO"
		tr.Status = "in_progress"
		if err := repo.UpdateTreatment(ctx, tx, tr); err != nil {
			return err
		}

		got, err := repo.GetTreatment(ctx, tx, tr.ID)
		if err != nil {
			return err
		}
		if got.Action != "Implement MFA and SSO" {
			t.Errorf("Action = %q, want %q", got.Action, "Implement MFA and SSO")
		}

		if err := repo.DeleteTreatment(ctx, tx, tr.ID); err != nil {
			return err
		}
		treatments2, err := repo.ListTreatments(ctx, tx, r.ID)
		if err != nil {
			return err
		}
		if len(treatments2) != 0 {
			t.Errorf("after delete, ListTreatments returned %d, want 0", len(treatments2))
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestRiskRepo_LinkAssetAndGetLinkedIDs(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewRiskRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		r := &model.Risk{OrgID: orgID, Title: "LinkedRisk", Status: "identified"}
		if err := repo.Create(ctx, tx, r); err != nil {
			return err
		}
		a := createTestAsset(t, ctx, tx, orgID, "Risk Asset")

		if err := repo.LinkAsset(ctx, tx, r.ID, a.ID); err != nil {
			return err
		}

		ids, err := repo.GetLinkedAssetIDs(ctx, tx, r.ID)
		if err != nil {
			return err
		}
		if len(ids) != 1 || ids[0] != a.ID {
			t.Errorf("GetLinkedAssetIDs = %v, want [%s]", ids, a.ID)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestRiskRepo_LinkControlAndGetLinkedIDs(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewRiskRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		r := &model.Risk{OrgID: orgID, Title: "ControlRisk", Status: "identified"}
		if err := repo.Create(ctx, tx, r); err != nil {
			return err
		}

		// Get an ISO control from seed data
		var controlID string
		err := tx.QueryRow(ctx, "SELECT id FROM iso_controls LIMIT 1").Scan(&controlID)
		if err != nil {
			t.Skip("no ISO controls seeded, skipping control link test")
			return nil
		}

		if err := repo.LinkControl(ctx, tx, r.ID, controlID); err != nil {
			return err
		}

		ids, err := repo.GetLinkedControlIDs(ctx, tx, r.ID)
		if err != nil {
			return err
		}
		if len(ids) != 1 || ids[0] != controlID {
			t.Errorf("GetLinkedControlIDs = %v, want [%s]", ids, controlID)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestRiskRepo_GetHeatmapData(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewRiskRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		risks := []*model.Risk{
			{OrgID: orgID, Title: "H1", ResidualLikelihood: 3, ResidualImpact: 4, Status: "identified"},
			{OrgID: orgID, Title: "H2", ResidualLikelihood: 3, ResidualImpact: 4, Status: "identified"},
			{OrgID: orgID, Title: "H3", ResidualLikelihood: 1, ResidualImpact: 2, Status: "identified"},
		}
		for _, r := range risks {
			if err := repo.Create(ctx, tx, r); err != nil {
				return err
			}
		}

		cells, err := repo.GetHeatmapData(ctx, tx)
		if err != nil {
			return err
		}
		if len(cells) < 2 {
			t.Errorf("GetHeatmapData returned %d cells, want at least 2", len(cells))
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}
