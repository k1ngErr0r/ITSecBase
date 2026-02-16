package repository

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/k1ngErr0r/ITSecBase/api/internal/model"
)

func TestDashboardRepo_GetVulnOverview(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	dashRepo := NewDashboardRepo()
	vulnRepo := NewVulnerabilityRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		vulns := []*model.Vulnerability{
			{OrgID: orgID, Title: "V1", Severity: "critical", Status: "new"},
			{OrgID: orgID, Title: "V2", Severity: "high", Status: "new"},
			{OrgID: orgID, Title: "V3", Severity: "low", Status: "closed"},
		}
		for _, v := range vulns {
			if err := vulnRepo.Create(ctx, tx, v); err != nil {
				return err
			}
		}

		overview, err := dashRepo.GetVulnOverview(ctx, tx)
		if err != nil {
			return err
		}
		if overview == nil {
			t.Fatal("GetVulnOverview returned nil")
		}
		// At least our 2 open vulns should show up (global query)
		if overview.TotalOpen < 2 {
			t.Errorf("TotalOpen = %d, want >= 2", overview.TotalOpen)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestDashboardRepo_GetIncidentSummary(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	dashRepo := NewDashboardRepo()
	incRepo := NewIncidentRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		past := time.Now().Add(-48 * time.Hour)
		incidents := []*model.Incident{
			{OrgID: orgID, Name: "Inc1", Status: "new", ImpactRating: "critical", SLADeadline: &past},
			{OrgID: orgID, Name: "Inc2", Status: "triage"},
			{OrgID: orgID, Name: "Inc3", Status: "closed"},
		}
		for _, inc := range incidents {
			if err := incRepo.Create(ctx, tx, inc); err != nil {
				return err
			}
		}

		summary, err := dashRepo.GetIncidentSummary(ctx, tx)
		if err != nil {
			return err
		}
		if summary == nil {
			t.Fatal("GetIncidentSummary returned nil")
		}
		if summary.OpenCount < 2 {
			t.Errorf("OpenCount = %d, want >= 2", summary.OpenCount)
		}
		if summary.SLABreaches < 1 {
			t.Errorf("SLABreaches = %d, want >= 1", summary.SLABreaches)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestDashboardRepo_GetDrReadiness(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	dashRepo := NewDashboardRepo()
	drRepo := NewDrPlanRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		p := &model.DrPlan{OrgID: orgID, Name: "Readiness Plan", Status: "active"}
		if err := drRepo.Create(ctx, tx, p); err != nil {
			return err
		}

		past := time.Now().Add(-24 * time.Hour)
		dt := &model.DrTest{
			DrPlanID:    p.ID,
			TestType:    "full",
			PlannedDate: &past,
			ActualDate:  &past,
			Result:      "passed",
		}
		if err := drRepo.CreateTest(ctx, tx, dt); err != nil {
			return err
		}

		readiness, err := dashRepo.GetDrReadiness(ctx, tx)
		if err != nil {
			return err
		}
		if readiness == nil {
			t.Fatal("GetDrReadiness returned nil")
		}
		if readiness.ActivePlans < 1 {
			t.Errorf("ActivePlans = %d, want >= 1", readiness.ActivePlans)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestDashboardRepo_GetMyTasks(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	dashRepo := NewDashboardRepo()
	vulnRepo := NewVulnerabilityRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		user := createTestUser(t, ctx, tx, orgID, "tasks@example.com")

		v := &model.Vulnerability{
			OrgID:    orgID,
			Title:    "My Vuln",
			Severity: "high",
			Status:   "new",
			OwnerID:  &user.ID,
		}
		if err := vulnRepo.Create(ctx, tx, v); err != nil {
			return err
		}

		tasks, err := dashRepo.GetMyTasks(ctx, tx, user.ID)
		if err != nil {
			return err
		}
		if tasks == nil {
			t.Fatal("GetMyTasks returned nil")
		}
		if tasks.Vulnerabilities < 1 {
			t.Errorf("Vulnerabilities = %d, want >= 1", tasks.Vulnerabilities)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestDashboardRepo_LayoutSaveAndGet(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	dashRepo := NewDashboardRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		user := createTestUser(t, ctx, tx, orgID, "layout@example.com")

		layout := json.RawMessage(`{"widgets":["vulns","incidents"]}`)
		if err := dashRepo.SaveLayout(ctx, tx, user.ID, layout); err != nil {
			return err
		}

		got, err := dashRepo.GetLayout(ctx, tx, user.ID)
		if err != nil {
			return err
		}
		if string(got) != string(layout) {
			t.Errorf("layout = %s, want %s", got, layout)
		}

		// Update layout
		layout2 := json.RawMessage(`{"widgets":["risks"]}`)
		if err := dashRepo.SaveLayout(ctx, tx, user.ID, layout2); err != nil {
			return err
		}
		got2, err := dashRepo.GetLayout(ctx, tx, user.ID)
		if err != nil {
			return err
		}
		if string(got2) != string(layout2) {
			t.Errorf("updated layout = %s, want %s", got2, layout2)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestDashboardRepo_CveFeed(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	_, ctx := setupTestOrg(t)
	dashRepo := NewDashboardRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		now := time.Now()
		score := 9.8
		entry := &model.CveFeedEntry{
			CveID:            "CVE-2025-0001",
			Score:            &score,
			AffectedProducts: []string{"Product A", "Product B"},
			PublishedDate:    &now,
			Link:             "https://example.com/cve-2025-0001",
		}
		if err := dashRepo.UpsertCveEntry(ctx, tx, entry); err != nil {
			return err
		}

		// Upsert again — should update
		score2 := 8.5
		entry.Score = &score2
		if err := dashRepo.UpsertCveEntry(ctx, tx, entry); err != nil {
			return err
		}

		entries, err := dashRepo.ListCveFeed(ctx, tx, 10)
		if err != nil {
			return err
		}
		found := false
		for _, e := range entries {
			if e.CveID == "CVE-2025-0001" {
				found = true
				if e.Score == nil || *e.Score != 8.5 {
					t.Errorf("Score = %v, want 8.5", e.Score)
				}
			}
		}
		if !found {
			t.Error("CVE-2025-0001 not found in feed")
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestDashboardRepo_SavedViews(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	dashRepo := NewDashboardRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		user := createTestUser(t, ctx, tx, orgID, "views@example.com")

		v := &model.SavedView{
			OrgID:        orgID,
			UserID:       user.ID,
			EntityType:   "vulnerability",
			Name:         "Critical Vulns",
			FilterConfig: json.RawMessage(`{"severity":"critical"}`),
			IsDefault:    true,
		}
		if err := dashRepo.CreateSavedView(ctx, tx, v); err != nil {
			return err
		}
		if v.ID == "" {
			t.Error("expected saved view ID to be set")
		}

		views, err := dashRepo.ListSavedViews(ctx, tx, user.ID, "vulnerability")
		if err != nil {
			return err
		}
		if len(views) != 1 {
			t.Errorf("ListSavedViews returned %d, want 1", len(views))
		}
		if views[0].Name != "Critical Vulns" {
			t.Errorf("Name = %q, want %q", views[0].Name, "Critical Vulns")
		}

		// Delete
		if err := dashRepo.DeleteSavedView(ctx, tx, v.ID); err != nil {
			return err
		}
		views2, err := dashRepo.ListSavedViews(ctx, tx, user.ID, "vulnerability")
		if err != nil {
			return err
		}
		if len(views2) != 0 {
			t.Errorf("after delete, ListSavedViews returned %d, want 0", len(views2))
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}
