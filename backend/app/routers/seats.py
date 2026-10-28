import csv
import io
import datetime
from fastapi import APIRouter, Query, HTTPException, Depends, UploadFile, File
from typing import Optional, List, Dict, Any
from ..schemas import SeatInventorySummary
from ..database import get_db, query_all
from ..auth import get_current_user
from .developer_sync import _init_developer_tables

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
    _init_developer_tables()
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
        if effective_function and effective_function != "All Functions" and effective_function not in dept:
            continue
        total_seats += 1
        status = ms.get("status") or "ACTIVE"
        if status == "ACTIVE":
            active_7d += 1
            tool_counts["Microsoft 365 Copilot"]["active"] += 1
        elif status == "LAPSING":
            lapsing_7_29d += 1
        elif status == "IDLE":
            idle_30d += 1
            tool_counts["Microsoft 365 Copilot"]["idle"] += 1
        tool_counts["Microsoft 365 Copilot"]["total"] += 1

        if dept not in func_counts:
            func_counts[dept] = {"function": dept, "total": 0, "active": 0, "idle": 0}
        func_counts[dept]["total"] += 1
        if status == "ACTIVE":
            func_counts[dept]["active"] += 1
        elif status == "IDLE":
            func_counts[dept]["idle"] += 1

    active_pct = round((active_7d / total_seats * 100.0), 1) if total_seats > 0 else 0.0
    lapsing_pct = round((lapsing_7_29d / total_seats * 100.0), 1) if total_seats > 0 else 0.0
    idle_pct = round((idle_30d / total_seats * 100.0), 1) if total_seats > 0 else 0.0
    avoidable_cost = float(idle_30d * (cost_per_seat or 30.0))

    return SeatInventorySummary(
        month=datetime.date.today().strftime('%Y-%m'),
        total_licensed_seats=total_seats,
        active_seats_7d=active_7d,
        active_pct=active_pct,
        lapsing_seats_7_29d=lapsing_7_29d,
        lapsing_pct=lapsing_pct,
        idle_seats_30d=idle_30d,
        idle_pct=idle_pct,
        estimated_reclaimable_usd=avoidable_cost,
        cost_per_seat_default=float(cost_per_seat or 30.0),
        by_tool=list(tool_counts.values()),
        by_function=list(func_counts.values())
    )

@router.post("/m365/upload-csv")
async def upload_m365_csv(file: UploadFile = File(...), user: Dict[str, Any] = Depends(get_current_user)):
    """
    Ingests official Microsoft 365 Copilot User Activity report CSV exported from
    M365 Admin Center -> Reports -> Usage -> Microsoft 365 Apps -> Copilot activity.
    """
    _init_m365_table()
    content = await file.read()
    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        decoded = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(decoded))
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    today = datetime.date.today()

    inserted = 0
    updated = 0

    with get_db() as conn:
        for row in reader:
            upn = (
                row.get("User Principal Name") or
                row.get("UserPrincipalName") or
                row.get("UPN") or
                row.get("User email") or
                row.get("Email")
            )
            if not upn or "@" not in upn:
                continue

            display_name = (
                row.get("Display Name") or
                row.get("DisplayName") or
                upn.split("@")[0].replace(".", " ").title()
            )
            dept = row.get("Department") or row.get("Dept") or "General"
            last_activity = (
                row.get("Last activity date (UTC)") or
                row.get("Last Activity Date") or
                row.get("LastActivityDate") or
                None
            )
            chat_count = int(row.get("Copilot Chat activity count") or row.get("ChatActivityCount") or 0)

            inactive_days = 0
            if last_activity:
                try:
                    act_date = datetime.date.fromisoformat(last_activity[:10])
                    inactive_days = max(0, (today - act_date).days)
                except Exception:
                    inactive_days = 0

            status = "ACTIVE"
            if inactive_days >= 30:
                status = "IDLE"
            elif inactive_days >= 7:
                status = "LAPSING"

            cur = conn.execute("""
                INSERT INTO m365_copilot_seats (
                    user_principal_name, display_name, department, assigned_license,
                    last_activity_date, inactive_days, status, chat_activity_count, updated_at
                ) VALUES (?, ?, ?, 'Microsoft 365 Copilot', ?, ?, ?, ?, ?)
                ON CONFLICT(user_principal_name) DO UPDATE SET
                    display_name = excluded.display_name,
                    department = excluded.department,
                    last_activity_date = excluded.last_activity_date,
                    inactive_days = excluded.inactive_days,
                    status = excluded.status,
                    chat_activity_count = excluded.chat_activity_count,
                    updated_at = excluded.updated_at
            """, (upn, display_name, dept, last_activity, inactive_days, status, chat_count, now_iso))

            if cur.rowcount > 0:
                inserted += 1

    return {
        "status": "success",
        "message": f"Successfully ingested M365 Copilot report: {inserted} active seats processed."
    }
