package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jmcintyre/secbase/api/internal/model"
)

type DashboardRepo struct{}

func NewDashboardRepo() *DashboardRepo {
	return &DashboardRepo{}
}

// VulnOverview returns aggregate vulnerability statistics.
type VulnOverview struct {
	TotalOpen     int
	CriticalCount int
	HighCount     int
	MediumCount   int
	LowCount      int
}

func (r *DashboardRepo) GetVulnOverview(ctx context.Context, tx pgx.Tx) (*VulnOverview, error) {
	rows, err := tx.Query(ctx, `
		SELECT severity, COUNT(*)
		FROM vulnerabilities
		WHERE status NOT IN ('closed', 'mitigated')
		GROUP BY severity
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	o := &VulnOverview{}
	for rows.Next() {
		var severity string
		var count int
		if err := rows.Scan(&severity, &count); err != nil {
			return nil, err
		}
		o.TotalOpen += count
		switch severity {
		case "critical":
			o.CriticalCount = count
		case "high":
			o.HighCount = count
		case "medium":
			o.MediumCount = count
		case "low":
			o.LowCount = count
		}
	}
	return o, nil
}

// IncidentSummary returns incident counts by status and impact.
type IncidentSummary struct {
	OpenCount    int
	CriticalOpen int
	SLABreaches  int
	ClosedLast30 int
}

func (r *DashboardRepo) GetIncidentSummary(ctx context.Context, tx pgx.Tx) (*IncidentSummary, error) {
	s := &IncidentSummary{}

	err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM incidents WHERE status NOT IN ('closed', 'lessons_learned')`).Scan(&s.OpenCount)
	if err != nil {
		return nil, err
	}

	err = tx.QueryRow(ctx, `SELECT COUNT(*) FROM incidents WHERE status NOT IN ('closed', 'lessons_learned') AND impact_rating = 'critical'`).Scan(&s.CriticalOpen)
	if err != nil {
		return nil, err
	}

	err = tx.QueryRow(ctx, `SELECT COUNT(*) FROM incidents WHERE sla_deadline < now() AND status NOT IN ('closed', 'lessons_learned')`).Scan(&s.SLABreaches)
	if err != nil {
		return nil, err
	}

	err = tx.QueryRow(ctx, `SELECT COUNT(*) FROM incidents WHERE closed_at >= now() - interval '30 days'`).Scan(&s.ClosedLast30)
	if err != nil {
		return nil, err
	}

	return s, nil
}

// DrReadiness returns DR plan readiness information.
type DrReadiness struct {
	ActivePlans    int
	LastTestDate   *time.Time
	LastTestResult string
	NextTestDate   *time.Time
}

func (r *DashboardRepo) GetDrReadiness(ctx context.Context, tx pgx.Tx) (*DrReadiness, error) {
	d := &DrReadiness{}

	err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM dr_plans WHERE status = 'active'`).Scan(&d.ActivePlans)
	if err != nil {
		return nil, err
	}

	_ = tx.QueryRow(ctx, `
		SELECT actual_date, result FROM dr_tests
		WHERE actual_date IS NOT NULL
		ORDER BY actual_date DESC LIMIT 1
	`).Scan(&d.LastTestDate, &d.LastTestResult)

	_ = tx.QueryRow(ctx, `
		SELECT planned_date FROM dr_tests
		WHERE planned_date > now() AND actual_date IS NULL
		ORDER BY planned_date LIMIT 1
	`).Scan(&d.NextTestDate)

	return d, nil
}

// MyTasks returns counts of items assigned to a user.
type MyTasks struct {
	Vulnerabilities int
	Risks           int
	Incidents       int
	Actions         int
}

func (r *DashboardRepo) GetMyTasks(ctx context.Context, tx pgx.Tx, userID string) (*MyTasks, error) {
	t := &MyTasks{}

	_ = tx.QueryRow(ctx, `SELECT COUNT(*) FROM vulnerabilities WHERE owner_id = $1 AND status NOT IN ('closed','mitigated')`, userID).Scan(&t.Vulnerabilities)
	_ = tx.QueryRow(ctx, `SELECT COUNT(*) FROM risks WHERE owner_id = $1 AND status NOT IN ('closed')`, userID).Scan(&t.Risks)
	_ = tx.QueryRow(ctx, `SELECT COUNT(*) FROM incidents WHERE owner_id = $1 AND status NOT IN ('closed','lessons_learned')`, userID).Scan(&t.Incidents)
	_ = tx.QueryRow(ctx, `
		SELECT COUNT(*) FROM risk_treatments WHERE responsible_id = $1 AND status != 'completed'
		UNION ALL
		SELECT COUNT(*) FROM incident_actions WHERE owner_id = $1 AND status != 'completed'
	`, userID).Scan(&t.Actions)

	return t, nil
}

// Dashboard layout

func (r *DashboardRepo) GetLayout(ctx context.Context, tx pgx.Tx, userID string) (json.RawMessage, error) {
	var layout json.RawMessage
	err := tx.QueryRow(ctx, `SELECT layout_config FROM user_dashboard_layouts WHERE user_id = $1`, userID).Scan(&layout)
	if err != nil {
		return nil, err
	}
	return layout, nil
}

func (r *DashboardRepo) SaveLayout(ctx context.Context, tx pgx.Tx, userID string, layout json.RawMessage) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO user_dashboard_layouts (user_id, layout_config)
		VALUES ($1, $2)
		ON CONFLICT (user_id) DO UPDATE SET layout_config = $2, updated_at = now()
	`, userID, layout)
	return err
}

