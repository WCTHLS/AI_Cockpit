import uuid
import json
import random
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Query, HTTPException, Depends
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from ..database import get_db, query_all, query_one, execute_write

router = APIRouter(prefix="/copilot-studio", tags=["copilot-studio"])

SCENARIOS = [
    {
        "topic": "SAP_Shipment_Tracking",
        "prompt": "Track PO-98412: 2,000 ThinkPad X1 Carbon units from Kunshan factory to Morrisville hub.",
        "actions": ["SAP_GetShipmentStatus", "OceanCarrier_TrackVessel"],
        "default_outcome": "Resolved",
        "minutes_saved": 20.0,
        "response": "Vessel MSC Leni is on schedule. Current status: Cleared customs at Port of Savannah. Estimated arrival at Morrisville Hub: Oct 31, 2026, 14:00 EST."
    },
    {
        "topic": "RMA_Defect_Authorization",
        "prompt": "Issue expedited return authorization for 150 failed ThinkPad battery packs (Batch B-88).",
        "actions": ["ServiceNow_CreateRMA", "FedEx_GenerateReturnLabel"],
        "default_outcome": "Resolved",
        "minutes_saved": 30.0,
        "response": "RMA #RMA-2026-88192 created in ServiceNow. Pre-paid FedEx Freight label generated and sent to facility dispatch manager."
    },
    {
        "topic": "Warehouse_Inventory_Check",
        "prompt": "Check safety stock and allocation for Intel Core Ultra 7 processors in Memphis warehouse.",
        "actions": ["SAP_MRP_InventoryLookup"],
        "default_outcome": "Resolved",
        "minutes_saved": 15.0,
        "response": "Memphis Central Warehouse: 4,200 units available. 1,800 reserved for Build-to-Order batch #BTO-4412. Safety stock threshold: NORMAL."
    },
    {
        "topic": "Supplier_Contract_Delay",
        "prompt": "Display supplier panel manufacturer reports 4-week factory shutdown on 4K OLED screens.",
        "actions": ["Escalate_To_Procurement_Lead", "Teams_PostUrgentChannelAlert"],
        "default_outcome": "Escalated",
        "minutes_saved": 5.0,
        "response": "Severe supply bottleneck detected. Automatically escalated to Marcus Vance (Procurement Lead) with impact assessment report attached."
    }
]

EMPLOYEES = [
    {"email": "chen.wei@lenovo.com", "name": "Chen Wei", "role": "Senior Supply Planner"},
    {"email": "sarah.miller@lenovo.com", "name": "Sarah Miller", "role": "Logistics Coordinator"},
    {"email": "marcus.vance@lenovo.com", "name": "Marcus Vance", "role": "Procurement Specialist"},
    {"email": "priya.patel@lenovo.com", "name": "Priya Patel", "role": "Fulfillment Lead"}
]

class SimulateSessionRequest(BaseModel):
    user_email: Optional[str] = "chen.wei@lenovo.com"
    topic_name: Optional[str] = None
    outcome: Optional[str] = "Resolved"  # Resolved, Escalated, Abandoned
    csat_score: Optional[int] = 5
    billed_queries: Optional[int] = 4

@router.get("/dataverse/conversationtranscripts")
def get_dataverse_conversation_transcripts(
    top: Optional[int] = Query(50, alias="$top"),
    select: Optional[str] = Query(None, alias="$select"),
    filter_expr: Optional[str] = Query(None, alias="$filter")
):
    """
    Simulates Microsoft Dataverse OData Web API:
    GET https://<org-env>.api.crm.dynamics.com/api/data/v9.2/conversationtranscripts
    Used by enterprises to harvest raw Copilot Studio conversation transcripts.
    """
    cur_month = datetime.now(timezone.utc).strftime("%Y-%m")
    rows = query_all("""
        SELECT u.id, u.usage_date, u.sessions_count, u.daily_usage_json, e.email, e.display_name
        FROM user_usage u
        JOIN employee e ON e.id = u.employee_id
        JOIN ai_agent a ON a.id = u.agent_id
        WHERE a.name = 'Global Supply Chain & Order Dispatch Bot'
        ORDER BY u.usage_date DESC, u.id DESC
        LIMIT ?
    """, (top or 50,))

    transcripts = []
    for r in rows:
        parsed = {}
        try:
            parsed = json.loads(r["daily_usage_json"])
        except Exception:
            pass

        sessions_cnt = int(parsed.get("session_count", r["sessions_count"]))
        succ = int(parsed.get("sucess", sessions_cnt))
        outcome = "Resolved" if succ >= (sessions_cnt / 2) else "Escalated"
        csat = float(parsed.get("csat", 4.8))

        content_obj = {
            "schemaVersion": "1.0",
            "botId": "bot-lenovo-supply-chain-v2",
            "botName": "Global Supply Chain & Order Dispatch Bot",
            "userPrincipalName": r["email"],
            "displayName": r["display_name"],
            "department": "Global Supply Chain",
            "sessionDate": r["usage_date"],
            "turnsCount": sessions_cnt * 3,
            "billedQueries": int(parsed.get("billed_queries", sessions_cnt * 4)),
            "outcome": outcome,
            "csatScore": csat,
            "topicName": parsed.get("topic", "SAP_Shipment_Tracking"),
            "handlingMinutesSaved": float(parsed.get("handling_minutes_saved", 20.0 * succ)),
            "actionsTriggered": ["SAP_GetShipmentStatus", "FedEx_TrackPackage"] if outcome == "Resolved" else ["Escalate_To_Procurement_Lead"]
        }

        transcripts.append({
            "conversationtranscriptid": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"sc-transcript-{r['id']}")),
            "createdon": f"{r['usage_date']}T09:30:00Z",
            "name": f"Supply Chain Session - {r['display_name']}",
            "schemaversion": "1.0",
            "content": json.dumps(content_obj)
        })

    return {
        "@odata.context": "https://lenovo-prod.crm.dynamics.com/api/data/v9.2/$metadata#conversationtranscripts",
        "@odata.count": len(transcripts),
        "value": transcripts
    }

