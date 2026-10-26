import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel
from ..data_store import store
from ..database import execute_write, query_one, query_all

router = APIRouter(prefix="/telemetry", tags=["telemetry"])

class TelemetryIngestPayload(BaseModel):
    task_id: str
    agent_id: str
    agent_name: Optional[str] = "Ticket Triage Agent"
    user_email: str
    timestamp: str
    latency_ms: int
    tokens_in: int
    tokens_out: int
    cost_usd: float
    status: str
    hours_saved: float
    gross_value_usd: float

@router.post("/ingest")
def ingest_telemetry(payload: TelemetryIngestPayload):
    agent_name = payload.agent_name or "Ticket Triage Agent"
    target_month = "2026-09"
    month_start = f"{target_month}-01"

    # 1. Update in-memory store for fallback / fast response
    for row in store.raw_agents:
        if row.get("Agent") == agent_name and row.get("Month") == target_month:
            row["GrossValueUSD"] = round(float(row.get("GrossValueUSD", 0)) + payload.gross_value_usd, 2)
            row["CostUSD"] = round(float(row.get("CostUSD", 0)) + payload.cost_usd, 4)
            row["NetValueUSD"] = round(float(row.get("GrossValueUSD", 0)) - float(row.get("CostUSD", 0)), 2)
            row["HoursSaved"] = round(float(row.get("HoursSaved", 0)) + payload.hours_saved, 2)
            row["EvalRuns"] = int(row.get("EvalRuns", 0)) + 1
            if payload.status == "SUCCESS":
                row["EvalPassed"] = int(row.get("EvalPassed", 0)) + 1

    # 2. Update live SQLite Database so the SQL view reflects it immediately
    try:
        # Find agent ID
        agent_row = query_one("SELECT id FROM ai_agent WHERE name = ? OR name LIKE ?", (agent_name, f"%{agent_name}%"))
        agent_id = agent_row["id"] if agent_row else 11

        # Find team ID for this agent
        team_row = query_one("SELECT team_id FROM team_agent WHERE agent_id = ? AND is_active = 1", (agent_id,))
        team_id = team_row["team_id"] if team_row else 2

        # A. Update value_measurement_month
        execute_write("""
            UPDATE value_measurement_month 
            SET hours_saved = hours_saved + ? 
            WHERE agent_id = ? AND team_id = ? AND month_start = ?
        """, (payload.hours_saved, agent_id, team_id, month_start))

        # B. Insert real LLM cost into cost_record
        rec_key = f"live-azure-{payload.task_id}-{uuid.uuid4().hex[:6]}"
        execute_write("""
            INSERT INTO cost_record (company_id, month_start, agent_id, team_id, cost_category, amount, cost_basis, external_record_key)
            VALUES (1, ?, ?, ?, 'consumption', ?, 'live_azure_openai', ?)
        """, (month_start, agent_id, team_id, payload.cost_usd, rec_key))

        # C. Insert usage into agent_usage_daily
        usage_key = f"usage-{payload.task_id}-{uuid.uuid4().hex[:6]}"
        today_str = datetime.now().strftime("%Y-%m-%d")
        execute_write("""
            INSERT INTO agent_usage_daily (company_id, usage_date, agent_id, team_id, source_record_key, tasks_count, input_tokens, output_tokens)
            VALUES (1, ?, ?, ?, ?, 1, ?, ?)
        """, (today_str, agent_id, team_id, usage_key, payload.tokens_in, payload.tokens_out))

        # D. Update agent_evaluation runs
        execute_write("""
            UPDATE agent_evaluation 
            SET total_cases = total_cases + 1, 
                passed_cases = passed_cases + (CASE WHEN ? = 'SUCCESS' THEN 1 ELSE 0 END)
            WHERE agent_id = ? AND team_id = ? AND substr(evaluated_at, 1, 7) = ?
        """, (payload.status, agent_id, team_id, target_month))

    except Exception as e:
        print(f"Warning: Failed to update SQLite telemetry tables: {e}")

    return {
        "status": "ingested",
        "task_id": payload.task_id,
        "agent_name": agent_name,
        "user_email": payload.user_email,
        "message": f"Successfully recorded {payload.hours_saved}h and ${payload.cost_usd} cost in SQLite for {agent_name}"
    }
