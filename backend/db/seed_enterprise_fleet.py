"""
Enterprise Fleet Seed Generator for WCT AI Value Cockpit
Populates 1,200 realistic, production-grade enterprise agents across 5 business functions.
Preserves the 4 existing live onboarded agents (Supply Chain Bot, Ticket Triage, SAP Match, HR Copilot).
Generates cohesive financials: ~$18M-$22M Gross Value, ~$3.2M Cost, ~$15M-$18M Net Value, ~75,000 Hours Saved.
"""
import os
import sqlite3
import random
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "cockpit.db")

# Seed random for repeatable, deterministic generation
random.seed(42)

# Department & Team Taxonomy (Real Fortune 500 Enterprise Architecture)
ENTERPRISE_TAXONOMY = {
    "Engineering & IT": {
        "hourly_rate": 42.50,
        "target_count": 380,
        "teams": [
            ("Cloud Platform & SRE", 65),
            ("Cyber Security & Zero Trust", 55),
            ("DevOps & CI/CD Platform", 50),
            ("Data Engineering & MLOps", 45),
            ("Enterprise Architecture", 40),
            ("Internal Developer Platform", 45),
            ("IT Service Desk", 45), # Holds Ticket Triage Agent (ID 11)
            ("QA & Test Automation", 35),
        ],
        "prefixes": [
            "Kubernetes Auto-Scaler", "Terraform Drift Sentinel", "AWS FinOps Spot Optimizer",
            "Snyk Vulnerability Auto-Patcher", "Datadog Alert De-duplication", "PostgreSQL Query Tuner",
            "Kafka Lag Rebalancer", "GitHub Actions CI/CD Triage", "Pull Request Reviewer",
            "Java 21 Modernization Bot", "OpenAPI Spec Generator", "Zero-Trust Privilege Auditor",
            "Redis Cache Invalidation Bot", "Playwright E2E Scenario Builder", "Snowflake Pipeline Watchdog",
            "ArgoCD GitOps Sync Sentinel", "Grafana Metric Anomaly Detector", "Docker Image Slimming Bot",
            "Secrets & API Key Scanner", "Istio Service Mesh Traffic Shaper", "GraphQL Breaking-Change Guard",
            "Linux Kernel Patch Evaluator", "Azure Cost Allocation Bot", "Nginx Ingress Latency Analyzer",
            "Cloudflare WAF Rule Tuner", "MongoDB Index Optimization Bot", "Elasticsearch Cluster Shard Rebalancer",
            "SBOM License Compliance Checker", "PagerDuty Incident Summarizer", "Microservice Contract Verifier"
        ]
    },
    "Customer Support": {
        "hourly_rate": 22.00,
        "target_count": 310,
        "teams": [
            ("Global Tier-1 Resolution", 75),
            ("VIP Premier Support", 50),
            ("Warranty & Claims Triage", 55),
            ("Multilingual Customer Desk", 50),
            ("Customer Success & Escalations", 45),
            ("Technical Incident Desk", 35),
        ],
        "prefixes": [
            "Zendesk L1 Deflection Agent", "Warranty Eligibility Verifier", "Multi-Currency Refund Bot",
            "Multilingual French Ticket Translator", "German Technical Support Assistant", "Japanese Customer Desk",
            "VIP SLA Escalation Notifier", "CSAT Negative Feedback Analyzer", "Password Reset & SSO Self-Service",
            "Shipping Address Correction Bot", "Omnichannel Chat Router", "Order Return Authorization Bot",
            "Subscription Cancellation Triage", "Customer Sentiment Churn Flag", "Knowledge Base Drafter",
            "Live Chat Co-Pilot Assistant", "Duplicate Ticket Merging Bot", "Voice Call Transcription Tagging",
            "Outage Announcement Dispatcher", "Loyalty Rewards Dispute Resolver", "Product Manual Search Bot",
            "Delivery Delay Apology Bot", "Escalated Case Summary Builder", "Mobile App Bug Report Triage",
            "Technical Spec Comparison Bot", "Post-Call Customer Survey Bot"
        ]
    },
    "Operations": {
        "hourly_rate": 28.00,
        "target_count": 215,
        "teams": [
            ("Supply Chain", 50), # Holds Global Supply Chain Bot (ID 46)
            ("Logistics & Freight", 45),
            ("Procurement & Sourcing", 40),
            ("Inventory Planning & Demand", 35),
            ("Manufacturing Operations", 25),
            ("HR Employee Experience", 20), # Holds Global HR Benefits Copilot (ID 48)
        ],
        "prefixes": [
            "Ocean Freight ETA Predictor", "Cold-Chain IoT Sensor Monitor", "Customs HTS Code Classifier",
            "Bill of Lading OCR Discrepancy", "3PL Carrier Scorecard Bot", "Raw Material Disruption Predictor",
            "Warehouse Pallet Slotting Bot", "PLC Vibration Predictive Maintenance", "OSHA Safety Incident Formatter",
            "Facility Peak Energy Shaver", "HAZMAT Shipping Auditor", "Purchase Requisition Fast-Track",
            "Safety Stock Dynamic Buffer", "Fleet Fuel Consumption Optimizer", "Cross-Dock Routing Assistant",
            "Container Demurrage Alerter", "Supplier Lead-Time Calibrator", "Contract Penalty SLA Tracker",
            "Factory Assembly Cycle Time Bot", "Return-to-Vendor Shipping Bot"
        ]
    },
    "Sales & Marketing": {
        "hourly_rate": 35.00,
        "target_count": 170,
        "teams": [
            ("Strategic Bids & RFP", 45),
            ("Sales Enablement & RevOps", 40),
            ("B2B Account Signals", 35),
            ("Growth & Marketing Ops", 30),
            ("Product Marketing & Intel", 20),
        ],
        "prefixes": [
            "RFP Technical Response Drafter", "Salesforce Pipeline Hygiene", "Gong Call Action-Item Extractor",
            "B2B Account Intent Signal Bot", "Commercial Margin Guardrail Bot", "MSA Contract Clause Validator",
            "ABM Executive Briefing Bot", "Google Ads ROAS Anomaly Detector", "SEO Keyword Cannibalization Bot",
            "Competitor Pricing Intelligence", "Lead Scoring & Routing Agent", "Customer Case Study Drafter",
            "Product Battlecard Generator", "Partner Referral Commission Bot", "Email Sequence Tone Optimizer",
            "Webinar Attendee Enrichment", "Contract Renewal Milestone Bot", "Demo Prep Account Brief Bot"
        ]
    },
    "Finance": {
        "hourly_rate": 38.00,
        "target_count": 125,
        "teams": [
            ("Accounts Payable & Procurement", 35), # Holds SAP 3-Way Match Bot (ID 47)
            ("FP&A & Revenue Close", 30),
            ("SOX & Internal Audit", 25),
            ("Treasury & FX Exposure", 20),
            ("Billing & Collections", 15),
        ],
        "prefixes": [
            "SOX 404 Audit Trail Sentinel", "Corporate Travel Expense Auditor", "Multi-Currency FX Daily Hedging",
            "Accounts Receivable Dunning Bot", "Vendor Bank Change Fraud Sentinel", "Month-End Journal Anomaly Bot",
            "VAT / GST Cross-Border Tax Bot", "Capital Expenditure (CapEx) Tracker", "SaaS License Waste Detector",
            "Contract Minimum Spend Monitor", "Bad Debt Reserve Calculator", "Balance Sheet Variance Explainer",
            "EBITDA Margin Sensitivity Bot", "Vendor 1099 Tax Form Validator", "Intercompany Settlement Bot"
        ]
    }
}

