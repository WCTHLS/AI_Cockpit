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
    Renders an authentic, embedded Teams/Copilot Studio Webchat interface
    for live demonstration and testing of the Supply Chain Agent.
    """
    return """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Lenovo Global Supply Chain & Order Dispatch Agent (Copilot Studio)</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    body { background: #0E1117; color: #E2E8F0; display: flex; height: 100vh; overflow: hidden; }
    .sidebar { width: 340px; background: #161B22; border-right: 1px solid #30363D; display: flex; flex-direction: column; }
    .sidebar-header { padding: 20px; border-bottom: 1px solid #30363D; }
    .badge { background: #238636; color: #FFF; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 12px; }
    .status-dot { width: 8px; height: 8px; background: #3FB950; border-radius: 50%; display: inline-block; margin-right: 6px; }
    .metrics-panel { padding: 18px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
    .kpi-card { background: #21262D; border: 1px solid #30363D; border-radius: 8px; padding: 12px 14px; }
    .kpi-title { font-size: 11px; color: #8B949E; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
    .kpi-val { font-size: 20px; font-weight: 800; color: #58A6FF; margin-top: 4px; }
    .chat-area { flex: 1; display: flex; flex-direction: column; background: #0D1117; }
    .chat-header { padding: 16px 24px; border-bottom: 1px solid #30363D; background: #161B22; display: flex; justify-content: space-between; align-items: center; }
    .messages { flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
    .msg { max-width: 80%; padding: 12px 16px; border-radius: 10px; font-size: 13.5px; line-height: 1.5; }
    .msg.user { align-self: flex-end; background: #1F6FEB; color: #FFF; border-bottom-right-radius: 2px; }
    .msg.bot { align-self: flex-start; background: #21262D; border: 1px solid #30363D; color: #E6EDF3; border-bottom-left-radius: 2px; }
    .input-bar { padding: 16px 24px; border-top: 1px solid #30363D; background: #161B22; display: flex; gap: 10px; }
    .input-bar input { flex: 1; background: #0D1117; border: 1px solid #30363D; border-radius: 6px; padding: 10px 14px; color: #FFF; font-size: 13.5px; outline: none; }
    .btn { background: #238636; color: #FFF; border: none; border-radius: 6px; padding: 10px 18px; font-size: 13px; font-weight: 700; cursor: pointer; }
    .btn:hover { background: #2EA043; }
    .btn-secondary { background: #30363D; color: #C9D1D9; }
    .btn-secondary:hover { background: #3C444D; }
    .scenario-pill { background: #21262D; border: 1px solid #30363D; color: #58A6FF; font-size: 11.5px; padding: 6px 12px; border-radius: 16px; cursor: pointer; transition: 0.2s; }
    .scenario-pill:hover { background: #1F6FEB; color: #FFF; }
  </style>
</head>
<body>
  <div class="sidebar">
    <div class="sidebar-header">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:14px; font-weight:800; color:#FFF;">Copilot Studio Telemetry</span>
        <span class="badge">Power Platform</span>
      </div>
      <div style="font-size:12px; color:#8B949E; margin-top:6px; display:flex; align-items:center;">
        <span class="status-dot"></span> Live Dataverse OData Stream
      </div>
    </div>

    <div class="metrics-panel">
      <div class="kpi-card">
        <div class="kpi-title">Capacity Pack FinOps</div>
        <div class="kpi-val">$200.00 / mo</div>
        <div style="font-size:11px; color:#8B949E; margin-top:4px;">1 Pack (25,000 Messages included)</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">Live Resolution Rate</div>
        <div class="kpi-val" id="res-rate">92.9%</div>
        <div style="font-size:11px; color:#3FB950; margin-top:4px;">Deflecting tier-1 supply chain traces</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">Labor Hours Saved</div>
        <div class="kpi-val" id="hours-saved">4.3 hrs</div>
        <div style="font-size:11px; color:#8B949E; margin-top:4px;">Baseline: 20 mins per SAP order lookup</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">Net Value Delivered</div>
        <div class="kpi-val" id="net-val" style="color:#3FB950;">+$193.50</div>
        <div style="font-size:11px; color:#8B949E; margin-top:4px;">Loaded labor rate: $45.00/hr</div>
      </div>

      <div style="margin-top:10px;">
        <button class="btn btn-secondary" style="width:100%; padding:10px;" onclick="simulateBatch()">
          ? Simulate 8 Live SAP Webhook Sessions
        </button>
      </div>
    </div>
  </div>

  <div class="chat-area">
    <div class="chat-header">
      <div>
        <div style="font-size:15px; font-weight:800; color:#FFF; display:flex; align-items:center; gap:8px;">
          <span>?? Global Supply Chain &amp; Order Dispatch Bot</span>
          <span style="font-size:11px; background:#1F6FEB; color:#FFF; padding:2px 7px; border-radius:10px;">Copilot Studio</span>
        </div>
        <div style="font-size:12px; color:#8B949E; margin-top:3px;">
          Connected to Lenovo SAP S/4HANA &amp; FedEx Freight Logistics APIs
        </div>
      </div>
      <div>
        <a href="/api/v1/copilot-studio/dataverse/conversationtranscripts" target="_blank" style="font-size:12px; color:#58A6FF; text-decoration:none; margin-right:12px;">
          ?? View Dataverse OData
        </a>
      </div>
    </div>

    <div class="messages" id="msgs">
      <div class="msg bot">
        <strong>Supply Chain Copilot:</strong> Hello! I am the Lenovo Global Supply Chain &amp; Logistics Assistant. I can track international factory shipments, issue RMA return labels, check component warehouse stock, or escalate supply disruptions. How can I help you today?
      </div>
    </div>

    <div style="padding:10px 24px; display:flex; gap:8px; flex-wrap:wrap; background:#161B22; border-top:1px solid #30363D;">
      <span style="font-size:12px; color:#8B949E; line-height:28px;">Quick Scenarios:</span>
      <button class="scenario-pill" onclick="sendPrompt('Track PO-98412: 2,000 ThinkPad X1 Carbon units from Kunshan to Morrisville')">?? Track Kunshan PO</button>
      <button class="scenario-pill" onclick="sendPrompt('Issue expedited return authorization for 150 failed ThinkPad battery packs (Batch B-88)')">?? Issue Battery RMA</button>
      <button class="scenario-pill" onclick="sendPrompt('Check safety stock and allocation for Intel Core Ultra 7 processors in Memphis warehouse')">?? Check Intel Stock</button>
      <button class="scenario-pill" onclick="sendPrompt('Display supplier panel manufacturer reports 4-week factory shutdown on 4K OLED screens')">?? Supplier Delay</button>
    </div>

    <div class="input-bar">
      <input type="text" id="userInput" placeholder="Ask about shipment status, RMA numbers, or factory lead times..." onkeydown="if(event.key==='Enter') handleSend()">
      <button class="btn" onclick="handleSend()">Send to Agent</button>
    </div>
  </div>

  <script>
    async function refreshMetrics() {
      try {
        const res = await fetch('/api/v1/copilot-studio/metrics');
        const data = await res.json();
        if (data.resolution_rate_pct !== undefined) {
          document.getElementById('res-rate').innerText = data.resolution_rate_pct + '%';
          document.getElementById('hours-saved').innerText = data.hours_saved + ' hrs';
          document.getElementById('net-val').innerText = (data.net_value_usd >= 0 ? '+$' : '-$') + Math.abs(data.net_value_usd).toFixed(2);
        }
      } catch (e) {
        console.error(e);
      }
    }

    async function sendPrompt(text) {
      document.getElementById('userInput').value = text;
      handleSend();
    }

    async function handleSend() {
      const input = document.getElementById('userInput');
      const text = input.value.trim();
      if (!text) return;

      const msgs = document.getElementById('msgs');
      msgs.innerHTML += `<div class="msg user"><strong>You (Chen Wei):</strong> ${text}</div>`;
      input.value = '';
      msgs.scrollTop = msgs.scrollHeight;

      try {
        const res = await fetch('/api/v1/copilot-studio/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_email: 'chen.wei@lenovo.com', topic_name: null, outcome: text.includes('Delay') ? 'Escalated' : 'Resolved' })
        });
        const data = await res.json();

        msgs.innerHTML += `
          <div class="msg bot">
            <strong>Supply Chain Copilot:</strong> ${data.bot_response}
            <div style="font-size:11px; color:#58A6FF; margin-top:6px; border-top:1px solid #30363D; padding-top:4px;">
              ? Connectors: [${data.actions_triggered.join(', ')}] | Outcome: <strong>${data.outcome}</strong> | Time Saved: ${data.handling_minutes_saved} mins
            </div>
          </div>
        `;
        msgs.scrollTop = msgs.scrollHeight;
        refreshMetrics();
      } catch (err) {
        msgs.innerHTML += `<div class="msg bot" style="color:#F85149;">Error communicating with agent service.</div>`;
      }
    }

    async function simulateBatch() {
      try {
        const btn = event.target;
        btn.innerText = 'Simulating...';
        const res = await fetch('/api/v1/copilot-studio/generate-batch?batch_size=8', { method: 'POST' });
        const data = await res.json();
        alert('Simulated ' + data.batch_size + ' autonomous Copilot Studio sessions across SAP webhooks!');
        btn.innerText = '? Simulate 8 Live SAP Webhook Sessions';
        refreshMetrics();
      } catch (e) {
        alert('Simulation error: ' + e);
      }
    }

    refreshMetrics();
  </script>
</body>
</html>
"""
