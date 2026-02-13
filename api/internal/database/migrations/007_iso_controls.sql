-- +goose Up

-- Reference table: ISO 27001:2022 controls (not tenant-scoped)
CREATE TABLE iso_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    theme TEXT NOT NULL CHECK (theme IN ('organisational', 'people', 'physical', 'technological')),
    description TEXT NOT NULL DEFAULT '',
    is_reference BOOLEAN NOT NULL DEFAULT true
);

-- Organisation-specific control status (SOA)
CREATE TABLE org_iso_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    iso_control_id UUID NOT NULL REFERENCES iso_controls(id) ON DELETE CASCADE,
    applicability TEXT NOT NULL DEFAULT 'applicable' CHECK (applicability IN ('applicable', 'not_applicable')),
    non_applicability_justification TEXT NOT NULL DEFAULT '',
    implementation_status TEXT NOT NULL DEFAULT 'not_implemented'
        CHECK (implementation_status IN ('not_implemented', 'partially_implemented', 'implemented', 'not_applicable')),
    implementation_description TEXT NOT NULL DEFAULT '',
    responsible_owner_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, iso_control_id)
);

CREATE INDEX idx_org_iso_controls_org_id ON org_iso_controls(org_id);
CREATE INDEX idx_org_iso_controls_status ON org_iso_controls(implementation_status);

-- Link controls to assets
CREATE TABLE iso_control_assets (
    org_iso_control_id UUID NOT NULL REFERENCES org_iso_controls(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    PRIMARY KEY (org_iso_control_id, asset_id)
);

-- Link risks to ISO controls
CREATE TABLE risk_controls (
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    iso_control_id UUID NOT NULL REFERENCES iso_controls(id) ON DELETE CASCADE,
    PRIMARY KEY (risk_id, iso_control_id)
);

-- RLS on org-scoped table only
ALTER TABLE org_iso_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_iso_controls_tenant ON org_iso_controls
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- +goose Down

DROP TABLE IF EXISTS risk_controls;
DROP TABLE IF EXISTS iso_control_assets;
DROP TABLE IF EXISTS org_iso_controls;
DROP TABLE IF EXISTS iso_controls;
