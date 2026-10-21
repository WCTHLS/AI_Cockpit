import { SummaryKPI, FunctionSummary, CostBreakdownItem, TrendMonth, AgentScorecardItem, SeatInventorySummary } from './types';

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

export async function fetchSummary(month?: string, functionName?: string): Promise<SummaryKPI> {
  const params = new URLSearchParams();
  if (month) params.append('month', month);
  if (functionName) params.append('function', functionName);
  
  const res = await fetch(`${API_BASE}/summary?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch summary');
  return res.json();
}

export async function fetchByFunction(month?: string): Promise<FunctionSummary[]> {
  const params = new URLSearchParams();
  if (month) params.append('month', month);
  const res = await fetch(`${API_BASE}/summary/by-function?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch by-function');
  return res.json();
}

export async function fetchCostBreakdown(month?: string): Promise<CostBreakdownItem[]> {
  const params = new URLSearchParams();
  if (month) params.append('month', month);
  const res = await fetch(`${API_BASE}/summary/cost-breakdown?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch cost breakdown');
  return res.json();
}

export async function fetchTrend(functionName?: string): Promise<TrendMonth[]> {
  const params = new URLSearchParams();
  if (functionName) params.append('function', functionName);
  const res = await fetch(`${API_BASE}/summary/trend?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch trend');
  return res.json();
}

export async function fetchWhereToAct(month?: string, functionName?: string): Promise<AgentScorecardItem[]> {
  const params = new URLSearchParams();
  if (month) params.append('month', month);
  if (functionName) params.append('function', functionName);
  const res = await fetch(`${API_BASE}/summary/where-to-act?${params.toString()}`);
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

  const res = await fetch(`${API_BASE}/agents?${q.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch agents');
  return res.json();
}

export async function fetchSeats(functionName?: string, costPerSeat?: number): Promise<SeatInventorySummary> {
  const params = new URLSearchParams();
  if (functionName) params.append('function', functionName);
  if (costPerSeat) params.append('cost_per_seat', costPerSeat.toString());
  const res = await fetch(`${API_BASE}/seats?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch seats');
  return res.json();
}

export async function fetchThresholds(): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/thresholds`);
  if (!res.ok) throw new Error('Failed to fetch thresholds');
  return res.json();
}

export async function updateThresholds(config: any): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/thresholds`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  if (!res.ok) throw new Error('Failed to update thresholds');
  return res.json();
}
