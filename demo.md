# WCT AI Performance Cockpit — Demo & Walkthrough Guide

---

## 1. Executive Summary & Pitch (30-Second Elevator Pitch)

> *"Welcome. The **WCT AI Performance Cockpit** is an enterprise-grade AI observability and financial governance platform.*
>
> *Today, enterprises spend millions deploying AI tools, LLMs, and autonomous agents across departments, but leadership struggles to answer two critical questions:*
> 1. ***What is our actual, verified return on investment (ROI)?***
> 2. ***Where are our risks, and which agents should we scale, optimize, or shut down?***
>
> *The AI Cockpit connects directly to live vendor telemetry, calculates real financial value using company department labor rates, and runs an automated 4-quadrant decision engine to tell executives exactly where to **Accelerate**, **Optimize**, **Intervene**, or **Experiment**."*

---

## 2. Exact Calculation Formulas (Under the Hood)

All calculations are executed in the database SQL view (`v_agent_scorecard_monthly` in `backend/db/init.sql`) and aggregated in `backend/app/routers/summary.py`.

### Financial Metrics

| Metric | Exact Formula | Where Defined | Meaning / Example |
| :--- | :--- | :--- | :--- |
| **Gross Value ($)** | `Hours Saved * Blended Hourly Labor Rate` | `init.sql:481` | Economic value of employee time saved. If an Engineering agent saves 500 hrs @ $85/hr rate = **$42,500 Gross Value**. |
| **Total AI Cost ($)** | `License Cost + Token Consumption + Platform Fees + Build/Run + Enablement` | `init.sql:482-488` | True total cost of ownership across fixed SaaS seats and variable LLM tokens. |
| **Net Value ($)** | `Gross Value - Total AI Cost` | `init.sql:490` | Pure profit/capacity generated after paying all AI vendor invoices. |
| **ROI Ratio** | `Total Gross Value / Total AI Cost` | `summary.py:27` | Return multiplier. E.g., `$275,000 / $75,000 = 3.67x` (Every $1 invested yields $3.67 in employee productivity). |
| **Cost vs Budget (%)** | `(Total Cost / Allocated Budget) * 100` | `init.sql:493` | Financial burn rate. Green if `< 100%`, Red warning if `> 100%` (over budget). |

---

### Adoption & Usage Metrics

| Metric | Exact Formula | Where Defined | Meaning / Example |
| :--- | :--- | :--- | :--- |
| **Adoption Rate (%)** | `(Active Users / Assigned Seats) * 100` | `init.sql:468` | Percentage of licensed employees actually using the agent in the month. E.g., 85 active / 100 assigned = **85%**. |
| **Inactive Seats** | `Assigned Seats - Active Users` | `seats.py` | Users with zero sessions in 30, 60, or 90+ days (SaaS shelfware). |
| **Reclaimable Savings ($)** | `Inactive Seats (60+ days) * Seat Cost/Mo` | `seats.py` | Immediate dollar savings achieved by deprovisioning unused licenses. |
| **Suggestion Acceptance (%)** | `(Suggestions Accepted / Suggestions Shown) * 100` | `init.sql:475` | Telemetry metric for coding assistants (Claude Code / Copilot) tracking code suggestions kept by developers. |

---

### Quality & Safety Metrics

| Metric | Exact Formula | Where Defined | Meaning / Example |
| :--- | :--- | :--- | :--- |
| **Eval Pass Rate (%)** | `(Passed Test Cases / Total Test Cases) * 100` | `init.sql:415` | Automated benchmarking against golden test datasets. Alerts if pass rate drops below threshold. |
| **Open Incidents** | `Count of High/Critical Policy Incidents` | `init.sql:422` | Number of safety, hallucination, or data privacy guardrail violations. |

---

## 3. The 4-Way Decision Engine (Automated Governance)

Each agent in the enterprise portfolio is automatically classified into one of 4 governance quadrants based on SQL business rules (`init.sql:500-516`):

```
                       HIGH NET VALUE & ADOPTION
                                  ^
                                  |
          [ EXPERIMENT ]          |          [ ACCELERATE ]
     (In prod < 60 days;          |     (Net Value >= $40k,
      early baseline phase)       |      Adoption >= 70%, 0 incidents)
                                  |
    ------------------------------+------------------------------> ROI
                                  |
          [ INTERVENE ]           |          [ OPTIMIZE ]
     (Cost > Budget * 110%        |     (Steady production;
      OR Eval Pass < 88%          |      normal token & prompt tuning)
      OR Incidents > 0            |
      OR Net Value < $15k)        |
                                  v
                         LOW VALUE / HIGH RISK
```