MODELS_DIST = [
    ("gpt-4o", "Microsoft Azure", "Azure OpenAI Service", 2.50, 10.00, 0.40),
    ("claude-3-5-sonnet", "Anthropic", "Claude 3.5 Sonnet Engine", 3.00, 15.00, 0.30),
    ("gemini-2.0-pro", "Google Cloud", "Gemini 2.0 Enterprise", 1.25, 5.00, 0.15),
    ("gpt-4o-mini", "Microsoft Azure", "Azure OpenAI Mini", 0.15, 0.60, 0.10),
    ("llama-3.3-70b", "AWS Bedrock", "Bedrock Llama 3.3", 0.72, 0.72, 0.05),
]

def choose_model():
    r = random.random()
    cum = 0.0
    for m, prov, prod, inp, out, weight in MODELS_DIST:
        cum += weight
        if r <= cum:
            return m, prov, prod, inp, out
    return MODELS_DIST[0][0], MODELS_DIST[0][1], MODELS_DIST[0][2], MODELS_DIST[0][3], MODELS_DIST[0][4]

def seed_enterprise_fleet(db_path: str = None):
    target_path = db_path or DB_PATH
    if not os.path.exists(target_path):
        raise FileNotFoundError(f"Database not found at {target_path}")

    conn = sqlite3.connect(target_path)
    conn.execute("PRAGMA foreign_keys = OFF;")
    cur = conn.cursor()

    print(f"Connected to {DB_PATH}. Preparing Enterprise Fleet Seed...")

    # 1. Preserve the 4 live pilot agents
    LIVE_AGENT_IDS = [11, 46, 47, 48]
    cur.execute("UPDATE ai_agent SET portfolio = 'Live Pilot' WHERE id IN (11, 46, 47, 48)")
    conn.commit()

    # Clean existing generated agents (keep live agents)
    cur.execute(f"DELETE FROM ai_agent WHERE portfolio = 'Enterprise Fleet' OR id > 100")
    cur.execute(f"DELETE FROM team_agent WHERE agent_id > 100")
    cur.execute(f"DELETE FROM value_measurement_month WHERE agent_id > 100")
    cur.execute(f"DELETE FROM cost_record WHERE agent_id > 100")
    cur.execute(f"DELETE FROM agent_budget_month WHERE agent_id > 100")
    cur.execute(f"DELETE FROM agent_seat_month WHERE agent_id > 100")
    cur.execute(f"DELETE FROM agent_usage_daily WHERE agent_id > 100")
    cur.execute(f"DELETE FROM agent_evaluation WHERE agent_id > 100")
    cur.execute(f"DELETE FROM agent_incident WHERE agent_id > 100")
    conn.commit()

    # 2. Ensure Functions & Teams exist
    func_ids = {}
    for f_name in ENTERPRISE_TAXONOMY.keys():
        cur.execute("SELECT id FROM business_function WHERE name = ? AND company_id = 1", (f_name,))
        row = cur.fetchone()
        if row:
            func_ids[f_name] = row[0]
        else:
            cur.execute("INSERT INTO business_function (company_id, name) VALUES (1, ?)", (f_name,))
            func_ids[f_name] = cur.lastrowid
    conn.commit()

    team_ids = {}
    for f_name, f_data in ENTERPRISE_TAXONOMY.items():
        f_id = func_ids[f_name]
        h_rate = f_data["hourly_rate"]
        for t_name, _ in f_data["teams"]:
            cur.execute("SELECT id FROM team WHERE name = ? AND company_id = 1", (t_name,))
            t_row = cur.fetchone()
            if t_row:
                t_id = t_row[0]
            else:
                cur.execute("INSERT INTO team (company_id, function_id, name, is_active) VALUES (1, ?, ?, 1)", (f_id, t_name))
                t_id = cur.lastrowid
            team_ids[t_name] = t_id

            # Ensure hourly cost rate exists
            cur.execute("""
                INSERT OR REPLACE INTO team_hourly_cost_rate 
                (company_id, team_id, hourly_cost, currency, effective_from, effective_to)
                VALUES (1, ?, ?, 'USD', '2026-01-01', NULL)
            """, (t_id, h_rate))
    conn.commit()

    # 3. Generate 1,196 agents (so 1,196 + 4 live = 1,200 agents total)
    agent_id_counter = 101
    total_created = 0
    seen_names = set([
        "Ticket Triage Agent",
        "Global Supply Chain & Order Dispatch Bot",
        "Invoice Exception & SAP 3-Way Match Bot",
        "Global HR Benefits & Policy Copilot"
    ])

    months = ["2026-09-01", "2026-10-01"]

    for f_name, f_data in ENTERPRISE_TAXONOMY.items():
        prefixes = f_data["prefixes"]
        hourly_rate = f_data["hourly_rate"]

        for t_name, count in f_data["teams"]:
            t_id = team_ids[t_name]

            # Adjust count if team already has a live agent
            has_live = (t_name in ["IT Service Desk", "Supply Chain", "Accounts Payable & Procurement", "HR Employee Experience"])
            target_team_count = count - (1 if has_live else 0)

            for i in range(target_team_count):
                prefix = prefixes[i % len(prefixes)]
                variant = (i // len(prefixes)) + 1
                base_name = f"{prefix} [{t_name}]"
                candidate = base_name if variant == 1 else f"{prefix} [{t_name} #{variant}]"
                dup_suffix = 2
                while candidate in seen_names:
                    candidate = f"{prefix} [{t_name} Node-{dup_suffix}]"
                    dup_suffix += 1
                agent_name = candidate
                seen_names.add(agent_name)

                model, provider, product, inp_price, out_price = choose_model()
                agent_type = random.choice(["workflow_agent", "rag_agent", "chat_assistant", "coding_assistant", "automation"])
                category = random.choice(["built_with", "built_in", "built_using"])

                # Governance Profile distribution:
                # 28% Accelerate, 44% Optimize, 16% Experiment, 12% Intervene
                profile_roll = random.random()
                if profile_roll < 0.28:
                    profile = "accelerate"
                elif profile_roll < 0.72:
                    profile = "optimize"
                elif profile_roll < 0.88:
                    profile = "experiment"
                else:
                    profile = "intervene"

                # Go live date
                if profile == "experiment":
                    go_live = random.choice(["2026-09-10", "2026-09-22", "2026-10-02"])
                else:
                    go_live = random.choice(["2025-08-15", "2025-11-01", "2026-02-10", "2026-05-20"])

                # Base parameters
                monthly_infra = round(random.uniform(20.0, 150.0), 2)
                budget = round(random.uniform(250.0, 900.0), 2)

                # Base hours saved per month
                if profile == "accelerate":
                    hours_oct = round(random.uniform(70.0, 160.0), 1)
                    adoption = round(random.uniform(76.0, 96.0), 1)
                    eval_rate = round(random.uniform(92.5, 99.2), 1)
                    cost_oct = round(budget * random.uniform(0.65, 0.95), 2)
                    incidents = 0
                elif profile == "optimize":
                    hours_oct = round(random.uniform(40.0, 85.0), 1)
                    adoption = round(random.uniform(55.0, 74.0), 1)
                    eval_rate = round(random.uniform(86.0, 92.0), 1)
                    cost_oct = round(budget * random.uniform(0.75, 1.05), 2)
                    incidents = 0
                elif profile == "experiment":
                    hours_oct = round(random.uniform(15.0, 45.0), 1)
                    adoption = round(random.uniform(35.0, 60.0), 1)
                    eval_rate = round(random.uniform(80.0, 91.0), 1)
                    cost_oct = round(budget * random.uniform(0.40, 0.80), 2)
                    incidents = 0
                else: # Intervene
                    hours_oct = round(random.uniform(20.0, 60.0), 1)
                    adoption = round(random.uniform(30.0, 65.0), 1)
                    eval_rate = round(random.uniform(74.0, 84.5), 1)
                    cost_oct = round(budget * random.uniform(1.18, 1.45), 2) # Over budget!
                    incidents = random.choice([1, 2, 0])

                # September has ~10% lower hours/cost to show historical growth
                hours_sep = round(hours_oct * random.uniform(0.85, 0.93), 1)
                cost_sep = round(cost_oct * random.uniform(0.88, 0.96), 2)

                # Insert AI Agent
                cur.execute("""
                    INSERT INTO ai_agent (
                        id, company_id, name, category, agent_type, provider, product_name,
                        portfolio, description, go_live_date, is_active, monthly_infra_cost,
                        input_token_price_per_1m, output_token_price_per_1m, model,
                        baseline_employee_hours, employee_monthly_rate, employee_monthly_working_hours,
                        monthly_budget, business_function, team
                    ) VALUES (?, 1, ?, ?, ?, ?, ?, 'Enterprise Fleet', ?, ?, 1, ?, ?, ?, ?, 0.5, ?, 160.0, ?, ?, ?)
                """, (
                    agent_id_counter, agent_name, category, agent_type, provider, product,
                    f"Enterprise autonomous agent for {t_name.lower()} workflow automation and labor efficiency.",
                    go_live, monthly_infra, inp_price, out_price, model,
                    round(hourly_rate * 160.0, 2), budget, f_name, t_name
                ))

                # Insert Team Agent link
                cur.execute("""
                    INSERT INTO team_agent (company_id, team_id, agent_id, assigned_from, is_active, allocation_pct)
                    VALUES (1, ?, ?, '2026-01-01', 1, 100.0)
                """, (t_id, agent_id_counter))

                # Insert monthly metrics for Sep and Oct
                for m_idx, m_start in enumerate(months):
                    hrs = hours_sep if m_idx == 0 else hours_oct
                    c_amt = cost_sep if m_idx == 0 else cost_oct

                    # Value measurement
                    cur.execute("""
                        INSERT INTO value_measurement_month (
                            company_id, agent_id, team_id, month_start, hours_saved, measurement_method, approval_status
                        ) VALUES (1, ?, ?, ?, ?, 'measured', 'approved')
                    """, (agent_id_counter, t_id, m_start, hrs))

                    # Cost record
                    cur.execute("""
                        INSERT INTO cost_record (
                            company_id, agent_id, team_id, month_start, amount, currency, cost_category, cost_basis
                        ) VALUES (1, ?, ?, ?, ?, 'USD', 'consumption', 'token_pricing_estimate')
                    """, (agent_id_counter, t_id, m_start, c_amt))

                    # Budget
                    cur.execute("""
                        INSERT INTO agent_budget_month (
                            company_id, agent_id, team_id, month_start, cost_category, budget_amount, currency
                        ) VALUES (1, ?, ?, ?, 'consumption', ?, 'USD')
                    """, (agent_id_counter, t_id, m_start, budget))

                    # Seat month
                    assigned_seats = random.randint(15, 60)
                    active_seats = max(1, int(assigned_seats * (adoption / 100.0)))
                    cur.execute("""
                        INSERT INTO agent_seat_month (
                            company_id, agent_id, team_id, month_start, purchased_seats, assigned_seats, active_seats, cost_per_seat, currency
                        ) VALUES (1, ?, ?, ?, ?, ?, ?, 30.0, 'USD')
                    """, (agent_id_counter, t_id, m_start, assigned_seats, assigned_seats, active_seats))

                    # Evaluations
                    eval_cases = random.randint(150, 400)
                    eval_passed = int(eval_cases * (eval_rate / 100.0))
                    cur.execute("""
                        INSERT INTO agent_evaluation (
                            company_id, agent_id, team_id, evaluated_at, total_cases, passed_cases
                        ) VALUES (1, ?, ?, ? || '-20 00:00:00', ?, ?)
                    """, (agent_id_counter, t_id, m_start[:7], eval_cases, eval_passed))

                    # Incidents
                    if incidents > 0 and m_idx == 1:
                        cur.execute("""
                            INSERT INTO agent_incident (
                                company_id, agent_id, team_id, occurred_at, severity, status, incident_type, summary
                            ) VALUES (1, ?, ?, ? || '-14 10:30:00', 'medium', 'open', 'cost', 'Monthly token consumption exceeded FinOps threshold.')
                        """, (agent_id_counter, t_id, m_start[:7]))

                agent_id_counter += 1
                total_created += 1

    conn.commit()

    # Verify counts
    cur.execute("SELECT COUNT(*) FROM ai_agent")
    total_db_agents = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM v_agent_scorecard_monthly WHERE month_start = '2026-10-01'")
    oct_scorecard_count = cur.fetchone()[0]

    cur.execute("SELECT SUM(gross_value), SUM(total_cost), SUM(net_value), SUM(hours_saved) FROM v_agent_scorecard_monthly WHERE month_start = '2026-10-01'")
    gross, cost, net, hrs = cur.fetchone()

    cur.close()
    conn.close()

    print(f"\n=======================================================")
    print(f"ENTERPRISE FLEET SEED COMPLETE!")
    print(f"Total AI Agents in Database:      {total_db_agents}")
    print(f"Agents Active in Oct 2026 View:   {oct_scorecard_count}")
    print(f"Oct 2026 Gross Labor Value:       ${gross:,.2f}")
    print(f"Oct 2026 Total AI Spend:          ${cost:,.2f}")
    print(f"Oct 2026 Net Enterprise Value:    ${net:,.2f}")
    print(f"Oct 2026 Total Hours Saved:       {hrs:,.1f} hrs (~{hrs/160:.0f} FTEs)")
    print(f"=======================================================\n")

if __name__ == "__main__":
    seed_enterprise_fleet()
