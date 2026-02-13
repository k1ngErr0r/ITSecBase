-- +goose Up

CREATE TABLE risk_matrix_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE UNIQUE,
    likelihood_labels JSONB NOT NULL DEFAULT '["Rare","Unlikely","Possible","Likely","Almost Certain"]',
    impact_labels JSONB NOT NULL DEFAULT '["Negligible","Minor","Moderate","Major","Severe"]',
    level_thresholds JSONB NOT NULL DEFAULT '{"1":{"1":"Low","2":"Low","3":"Low","4":"Medium","5":"Medium"},"2":{"1":"Low","2":"Low","3":"Medium","4":"Medium","5":"High"},"3":{"1":"Low","2":"Medium","3":"Medium","4":"High","5":"High"},"4":{"1":"Medium","2":"Medium","3":"High","4":"High","5":"Extreme"},"5":{"1":"Medium","2":"High","3":"High","4":"Extreme","5":"Extreme"}}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    scenario TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',
    inherent_likelihood INT CHECK (inherent_likelihood BETWEEN 1 AND 5),
    inherent_impact INT CHECK (inherent_impact BETWEEN 1 AND 5),
    residual_likelihood INT CHECK (residual_likelihood BETWEEN 1 AND 5),
    residual_impact INT CHECK (residual_impact BETWEEN 1 AND 5),
    status TEXT NOT NULL DEFAULT 'identified' CHECK (status IN ('identified', 'assessed', 'accepted', 'mitigated', 'closed')),
    owner_id UUID REFERENCES users(id),
    approver_id UUID REFERENCES users(id),
    review_date TIMESTAMPTZ,
    last_reviewed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risks_org_id ON risks(org_id);
CREATE INDEX idx_risks_status ON risks(status);
CREATE INDEX idx_risks_owner_id ON risks(owner_id);

CREATE TABLE risk_assets (
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    PRIMARY KEY (risk_id, asset_id)
);

CREATE TABLE risk_treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    responsible_id UUID REFERENCES users(id),
    deadline TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_treatments_risk_id ON risk_treatments(risk_id);

-- RLS
ALTER TABLE risk_matrix_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY risk_matrix_tenant ON risk_matrix_config
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY risks_tenant_isolation ON risks
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE risk_treatments ENABLE ROW LEVEL SECURITY;
CREATE POLICY risk_treatments_tenant ON risk_treatments
    USING (
        EXISTS (
            SELECT 1 FROM risks r
            WHERE r.id = risk_treatments.risk_id
            AND r.org_id = current_setting('app.current_org_id', true)::uuid
        )
    );

-- +goose Down

DROP TABLE IF EXISTS risk_treatments;
DROP TABLE IF EXISTS risk_assets;
DROP TABLE IF EXISTS risks;
DROP TABLE IF EXISTS risk_matrix_config;
