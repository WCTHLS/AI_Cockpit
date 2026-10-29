from fastapi import APIRouter, Query, Depends
from typing import Optional, List, Dict, Any
from ..schemas import SummaryKPI, FunctionSummary, CostBreakdownItem, TrendMonth, AgentScorecardItem
from ..data_store import store
from ..auth import get_current_user
from ..services.portfolio_engine import (
    get_unified_summary,
    get_unified_by_function,
    get_unified_cost_breakdown,
    get_unified_trend
)

router = APIRouter(prefix="/summary", tags=["summary"])

@router.get("", response_model=SummaryKPI)
def get_executive_summary(
    month: Optional[str] = Query(None, description="Month format YYYY-MM"),
    function: Optional[str] = Query(None, description="Filter by function"),
    user: Dict[str, Any] = Depends(get_current_user)
):
    effective_function = function
    if user.get("role") == "function_head" and user.get("function_name"):
        effective_function = user["function_name"]

    target_month = month or (store.get_months()[-1] if store.get_months() else "2026-09")
    return get_unified_summary(target_month=target_month, effective_function=effective_function)

@router.get("/by-function", response_model=List[FunctionSummary])
def get_by_function(
    month: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(get_current_user)
):
    target_month = month or (store.get_months()[-1] if store.get_months() else "2026-09")
    return get_unified_by_function(target_month=target_month)

@router.get("/cost-breakdown", response_model=List[CostBreakdownItem])
def get_cost_breakdown(
    month: Optional[str] = Query(None),
    function: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(get_current_user)
):
    effective_function = function
    if user.get("role") == "function_head" and user.get("function_name"):
        effective_function = user["function_name"]

    target_month = month or (store.get_months()[-1] if store.get_months() else "2026-09")
    return get_unified_cost_breakdown(target_month=target_month, function=effective_function)

@router.get("/trend", response_model=List[TrendMonth])
def get_trend(
    function: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(get_current_user)
):
    effective_function = function
    if user.get("role") == "function_head" and user.get("function_name"):
        effective_function = user["function_name"]

    return get_unified_trend(effective_function=effective_function)

@router.get("/where-to-act", response_model=List[AgentScorecardItem])
def get_where_to_act(
    month: Optional[str] = Query(None),
    function: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(get_current_user)
):
    target_month = month or (store.get_months()[-1] if store.get_months() else "2026-09")
    effective_function = function
    if user.get("role") == "function_head" and user.get("function_name"):
        effective_function = user["function_name"]

    agents = store.get_processed_agents(target_month, effective_function)
    intervene_agents = [a for a in agents if a.get("action") == "intervene"]
    intervene_agents.sort(key=lambda x: (x.get("policy_incidents", 0), 100 - x.get("eval_pass_rate", 100)), reverse=True)
    return intervene_agents