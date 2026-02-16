package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/k1ngErr0r/ITSecBase/api/internal/model"
)

type RiskRepo struct{}

func NewRiskRepo() *RiskRepo {
	return &RiskRepo{}
}

func (r *RiskRepo) GetByID(ctx context.Context, tx pgx.Tx, id string) (*model.Risk, error) {
	risk := &model.Risk{}
	err := tx.QueryRow(ctx, `
		SELECT id, org_id, title, description, scenario, category, source,
		       inherent_likelihood, inherent_impact, residual_likelihood, residual_impact,
		       status, owner_id, approver_id, review_date, last_reviewed_by,
		       created_at, updated_at
		FROM risks WHERE id = $1
	`, id).Scan(
		&risk.ID, &risk.OrgID, &risk.Title, &risk.Description, &risk.Scenario,
		&risk.Category, &risk.Source, &risk.InherentLikelihood, &risk.InherentImpact,
		&risk.ResidualLikelihood, &risk.ResidualImpact, &risk.Status, &risk.OwnerID,
		&risk.ApproverID, &risk.ReviewDate, &risk.LastReviewedBy,
		&risk.CreatedAt, &risk.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get risk: %w", err)
	}
	return risk, nil
}

func (r *RiskRepo) List(ctx context.Context, tx pgx.Tx, params PaginationParams, filter *RiskFilter) ([]*model.Risk, PaginationResult, error) {
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
		if filter.Category != nil {
			where += fmt.Sprintf(" AND category = $%d", argIdx)
			args = append(args, *filter.Category)
			argIdx++
		}
		if filter.OwnerID != nil {
			where += fmt.Sprintf(" AND owner_id = $%d", argIdx)
			args = append(args, *filter.OwnerID)
			argIdx++
		}
		if filter.Search != nil {
			where += fmt.Sprintf(" AND (title ILIKE $%d OR description ILIKE $%d)", argIdx, argIdx)
			args = append(args, "%"+*filter.Search+"%")
			argIdx++
		}
	}

	var totalCount int
	if err := tx.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM risks %s", where), args...).Scan(&totalCount); err != nil {
		return nil, PaginationResult{}, err
	}

	query := fmt.Sprintf(`
		SELECT id, org_id, title, description, scenario, category, source,
		       inherent_likelihood, inherent_impact, residual_likelihood, residual_impact,
		       status, owner_id, approver_id, review_date, last_reviewed_by,
		       created_at, updated_at
		FROM risks %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)
	args = append(args, limit+1, offset)

	rows, err := tx.Query(ctx, query, args...)
	if err != nil {
		return nil, PaginationResult{}, err
	}
	defer rows.Close()

	var risks []*model.Risk
	for rows.Next() {
		risk := &model.Risk{}
		if err := rows.Scan(
			&risk.ID, &risk.OrgID, &risk.Title, &risk.Description, &risk.Scenario,
			&risk.Category, &risk.Source, &risk.InherentLikelihood, &risk.InherentImpact,
			&risk.ResidualLikelihood, &risk.ResidualImpact, &risk.Status, &risk.OwnerID,
			&risk.ApproverID, &risk.ReviewDate, &risk.LastReviewedBy,
			&risk.CreatedAt, &risk.UpdatedAt,
		); err != nil {
			return nil, PaginationResult{}, err
		}
		risks = append(risks, risk)
	}

	hasNext := len(risks) > limit
	if hasNext {
		risks = risks[:limit]
	}

	result := PaginationResult{
		HasNextPage:     hasNext,
		HasPreviousPage: offset > 0,
		TotalCount:      totalCount,
	}
	if len(risks) > 0 {
		result.StartCursor = EncodeCursor(offset)
		result.EndCursor = EncodeCursor(offset + len(risks) - 1)
	}
	return risks, result, nil
}

func (r *RiskRepo) Create(ctx context.Context, tx pgx.Tx, risk *model.Risk) error {
	err := tx.QueryRow(ctx, `
		INSERT INTO risks (
			org_id, title, description, scenario, category, source,
			inherent_likelihood, inherent_impact, residual_likelihood, residual_impact,
			status, owner_id, approver_id, review_date
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
		RETURNING id, created_at, updated_at
	`, risk.OrgID, risk.Title, risk.Description, risk.Scenario, risk.Category, risk.Source,
		risk.InherentLikelihood, risk.InherentImpact, risk.ResidualLikelihood, risk.ResidualImpact,
		risk.Status, risk.OwnerID, risk.ApproverID, risk.ReviewDate,
	).Scan(&risk.ID, &risk.CreatedAt, &risk.UpdatedAt)
	return err
}

func (r *RiskRepo) Update(ctx context.Context, tx pgx.Tx, risk *model.Risk) error {
	_, err := tx.Exec(ctx, `
		UPDATE risks SET
			title=$2, description=$3, scenario=$4, category=$5, source=$6,
			inherent_likelihood=$7, inherent_impact=$8, residual_likelihood=$9, residual_impact=$10,
			status=$11, owner_id=$12, approver_id=$13, review_date=$14, last_reviewed_by=$15,
			updated_at=now()
		WHERE id = $1
	`, risk.ID, risk.Title, risk.Description, risk.Scenario, risk.Category, risk.Source,
		risk.InherentLikelihood, risk.InherentImpact, risk.ResidualLikelihood, risk.ResidualImpact,
		risk.Status, risk.OwnerID, risk.ApproverID, risk.ReviewDate, risk.LastReviewedBy,
	)
	return err
}

func (r *RiskRepo) Delete(ctx context.Context, tx pgx.Tx, id string) error {
	_, err := tx.Exec(ctx, `DELETE FROM risks WHERE id = $1`, id)
	return err
}

// Treatment operations

func (r *RiskRepo) GetTreatment(ctx context.Context, tx pgx.Tx, id string) (*model.RiskTreatment, error) {
	t := &model.RiskTreatment{}
	err := tx.QueryRow(ctx, `
		SELECT id, risk_id, action, responsible_id, deadline, status, created_at
		FROM risk_treatments WHERE id = $1
	`, id).Scan(&t.ID, &t.RiskID, &t.Action, &t.ResponsibleID, &t.Deadline, &t.Status, &t.CreatedAt)
	if err != nil {
		return nil, err
	}
	return t, nil
}

func (r *RiskRepo) ListTreatments(ctx context.Context, tx pgx.Tx, riskID string) ([]*model.RiskTreatment, error) {
	rows, err := tx.Query(ctx, `
		SELECT id, risk_id, action, responsible_id, deadline, status, created_at
		FROM risk_treatments WHERE risk_id = $1 ORDER BY created_at
	`, riskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var treatments []*model.RiskTreatment
	for rows.Next() {
		t := &model.RiskTreatment{}
		if err := rows.Scan(&t.ID, &t.RiskID, &t.Action, &t.ResponsibleID, &t.Deadline, &t.Status, &t.CreatedAt); err != nil {
			return nil, err
		}
		treatments = append(treatments, t)
	}
	return treatments, nil
}

func (r *RiskRepo) CreateTreatment(ctx context.Context, tx pgx.Tx, t *model.RiskTreatment) error {
	err := tx.QueryRow(ctx, `
		INSERT INTO risk_treatments (risk_id, action, responsible_id, deadline, status)
		VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at
	`, t.RiskID, t.Action, t.ResponsibleID, t.Deadline, t.Status).Scan(&t.ID, &t.CreatedAt)
	return err
}

func (r *RiskRepo) UpdateTreatment(ctx context.Context, tx pgx.Tx, t *model.RiskTreatment) error {
	_, err := tx.Exec(ctx, `
		UPDATE risk_treatments SET action=$2, responsible_id=$3, deadline=$4, status=$5 WHERE id=$1
	`, t.ID, t.Action, t.ResponsibleID, t.Deadline, t.Status)
	return err
}

func (r *RiskRepo) DeleteTreatment(ctx context.Context, tx pgx.Tx, id string) error {
	_, err := tx.Exec(ctx, `DELETE FROM risk_treatments WHERE id = $1`, id)
	return err
}

// Risk matrix config

func (r *RiskRepo) GetMatrixConfig(ctx context.Context, tx pgx.Tx) (*model.RiskMatrixConfig, error) {
	m := &model.RiskMatrixConfig{}
	err := tx.QueryRow(ctx, `
		SELECT id, org_id, likelihood_labels, impact_labels, level_thresholds, created_at, updated_at
		FROM risk_matrix_config LIMIT 1
	`).Scan(&m.ID, &m.OrgID, &m.LikelihoodLabels, &m.ImpactLabels, &m.LevelThresholds, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (r *RiskRepo) UpdateMatrixConfig(ctx context.Context, tx pgx.Tx, m *model.RiskMatrixConfig) error {
	_, err := tx.Exec(ctx, `
		UPDATE risk_matrix_config SET likelihood_labels=$2, impact_labels=$3, level_thresholds=$4, updated_at=now()
		WHERE id=$1
	`, m.ID, m.LikelihoodLabels, m.ImpactLabels, m.LevelThresholds)
	return err
}

// Risk-asset linking

func (r *RiskRepo) LinkAsset(ctx context.Context, tx pgx.Tx, riskID, assetID string) error {
	_, err := tx.Exec(ctx, `INSERT INTO risk_assets (risk_id, asset_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, riskID, assetID)
	return err
}

func (r *RiskRepo) LinkControl(ctx context.Context, tx pgx.Tx, riskID, controlID string) error {
	_, err := tx.Exec(ctx, `INSERT INTO risk_controls (risk_id, iso_control_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, riskID, controlID)
	return err
}

// Heatmap data

type HeatmapCell struct {
	Likelihood int
	Impact     int
	Count      int
}

func (r *RiskRepo) GetHeatmapData(ctx context.Context, tx pgx.Tx) ([]HeatmapCell, error) {
	rows, err := tx.Query(ctx, `
		SELECT residual_likelihood, residual_impact, COUNT(*)
		FROM risks WHERE status NOT IN ('closed')
		GROUP BY residual_likelihood, residual_impact
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cells []HeatmapCell
	for rows.Next() {
		c := HeatmapCell{}
		if err := rows.Scan(&c.Likelihood, &c.Impact, &c.Count); err != nil {
			return nil, err
		}
		cells = append(cells, c)
	}
	return cells, nil
}

func (r *RiskRepo) GetLinkedAssetIDs(ctx context.Context, tx pgx.Tx, riskID string) ([]string, error) {
	rows, err := tx.Query(ctx, `SELECT asset_id FROM risk_assets WHERE risk_id = $1`, riskID)
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

func (r *RiskRepo) GetLinkedControlIDs(ctx context.Context, tx pgx.Tx, riskID string) ([]string, error) {
	rows, err := tx.Query(ctx, `SELECT iso_control_id FROM risk_controls WHERE risk_id = $1`, riskID)
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

type RiskFilter struct {
	Status   *string
	Category *string
	OwnerID  *string
	Search   *string
}