// CVE Feed

func (r *DashboardRepo) ListCveFeed(ctx context.Context, tx pgx.Tx, limit int) ([]*model.CveFeedEntry, error) {
	rows, err := tx.Query(ctx, `
		SELECT id, cve_id, score, affected_products, published_date, link, fetched_at
		FROM cve_feed ORDER BY published_date DESC NULLS LAST LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []*model.CveFeedEntry
	for rows.Next() {
		e := &model.CveFeedEntry{}
		if err := rows.Scan(&e.ID, &e.CveID, &e.Score, &e.AffectedProducts, &e.PublishedDate, &e.Link, &e.FetchedAt); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}

func (r *DashboardRepo) UpsertCveEntry(ctx context.Context, tx pgx.Tx, e *model.CveFeedEntry) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO cve_feed (cve_id, score, affected_products, published_date, link)
		VALUES ($1,$2,$3,$4,$5)
		ON CONFLICT (cve_id) DO UPDATE SET score=EXCLUDED.score, affected_products=EXCLUDED.affected_products,
			published_date=EXCLUDED.published_date, link=EXCLUDED.link, fetched_at=now()
	`, e.CveID, e.Score, e.AffectedProducts, e.PublishedDate, e.Link)
	return err
}

// Saved views

func (r *DashboardRepo) ListSavedViews(ctx context.Context, tx pgx.Tx, userID, entityType string) ([]*model.SavedView, error) {
	rows, err := tx.Query(ctx, `
		SELECT id, org_id, user_id, entity_type, name, filter_config, is_default, created_at, updated_at
		FROM saved_views WHERE user_id = $1 AND entity_type = $2 ORDER BY name
	`, userID, entityType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var views []*model.SavedView
	for rows.Next() {
		v := &model.SavedView{}
		if err := rows.Scan(&v.ID, &v.OrgID, &v.UserID, &v.EntityType, &v.Name, &v.FilterConfig, &v.IsDefault, &v.CreatedAt, &v.UpdatedAt); err != nil {
			return nil, err
		}
		views = append(views, v)
	}
	return views, nil
}

func (r *DashboardRepo) CreateSavedView(ctx context.Context, tx pgx.Tx, v *model.SavedView) error {
	err := tx.QueryRow(ctx, `
		INSERT INTO saved_views (org_id, user_id, entity_type, name, filter_config, is_default)
		VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at, updated_at
	`, v.OrgID, v.UserID, v.EntityType, v.Name, v.FilterConfig, v.IsDefault).Scan(&v.ID, &v.CreatedAt, &v.UpdatedAt)
	return err
}

func (r *DashboardRepo) DeleteSavedView(ctx context.Context, tx pgx.Tx, id string) error {
	_, err := tx.Exec(ctx, `DELETE FROM saved_views WHERE id = $1`, id)
	return err
}
