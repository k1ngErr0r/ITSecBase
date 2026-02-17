package repository

import (
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/k1ngErr0r/ITSecBase/api/internal/model"
)

func TestIsoControlRepo_ListControls(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	_, ctx := setupTestOrg(t)
	repo := NewIsoControlRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		// iso_controls are seeded by migration — list all
		controls, err := repo.ListControls(ctx, tx, nil)
		if err != nil {
			return err
		}
		if len(controls) == 0 {
			t.Skip("no ISO controls seeded in test DB, skipping")
		}

		// Verify fields are populated
		c := controls[0]
		if c.ID == "" || c.ControlID == "" || c.Name == "" {
			t.Errorf("control fields not populated: ID=%q ControlID=%q Name=%q", c.ID, c.ControlID, c.Name)
		}

		// Filter by theme
		theme := c.Theme
		filtered, err := repo.ListControls(ctx, tx, &theme)
		if err != nil {
			return err
		}
		if len(filtered) == 0 {
			t.Error("theme filter returned 0 results")
		}
		for _, fc := range filtered {
			if fc.Theme != theme {
				t.Errorf("Theme = %q, want %q", fc.Theme, theme)
			}
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestIsoControlRepo_GetByID(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	_, ctx := setupTestOrg(t)
	repo := NewIsoControlRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		controls, err := repo.ListControls(ctx, tx, nil)
		if err != nil {
			return err
		}
		if len(controls) == 0 {
			t.Skip("no ISO controls seeded")
		}

		got, err := repo.GetByID(ctx, tx, controls[0].ID)
		if err != nil {
			return err
		}
		if got.ControlID != controls[0].ControlID {
			t.Errorf("ControlID = %q, want %q", got.ControlID, controls[0].ControlID)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestIsoControlRepo_UpsertOrgControl(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewIsoControlRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		controls, err := repo.ListControls(ctx, tx, nil)
		if err != nil {
			return err
		}
		if len(controls) == 0 {
			t.Skip("no ISO controls seeded")
		}

		oc := &model.OrgIsoControl{
			OrgID:                     orgID,
			IsoControlID:              controls[0].ID,
			Applicability:             "applicable",
			ImplementationStatus:      "implemented",
			ImplementationDescription: "Fully deployed",
		}
		if err := repo.UpsertOrgControl(ctx, tx, oc); err != nil {
			return err
		}
		if oc.ID == "" {
			t.Error("expected org control ID to be set")
		}

		// Upsert again — should update
		oc.ImplementationStatus = "partially_implemented"
		oc.ImplementationDescription = "Work in progress"
		if err := repo.UpsertOrgControl(ctx, tx, oc); err != nil {
			return err
		}

		got, err := repo.GetOrgControl(ctx, tx, oc.ID)
		if err != nil {
			return err
		}
		if got.ImplementationStatus != "partially_implemented" {
			t.Errorf("ImplementationStatus = %q, want %q", got.ImplementationStatus, "partially_implemented")
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestIsoControlRepo_GetOrgControlByIsoControlID(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewIsoControlRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		controls, err := repo.ListControls(ctx, tx, nil)
		if err != nil {
			return err
		}
		if len(controls) == 0 {
			t.Skip("no ISO controls seeded")
		}

		oc := &model.OrgIsoControl{
			OrgID:                orgID,
			IsoControlID:         controls[0].ID,
			Applicability:        "applicable",
			ImplementationStatus: "implemented",
		}
		if err := repo.UpsertOrgControl(ctx, tx, oc); err != nil {
			return err
		}

		got, err := repo.GetOrgControlByIsoControlID(ctx, tx, controls[0].ID)
		if err != nil {
			return err
		}
		if got.ID != oc.ID {
			t.Errorf("ID = %q, want %q", got.ID, oc.ID)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestIsoControlRepo_ListOrgControls(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewIsoControlRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		controls, err := repo.ListControls(ctx, tx, nil)
		if err != nil {
			return err
		}
		if len(controls) < 2 {
			t.Skip("need at least 2 ISO controls seeded")
		}

		// Create two org controls with different statuses
		oc1 := &model.OrgIsoControl{
			OrgID: orgID, IsoControlID: controls[0].ID,
			Applicability: "applicable", ImplementationStatus: "implemented",
		}
		oc2 := &model.OrgIsoControl{
			OrgID: orgID, IsoControlID: controls[1].ID,
			Applicability: "applicable", ImplementationStatus: "not_implemented",
		}
		if err := repo.UpsertOrgControl(ctx, tx, oc1); err != nil {
			return err
		}
		if err := repo.UpsertOrgControl(ctx, tx, oc2); err != nil {
			return err
		}

		// List all
		all, pr, err := repo.ListOrgControls(ctx, tx, PaginationParams{First: 10}, nil)
		if err != nil {
			return err
		}
		if len(all) < 2 {
			t.Errorf("ListOrgControls returned %d, want >= 2", len(all))
		}
		if pr.TotalCount < 2 {
			t.Errorf("TotalCount = %d, want >= 2", pr.TotalCount)
		}

		// Filter by implementation status
		status := "implemented"
		filtered, _, err := repo.ListOrgControls(ctx, tx, PaginationParams{First: 10}, &IsoFilter{ImplementationStatus: &status})
		if err != nil {
			return err
		}
		for _, oc := range filtered {
			if oc.ImplementationStatus != "implemented" {
				t.Errorf("ImplementationStatus = %q, want %q", oc.ImplementationStatus, "implemented")
			}
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestIsoControlRepo_GetComplianceSummary(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}
	orgID, ctx := setupTestOrg(t)
	repo := NewIsoControlRepo()

	err := testDB.WithTx(ctx, func(tx pgx.Tx) error {
		controls, err := repo.ListControls(ctx, tx, nil)
		if err != nil {
			return err
		}
		if len(controls) < 2 {
			t.Skip("need at least 2 ISO controls seeded")
		}

		oc1 := &model.OrgIsoControl{
			OrgID: orgID, IsoControlID: controls[0].ID,
			Applicability: "applicable", ImplementationStatus: "implemented",
		}
		oc2 := &model.OrgIsoControl{
			OrgID: orgID, IsoControlID: controls[1].ID,
			Applicability: "applicable", ImplementationStatus: "not_implemented",
		}
		if err := repo.UpsertOrgControl(ctx, tx, oc1); err != nil {
			return err
		}
		if err := repo.UpsertOrgControl(ctx, tx, oc2); err != nil {
			return err
		}

		summary, err := repo.GetComplianceSummary(ctx, tx)
		if err != nil {
			return err
		}
		if summary == nil {
			t.Fatal("GetComplianceSummary returned nil")
		}
		// Summary is global, so just verify it's populated
		total := summary.Implemented + summary.PartiallyImplemented + summary.NotImplemented + summary.NotApplicable
		if total < 2 {
			t.Errorf("total controls in summary = %d, want >= 2", total)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}
