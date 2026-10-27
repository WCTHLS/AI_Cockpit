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

export interface IngestSummary {
  rows_processed: number;
  agents_updated: string[];
  total_tasks_completed: number;
  total_tokens_consumed: number;
  hours_saved: number;
  gross_value_usd: number;
  cost_usd: number;
  net_value_usd: number;
  roi_ratio: number;
}

export interface IngestResponse {
  status: string;
  message: string;
  summary: IngestSummary;
}


export interface ClaudeSyncMetrics {
  agents_synced: number;
  total_cost_usd: number;
  total_tokens: number;
  uncached_input_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  output_tokens: number;
  prompt_cache_savings_usd: number;
  total_hours_saved: number;
  total_gross_value_usd: number;
  total_net_value_usd: number;
  tasks_executed: number;
  source_cost: string;
  source_usage: string;
  timestamp: string;
}

export interface ClaudeWorkspaceMapping {
  workspace_id: string;
  agent_name: string;
  department: string;
}

export interface ClaudeConfig {
  connection_mode: 'live' | 'custom' | 'mock';
  custom_base_url: string;
  organization_id: string;
  cost_report_url: string;
  usage_report_url: string;
  official_endpoints?: {
    base_url: string;
    cost_report: string;
    usage_report: string;
    claude_code: string;
  };
  has_api_key: boolean;
  admin_api_key_masked: string;
  auto_sync_on_refresh: boolean;
  last_synced_at: string | null;
  last_sync_status: string;
  last_sync_metrics: ClaudeSyncMetrics | null;
  workspaces?: ClaudeWorkspaceMapping[];
}

export interface ClaudeSyncResponse {
  status: string;
  synced_at: string;
  source_cost: string;
  source_usage: string;
  agents_synced: number;
  metrics: ClaudeSyncMetrics;
  message: string;
}



export interface DeveloperToolConfig {
  provider: string;
  connection_mode: string;
  endpoint_url: string;
  api_key_masked: string;
  has_api_key: boolean;
  org_or_project_id: string;
  developer_email: string;
  local_data_path: string;
  auto_sync_on_refresh: boolean;
  last_synced_at: string | null;
  last_sync_status: string;
  last_sync_metrics: any | null;
}

export interface DeveloperSyncResponse {
  status: string;
  synced_at: string;
  provider: string;
  developer: string;
  developer_email: string;
  metrics: any;
  message: string;
}

export interface DeveloperSeat {
  id: number;
  developer_id: string;
  developer_name: string;
  developer_email: string;
  department: string;
  role: string;
  provider: string;
  license_tier: string;
  editor: string;
  status: string;
  sessions_count: number;
  prompts_count: number;
  suggestions_generated: number;
  suggestions_accepted: number;
  acceptance_rate_pct: number;
  hours_saved: number;
  last_active_at: string;
  updated_at: string;
}
