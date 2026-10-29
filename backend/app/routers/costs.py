from fastapi import APIRouter, Query, Depends
from typing import Optional, List, Dict, Any
from ..data_store import store
from ..auth import get_current_user
from ..services.portfolio_engine import (
    get_unified_team_costs,
    get_unified_cost_breakdown
)

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

    team_costs = get_unified_team_costs(target_month=target_month, effective_function=effective_function)
    factors = get_unified_cost_breakdown(target_month=target_month, function=effective_function)

    return {
        "month": target_month,
        "team_costs": team_costs,
        "factor_breakdown": factors
    }