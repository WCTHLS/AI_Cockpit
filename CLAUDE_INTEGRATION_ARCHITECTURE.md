# Claude Enterprise & Developer Platform Integration Architecture
**WCT AI Performance Cockpit — Production Integration & Telemetry Blueprint**

---

## 1. Executive Summary & Architecture Overview

When an enterprise adopts Claude, their AI assets exist across **two separate Anthropic platforms**:
1. **Claude Developer Platform (`console.anthropic.com`):** Custom backend autonomous agents built using the Anthropic API, Claude Agent SDK, LangChain, or CrewAI. Billed on API token consumption.
2. **Claude Enterprise Workspace (`claude.ai`):** Human employees using Claude Chat, Projects, Cowork, Artifacts, and Connectors. Billed per licensed seat.

The **AI Performance Cockpit** integrates these distinct data streams with **Enterprise Business Telemetry** to deliver unified financial exposure, hours saved, labor valuation, and governance actions.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 ENTERPRISE DATA SOURCES                                     │
├───────────────────────────────┬───────────────────────────────┬─────────────────────────────┤
│ 1. Claude Developer Console   │ 2. Claude Enterprise App      │ 3. Agent Runtime Webhook    │
│    (console.anthropic.com)    │    (claude.ai / Enterprise)   │    (Custom Application Code)│
├───────────────────────────────┼───────────────────────────────┼─────────────────────────────┤
│ • Billed Cost ($) per Agent   │ • Employee Seat Utilization   │ • Business Tasks Completed  │
│ • Input/Output/Cache Tokens   │ • Active vs. Idle Days (30d+) │ • Employee Task Attribution │
│ • Model Mix (Sonnet/Opus)     │ • Artifacts & Skills Triggered│ • Outcome Success / Accuracy│
└───────────────┬───────────────┴───────────────┬───────────────┴──────────────┬──────────────┘
                │                               │                              │
                │ GET /cost_report              │ GET /organizations/analytics │ POST /telemetry
                │ GET /usage_report/messages    │                              │
                ▼                               ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                         AI PERFORMANCE COCKPIT INGESTION ENGINE                             │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ • Currency Normalization: Cents -> Decimal USD                                              │
│ • Rolling 7-Day Upsert Deduplication (Handles Anthropic billing revision window)            │
│ • Unattributed Spend Routing: Catches default workspace ($) so totals reconcile to invoice │
│ • Labor Valuation Engine: (Tasks Completed × Role Benchmark) × Dept Hourly Wage             │
└───────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                             COCKPIT DATABASE (cockpit.db)                                   │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ • cost_record: Exact Anthropic billed cloud spend per agent workspace                       │
│ • agent_usage_daily: Uncached, cache-read, and cache-write token telemetry                  │
│ • value_measurement_month: Certified labor hours saved & gross value delivered              │
│ • seat_inventory_item: 4,600 seat license inventory & $30/mo reclaimable idle seats        │
│ • v_agent_scorecard_monthly: Real-time Net Value, ROI Multiplier & Governance Action Tier   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Stream 1: Claude Developer Platform (Console / API)

Used for custom autonomous agents deployed in cloud environments (AWS, Azure, GCP, Kubernetes).

### 2.1 The Architectural Rule: One Workspace per Agent
Anthropic's Cost Report groups costs by `workspace_id` (not by individual API key). Therefore, **each production agent must be assigned its own dedicated Workspace** in the Claude Console:
* Workspace `wrkspc_case_triage` $\rightarrow$ Case Triage Agent
* Workspace `wrkspc_dev_copilot` $\rightarrow$ Developer Copilot
* Workspace `wrkspc_inv_matcher` $\rightarrow$ AP Invoice Matching Agent

### 2.2 Access & Authentication
* **Who provides access:** Organization Owner / Admin of the Claude Console account (`console.anthropic.com`).
* **Credential required:** **Admin API Key** (starts with `sk-ant-admin01-...`).
* **Headers required on all requests:**
  ```http
  x-api-key: sk-ant-admin01-xxxxxxxxxxxxxxxxxxxx
  anthropic-version: 2023-06-01
  content-type: application/json
  ```

---

### 2.3 Endpoint A: Cost Report
Retrieves daily billed cloud spend in USD cents broken down by workspace.

* **Method & URL:** `GET https://api.anthropic.com/v1/organizations/cost_report`
* **Query Parameters:**
  ```
  starting_at: 2026-09-01T00:00:00Z    (ISO-8601 UTC timestamp, required)
  ending_at:   2026-09-24T00:00:00Z    (ISO-8601 UTC timestamp, required)
  group_by[]:  workspace_id            (Must use bracket notation)
  limit:       31                      (Default is 7; max is 31 buckets per page)
  page:        <cursor_string>         (Optional, for cursor-based pagination)
  ```