@router.post("/appinsights/query")
def query_app_insights(payload: Dict[str, Any]):
    """
    Simulates Azure Application Insights REST API (KQL queries):
    POST https://api.applicationinsights.io/v1/apps/{app-id}/query
    """
    rows_data = query_all("""
        SELECT e.display_name, u.usage_date, u.sessions_count, u.daily_usage_json
        FROM user_usage u
        JOIN employee e ON e.id = u.employee_id
        JOIN ai_agent a ON a.id = u.agent_id
        WHERE a.name = 'Global Supply Chain & Order Dispatch Bot'
    """)

    results = []
    for r in rows_data:
        p = {}
        try:
            p = json.loads(r["daily_usage_json"])
        except Exception:
            pass
        results.append([
            f"{r['usage_date']}T10:00:00Z",
            "BotSessionEnded",
            r["display_name"],
            p.get("topic", "SAP_Shipment_Tracking"),
            "Resolved" if int(p.get("sucess", 1)) > 0 else "Escalated",
            float(p.get("csat", 4.8)),
            int(p.get("billed_queries", 4))
        ])

    return {
        "tables": [
            {
                "name": "PrimaryResult",
                "columns": [
                    {"name": "timestamp", "type": "datetime"},
                    {"name": "itemType", "type": "string"},
                    {"name": "userDisplayName", "type": "string"},
                    {"name": "topicName", "type": "string"},
                    {"name": "sessionOutcome", "type": "string"},
                    {"name": "csatScore", "type": "real"},
                    {"name": "billedQueriesConsumed", "type": "int"}
                ],
                "rows": results
            }
        ]
    }

