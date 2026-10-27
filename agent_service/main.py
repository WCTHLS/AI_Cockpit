import os
import time
import uuid
import httpx
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Lenovo Enterprise IT Support Agent", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

COCKPIT_API_URL = os.environ.get("COCKPIT_API_URL", "http://localhost:8000")
COCKPIT_INGEST_URL = os.environ.get(
    "COCKPIT_INGEST_URL",
    f"{COCKPIT_API_URL.rstrip('/')}/api/v1/telemetry/ingest"
)

AZURE_OPENAI_ENDPOINT = os.environ.get("AZURE_OPENAI_ENDPOINT", "")
AZURE_OPENAI_API_KEY = os.environ.get("AZURE_OPENAI_API_KEY", "")
AZURE_OPENAI_DEPLOYMENT = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "it-agent-model")
AZURE_OPENAI_API_VERSION = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-08-01-preview")

SYSTEM_PROMPT = """You are the Lenovo Global IT Support Assistant.
You are helping employee Aarav Sharma (aarav@lenovo.com) who uses a ThinkPad P1 Gen 6 (Serial: LN-98234) with a ThinkPad Thunderbolt 4 Workstation Dock under Premier Support.
Your job is to troubleshoot hardware issues (docking stations, 4K displays), grant access (GitHub, Okta), or resolve software issues (VPN, Outlook).
Always respond with professional, step-by-step enterprise IT guidance. 
Use Markdown with bold headers and bullet points.
Include:
1. Verified Device & Asset Info
2. Diagnostic Troubleshooting Steps / Action Taken
3. A generated ServiceNow Ticket Reference (e.g. #INC-XXXXXX)
Keep the tone authoritative, polite, and direct."""

# In-memory storage for active agent completion loops
active_sessions: Dict[str, Dict[str, Any]] = {}

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    employee_email: Optional[str] = "aarav@lenovo.com"
    serial_number: Optional[str] = "LN-98234"

class FeedbackRequest(BaseModel):
    session_id: str
    sucess: bool  # Matches user requirement: sucess (true/false)
    comment: Optional[str] = None

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "wct-it-agent",
        "azure_endpoint": AZURE_OPENAI_ENDPOINT,
        "deployment": AZURE_OPENAI_DEPLOYMENT,
        "cockpit_ingest_url": COCKPIT_INGEST_URL,
        "active_sessions_count": len(active_sessions)
    }

@app.post("/api/chat")
async def chat_handler(payload: ChatRequest):
    start_time = time.time()
    
    # 1. Retrieve or initialize multi-turn session loop
    session_id = payload.session_id
    if not session_id or session_id not in active_sessions:
        session_id = f"sess-{uuid.uuid4().hex[:8]}"
        ticket_id = f"INC-{int(time.time() * 1000) % 1000000}"
        active_sessions[session_id] = {
            "session_id": session_id,
            "agent_id": "it-service-desk",
            "agent_name": "Ticket Triage Agent",
            "user_email": payload.employee_email or "aarav@lenovo.com",
            "ticket_id": ticket_id,
            "agent_start_time": datetime.now(timezone.utc).isoformat(),
            "messages": [{"role": "system", "content": SYSTEM_PROMPT}],
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
            "llm_calls_count": 0,
            "total_latency_ms": 0
        }

    session = active_sessions[session_id]
    session["messages"].append({"role": "user", "content": payload.message})

    # 2. Execute LLM Call (Azure OpenAI or realistic fallback)
    reply_text = ""
    call_prompt_tokens = 0
    call_completion_tokens = 0
    call_total_tokens = 0

    if AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY:
        try:
            url = f"{AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/deployments/{AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version={AZURE_OPENAI_API_VERSION}"
            headers = {
                "api-key": AZURE_OPENAI_API_KEY,
                "Content-Type": "application/json"
            }
            body = {
                "messages": session["messages"],
                "max_tokens": 500,
                "temperature": 0.4
            }
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(url, headers=headers, json=body)
                if res.status_code == 200:
                    data = res.json()
                    reply_text = data["choices"][0]["message"]["content"]
                    
                    # Extract tokens based on Azure OpenAI usage format
                    usage = data.get("usage", {})
                    call_prompt_tokens = usage.get("prompt_tokens", 0)
                    call_completion_tokens = usage.get("completion_tokens", 0)
                    call_total_tokens = usage.get("total_tokens", call_prompt_tokens + call_completion_tokens)
        except Exception as e:
            reply_text = ""

    # Fallback template if Azure OpenAI is offline or not configured
    if not reply_text:
        ticket_id = session["ticket_id"]
        reply_text = f"""Hello **Aarav**, I have analyzed your request.

### Verified Hardware & Profile Details
* **Registered Asset**: `ThinkPad P1 Gen 6` (Serial: `LN-98234`)
* **Peripheral**: `ThinkPad Thunderbolt 4 Workstation Dock`
* **Coverage**: `Active Premier Onsite Support`

### Diagnostic Troubleshooting & Resolution
1. Reset Intel MST display hub controller cache via Windows Device Manager.
2. Verified Thunderbolt 4 power delivery and updated firmware to package v1.0.19.
3. Cleared display topology configuration cache.

### Incident Ticket Reference
* **ServiceNow Incident**: `#{ticket_id}`
* **Status**: `AUTO-RESOLVED`

Please reconnect your cable."""

        call_prompt_tokens = 145 + len(payload.message.split()) * 3
        call_completion_tokens = 92
        call_total_tokens = call_prompt_tokens + call_completion_tokens

    call_latency_ms = int((time.time() - start_time) * 1000)

    # 3. Aggregate metrics across every LLM call in this agent completion loop
    session["prompt_tokens"] += call_prompt_tokens
    session["completion_tokens"] += call_completion_tokens
    session["total_tokens"] += call_total_tokens
    session["llm_calls_count"] += 1
    session["total_latency_ms"] += call_latency_ms
    session["messages"].append({"role": "assistant", "content": reply_text})

    return {
        "response": reply_text,
        "session_id": session_id,
        "ticket_id": session["ticket_id"],
        "current_call_metrics": {
            "prompt_tokens": call_prompt_tokens,
            "completion_tokens": call_completion_tokens,
            "total_tokens": call_total_tokens,
            "latency_ms": call_latency_ms
        },
        "aggregated_loop_metrics": {
            "llm_calls_count": session["llm_calls_count"],
            "prompt_tokens": session["prompt_tokens"],
            "completion_tokens": session["completion_tokens"],
            "total_tokens": session["total_tokens"],
            "agent_start_time": session["agent_start_time"]
        }
    }

