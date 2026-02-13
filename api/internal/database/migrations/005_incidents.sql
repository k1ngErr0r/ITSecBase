-- +goose Up

CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    area TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    impact_summary TEXT NOT NULL DEFAULT '',
    impact_rating TEXT CHECK (impact_rating IN ('low', 'medium', 'high', 'critical')),
    classification TEXT[] NOT NULL DEFAULT '{}',
    regulatory_breach BOOLEAN NOT NULL DEFAULT false,
    reporter_id UUID REFERENCES users(id),
    owner_id UUID REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'triage', 'containment', 'eradication', 'recovery', 'lessons_learned', 'closed')),
    root_cause TEXT NOT NULL DEFAULT '',
    root_cause_category TEXT NOT NULL DEFAULT '',
    corrective_actions TEXT NOT NULL DEFAULT '',
    preventive_actions TEXT NOT NULL DEFAULT '',
    detected_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    contained_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    sla_deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incidents_org_id ON incidents(org_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_impact_rating ON incidents(impact_rating);
CREATE INDEX idx_incidents_owner_id ON incidents(owner_id);

CREATE TABLE incident_assets (
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    PRIMARY KEY (incident_id, asset_id)
);

CREATE TABLE incident_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    action_type TEXT CHECK (action_type IN ('corrective', 'preventive')),
    description TEXT NOT NULL,
    owner_id UUID REFERENCES users(id),
    due_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incident_actions_incident_id ON incident_actions(incident_id);

CREATE TABLE incident_vulnerabilities (
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    vulnerability_id UUID NOT NULL REFERENCES vulnerabilities(id) ON DELETE CASCADE,
    PRIMARY KEY (incident_id, vulnerability_id)
);

-- RLS
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY incidents_tenant_isolation ON incidents
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE incident_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY incident_actions_tenant ON incident_actions
    USING (
        EXISTS (
            SELECT 1 FROM incidents i
            WHERE i.id = incident_actions.incident_id
            AND i.org_id = current_setting('app.current_org_id', true)::uuid
        )
    );

-- +goose Down

DROP TABLE IF EXISTS incident_vulnerabilities;
DROP TABLE IF EXISTS incident_actions;
DROP TABLE IF EXISTS incident_assets;
DROP TABLE IF EXISTS incidents;
