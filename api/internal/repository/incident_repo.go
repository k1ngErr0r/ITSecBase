package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jmcintyre/secbase/api/internal/model"
)

type IncidentRepo struct{}

func NewIncidentRepo() *IncidentRepo {
	return &IncidentRepo{}
}

func (r *IncidentRepo) GetByID(ctx context.Context, tx pgx.Tx, id string) (*model.Incident, error) {
	inc := &model.Incident{}
	err := tx.QueryRow(ctx, `
		SELECT id, org_id, name, area, description, impact_summary, impact_rating,
		       classification, regulatory_breach, reporter_id, owner_id, status,
		       root_cause, root_cause_category, corrective_actions, preventive_actions,
		       detected_at, opened_at, contained_at, resolved_at, closed_at,
		       sla_deadline, created_at, updated_at
		FROM incidents WHERE id = $1
	`, id).Scan(
		&inc.ID, &inc.OrgID, &inc.Name, &inc.Area, &inc.Description,
		&inc.ImpactSummary, &inc.ImpactRating, &inc.Classification, &inc.RegulatoryBreach,
		&inc.ReporterID, &inc.OwnerID, &inc.Status, &inc.RootCause, &inc.RootCauseCategory,
		&inc.CorrectiveActions, &inc.PreventiveActions, &inc.DetectedAt, &inc.OpenedAt,
		&inc.ContainedAt, &inc.ResolvedAt, &inc.ClosedAt, &inc.SLADeadline,
		&inc.CreatedAt, &inc.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get incident: %w", err)
	}
	return inc, nil
}