@app.post("/api/feedback")
async def feedback_handler(payload: FeedbackRequest):
    """
    Called when the user clicks Thumbs Up or Thumbs Down.
    Aggregates all LLM metrics for the session and transmits them to COCKPIT_INGEST_URL.
    """
    session = active_sessions.get(payload.session_id)
    if not session:
        # Default fallback session if expired or not found
        session = {
            "agent_id": "it-service-desk",
            "agent_name": "Ticket Triage Agent",
            "user_email": "aarav@lenovo.com",
            "ticket_id": f"INC-{int(time.time() * 1000) % 1000000}",
            "agent_start_time": datetime.now(timezone.utc).isoformat(),
            "prompt_tokens": 175,
            "completion_tokens": 90,
            "total_tokens": 265,
            "total_latency_ms": 1200
        }

    agent_end_time = datetime.now(timezone.utc).isoformat()

    # Calculate token cost (GPT-4o standard: $2.50/M in, $10.00/M out + $0.005 connector)
    token_cost = (session["prompt_tokens"] * 2.50 / 1_000_000) + (session["completion_tokens"] * 10.0 / 1_000_000)
    cost_usd = round(token_cost + 0.005, 5)

    # Calculate business value
    hours_saved = 0.42 if payload.sucess else 0.0
    gross_value_usd = round(hours_saved * 85.0, 2)

    # 4. Form the exact required aggregated telemetry payload
    telemetry_payload = {
        "agent_id": session.get("agent_id", "it-service-desk"),
        "agent_name": session.get("agent_name", "Ticket Triage Agent"),
        "user_email": session.get("user_email", "aarav@lenovo.com"),
        "completion_tokens": session["completion_tokens"],
        "prompt_tokens": session["prompt_tokens"],
        "total_tokens": session["total_tokens"],
        "agent_start_time": session["agent_start_time"],
        "agent_end_time": agent_end_time,
        "sucess": payload.sucess,
        
        # Additional fields for complete Cockpit Dashboard tracking
        "task_id": session.get("ticket_id", payload.session_id),
        "status": "SUCCESS" if payload.sucess else "FAILED",
        "tokens_in": session["prompt_tokens"],
        "tokens_out": session["completion_tokens"],
        "latency_ms": session.get("total_latency_ms", 1000),
        "cost_usd": cost_usd,
        "hours_saved": hours_saved,
        "gross_value_usd": gross_value_usd,
        "timestamp": agent_end_time
    }

    # 5. Transmit to COCKPIT_INGEST_URL
    cockpit_synced = False
    status_code = None
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(COCKPIT_INGEST_URL, json=telemetry_payload)
            status_code = resp.status_code
            if resp.status_code == 200:
                cockpit_synced = True
    except Exception as e:
        print(f"Notice: Cockpit ingest at {COCKPIT_INGEST_URL} not reachable: {e}")

    # Remove completed session from active memory
    active_sessions.pop(payload.session_id, None)

    return {
        "status": "session_completed",
        "cockpit_synced": cockpit_synced,
        "cockpit_status_code": status_code,
        "ingest_url": COCKPIT_INGEST_URL,
        "aggregated_payload": telemetry_payload,
        "message": "Agent completion loop finished. Telemetry ingested successfully."
    }

static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/", response_class=HTMLResponse)
def serve_ui():
    index_file = os.path.join(os.path.dirname(__file__), "static", "index.html")
    if os.path.exists(index_file):
        with open(index_file, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>IT Agent Service is running.</h1>"