#### Exact Response JSON Schema
```json
{
  "data": [
    {
      "starting_at": "2026-09-23T00:00:00Z",
      "ending_at": "2026-09-24T00:00:00Z",
      "results": [
        {
          "workspace_id": "wrkspc_01H8X9A2M4N5P6Q7R8S9T0V1W2",
          "amount": "14250.5",
          "currency": "USD",
          "description": "Developer Copilot Backend",
          "cost_type": "token"
        },
        {
          "workspace_id": "wrkspc_01H8X9B3N5P6Q7R8S9T0V1W2X3",
          "amount": "4820.0",
          "currency": "USD",
          "description": "Case Triage Agent Production",
          "cost_type": "token"
        },
        {
          "workspace_id": null,
          "amount": "350.0",
          "currency": "USD",
          "description": "Default Workspace / Shared Sandbox",
          "cost_type": "token"
        }
      ]
    }
  ],
  "has_more": false,
  "next_page": null
}
```

#### Parsing Specifications
1. **Nested Loop:** Data is nested: iterate through `data[]`, grab bucket `starting_at[:10]` as date, then iterate through `results[]`.
2. **Cents Conversion:** `amount` is returned as a decimal string in **cents**. 
   $$\text{USD Amount} = \frac{\text{Decimal}(amount)}{100}$$
   * Example: `"14250.5"` cents $= \$142.505$ USD.
3. **Unattributed Catch-All:** Rows where `workspace_id` is `null` (default workspace) are mapped to `Anthropic Unattributed Spend` to guarantee Cockpit totals match the Anthropic invoice to the cent.

---

### 2.4 Endpoint B: Message Token Usage Report
Retrieves token consumption, including prompt cache creation and cache reads.

* **Method & URL:** `GET https://api.anthropic.com/v1/organizations/usage_report/messages`
* **Query Parameters:**
  ```
  starting_at:  2026-09-01T00:00:00Z   (ISO-8601 UTC timestamp, required)
  ending_at:    2026-09-24T00:00:00Z   (ISO-8601 UTC timestamp, required)
  bucket_width: 1d                     (Explicit daily aggregation)
  group_by[]:   workspace_id           (Bracket notation)
  limit:        31                     (Max page window)
  page:         <cursor_string>        (Optional pagination cursor)
  ```

#### Exact Response JSON Schema
```json
{
  "data": [
    {
      "starting_at": "2026-09-23T00:00:00Z",
      "ending_at": "2026-09-24T00:00:00Z",
      "results": [
        {
          "workspace_id": "wrkspc_01H8X9A2M4N5P6Q7R8S9T0V1W2",
          "uncached_input_tokens": 125000,
          "cache_read_input_tokens": 450000,
          "cache_creation": {
            "ephemeral_5m_input_tokens": 20000,
            "ephemeral_1h_input_tokens": 0
          },
          "output_tokens": 34000
        },
        {
          "workspace_id": "wrkspc_01H8X9B3N5P6Q7R8S9T0V1W2X3",
          "uncached_input_tokens": 45000,
          "cache_read_input_tokens": 120000,
          "cache_creation": {
            "ephemeral_5m_input_tokens": 12000,
            "ephemeral_1h_input_tokens": 0
          },
          "output_tokens": 18500
        }
      ]
    }
  ],
  "has_more": false,
  "next_page": null
}
```

#### Parsing Specifications
* There is no generic `input_tokens` field. Input tokens are partitioned into:
  * `uncached_input_tokens`: Full-price input tokens processed.
  * `cache_read_input_tokens`: Discounted tokens read from Anthropic prompt cache (90% cost reduction).
  * `cache_creation.ephemeral_5m_input_tokens`: Cache write operations.
  * `output_tokens`: Completion tokens generated.

---

## 3. Stream 2: Claude Enterprise Workspace (claude.ai App)

Used for seat-based knowledge workers using Claude for enterprise tasks, Claude Projects, and Cowork.

### 3.1 Access & Authentication
* **Who provides access:** The **Primary Owner** of the organization's Claude Enterprise tenant.
* **Credential required:** **Analytics API Key** generated in `claude.ai` ➔ *Organization Settings* ➔ *API* with the scope `read:analytics`.
* **Headers:**
  ```http
  Authorization: Bearer sk-ant-analytics-xxxxxxxxxxxxxxxxxxxx
  anthropic-version: 2023-06-01
  content-type: application/json
  ```

