-- +goose Up

CREATE TABLE user_dashboard_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    layout_config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE saved_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    name TEXT NOT NULL,
    filter_config JSONB NOT NULL DEFAULT '{}',
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_views_user ON saved_views(user_id, entity_type);
CREATE INDEX idx_saved_views_org_id ON saved_views(org_id);

CREATE TABLE cve_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cve_id TEXT NOT NULL UNIQUE,
    score NUMERIC(3,1),
    affected_products TEXT[] NOT NULL DEFAULT '{}',
    published_date TIMESTAMPTZ,
    link TEXT NOT NULL DEFAULT '',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cve_feed_published ON cve_feed(published_date DESC);

-- RLS
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_views_tenant ON saved_views
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- +goose Down

DROP TABLE IF EXISTS cve_feed;
DROP TABLE IF EXISTS saved_views;
DROP TABLE IF EXISTS user_dashboard_layouts;
