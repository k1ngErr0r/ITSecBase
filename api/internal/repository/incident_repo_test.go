package repository

import (
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/k1ngErr0r/ITSecBase/api/internal/model"
)

func TestIncidentRepo_CreateAndGetByID(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewIncidentRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		inc := &model.Incident{
			OrgID:        orgID,
			Name:         "Phishing Attack",
			Area:         "email",
			Description:  "Targeted phishing campaign",
			ImpactRating: "high",
			Status:       "new",
		}
		if err := repo.Create(ctx, tx, inc); err != nil {
			return err
		}
		if inc.ID == "" {
			t.Error("expected ID to be set")
		}

		got, err := repo.GetByID(ctx, tx, inc.ID)
		if err != nil {
			return err
		}
		if got.Name != "Phishing Attack" {
			t.Errorf("Name = %q, want %q", got.Name, "Phishing Attack")
		}
		if got.ImpactRating != "high" {
			t.Errorf("ImpactRating = %q, want %q", got.ImpactRating, "high")
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestIncidentRepo_ListWithFilters(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewIncidentRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		incidents := []*model.Incident{
			{OrgID: orgID, Name: "Inc 1", ImpactRating: "high", Status: "new"},
			{OrgID: orgID, Name: "Inc 2", ImpactRating: "low", Status: "new"},
			{OrgID: orgID, Name: "Inc 3", ImpactRating: "high", Status: "closed"},
		}
		for _, inc := range incidents {
			if err := repo.Create(ctx, tx, inc); err != nil {
				return err
			}
		}

		status := "new"
		results, pr, err := repo.List(ctx, tx, PaginationParams{First: 10}, &IncidentFilter{Status: &status})
		if err != nil {
			return err
		}
		if len(results) != 2 {
			t.Errorf("status filter: got %d, want 2", len(results))
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

func TestIncidentRepo_Update(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewIncidentRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		inc := &model.Incident{OrgID: orgID, Name: "Before", Status: "new"}
		if err := repo.Create(ctx, tx, inc); err != nil {
			return err
		}
		inc.Name = "After"
		inc.Status = "triage"
		inc.RootCause = "Misconfigured firewall"
		if err := repo.Update(ctx, tx, inc); err != nil {
			return err
		}
		got, err := repo.GetByID(ctx, tx, inc.ID)
		if err != nil {
			return err
		}
		if got.Name != "After" {
			t.Errorf("Name = %q, want %q", got.Name, "After")
		}
		if got.RootCause != "Misconfigured firewall" {
			t.Errorf("RootCause = %q, want %q", got.RootCause, "Misconfigured firewall")
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestIncidentRepo_ActionCRUD(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewIncidentRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		inc := &model.Incident{OrgID: orgID, Name: "ActionInc", Status: "new"}
		if err := repo.Create(ctx, tx, inc); err != nil {
			return err
		}

		a := &model.IncidentAction{
			IncidentID:  inc.ID,
			ActionType:  "containment",
			Description: "Block IP range",
			Status:      "open",
		}
		if err := repo.CreateAction(ctx, tx, a); err != nil {
			return err
		}
		if a.ID == "" {
			t.Error("action ID should be set")
		}

		actions, err := repo.ListActions(ctx, tx, inc.ID)
		if err != nil {
			return err
		}
		if len(actions) != 1 {
			t.Errorf("ListActions returned %d, want 1", len(actions))
		}

		a.Status = "completed"
		a.Description = "Blocked IP range 10.0.0.0/8"
		if err := repo.UpdateAction(ctx, tx, a); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestIncidentRepo_LinkAssetAndVuln(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	incRepo := NewIncidentRepo()
	vulnRepo := NewVulnerabilityRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		inc := &model.Incident{OrgID: orgID, Name: "LinkedInc", Status: "new"}
		if err := incRepo.Create(ctx, tx, inc); err != nil {
			return err
		}
		a := createTestAsset(t, ctx, tx, orgID, "Inc Asset")
		v := &model.Vulnerability{OrgID: orgID, Title: "Inc Vuln", Severity: "high", Status: "new"}
		if err := vulnRepo.Create(ctx, tx, v); err != nil {
			return err
		}

		if err := incRepo.LinkAsset(ctx, tx, inc.ID, a.ID); err != nil {
			return err
		}
		if err := incRepo.LinkVulnerability(ctx, tx, inc.ID, v.ID); err != nil {
			return err
		}

		assetIDs, err := incRepo.GetLinkedAssetIDs(ctx, tx, inc.ID)
		if err != nil {
			return err
		}
		if len(assetIDs) != 1 || assetIDs[0] != a.ID {
			t.Errorf("GetLinkedAssetIDs = %v, want [%s]", assetIDs, a.ID)
		}

		vulnIDs, err := incRepo.GetLinkedVulnIDs(ctx, tx, inc.ID)
		if err != nil {
			return err
		}
		if len(vulnIDs) != 1 || vulnIDs[0] != v.ID {
			t.Errorf("GetLinkedVulnIDs = %v, want [%s]", vulnIDs, v.ID)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestIncidentRepo_CountByStatus(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewIncidentRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		incidents := []*model.Incident{
			{OrgID: orgID, Name: "S1", Status: "new"},
			{OrgID: orgID, Name: "S2", Status: "new"},
			{OrgID: orgID, Name: "S3", Status: "closed"},
		}
		for _, inc := range incidents {
			if err := repo.Create(ctx, tx, inc); err != nil {
				return err
			}
		}

		counts, err := repo.CountByStatus(ctx, tx)
		if err != nil {
			return err
		}
		// Counts are global (not org-scoped in the query), so just check existence
		if counts == nil {
			t.Error("CountByStatus returned nil")
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestIncidentRepo_CountSLABreaches(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewIncidentRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		past := time.Now().Add(-24 * time.Hour)
		inc := &model.Incident{OrgID: orgID, Name: "SLA Breach", Status: "new", SLADeadline: &past}
		if err := repo.Create(ctx, tx, inc); err != nil {
			return err
		}

		count, err := repo.CountSLABreaches(ctx, tx)
		if err != nil {
			return err
		}
		if count < 1 {
			t.Errorf("CountSLABreaches = %d, want >= 1", count)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}
