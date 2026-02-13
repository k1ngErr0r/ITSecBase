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

type MyRecentItems struct {
	Vulns     []*model.Vulnerability
	Risks     []*model.Risk
	Incidents []*model.Incident
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

func (r *DashboardRepo) GetMyRecentItems(ctx context.Context, tx pgx.Tx, userID string) (*MyRecentItems, error) {
	items := &MyRecentItems{}

	// Recent vulnerabilities
	vRows, err := tx.Query(ctx, `
		SELECT id, org_id, title, description, source, cve_ids, external_refs, cvss_score, cvss_vector,
			severity, status, discovery_date, due_date, closure_date, owner_id, analyst_id, approver_id,
			tags, notes, created_at, updated_at
		FROM vulnerabilities WHERE owner_id = $1 AND status NOT IN ('closed','mitigated')
		ORDER BY updated_at DESC LIMIT 5
	`, userID)
	if err != nil {
		return nil, err
	}
	defer vRows.Close()
	for vRows.Next() {
		v := &model.Vulnerability{}
		if err := vRows.Scan(&v.ID, &v.OrgID, &v.Title, &v.Description, &v.Source, &v.CVEIDs,
			&v.ExternalRefs, &v.CVSSScore, &v.CVSSVector, &v.Severity, &v.Status,
			&v.DiscoveryDate, &v.DueDate, &v.ClosureDate, &v.OwnerID, &v.AnalystID, &v.ApproverID,
			&v.Tags, &v.Notes, &v.CreatedAt, &v.UpdatedAt); err != nil {
			return nil, err
		}
		items.Vulns = append(items.Vulns, v)
	}

	// Recent risks
	rRows, err := tx.Query(ctx, `
		SELECT id, org_id, title, description, scenario, category, source,
			inherent_likelihood, inherent_impact, residual_likelihood, residual_impact,
			status, owner_id, approver_id, review_date, last_reviewed_by, created_at, updated_at
		FROM risks WHERE owner_id = $1 AND status NOT IN ('closed')
		ORDER BY updated_at DESC LIMIT 5
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rRows.Close()
	for rRows.Next() {
		ri := &model.Risk{}
		if err := rRows.Scan(&ri.ID, &ri.OrgID, &ri.Title, &ri.Description, &ri.Scenario,
			&ri.Category, &ri.Source, &ri.InherentLikelihood, &ri.InherentImpact,
			&ri.ResidualLikelihood, &ri.ResidualImpact, &ri.Status, &ri.OwnerID, &ri.ApproverID,
			&ri.ReviewDate, &ri.LastReviewedBy, &ri.CreatedAt, &ri.UpdatedAt); err != nil {
			return nil, err
		}
		items.Risks = append(items.Risks, ri)
	}

	// Recent incidents
	iRows, err := tx.Query(ctx, `
		SELECT id, org_id, name, area, description, impact_summary, impact_rating,
			classification, regulatory_breach, reporter_id, owner_id, status,
			root_cause, root_cause_category, corrective_actions, preventive_actions,
			detected_at, opened_at, contained_at, resolved_at, closed_at, sla_deadline,
			created_at, updated_at
		FROM incidents WHERE owner_id = $1 AND status NOT IN ('closed','lessons_learned')
		ORDER BY updated_at DESC LIMIT 5
	`, userID)
	if err != nil {
		return nil, err
	}
	defer iRows.Close()
	for iRows.Next() {
		inc := &model.Incident{}
		if err := iRows.Scan(&inc.ID, &inc.OrgID, &inc.Name, &inc.Area, &inc.Description,
			&inc.ImpactSummary, &inc.ImpactRating, &inc.Classification, &inc.RegulatoryBreach,
			&inc.ReporterID, &inc.OwnerID, &inc.Status, &inc.RootCause, &inc.RootCauseCategory,
			&inc.CorrectiveActions, &inc.PreventiveActions, &inc.DetectedAt, &inc.OpenedAt,
			&inc.ContainedAt, &inc.ResolvedAt, &inc.ClosedAt, &inc.SLADeadline,
			&inc.CreatedAt, &inc.UpdatedAt); err != nil {
			return nil, err
		}
		items.Incidents = append(items.Incidents, inc)
	}

	return items, nil
}

// GetMTTR returns the mean time to remediate closed vulnerabilities in days.
func (r *DashboardRepo) GetMTTR(ctx context.Context, tx pgx.Tx) (*float64, error) {
	var mttr *float64
	err := tx.QueryRow(ctx, `
		SELECT EXTRACT(EPOCH FROM AVG(closure_date - discovery_date)) / 86400.0
		FROM vulnerabilities
		WHERE status IN ('closed', 'mitigated')
			AND closure_date IS NOT NULL AND discovery_date IS NOT NULL
	`).Scan(&mttr)
	if err != nil {
		return nil, nil
	}
	return mttr, nil
}

// TopVulnAsset holds an asset ID and its open vulnerability count.
type TopVulnAsset struct {
	AssetID string
	Count   int
}

func (r *DashboardRepo) GetTopVulnAssets(ctx context.Context, tx pgx.Tx, limit int) ([]TopVulnAsset, error) {
	rows, err := tx.Query(ctx, `
		SELECT va.asset_id, COUNT(*) AS cnt
		FROM vulnerability_assets va
		JOIN vulnerabilities v ON v.id = va.vulnerability_id
		WHERE v.status NOT IN ('closed', 'mitigated')
		GROUP BY va.asset_id
		ORDER BY cnt DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []TopVulnAsset
	for rows.Next() {
		var a TopVulnAsset
		if err := rows.Scan(&a.AssetID, &a.Count); err != nil {
			return nil, err
		}
		results = append(results, a)
	}
	return results, nil
}

// TopCve holds a CVE ID, its count, and severity.
type TopCve struct {
	CveID    string
	Count    int
	Severity string
}

func (r *DashboardRepo) GetTopCves(ctx context.Context, tx pgx.Tx, limit int) ([]TopCve, error) {
	rows, err := tx.Query(ctx, `
		SELECT unnest(cve_ids) AS cve, COUNT(*) AS cnt, MAX(severity) AS sev
		FROM vulnerabilities
		WHERE status NOT IN ('closed', 'mitigated') AND array_length(cve_ids, 1) > 0
		GROUP BY cve
		ORDER BY cnt DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []TopCve
	for rows.Next() {
		var c TopCve
		if err := rows.Scan(&c.CveID, &c.Count, &c.Severity); err != nil {
			return nil, err
		}
		results = append(results, c)
	}
	return results, nil
}

// RiskLevelCount holds a risk level label and its count.
type RiskLevelCount struct {
	Level string
	Count int
}

func (r *DashboardRepo) GetRiskCountsByLevel(ctx context.Context, tx pgx.Tx) ([]RiskLevelCount, error) {
	rows, err := tx.Query(ctx, `
		SELECT
			CASE
				WHEN inherent_likelihood * inherent_impact >= 20 THEN 'critical'
				WHEN inherent_likelihood * inherent_impact >= 12 THEN 'high'
				WHEN inherent_likelihood * inherent_impact >= 6 THEN 'medium'
				ELSE 'low'
			END AS level,
			COUNT(*)
		FROM risks
		WHERE status NOT IN ('closed')
		GROUP BY level
		ORDER BY MIN(inherent_likelihood * inherent_impact) DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []RiskLevelCount
	for rows.Next() {
		var lc RiskLevelCount
		if err := rows.Scan(&lc.Level, &lc.Count); err != nil {
			return nil, err
		}
		results = append(results, lc)
	}
	return results, nil
}

// ImpactCount holds an impact rating and count of open incidents.
type ImpactCount struct {
	Impact string
	Count  int
}

func (r *DashboardRepo) GetIncidentsByImpact(ctx context.Context, tx pgx.Tx) ([]ImpactCount, error) {
	rows, err := tx.Query(ctx, `
		SELECT impact_rating, COUNT(*)
		FROM incidents
		WHERE status NOT IN ('closed', 'lessons_learned')
		GROUP BY impact_rating
		ORDER BY CASE impact_rating
			WHEN 'critical' THEN 1
			WHEN 'high' THEN 2
			WHEN 'medium' THEN 3
			WHEN 'low' THEN 4
			ELSE 5
		END
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []ImpactCount
	for rows.Next() {
		var ic ImpactCount
		if err := rows.Scan(&ic.Impact, &ic.Count); err != nil {
			return nil, err
		}
		results = append(results, ic)
	}
	return results, nil
}

// RecentIncidentEntry holds an incident and its timeline date.
type RecentIncidentEntry struct {
	Incident *model.Incident
	Date     time.Time
}

func (r *DashboardRepo) GetRecentIncidentTimeline(ctx context.Context, tx pgx.Tx, limit int) ([]RecentIncidentEntry, error) {
	rows, err := tx.Query(ctx, `
		SELECT id, org_id, name, area, description, impact_summary, impact_rating,
			classification, regulatory_breach, reporter_id, owner_id, status,
			root_cause, root_cause_category, corrective_actions, preventive_actions,
			detected_at, opened_at, contained_at, resolved_at, closed_at, sla_deadline,
			created_at, updated_at
		FROM incidents
		ORDER BY updated_at DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []RecentIncidentEntry
	for rows.Next() {
		inc := &model.Incident{}
		if err := rows.Scan(&inc.ID, &inc.OrgID, &inc.Name, &inc.Area, &inc.Description,
			&inc.ImpactSummary, &inc.ImpactRating, &inc.Classification, &inc.RegulatoryBreach,
			&inc.ReporterID, &inc.OwnerID, &inc.Status, &inc.RootCause, &inc.RootCauseCategory,
			&inc.CorrectiveActions, &inc.PreventiveActions, &inc.DetectedAt, &inc.OpenedAt,
			&inc.ContainedAt, &inc.ResolvedAt, &inc.ClosedAt, &inc.SLADeadline,
			&inc.CreatedAt, &inc.UpdatedAt); err != nil {
			return nil, err
		}
		results = append(results, RecentIncidentEntry{Incident: inc, Date: inc.UpdatedAt})
	}
	return results, nil
}

// ControlGap holds an ISO control and its implementation status.
type ControlGap struct {
	Control *model.IsoControl
	Status  string
}

func (r *DashboardRepo) GetTopComplianceGaps(ctx context.Context, tx pgx.Tx, limit int) ([]ControlGap, error) {
	rows, err := tx.Query(ctx, `
		SELECT ic.id, ic.control_id, ic.name, ic.theme, ic.description,
			oc.implementation_status
		FROM org_iso_controls oc
		JOIN iso_controls ic ON ic.id = oc.iso_control_id
		WHERE oc.implementation_status NOT IN ('implemented', 'not_applicable')
		ORDER BY CASE oc.implementation_status
			WHEN 'not_implemented' THEN 1
			WHEN 'partially_implemented' THEN 2
			ELSE 3
		END
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []ControlGap
	for rows.Next() {
		c := &model.IsoControl{}
		var status string
		if err := rows.Scan(&c.ID, &c.ControlID, &c.Name, &c.Theme, &c.Description, &status); err != nil {
			return nil, err
		}
		results = append(results, ControlGap{Control: c, Status: status})
	}
	return results, nil
}

// GetLatestPlanVersion returns the version or updated_at text of the most recent active DR plan.
func (r *DashboardRepo) GetLatestPlanVersion(ctx context.Context, tx pgx.Tx) (*string, error) {
	var version *string
	err := tx.QueryRow(ctx, `
		SELECT 'v' || TO_CHAR(updated_at, 'YYYY.MM.DD')
		FROM dr_plans WHERE status = 'active'
		ORDER BY updated_at DESC LIMIT 1
	`).Scan(&version)
	if err != nil {
		return nil, nil
	}
	return version, nil
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
