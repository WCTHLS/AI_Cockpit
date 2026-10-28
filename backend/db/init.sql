-- WCT AI Value Cockpit — Agent Scorecard MVP schema (SQLite)
-- Created from the current init.sql and sales cockpit concepts.
-- Grain: scorecard row = one agent + one team + one calendar month.
-- Store raw facts here; derive rates/totals in v_agent_scorecard_monthly.
-- Currency is explicit on every financial fact. Amounts should be stored in one
-- reporting currency per tenant/month before cross-currency aggregation.

PRAGMA foreign_keys = ON;

-- 1. Company / organisation hierarchy
CREATE TABLE IF NOT EXISTS company (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    reporting_currency TEXT NOT NULL DEFAULT 'USD',
    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_function (
    id              INTEGER PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, name),
    UNIQUE(id, company_id)
);

CREATE TABLE IF NOT EXISTS team (
    id              INTEGER PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    function_id     INTEGER NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(function_id, company_id)
        REFERENCES business_function(id, company_id),
    UNIQUE(function_id, name),
    UNIQUE(id, company_id)
);

-- 2. Employees and AI agents
-- Prefer a pseudonymous external_user_key for analytics; avoid storing prompts or PII.
CREATE TABLE IF NOT EXISTS employee (
    id                  INTEGER PRIMARY KEY,
    company_id          INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    team_id             INTEGER NOT NULL,
    external_user_key   TEXT NOT NULL,
    display_name        TEXT,
    email               TEXT,
    is_active           INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
    joined_on           TEXT,
    left_on             TEXT,
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(team_id, company_id) REFERENCES team(id, company_id),
    UNIQUE(company_id, external_user_key)
);

CREATE TABLE IF NOT EXISTS ai_agent (
    id              INTEGER PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    category        TEXT NOT NULL CHECK (category IN ('built_in','built_with','built_using')),
    agent_type      TEXT NOT NULL DEFAULT 'custom'
                    CHECK (agent_type IN ('coding_assistant','chat_assistant','workflow_agent',
                                          'rag_agent','automation','other')),
    provider        TEXT, -- e.g. GitHub, Cursor, OpenAI, Anthropic, internal
    product_name    TEXT, -- e.g. Copilot Business, Claude Code, internal HR assistant
    portfolio       TEXT NOT NULL DEFAULT 'Default',
    description     TEXT,
    go_live_date    TEXT, -- ISO date YYYY-MM-DD
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    monthly_infra_cost REAL NOT NULL DEFAULT 0.0,
    input_token_price_per_1m REAL NOT NULL DEFAULT 2.50,
    output_token_price_per_1m REAL NOT NULL DEFAULT 10.00,
    model           TEXT NOT NULL DEFAULT 'gpt-4o',
    baseline_employee_hours REAL NOT NULL DEFAULT 0.5,
    employee_monthly_rate REAL NOT NULL DEFAULT 0.0,
    business_function TEXT,
    team            TEXT,
    config_json     TEXT,
    UNIQUE(company_id, name),
    UNIQUE(id, company_id)
);

-- A team can use multiple agents; an agent can be used by multiple teams.
-- This relationship also provides the attribution boundary for the scorecard.
CREATE TABLE IF NOT EXISTS team_agent (
    id              INTEGER PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    team_id         INTEGER NOT NULL,
    agent_id        INTEGER NOT NULL,
    assigned_from   TEXT NOT NULL DEFAULT (date('now')),
    assigned_to     TEXT,
    allocation_pct  REAL NOT NULL DEFAULT 100 CHECK (allocation_pct >= 0 AND allocation_pct <= 100),
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
    FOREIGN KEY(team_id, company_id) REFERENCES team(id, company_id),
    FOREIGN KEY(agent_id, company_id) REFERENCES ai_agent(id, company_id),
    UNIQUE(team_id, agent_id, assigned_from)
);

