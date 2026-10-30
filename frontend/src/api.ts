import { SummaryKPI, FunctionSummary, CostBreakdownItem, TrendMonth, AgentScorecardItem, SeatInventorySummary, UserProfile, IngestResponse, ClaudeConfig, ClaudeSyncResponse, DeveloperToolConfig, DeveloperSyncResponse, DeveloperSeat } from './types';

const API_BASE = '/api/v1';

// Helper to format currency
export function formatUSD(val: number): string {
  const sign = val < 0 ? '-' : '';
  const abs = Math.abs(val);
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  }
  return `${sign}$${abs.toFixed(2)}`;
}

export function formatPct(val: number): string {
  return `${val.toFixed(1)}%`;
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('wct_auth_token');
  const userJson = localStorage.getItem('wct_user');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (userJson) {
    try {
      const u = JSON.parse(userJson);
      if (u.email) headers['X-User-Email'] = u.email;
    } catch {}
  }
  return headers;
}

export async function loginUser(email: string, password: string = 'demo'): Promise<{ token: string; user: UserProfile }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email, password })
  });
  if (!res.ok) throw new Error('Authentication failed');
  const data = await res.json();
  const token = data.access_token;
  const user: UserProfile = {
    email: data.user.email,
    display_name: data.user.display_name,
    role: data.user.role,
    function_name: data.user.function_name
  };
  localStorage.setItem('wct_auth_token', token);
  localStorage.setItem('wct_user', JSON.stringify(user));
  return { token, user };
}