func (r *IncidentRepo) List(ctx context.Context, tx pgx.Tx, params PaginationParams, filter *IncidentFilter) ([]*model.Incident, PaginationResult, error) {
	limit := NormalizeFirst(&params.First)
	offset, err := DecodeCursor(params.After)
	if err != nil {
		return nil, PaginationResult{}, err
	}

	where := "WHERE 1=1"
	args := []any{}
	argIdx := 1

	if filter != nil {
		if filter.Status != nil {
			where += fmt.Sprintf(" AND status = $%d", argIdx)
			args = append(args, *filter.Status)
			argIdx++
		}
		if filter.ImpactRating != nil {
			where += fmt.Sprintf(" AND impact_rating = $%d", argIdx)
			args = append(args, *filter.ImpactRating)
			argIdx++
		}
		if filter.OwnerID != nil {
			where += fmt.Sprintf(" AND owner_id = $%d", argIdx)
			args = append(args, *filter.OwnerID)
			argIdx++
		}
		if filter.Search != nil {
			where += fmt.Sprintf(" AND (name ILIKE $%d OR description ILIKE $%d)", argIdx, argIdx)
			args = append(args, "%"+*filter.Search+"%")
			argIdx++
		}
	}

	var totalCount int
	if err := tx.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM incidents %s", where), args...).Scan(&totalCount); err != nil {
		return nil, PaginationResult{}, err
	}

	query := fmt.Sprintf(`
		SELECT id, org_id, name, area, description, impact_summary, impact_rating,
		       classification, regulatory_breach, reporter_id, owner_id, status,
		       root_cause, root_cause_category, corrective_actions, preventive_actions,
		       detected_at, opened_at, contained_at, resolved_at, closed_at,
		       sla_deadline, created_at, updated_at
		FROM incidents %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)
	args = append(args, limit+1, offset)

	rows, err := tx.Query(ctx, query, args...)
	if err != nil {
		return nil, PaginationResult{}, err
	}
	defer rows.Close()

	var incidents []*model.Incident
	for rows.Next() {
		inc := &model.Incident{}
		if err := rows.Scan(
			&inc.ID, &inc.OrgID, &inc.Name, &inc.Area, &inc.Description,
			&inc.ImpactSummary, &inc.ImpactRating, &inc.Classification, &inc.RegulatoryBreach,
			&inc.ReporterID, &inc.OwnerID, &inc.Status, &inc.RootCause, &inc.RootCauseCategory,
			&inc.CorrectiveActions, &inc.PreventiveActions, &inc.DetectedAt, &inc.OpenedAt,
			&inc.ContainedAt, &inc.ResolvedAt, &inc.ClosedAt, &inc.SLADeadline,
			&inc.CreatedAt, &inc.UpdatedAt,
		); err != nil {
			return nil, PaginationResult{}, err
		}
		incidents = append(incidents, inc)
	}

	hasNext := len(incidents) > limit
	if hasNext {
		incidents = incidents[:limit]
	}

	result := PaginationResult{
		HasNextPage:     hasNext,
		HasPreviousPage: offset > 0,
		TotalCount:      totalCount,
	}
	if len(incidents) > 0 {
		result.StartCursor = EncodeCursor(offset)
		result.EndCursor = EncodeCursor(offset + len(incidents) - 1)
	}
	return incidents, result, nil
}

func (r *IncidentRepo) Create(ctx context.Context, tx pgx.Tx, inc *model.Incident) error {
	err := tx.QueryRow(ctx, `
		INSERT INTO incidents (
			org_id, name, area, description, impact_summary, impact_rating,
			classification, regulatory_breach, reporter_id, owner_id, status,
			detected_at, sla_deadline
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		RETURNING id, opened_at, created_at, updated_at
	`, inc.OrgID, inc.Name, inc.Area, inc.Description, inc.ImpactSummary, inc.ImpactRating,
		inc.Classification, inc.RegulatoryBreach, inc.ReporterID, inc.OwnerID, inc.Status,
		inc.DetectedAt, inc.SLADeadline,
	).Scan(&inc.ID, &inc.OpenedAt, &inc.CreatedAt, &inc.UpdatedAt)
	return err
}

func (r *IncidentRepo) Update(ctx context.Context, tx pgx.Tx, inc *model.Incident) error {
	_, err := tx.Exec(ctx, `
		UPDATE incidents SET
			name=$2, area=$3, description=$4, impact_summary=$5, impact_rating=$6,
			classification=$7, regulatory_breach=$8, owner_id=$9, status=$10,
			root_cause=$11, root_cause_category=$12, corrective_actions=$13,
			preventive_actions=$14, contained_at=$15, resolved_at=$16, closed_at=$17,
			sla_deadline=$18, updated_at=now()
		WHERE id = $1
	`, inc.ID, inc.Name, inc.Area, inc.Description, inc.ImpactSummary, inc.ImpactRating,
		inc.Classification, inc.RegulatoryBreach, inc.OwnerID, inc.Status,
		inc.RootCause, inc.RootCauseCategory, inc.CorrectiveActions,
		inc.PreventiveActions, inc.ContainedAt, inc.ResolvedAt, inc.ClosedAt,
		inc.SLADeadline,
	)
	return err
}

func (r *IncidentRepo) Delete(ctx context.Context, tx pgx.Tx, id string) error {
	_, err := tx.Exec(ctx, `DELETE FROM incidents WHERE id = $1`, id)
	return err
}

// Actions

func (r *IncidentRepo) CreateAction(ctx context.Context, tx pgx.Tx, a *model.IncidentAction) error {
	err := tx.QueryRow(ctx, `
		INSERT INTO incident_actions (incident_id, action_type, description, owner_id, due_date, status)
		VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at
	`, a.IncidentID, a.ActionType, a.Description, a.OwnerID, a.DueDate, a.Status,
	).Scan(&a.ID, &a.CreatedAt)
	return err
}

func (r *IncidentRepo) UpdateAction(ctx context.Context, tx pgx.Tx, a *model.IncidentAction) error {
	_, err := tx.Exec(ctx, `
		UPDATE incident_actions SET description=$2, owner_id=$3, due_date=$4, status=$5 WHERE id=$1
	`, a.ID, a.Description, a.OwnerID, a.DueDate, a.Status)
	return err
}

func (r *IncidentRepo) ListActions(ctx context.Context, tx pgx.Tx, incidentID string) ([]*model.IncidentAction, error) {
	rows, err := tx.Query(ctx, `
		SELECT id, incident_id, action_type, description, owner_id, due_date, status, created_at
		FROM incident_actions WHERE incident_id = $1 ORDER BY created_at
	`, incidentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var actions []*model.IncidentAction
	for rows.Next() {
		a := &model.IncidentAction{}
		if err := rows.Scan(&a.ID, &a.IncidentID, &a.ActionType, &a.Description, &a.OwnerID, &a.DueDate, &a.Status, &a.CreatedAt); err != nil {
			return nil, err
		}
		actions = append(actions, a)
	}
	return actions, nil
}

func (r *IncidentRepo) LinkAsset(ctx context.Context, tx pgx.Tx, incidentID, assetID string) error {
	_, err := tx.Exec(ctx, `INSERT INTO incident_assets (incident_id, asset_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, incidentID, assetID)
	return err
}

func (r *IncidentRepo) LinkVulnerability(ctx context.Context, tx pgx.Tx, incidentID, vulnID string) error {
	_, err := tx.Exec(ctx, `INSERT INTO incident_vulnerabilities (incident_id, vulnerability_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, incidentID, vulnID)
	return err
}

// Summary queries

func (r *IncidentRepo) CountByStatus(ctx context.Context, tx pgx.Tx) (map[string]int, error) {
	rows, err := tx.Query(ctx, `SELECT status, COUNT(*) FROM incidents GROUP BY status`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make(map[string]int)
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return nil, err
		}
		counts[status] = count
	}
	return counts, nil
}

func (r *IncidentRepo) CountSLABreaches(ctx context.Context, tx pgx.Tx) (int, error) {
	var count int
	err := tx.QueryRow(ctx, `
		SELECT COUNT(*) FROM incidents
		WHERE sla_deadline < now() AND status NOT IN ('closed', 'lessons_learned')
	`).Scan(&count)
	return count, err
}

func (r *IncidentRepo) GetLinkedAssetIDs(ctx context.Context, tx pgx.Tx, incidentID string) ([]string, error) {
	rows, err := tx.Query(ctx, `SELECT asset_id FROM incident_assets WHERE incident_id = $1`, incidentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

func (r *IncidentRepo) GetLinkedVulnIDs(ctx context.Context, tx pgx.Tx, incidentID string) ([]string, error) {
	rows, err := tx.Query(ctx, `SELECT vulnerability_id FROM incident_vulnerabilities WHERE incident_id = $1`, incidentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

type IncidentFilter struct {
	Status       *string
	ImpactRating *string
	OwnerID      *string
	Search       *string
}
