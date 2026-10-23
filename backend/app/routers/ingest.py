import csv
import io
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import PlainTextResponse
from typing import Dict, Any, List
from ..data_store import store

router = APIRouter(prefix="/ingest", tags=["ingestion"])

# Department hourly labor rates (USD)
DEPT_HOURLY_RATES = {
    "finance": 60.0,
    "eng & it": 85.0,
    "engineering": 85.0,
    "it": 80.0,
    "customer": 45.0,
    "customer support": 45.0,
    "sales": 65.0,
    "sales & marketing": 65.0,
    "operations": 55.0,
    "procurement": 55.0,
    "supply chain": 55.0
}

# Task labor time benchmark in hours (e.g. 10 mins = 0.1666 hrs)
DEFAULT_TASK_HOURS_BENCHMARK = 0.1666

# AI Token cost benchmark ($0.15 per million tokens)
TOKEN_RATE_PER_M = 0.15

@router.get("/template", response_class=PlainTextResponse)
def get_sample_csv_template():
    """Returns a ready-to-use CSV template with sample employee usage data."""
    template = """date,agent_name,department,employee_email,tasks_completed,tokens_used
2026-10-21,AP Invoice 3-Way Matcher,Finance,swagath@waferwire.com,15,22500
2026-10-21,Developer Copilot,Eng & IT,dev.lead@wct.com,45,48000
2026-10-21,Case Triage Agent,Customer,support.agent1@wct.com,60,18000
2026-10-21,Supplier Risk Agent,Operations,supply.mgr@wct.com,20,15000
2026-10-21,Account Research Agent,Sales,sales.rep1@wct.com,30,24000
2026-10-22,AP Invoice 3-Way Matcher,Finance,emp2.finance@wct.com,25,37500
2026-10-22,Code Review Agent,Eng & IT,dev.engineer@wct.com,35,42000
"""
    return template

@router.post("/excel")
async def ingest_usage_sheet(file: UploadFile = File(...)):
    """
    Ingest employee agent usage from an uploaded CSV or spreadsheet.
    Dynamically computes labor hours saved, gross value, token costs, net value, and updates the cockpit data.
    """
    if not file.filename.endswith(('.csv', '.txt', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only .csv and .xlsx files are supported")

    content = await file.read()
    
    rows = []
    if file.filename.endswith(('.csv', '.txt')):
        text = content.decode('utf-8', errors='ignore')
        reader = csv.DictReader(text.splitlines())
        for r in reader:
            if not r:
                continue
            clean_row = {
                str(k).strip().lower(): str(v).strip()
                for k, v in r.items()
                if k is not None and v is not None
            }
            if clean_row:
                rows.append(clean_row)
    else:
        # Excel fallback via pandas
        try:
            import pandas as pd
            df = pd.read_excel(io.BytesIO(content))
            df.columns = [str(c).strip().lower() for c in df.columns]
            rows = df.to_dict(orient='records')
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse Excel file: {str(e)}. Please try CSV format.")

    if not rows:
        raise HTTPException(status_code=400, detail="The uploaded file contains no data rows.")

    total_tasks = 0
    total_tokens = 0
    total_hours_saved = 0.0
    total_gross_value = 0.0
    total_cost = 0.0
    updated_agents = set()

    for row in rows:
        agent_name = row.get('agent_name') or row.get('agent') or "AI Agent"
        dept = row.get('department') or row.get('dept') or row.get('team') or "Eng & IT"
        email = row.get('employee_email') or row.get('employee') or row.get('email') or "teammate@wct.com"
        
        try:
            tasks = float(row.get('tasks_completed') or row.get('tasks') or 1)
        except (ValueError, TypeError):
            tasks = 1.0

        try:
            tokens = float(row.get('tokens_used') or row.get('tokens') or 1000)
        except (ValueError, TypeError):
            tokens = 1000.0

        dept_lower = dept.strip().lower()
        hourly_rate = DEPT_HOURLY_RATES.get(dept_lower, 60.0)

        # Mathematical productivity calculation
        hours_saved = tasks * DEFAULT_TASK_HOURS_BENCHMARK
        token_cost = (tokens / 1_000_000.0) * TOKEN_RATE_PER_M
        gross_val = hours_saved * hourly_rate
        net_val = gross_val - token_cost

        total_tasks += int(tasks)
        total_tokens += int(tokens)
        total_hours_saved += hours_saved
        total_gross_value += gross_val
        total_cost += token_cost
        updated_agents.add(agent_name)

        # Update in-memory data store for the latest month (2026-09)
        existing = [a for a in store.raw_agents if a.get("Agent", "").lower() == agent_name.lower() and a.get("Month") == "2026-09"]
        if existing:
            rec = existing[0]
            rec["GrossValueUSD"] = float(rec.get("GrossValueUSD", 0)) + gross_val
            rec["CostUSD"] = float(rec.get("CostUSD", 0)) + token_cost
            rec["NetValueUSD"] = float(rec.get("GrossValueUSD", 0)) - float(rec.get("CostUSD", 0))
            rec["HoursSaved"] = float(rec.get("HoursSaved", 0)) + hours_saved
            rec["EvalRuns"] = int(rec.get("EvalRuns", 0)) + int(tasks)
            rec["EvalPassed"] = int(rec.get("EvalPassed", 0)) + int(tasks)
        else:
            # Map department to function
            func_name = "Finance" if "finance" in dept_lower else "Customer" if "customer" in dept_lower else "Sales" if "sales" in dept_lower else "Operations" if "oper" in dept_lower else "Eng & IT"
            store.raw_agents.append({
                "Month": "2026-09",
                "Agent": agent_name,
                "Team": dept,
                "Function": func_name,
                "InPortfolio": "Yes",
                "GrossValueUSD": gross_val,
                "CostUSD": token_cost,
                "BudgetUSD": token_cost * 1.2,
                "HoursSaved": hours_saved,
                "ActiveUsers": 1,
                "LicensedUsers": 5,
                "EvalRuns": int(tasks),
                "EvalPassed": int(tasks),
                "PolicyIncidents": 0,
                "DaysInProduction": 30,
                "NetValueUSD": net_val
            })

    net_productivity = total_gross_value - total_cost
    roi = (total_gross_value / total_cost) if total_cost > 0 else 0.0

    return {
        "status": "success",
        "message": f"Successfully processed {len(rows)} employee usage rows across {len(updated_agents)} agents.",
        "summary": {
            "rows_processed": len(rows),
            "agents_updated": list(updated_agents),
            "total_tasks_completed": total_tasks,
            "total_tokens_consumed": total_tokens,
            "hours_saved": round(total_hours_saved, 1),
            "gross_value_usd": round(total_gross_value, 2),
            "cost_usd": round(total_cost, 4),
            "net_value_usd": round(net_productivity, 2),
            "roi_ratio": round(roi, 1)
        }
    }
