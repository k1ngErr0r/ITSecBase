-- +goose Up

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    make TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    version TEXT NOT NULL DEFAULT '',
    business_owner_id UUID REFERENCES users(id),
    technical_owner_id UUID REFERENCES users(id),
    ip_addresses TEXT[] NOT NULL DEFAULT '{}',
    hostnames TEXT[] NOT NULL DEFAULT '{}',
    fqdn TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    location_site TEXT NOT NULL DEFAULT '',
    location_detail TEXT NOT NULL DEFAULT '',
    environment TEXT CHECK (environment IN ('production', 'staging', 'dev', 'test')),
    criticality INT CHECK (criticality BETWEEN 1 AND 5),
    data_classification TEXT CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted')),
    tags TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'in_use' CHECK (status IN ('in_use', 'decommissioning', 'decommissioned')),
    decommission_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_org_id ON assets(org_id);
CREATE INDEX idx_assets_asset_type ON assets(asset_type);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_environment ON assets(environment);

CREATE TABLE asset_dependencies (
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    depends_on_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    PRIMARY KEY (asset_id, depends_on_id)
);

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    author_id UUID REFERENCES users(id),
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX idx_comments_org_id ON comments(org_id);

CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    content_type TEXT NOT NULL DEFAULT '',
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_entity ON evidence(entity_type, entity_id);
CREATE INDEX idx_evidence_org_id ON evidence(org_id);

-- RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY assets_tenant_isolation ON assets
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY comments_tenant_isolation ON comments
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY evidence_tenant_isolation ON evidence
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- +goose Down

DROP TABLE IF EXISTS evidence;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS asset_dependencies;
DROP TABLE IF EXISTS assets;
