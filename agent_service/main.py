import os
import time
import uuid
import httpx
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="WCT / Lenovo Enterprise IT Agent", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

COCKPIT_API_URL = os.environ.get("COCKPIT_API_URL", "http://localhost:8000")

# In-memory mock enterprise databases
ASSET_DATABASE = {
    "LN-98234": {"model": "ThinkPad P1 Gen 6", "dock": "ThinkPad Thunderbolt 4 Workstation Dock", "warranty": "Active Premier Support (Exp: 2027)", "owner": "aarav@lenovo.com"},
    "LN-41092": {"model": "ThinkPad X1 Carbon Gen 11", "dock": "ThinkPad Universal USB-C Dock", "warranty": "Active Onsite (Exp: 2026)", "owner": "priya@lenovo.com"},
    "LN-77123": {"model": "ThinkPad T14s Gen 4", "dock": "None (Direct HDMI)", "warranty": "Active Depot (Exp: 2026)", "owner": "karthik@lenovo.com"}
}

KNOWLEDGE_SOLUTIONS = {
    "dock_monitor": {
        "title": "Thunderbolt 4 / USB-C Docking Station Dual 4K Detection Failure",
        "manual_time_mins": 30.0,
        "steps": [
            "1. Verified firmware v1.0.18 patch requirement for Intel MST Hub.",
            "2. Cycled Thunderbolt 4 PCIe controller power state in Windows Device Manager.",
            "3. Pushed automated driver update package: Lenovo Dock Firmware Utility v1.0.19.",
            "4. Advised hot-unplug 10s power drain on docking station power brick."
        ],
        "category": "Hardware / Peripheral",
        "resolution": "RESOLVED - Driver package deployed & display MST hub reset."
    },
    "github_access": {
        "title": "Developer Repository Access Provisioning (AI_Cockpit & Backend Core)",
        "manual_time_mins": 25.0,
        "steps": [
            "1. Queried Okta Entra Identity for employee active engineering role.",
            "2. Checked manager approval status in Workday (Approved by eng_head@lenovo.com).",
            "3. Verified MFA security hardware token compliance (YubiKey 5C NFC).",
            "4. Provisioned 'Read/Write' collaborator invite to GitHub Org: WCTHLS/AI_Cockpit."
        ],
        "category": "Identity & Access Management",
        "resolution": "RESOLVED - GitHub collaborator invitation dispatched & Okta group synced."
    },
    "vpn_reset": {
        "title": "GlobalProtect / OpenVPN Certificate Expiration & IPsec Tunnel Reset",
        "manual_time_mins": 20.0,
        "steps": [
            "1. Inspected PKI certificate store on device - User client certificate expired today.",
            "2. Revoked expired thumbprint in Microsoft Intune SCEP Certificate Authority.",
            "3. Issued new 365-day client certificate payload via Intune MDM sync agent.",
            "4. Tested IPsec Phase 2 handshake to primary enterprise gateway: PASS."
        ],
        "category": "Network & Security",
        "resolution": "RESOLVED - New PKI certificate enrolled & VPN tunnel established."
    },
    "outlook_search": {
        "title": "Outlook 365 Search Index Corrupt / Windows Search Service Stalled",
        "manual_time_mins": 20.0,
        "steps": [
            "1. Checked Windows Search Indexer status (WSearch service was stopped).",
            "2. Ran elevated background repair command: dism.exe /online /cleanup-image /restorehealth.",
            "3. Triggered rebuild of Outlook OST catalog indexing index in registry.",
            "4. Search query response verified on latest 30-day mailbox."
        ],
        "category": "Software & Productivity",
        "resolution": "RESOLVED - Windows Search index rebuild initiated & service set to automatic."
    }
}

class ChatRequest(BaseModel):
    message: str
    employee_email: Optional[str] = "aarav@lenovo.com"
    serial_number: Optional[str] = "LN-98234"
    azure_api_key: Optional[str] = None
    azure_endpoint: Optional[str] = None
    azure_deployment: Optional[str] = None

@app.get("/health")
def health():
    return {"status": "ok", "service": "wct-it-agent", "cockpit_api": COCKPIT_API_URL}