export async function fetchSummary(month?: string, functionName?: string): Promise<SummaryKPI> {
  const params = new URLSearchParams();
  if (month) params.append('month', month);
  if (functionName) params.append('function', functionName);
  
  const res = await fetch(`${API_BASE}/summary?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch summary');
  return res.json();
}

export async function fetchByFunction(month?: string): Promise<FunctionSummary[]> {
  const params = new URLSearchParams();
  if (month) params.append('month', month);
  const res = await fetch(`${API_BASE}/summary/by-function?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch by-function');
  return res.json();
}

export async function fetchCostBreakdown(month?: string): Promise<CostBreakdownItem[]> {
  const params = new URLSearchParams();
  if (month) params.append('month', month);
  const res = await fetch(`${API_BASE}/summary/cost-breakdown?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch cost breakdown');
  return res.json();
}

export async function fetchTrend(functionName?: string): Promise<TrendMonth[]> {
  const params = new URLSearchParams();
  if (functionName) params.append('function', functionName);
  const res = await fetch(`${API_BASE}/summary/trend?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch trend');
  return res.json();
}

export async function fetchWhereToAct(month?: string, functionName?: string): Promise<AgentScorecardItem[]> {
  const params = new URLSearchParams();
  if (month) params.append('month', month);
  if (functionName) params.append('function', functionName);
  const res = await fetch(`${API_BASE}/summary/where-to-act?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch where-to-act');
  return res.json();
}

export async function fetchAgents(params: {
  month?: string;
  function?: string;
  action?: string;
  search?: string;
  sort_by?: string;
  sort_order?: string;
}): Promise<AgentScorecardItem[]> {
  const q = new URLSearchParams();
  if (params.month) q.append('month', params.month);
  if (params.function) q.append('function', params.function);
  if (params.action) q.append('action', params.action);
  if (params.search) q.append('search', params.search);
  if (params.sort_by) q.append('sort_by', params.sort_by);
  if (params.sort_order) q.append('sort_order', params.sort_order);

  const res = await fetch(`${API_BASE}/agents?${q.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch agents');
  return res.json();
}

export async function fetchSeats(functionName?: string, costPerSeat?: number): Promise<SeatInventorySummary> {
  const params = new URLSearchParams();
  if (functionName) params.append('function', functionName);
  if (costPerSeat) params.append('cost_per_seat', costPerSeat.toString());
  const res = await fetch(`${API_BASE}/seats?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch seats');
  return res.json();
}

export async function reclaimSeatsApi(): Promise<{ status: string; reclaimed_count: number; monthly_savings_usd: number; message: string }> {
  const res = await fetch(`${API_BASE}/seats/reclaim`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to reclaim seats');
  }
  return res.json();
}

export async function fetchThresholds(): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/thresholds`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch thresholds');
  return res.json();
}

export async function updateThresholds(config: any): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/thresholds`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(config)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update thresholds');
  }
  return res.json();
}

export async function uploadTelemetryFile(file: File): Promise<IngestResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/ingest/excel`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to upload telemetry file' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export async function downloadCsvTemplate(): Promise<void> {
  const res = await fetch(`${API_BASE}/ingest/template`);
  if (!res.ok) throw new Error('Failed to download template');
  const text = await res.text();
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'telemetry_sample_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


export async function fetchClaudeConfig(): Promise<ClaudeConfig> {
  const res = await fetch(`${API_BASE}/admin/claude/config`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch Claude configuration');
  return res.json();
}

export async function updateClaudeConfig(config: {
  connection_mode?: 'live' | 'custom' | 'mock';
  custom_base_url?: string;
  organization_id?: string;
  cost_report_url?: string;
  usage_report_url?: string;
  admin_api_key?: string;
  auto_sync_on_refresh?: boolean;
}): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/admin/claude/config`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(config)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update Claude configuration');
  }
  return res.json();
}

export async function syncClaudeTelemetry(params?: {
  connection_mode?: 'live' | 'custom' | 'mock';
  custom_base_url?: string;
  cost_report_url?: string;
  usage_report_url?: string;
  admin_api_key?: string;
  month?: string;
  force_local?: boolean;
}): Promise<ClaudeSyncResponse> {
  const res = await fetch(`${API_BASE}/admin/claude/sync`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params || {})
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to sync Claude telemetry');
  }
  return res.json();
}

export interface EmployeeDailyMetric {
  employee_id: number;
  display_name: string;
  email: string;
  sessions_count: number;
  completion_tokens: number;
  prompt_tokens: number;
  total_tokens: number;
  agent_completion: number;
  sucess: number;
  success_rate_pct: number;
}

export interface AgentDailyTelemetrySummary {
  date: string;
  agent_id: string;
  agent_name: string;
  employees_count: number;
  total_tokens: number;
  completion_tokens: number;
  prompt_tokens: number;
  total_sessions: number;
  avg_sessions_in_day: number;
  avg_success_rate_pct: number;
  total_success_count: number;
  avg_agent_completion_seconds: number;
  employees_breakdown: EmployeeDailyMetric[];
}

export async function fetchAgentDailySummary(agentId?: string, date?: string): Promise<AgentDailyTelemetrySummary> {
  const params = new URLSearchParams();
  if (agentId) params.append('agent_id', agentId);
  if (date) params.append('date', date);
  const res = await fetch(`${API_BASE}/telemetry/daily-summary?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch daily telemetry summary');
  return res.json();
}

// Developer Tools (Google Gemini / Antigravity / GitHub Copilot) API
export async function fetchDeveloperConfig(): Promise<DeveloperToolConfig> {
  const res = await fetch(`${API_BASE}/admin/developer-tools/config`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    throw new Error('Failed to fetch developer tools configuration');
  }
  return res.json();
}

export async function updateDeveloperConfig(config: {
  provider?: string;
  connection_mode?: string;
  endpoint_url?: string;
  api_key?: string;
  org_or_project_id?: string;
  developer_email?: string;
  local_data_path?: string;
  auto_sync_on_refresh?: boolean;
}): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/admin/developer-tools/config`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(config)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update developer tools configuration');
  }
  return res.json();
}

export async function testDeveloperConnection(params: {
  provider?: string;
  connection_mode?: string;
  endpoint_url?: string;
  api_key?: string;
  org_or_project_id?: string;
  local_data_path?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/developer-tools/test-connection`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to test developer tool connection');
  }
  return res.json();
}

export async function syncDeveloperTelemetry(params?: {
  provider?: string;
  connection_mode?: string;
  endpoint_url?: string;
  api_key?: string;
  developer_email?: string;
  local_data_path?: string;
  force_refresh?: boolean;
}): Promise<DeveloperSyncResponse> {
  const res = await fetch(`${API_BASE}/admin/developer-tools/sync`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params || {})
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to sync developer telemetry');
  }
  return res.json();
}

export async function fetchDeveloperSeats(): Promise<{ total: number; seats: DeveloperSeat[] }> {
  const res = await fetch(`${API_BASE}/admin/developer-tools/seats`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    throw new Error('Failed to fetch developer seats');
  }
  return res.json();
}

export async function deleteDeveloperSeat(developerId: string | number): Promise<{ status: string; message: string; developer_id: string }> {
  const res = await fetch(`${API_BASE}/admin/developer-tools/seats/${encodeURIComponent(String(developerId))}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete developer seat');
  }
  return res.json();
}

export async function fetchDeveloperDrilldown(developerId?: string): Promise<any> {
  const q = developerId ? `?developer_id=${encodeURIComponent(developerId)}` : '';
  const res = await fetch(`${API_BASE}/admin/developer-tools/drilldown${q}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    throw new Error('Failed to fetch developer drilldown metrics');
  }
  return res.json();
}

export async function uploadM365Csv(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  const token = localStorage.getItem('wct_auth_token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/seats/m365/upload-csv`, {
    method: 'POST',
    headers,
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to upload Microsoft 365 Copilot CSV');
  }
  return res.json();
}

export interface M365SeatItem {
  id: number;
  user_principal_name: string;
  display_name: string;
  department: string;
  assigned_license: string;
  last_activity_date: string;
  report_period: number;
  total_prompts: number;
  chat_work_prompts: number;
  chat_web_prompts: number;
  active_days: number;
  teams_active?: string;
  outlook_active?: string;
  word_active?: string;
  excel_active?: string;
  powerpoint_active?: string;
  loop_active?: string;
  inactive_days: number;
  status: 'ACTIVE' | 'LAPSING' | 'IDLE';
  recommendation: string;
  hours_saved: number;
  updated_at: string;
}

export interface M365SeatsResponse {
  total_seats: number;
  active_seats: number;
  lapsing_seats: number;
  idle_seats: number;
  adoption_rate_pct: number;
  total_prompts: number;
  total_hours_saved: number;
  monthly_license_spend: number;
  avoidable_waste_monthly: number;
  app_adoption: Record<string, number>;
  seats: M365SeatItem[];
}

export async function fetchM365Seats(params?: { search?: string; status?: string; department?: string }): Promise<M365SeatsResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.department) query.set('department', params.department);
  const res = await fetch(`${API_BASE}/seats/m365?${query.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    throw new Error('Failed to fetch M365 seats');
  }
  return res.json();
}

export async function clearM365Seats(): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/seats/m365`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    throw new Error('Failed to clear M365 seats');
  }
  return res.json();
}