* **[Accelerate]**: Proven high ROI, high adoption, zero incidents -> Scale across company.
* **[Optimize]**: Stable performance -> Fine-tune prompts, token caching, and seat allocation.
* **[Intervene]**: Over budget, failing accuracy evals, or policy incident -> Pause or review safety guardrails.
* **[Experiment]**: In production `< 60 days` -> Allow time to gather pilot adoption data.

---

## 4. What Does "Custom Agents Built Using Claude" Mean?

When talking about Claude in the enterprise, distinguish between two things:

1. **Simple LLM Chat (claude.ai)**: An employee asking Claude to summarize text or write an email.
2. **Custom Autonomous Agent**: Claude 3.5 Sonnet serves as the **cognitive brain**, wrapped with:
   - **External Tool Calling**: Connects to company databases, CRMs (Salesforce), Jira, Git, and ERP APIs.
   - **Enterprise RAG**: Retrieves verified internal policies and technical documentation.
   - **Autonomous Loops**: Takes a goal, plans sub-steps, calls APIs, inspects results, self-corrects, and executes tasks.
   - **Safety Guardrails**: Pre-execution validation to ensure compliance before taking real-world actions.

---

## 5. Tab-by-Tab Demo Walkthrough (What to Show & Say)

### Tab 1: Executive Summary
* **What to Show**: Top KPI cards, Net Value by Function chart, Cost Breakdown, Monthly Trend.
* **Talking Point**: *"At a glance, leadership sees total business impact: **$275K+ Gross Value** against ~$75K cost, delivering a **3.6x ROI**. Engineering & IT and Finance are driving our highest returns."*
* **Interactive Action**: Click the **Department Filter** at the top right and select `Engineering & IT`. Show how all charts instantly adapt to that department.

### Tab 2: Agent Scorecard & Where to Act
* **What to Show**: The table of all company agents with their Action badges (`Accelerate`, `Optimize`, `Intervene`, `Experiment`).
* **Talking Point**: *"Instead of vague metrics, our cockpit tells leaders exactly what action to take on every AI asset."*
* **Highlight an Intervene Agent**: *"Notice this agent is flagged for **Intervene** because cost exceeded budget by 118% and eval pass rate dropped below 88%."*
* **Highlight an Accelerate Agent**: *"This agent delivered $45K+ net value with 85% adoption and zero incidents; it is ready for company-wide expansion."*
* **Interactive Action**: Click on an agent row to open the **Detail Drawer**, showing month-over-month trends, hourly rate applied, and incident history.

### Tab 3: Cost & Budget Governance
* **What to Show**: Budget vs Actual burn rate, variance bars, Fixed SaaS vs Variable Token breakdown.
* **Talking Point**: *"FinOps governance lets finance teams track token spend versus budgeted caps before overages occur."*

### Tab 4: Seats & Adoption (License Optimization)
* **What to Show**: Seat inventory, active vs assigned licenses, and the 30/60/90-day inactivity analysis.
* **Talking Point**: *"We eliminate AI SaaS shelfware. The cockpit identifies inactive licenses and immediately calculates reclaimable dollar savings for the CFO."*

### Tab 5: Live Telemetry API & Admin
* **What to Show**: Telemetry connections (Live Anthropic API / Hosted Mock Gateway), Threshold sliders, and Department Labor Rates.
* **Talking Point**: *"Everything is configurable. Admins can adjust department hourly rates and governance thresholds, and the entire scorecard dynamically recalculates in real time."*

---

## 6. Quick Cheat Sheet for Demo Questions

| Question from Stakeholder | Quick Answer |
| :--- | :--- |
| **"Where do the dollar values come from?"** | *"From verified hours saved multiplied by your department's blended labor rates (e.g. Engineering $85/hr, Finance $60/hr) configured in the Admin tab."* |
| **"Is this live or mock data?"** | *"The cockpit connects to live telemetry endpoints (Anthropic/Claude Enterprise Usage reports & GitHub Copilot exports) and supports a hosted mock gateway for staging."* |
| **"Can an employee use both Claude Code and Claude Cowork?"** | *"Yes, under a single Claude Enterprise seat tied to corporate SSO, an employee accesses Claude Cowork in the browser and Claude Code CLI in their terminal."* |
