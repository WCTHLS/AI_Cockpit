import uuid
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import APIRouter
from pydantic import BaseModel
from ..data_store import store
from ..database import execute_write, query_one, query_all

router = APIRouter(prefix="/telemetry", tags=["telemetry"])

class TelemetryIngestPayload(BaseModel):
    agent_id: str
    user_email: str
    agent_name: Optional[str] = "Ticket Triage Agent"
    task_id: Optional[str] = None
    timestamp: Optional[str] = None
    latency_ms: Optional[int] = 0
    tokens_in: Optional[int] = None
    tokens_out: Optional[int] = None
    completion_tokens: Optional[int] = None
    prompt_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    agent_start_time: Optional[str] = None
    agent_end_time: Optional[str] = None
    sucess: Optional[bool] = None
    success: Optional[bool] = None
    cost_usd: Optional[float] = None
    status: Optional[str] = None
    hours_saved: Optional[float] = None
    gross_value_usd: Optional[float] = None

@router.get("/employees")
def list_telemetry_employees(team: Optional[str] = None):
    sql = """
        SELECT e.id, e.display_name, e.email, t.name as team_name, f.name as function_name,
               a.id as agent_id, a.name as agent_name
        FROM employee e
        JOIN team t ON t.id = e.team_id
        JOIN business_function f ON f.id = t.function_id
        LEFT JOIN employee_agent ea ON ea.employee_id = e.id AND ea.is_active = 1
        LEFT JOIN ai_agent a ON a.id = ea.agent_id
        WHERE 1=1
    """
    params = []
    if team:
        sql += " AND (t.name = ? OR LOWER(t.name) LIKE ?)"
        params.extend([team, f"%{team.lower()}%"])
    sql += " ORDER BY e.id ASC"

    rows = query_all(sql, tuple(params))

    device_map = {
        "aarav@wct.com": "ThinkPad P1 Gen 6 (Serial: LN-98234)",
        "ananya@wct.com": "ThinkPad T14 Gen 4 (Serial: LN-44120)",
        "arjun@wct.com": "ThinkPad X1 Carbon Gen 11 (Serial: LN-55912)",
        "divya@wct.com": "ThinkPad L15 Gen 3 (Serial: LN-77209)",
    }

    employees = {}
    for r in rows:
        eid = r["id"]
        if eid not in employees:
            email = r["email"]
            name = r["display_name"]
            initials = "".join([part[0] for part in name.split()[:2]]).upper()
            device = device_map.get(email, f"ThinkPad T14s (Serial: LN-{10000 + eid})")
            employees[eid] = {
                "id": eid,
                "display_name": name,
                "email": email,
                "team_name": r["team_name"],
                "function_name": r["function_name"],
                "device": device,
                "initials": initials,
                "assigned_agents": []
            }
        if r["agent_name"]:
            employees[eid]["assigned_agents"].append({
                "agent_id": r["agent_id"],
                "agent_name": r["agent_name"]
            })

    return list(employees.values())

@router.get("/user-usage")
def get_user_usage(
    date: Optional[str] = None,
    employee_id: Optional[int] = None,
    agent_id: Optional[int] = None
):
    sql = """
        SELECT u.id, u.employee_id, e.display_name, e.email, u.agent_id, a.name as agent_name,
               u.usage_date, u.sessions_count, u.daily_usage_json, u.updated_at
        FROM user_usage u
        JOIN employee e ON e.id = u.employee_id
        JOIN ai_agent a ON a.id = u.agent_id
        WHERE 1=1
    """
    params = []
    if date:
        sql += " AND u.usage_date = ?"
        params.append(date)
    if employee_id:
        sql += " AND u.employee_id = ?"
        params.append(employee_id)
    if agent_id:
        sql += " AND u.agent_id = ?"
        params.append(agent_id)
    sql += " ORDER BY u.usage_date DESC, u.sessions_count DESC"

    rows = query_all(sql, tuple(params))
    results = []
    for r in rows:
        parsed_json = {}
        try:
            parsed_json = json.loads(r["daily_usage_json"])
        except Exception:
            pass
        results.append({
            "id": r["id"],
            "user_id": r["employee_id"],
            "employee_name": r["display_name"],
            "user_email": r["email"],
            "agent_id": r["agent_id"],
            "agent_name": r["agent_name"],
            "date": r["usage_date"],
            "sessions_count": r["sessions_count"],
            "daily_usage_json": parsed_json,
            "updated_at": r["updated_at"]
        })
    return results