-- Individual employee to agent assignment mapping
CREATE TABLE IF NOT EXISTS employee_agent (
    id              INTEGER PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    employee_id     INTEGER NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    agent_id        INTEGER NOT NULL REFERENCES ai_agent(id) ON DELETE CASCADE,
    assigned_from   TEXT NOT NULL DEFAULT (date('now')),
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(employee_id, company_id) REFERENCES employee(id, company_id),
    FOREIGN KEY(agent_id, company_id) REFERENCES ai_agent(id, company_id),
    UNIQUE(employee_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_agent_emp ON employee_agent(employee_id, agent_id);

-- 3. Data source / ingestion lineage
CREATE TABLE IF NOT EXISTS data_source (
    id              INTEGER PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    provider        TEXT NOT NULL, -- GitHub, Cursor, CSV, OpenTelemetry, internal API, etc.
    source_name     TEXT NOT NULL,
    source_type     TEXT NOT NULL CHECK (source_type IN ('api','csv','manual','telemetry','billing_export')),
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
    last_sync_at    TEXT,
    sync_status     TEXT NOT NULL DEFAULT 'not_run'
                    CHECK (sync_status IN ('not_run','success','partial','failed')),
    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, provider, source_name),
    UNIQUE(id, company_id)
);

CREATE TABLE IF NOT EXISTS ingestion_batch (
    id              INTEGER PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    source_id       INTEGER NOT NULL,
    started_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at    TEXT,
    status          TEXT NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running','success','partial','failed')),
    records_read    INTEGER NOT NULL DEFAULT 0,
    records_loaded  INTEGER NOT NULL DEFAULT 0,
    records_rejected INTEGER NOT NULL DEFAULT 0,
    error_summary   TEXT,
    FOREIGN KEY(source_id, company_id) REFERENCES data_source(id, company_id)
);

-- 4. Usage: one aggregate row per agent/team/employee/day/source.
-- Do not put prompts or generated content in this table.
CREATE TABLE IF NOT EXISTS agent_usage_daily (
    id                  INTEGER PRIMARY KEY,
    company_id          INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    usage_date          TEXT NOT NULL, -- ISO date
    agent_id            INTEGER NOT NULL,
    team_id             INTEGER NOT NULL,
    employee_id         INTEGER,
    source_id           INTEGER REFERENCES data_source(id),
    batch_id            INTEGER REFERENCES ingestion_batch(id),
    source_record_key   TEXT,
    sessions_count      INTEGER NOT NULL DEFAULT 0 CHECK (sessions_count >= 0),
    tasks_count         INTEGER NOT NULL DEFAULT 0 CHECK (tasks_count >= 0),
    active_minutes      REAL NOT NULL DEFAULT 0 CHECK (active_minutes >= 0),
    input_tokens        INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
    output_tokens       INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
    suggestions_shown   INTEGER NOT NULL DEFAULT 0 CHECK (suggestions_shown >= 0),
    suggestions_accepted INTEGER NOT NULL DEFAULT 0 CHECK (suggestions_accepted >= 0),
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(agent_id, company_id) REFERENCES ai_agent(id, company_id),
    FOREIGN KEY(team_id, company_id) REFERENCES team(id, company_id),
    FOREIGN KEY(employee_id) REFERENCES employee(id),
    UNIQUE(source_id, source_record_key)
);

CREATE INDEX IF NOT EXISTS idx_usage_company_date ON agent_usage_daily(company_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_usage_agent_team_date ON agent_usage_daily(agent_id, team_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_usage_employee_date ON agent_usage_daily(employee_id, usage_date);

-- Aggregated daily employee agent usage table
CREATE TABLE IF NOT EXISTS user_usage (
    id                          INTEGER PRIMARY KEY,
    company_id                  INTEGER NOT NULL DEFAULT 1,
    employee_id                 INTEGER NOT NULL,
    agent_id                    INTEGER NOT NULL,
    usage_date                  TEXT NOT NULL, -- YYYY-MM-DD
    sessions_count              INTEGER NOT NULL DEFAULT 1,
    daily_usage_json            TEXT NOT NULL,
    created_at                  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(employee_id) REFERENCES employee(id) ON DELETE CASCADE,
    FOREIGN KEY(agent_id) REFERENCES ai_agent(id) ON DELETE CASCADE,
    UNIQUE(employee_id, agent_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_user_usage_emp_date ON user_usage(employee_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_user_usage_agent_date ON user_usage(agent_id, usage_date);

-- 5. Custom-agent task runs (optional in the first iteration; essential for granular custom agents).
CREATE TABLE IF NOT EXISTS agent_run (
    id                  INTEGER PRIMARY KEY,
    company_id          INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    external_run_id     TEXT,
    agent_id            INTEGER NOT NULL,
    team_id             INTEGER NOT NULL,
    employee_id         INTEGER,
    source_id           INTEGER REFERENCES data_source(id),
    batch_id            INTEGER REFERENCES ingestion_batch(id),
    started_at          TEXT NOT NULL,
    completed_at        TEXT,
    status              TEXT NOT NULL CHECK (status IN ('success','failure','timeout','cancelled','running')),
    duration_ms         INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
    tool_call_count     INTEGER NOT NULL DEFAULT 0 CHECK (tool_call_count >= 0),
    input_tokens        INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
    output_tokens       INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
    estimated_cost      REAL CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
    cost_currency       TEXT NOT NULL DEFAULT 'USD',
    outcome_type        TEXT,
    outcome_success    INTEGER CHECK (outcome_success IS NULL OR outcome_success IN (0,1)),
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(agent_id, company_id) REFERENCES ai_agent(id, company_id),
    FOREIGN KEY(team_id, company_id) REFERENCES team(id, company_id),
    FOREIGN KEY(employee_id) REFERENCES employee(id),
    UNIQUE(company_id, source_id, external_run_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_run_agent_team_started
    ON agent_run(agent_id, team_id, started_at);

-- 6. Hours saved / value assumptions.
-- For the MVP, hours_saved may be an approved monthly estimate imported from a team owner.
-- Keep the methodology and approval status so estimated value is not presented as measured fact.
CREATE TABLE IF NOT EXISTS value_measurement_month (
    id                  INTEGER PRIMARY KEY,
    company_id          INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    month_start         TEXT NOT NULL, -- always YYYY-MM-01
    agent_id            INTEGER NOT NULL,
    team_id             INTEGER NOT NULL,
    hours_saved         REAL NOT NULL DEFAULT 0 CHECK (hours_saved >= 0),
    measurement_method  TEXT NOT NULL DEFAULT 'manual_estimate'
                        CHECK (measurement_method IN ('measured','survey_reported',
                                                      'manual_estimate','model_estimate')),
    baseline_minutes    REAL CHECK (baseline_minutes IS NULL OR baseline_minutes >= 0),
    eligible_task_count INTEGER CHECK (eligible_task_count IS NULL OR eligible_task_count >= 0),
    confidence_level    TEXT CHECK (confidence_level IS NULL OR confidence_level IN ('low','medium','high')),
    approval_status     TEXT NOT NULL DEFAULT 'pending'
                        CHECK (approval_status IN ('pending','approved','rejected')),
    approved_by         TEXT,
    approved_at         TEXT,
    source_id           INTEGER REFERENCES data_source(id),
    notes               TEXT,
    FOREIGN KEY(agent_id, company_id) REFERENCES ai_agent(id, company_id),
    FOREIGN KEY(team_id, company_id) REFERENCES team(id, company_id),
    UNIQUE(agent_id, team_id, month_start)
);

-- Time-varying fully loaded hourly cost. Use the effective rate for the reporting month.
CREATE TABLE IF NOT EXISTS team_hourly_cost_rate (
    id              INTEGER PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    team_id         INTEGER NOT NULL,
    effective_from  TEXT NOT NULL,
    effective_to    TEXT,
    hourly_cost     REAL NOT NULL CHECK (hourly_cost >= 0),
    currency        TEXT NOT NULL DEFAULT 'USD',
    source_id       INTEGER REFERENCES data_source(id),
    approved_by     TEXT,
    FOREIGN KEY(team_id, company_id) REFERENCES team(id, company_id),
    UNIQUE(team_id, effective_from)
);

-- 7. Cost records: keep each factor as a separate record for auditability.
CREATE TABLE IF NOT EXISTS cost_record (
    id              INTEGER PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    month_start     TEXT NOT NULL, -- YYYY-MM-01
    agent_id        INTEGER NOT NULL,
    team_id         INTEGER NOT NULL,
    cost_category   TEXT NOT NULL CHECK (cost_category IN
                    ('licence','consumption','platform','build_run','enablement','other')),
    amount          REAL NOT NULL CHECK (amount >= 0),
    currency        TEXT NOT NULL DEFAULT 'USD',
    cost_basis      TEXT NOT NULL CHECK (cost_basis IN
                    ('vendor_invoice','vendor_usage_api','token_pricing_estimate',
                     'allocated_subscription_cost','manual_entry')),
    source_id       INTEGER REFERENCES data_source(id),
    batch_id        INTEGER REFERENCES ingestion_batch(id),
    external_record_key TEXT,
    notes           TEXT,
    FOREIGN KEY(agent_id, company_id) REFERENCES ai_agent(id, company_id),
    FOREIGN KEY(team_id, company_id) REFERENCES team(id, company_id),
    UNIQUE(source_id, external_record_key)
);

CREATE INDEX IF NOT EXISTS idx_cost_agent_team_month
    ON cost_record(agent_id, team_id, month_start);

-- Budget is tracked at agent/team/month/cost-factor granularity.
CREATE TABLE IF NOT EXISTS agent_budget_month (
    id              INTEGER PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    month_start     TEXT NOT NULL,
    agent_id        INTEGER NOT NULL,
    team_id         INTEGER NOT NULL,
    cost_category   TEXT NOT NULL CHECK (cost_category IN
                    ('licence','consumption','platform','build_run','enablement','other')),
    budget_amount   REAL NOT NULL CHECK (budget_amount >= 0),
    currency        TEXT NOT NULL DEFAULT 'USD',
    approved_by     TEXT,
    approved_at     TEXT,
    FOREIGN KEY(agent_id, company_id) REFERENCES ai_agent(id, company_id),
    FOREIGN KEY(team_id, company_id) REFERENCES team(id, company_id),
    UNIQUE(agent_id, team_id, month_start, cost_category)
);

-- 8. Seat/licence snapshots: monthly provider-reported counts.
CREATE TABLE IF NOT EXISTS agent_seat_month (
    id              INTEGER PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    month_start     TEXT NOT NULL,
    agent_id        INTEGER NOT NULL,
    team_id         INTEGER NOT NULL,
    purchased_seats INTEGER NOT NULL DEFAULT 0 CHECK (purchased_seats >= 0),
    assigned_seats  INTEGER NOT NULL DEFAULT 0 CHECK (assigned_seats >= 0),
    active_seats    INTEGER NOT NULL DEFAULT 0 CHECK (active_seats >= 0),
    cost_per_seat   REAL CHECK (cost_per_seat IS NULL OR cost_per_seat >= 0),
    currency        TEXT NOT NULL DEFAULT 'USD',
    source_id       INTEGER REFERENCES data_source(id),
    batch_id        INTEGER REFERENCES ingestion_batch(id),
    FOREIGN KEY(agent_id, company_id) REFERENCES ai_agent(id, company_id),
    FOREIGN KEY(team_id, company_id) REFERENCES team(id, company_id),
    UNIQUE(agent_id, team_id, month_start)
);

-- 9. Evaluation results. One row per evaluation run / suite.
CREATE TABLE IF NOT EXISTS agent_evaluation (
    id              INTEGER PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    external_eval_id TEXT,
    agent_id        INTEGER NOT NULL,
    team_id         INTEGER NOT NULL,
    evaluated_at    TEXT NOT NULL,
    eval_suite      TEXT,
    total_cases     INTEGER NOT NULL DEFAULT 0 CHECK (total_cases >= 0),
    passed_cases    INTEGER NOT NULL DEFAULT 0 CHECK (passed_cases >= 0 AND passed_cases <= total_cases),
    score           REAL CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
    source_id       INTEGER REFERENCES data_source(id),
    batch_id        INTEGER REFERENCES ingestion_batch(id),
    notes           TEXT,
    FOREIGN KEY(agent_id, company_id) REFERENCES ai_agent(id, company_id),
    FOREIGN KEY(team_id, company_id) REFERENCES team(id, company_id),
    UNIQUE(company_id, source_id, external_eval_id)
);

CREATE INDEX IF NOT EXISTS idx_eval_agent_team_date
    ON agent_evaluation(agent_id, team_id, evaluated_at);

-- 10. Policy/security/operational incidents.
-- Store metadata and references only; avoid storing sensitive prompts or incident payloads.
CREATE TABLE IF NOT EXISTS agent_incident (
    id              INTEGER PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    external_incident_id TEXT,
    agent_id        INTEGER NOT NULL,
    team_id         INTEGER NOT NULL,
    occurred_at     TEXT NOT NULL,
    incident_type   TEXT NOT NULL CHECK (incident_type IN
                    ('policy','security','privacy','quality','availability','cost','other')),
    severity        TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
    status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','investigating','resolved','dismissed')),
    source_id       INTEGER REFERENCES data_source(id),
    summary         TEXT,
    resolved_at     TEXT,
    FOREIGN KEY(agent_id, company_id) REFERENCES ai_agent(id, company_id),
    FOREIGN KEY(team_id, company_id) REFERENCES team(id, company_id),
    UNIQUE(company_id, source_id, external_incident_id)
);

CREATE INDEX IF NOT EXISTS idx_incident_agent_team_date
    ON agent_incident(agent_id, team_id, occurred_at);

-- 11. Editable action thresholds; initial values follow the current draft PRD.
CREATE TABLE IF NOT EXISTS config_threshold (
    key             TEXT PRIMARY KEY,
    numeric_value   REAL NOT NULL,
    description     TEXT NOT NULL,
    updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by      TEXT
);

INSERT OR IGNORE INTO config_threshold(key, numeric_value, description) VALUES
 ('experiment_days', 60, 'Days in production below which action is Experiment'),
 ('intervene_eval_pass_pct', 88, 'Intervene if weighted evaluation pass rate is below this percentage'),
 ('intervene_cost_budget_pct', 110, 'Intervene if cost is above this percentage of budget'),
 ('intervene_net_value_min', 15000, 'Intervene if net value is below this amount'),
 ('accelerate_net_value_min', 40000, 'Accelerate if net value is at least this amount'),
 ('accelerate_adoption_min_pct', 70, 'Accelerate if adoption is at least this percentage');

-- 12. Monthly scorecard view.
-- Important: each fact source is aggregated separately before joining to avoid row multiplication.
-- adoption denominator uses assigned seats (licensed/assigned seats) when seat data exists.
-- If no seat snapshot exists, adoption_pct is NULL rather than falsely showing 0%.
CREATE VIEW IF NOT EXISTS v_agent_scorecard_monthly AS
WITH months AS (
    SELECT month_start FROM value_measurement_month
    UNION SELECT month_start FROM cost_record
    UNION SELECT month_start FROM agent_budget_month
    UNION SELECT month_start FROM agent_seat_month
    UNION SELECT substr(evaluated_at,1,7) || '-01' FROM agent_evaluation
    UNION SELECT substr(occurred_at,1,7) || '-01' FROM agent_incident
    UNION SELECT substr(usage_date,1,7) || '-01' FROM agent_usage_daily
),
agent_team_month AS (
    SELECT ta.company_id, ta.agent_id, ta.team_id, m.month_start
    FROM team_agent ta CROSS JOIN months m
    WHERE ta.is_active = 1
      AND ta.assigned_from <= date(m.month_start, '+1 month', '-1 day')
      AND (ta.assigned_to IS NULL OR ta.assigned_to >= m.month_start)
),
usage AS (
    SELECT company_id, agent_id, team_id, substr(usage_date,1,7) || '-01' AS month_start,
           COUNT(DISTINCT CASE WHEN tasks_count > 0 OR sessions_count > 0 THEN employee_id END) AS active_users,
           SUM(tasks_count) AS tasks_count,
           SUM(input_tokens) AS input_tokens,
           SUM(output_tokens) AS output_tokens,
           SUM(suggestions_shown) AS suggestions_shown,
           SUM(suggestions_accepted) AS suggestions_accepted
    FROM agent_usage_daily
    GROUP BY company_id, agent_id, team_id, substr(usage_date,1,7)
),
costs AS (
    SELECT company_id, agent_id, team_id, month_start, currency,
           SUM(amount) AS total_cost,
           SUM(CASE WHEN cost_category='licence' THEN amount ELSE 0 END) AS cost_licence,
           SUM(CASE WHEN cost_category='consumption' THEN amount ELSE 0 END) AS cost_consumption,
           SUM(CASE WHEN cost_category='platform' THEN amount ELSE 0 END) AS cost_platform,
           SUM(CASE WHEN cost_category='build_run' THEN amount ELSE 0 END) AS cost_build_run,
           SUM(CASE WHEN cost_category='enablement' THEN amount ELSE 0 END) AS cost_enablement,
           SUM(CASE WHEN cost_category='other' THEN amount ELSE 0 END) AS cost_other
    FROM cost_record
    GROUP BY company_id, agent_id, team_id, month_start, currency
),
budgets AS (
    SELECT company_id, agent_id, team_id, month_start, currency, SUM(budget_amount) AS budget
    FROM agent_budget_month
    GROUP BY company_id, agent_id, team_id, month_start, currency
),
seats AS (
    SELECT company_id, agent_id, team_id, month_start, currency,
           MAX(purchased_seats) AS purchased_seats,
           MAX(assigned_seats) AS assigned_seats,
           MAX(active_seats) AS reported_active_seats,
           MAX(cost_per_seat) AS cost_per_seat
    FROM agent_seat_month
    GROUP BY company_id, agent_id, team_id, month_start, currency
),
evaluations AS (
    SELECT company_id, agent_id, team_id, substr(evaluated_at,1,7) || '-01' AS month_start,
           SUM(total_cases) AS eval_cases,
           SUM(passed_cases) AS eval_passed_cases,
           CASE WHEN SUM(total_cases) > 0
                THEN 100.0 * SUM(passed_cases) / SUM(total_cases) ELSE NULL END AS eval_pass_rate
    FROM agent_evaluation
    GROUP BY company_id, agent_id, team_id, substr(evaluated_at,1,7)
),
incidents AS (
    SELECT company_id, agent_id, team_id, substr(occurred_at,1,7) || '-01' AS month_start,
           COUNT(*) AS incident_count,
           SUM(CASE WHEN severity IN ('high','critical') AND status <> 'dismissed' THEN 1 ELSE 0 END) AS high_severity_incidents,
           SUM(CASE WHEN status IN ('open','investigating') THEN 1 ELSE 0 END) AS open_incidents
    FROM agent_incident
    GROUP BY company_id, agent_id, team_id, substr(occurred_at,1,7)
),
values_m AS (
    SELECT company_id, agent_id, team_id, month_start,
           COUNT(*) AS measurement_count,
           SUM(hours_saved) AS hours_saved,
           MAX(measurement_method) AS measurement_method,
           MAX(approval_status) AS approval_status
    FROM value_measurement_month
    GROUP BY company_id, agent_id, team_id, month_start
),
rates AS (
    SELECT atm.company_id, atm.agent_id, atm.team_id, atm.month_start,
           (SELECT r.hourly_cost FROM team_hourly_cost_rate r
            WHERE r.team_id = atm.team_id
              AND r.effective_from <= date(atm.month_start, '+1 month', '-1 day')
              AND (r.effective_to IS NULL OR r.effective_to >= atm.month_start)
            ORDER BY r.effective_from DESC LIMIT 1) AS hourly_cost
    FROM agent_team_month atm
)
SELECT
    atm.company_id,
    atm.month_start,
    f.id AS function_id,
    f.name AS function_name,
    t.id AS team_id,
    t.name AS team_name,
    a.id AS agent_id,
    a.name AS agent_name,
    a.category AS agent_category,
    a.agent_type,
    a.provider,
    a.product_name,
    a.portfolio,
    a.go_live_date,
    CAST(julianday(date(atm.month_start, '+1 month', '-1 day')) - julianday(a.go_live_date) + 1 AS INTEGER)
        AS days_in_prod_at_month_end,
    COALESCE(NULLIF(u.active_users, 0), s.reported_active_seats, 0) AS active_users,
    s.assigned_seats AS licensed_users,
    CASE WHEN s.assigned_seats > 0 THEN 100.0 * COALESCE(NULLIF(u.active_users, 0), s.reported_active_seats, 0) / s.assigned_seats
         ELSE NULL END AS adoption_pct,
    COALESCE(u.tasks_count, 0) AS tasks_count,
    COALESCE(u.input_tokens, 0) AS input_tokens,
    COALESCE(u.output_tokens, 0) AS output_tokens,
    COALESCE(u.suggestions_shown, 0) AS suggestions_shown,
    COALESCE(u.suggestions_accepted, 0) AS suggestions_accepted,
    CASE WHEN u.suggestions_shown > 0
         THEN 100.0 * u.suggestions_accepted / u.suggestions_shown ELSE NULL END AS suggestion_acceptance_pct,
    COALESCE(v.hours_saved, 0) AS hours_saved,
    v.measurement_method,
    v.approval_status AS value_approval_status,
    r.hourly_cost,
    CASE WHEN r.hourly_cost IS NOT NULL THEN COALESCE(v.hours_saved,0) * r.hourly_cost ELSE NULL END AS gross_value,
    COALESCE(c.total_cost, 0) AS total_cost,
    COALESCE(c.cost_licence, 0) AS cost_licence,
    COALESCE(c.cost_consumption, 0) AS cost_consumption,
    COALESCE(c.cost_platform, 0) AS cost_platform,
    COALESCE(c.cost_build_run, 0) AS cost_build_run,
    COALESCE(c.cost_enablement, 0) AS cost_enablement,
    COALESCE(c.cost_other, 0) AS cost_other,
    CASE WHEN r.hourly_cost IS NOT NULL
         THEN COALESCE(v.hours_saved,0) * r.hourly_cost - COALESCE(c.total_cost,0) ELSE NULL END AS net_value,
    COALESCE(b.budget, 0) AS budget,
    CASE WHEN COALESCE(b.budget,0) > 0
         THEN 100.0 * COALESCE(c.total_cost,0) / b.budget ELSE NULL END AS cost_vs_budget_pct,
    COALESCE(e.eval_cases,0) AS eval_cases,
    COALESCE(e.eval_passed_cases,0) AS eval_passed_cases,
    e.eval_pass_rate,
    COALESCE(i.incident_count,0) AS incident_count,
    COALESCE(i.high_severity_incidents,0) AS high_severity_incidents,
    COALESCE(i.open_incidents,0) AS open_incidents,
    s.purchased_seats,
    s.assigned_seats,
    s.reported_active_seats,
    CASE
      WHEN a.go_live_date IS NULL THEN 'Experiment'
      WHEN julianday(date(atm.month_start, '+1 month', '-1 day')) - julianday(a.go_live_date) < (SELECT numeric_value FROM config_threshold WHERE key='experiment_days') THEN 'Experiment'
      WHEN (e.eval_pass_rate IS NOT NULL AND e.eval_pass_rate < (SELECT numeric_value FROM config_threshold WHERE key='intervene_eval_pass_pct'))
        OR (b.budget > 0 AND COALESCE(c.total_cost,0) > b.budget * (SELECT numeric_value FROM config_threshold WHERE key='intervene_cost_budget_pct') / 100.0)
        OR (r.hourly_cost IS NOT NULL AND (COALESCE(v.hours_saved,0) * r.hourly_cost - COALESCE(c.total_cost,0)) < (SELECT numeric_value FROM config_threshold WHERE key='intervene_net_value_min'))
        OR COALESCE(i.incident_count,0) > 0 THEN 'Intervene'
      WHEN r.hourly_cost IS NOT NULL
        AND (COALESCE(v.hours_saved,0) * r.hourly_cost - COALESCE(c.total_cost,0)) >= (SELECT numeric_value FROM config_threshold WHERE key='accelerate_net_value_min')
        AND s.assigned_seats > 0
        AND (100.0 * COALESCE(NULLIF(u.active_users, 0), s.reported_active_seats, 0) / s.assigned_seats) >= (SELECT numeric_value FROM config_threshold WHERE key='accelerate_adoption_min_pct')
        THEN 'Accelerate'
      ELSE 'Optimize'
    END AS action_label,
    CASE WHEN r.hourly_cost IS NULL THEN 'missing_hourly_cost'
         WHEN COALESCE(v.measurement_count,0) = 0 THEN 'missing_value_measurement'
         WHEN s.assigned_seats IS NULL THEN 'missing_seat_snapshot'
         WHEN b.budget IS NULL THEN 'missing_budget'
         ELSE 'complete' END AS data_quality_status
FROM agent_team_month atm
JOIN ai_agent a ON a.id = atm.agent_id AND a.company_id = atm.company_id
JOIN team t ON t.id = atm.team_id AND t.company_id = atm.company_id
JOIN business_function f ON f.id = t.function_id AND f.company_id = t.company_id
LEFT JOIN usage u ON u.company_id=atm.company_id AND u.agent_id=atm.agent_id AND u.team_id=atm.team_id AND u.month_start=atm.month_start
LEFT JOIN costs c ON c.company_id=atm.company_id AND c.agent_id=atm.agent_id AND c.team_id=atm.team_id AND c.month_start=atm.month_start
LEFT JOIN budgets b ON b.company_id=atm.company_id AND b.agent_id=atm.agent_id AND b.team_id=atm.team_id AND b.month_start=atm.month_start
LEFT JOIN seats s ON s.company_id=atm.company_id AND s.agent_id=atm.agent_id AND s.team_id=atm.team_id AND s.month_start=atm.month_start
LEFT JOIN evaluations e ON e.company_id=atm.company_id AND e.agent_id=atm.agent_id AND e.team_id=atm.team_id AND e.month_start=atm.month_start
LEFT JOIN incidents i ON i.company_id=atm.company_id AND i.agent_id=atm.agent_id AND i.team_id=atm.team_id AND i.month_start=atm.month_start
LEFT JOIN values_m v ON v.company_id=atm.company_id AND v.agent_id=atm.agent_id AND v.team_id=atm.team_id AND v.month_start=atm.month_start
LEFT JOIN rates r ON r.company_id=atm.company_id AND r.agent_id=atm.agent_id AND r.team_id=atm.team_id AND r.month_start=atm.month_start
WHERE a.is_active = 1 AND t.is_active = 1;

-- Recommended indexes for common filters.
CREATE INDEX IF NOT EXISTS idx_team_company_function ON team(company_id, function_id);
CREATE INDEX IF NOT EXISTS idx_agent_company_portfolio ON ai_agent(company_id, portfolio, is_active);
CREATE INDEX IF NOT EXISTS idx_value_agent_team_month ON value_measurement_month(agent_id, team_id, month_start);
CREATE INDEX IF NOT EXISTS idx_budget_agent_team_month ON agent_budget_month(agent_id, team_id, month_start);
CREATE INDEX IF NOT EXISTS idx_seats_agent_team_month ON agent_seat_month(agent_id, team_id, month_start);
