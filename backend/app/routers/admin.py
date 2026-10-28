from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Body
from typing import Dict, Any, List, Optional, Union
import io
import csv
import json
from datetime import date
from ..schemas import ThresholdConfig
from ..data_store import store
from ..auth import get_current_user
from ..database import get_db, query_all, query_one, execute_write

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/thresholds", response_model=ThresholdConfig)
def get_thresholds(user: Dict[str, Any] = Depends(get_current_user)):
    return store.thresholds

@router.put("/thresholds", response_model=ThresholdConfig)
def update_thresholds(req: ThresholdConfig, user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: Admin role required to modify governance thresholds.")
    store.thresholds = req.model_dump()
    return store.thresholds

@router.post("/upload")
async def upload_csv(
    file: UploadFile = File(...),
    dataset_type: str = "agents",  # "agents", "costs", or "seats"
    user: Dict[str, Any] = Depends(get_current_user)
):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: Admin role required to upload datasets.")
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")
        
    content = await file.read()
    try:
        decoded = content.decode("utf-8")
        reader = csv.DictReader(io.StringIO(decoded))
        rows = list(reader)
        
        if dataset_type == "agents":
            store.raw_agents.extend(rows)
        elif dataset_type == "costs":
            store.raw_costs.extend(rows)
            
        return {
            "status": "success",
            "filename": file.filename,
            "dataset_type": dataset_type,
            "rows_ingested": len(rows),
            "message": f"Successfully ingested {len(rows)} records into {dataset_type} mart."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse CSV: {str(e)}")


# ---------------------------------------------------------------------------
# Working Agents Onboarding & Ingestion
# ---------------------------------------------------------------------------

WORKING_AGENT_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "WorkingAgentIngestConfig",
    "description": "Enterprise working AI agent onboarding schema defining governance parameters, FinOps pricing, monthly budget, and productivity baselines.",
    "type": "object",
    "required": [
        "agent_name",
        "business_function",
        "team",
        "model",
        "input_token_price_per_1m",
        "output_token_price_per_1m",
        "monthly_infra_cost",
        "monthly_budget",
        "baseline_employee_hours",
        "employee_monthly_rate",
        "employee_monthly_working_hours"
    ],
    "properties": {
        "agent_name": {
            "type": "string",
            "description": "Unique name of the working AI agent (e.g. 'Ticket Triage Agent')",
            "example": "Ticket Triage Agent"
        },
        "business_function": {
            "type": "string",
            "description": "Organizational department or business function (e.g. 'Eng & IT', 'Customer', 'Finance', 'Sales', 'Operations')",
            "example": "Eng & IT"
        },
        "team": {
            "type": "string",
            "description": "Specific internal team employing the agent (e.g. 'IT Service Desk', 'Software Engineering')",
            "example": "IT Service Desk"
        },
        "model": {
            "type": "string",
            "description": "Foundation LLM model used (e.g. 'gpt-4o', 'claude-3-7-sonnet', 'gemini-1.5-pro')",
            "example": "gpt-4o"
        },
        "input_token_price_per_1m": {
            "type": "number",
            "description": "LLM API pricing per 1 million input prompt tokens in USD (e.g. 2.50 for GPT-4o)",
            "example": 2.50
        },
        "output_token_price_per_1m": {
            "type": "number",
            "description": "LLM API pricing per 1 million output completion tokens in USD (e.g. 10.00 for GPT-4o)",
            "example": 10.00
        },
        "monthly_infra_cost": {
            "type": "number",
            "description": "Fixed monthly infrastructure, cloud hosting, and container cost for this agent in USD",
            "example": 150.00
        },
        "monthly_budget": {
            "type": "number",
            "description": "Monthly allocated FinOps budget for this agent in USD (used as denominator for Cost vs budget)",
            "example": 500.00
        },
        "baseline_employee_hours": {
            "type": "number",
            "description": "Average human employee hours previously required to complete 1 task manually (e.g. 0.5 hours for 30 minutes)",
            "example": 0.5
        },
        "employee_monthly_rate": {
            "type": "number",
            "description": "Fully loaded monthly salary and compensation rate of the human employee role in USD",
            "example": 6500.00
        },
        "employee_monthly_working_hours": {
            "type": "number",
            "description": "Standard monthly working hours for employees (default 160 hours/month)",
            "example": 160.0
        },
        "category": {
            "type": "string",
            "enum": ["built_with", "built_using", "built_in"],
            "default": "built_with",
            "description": "Cockpit agent taxonomy category"
        },
        "agent_type": {
            "type": "string",
            "enum": ["workflow_agent", "coding_assistant", "chat_assistant", "rag_agent", "automation", "other"],
            "default": "workflow_agent",
            "description": "Operational type of agent"
        },
        "description": {
            "type": "string",
            "description": "Business capability and task description",
            "example": "Automated IT service desk ticket triaging, diagnostic analysis, and resolution suggestions."
        }
    },
    "example_ticket_triage_agent": {
        "agent_name": "Ticket Triage Agent",
        "business_function": "Eng & IT",
        "team": "IT Service Desk",
        "model": "gpt-4o",
        "input_token_price_per_1m": 2.50,
        "output_token_price_per_1m": 10.00,
        "monthly_infra_cost": 150.00,
        "monthly_budget": 500.00,
        "baseline_employee_hours": 0.5,
        "employee_monthly_rate": 6500.00,
        "employee_monthly_working_hours": 160,
        "category": "built_with",
        "agent_type": "workflow_agent",
        "description": "Automated IT service desk ticket triaging, diagnostic analysis, and resolution suggestions."
    }
}

@router.get("/working-agents/schema")
def get_working_agents_schema(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns the JSON Schema, field definitions, and example configuration for working agents.
    """
    return WORKING_AGENT_SCHEMA

@router.get("/working-agents")
def get_working_agents(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Fetches all working agents registered in the database along with their FinOps and productivity parameters.
    """
    agents = query_all("""
        SELECT 
            a.id, a.company_id, a.name, a.category, a.agent_type, a.portfolio,
            a.description, a.go_live_date, a.is_active, a.created_at,
            a.monthly_infra_cost, a.monthly_budget, a.input_token_price_per_1m, a.output_token_price_per_1m,
            a.model, a.baseline_employee_hours, a.employee_monthly_rate, a.employee_monthly_working_hours,
            COALESCE(a.business_function, bf.name) as business_function,
            COALESCE(a.team, t.name) as team,
            a.config_json
        FROM ai_agent a
        LEFT JOIN team_agent ta ON ta.agent_id = a.id AND ta.is_active = 1
        LEFT JOIN team t ON t.id = ta.team_id
        LEFT JOIN business_function bf ON bf.id = t.function_id
        GROUP BY a.id
        ORDER BY a.name ASC;
    """)
    return {"total": len(agents), "agents": agents}

@router.post("/working-agents")
def ingest_working_agent(
    payload: Union[Dict[str, Any], List[Dict[str, Any]]] = Body(...),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Ingests or updates working agent parameters into the ai_agent table.
    Links organizational structure (business function, team, team_agent, team_hourly_cost_rate).
    """
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: Admin role required to configure working agents.")

    items = payload if isinstance(payload, list) else [payload]
    results = []

    with get_db() as conn:
        cur = conn.cursor()
        for raw in items:
            llm_pricing = raw.get("llm_pricing") if isinstance(raw.get("llm_pricing"), dict) else {}
            name = (raw.get("agent_name") or raw.get("name") or "").strip()
            if not name:
                raise HTTPException(status_code=400, detail="Missing required field: 'agent_name'")

            function_name = (raw.get("business_function") or raw.get("function") or "Eng & IT").strip()
            team_name = (raw.get("team") or raw.get("team_name") or "IT Service Desk").strip()
            model = (llm_pricing.get("model") or raw.get("model") or "gpt-4o").strip()

            try:
                input_price = float(llm_pricing.get("input_token_price_per_1m") if llm_pricing.get("input_token_price_per_1m") is not None else (raw.get("input_token_price_per_1m") or raw.get("input_token_price") or 2.50))
            except (ValueError, TypeError):
                input_price = 2.50

            try:
                output_price = float(llm_pricing.get("output_token_price_per_1m") if llm_pricing.get("output_token_price_per_1m") is not None else (raw.get("output_token_price_per_1m") or raw.get("output_token_price") or 10.00))
            except (ValueError, TypeError):
                output_price = 10.00

            try:
                monthly_infra = float(raw.get("monthly_infra_cost") if raw.get("monthly_infra_cost") is not None else (raw.get("monthly_agent_infra_cost") or raw.get("infra_cost") or 0.0))
            except (ValueError, TypeError):
                monthly_infra = 0.0

            try:
                monthly_budget = float(raw.get("monthly_budget") if raw.get("monthly_budget") is not None else (raw.get("agent_monthly_budget") or raw.get("budget") or 500.0))
            except (ValueError, TypeError):
                monthly_budget = 500.0

            if raw.get("baseline_employee_hours") is not None:
                try:
                    baseline_hours = float(raw["baseline_employee_hours"])
                except (ValueError, TypeError):
                    baseline_hours = 0.5
            elif raw.get("baseline_employee_minutes") is not None:
                try:
                    baseline_hours = float(raw["baseline_employee_minutes"]) / 60.0
                except (ValueError, TypeError):
                    baseline_hours = 0.5
            elif raw.get("baseline_hours") is not None:
                try:
                    baseline_hours = float(raw["baseline_hours"])
                except (ValueError, TypeError):
                    baseline_hours = 0.5
            else:
                baseline_hours = 0.5

            try:
                emp_monthly_rate = float(raw.get("employee_monthly_rate") if raw.get("employee_monthly_rate") is not None else (raw.get("employee_montly_rate") or raw.get("monthly_rate") or 0.0))
            except (ValueError, TypeError):
                emp_monthly_rate = 0.0

            try:
                working_hours = float(raw.get("employee_monthly_working_hours") if raw.get("employee_monthly_working_hours") is not None else (raw.get("employee_working_hours") or raw.get("working_hours") or raw.get("monthly_working_hours") or 160.0))
            except (ValueError, TypeError):
                working_hours = 160.0

            category = raw.get("category") or "built_with"
            agent_type = raw.get("agent_type") or "workflow_agent"
            description = raw.get("description") or f"{name} serving {team_name} in {function_name}"
            go_live = raw.get("go_live_date") or date.today().isoformat()
            raw_json_str = json.dumps(raw, indent=2)

            # 1. Ensure business function and team exist
            cur.execute("INSERT OR IGNORE INTO business_function (company_id, name) VALUES (1, ?)", (function_name,))
            cur.execute("SELECT id FROM business_function WHERE company_id = 1 AND name = ?", (function_name,))
            bf_row = cur.fetchone()
            fid = bf_row[0] if bf_row else 1

            cur.execute("INSERT OR IGNORE INTO team (company_id, function_id, name, is_active) VALUES (1, ?, ?, 1)", (fid, team_name))
            cur.execute("SELECT id FROM team WHERE company_id = 1 AND function_id = ? AND name = ?", (fid, team_name))
            t_row = cur.fetchone()
            tid = t_row[0] if t_row else None

            # 2. Update team hourly cost rate based on employee monthly rate & working hours
            if tid and emp_monthly_rate > 0 and working_hours > 0:
                hourly_rate = round(emp_monthly_rate / working_hours, 2)
                cur.execute("""
                    INSERT INTO team_hourly_cost_rate (company_id, team_id, effective_from, hourly_cost, currency)
                    VALUES (1, ?, '2026-01-01', ?, 'USD')
                    ON CONFLICT(team_id, effective_from) DO UPDATE SET hourly_cost = excluded.hourly_cost;
                """, (tid, hourly_rate))

            # 3. Upsert ai_agent record
            cur.execute("""
                INSERT INTO ai_agent (
                    company_id, name, category, agent_type, portfolio, description, go_live_date, is_active,
                    monthly_infra_cost, monthly_budget, input_token_price_per_1m, output_token_price_per_1m,
                    model, baseline_employee_hours, employee_monthly_rate, employee_monthly_working_hours,
                    business_function, team, config_json
                ) VALUES (
                    1, ?, ?, ?, 'Default', ?, ?, 1,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?
                )
                ON CONFLICT(company_id, name) DO UPDATE SET
                    category = excluded.category,
                    agent_type = excluded.agent_type,
                    description = excluded.description,
                    monthly_infra_cost = excluded.monthly_infra_cost,
                    monthly_budget = excluded.monthly_budget,
                    input_token_price_per_1m = excluded.input_token_price_per_1m,
                    output_token_price_per_1m = excluded.output_token_price_per_1m,
                    model = excluded.model,
                    baseline_employee_hours = excluded.baseline_employee_hours,
                    employee_monthly_rate = excluded.employee_monthly_rate,
                    employee_monthly_working_hours = excluded.employee_monthly_working_hours,
                    business_function = excluded.business_function,
                    team = excluded.team,
                    config_json = excluded.config_json,
                    is_active = 1;
            """, (
                name, category, agent_type, description, go_live,
                monthly_infra, monthly_budget, input_price, output_price,
                model, baseline_hours, emp_monthly_rate, working_hours,
                function_name, team_name, raw_json_str
            ))

            cur.execute("SELECT id FROM ai_agent WHERE company_id = 1 AND name = ?", (name,))
            agent_id = cur.fetchone()[0]

            # 4. Link team_agent
            if tid:
                cur.execute("""
                    INSERT OR IGNORE INTO team_agent (company_id, team_id, agent_id, assigned_from, is_active)
                    VALUES (1, ?, ?, '2026-01-01', 1)
                """, (tid, agent_id))

                # 5. Baseline measurement assumption
                baseline_minutes = round(baseline_hours * 60.0, 1)
                cur.execute("""
                    INSERT INTO value_measurement_month (
                        company_id, month_start, agent_id, team_id, hours_saved,
                        measurement_method, baseline_minutes, confidence_level, approval_status, notes
                    ) VALUES (1, '2026-09-01', ?, ?, 0.0, 'model_estimate', ?, 'high', 'approved', 'Configured via Admin Ingestion')
                    ON CONFLICT(agent_id, team_id, month_start) DO UPDATE SET
                        baseline_minutes = excluded.baseline_minutes,
                        approval_status = 'approved';
                """, (agent_id, tid, baseline_minutes))

                # 6. Update agent budget in agent_budget_month
                cur.execute("""
                    INSERT INTO agent_budget_month (company_id, month_start, agent_id, team_id, cost_category, budget_amount, currency)
                    VALUES (1, '2026-09-01', ?, ?, 'consumption', ?, 'USD')
                    ON CONFLICT(agent_id, team_id, month_start, cost_category) DO UPDATE SET budget_amount = excluded.budget_amount;
                """, (agent_id, tid, monthly_budget))

            results.append({
                "agent_id": agent_id,
                "agent_name": name,
                "business_function": function_name,
                "team": team_name,
                "model": model,
                "input_token_price_per_1m": input_price,
                "output_token_price_per_1m": output_price,
                "monthly_infra_cost": monthly_infra,
                "monthly_budget": monthly_budget,
                "baseline_employee_hours": baseline_hours,
                "employee_monthly_rate": emp_monthly_rate,
                "employee_monthly_working_hours": working_hours,
                "status": "SAVED"
            })

    return {
        "status": "success",
        "saved_count": len(results),
        "agents": results,
        "message": f"Successfully ingested and saved {len(results)} working agent(s) into company database."
    }