@router.get("/daily-summary")
def get_daily_telemetry_summary(
    agent_id: Optional[str] = None,
    agent_name: Optional[str] = None,
    date: Optional[str] = None
):
    """
    Returns aggregated metrics for an agent across all employees in a day:
    1. Token usage of all employees in a day (prompt, completion, total)
    2. Average number of sessions in a day
    3. Average success rate of agent in a day (of all users)
    4. Average agent completion time (seconds)
    5. Detailed employee breakdown
    """
    target_date = date
    if not target_date:
        if agent_id and str(agent_id).isdigit():
            row = query_one("SELECT MAX(usage_date) as max_date FROM user_usage WHERE agent_id = ?", (int(agent_id),))
        elif agent_id:
            row = query_one("""
                SELECT MAX(u.usage_date) as max_date 
                FROM user_usage u 
                JOIN ai_agent a ON a.id = u.agent_id 
                WHERE json_extract(u.daily_usage_json, '$.agent_id') = ? OR LOWER(a.name) LIKE ?
            """, (agent_id, f"%{agent_id.lower()}%"))
        elif agent_name:
            row = query_one("""
                SELECT MAX(u.usage_date) as max_date 
                FROM user_usage u 
                JOIN ai_agent a ON a.id = u.agent_id 
                WHERE LOWER(a.name) LIKE ?
            """, (f"%{agent_name.lower()}%",))
        else:
            row = query_one("SELECT MAX(usage_date) as max_date FROM user_usage")

        target_date = row["max_date"] if row and row["max_date"] else datetime.now(timezone.utc).strftime("%Y-%m-%d")

    sql = """
        SELECT u.id, u.employee_id, e.display_name, e.email, u.agent_id, a.name as agent_name,
               u.usage_date, u.sessions_count, u.daily_usage_json, u.updated_at
        FROM user_usage u
        JOIN employee e ON e.id = u.employee_id
        JOIN ai_agent a ON a.id = u.agent_id
        WHERE u.usage_date = ?
    """
    params = [target_date]
    if agent_id:
        if str(agent_id).isdigit():
            sql += " AND u.agent_id = ?"
            params.append(int(agent_id))
        else:
            sql += " AND (json_extract(u.daily_usage_json, '$.agent_id') = ? OR LOWER(a.name) LIKE ?)"
            params.extend([agent_id, f"%{agent_id.lower()}%"])
    elif agent_name:
        sql += " AND LOWER(a.name) LIKE ?"
        params.append(f"%{agent_name.lower()}%")

    sql += " ORDER BY u.sessions_count DESC, e.display_name ASC"
    rows = query_all(sql, tuple(params))

    # Note: Do NOT fall back to other agents' records. Each agent must show only its own telemetry.

    total_completion_tokens = 0
    total_prompt_tokens = 0
    total_tokens = 0
    total_sessions = 0
    total_success = 0
    weighted_completion_time_sum = 0.0

    breakdown = []
    resolved_agent_name = agent_name or (agent_id if agent_id and not str(agent_id).isdigit() else "AI Agent")
    resolved_agent_id = agent_id or "ai-agent"

    if rows:
        resolved_agent_name = rows[0]["agent_name"]
        resolved_agent_id = str(rows[0]["agent_id"])
    else:
        if agent_id and str(agent_id).isdigit():
            a_row = query_one("SELECT id, name FROM ai_agent WHERE id = ?", (int(agent_id),))
            if a_row:
                resolved_agent_name = a_row["name"]
                resolved_agent_id = str(a_row["id"])
        elif agent_name or agent_id:
            search_term = agent_name or agent_id
            a_row = query_one("SELECT id, name FROM ai_agent WHERE LOWER(name) LIKE ?", (f"%{search_term.lower()}%",))
            if a_row:
                resolved_agent_name = a_row["name"]
                resolved_agent_id = str(a_row["id"])

    for r in rows:
        resolved_agent_name = r["agent_name"]
        parsed = {}
        try:
            parsed = json.loads(r["daily_usage_json"])
        except Exception:
            pass

        sessions = int(parsed.get("session_count", r["sessions_count"]))
        c_tokens = int(parsed.get("completion_tokens", 0))
        p_tokens = int(parsed.get("prompt_tokens", 0))
        t_tokens = int(parsed.get("total_tokens", c_tokens + p_tokens))
        suc = int(parsed.get("sucess", 0))
        comp_time = float(parsed.get("agent_completion", 0.0))

        total_completion_tokens += c_tokens
        total_prompt_tokens += p_tokens
        total_tokens += t_tokens
        total_sessions += sessions
        total_success += suc
        weighted_completion_time_sum += (comp_time * sessions)

        emp_rate = round((suc / max(sessions, 1)) * 100, 1)
        breakdown.append({
            "employee_id": r["employee_id"],
            "display_name": r["display_name"],
            "email": parsed.get("user_email", r["email"]),
            "sessions_count": sessions,
            "completion_tokens": c_tokens,
            "prompt_tokens": p_tokens,
            "total_tokens": t_tokens,
            "agent_completion": comp_time,
            "sucess": suc,
            "success_rate_pct": emp_rate
        })

    employees_count = len(breakdown)
    avg_sessions_in_day = round(total_sessions / max(employees_count, 1), 2)
    avg_success_rate = round((total_success / max(total_sessions, 1)) * 100, 1)
    avg_completion_time = round(weighted_completion_time_sum / max(total_sessions, 1), 2)

    return {
        "date": target_date,
        "agent_id": resolved_agent_id,
        "agent_name": resolved_agent_name,
        "employees_count": employees_count,
        "total_tokens": total_tokens,
        "completion_tokens": total_completion_tokens,
        "prompt_tokens": total_prompt_tokens,
        "total_sessions": total_sessions,
        "avg_sessions_in_day": avg_sessions_in_day,
        "avg_success_rate_pct": avg_success_rate,
        "total_success_count": total_success,
        "avg_agent_completion_seconds": avg_completion_time,
        "employees_breakdown": breakdown
    }