### 3.2 Endpoint: Enterprise User Adoption & Engagement
* **Method & URL:** `GET https://api.anthropic.com/v1/organizations/analytics/users`
* **Query Parameters:**
  ```
  starting_at: 2026-09-01T00:00:00Z
  ending_at:   2026-09-24T00:00:00Z
  limit:       100
  ```

#### Exact Response JSON Schema
```json
{
  "data": [
    {
      "user_id": "usr_01A8Z9C3K1L2M4N5",
      "email": "sarah.jenkins@wct.com",
      "name": "Sarah Jenkins",
      "group": "Customer Support",
      "role": "member",
      "status": "active",
      "last_active_at": "2026-09-23T14:22:10Z",
      "days_inactive": 0,
      "metrics": {
        "sessions_count": 42,
        "artifacts_created": 15,
        "files_uploaded": 8,
        "connectors_invoked": {
          "salesforce": 24,
          "jira": 18
        }
      }
    },
    {
      "user_id": "usr_01B9Y8D4K2M3N5P6",
      "email": "marcus.vance@wct.com",
      "name": "Marcus Vance",
      "group": "Finance",
      "role": "member",
      "status": "active",
      "last_active_at": "2026-08-14T09:15:00Z",
      "days_inactive": 40,
      "metrics": {
        "sessions_count": 0,
        "artifacts_created": 0,
        "files_uploaded": 0,
        "connectors_invoked": {}
      }
    }
  ],
  "has_more": false,
  "next_page": null
}
```

#### How This Powers the Cockpit
* Feeds the **Seats & Adoption Tab**:
  * `days_inactive <= 6`: Classified as **Active Users (7d)**.
  * `days_inactive between 7 and 29`: Classified as **Lapsing Users (7–29d)**.
  * `days_inactive >= 30`: Classified as **Idle Seats (30+ days)** $\rightarrow$ triggers **1-Click Seat Reclaiming** to immediately recover wasted license spend ($30/seat/mo).

---

## 4. Stream 3: Agent Runtime Telemetry Webhook (The Business Layer)

Anthropic provides raw compute metrics (tokens and spend), but cannot measure whether an agent succeeded at its business task, what employee initiated it, or how many human labor hours were saved.

The Cockpit exposes an open, lightweight ingestion webhook that custom agents ping upon task completion.

### 4.1 Endpoint: Cockpit Runtime Telemetry
* **Method & URL:** `POST https://<cockpit-host>:8000/api/v1/telemetry`
* **Headers:**
  ```http
  Authorization: Bearer <cockpit-agent-jwt>
  Content-Type: application/json
  ```

#### Request Payload JSON Schema
```json
{
  "date": "2026-09-23T14:32:00Z",
  "agent_id": "case-triage-agent",
  "agent_name": "Case Triage Agent",
  "department": "Customer",
  "employee_email": "sarah.jenkins@wct.com",
  "task_type": "ticket_qualification",
  "tasks_completed": 1,
  "tokens_used": 1850,
  "duration_seconds": 12.4,
  "success": true,
  "metadata": {
    "ticket_priority": "P2",
    "resolution_confidence": 0.96
  }
}
```

#### Response JSON Schema
```json
{
  "status": "success",
  "record_id": 89412,
  "valuation": {
    "hours_saved": 0.20,
    "hourly_labor_rate": 45.0,
    "gross_value_usd": 9.00,
    "estimated_compute_cost_usd": 0.021,
    "net_value_usd": 8.979
  },
  "portfolio_impact": {
    "agent_current_month_net_value": 49277.89,
    "governance_action": "accelerate"
  }
}
```

---

## 5. Enterprise Valuation & Calculation Formulas

The AI Performance Cockpit computes return on investment using validated, role-appropriate enterprise standards:

### 5.1 Role-Specific Task Benchmarks
Time saved is not a flat number; it is calibrated to the complexity of the automated task:
* **Complex Legal & Bids** (*RFP Response, Contract Review*): **45–51 mins / task** (0.75 – 0.85 hrs)
* **Financial Reconciliations** (*Variance Analysis, Month End Close*): **30–36 mins / task** (0.50 – 0.60 hrs)
* **Software Engineering** (*Developer Copilot, Code Review*): **21–24 mins / task** (0.35 – 0.40 hrs)
* **AP/AR & Logistics** (*Invoice Matching, Logistics Tracking*): **15 mins / task** (0.25 hrs)
* **Service Desk & Triage** (*Ticket Triage, Case Triage, Passwords*): **9–12 mins / task** (0.15 – 0.20 hrs)

### 5.2 Department Hourly Wage Rates
* **Engineering & IT:** `$85.00 / hr`
* **Sales & Revenue:** `$65.00 / hr`
* **Finance & Accounting:** `$60.00 / hr`
* **Operations & Supply Chain:** `$55.00 / hr`
* **Customer Support:** `$45.00 / hr`

