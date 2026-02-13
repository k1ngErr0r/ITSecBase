package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jmcintyre/secbase/api/internal/model"
)

type IsoControlRepo struct{}

func NewIsoControlRepo() *IsoControlRepo {
	return &IsoControlRepo{}
}

// GetByID returns a reference ISO control.
func (r *IsoControlRepo) GetByID(ctx context.Context, tx pgx.Tx, id string) (*model.IsoControl, error) {
	c := &model.IsoControl{}
	err := tx.QueryRow(ctx, `
		SELECT id, control_id, name, theme, description, is_reference
		FROM iso_controls WHERE id = $1
	`, id).Scan(&c.ID, &c.ControlID, &c.Name, &c.Theme, &c.Description, &c.IsReference)
	if err != nil {
		return nil, fmt.Errorf("get iso control: %w", err)
	}
	return c, nil
}

// ListControls returns all reference ISO controls, optionally filtered by theme.
func (r *IsoControlRepo) ListControls(ctx context.Context, tx pgx.Tx, theme *string) ([]*model.IsoControl, error) {
	where := "WHERE 1=1"
	args := []any{}
	if theme != nil {
		where += " AND theme = $1"
		args = append(args, *theme)
	}

	rows, err := tx.Query(ctx, fmt.Sprintf(`
		SELECT id, control_id, name, theme, description, is_reference
		FROM iso_controls %s ORDER BY control_id
	`, where), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var controls []*model.IsoControl
	for rows.Next() {
		c := &model.IsoControl{}
		if err := rows.Scan(&c.ID, &c.ControlID, &c.Name, &c.Theme, &c.Description, &c.IsReference); err != nil {
			return nil, err
		}
		controls = append(controls, c)
	}
	return controls, nil
}

// GetOrgControl returns the org-specific SOA entry for a control.
func (r *IsoControlRepo) GetOrgControl(ctx context.Context, tx pgx.Tx, id string) (*model.OrgIsoControl, error) {
	oc := &model.OrgIsoControl{}
	err := tx.QueryRow(ctx, `
		SELECT id, org_id, iso_control_id, applicability, non_applicability_justification,
		       implementation_status, implementation_description, responsible_owner_id,
		       created_at, updated_at
		FROM org_iso_controls WHERE id = $1
	`, id).Scan(
		&oc.ID, &oc.OrgID, &oc.IsoControlID, &oc.Applicability,
		&oc.NonApplicabilityJustification, &oc.ImplementationStatus,
		&oc.ImplementationDescription, &oc.ResponsibleOwnerID,
		&oc.CreatedAt, &oc.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get org iso control: %w", err)
	}
	return oc, nil
}

// GetOrgControlByIsoControlID returns the org-specific entry by reference control ID.
func (r *IsoControlRepo) GetOrgControlByIsoControlID(ctx context.Context, tx pgx.Tx, isoControlID string) (*model.OrgIsoControl, error) {
	oc := &model.OrgIsoControl{}
	err := tx.QueryRow(ctx, `
		SELECT id, org_id, iso_control_id, applicability, non_applicability_justification,
		       implementation_status, implementation_description, responsible_owner_id,
		       created_at, updated_at
		FROM org_iso_controls WHERE iso_control_id = $1
	`, isoControlID).Scan(
		&oc.ID, &oc.OrgID, &oc.IsoControlID, &oc.Applicability,
		&oc.NonApplicabilityJustification, &oc.ImplementationStatus,
		&oc.ImplementationDescription, &oc.ResponsibleOwnerID,
		&oc.CreatedAt, &oc.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return oc, nil
}

// ListOrgControls returns all org-specific SOA entries with optional filters.
func (r *IsoControlRepo) ListOrgControls(ctx context.Context, tx pgx.Tx, params PaginationParams, filter *IsoFilter) ([]*model.OrgIsoControl, PaginationResult, error) {
	limit := NormalizeFirst(&params.First)
	offset, err := DecodeCursor(params.After)
	if err != nil {
		return nil, PaginationResult{}, err
	}

	where := "WHERE 1=1"
	args := []any{}
	argIdx := 1

	if filter != nil {
		if filter.ImplementationStatus != nil {
			where += fmt.Sprintf(" AND oc.implementation_status = $%d", argIdx)
			args = append(args, *filter.ImplementationStatus)
			argIdx++
		}
		if filter.Theme != nil {
			where += fmt.Sprintf(" AND ic.theme = $%d", argIdx)
			args = append(args, *filter.Theme)
			argIdx++
		}
		if filter.Search != nil {
			where += fmt.Sprintf(" AND (ic.name ILIKE $%d OR ic.control_id ILIKE $%d)", argIdx, argIdx)
			args = append(args, "%"+*filter.Search+"%")
			argIdx++
		}
	}

	var totalCount int
	countQ := fmt.Sprintf("SELECT COUNT(*) FROM org_iso_controls oc JOIN iso_controls ic ON oc.iso_control_id = ic.id %s", where)
	if err := tx.QueryRow(ctx, countQ, args...).Scan(&totalCount); err != nil {
		return nil, PaginationResult{}, err
	}

	query := fmt.Sprintf(`
		SELECT oc.id, oc.org_id, oc.iso_control_id, oc.applicability,
		       oc.non_applicability_justification, oc.implementation_status,
		       oc.implementation_description, oc.responsible_owner_id,
		       oc.created_at, oc.updated_at
		FROM org_iso_controls oc JOIN iso_controls ic ON oc.iso_control_id = ic.id
		%s ORDER BY ic.control_id LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)
	args = append(args, limit+1, offset)

	rows, err := tx.Query(ctx, query, args...)
	if err != nil {
		return nil, PaginationResult{}, err
	}
	defer rows.Close()

	var controls []*model.OrgIsoControl
	for rows.Next() {
		oc := &model.OrgIsoControl{}
		if err := rows.Scan(
			&oc.ID, &oc.OrgID, &oc.IsoControlID, &oc.Applicability,
			&oc.NonApplicabilityJustification, &oc.ImplementationStatus,
			&oc.ImplementationDescription, &oc.ResponsibleOwnerID,
			&oc.CreatedAt, &oc.UpdatedAt,
		); err != nil {
			return nil, PaginationResult{}, err
		}
		controls = append(controls, oc)
	}

	hasNext := len(controls) > limit
	if hasNext {
		controls = controls[:limit]
	}

	result := PaginationResult{
		HasNextPage:     hasNext,
		HasPreviousPage: offset > 0,
		TotalCount:      totalCount,
	}
	if len(controls) > 0 {
		result.StartCursor = EncodeCursor(offset)
		result.EndCursor = EncodeCursor(offset + len(controls) - 1)
	}
	return controls, result, nil
}

// UpsertOrgControl creates or updates an org-specific SOA entry.
func (r *IsoControlRepo) UpsertOrgControl(ctx context.Context, tx pgx.Tx, oc *model.OrgIsoControl) error {
	err := tx.QueryRow(ctx, `
		INSERT INTO org_iso_controls (
			org_id, iso_control_id, applicability, non_applicability_justification,
			implementation_status, implementation_description, responsible_owner_id
		) VALUES ($1,$2,$3,$4,$5,$6,$7)
		ON CONFLICT (org_id, iso_control_id) DO UPDATE SET
			applicability = EXCLUDED.applicability,
			non_applicability_justification = EXCLUDED.non_applicability_justification,
			implementation_status = EXCLUDED.implementation_status,
			implementation_description = EXCLUDED.implementation_description,
			responsible_owner_id = EXCLUDED.responsible_owner_id,
			updated_at = now()
		RETURNING id, created_at, updated_at
	`, oc.OrgID, oc.IsoControlID, oc.Applicability, oc.NonApplicabilityJustification,
		oc.ImplementationStatus, oc.ImplementationDescription, oc.ResponsibleOwnerID,
	).Scan(&oc.ID, &oc.CreatedAt, &oc.UpdatedAt)
	return err
}

// Compliance summary

type ComplianceSummary struct {
	Implemented          int
	PartiallyImplemented int
	NotImplemented       int
	NotApplicable        int
}

func (r *IsoControlRepo) GetComplianceSummary(ctx context.Context, tx pgx.Tx) (*ComplianceSummary, error) {
	rows, err := tx.Query(ctx, `
		SELECT implementation_status, COUNT(*)
		FROM org_iso_controls GROUP BY implementation_status
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	s := &ComplianceSummary{}
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return nil, err
		}
		switch status {
		case "implemented":
			s.Implemented = count
		case "partially_implemented":
			s.PartiallyImplemented = count
		case "not_implemented":
			s.NotImplemented = count
		case "not_applicable":
			s.NotApplicable = count
		}
	}
	return s, nil
}

type IsoFilter struct {
	ImplementationStatus *string
	Theme                *string
	Search               *string
}
