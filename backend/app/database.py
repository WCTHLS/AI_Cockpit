import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import date, timedelta
from typing import Any, Dict, Generator, List, Optional
from .config import settings

SQL_KEY_TO_SCHEMA_KEY = {
    "experiment_days": "experiment_days",
    "intervene_eval_pass_pct": "intervene_eval_pass",
    "intervene_cost_budget_pct": "intervene_cost_budget_pct",
    "intervene_net_value_min": "intervene_value_min",
    "accelerate_net_value_min": "accelerate_value_min",
    "accelerate_adoption_min_pct": "accelerate_adoption_min",
}

SCHEMA_KEY_TO_SQL_KEY = {v: k for k, v in SQL_KEY_TO_SCHEMA_KEY.items()}

def get_db_path() -> str:
    db_path = settings.SQLITE_DB_PATH
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    return os.path.abspath(db_path)

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path(), check_same_thread=False, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn

@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def query_all(sql: str, params: tuple = ()) -> List[Dict[str, Any]]:
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(sql, params)
        return [dict(row) for row in cur.fetchall()]

def query_one(sql: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(sql, params)
        row = cur.fetchone()
        return dict(row) if row else None

def execute_write(sql: str, params: tuple = ()) -> int:
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(sql, params)
        return cur.rowcount

def get_thresholds_from_db() -> Dict[str, float]:
    defaults = {
        "experiment_days": 60,
        "intervene_eval_pass": 88.0,
        "intervene_cost_budget_pct": 110.0,
        "intervene_value_min": 15000.0,
        "accelerate_value_min": 40000.0,
        "accelerate_adoption_min": 70.0,
    }
    try:
        rows = query_all("SELECT key, numeric_value FROM config_threshold")
        for r in rows:
            k = r.get("key")
            v = r.get("numeric_value")
            schema_key = SQL_KEY_TO_SCHEMA_KEY.get(k, k)
            if schema_key in defaults:
                defaults[schema_key] = float(v) if schema_key != "experiment_days" else int(v)
    except Exception:
        pass
    return defaults

def update_thresholds_in_db(thresholds: Dict[str, Any]) -> Dict[str, float]:
    with get_db() as conn:
        cur = conn.cursor()
        for k, v in thresholds.items():
            sql_key = SCHEMA_KEY_TO_SQL_KEY.get(k, k)
            cur.execute("""
                INSERT INTO config_threshold (key, numeric_value, description, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET numeric_value = excluded.numeric_value, updated_at = CURRENT_TIMESTAMP
            """, (sql_key, float(v), f"Updated {k}"))
    return get_thresholds_from_db()

def seed_database(conn: sqlite3.Connection):
    cur = conn.cursor()
    # 1. Company
    cur.execute("""
        INSERT OR IGNORE INTO company (id, name, slug, reporting_currency)
        VALUES (1, 'WaferWire Cloud Technologies', 'wct', 'USD')
    """)

    # 2. Business Functions & Teams (Clean organizational hierarchy)
    org_structure = {
        "Customer": [
            "Customer Service",
            "Product Support",
            "Warranty & Returns",
            "Field Services"
        ],
        "Eng & IT": [
            "IT Service Desk",
            "Software Engineering",
            "DevOps & SRE",
            "Device Engineering"
        ],
        "Sales": [
            "Sales",
            "Bids & Proposals",
            "Channel & Partners",
            "Marketing"
        ],
        "Operations": [
            "Supply Chain",
            "Planning",
            "Procurement",
            "Manufacturing Quality"
        ],
        "Finance": [
            "Financial Planning & Close",
            "Accounts Receivable"
        ]
    }

    dept_rates = {
        "finance": 60.0,
        "eng & it": 85.0,
        "customer": 45.0,
        "sales": 65.0,
        "operations": 55.0,
    }

    for fn, teams in org_structure.items():
        cur.execute("INSERT OR IGNORE INTO business_function (company_id, name) VALUES (1, ?)", (fn,))
        cur.execute("SELECT id FROM business_function WHERE company_id = 1 AND name = ?", (fn,))
        fid = cur.fetchone()[0]

        for tm in teams:
            cur.execute("INSERT OR IGNORE INTO team (company_id, function_id, name, is_active) VALUES (1, ?, ?, 1)", (fid, tm))
            cur.execute("SELECT id FROM team WHERE company_id = 1 AND function_id = ? AND name = ?", (fid, tm))
            tid = cur.fetchone()[0]
            hr_rate = dept_rates.get(fn.lower(), 55.0)
            cur.execute("""
                INSERT OR IGNORE INTO team_hourly_cost_rate 
                (company_id, team_id, effective_from, hourly_cost, currency) 
                VALUES (1, ?, '2026-01-01', ?, 'USD')
            """, (tid, hr_rate))

    # 3. Register live IT Support Agent
    cur.execute("""
        INSERT OR IGNORE INTO ai_agent 
        (company_id, name, category, agent_type, portfolio, go_live_date, is_active)
        VALUES (1, 'Ticket Triage Agent', 'built_with', 'workflow_agent', 'Default', '2026-01-01', 1)
    """)
    cur.execute("SELECT id FROM ai_agent WHERE company_id = 1 AND name = 'Ticket Triage Agent'")
    aid_row = cur.fetchone()
    if aid_row:
        aid = aid_row[0]
        cur.execute("SELECT id FROM team WHERE name = 'IT Service Desk'")
        tid_row = cur.fetchone()
        if tid_row:
            cur.execute("""
                INSERT OR IGNORE INTO team_agent 
                (company_id, team_id, agent_id, assigned_from, is_active) 
                VALUES (1, ?, ?, '2026-01-01', 1)
            """, (tid_row[0], aid))

def sync_active_agents(conn: sqlite3.Connection):
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE ai_agent 
            SET is_active = 0 
            WHERE name != 'Ticket Triage Agent' AND (config_json IS NULL OR config_json = '');
        """)
    except Exception as e:
        print(f"Warning in sync_active_agents: {e}")

def seed_claude_code_employees(conn: sqlite3.Connection):
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM company WHERE LOWER(name) LIKE '%waferwire%' OR id = 1")
        row = cur.fetchone()
        company_id = row[0] if row else 1

        cur.execute("SELECT id, name FROM team WHERE company_id = ?;", (company_id,))
        teams_map = {r[1]: r[0] for r in cur.fetchall()}

        distribution = {
            # IT Service Desk (Eng & IT) - 4 employees
            "aarav@wct.com": ("Aarav Sharma", teams_map.get("IT Service Desk", 5)),
            "ananya@wct.com": ("Ananya Rao", teams_map.get("IT Service Desk", 5)),
            "arjun@wct.com": ("Arjun Patel", teams_map.get("IT Service Desk", 5)),
            "divya@wct.com": ("Divya Nair", teams_map.get("IT Service Desk", 5)),

            # Software Engineering (Eng & IT) - 3 employees
            "imran@wct.com": ("Imran Khan", teams_map.get("Software Engineering", 6)),
            "karthik@wct.com": ("Karthik Raman", teams_map.get("Software Engineering", 6)),
            "kavya@wct.com": ("Kavya Sen", teams_map.get("Software Engineering", 6)),

            # DevOps & SRE (Eng & IT) - 2 employees
            "meera@wct.com": ("Meera Joshi", teams_map.get("DevOps & SRE", 7)),
            "neha@wct.com": ("Neha Gupta", teams_map.get("DevOps & SRE", 7)),

            # Device Engineering (Eng & IT) - 1 employee
            "priya@wct.com": ("Priya Sharma", teams_map.get("Device Engineering", 8)),

            # Customer Service (Customer) - 2 employees
            "rahul@wct.com": ("Rahul Varma", teams_map.get("Customer Service", 1)),
            "rohan@wct.com": ("Rohan Kapoor", teams_map.get("Customer Service", 1)),

            # Product Support (Customer) - 1 employee
            "siddharth@wct.com": ("Siddharth Roy", teams_map.get("Product Support", 2)),

            # Warranty & Returns (Customer) - 1 employee
            "sneha@wct.com": ("Sneha Reddy", teams_map.get("Warranty & Returns", 3)),

            # Field Services (Customer) - 1 employee
            "vikram@wct.com": ("Vikram Das", teams_map.get("Field Services", 4)),
        }

        for email, (full_name, team_id) in distribution.items():
            username = email.split("@")[0]
            external_user_key = f"usr_{username}"
            cur.execute("""
                INSERT INTO employee 
                (company_id, team_id, external_user_key, display_name, email, is_active, joined_on)
                VALUES (?, ?, ?, ?, ?, 1, '2026-01-01')
                ON CONFLICT(company_id, external_user_key) 
                DO UPDATE SET team_id = excluded.team_id, display_name = excluded.display_name;
            """, (company_id, team_id, external_user_key, full_name, email))

        # Assign IT Service Desk employees to Ticket Triage Agent in employee_agent table
        cur.execute("SELECT id FROM ai_agent WHERE name = 'Ticket Triage Agent';")
        agent_row = cur.fetchone()
        if agent_row:
            agent_id = agent_row[0]
            cur.execute("SELECT id FROM employee WHERE team_id = ?;", (teams_map.get("IT Service Desk", 5),))
            for emp_row in cur.fetchall():
                cur.execute("""
                    INSERT OR IGNORE INTO employee_agent 
                    (company_id, employee_id, agent_id, assigned_from, is_active)
                    VALUES (?, ?, ?, '2026-01-01', 1);
                """, (company_id, emp_row[0], agent_id))

    except Exception as e:
        print(f"Warning: error seeding employees and agent mappings: {e}")

def ensure_ai_agent_columns(conn: sqlite3.Connection):
    try:
        cur = conn.cursor()
        existing = [c[1] for c in cur.execute("PRAGMA table_info(ai_agent)").fetchall()]
        cols_to_add = [
            ("monthly_infra_cost", "REAL NOT NULL DEFAULT 0.0"),
            ("input_token_price_per_1m", "REAL NOT NULL DEFAULT 2.50"),
            ("output_token_price_per_1m", "REAL NOT NULL DEFAULT 10.00"),
            ("model", "TEXT NOT NULL DEFAULT 'gpt-4o'"),
            ("baseline_employee_hours", "REAL NOT NULL DEFAULT 0.5"),
            ("employee_monthly_rate", "REAL NOT NULL DEFAULT 0.0"),
            ("employee_monthly_working_hours", "REAL NOT NULL DEFAULT 160.0"),
            ("monthly_budget", "REAL NOT NULL DEFAULT 500.0"),
            ("business_function", "TEXT"),
            ("team", "TEXT"),
            ("config_json", "TEXT")
        ]
        for name, dtype in cols_to_add:
            if name not in existing:
                cur.execute(f"ALTER TABLE ai_agent ADD COLUMN {name} {dtype};")

        # Initialize Ticket Triage Agent with company baseline values if not yet configured
        cur.execute("""
            UPDATE ai_agent SET
                monthly_infra_cost = CASE WHEN monthly_infra_cost = 0 THEN 150.0 ELSE monthly_infra_cost END,
                input_token_price_per_1m = CASE WHEN input_token_price_per_1m = 0 THEN 2.50 ELSE input_token_price_per_1m END,
                output_token_price_per_1m = CASE WHEN output_token_price_per_1m = 0 THEN 10.00 ELSE output_token_price_per_1m END,
                model = COALESCE(model, 'gpt-4o'),
                baseline_employee_hours = CASE WHEN baseline_employee_hours = 0 THEN 0.5 ELSE baseline_employee_hours END,
                employee_monthly_rate = CASE WHEN employee_monthly_rate = 0 THEN 6500.0 ELSE employee_monthly_rate END,
                employee_monthly_working_hours = CASE WHEN employee_monthly_working_hours = 0 THEN 160.0 ELSE employee_monthly_working_hours END,
                monthly_budget = CASE WHEN monthly_budget = 0 THEN 500.0 ELSE monthly_budget END,
                business_function = COALESCE(business_function, 'Eng & IT'),
                team = COALESCE(team, 'IT Service Desk'),
                description = COALESCE(description, 'Automated IT service desk ticket triaging, diagnostic analysis, and resolution suggestions.')
            WHERE name = 'Ticket Triage Agent';
        """)
    except Exception as e:
        print(f"Warning ensuring ai_agent columns: {e}")

def init_db(seed_if_empty: bool = True):
    db_path = get_db_path()
    init_sql_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "db", "init.sql"))
    if not os.path.exists(init_sql_path):
        init_sql_path = os.path.abspath(os.path.join(os.getcwd(), "backend", "db", "init.sql"))

    with get_db() as conn:
        if os.path.exists(init_sql_path):
            with open(init_sql_path, "r", encoding="utf-8") as f:
                conn.executescript(f.read())

        ensure_ai_agent_columns(conn)

        if seed_if_empty:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM company")
            count = cur.fetchone()[0]
            if count == 0:
                seed_database(conn)
            else:
                sync_active_agents(conn)

        # Seed and persist the 15 employees from Claude Code usage telemetry
        seed_claude_code_employees(conn)

        # Seed and persist Ticket Triage Agent daily user usage
        seed_ticket_triage_user_usage(conn)

def seed_ticket_triage_user_usage(conn: sqlite3.Connection):
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM user_usage;")
        count = cur.fetchone()[0]
        if count == 0:
            cur.execute("SELECT id FROM ai_agent WHERE name = 'Ticket Triage Agent';")
            agent_row = cur.fetchone()
            agent_id = agent_row[0] if agent_row else 11

            usage_records = [
                ("aarav@wct.com", 2, {"agent_id": "it-service-desk", "agent_name": "Ticket Triage Agent", "user_email": "aarav@lenovo.com", "completion_tokens": 1272, "prompt_tokens": 1484, "total_tokens": 2756, "session_count": 2, "agent_completion": 7.43, "date": "2026-10-27", "sucess": 2}),
                ("ananya@wct.com", 3, {"agent_id": "it-service-desk", "agent_name": "Ticket Triage Agent", "user_email": "ananya@wct.com", "completion_tokens": 2100, "prompt_tokens": 2020, "total_tokens": 4120, "session_count": 3, "agent_completion": 6.85, "date": "2026-10-27", "sucess": 3}),
                ("arjun@wct.com", 3, {"agent_id": "it-service-desk", "agent_name": "Ticket Triage Agent", "user_email": "arjun@wct.com", "completion_tokens": 1900, "prompt_tokens": 1678, "total_tokens": 3578, "session_count": 3, "agent_completion": 9.81, "date": "2026-10-27", "sucess": 2}),
                ("divya@wct.com", 1, {"agent_id": "it-service-desk", "agent_name": "Ticket Triage Agent", "user_email": "divya@wct.com", "completion_tokens": 624, "prompt_tokens": 826, "total_tokens": 1450, "session_count": 1, "agent_completion": 5.9, "date": "2026-10-27", "sucess": 1})
            ]

            for emp_email, sess_cnt, u_json in usage_records:
                cur.execute("SELECT id FROM employee WHERE email = ? OR email LIKE ?;", (emp_email, f"%{emp_email.split('@')[0]}%"))
                emp_row = cur.fetchone()
                if emp_row:
                    emp_id = emp_row[0]
                    cur.execute("""
                        INSERT OR IGNORE INTO user_usage (company_id, employee_id, agent_id, usage_date, sessions_count, daily_usage_json)
                        VALUES (1, ?, ?, '2026-10-27', ?, ?);
                    """, (emp_id, agent_id, sess_cnt, json.dumps(u_json)))
    except Exception as e:
        print(f"Warning seeding ticket triage user usage: {e}")

