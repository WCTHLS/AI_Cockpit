import csv
import io
import datetime
from fastapi import APIRouter, Query, HTTPException, Depends, UploadFile, File
from typing import Optional, List, Dict, Any
from ..schemas import SeatInventorySummary
from ..database import get_db, query_all
from ..auth import get_current_user

router = APIRouter(prefix="/seats", tags=["seats"])

def _init_m365_table():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS m365_copilot_seats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_principal_name TEXT UNIQUE,
                display_name TEXT,
                department TEXT,
                assigned_license TEXT DEFAULT 'Microsoft 365 Copilot',
                last_activity_date TEXT,
                inactive_days INTEGER DEFAULT 0,
                status TEXT DEFAULT 'ACTIVE',
                chat_activity_count INTEGER DEFAULT 0,
                updated_at TEXT
            )
        """)
        # Ensure zero mock/dummy records exist
        conn.execute("DELETE FROM m365_copilot_seats WHERE user_principal_name LIKE '%@wct.com'")

@router.get("", response_model=SeatInventorySummary)
def get_seats_summary(
    function: Optional[str] = Query(None),
    cost_per_seat: Optional[float] = Query(30.0),
    user: Dict[str, Any] = Depends(get_current_user)
):
    _init_m365_table()
    effective_function = function
    if user.get("role") == "function_head" and user.get("function_name"):
        effective_function = user["function_name"]

    # 1. Fetch Developer Seats (Antigravity IDE) - purely real data
    dev_seats = query_all("SELECT * FROM developer_seats WHERE developer_id NOT LIKE '%waferwire.com%'")
    
    # 2. Fetch M365 Copilot Seats (Balaji's stream - only populated when CSV/API is ingested)
    m365_query = "SELECT * FROM m365_copilot_seats"
    if effective_function and effective_function != "All Functions":
        m365_query += f" WHERE department LIKE '%{effective_function}%'"
    m365_seats = query_all(m365_query)

    total_seats = 0
    active_7d = 0
    lapsing_7_29d = 0
    idle_30d = 0

    tool_counts: Dict[str, Dict[str, int]] = {
        "Antigravity IDE": {"tool": "Antigravity IDE", "total": 0, "active": 0, "idle": 0},
        "Microsoft 365 Copilot": {"tool": "Microsoft 365 Copilot", "total": 0, "active": 0, "idle": 0}
    }
    func_counts: Dict[str, Dict[str, int]] = {}

    # Ingest Antigravity Developer Seats
    for ds in dev_seats:
        dept = ds.get("department") or "Eng & IT"
        if effective_function and effective_function != "All Functions" and effective_function not in dept:
            continue
        total_seats += 1
        active_7d += 1
        tool_counts["Antigravity IDE"]["total"] += 1
        tool_counts["Antigravity IDE"]["active"] += 1

        if dept not in func_counts:
            func_counts[dept] = {"function": dept, "total": 0, "active": 0, "idle": 0}
        func_counts[dept]["total"] += 1
        func_counts[dept]["active"] += 1

    # Ingest M365 Copilot Seats (if Balaji has imported any)
    for ms in m365_seats:
        dept = ms.get("department") or "General"
        inact = ms.get("inactive_days") or 0
        total_seats += 1
        tool_counts["Microsoft 365 Copilot"]["total"] += 1

        if inact <= 6:
            active_7d += 1
            tool_counts["Microsoft 365 Copilot"]["active"] += 1
        elif inact <= 29:
            lapsing_7_29d += 1
        else:
            idle_30d += 1
            tool_counts["Microsoft 365 Copilot"]["idle"] += 1

        if dept not in func_counts:
            func_counts[dept] = {"function": dept, "total": 0, "active": 0, "idle": 0}
        func_counts[dept]["total"] += 1
        if inact <= 6:
            func_counts[dept]["active"] += 1
        elif inact >= 30:
            func_counts[dept]["idle"] += 1

    active_pct = round((active_7d / total_seats * 100.0) if total_seats > 0 else 0.0, 1)
    lapsing_pct = round((lapsing_7_29d / total_seats * 100.0) if total_seats > 0 else 0.0, 1)
    idle_pct = round((idle_30d / total_seats * 100.0) if total_seats > 0 else 0.0, 1)
    reclaim_usd = round(idle_30d * (cost_per_seat or 30.0), 2)

    return {
        "month": "2026-09",
        "total_licensed_seats": total_seats,
        "active_seats_7d": active_7d,
        "active_pct": active_pct,
        "lapsing_seats_7_29d": lapsing_7_29d,
        "lapsing_pct": lapsing_pct,
        "idle_seats_30d": idle_30d,
        "idle_pct": idle_pct,
        "estimated_reclaimable_usd": reclaim_usd,
        "cost_per_seat_default": cost_per_seat or 30.0,
        "by_tool": list(tool_counts.values()),
        "by_function": list(func_counts.values())
    }

@router.get("/m365")
def get_m365_seats(user: Dict[str, Any] = Depends(get_current_user)):
    _init_m365_table()
    rows = query_all("SELECT * FROM m365_copilot_seats ORDER BY inactive_days ASC")
    return {
        "total": len(rows),
        "source": "Microsoft 365 Admin Center User Activity Stream",
        "seats": rows
    }

@router.post("/m365/upload-csv")
async def upload_m365_csv(file: UploadFile = File(...), user: Dict[str, Any] = Depends(get_current_user)):
    _init_m365_table()
    content = await file.read()
    decoded = content.decode("utf-8-sig", errors="ignore")
    reader = csv.DictReader(io.StringIO(decoded))
    
    rows_added = 0
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    now_date = datetime.date.today()

    with get_db() as conn:
        for row in reader:
            upn = row.get("User Principal Name") or row.get("Email") or row.get("user_principal_name")
            if not upn:
                continue
            dname = row.get("Display Name") or row.get("Name") or upn.split("@")[0].title()
            dept = row.get("Department") or "General"
            last_date_str = row.get("Last Activity Date") or row.get("LastActivityDate") or ""
            
            inact_days = 0
            if last_date_str:
                try:
                    act_dt = datetime.datetime.strptime(last_date_str[:10], "%Y-%m-%d").date()
                    inact_days = max(0, (now_date - act_dt).days)
                except Exception:
                    inact_days = 0
            
            status = "ACTIVE" if inact_days <= 6 else ("LAPSING" if inact_days <= 29 else "IDLE")
            chat_cnt = int(row.get("Copilot Chat Activity") or row.get("ChatActivity") or 0)

            conn.execute("""
                INSERT OR REPLACE INTO m365_copilot_seats (
                    user_principal_name, display_name, department, assigned_license,
                    last_activity_date, inactive_days, status, chat_activity_count, updated_at
                ) VALUES (?, ?, ?, 'Microsoft 365 Copilot', ?, ?, ?, ?, ?)
            """, (upn, dname, dept, last_date_str or now_date.isoformat(), inact_days, status, chat_cnt, now_iso))
            rows_added += 1

    return {
        "status": "success",
        "imported_seats": rows_added,
        "message": f"Successfully ingested {rows_added} Microsoft 365 Copilot seats from {file.filename}."
    }
