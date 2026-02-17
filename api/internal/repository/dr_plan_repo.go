package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/k1ngErr0r/ITSecBase/api/internal/model"
)

type DrPlanRepo struct{}

func NewDrPlanRepo() *DrPlanRepo {
	return &DrPlanRepo{}
}

func (r *DrPlanRepo) GetByID(ctx context.Context, tx pgx.Tx, id string) (*model.DrPlan, error) {
	p := &model.DrPlan{}
	err := tx.QueryRow(ctx, `
		SELECT id, org_id, name, scope, owner_id, version, rto_minutes, rpo_minutes,
		       playbook, status, created_at, updated_at
		FROM dr_plans WHERE id = $1
	`, id).Scan(
		&p.ID, &p.OrgID, &p.Name, &p.Scope, &p.OwnerID, &p.Version,
		&p.RTOMinutes, &p.RPOMinutes, &p.Playbook, &p.Status, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get dr plan: %w", err)
	}
	return p, nil
}

func (r *DrPlanRepo) List(ctx context.Context, tx pgx.Tx, params PaginationParams, filter *DrPlanFilter) ([]*model.DrPlan, PaginationResult, error) {
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
		if filter.Search != nil {
			where += fmt.Sprintf(" AND (name ILIKE $%d OR scope ILIKE $%d)", argIdx, argIdx)
			args = append(args, "%"+*filter.Search+"%")
			argIdx++
		}
	}

	var totalCount int
	if err := tx.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM dr_plans %s", where), args...).Scan(&totalCount); err != nil {
		return nil, PaginationResult{}, err
	}

	query := fmt.Sprintf(`
		SELECT id, org_id, name, scope, owner_id, version, rto_minutes, rpo_minutes,
		       playbook, status, created_at, updated_at
		FROM dr_plans %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)
	args = append(args, limit+1, offset)

	rows, err := tx.Query(ctx, query, args...)
	if err != nil {
		return nil, PaginationResult{}, err
	}
	defer rows.Close()

	var plans []*model.DrPlan
	for rows.Next() {
		p := &model.DrPlan{}
		if err := rows.Scan(
			&p.ID, &p.OrgID, &p.Name, &p.Scope, &p.OwnerID, &p.Version,
			&p.RTOMinutes, &p.RPOMinutes, &p.Playbook, &p.Status, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, PaginationResult{}, err
		}
		plans = append(plans, p)
	}

	hasNext := len(plans) > limit
	if hasNext {
		plans = plans[:limit]
	}

	result := PaginationResult{
		HasNextPage:     hasNext,
		HasPreviousPage: offset > 0,
		TotalCount:      totalCount,
	}
	if len(plans) > 0 {
		result.StartCursor = EncodeCursor(offset)
		result.EndCursor = EncodeCursor(offset + len(plans) - 1)
	}
	return plans, result, nil
}

func (r *DrPlanRepo) Create(ctx context.Context, tx pgx.Tx, p *model.DrPlan) error {
	err := tx.QueryRow(ctx, `
		INSERT INTO dr_plans (org_id, name, scope, owner_id, version, rto_minutes, rpo_minutes, playbook, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		RETURNING id, created_at, updated_at
	`, p.OrgID, p.Name, p.Scope, p.OwnerID, p.Version, p.RTOMinutes, p.RPOMinutes, p.Playbook, p.Status,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
	return err
}

func (r *DrPlanRepo) Update(ctx context.Context, tx pgx.Tx, p *model.DrPlan) error {
	_, err := tx.Exec(ctx, `
		UPDATE dr_plans SET
			name=$2, scope=$3, owner_id=$4, version=$5, rto_minutes=$6,
			rpo_minutes=$7, playbook=$8, status=$9, updated_at=now()
		WHERE id = $1
	`, p.ID, p.Name, p.Scope, p.OwnerID, p.Version, p.RTOMinutes, p.RPOMinutes, p.Playbook, p.Status)
	return err
}

func (r *DrPlanRepo) Delete(ctx context.Context, tx pgx.Tx, id string) error {
	_, err := tx.Exec(ctx, `DELETE FROM dr_plans WHERE id = $1`, id)
	return err
}

// Tests

func strOrNil(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func (r *DrPlanRepo) CreateTest(ctx context.Context, tx pgx.Tx, t *model.DrTest) error {
	err := tx.QueryRow(ctx, `
		INSERT INTO dr_tests (dr_plan_id, test_type, planned_date, actual_date, result, observations)
		VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at
	`, t.DrPlanID, t.TestType, t.PlannedDate, t.ActualDate, strOrNil(t.Result), t.Observations,
	).Scan(&t.ID, &t.CreatedAt)
	return err
}

func (r *DrPlanRepo) UpdateTest(ctx context.Context, tx pgx.Tx, t *model.DrTest) error {
	_, err := tx.Exec(ctx, `
		UPDATE dr_tests SET test_type=$2, planned_date=$3, actual_date=$4, result=$5, observations=$6
		WHERE id=$1
	`, t.ID, t.TestType, t.PlannedDate, t.ActualDate, strOrNil(t.Result), t.Observations)
	return err
}

func (r *DrPlanRepo) ListTests(ctx context.Context, tx pgx.Tx, planID string) ([]*model.DrTest, error) {
	rows, err := tx.Query(ctx, `
		SELECT id, dr_plan_id, test_type, planned_date, actual_date, result, observations, created_at
		FROM dr_tests WHERE dr_plan_id = $1 ORDER BY COALESCE(actual_date, planned_date) DESC
	`, planID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tests []*model.DrTest
	for rows.Next() {
		t := &model.DrTest{}
		var result *string
		if err := rows.Scan(&t.ID, &t.DrPlanID, &t.TestType, &t.PlannedDate, &t.ActualDate, &result, &t.Observations, &t.CreatedAt); err != nil {
			return nil, err
		}
		if result != nil {
			t.Result = *result
		}
		tests = append(tests, t)
	}
	return tests, nil
}

func (r *DrPlanRepo) LinkAsset(ctx context.Context, tx pgx.Tx, planID, assetID string) error {
	_, err := tx.Exec(ctx, `INSERT INTO dr_plan_assets (dr_plan_id, asset_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, planID, assetID)
	return err
}

func (r *DrPlanRepo) GetLinkedAssetIDs(ctx context.Context, tx pgx.Tx, planID string) ([]string, error) {
	rows, err := tx.Query(ctx, `SELECT asset_id FROM dr_plan_assets WHERE dr_plan_id = $1`, planID)
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

type DrPlanFilter struct {
	Status *string
	Search *string
}
