-- +goose Up

CREATE TABLE dr_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT '',
    owner_id UUID REFERENCES users(id),
    version TEXT NOT NULL DEFAULT '1.0',
    rto_minutes INT,
    rpo_minutes INT,
    playbook TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dr_plans_org_id ON dr_plans(org_id);
CREATE INDEX idx_dr_plans_status ON dr_plans(status);

CREATE TABLE dr_plan_assets (
    dr_plan_id UUID NOT NULL REFERENCES dr_plans(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    PRIMARY KEY (dr_plan_id, asset_id)
);

CREATE TABLE dr_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dr_plan_id UUID NOT NULL REFERENCES dr_plans(id) ON DELETE CASCADE,
    test_type TEXT CHECK (test_type IN ('tabletop', 'functional', 'full_failover')),
    planned_date TIMESTAMPTZ,
    actual_date TIMESTAMPTZ,
    result TEXT CHECK (result IN ('pass', 'partial', 'fail')),
    observations TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dr_tests_plan_id ON dr_tests(dr_plan_id);

-- RLS
ALTER TABLE dr_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY dr_plans_tenant_isolation ON dr_plans
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE dr_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY dr_tests_tenant ON dr_tests
    USING (
        EXISTS (
            SELECT 1 FROM dr_plans dp
            WHERE dp.id = dr_tests.dr_plan_id
            AND dp.org_id = current_setting('app.current_org_id', true)::uuid
        )
    );

-- +goose Down

DROP TABLE IF EXISTS dr_tests;
DROP TABLE IF EXISTS dr_plan_assets;
DROP TABLE IF EXISTS dr_plans;
