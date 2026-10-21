from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class LoginRequest(BaseModel):
    username: str
    password: str

class UserBase(BaseModel):
    email: str
    display_name: str
    role: str
    function_name: Optional[str] = None
    team_name: Optional[str] = None

class ThresholdConfig(BaseModel):
    experiment_days: int = 60
    intervene_eval_pass: float = 88.0
    intervene_cost_budget_pct: float = 110.0
    intervene_value_min: float = 15000.0
    accelerate_value_min: float = 40000.0
    accelerate_adoption_min: float = 70.0

class SummaryKPI(BaseModel):
    month: str
    total_net_value: float
    total_gross_value: float
    total_cost: float
    roi_ratio: float
    active_agents: int
    total_hours_saved: float
    action_counts: Dict[str, int]

class FunctionSummary(BaseModel):
    function_name: str
    net_value: float
    gross_value: float
    cost: float
    roi: float
    agent_count: int

class CostBreakdownItem(BaseModel):
    factor: str
    subfactor: Optional[str] = None
    cost: float
    budget: float
    variance: float
    pct_of_total: float

class TrendMonth(BaseModel):
    month: str
    net_value: float
    gross_value: float
    cost: float
    roi: float
    agent_count: int

class AgentScorecardItem(BaseModel):
    id: str
    name: str
    team: str
    function: str
    in_portfolio: bool
    gross_value: float
    cost: float
    budget: float
    net_value: float
    hours_saved: float
    active_users: int
    licensed_users: int
    adoption_pct: float
    eval_runs: int
    eval_passed: int
    eval_pass_rate: float
    policy_incidents: int
    days_in_production: int
    action: str  # accelerate, optimize, experiment, intervene
    suggested_action: Optional[str] = None

class SeatInventorySummary(BaseModel):
    month: str
    total_licensed_seats: int
    active_seats_7d: int
    active_pct: float
    lapsing_seats_7_29d: int
    lapsing_pct: float
    idle_seats_30d: int
    idle_pct: float
    estimated_reclaimable_usd: float
    cost_per_seat_default: float
    by_tool: List[Dict[str, Any]]
    by_function: List[Dict[str, Any]]
