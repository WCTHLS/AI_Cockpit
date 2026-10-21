from fastapi import APIRouter, Query, Depends
from typing import Optional, List, Dict, Any
from ..schemas import SeatInventorySummary
from ..data_store import store
from ..auth import get_current_user

router = APIRouter(prefix="/seats", tags=["seats"])

@router.get("", response_model=SeatInventorySummary)
def get_seats_summary(
    function: Optional[str] = Query(None),
    cost_per_seat: Optional[float] = Query(30.0),
    user: Dict[str, Any] = Depends(get_current_user)
):
    effective_function = function
    if user.get("role") == "function_head" and user.get("function_name"):
        effective_function = user["function_name"]

    raw_seats = store.raw_seats
    if effective_function:
        raw_seats = [s for s in raw_seats if s[0] == effective_function]

    # raw_seats shape: [Function, SKU/Tool, InactiveDays, Count]
    total_seats = 0
    active_7d = 0
    lapsing_7_29d = 0
    idle_30d = 0

    tool_counts: Dict[str, Dict[str, int]] = {}
    func_counts: Dict[str, Dict[str, int]] = {}

    for row in raw_seats:
        func, tool, days, count = row[0], row[1], row[2], row[3]
        total_seats += count

        if days <= 6:
            active_7d += count
        elif days <= 29:
            lapsing_7_29d += count
        else:
            idle_30d += count

        # By tool
        if tool not in tool_counts:
            tool_counts[tool] = {"tool": tool, "total": 0, "active": 0, "idle": 0}
        tool_counts[tool]["total"] += count
        if days <= 6:
            tool_counts[tool]["active"] += count
        elif days >= 30:
            tool_counts[tool]["idle"] += count

        # By function
        if func not in func_counts:
            func_counts[func] = {"function": func, "total": 0, "active": 0, "idle": 0}
        func_counts[func]["total"] += count
        if days <= 6:
            func_counts[func]["active"] += count
        elif days >= 30:
            func_counts[func]["idle"] += count

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
