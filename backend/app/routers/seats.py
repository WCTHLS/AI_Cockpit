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
        # Check if table has new columns
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(m365_copilot_seats)")
        cols = [r[1] for r in cur.fetchall()]
        if cols and "total_prompts" not in cols:
            conn.execute("DROP TABLE IF EXISTS m365_copilot_seats")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS m365_copilot_seats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_principal_name TEXT UNIQUE,
                display_name TEXT,
                department TEXT DEFAULT 'General',
                assigned_license TEXT DEFAULT 'Microsoft 365 Copilot',
                last_activity_date TEXT,
                report_period INTEGER DEFAULT 28,
                total_prompts INTEGER DEFAULT 0,
                chat_work_prompts INTEGER DEFAULT 0,
                chat_web_prompts INTEGER DEFAULT 0,
                active_days INTEGER DEFAULT 0,
                teams_active TEXT,
                outlook_active TEXT,
                word_active TEXT,
                excel_active TEXT,
                powerpoint_active TEXT,
                loop_active TEXT,
                inactive_days INTEGER DEFAULT 0,
                status TEXT DEFAULT 'ACTIVE',
                recommendation TEXT DEFAULT 'Retain',
                hours_saved REAL DEFAULT 0.0,
                updated_at TEXT
            )
        """)
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

            # Department derivation
            dept = row.get("Department") or row.get("Dept")
            if not dept or dept == "General":
                u_lower = upn.lower()
                if any(k in u_lower for k in ["doug", "mohsin", "sales"]):
                    dept = "Sales"
                elif any(k in u_lower for k in ["mehul", "madhava", "anudeep", "sidhartha", "rajesh", "karthik"]):
                    dept = "Eng & IT"
                elif any(k in u_lower for k in ["murthy", "balaji", "magnus"]):
                    dept = "Eng & IT"
                elif any(k in u_lower for k in ["ted", "finance", "reema"]):
                    dept = "Finance"
                else:
                    dept = "Operations"

            last_activity = (
                row.get("Last Activity Date") or
                row.get("Last activity date (UTC)") or
                row.get("LastActivityDate") or
                None
            )

            try:
                total_prompts = int(row.get("Prompts submitted for All Apps") or row.get("TotalPrompts") or 0)
            except (ValueError, TypeError):
                total_prompts = 0

            try:
                chat_work = int(row.get("Prompts submitted for Copilot Chat (work)") or 0)
            except (ValueError, TypeError):
                chat_work = 0

            try:
                chat_web = int(row.get("Prompts submitted for Copilot Chat (web)") or 0)
            except (ValueError, TypeError):
                chat_web = 0

            try:
                active_days = int(row.get("Active Usage Days for All Apps") or 0)
            except (ValueError, TypeError):
                active_days = 0

            teams_act = row.get("Last activity date of Teams Copilot (UTC)") or None
            outlook_act = row.get("Last activity date of Outlook Copilot (UTC)") or None
            word_act = row.get("Last activity date of Word Copilot (UTC)") or None
            excel_act = row.get("Last activity date of Excel Copilot (UTC)") or None
            ppt_act = row.get("Last activity date of PowerPoint Copilot (UTC)") or None
            loop_act = row.get("Last activity date of Loop Copilot (UTC)") or None

            inactive_days = 0
            if last_activity:
                try:
                    act_date = datetime.date.fromisoformat(last_activity[:10])
                    inactive_days = max(0, (today - act_date).days)
                except Exception:
                    inactive_days = 0
            else:
                inactive_days = 90

            # In 28-day report, anyone with 0 prompts is an immediate reclaim candidate
            if total_prompts == 0:
                status = "IDLE"
                recommendation = "Reclaim License (Save $30/mo)"
            elif inactive_days >= 21:
                status = "LAPSING"
                recommendation = "Nudge / Enablement Training"
            elif total_prompts >= 150:
                status = "ACTIVE"
                recommendation = "Retain - Power User"
            else:
                status = "ACTIVE"
                recommendation = "Retain - Active"

            hours_saved = round(total_prompts * 5.0 / 60.0, 1)

            cur = conn.execute("""
                INSERT INTO m365_copilot_seats (
                    user_principal_name, display_name, department, assigned_license,
                    last_activity_date, report_period, total_prompts, chat_work_prompts,
                    chat_web_prompts, active_days, teams_active, outlook_active,
                    word_active, excel_active, powerpoint_active, loop_active,
                    inactive_days, status, recommendation, hours_saved, updated_at
                ) VALUES (?, ?, ?, 'Microsoft 365 Copilot', ?, 28, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_principal_name) DO UPDATE SET
                    display_name = excluded.display_name,
                    department = excluded.department,
                    last_activity_date = excluded.last_activity_date,
                    total_prompts = excluded.total_prompts,
                    chat_work_prompts = excluded.chat_work_prompts,
                    chat_web_prompts = excluded.chat_web_prompts,
                    active_days = excluded.active_days,
                    teams_active = excluded.teams_active,
                    outlook_active = excluded.outlook_active,
                    word_active = excluded.word_active,
                    excel_active = excluded.excel_active,
                    powerpoint_active = excluded.powerpoint_active,
                    loop_active = excluded.loop_active,
                    inactive_days = excluded.inactive_days,
                    status = excluded.status,
                    recommendation = excluded.recommendation,
                    hours_saved = excluded.hours_saved,
                    updated_at = excluded.updated_at
            """, (
                upn, display_name, dept, last_activity, total_prompts, chat_work, chat_web,
                active_days, teams_act, outlook_act, word_act, excel_act, ppt_act, loop_act,
                inactive_days, status, recommendation, hours_saved, now_iso
            ))

            if cur.rowcount > 0:
                inserted += 1

    return {
        "status": "success",
        "message": f"Successfully ingested M365 Copilot report: {inserted} active employee seats processed."
    }

@router.delete("/m365")
def clear_m365_seats(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Clears all ingested Microsoft 365 Copilot usage records from the database.
    """
    _init_m365_table()
    with get_db() as conn:
        conn.execute("DELETE FROM m365_copilot_seats")
        conn.commit()
    return {"status": "success", "message": "All Microsoft 365 Copilot seat telemetry successfully cleared."}

