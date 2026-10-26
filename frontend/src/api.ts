import { SummaryKPI, FunctionSummary, CostBreakdownItem, TrendMonth, AgentScorecardItem, SeatInventorySummary, UserProfile, IngestResponse, ClaudeConfig, ClaudeSyncResponse } from './types';

const API_BASE = '/api/v1';

// Helper to format currency
export function formatUSD(val: number): string {
  if (Math.abs(val) >= 1_000_000) {
    return `$${(val / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(val) >= 1_000) {
    return `$${(val / 1_000).toFixed(1)}k`;
  }
  return `$${val.toLocaleString()}`;
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