@router.post("/simulate")
def simulate_session(req: SimulateSessionRequest):
    """
    Simulates a live Copilot Studio session for Global Supply Chain Bot.
    Writes real-time session outcome directly to SQLite `user_usage` table.
    """
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Find agent ID
    agent_row = query_one("SELECT id FROM ai_agent WHERE name = 'Global Supply Chain & Order Dispatch Bot'")
    if not agent_row:
        raise HTTPException(status_code=404, detail="Global Supply Chain & Order Dispatch Bot not found in database")
    agent_id = agent_row["id"]

    # Find employee
    emp_row = query_one("SELECT id, display_name FROM employee WHERE email = ?", (req.user_email,))
    if not emp_row:
        emp_row = query_one("SELECT id, display_name FROM employee WHERE email = 'chen.wei@lenovo.com'")
    emp_id = emp_row["id"] if emp_row else 16

    chosen_scenario = SCENARIOS[0]
    if req.topic_name:
        for s in SCENARIOS:
            if s["topic"].lower() == req.topic_name.lower():
                chosen_scenario = s
                break

    is_success = 1 if req.outcome.lower() == "resolved" else 0
    billed_q = req.billed_queries or 4
    minutes_saved = chosen_scenario["minutes_saved"] if is_success else 0.0

    # Check if usage record already exists for today
    existing = query_one("""
        SELECT id, sessions_count, daily_usage_json
        FROM user_usage
        WHERE company_id = 1 AND employee_id = ? AND agent_id = ? AND usage_date = ?
    """, (emp_id, agent_id, today_str))

    if existing:
        current_parsed = {}
        try:
            current_parsed = json.loads(existing["daily_usage_json"])
        except Exception:
            pass

        new_sess = int(current_parsed.get("session_count", existing["sessions_count"])) + 1
        new_succ = int(current_parsed.get("sucess", 0)) + is_success
        new_failed = int(current_parsed.get("failed", 0)) + (0 if is_success else 1)
        new_billed = int(current_parsed.get("billed_queries", 0)) + billed_q
        new_mins = float(current_parsed.get("handling_minutes_saved", 0.0)) + minutes_saved

        updated_json = {
            "agent_id": "copilot-supply-chain",
            "agent_name": "Global Supply Chain & Order Dispatch Bot",
            "user_email": req.user_email,
            "session_count": new_sess,
            "sucess": new_succ,
            "failed": new_failed,
            "csat": req.csat_score or 5.0,
            "topic": chosen_scenario["topic"],
            "date": today_str,
            "handling_minutes_saved": new_mins,
            "billed_queries": new_billed
        }

        execute_write("""
            UPDATE user_usage
            SET sessions_count = ?, daily_usage_json = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (new_sess, json.dumps(updated_json), existing["id"]))
    else:
        new_json = {
            "agent_id": "copilot-supply-chain",
            "agent_name": "Global Supply Chain & Order Dispatch Bot",
            "user_email": req.user_email,
            "session_count": 1,
            "sucess": is_success,
            "failed": 0 if is_success else 1,
            "csat": req.csat_score or 5.0,
            "topic": chosen_scenario["topic"],
            "date": today_str,
            "handling_minutes_saved": minutes_saved,
            "billed_queries": billed_q
        }

        execute_write("""
            INSERT INTO user_usage (company_id, employee_id, agent_id, usage_date, sessions_count, daily_usage_json)
            VALUES (1, ?, ?, ?, 1, ?)
        """, (emp_id, agent_id, today_str, json.dumps(new_json)))

    return {
        "status": "success",
        "message": f"Copilot Studio session simulated for {req.user_email}.",
        "topic": chosen_scenario["topic"],
        "prompt": chosen_scenario["prompt"],
        "bot_response": chosen_scenario["response"],
        "outcome": req.outcome,
        "actions_triggered": chosen_scenario["actions"],
        "billed_queries_consumed": billed_q,
        "handling_minutes_saved": minutes_saved
    }

@router.post("/generate-batch")
def generate_batch_telemetry(batch_size: int = Query(8, ge=1, le=50)):
    """
    Generates a realistic batch of sessions across Lenovo Supply Chain employees.
    Simulates automated daily background events from SAP and logistics webhooks.
    """
    results = []
    for _ in range(batch_size):
        emp = random.choice(EMPLOYEES)
        scen = random.choice(SCENARIOS)
        # 85% chance of resolution, 15% escalation
        outcome = "Resolved" if random.random() < 0.85 else "Escalated"
        csat = 5 if outcome == "Resolved" else random.choice([3, 4])
        res = simulate_session(SimulateSessionRequest(
            user_email=emp["email"],
            topic_name=scen["topic"],
            outcome=outcome,
            csat_score=csat,
            billed_queries=random.choice([3, 4, 5])
        ))
        results.append(res)

    return {
        "status": "success",
        "batch_size": len(results),
        "message": f"Successfully simulated and ingested {len(results)} Copilot Studio sessions.",
        "sessions": results
    }

@router.get("/metrics")
def get_supply_chain_metrics():
    """
    Fetches real-time aggregated metrics for the Copilot Studio Supply Chain agent.
    """
    agent_row = query_one("SELECT id, monthly_infra_cost FROM ai_agent WHERE name = 'Global Supply Chain & Order Dispatch Bot'")
    if not agent_row:
        return {"error": "Agent not found"}

    agent_id = agent_row["id"]
    infra_cost = float(agent_row["monthly_infra_cost"] or 200.0)

    rows = query_all("""
        SELECT u.sessions_count, u.daily_usage_json, e.display_name, e.email
        FROM user_usage u
        JOIN employee e ON e.id = u.employee_id
        WHERE u.agent_id = ?
    """, (agent_id,))

    total_sessions = 0
    total_resolved = 0
    total_escalated = 0
    total_billed_queries = 0
    total_minutes_saved = 0.0
    csat_scores = []
    topic_counts: Dict[str, int] = {}

    for r in rows:
        p = {}
        try:
            p = json.loads(r["daily_usage_json"])
        except Exception:
            pass
        sess = int(p.get("session_count", r["sessions_count"]))
        succ = int(p.get("sucess", 0))
        fail = int(p.get("failed", 0))
        total_sessions += sess
        total_resolved += succ
        total_escalated += fail
        total_billed_queries += int(p.get("billed_queries", sess * 4))
        total_minutes_saved += float(p.get("handling_minutes_saved", succ * 20.0))
        if "csat" in p:
            csat_scores.append(float(p["csat"]))
        top = p.get("topic", "SAP_Shipment_Tracking")
        topic_counts[top] = topic_counts.get(top, 0) + sess

    res_rate = round((total_resolved / total_sessions * 100.0), 1) if total_sessions > 0 else 0.0
    avg_csat = round(sum(csat_scores) / len(csat_scores), 2) if csat_scores else 4.8
    hours_saved = round(total_minutes_saved / 60.0, 1)
    gross_val = round(hours_saved * 45.0, 2)
    net_val = round(gross_val - infra_cost, 2)

    return {
        "agent_name": "Global Supply Chain & Order Dispatch Bot",
        "provider": "Microsoft Copilot Studio",
        "capacity_pack_price_usd": infra_cost,
        "included_pack_messages": 25000,
        "billed_queries_consumed": total_billed_queries,
        "pack_utilization_pct": round((total_billed_queries / 25000.0 * 100.0), 2),
        "total_sessions": total_sessions,
        "resolved_sessions": total_resolved,
        "escalated_sessions": total_escalated,
        "resolution_rate_pct": res_rate,
        "average_csat": avg_csat,
        "hours_saved": hours_saved,
        "gross_value_usd": gross_val,
        "net_value_usd": net_val,
        "roi_ratio": round(gross_val / infra_cost, 2) if infra_cost > 0 else 1.0,
        "topic_breakdown": topic_counts
    }

@router.get("/ui", response_class=HTMLResponse)
def get_interactive_bot_ui():
    """
    Renders an authentic Microsoft Teams & Copilot Studio Enterprise Webchat interface
    simulating how supply chain employees (Chen Wei, Sarah Miller, Marcus Vance, Priya Patel)
    interact with the Global Supply Chain & Order Dispatch Bot in Teams.
    """
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Microsoft Teams - Global Supply Chain & Order Dispatch Bot (Copilot Studio)</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; }
    body { background: #EBEBEB; color: #242424; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
    
    /* Top Teams App Bar */
    .teams-top-bar {
      background: #464775;
      color: #FFFFFF;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 18px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
      flex-shrink: 0;
      z-index: 10;
    }
    .teams-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.2px;
    }
    .teams-logo-badge {
      background: #5B5FC7;
      border-radius: 6px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 14px;
    }
    .employee-switcher-box {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.15);
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 12px;
    }
    .employee-select {
      background: #FFFFFF;
      color: #242424;
      border: none;
      padding: 4px 10px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
      outline: none;
    }

    /* Main Workspace */
    .workspace {
      display: flex;
      flex: 1;
      height: calc(100vh - 48px);
      overflow: hidden;
    }

    /* Sidebar - Copilot Studio & Capacity Pack Telemetry */
    .telemetry-sidebar {
      width: 330px;
      background: #F3F2F1;
      border-right: 1px solid #D2D0CE;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }
    .sidebar-header {
      padding: 16px 18px;
      background: #FFFFFF;
      border-bottom: 1px solid #E1DFDD;
    }
    .copilot-badge {
      background: #E8EBFA;
      color: #5B5FC7;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 12px;
      border: 1px solid #C5CBF3;
    }
    .sidebar-body {
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .kpi-card {
      background: #FFFFFF;
      border: 1px solid #E1DFDD;
      border-radius: 8px;
      padding: 12px 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .kpi-title {
      font-size: 11px;
      font-weight: 700;
      color: #605E5C;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .kpi-val {
      font-size: 20px;
      font-weight: 800;
      color: #5B5FC7;
      margin-top: 3px;
    }
    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: #107C41;
      font-weight: 600;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      background: #107C41;
      border-radius: 50%;
    }

    /* Main Chat Canvas (Teams Style) */
    .chat-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #FFFFFF;
    }
    .chat-header {
      padding: 12px 24px;
      border-bottom: 1px solid #EDEBE9;
      background: #FAFAFA;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .messages-area {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 18px;
      background: #F5F5F7;
    }
    .msg-row {
      display: flex;
      gap: 12px;
      max-width: 85%;
    }
    .msg-row.user {
      align-self: flex-end;
      flex-direction: row-reverse;
    }
    .msg-row.bot {
      align-self: flex-start;
    }
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
      color: #FFFFFF;
      flex-shrink: 0;
    }
    .avatar.bot { background: #5B5FC7; }
    .avatar.user { background: #0078D4; }
    
    .msg-bubble {
      background: #FFFFFF;
      border: 1px solid #E1DFDD;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 13.5px;
      line-height: 1.5;
      color: #242424;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .msg-row.user .msg-bubble {
      background: #E8EBFA;
      border-color: #C5CBF3;
      color: #1F1F1F;
    }

    /* Teams Adaptive Card Styles */
    .adaptive-card {
      background: #FFFFFF;
      border: 1.5px solid #C5CBF3;
      border-radius: 8px;
      padding: 14px 16px;
      margin-top: 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #EDEBE9;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    .card-title {
      font-size: 13.5px;
      font-weight: 800;
      color: #5B5FC7;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .card-badge {
      font-size: 11px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 12px;
    }
    .badge-resolved { background: #DFF6DD; color: #107C41; }
    .badge-escalated { background: #FDE7E9; color: #A80000; }
    
    .card-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 14px;
      font-size: 12px;
      margin-bottom: 12px;
    }
    .card-grid-item-label { color: #605E5C; font-weight: 600; }
    .card-grid-item-val { color: #242424; font-weight: 700; margin-top: 2px; }
    
    .progress-bar-container {
      background: #EDEBE9;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      margin: 8px 0 12px 0;
    }
    .progress-bar-fill {
      background: #107C41;
      height: 100%;
      border-radius: 3px;
    }

    .card-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #EDEBE9;
    }
    .card-btn {
      background: #FAFAFA;
      border: 1px solid #D2D0CE;
      color: #323130;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      transition: 0.15s;
    }
    .card-btn:hover { background: #F3F2F1; border-color: #5B5FC7; color: #5B5FC7; }

    /* Suggested Chips */
    .chips-bar {
      padding: 10px 24px;
      background: #FAFAFA;
      border-top: 1px solid #EDEBE9;
      display: flex;
      align-items: center;
      gap: 8px;
      overflow-x: auto;
    }
    .chip {
      background: #FFFFFF;
      border: 1px solid #D2D0CE;
      color: #5B5FC7;
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: 0.15s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .chip:hover { background: #5B5FC7; color: #FFFFFF; border-color: #5B5FC7; }

    /* Input Footer */
    .input-bar {
      padding: 14px 24px;
      background: #FFFFFF;
      border-top: 1px solid #EDEBE9;
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .input-bar input {
      flex: 1;
      background: #F5F5F7;
      border: 1.5px solid #E1DFDD;
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 13.5px;
      color: #242424;
      outline: none;
      transition: border 0.15s;
    }
    .input-bar input:focus { border-color: #5B5FC7; background: #FFFFFF; }
    
    .btn-send {
      background: #5B5FC7;
      color: #FFFFFF;
      border: none;
      border-radius: 6px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .btn-send:hover { background: #464775; }

    .typing-indicator {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #605E5C;
      font-size: 12px;
      font-style: italic;
    }
  </style>
</head>
<body>

  <!-- Top Teams Bar -->
  <div class="teams-top-bar">
    <div class="teams-brand">
      <div class="teams-logo-badge">T</div>
      <span>Microsoft Teams &bull; Copilot Studio Agent Canvas</span>
    </div>
    <div class="employee-switcher-box">
      <span>Chatting as:</span>
      <select id="userSelector" class="employee-select" onchange="switchEmployee(this.value)">
        <option value="chen.wei@lenovo.com">Chen Wei (Senior Supply Planner)</option>
        <option value="sarah.miller@lenovo.com">Sarah Miller (Logistics Coordinator)</option>
        <option value="marcus.vance@lenovo.com">Marcus Vance (Procurement Specialist)</option>
        <option value="priya.patel@lenovo.com">Priya Patel (Fulfillment Lead)</option>
      </select>
    </div>
  </div>

  <div class="workspace">
    <!-- Left Sidebar: Copilot Studio & Capacity Pack Telemetry -->
    <div class="telemetry-sidebar">
      <div class="sidebar-header">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:13.5px; font-weight:800; color:#242424;">Copilot Studio Telemetry</span>
          <span class="copilot-badge">Power Platform</span>
        </div>
        <div style="margin-top:6px;" class="status-indicator">
          <span class="status-dot"></span>
          <span>Live Dataverse OData Stream</span>
        </div>
      </div>

      <div class="sidebar-body">
        <div class="kpi-card">
          <div class="kpi-title">Capacity Pack Billing (Tenant)</div>
          <div class="kpi-val">$200.00 / mo</div>
          <div style="font-size:11px; color:#605E5C; margin-top:3px;">1 Pack (25,000 Messages included flat)</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-title">Billed Queries Consumed</div>
          <div class="kpi-val" id="billed-queries">52 queries</div>
          <div style="font-size:11px; color:#107C41; margin-top:3px;" id="pack-util">Pack Utilization: 0.21% of 25k</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-title">Resolution Rate (Autonomous)</div>
          <div class="kpi-val" id="res-rate" style="color:#107C41;">92.9%</div>
          <div style="font-size:11px; color:#605E5C; margin-top:3px;">Automated SAP &amp; FedEx resolution</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-title">Labor Capacity Recovered</div>
          <div class="kpi-val" id="hours-saved">84.0 hrs</div>
          <div style="font-size:11px; color:#605E5C; margin-top:3px;">~0.5 FTE supply planner deflection</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-title">Net AI Value Delivered</div>
          <div class="kpi-val" id="net-val" style="color:#107C41;">+$376.49 / mo</div>
          <div style="font-size:11px; color:#605E5C; margin-top:3px;">Labor rate: $45.00/hr ($576.49 gross)</div>
        </div>

        <div style="margin-top:6px;">
          <a href="/api/v1/copilot-studio/dataverse/conversationtranscripts" target="_blank" style="display:block; text-align:center; font-size:12px; color:#5B5FC7; text-decoration:none; font-weight:700; padding:8px; background:#FFFFFF; border:1px solid #D2D0CE; border-radius:6px;">
            Inspect Dataverse OData Transcripts &rarr;
          </a>
        </div>
      </div>
    </div>

    <!-- Main Teams Chat Area -->
    <div class="chat-container">
      <div class="chat-header">
        <div style="display:flex; align-items:center; gap:12px;">
          <div class="avatar bot" style="width:38px; height:38px; font-size:16px;">🤖</div>
          <div>
            <div style="font-size:15px; font-weight:800; color:#242424; display:flex; align-items:center; gap:8px;">
              <span>Global Supply Chain &amp; Order Dispatch Bot</span>
              <span style="font-size:11px; background:#5B5FC7; color:#FFF; padding:2px 7px; border-radius:10px; font-weight:700;">Copilot Studio</span>
            </div>
            <div style="font-size:12px; color:#605E5C; margin-top:2px;">
              Enterprise Agent &bull; Connected to SAP S/4HANA ERP, FedEx Logistics &amp; ServiceNow RMA
            </div>
          </div>
        </div>
      </div>

      <!-- Messages Thread -->
      <div class="messages-area" id="msgs">
        <!-- Bot Greeting -->
        <div class="msg-row bot">
          <div class="avatar bot">🤖</div>
          <div class="msg-bubble">
            <strong>Supply Chain Copilot:</strong> Hello! I am your autonomous Supply Chain &amp; Order Dispatch Assistant.
            I can track international factory shipments in SAP, issue expedited RMA return authorizations, inspect warehouse safety stock, or escalate supply disruptions. How can I assist you today?
          </div>
        </div>
      </div>

      <!-- Suggested Scenarios Bar -->
      <div class="chips-bar">
        <span style="font-size:12px; color:#605E5C; font-weight:600;">Quick Scenarios:</span>
        <button class="chip" onclick="sendPrompt('Track PO-98412: 2,000 ThinkPad X1 Carbon units from Kunshan to Morrisville')">📦 Track Kunshan PO-98412</button>
        <button class="chip" onclick="sendPrompt('Issue expedited return authorization for 150 failed ThinkPad battery packs (Batch B-88)')">⚡ Issue Battery RMA</button>
        <button class="chip" onclick="sendPrompt('Check safety stock and allocation for Intel Core Ultra 7 processors in Memphis warehouse')">🏭 Check Intel Stock</button>
        <button class="chip" onclick="sendPrompt('Display supplier panel manufacturer reports 4-week factory shutdown on 4K OLED screens')">⚠️ Escalate Supplier Delay</button>
      </div>

      <!-- Input Bar -->
      <div class="input-bar">
        <input type="text" id="userInput" placeholder="Ask Copilot about SAP shipment tracking, warehouse inventory, or RMA labels..." onkeydown="if(event.key==='Enter') handleSend()">
        <button class="btn-send" onclick="handleSend()">Send to Agent</button>
      </div>
    </div>
  </div>

  <script>
    let activeEmail = 'chen.wei@lenovo.com';
    let activeName = 'Chen Wei';

    function switchEmployee(email) {
      activeEmail = email;
      const sel = document.getElementById('userSelector');
      activeName = sel.options[sel.selectedIndex].text.split(' (')[0];
      appendSystemNotice(`Switched active Teams user context to ${activeName} (${activeEmail})`);
    }

    function appendSystemNotice(text) {
      const msgs = document.getElementById('msgs');
      const row = document.createElement('div');
      row.style.textAlign = 'center';
      row.style.fontSize = '11.5px';
      row.style.color = '#605E5C';
      row.style.margin = '4px 0';
      row.innerHTML = `<span style="background:#EDEBE9; padding:3px 10px; border-radius:12px;">${text}</span>`;
      msgs.appendChild(row);
      msgs.scrollTop = msgs.scrollHeight;
    }

    async function handleSend() {
      const input = document.getElementById('userInput');
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      await sendPrompt(text);
    }

    async function sendPrompt(text) {
      const msgs = document.getElementById('msgs');

      // 1. Append User Message Bubble
      const userRow = document.createElement('div');
      userRow.className = 'msg-row user';
      userRow.innerHTML = `
        <div class="avatar user">${activeName.split(' ').map(n=>n[0]).join('')}</div>
        <div class="msg-bubble">
          <strong>${activeName}:</strong> ${text}
        </div>
      `;
      msgs.appendChild(userRow);
      msgs.scrollTop = msgs.scrollHeight;

      // 2. Typing indicator
      const typingRow = document.createElement('div');
      typingRow.className = 'msg-row bot';
      typingRow.id = 'typing-indicator';
      typingRow.innerHTML = `
        <div class="avatar bot">🤖</div>
        <div class="msg-bubble typing-indicator">
          <span>Querying SAP S/4HANA & Logistics APIs...</span>
        </div>
      `;
      msgs.appendChild(typingRow);
      msgs.scrollTop = msgs.scrollHeight;

      // Determine topic
      let topic = 'SAP_Shipment_Tracking';
      let outcome = 'Resolved';
      let csat = 5;
      if (text.toLowerCase().includes('battery') || text.toLowerCase().includes('rma')) {
        topic = 'RMA_Defect_Authorization';
      } else if (text.toLowerCase().includes('intel') || text.toLowerCase().includes('stock')) {
        topic = 'Warehouse_Inventory_Check';
      } else if (text.toLowerCase().includes('delay') || text.toLowerCase().includes('shutdown') || text.toLowerCase().includes('oled')) {
        topic = 'Supplier_Contract_Delay';
        outcome = 'Escalated';
        csat = 4;
      }

      try {
        const resp = await fetch('/api/v1/copilot-studio/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_email: activeEmail,
            topic_name: topic,
            outcome: outcome,
            csat_score: csat,
            billed_queries: 4
          })
        });
        const data = await resp.json();

        // Remove typing
        const t = document.getElementById('typing-indicator');
        if (t) t.remove();

        // 3. Render Adaptive Card
        const botRow = document.createElement('div');
        botRow.className = 'msg-row bot';
        
        let cardHtml = '';
        if (topic === 'SAP_Shipment_Tracking') {
          cardHtml = `
            <div class="adaptive-card">
              <div class="card-header">
                <span class="card-title">📦 SAP S/4HANA &bull; Shipment PO-98412</span>
                <span class="card-badge badge-resolved">IN TRANSIT &bull; CUSTOMS CLEARED</span>
              </div>
              <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: 75%;"></div>
              </div>
              <div class="card-grid">
                <div>
                  <div class="card-grid-item-label">Part / Order:</div>
                  <div class="card-grid-item-val">2,000 ThinkPad X1 Carbon Gen 12</div>
                </div>
                <div>
                  <div class="card-grid-item-label">Vessel & Carrier:</div>
                  <div class="card-grid-item-val">MSC Leni (Voyage 881-E)</div>
                </div>
                <div>
                  <div class="card-grid-item-label">Current Milestone:</div>
                  <div class="card-grid-item-val">Cleared Customs (Port of Savannah)</div>
                </div>
                <div>
                  <div class="card-grid-item-label">Est. Destination Arrival:</div>
                  <div class="card-grid-item-val">Oct 31, 2026 &bull; 14:00 EST (Morrisville)</div>
                </div>
              </div>
              <div class="card-actions">
                <button class="card-btn" onclick="alert('Opening SAP S/4HANA Purchase Order #PO-98412...')">🔍 View in SAP S/4HANA</button>
                <button class="card-btn" onclick="alert('Tracking Ocean Vessel MSC Leni via Maritime Satellite GPS...')">🚢 Live Vessel Tracking</button>
                <button class="card-btn" onclick="alert('Notification sent to Morrisville Hub Receiving Dock!')">📬 Notify Warehouse Dock</button>
              </div>
            </div>
          `;
        } else if (topic === 'RMA_Defect_Authorization') {
          cardHtml = `
            <div class="adaptive-card">
              <div class="card-header">
                <span class="card-title">⚡ ServiceNow &bull; RMA #RMA-2026-88192</span>
                <span class="card-badge badge-resolved">EXPEDITED RETURN AUTHORIZED</span>
              </div>
              <div class="card-grid">
                <div>
                  <div class="card-grid-item-label">Defect Scope:</div>
                  <div class="card-grid-item-val">150 Failed Battery Packs (Batch B-88)</div>
                </div>
                <div>
                  <div class="card-grid-item-label">Pre-paid Waybill:</div>
                  <div class="card-grid-item-val">FedEx Freight FX-77491-0021-NC</div>
                </div>
                <div>
                  <div class="card-grid-item-label">Dispatch Destination:</div>
                  <div class="card-grid-item-val">Morrisville Battery Analysis Lab</div>
                </div>
                <div>
                  <div class="card-grid-item-label">Replacement Batch:</div>
                  <div class="card-grid-item-val">Released from Memphis Hub (Batch B-90)</div>
                </div>
              </div>
              <div class="card-actions">
                <button class="card-btn" onclick="alert('Pre-paid FedEx Freight Shipping Label Downloaded!')">🏷️ Print FedEx Label</button>
                <button class="card-btn" onclick="alert('ServiceNow RMA #88192 updated with lab priority.')">📋 ServiceNow Ticket</button>
              </div>
            </div>
          `;
        } else if (topic === 'Warehouse_Inventory_Check') {
          cardHtml = `
            <div class="adaptive-card">
              <div class="card-header">
                <span class="card-title">🏭 SAP MRP &bull; Memphis Central Warehouse</span>
                <span class="card-badge badge-resolved">STOCK LEVEL NORMAL</span>
              </div>
              <div class="card-grid">
                <div>
                  <div class="card-grid-item-label">Component SKU:</div>
                  <div class="card-grid-item-val">Intel Core Ultra 7 155H CPUs</div>
                </div>
                <div>
                  <div class="card-grid-item-label">Available Physical Stock:</div>
                  <div class="card-grid-item-val">4,200 units on-hand</div>
                </div>
                <div>
                  <div class="card-grid-item-label">Allocated to BTO Batch:</div>
                  <div class="card-grid-item-val">1,800 units (#BTO-4412)</div>
                </div>
                <div>
                  <div class="card-grid-item-label">Buffer Available:</div>
                  <div class="card-grid-item-val">2,400 units (Above safety buffer)</div>
                </div>
              </div>
              <div class="card-actions">
                <button class="card-btn" onclick="alert('Reserved 500 units for Assembly Line 3 in SAP.')">📦 Allocate to Production</button>
              </div>
            </div>
          `;
        } else {
          cardHtml = `
            <div class="adaptive-card" style="border-color:#FCA5A5;">
              <div class="card-header">
                <span class="card-title" style="color:#DC2626;">⚠️ Procurement Escalation Notice</span>
                <span class="card-badge badge-escalated">ESCALATED TO PROCUREMENT LEAD</span>
              </div>
              <div style="font-size:12px; color:#374151; margin-bottom:10px;">
                Critical supplier panel manufacturer reports 4-week shutdown on 4K OLED screens. Automated impact assessment generated and routed to <strong>Marcus Vance</strong> (Procurement Lead).
              </div>
              <div class="card-actions">
                <button class="card-btn" onclick="alert('Teams Urgent Notification dispatched to Marcus Vance!')">🚨 View Teams Channel Alert</button>
              </div>
            </div>
          `;
        }

        botRow.innerHTML = `
          <div class="avatar bot">🤖</div>
          <div class="msg-bubble">
            <strong>Supply Chain Copilot:</strong> ${data.bot_response}
            ${cardHtml}
          </div>
        `;
        msgs.appendChild(botRow);
        msgs.scrollTop = msgs.scrollHeight;

        // Refresh live sidebar telemetry
        refreshMetrics();
      } catch (err) {
        console.error(err);
      }
    }

    async function refreshMetrics() {
      try {
        const resp = await fetch('/api/v1/copilot-studio/metrics');
        const m = await resp.json();
        if (m.billed_queries_consumed !== undefined) {
          document.getElementById('billed-queries').innerText = `${m.billed_queries_consumed} queries`;
          document.getElementById('pack-util').innerText = `Pack Utilization: ${m.pack_utilization_pct}% of 25k`;
          document.getElementById('res-rate').innerText = `${m.resolution_rate_pct}%`;
          document.getElementById('hours-saved').innerText = `${m.hours_saved} hrs`;
          document.getElementById('net-val').innerText = `+$${m.net_value_usd.toFixed(2)} / mo`;
        }
      } catch(e) {}
    }

    refreshMetrics();
  </script>
</body>
</html>
"""
    return HTMLResponse(content=html_content, media_type="text/html; charset=utf-8")