@router.get("/m365")
def get_m365_seats(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Returns employee-level M365 Copilot usage, adoption telemetry, and license reclamation advice.
    """
    _init_m365_table()
    sql = "SELECT * FROM m365_copilot_seats WHERE 1=1"
    params = []

    if search:
        s = f"%{search.strip().lower()}%"
        sql += " AND (LOWER(display_name) LIKE ? OR LOWER(user_principal_name) LIKE ?)"
        params.extend([s, s])

    if status and status != "ALL":
        sql += " AND status = ?"
        params.append(status.upper())

    if department and department != "All Functions":
        sql += " AND department LIKE ?"
        params.append(f"%{department}%")

    sql += " ORDER BY total_prompts DESC, display_name ASC"
    rows = query_all(sql, tuple(params))

    all_seats = query_all("SELECT * FROM m365_copilot_seats")
    total_cnt = len(all_seats)
    active_cnt = sum(1 for s in all_seats if s.get("status") == "ACTIVE")
    lapsing_cnt = sum(1 for s in all_seats if s.get("status") == "LAPSING")
    idle_cnt = sum(1 for s in all_seats if s.get("status") == "IDLE")
    total_prompts = sum(int(s.get("total_prompts") or 0) for s in all_seats)
    total_hours = round(sum(float(s.get("hours_saved") or 0.0) for s in all_seats), 1)

    app_counts = {
        "Copilot Chat": sum(1 for s in all_seats if (s.get("chat_work_prompts") or 0) > 0),
        "Teams": sum(1 for s in all_seats if s.get("teams_active") and str(s.get("teams_active")).startswith("2026-10")),
        "Outlook": sum(1 for s in all_seats if s.get("outlook_active") and str(s.get("outlook_active")).startswith("2026-10")),
        "Loop": sum(1 for s in all_seats if s.get("loop_active") and str(s.get("loop_active")).startswith("2026-10")),
        "Word": sum(1 for s in all_seats if s.get("word_active") and str(s.get("word_active")).startswith("2026-10")),
        "Excel": sum(1 for s in all_seats if s.get("excel_active") and str(s.get("excel_active")).startswith("2026-10")),
        "PowerPoint": sum(1 for s in all_seats if s.get("powerpoint_active") and str(s.get("powerpoint_active")).startswith("2026-10"))
    }

    return {
        "total_seats": total_cnt,
        "active_seats": active_cnt,
        "lapsing_seats": lapsing_cnt,
        "idle_seats": idle_cnt,
        "adoption_rate_pct": round(active_cnt / total_cnt * 100.0, 1) if total_cnt > 0 else 0.0,
        "total_prompts": total_prompts,
        "total_hours_saved": total_hours,
        "monthly_license_spend": total_cnt * 30.0,
        "avoidable_waste_monthly": idle_cnt * 30.0,
        "app_adoption": app_counts,
        "seats": rows
    }
