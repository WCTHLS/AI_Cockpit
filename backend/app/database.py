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

    mock_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "mock_data.json"))
    if not os.path.exists(mock_path):
        return

    with open(mock_path, "r", encoding="utf-8") as f:
        mock_data = json.load(f)

    agents = mock_data.get("agents", [])
    costs = mock_data.get("costs", [])
    seats = mock_data.get("seats", [])

    dept_rates = {
        "finance": 60.0,
        "eng & it": 85.0,
        "customer": 45.0,
        "sales": 65.0,
        "operations": 55.0,
    }

    functions_map = {}
    teams_map = {}
    agents_map = {}

    for a in agents:
        fn = a["Function"]
        tm = a["Team"]
        ag = a["Agent"]

        if fn not in functions_map:
            cur.execute("INSERT OR IGNORE INTO business_function (company_id, name) VALUES (1, ?)", (fn,))
            cur.execute("SELECT id FROM business_function WHERE company_id = 1 AND name = ?", (fn,))
            functions_map[fn] = cur.fetchone()[0]
        fid = functions_map[fn]

        if (fid, tm) not in teams_map:
            cur.execute("INSERT OR IGNORE INTO team (company_id, function_id, name) VALUES (1, ?, ?)", (fid, tm))
            cur.execute("SELECT id FROM team WHERE company_id = 1 AND function_id = ? AND name = ?", (fid, tm))
            tid = cur.fetchone()[0]
            teams_map[(fid, tm)] = tid
            hr_rate = dept_rates.get(fn.lower(), 55.0)
            cur.execute("""
                INSERT OR IGNORE INTO team_hourly_cost_rate 
                (company_id, team_id, effective_from, hourly_cost, currency) 
                VALUES (1, ?, '2026-01-01', ?, 'USD')
            """, (tid, hr_rate))
        tid = teams_map[(fid, tm)]

        if ag not in agents_map:
            cat = "built_in" if "copilot" in ag.lower() else "built_using" if "gpt" in ag.lower() else "built_with"
            agent_type = "coding_assistant" if "code" in ag.lower() or "developer" in ag.lower() else "workflow_agent"
            days = int(a.get("DaysInProduction", 120))
            ref_date = date(2026, 9, 30)
            go_live = (ref_date - timedelta(days=days)).isoformat()
            cur.execute("""
                INSERT OR IGNORE INTO ai_agent 
                (company_id, name, category, agent_type, portfolio, go_live_date, is_active)
                VALUES (1, ?, ?, ?, 'Default', ?, 1)
            """, (ag, cat, agent_type, go_live))
            cur.execute("SELECT id FROM ai_agent WHERE company_id = 1 AND name = ?", (ag,))
            agents_map[ag] = cur.fetchone()[0]
        aid = agents_map[ag]

        cur.execute("""
            INSERT OR IGNORE INTO team_agent 
            (company_id, team_id, agent_id, assigned_from) 
            VALUES (1, ?, ?, '2026-01-01')
        """, (tid, aid))

        month = a["Month"]
        month_start = f"{month}-01"
        hours = float(a.get("HoursSaved", 0))
        cost = float(a.get("CostUSD", 0))
        budget = float(a.get("BudgetUSD", 0))
        lic = int(a.get("LicensedUsers", 0))
        act = int(a.get("ActiveUsers", 0))
        runs = int(a.get("EvalRuns", 0))
        passed = int(a.get("EvalPassed", 0))
        incidents = int(a.get("PolicyIncidents", 0))

        cur.execute("""
            INSERT OR REPLACE INTO value_measurement_month
            (company_id, month_start, agent_id, team_id, hours_saved, measurement_method, approval_status)
            VALUES (1, ?, ?, ?, ?, 'measured', 'approved')
        """, (month_start, aid, tid, hours))

        cur.execute("""
            INSERT OR REPLACE INTO cost_record
            (company_id, month_start, agent_id, team_id, cost_category, amount, cost_basis, external_record_key)
            VALUES (1, ?, ?, ?, 'licence', ?, 'vendor_invoice', ?)
        """, (month_start, aid, tid, cost, f"{aid}-{tid}-{month_start}-licence"))

        cur.execute("""
            INSERT OR REPLACE INTO agent_budget_month
            (company_id, month_start, agent_id, team_id, cost_category, budget_amount)
            VALUES (1, ?, ?, ?, 'licence', ?)
        """, (month_start, aid, tid, budget))

        cur.execute("""
            INSERT OR REPLACE INTO agent_seat_month
            (company_id, month_start, agent_id, team_id, purchased_seats, assigned_seats, active_seats, cost_per_seat)
            VALUES (1, ?, ?, ?, ?, ?, ?, 30.0)
        """, (month_start, aid, tid, lic, lic, act))

        cur.execute("""
            INSERT OR REPLACE INTO agent_evaluation
            (company_id, external_eval_id, agent_id, team_id, evaluated_at, total_cases, passed_cases)
            VALUES (1, ?, ?, ?, ?, ?, ?)
        """, (f"{aid}-{tid}-{month_start}-eval", aid, tid, f"{month}-15T12:00:00", runs, passed))

        if incidents > 0:
            for i in range(incidents):
                cur.execute("""
                    INSERT OR IGNORE INTO agent_incident
                    (company_id, external_incident_id, agent_id, team_id, occurred_at, incident_type, severity, status)
                    VALUES (1, ?, ?, ?, ?, 'policy', 'high', 'open')
                """, (f"{aid}-{tid}-{month_start}-inc-{i}", aid, tid, f"{month}-10T09:00:00"))

        cur.execute("""
            INSERT OR IGNORE INTO agent_usage_daily
            (company_id, usage_date, agent_id, team_id, source_record_key, tasks_count, sessions_count)
            VALUES (1, ?, ?, ?, ?, ?, ?)
        """, (f"{month}-15", aid, tid, f"{aid}-{tid}-{month}-usage", 50, act))

    # Seed seat inventory items
    cur.execute("""
        CREATE TABLE IF NOT EXISTS seat_inventory_item (
            id INTEGER PRIMARY KEY,
            function TEXT NOT NULL,
            tool TEXT NOT NULL,
            inactive_days INTEGER NOT NULL,
            count INTEGER NOT NULL
        )
    """)
    cur.execute("SELECT COUNT(*) FROM seat_inventory_item")
    if cur.fetchone()[0] == 0:
        for s in seats:
            cur.execute("""
                INSERT INTO seat_inventory_item (function, tool, inactive_days, count)
                VALUES (?, ?, ?, ?)
            """, (s[0], s[1], int(s[2]), int(s[3])))

