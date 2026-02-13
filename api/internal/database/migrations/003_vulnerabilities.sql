-- +goose Up

CREATE TABLE vulnerabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',
    cve_ids TEXT[] NOT NULL DEFAULT '{}',
    external_refs JSONB NOT NULL DEFAULT '[]',
    cvss_score NUMERIC(3,1),
    cvss_vector TEXT NOT NULL DEFAULT '',
    severity TEXT CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'triaged', 'in_progress', 'risk_accepted', 'mitigated', 'closed')),
    discovery_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    closure_date TIMESTAMPTZ,
    owner_id UUID REFERENCES users(id),
    analyst_id UUID REFERENCES users(id),
    approver_id UUID REFERENCES users(id),
    tags TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vulnerabilities_org_id ON vulnerabilities(org_id);
CREATE INDEX idx_vulnerabilities_severity ON vulnerabilities(severity);
CREATE INDEX idx_vulnerabilities_status ON vulnerabilities(status);
CREATE INDEX idx_vulnerabilities_owner_id ON vulnerabilities(owner_id);

CREATE TABLE vulnerability_assets (
    vulnerability_id UUID NOT NULL REFERENCES vulnerabilities(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    PRIMARY KEY (vulnerability_id, asset_id)
);

CREATE TABLE vulnerability_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vulnerability_id UUID NOT NULL REFERENCES vulnerabilities(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES users(id),
    field_name TEXT NOT NULL,
    old_value TEXT NOT NULL DEFAULT '',
    new_value TEXT NOT NULL DEFAULT '',
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vuln_history_vuln_id ON vulnerability_history(vulnerability_id);

-- RLS
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY vulnerabilities_tenant_isolation ON vulnerabilities
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE vulnerability_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY vuln_history_tenant_isolation ON vulnerability_history
    USING (
        EXISTS (
            SELECT 1 FROM vulnerabilities v
            WHERE v.id = vulnerability_history.vulnerability_id
            AND v.org_id = current_setting('app.current_org_id', true)::uuid
        )
    );

-- +goose Down

DROP TABLE IF EXISTS vulnerability_history;
DROP TABLE IF EXISTS vulnerability_assets;
DROP TABLE IF EXISTS vulnerabilities;