export async function uploadTeammateZip(
  file: File,
  developerName: string,
  developerEmail: string,
  department = 'Eng & IT',
  role = 'Software Engineer'
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('developer_name', developerName);
  formData.append('developer_email', developerEmail);
  formData.append('department', department);
  formData.append('role', role);

  const token = localStorage.getItem('wct_auth_token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/admin/developer-tools/upload-teammate-zip`, {
    method: 'POST',
    headers,
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to upload teammate brain zip');
  }
  return res.json();
}

export async function fetchWorkingAgentSchema(): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/working-agents/schema`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch working agent schema');
  return res.json();
}

export async function fetchWorkingAgents(): Promise<{ total: number; agents: any[] }> {
  const res = await fetch(`${API_BASE}/admin/working-agents`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch working agents');
  return res.json();
}

export async function ingestWorkingAgent(payload: any): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/working-agents`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: typeof payload === 'string' ? payload : JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to ingest working agent');
  }
  return res.json();
}




export async function testAgentConnection(payload: {
  provider: string;
  copilot_method?: string;
  copilot_bot_id?: string;
  dataverse_url?: string;
  tenant_id?: string;
  client_id?: string;
  client_secret?: string;
  app_insights_app_id?: string;
  app_insights_key?: string;
  api_endpoint?: string;
  api_key?: string;
  deployment_name?: string;
}): Promise<{ status: string; connected: boolean; mode: string; message: string; latency_ms?: number }> {
  const res = await fetch(`${API_BASE}/admin/test-connection`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to test agent connection');
  }
  return res.json();
}
