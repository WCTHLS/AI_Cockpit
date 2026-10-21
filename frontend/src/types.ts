export interface AgentScorecardItem {
  id: string;
  name: string;
  team: string;
  function: string;
  in_portfolio: boolean;
  gross_value: number;
  cost: number;
  budget: number;
  net_value: number;
  hours_saved: number;
  active_users: number;
  licensed_users: number;
  adoption_pct: number;
  eval_runs: number;
  eval_passed: number;
  eval_pass_rate: number;
  policy_incidents: number;
  days_in_production: number;
  action: 'accelerate' | 'optimize' | 'experiment' | 'intervene';
  suggested_action?: string;
}

export interface SummaryKPI {
  month: string;
  total_net_value: number;
  total_gross_value: number;
  total_cost: number;
  roi_ratio: number;
  active_agents: number;
  total_hours_saved: number;
  action_counts: {
    accelerate: number;
    optimize: number;
    experiment: number;
    intervene: number;
  };
}

export interface FunctionSummary {
  function_name: string;
  net_value: number;
  gross_value: number;
  cost: number;
  roi: number;
  agent_count: number;
}

export interface CostBreakdownItem {
  factor: string;
  subfactor?: string;
  cost: number;
  budget: number;
  variance: number;
  pct_of_total: number;
}

export interface TrendMonth {
  month: string;
  net_value: number;
  gross_value: number;
  cost: number;
  roi: number;
  agent_count: number;
}

export interface SeatInventorySummary {
  month: string;
  total_licensed_seats: number;
  active_seats_7d: number;
  active_pct: number;
  lapsing_seats_7_29d: number;
  lapsing_pct: number;
  idle_seats_30d: number;
  idle_pct: number;
  estimated_reclaimable_usd: number;
  cost_per_seat_default: number;
  by_tool: Array<{ tool: string; total: number; active: number; idle: number }>;
  by_function: Array<{ function: string; total: number; active: number; idle: number }>;
}

export interface UserProfile {
  email: string;
  display_name: string;
  role: 'cxo' | 'function_head' | 'finops' | 'admin';
  function_name?: string | null;
}
