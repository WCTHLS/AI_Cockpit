-- =============================================================================
-- WCT AI Value Cockpit — PostgreSQL Schema
-- Covers: agents, metrics, costs, seats, action rules, users
-- =============================================================================

-- ── Extension ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── ENUM TYPES ───────────────────────────────────────────────────────────────
CREATE TYPE agent_category AS ENUM ('built_in', 'built_with', 'built_using');
CREATE TYPE action_label AS ENUM ('experiment', 'intervene', 'accelerate', 'optimize');
CREATE TYPE cost_factor AS ENUM ('licence', 'consumption', 'platform', 'build_run', 'enablement');
CREATE TYPE user_role AS ENUM ('cxo', 'function_head', 'team_owner', 'finops', 'admin');

-- ── BUSINESS FUNCTIONS ──────────────────────────────────────────────────────
CREATE TABLE business_function (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO business_function (name) VALUES
    ('Engineering & IT'),
    ('Customer Operations'),
    ('Sales & Marketing'),
    ('Finance & Actuarial'),
    ('HR & Admin');

-- ── TEAMS ───────────────────────────────────────────────────────────────────
CREATE TABLE team (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    function_id     INT NOT NULL REFERENCES business_function(id),
    loaded_hourly_cost NUMERIC(10,2) DEFAULT 85.00,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── AGENTS ──────────────────────────────────────────────────────────────────
CREATE TABLE agent (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    category        agent_category NOT NULL,
    team_id         INT NOT NULL REFERENCES team(id),
    portfolio       VARCHAR(100) DEFAULT 'Default',
    description     TEXT,
    go_live_date    DATE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── AGENT MONTHLY METRICS (the core mart) ───────────────────────────────────
CREATE TABLE agent_month (
    id              SERIAL PRIMARY KEY,
    agent_id        INT NOT NULL REFERENCES agent(id),
    month           DATE NOT NULL,  -- always 1st of month
    
    -- Value
    hours_saved     NUMERIC(12,2) DEFAULT 0,
    gross_value     NUMERIC(14,2) DEFAULT 0,  -- hours_saved * loaded_hourly_cost
    
    -- Cost breakdown
    cost_licence    NUMERIC(12,2) DEFAULT 0,
    cost_consumption NUMERIC(12,2) DEFAULT 0,
    cost_platform   NUMERIC(12,2) DEFAULT 0,
    cost_build_run  NUMERIC(12,2) DEFAULT 0,
    cost_enablement NUMERIC(12,2) DEFAULT 0,
    total_cost      NUMERIC(14,2) GENERATED ALWAYS AS (
        cost_licence + cost_consumption + cost_platform + cost_build_run + cost_enablement
    ) STORED,
    net_value       NUMERIC(14,2) GENERATED ALWAYS AS (
        (cost_licence + cost_consumption + cost_platform + cost_build_run + cost_enablement) * -1
        + 0  -- placeholder; we'll compute via trigger
    ) STORED,
    
    -- Budget
    budget          NUMERIC(12,2) DEFAULT 0,
    
    -- Adoption
    total_users     INT DEFAULT 0,
    active_users    INT DEFAULT 0,
    adoption_pct    NUMERIC(5,2) DEFAULT 0,
    
    -- Quality
    eval_pass_rate  NUMERIC(5,2) DEFAULT 0,  -- 0-100
    policy_incidents INT DEFAULT 0,
    
    -- Computed action
    action          action_label,
    
    -- Days in production (at the time of this month)
    days_in_prod    INT DEFAULT 0,

    UNIQUE(agent_id, month)
);

-- Drop the generated columns and use regular columns instead
-- (generated columns can't reference other tables)
ALTER TABLE agent_month DROP COLUMN net_value;
ALTER TABLE agent_month DROP COLUMN total_cost;

ALTER TABLE agent_month ADD COLUMN total_cost NUMERIC(14,2) DEFAULT 0;
ALTER TABLE agent_month ADD COLUMN net_value NUMERIC(14,2) DEFAULT 0;

-- ── Trigger to auto-compute total_cost and net_value ────────────────────────
CREATE OR REPLACE FUNCTION compute_agent_month_values()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_cost := NEW.cost_licence + NEW.cost_consumption + NEW.cost_platform 
                    + NEW.cost_build_run + NEW.cost_enablement;
    NEW.net_value := NEW.gross_value - NEW.total_cost;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compute_values
    BEFORE INSERT OR UPDATE ON agent_month
    FOR EACH ROW
    EXECUTE FUNCTION compute_agent_month_values();

-- ── SEAT INVENTORY (for subscription-based agents) ──────────────────────────
CREATE TABLE seat_inventory (
    id              SERIAL PRIMARY KEY,
    agent_id        INT NOT NULL REFERENCES agent(id),
    month           DATE NOT NULL,
    total_seats     INT DEFAULT 0,
    active_seats    INT DEFAULT 0,
    idle_seats      INT GENERATED ALWAYS AS (total_seats - active_seats) STORED,
    cost_per_seat   NUMERIC(8,2) DEFAULT 30.00,
    total_seat_cost NUMERIC(12,2) GENERATED ALWAYS AS (
        total_seats * cost_per_seat
    ) STORED,
    reclaimable_savings NUMERIC(12,2) GENERATED ALWAYS AS (
        (total_seats - active_seats) * cost_per_seat
    ) STORED,
    UNIQUE(agent_id, month)
);

-- ── ACTION RULE THRESHOLDS (admin-editable) ─────────────────────────────────
CREATE TABLE config_threshold (
    id              SERIAL PRIMARY KEY,
    key             VARCHAR(100) NOT NULL UNIQUE,
    value           NUMERIC(14,2) NOT NULL,
    description     TEXT,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_by      VARCHAR(100)
);

INSERT INTO config_threshold (key, value, description) VALUES
    ('experiment_days', 60, 'Days in production below which agent is "Experiment"'),
    ('intervene_eval_pass', 88, 'Eval pass rate below which triggers "Intervene"'),
    ('intervene_cost_budget_pct', 110, 'Cost as % of budget above which triggers "Intervene"'),
    ('intervene_value_min', 15000, 'Net value below which triggers "Intervene"'),
    ('accelerate_value_min', 40000, 'Net value above which qualifies for "Accelerate"'),
    ('accelerate_adoption_min', 70, 'Adoption % above which qualifies for "Accelerate"');

-- ── USERS (simple JWT auth) ─────────────────────────────────────────────────
CREATE TABLE app_user (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(200) NOT NULL UNIQUE,
    password_hash   VARCHAR(200) NOT NULL,
    display_name    VARCHAR(100),
    role            user_role NOT NULL DEFAULT 'team_owner',
    function_id     INT REFERENCES business_function(id),  -- NULL = all functions (CXO/Admin)
    team_id         INT REFERENCES team(id),                -- NULL = all teams in function
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── VIEWS: Summary aggregations ─────────────────────────────────────────────

-- Executive summary KPIs for a given month
CREATE OR REPLACE VIEW v_executive_summary AS
SELECT
    am.month,
    bf.name AS function_name,
    bf.id AS function_id,
    COUNT(DISTINCT am.agent_id) AS agent_count,
    SUM(am.hours_saved) AS total_hours_saved,
    SUM(am.gross_value) AS total_gross_value,
    SUM(am.total_cost) AS total_cost,
    SUM(am.net_value) AS total_net_value,
    CASE 
        WHEN SUM(am.total_cost) > 0 
        THEN ROUND(SUM(am.gross_value) / SUM(am.total_cost), 2)
        ELSE 0 
    END AS roi_ratio,
    SUM(am.cost_licence) AS total_licence,
    SUM(am.cost_consumption) AS total_consumption,
    SUM(am.cost_platform) AS total_platform,
    SUM(am.cost_build_run) AS total_build_run,
    SUM(am.cost_enablement) AS total_enablement,
    COUNT(DISTINCT am.agent_id) FILTER (WHERE am.action = 'accelerate') AS accelerate_count,
    COUNT(DISTINCT am.agent_id) FILTER (WHERE am.action = 'optimize') AS optimize_count,
    COUNT(DISTINCT am.agent_id) FILTER (WHERE am.action = 'experiment') AS experiment_count,
    COUNT(DISTINCT am.agent_id) FILTER (WHERE am.action = 'intervene') AS intervene_count
FROM agent_month am
JOIN agent a ON a.id = am.agent_id
JOIN team t ON t.id = a.team_id
JOIN business_function bf ON bf.id = t.function_id
GROUP BY am.month, bf.name, bf.id;

-- Where to act: agents flagged "intervene"
CREATE OR REPLACE VIEW v_where_to_act AS
SELECT
    am.month,
    a.name AS agent_name,
    a.id AS agent_id,
    bf.name AS function_name,
    am.net_value,
    CASE 
        WHEN am.budget > 0 
        THEN ROUND((am.total_cost / am.budget) * 100, 0)
        ELSE 0 
    END AS cost_vs_budget_pct,
    am.eval_pass_rate,
    am.action,
    CASE
        WHEN am.eval_pass_rate < 85 THEN 'Tune prompts'
        WHEN am.budget > 0 AND (am.total_cost / am.budget) > 1.15 THEN 'Review cost'
        WHEN am.policy_incidents > 0 THEN 'Add guardrails'
        WHEN am.net_value < 10000 THEN 'Review scope'
        ELSE 'Investigate'
    END AS suggested_action
FROM agent_month am
JOIN agent a ON a.id = am.agent_id
JOIN team t ON t.id = a.team_id
JOIN business_function bf ON bf.id = t.function_id
WHERE am.action = 'intervene';

-- Agent scorecard
CREATE OR REPLACE VIEW v_agent_scorecard AS
SELECT
    am.month,
    a.id AS agent_id,
    a.name AS agent_name,
    a.category,
    a.portfolio,
    t.name AS team_name,
    bf.name AS function_name,
    bf.id AS function_id,
    am.hours_saved,
    am.gross_value,
    am.total_cost,
    am.net_value,
    am.budget,
    am.adoption_pct,
    am.eval_pass_rate,
    am.action,
    am.days_in_prod
FROM agent_month am
JOIN agent a ON a.id = am.agent_id
JOIN team t ON t.id = a.team_id
JOIN business_function bf ON bf.id = t.function_id;

-- Monthly trend
CREATE OR REPLACE VIEW v_monthly_trend AS
SELECT
    am.month,
    SUM(am.gross_value) AS total_gross_value,
    SUM(am.total_cost) AS total_cost,
    SUM(am.net_value) AS total_net_value,
    COUNT(DISTINCT am.agent_id) AS agent_count,
    CASE 
        WHEN SUM(am.total_cost) > 0 
        THEN ROUND(SUM(am.gross_value) / SUM(am.total_cost), 2)
        ELSE 0 
    END AS roi_ratio
FROM agent_month am
GROUP BY am.month
ORDER BY am.month;