@router.post("/ingest")
def ingest_telemetry(payload: TelemetryIngestPayload):
    agent_name = payload.agent_name or "Ticket Triage Agent"
    target_month = "2026-09"
    month_start = f"{target_month}-01"

    # Normalize fields across different payload standards
    task_id = payload.task_id or f"task-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    tokens_in = payload.tokens_in if payload.tokens_in is not None else (payload.prompt_tokens or 0)
    tokens_out = payload.tokens_out if payload.tokens_out is not None else (payload.completion_tokens or 0)

    is_success = True
    if payload.sucess is not None:
        is_success = payload.sucess
    elif payload.success is not None:
        is_success = payload.success
    elif payload.status:
        is_success = (payload.status.upper() == "SUCCESS")

    status = "SUCCESS" if is_success else "FAILED"

    # Look up agent configuration from ai_agent table (onboarded via working agent JSON)
    agent_cfg = query_one("""
        SELECT 
            input_token_price_per_1m, output_token_price_per_1m,
            baseline_employee_hours, employee_monthly_rate,
            employee_monthly_working_hours, monthly_infra_cost, monthly_budget
        FROM ai_agent 
        WHERE name = ? OR name LIKE ?
    """, (agent_name, f"%{agent_name}%"))

    input_price = float(agent_cfg.get("input_token_price_per_1m") or 2.50) if agent_cfg else 2.50
    output_price = float(agent_cfg.get("output_token_price_per_1m") or 10.00) if agent_cfg else 10.00
    baseline_hrs = float(agent_cfg.get("baseline_employee_hours") or 0.5) if agent_cfg else 0.5
    monthly_rate = float(agent_cfg.get("employee_monthly_rate") or 6500.0) if agent_cfg else 6500.0
    working_hrs = float(agent_cfg.get("employee_monthly_working_hours") or 160.0) if agent_cfg else 160.0
    hourly_labor_rate = round(monthly_rate / working_hrs, 2) if working_hrs > 0 else 40.63

    cost_usd = payload.cost_usd
    if cost_usd is None:
        cost_usd = round((tokens_in * input_price / 1_000_000) + (tokens_out * output_price / 1_000_000), 5)

    hours_saved = payload.hours_saved
    if hours_saved is None:
        hours_saved = baseline_hrs if is_success else 0.0

    gross_value_usd = payload.gross_value_usd
    if gross_value_usd is None:
        gross_value_usd = round(hours_saved * hourly_labor_rate, 2)

    # 1. Update in-memory store for fallback / fast response
    for row in store.raw_agents:
        if row.get("Agent") == agent_name and row.get("Month") == target_month:
            row["GrossValueUSD"] = round(float(row.get("GrossValueUSD", 0)) + gross_value_usd, 2)
            row["CostUSD"] = round(float(row.get("CostUSD", 0)) + cost_usd, 4)
            row["NetValueUSD"] = round(float(row.get("GrossValueUSD", 0)) - float(row.get("CostUSD", 0)), 2)
            row["HoursSaved"] = round(float(row.get("HoursSaved", 0)) + hours_saved, 2)
            row["EvalRuns"] = int(row.get("EvalRuns", 0)) + 1
            if status == "SUCCESS":
                row["EvalPassed"] = int(row.get("EvalPassed", 0)) + 1

    # 2. Update live SQLite Database
    try:
        # Find employee / user ID
        emp_row = query_one(
            "SELECT id, company_id FROM employee WHERE LOWER(email) = LOWER(?) OR email LIKE ? OR LOWER(display_name) LIKE ?",
            (payload.user_email, f"%{payload.user_email.split('@')[0]}%", f"%{payload.user_email.split('@')[0]}%")
        )
        if not emp_row:
            username = payload.user_email.split('@')[0]
            display_name = username.replace(".", " ").replace("_", " ").title()
            emp_key = f"usr-{username}"
            execute_write(
                "INSERT INTO employee (company_id, team_id, external_user_key, display_name, email) VALUES (1, 5, ?, ?, ?)",
                (emp_key, display_name, payload.user_email)
            )
            emp_row = query_one("SELECT id, company_id FROM employee WHERE email = ?", (payload.user_email,))

        employee_id = emp_row["id"] if emp_row else 1
        company_id = emp_row["company_id"] if emp_row else 1

        # Find agent ID
        agent_row = query_one("SELECT id FROM ai_agent WHERE name = ? OR name LIKE ?", (agent_name, f"%{agent_name}%"))
        agent_id = agent_row["id"] if agent_row else 11

        # Find team ID for this agent
        team_row = query_one("SELECT team_id FROM team_agent WHERE agent_id = ? AND is_active = 1", (agent_id,))
        team_id = team_row["team_id"] if team_row else 5

        # Determine usage date (YYYY-MM-DD)
        usage_date = None
        if payload.agent_end_time:
            usage_date = payload.agent_end_time[:10]
        elif payload.timestamp:
            usage_date = payload.timestamp[:10]
        if not usage_date or len(usage_date) != 10:
            usage_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # Compute duration of this single agent completion run (seconds)
        single_completion_sec = 0.0
        if payload.agent_start_time and payload.agent_end_time:
            try:
                st = datetime.fromisoformat(payload.agent_start_time.replace("Z", "+00:00"))
                et = datetime.fromisoformat(payload.agent_end_time.replace("Z", "+00:00"))
                diff = (et - st).total_seconds()
                if diff >= 0:
                    single_completion_sec = round(diff, 2)
            except Exception:
                pass
        if single_completion_sec == 0.0 and payload.latency_ms:
            single_completion_sec = round(payload.latency_ms / 1000.0, 2)
        if single_completion_sec == 0.0:
            single_completion_sec = 8.87

        # ── 3. AGGREGATE INTO user_usage TABLE PER (employee_id, agent_id, usage_date) ──
        existing_usage = query_one(
            "SELECT id, sessions_count, daily_usage_json FROM user_usage WHERE employee_id = ? AND agent_id = ? AND usage_date = ?",
            (employee_id, agent_id, usage_date)
        )

        daily_result = {}
        if existing_usage:
            try:
                curr_data = json.loads(existing_usage["daily_usage_json"])
            except Exception:
                curr_data = {}

            prev_session_count = int(curr_data.get("session_count", existing_usage["sessions_count"]))
            session_count = prev_session_count + 1
            agg_prompt_tokens = int(curr_data.get("prompt_tokens", 0)) + tokens_in
            agg_completion_tokens = int(curr_data.get("completion_tokens", 0)) + tokens_out
            session_total_tokens = payload.total_tokens if payload.total_tokens is not None else (tokens_in + tokens_out)
            agg_total_tokens = int(curr_data.get("total_tokens", 0)) + session_total_tokens

            # Sum of all session(agent_end_time - agent_start_time) divided by number of sessions
            prev_agent_completion = float(curr_data.get("agent_completion", 0.0))
            prev_total_duration = prev_agent_completion * prev_session_count
            new_total_duration = prev_total_duration + single_completion_sec
            agent_completion = round(new_total_duration / session_count, 2)

            # Sum of success when its true in a day
            prev_success = int(curr_data.get("sucess", 0))
            success_sum = prev_success + (1 if is_success else 0)

            updated_usage_dict = {
                "agent_id": payload.agent_id or "it-service-desk",
                "agent_name": agent_name,
                "user_email": payload.user_email,
                "completion_tokens": agg_completion_tokens,
                "prompt_tokens": agg_prompt_tokens,
                "total_tokens": agg_total_tokens,
                "session_count": session_count,
                "agent_completion": agent_completion,
                "date": usage_date,
                "sucess": success_sum
            }

            execute_write(
                "UPDATE user_usage SET sessions_count = ?, daily_usage_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (session_count, json.dumps(updated_usage_dict), existing_usage["id"])
            )
            daily_result = updated_usage_dict
        else:
            session_count = 1
            agent_completion = round(single_completion_sec, 2)
            success_sum = 1 if is_success else 0
            session_total = payload.total_tokens if payload.total_tokens is not None else (tokens_in + tokens_out)

            new_usage_dict = {
                "agent_id": payload.agent_id or "it-service-desk",
                "agent_name": agent_name,
                "user_email": payload.user_email,
                "completion_tokens": tokens_out,
                "prompt_tokens": tokens_in,
                "total_tokens": session_total,
                "session_count": session_count,
                "agent_completion": agent_completion,
                "date": usage_date,
                "sucess": success_sum
            }

            execute_write(
                """
                INSERT INTO user_usage (company_id, employee_id, agent_id, usage_date, sessions_count, daily_usage_json)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (company_id, employee_id, agent_id, usage_date, session_count, json.dumps(new_usage_dict))
            )
            daily_result = new_usage_dict

        # A. Update value_measurement_month
        execute_write("""
            UPDATE value_measurement_month 
            SET hours_saved = hours_saved + ? 
            WHERE agent_id = ? AND team_id = ? AND month_start = ?
        """, (hours_saved, agent_id, team_id, month_start))

        # B. Insert real LLM cost into cost_record
        rec_key = f"live-azure-{task_id}-{uuid.uuid4().hex[:6]}"
        execute_write("""
            INSERT INTO cost_record (company_id, month_start, agent_id, team_id, cost_category, amount, cost_basis, external_record_key)
            VALUES (1, ?, ?, ?, 'consumption', ?, 'token_pricing_estimate', ?)
        """, (month_start, agent_id, team_id, cost_usd, rec_key))

        # C. Insert usage into agent_usage_daily
        usage_key = f"usage-{task_id}-{uuid.uuid4().hex[:6]}"
        execute_write("""
            INSERT INTO agent_usage_daily (company_id, usage_date, agent_id, team_id, employee_id, source_record_key, tasks_count, sessions_count, input_tokens, output_tokens)
            VALUES (1, ?, ?, ?, ?, ?, 1, 1, ?, ?)
        """, (usage_date, agent_id, team_id, employee_id, usage_key, tokens_in, tokens_out))

        # D. Update agent_evaluation runs
        execute_write("""
            UPDATE agent_evaluation 
            SET total_cases = total_cases + 1, 
                passed_cases = passed_cases + (CASE WHEN ? = 'SUCCESS' THEN 1 ELSE 0 END)
            WHERE agent_id = ? AND team_id = ? AND substr(evaluated_at, 1, 7) = ?
        """, (status, agent_id, team_id, target_month))

    except Exception as e:
        print(f"Warning: Failed to update SQLite telemetry tables: {e}")

    return {
        "status": "ingested",
        "task_id": task_id,
        "employee_id": employee_id if 'employee_id' in locals() else None,
        "agent_id": payload.agent_id or "it-service-desk",
        "date": usage_date if 'usage_date' in locals() else None,
        "daily_usage": daily_result,
        "message": f"Successfully recorded daily usage in SQLite for {payload.user_email}"
    }
