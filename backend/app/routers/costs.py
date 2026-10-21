from fastapi import APIRouter, Query, Depends
from typing import Optional, List, Dict, Any
from ..data_store import store
from ..auth import get_current_user

router = APIRouter(prefix="/costs", tags=["costs"])

@router.get("")
def get_costs(
    month: Optional[str] = Query(None),
    function: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(get_current_user)
):
    target_month = month or (store.get_months()[-1] if store.get_months() else "2026-09")
    effective_function = function
    if user.get("role") == "function_head" and user.get("function_name"):
        effective_function = user["function_name"]

    agents = store.get_processed_agents(target_month, effective_function)
    
    # Group costs by team
    teams_map: Dict[str, Dict[str, Any]] = {}
    for a in agents:
        t = a["team"]
        if t not in teams_map:
            teams_map[t] = {
                "team": t,
                "function": a["function"],
                "cost": 0.0,
                "budget": 0.0,
                "agent_count": 0
            }
        teams_map[t]["cost"] += a["cost"]
        teams_map[t]["budget"] += a["budget"]
        teams_map[t]["agent_count"] += 1

    team_costs = list(teams_map.values())
    for tc in team_costs:
        tc["cost"] = round(tc["cost"], 2)
        tc["budget"] = round(tc["budget"], 2)
        tc["variance"] = round(tc["cost"] - tc["budget"], 2)
        tc["variance_pct"] = round((tc["cost"] / tc["budget"] * 100.0) if tc["budget"] > 0 else 0.0, 1)

    team_costs.sort(key=lambda x: x["cost"], reverse=True)

    # Cost breakdown by factor
    factors = [c for c in store.raw_costs if c.get("Month") == target_month]

    return {
        "month": target_month,
        "team_costs": team_costs,
        "factor_breakdown": factors
    }
