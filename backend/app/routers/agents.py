from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional, List, Dict, Any
from ..schemas import AgentScorecardItem
from ..data_store import store
from ..auth import get_current_user

router = APIRouter(prefix="/agents", tags=["agents"])

@router.get("", response_model=List[AgentScorecardItem])
def list_agents(
    month: Optional[str] = Query(None),
    function: Optional[str] = Query(None),
    cohort: Optional[str] = Query("enterprise"),
    action: Optional[str] = Query(None),
    portfolio_only: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("net_value"),
    sort_order: Optional[str] = Query("desc"),
    user: Dict[str, Any] = Depends(get_current_user)
):
    target_month = month or (store.get_months()[-1] if store.get_months() else "2026-09")
    effective_function = function
    if user.get("role") in ["function_head", "finops"] and user.get("function_name"):
        effective_function = user["function_name"]

    agents = store.get_processed_agents(target_month, effective_function, cohort=cohort)
    
    if action:
        agents = [a for a in agents if a["action"] == action.lower()]
        
    if portfolio_only is not None:
        agents = [a for a in agents if a["in_portfolio"] == portfolio_only]
        
    if search:
        s = search.lower()
        agents = [a for a in agents if s in a["name"].lower() or s in a["team"].lower() or s in a["function"].lower()]

    # Sort: Keep Live Pilot agents prioritized at the top, then sort by requested field
    reverse = (sort_order.lower() == "desc")
    sort_key = sort_by if (agents and sort_by in agents[0]) else "net_value"
    
    def agent_comparator(a):
        is_live_pilot = 0 if a.get("portfolio") == "Live Pilot" else 1
        val = a.get(sort_key, 0)
        if isinstance(val, (int, float)):
            val_order = -val if reverse else val
        else:
            val_order = str(val).lower()
        return (is_live_pilot, val_order)

    agents.sort(key=agent_comparator)
    return agents

@router.get("/{agent_id}")
def get_agent_detail(agent_id: str, month: Optional[str] = None):
    target_month = month or (store.get_months()[-1] if store.get_months() else "2026-09")
    all_agents = store.get_processed_agents(target_month)
    matching = [a for a in all_agents if a["id"] == agent_id or a["name"].lower() == agent_id.lower()]
    
    if not matching:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    current = matching[0]
    
    # Calculate historical trajectory for this agent across months
    history = []
    for m in store.get_months():
        m_agents = store.get_processed_agents(m)
        m_match = [a for a in m_agents if a["id"] == current["id"] or a["name"] == current["name"]]
        if m_match:
            history.append({
                "month": m,
                "net_value": m_match[0]["net_value"],
                "cost": m_match[0]["cost"],
                "hours_saved": m_match[0]["hours_saved"],
                "eval_pass_rate": m_match[0]["eval_pass_rate"],
                "active_users": m_match[0]["active_users"]
            })
            
    return {
        "agent": current,
        "history": history
    }