def sync_active_agents(conn: sqlite3.Connection):
    try:
        mock_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "mock_data.json"))
        if not os.path.exists(mock_path):
            return
        with open(mock_path, "r", encoding="utf-8") as f:
            mock_data = json.load(f)
        active_agent_names = list(set(a.get("Agent") for a in mock_data.get("agents", [])))
        if not active_agent_names:
            return
        cur = conn.cursor()
        cur.execute("UPDATE ai_agent SET is_active = 0")
        ph = ",".join("?" for _ in active_agent_names)
        cur.execute(f"UPDATE ai_agent SET is_active = 1 WHERE name IN ({ph})", active_agent_names)
        cur.execute("""
            UPDATE team SET is_active = 0 
            WHERE id NOT IN (
                SELECT DISTINCT ta.team_id 
                FROM team_agent ta
                JOIN ai_agent a ON a.id = ta.agent_id
                WHERE a.is_active = 1
            )
        """)
        cur.execute("""
            UPDATE team SET is_active = 1 
            WHERE id IN (
                SELECT DISTINCT ta.team_id 
                FROM team_agent ta
                JOIN ai_agent a ON a.id = ta.agent_id
                WHERE a.is_active = 1
            )
        """)
    except Exception as e:
        print(f"Warning: error syncing active agents: {e}")

def init_db(seed_if_empty: bool = True):
    db_path = get_db_path()
    init_sql_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "db", "init.sql"))
    if not os.path.exists(init_sql_path):
        init_sql_path = os.path.abspath(os.path.join(os.getcwd(), "backend", "db", "init.sql"))

    with get_db() as conn:
        if os.path.exists(init_sql_path):
            with open(init_sql_path, "r", encoding="utf-8") as f:
                conn.executescript(f.read())

        if seed_if_empty:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM company")
            count = cur.fetchone()[0]
            if count == 0:
                seed_database(conn)
            else:
                sync_active_agents(conn)