### 5.3 Mathematical Core
$$\text{Hours Saved} = \sum (\text{Tasks Completed} \times \text{Agent Benchmark})$$
$$\text{Gross Labor Value} = \text{Hours Saved} \times \text{Department Wage Rate}$$
$$\text{Net Value Delivered} = \text{Gross Labor Value} - (\text{Anthropic Billed Cost} + \text{Seat License Cost})$$
$$\text{ROI Multiplier} = \frac{\text{Gross Labor Value}}{\text{Total AI Spend}}$$

---

## 6. Complete Database Mapping & Reconciliation (cockpit.db)

All three streams converge into the Cockpit’s relational schema:

```sql
-- 1. Exact Billed Spend from Anthropic Console Cost Report
CREATE TABLE cost_record (
    id                  INTEGER PRIMARY KEY,
    company_id          INTEGER NOT NULL,
    month_start         TEXT NOT NULL, -- YYYY-MM-01
    agent_id            INTEGER NOT NULL,
    team_id             INTEGER NOT NULL,
    cost_category       TEXT NOT NULL CHECK(cost_category IN ('licence','consumption','platform','build_run','enablement')),
    amount              REAL NOT NULL, -- Stored as exact USD
    currency            TEXT NOT NULL DEFAULT 'USD',
    cost_basis          TEXT NOT NULL CHECK(cost_basis IN ('vendor_invoice','vendor_usage_api','token_pricing_estimate','allocated_subscription_cost','manual_entry')),
    source_id           INTEGER NOT NULL,
    external_record_key TEXT NOT NULL,
    UNIQUE(source_id, external_record_key)
);

-- 2. Token Ingestion from Anthropic Message Usage Report
CREATE TABLE agent_usage_daily (
    id                  INTEGER PRIMARY KEY,
    company_id          INTEGER NOT NULL,
    usage_date          TEXT NOT NULL, -- YYYY-MM-DD
    agent_id            INTEGER NOT NULL,
    team_id             INTEGER NOT NULL,
    source_id           INTEGER NOT NULL,
    source_record_key   TEXT NOT NULL,
    tasks_count         INTEGER NOT NULL DEFAULT 0,
    input_tokens        INTEGER NOT NULL DEFAULT 0,
    output_tokens       INTEGER NOT NULL DEFAULT 0,
    sessions_count      INTEGER NOT NULL DEFAULT 0,
    UNIQUE(source_id, source_record_key)
);

-- 3. Certified Value & Labor Capacity from Telemetry Engine
CREATE TABLE value_measurement_month (
    id                  INTEGER PRIMARY KEY,
    company_id          INTEGER NOT NULL,
    month_start         TEXT NOT NULL,
    agent_id            INTEGER NOT NULL,
    team_id             INTEGER NOT NULL,
    hours_saved         REAL NOT NULL DEFAULT 0,
    measurement_method  TEXT NOT NULL CHECK(measurement_method IN ('measured','survey_reported','manual_estimate','model_estimate')),
    approval_status     TEXT NOT NULL CHECK(approval_status IN ('pending','approved','rejected')),
    UNIQUE(agent_id, team_id, month_start)
);
```

---

## 7. Client Onboarding Checklist: What to Request from the Customer

When onboarding a new enterprise client, provide this exact access checklist:

### A. From the Enterprise Primary Owner (CIO / IT Security)
* [ ] **Access Surface:** `claude.ai`
* [ ] **Credential:** 1 Analytics API Key (`read:analytics` scope)
* [ ] **What it enables:** Real-time visibility into all 4,600 seat licenses, employee adoption breakdown, and automatic detection of 30+ day idle seats for 1-click license reclaiming.

### B. From the Cloud Engineering / FinOps Lead
* [ ] **Access Surface:** `console.anthropic.com`
* [ ] **Credential:** 1 Admin API Key (`sk-ant-admin01-...`)
* [ ] **Configuration Requirement:** Each custom agent runs in its own dedicated Claude Workspace (e.g. `ws_case_triage`, `ws_developer_copilot`).
* [ ] **What it enables:** Daily automated reconciliation of exact token consumption, prompt cache hit ratios, and dollar spend per agent reconciled to the Anthropic invoice to the penny.

### C. From the Agent Development Teams
* [ ] **Configuration Requirement:** Add 1 HTTP POST telemetry ping to their agent runner upon task completion (or upload CSV/Excel telemetry exports to the Admin Ingestion Hub).
* [ ] **What it enables:** Instant labor hours saved calculation, FTE capacity unlocked, and dynamic governance classification (*Accelerate, Optimize, Intervene, Experiment*).