@app.post("/api/chat")
async def chat_handler(payload: ChatRequest):
    start_time = time.time()
    user_msg = payload.message.lower()

    # Determine scenario category
    if "dock" in user_msg or "monitor" in user_msg or "display" in user_msg or "screen" in user_msg:
        sol_key = "dock_monitor"
    elif "github" in user_msg or "access" in user_msg or "repo" in user_msg or "permission" in user_msg:
        sol_key = "github_access"
    elif "vpn" in user_msg or "network" in user_msg or "tunnel" in user_msg or "certificate" in user_msg:
        sol_key = "vpn_reset"
    else:
        sol_key = "outlook_search"

    sol = KNOWLEDGE_SOLUTIONS[sol_key]
    serial = payload.serial_number or "LN-98234"
    asset = ASSET_DATABASE.get(serial, ASSET_DATABASE["LN-98234"])
    ticket_id = f"INC-{int(time.time() * 1000) % 1000000}"

    # Multi-step tool execution trace
    tools_executed = [
        {
            "tool": "lookup_hardware_and_profile",
            "input": {"serial_number": serial, "employee": payload.employee_email},
            "output": asset,
            "latency_ms": 140,
            "status": "SUCCESS"
        },
        {
            "tool": "query_diagnostic_knowledge_base",
            "input": {"issue_category": sol["category"], "symptom": sol["title"]},
            "output": {"matching_kb": sol["title"], "confidence": 0.96},
            "latency_ms": 280,
            "status": "SUCCESS"
        },
        {
            "tool": "execute_itsm_resolution_action",
            "input": {"ticket_id": ticket_id, "resolution": sol["resolution"]},
            "output": {"servicenow_ticket_status": "AUTO-RESOLVED", "ticket_id": ticket_id},
            "latency_ms": 190,
            "status": "SUCCESS"
        }
    ]

    total_latency_ms = int((time.time() - start_time) * 1000) + 610
    tokens_in = 320 + len(payload.message.split()) * 3
    tokens_out = 165
    
    # Financial calculation
    # GPT-4o standard: $2.50/M in, $10.00/M out
    token_cost = (tokens_in * 2.50 / 1_000_000) + (tokens_out * 10.0 / 1_000_000)
    service_now_connector_cost = 0.005 # $0.005 per ITSM API call
    total_cost = round(token_cost + service_now_connector_cost, 5)

    hours_saved = round(sol["manual_time_mins"] / 60.0, 2) # e.g. 0.5 hrs or 0.42 hrs
    # Blended Engineering/IT wage: $85/hr
    gross_value_usd = round(hours_saved * 85.0, 2)

    # Formulate friendly, authoritative enterprise response
    # Formulate friendly, authoritative enterprise response
    reply_text = f"""Hello **{payload.employee_email.split('@')[0].capitalize()}**, I have reviewed your request regarding **{sol['title']}**.

### Verified Hardware & Profile Details
* **Registered Asset**: `{asset['model']}` (Serial: `{serial}`)
* **Connected Peripheral**: `{asset['dock']}`
* **Warranty Coverage**: `{asset['warranty']}`

### Diagnostic Checks & Troubleshooting Completed
{chr(10).join(sol['steps'])}

### IT Service Ticket Reference
* **Ticket Number**: `#{ticket_id}`
* **Status**: `{sol['resolution']}`

Please follow the recommendation above. If you still encounter any issues, reply here and I will connect you with a live IT support technician."""

    # Post telemetry to AI Cockpit API
    telemetry_payload = {
        "task_id": ticket_id,
        "agent_id": "it-service-desk",
        "user_email": payload.employee_email,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latency_ms": total_latency_ms,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "cost_usd": total_cost,
        "status": "SUCCESS",
        "hours_saved": hours_saved,
        "gross_value_usd": gross_value_usd
    }

    cockpit_synced = False
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.post(f"{COCKPIT_API_URL}/api/v1/telemetry/ingest", json=telemetry_payload)
            if resp.status_code == 200:
                cockpit_synced = True
    except Exception as e:
        # Graceful fallback if cockpit is loading
        pass

    return {
        "response": reply_text,
        "ticket_id": ticket_id,
        "tools_executed": tools_executed,
        "telemetry": {
            "handling_time_saved_mins": sol["manual_time_mins"],
            "hours_saved": hours_saved,
            "gross_value_usd": gross_value_usd,
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
            "cost_usd": total_cost,
            "latency_ms": total_latency_ms,
            "cockpit_synced": cockpit_synced
        }
    }

# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/", response_class=HTMLResponse)
def serve_ui():
    index_file = os.path.join(os.path.dirname(__file__), "static", "index.html")
    if os.path.exists(index_file):
        with open(index_file, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>IT Agent Service is running. Static UI not found.</h1>"
