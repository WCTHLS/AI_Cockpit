import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { Search, Filter, ArrowUpDown, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { AgentScorecardItem } from '../types';
import { formatUSD, formatPct } from '../api';

interface AgentScorecardTabProps {
  agents: AgentScorecardItem[];
  onSelectAgent: (agent: AgentScorecardItem) => void;
  initialActionFilter?: string;
}

export const AgentScorecardTab: React.FC<AgentScorecardTabProps> = ({
  agents,
  onSelectAgent,
  initialActionFilter = ''
}) => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState(initialActionFilter);
  const [sortBy, setSortBy] = useState<string>('net_value');
  const [sortDesc, setSortDesc] = useState<boolean>(true);
  const scatterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialActionFilter) {
      setActionFilter(initialActionFilter);
    }
  }, [initialActionFilter]);

  // Filter & sort agents
  const filtered = agents.filter(a => {
    if (actionFilter && a.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.team.toLowerCase().includes(q) || a.function.toLowerCase().includes(q);
    }
    return true;
  });

  filtered.sort((a: any, b: any) => {
    const valA = a[sortBy] ?? 0;
    const valB = b[sortBy] ?? 0;
    if (valA < valB) return sortDesc ? 1 : -1;
    if (valA > valB) return sortDesc ? -1 : 1;
    return 0;
  });

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(field);
      setSortDesc(true);
    }
  };

  // Render Value vs Adoption Scatter Plot
  useEffect(() => {
    if (!scatterRef.current || !agents.length) return;
    const chart = echarts.init(scatterRef.current);

    const actionColors: Record<string, string> = {
      accelerate: '#10b981',
      optimize: '#3b82f6',
      experiment: '#a855f7',
      intervene: '#ef4444'
    };

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const raw = params.data[3];
          return `<div style="font-family: Outfit, sans-serif; padding: 4px;">
            <b>${raw.name}</b> (${raw.function})<br/>
            Adoption: <b>${formatPct(raw.adoption_pct)}</b><br/>
            Net Value: <b>${formatUSD(raw.net_value)}</b><br/>
            Eval Pass: <b>${formatPct(raw.eval_pass_rate)}</b><br/>
            Status: <span style="color: ${actionColors[raw.action]}; text-transform: uppercase; font-weight:700;">${raw.action}</span>
          </div>`;
        }
      },
      grid: { top: 25, right: 30, bottom: 40, left: 60 },
      xAxis: {
        name: 'Adoption Rate (%)',
        nameLocation: 'middle',
        nameGap: 25,
        type: 'value',
        min: 0,
        max: 100,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        axisLabel: { color: '#94a3b8', fontSize: 11, formatter: '{value}%' }
      },
      yAxis: {
        name: 'Net Value ($)',
        nameLocation: 'middle',
        nameGap: 45,
        type: 'value',
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 10,
          formatter: (v: number) => `$${(v / 1000).toFixed(0)}k`
        }
      },
      series: [
        {
          name: 'Agents',
          type: 'scatter',
          symbolSize: (data: any) => Math.max(14, Math.min(32, (data[2] / 4000) * 16)),
          data: agents.map(a => [
            a.adoption_pct,
            a.net_value,
            a.hours_saved,
            a
          ]),
          itemStyle: {
            color: (params: any) => actionColors[params.data[3].action] || '#3b82f6',
            shadowBlur: 8,
            shadowColor: 'rgba(0,0,0,0.4)'
          }
        }
      ]
    });

    chart.on('click', (params: any) => {
      if (params.data && params.data[3]) {
        onSelectAgent(params.data[3]);
      }
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [agents, onSelectAgent]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Scatter Plot Card */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Value vs. Adoption Quadrant Map</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Bubble size represents hours saved · Click any bubble to inspect telemetry
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, fontWeight: 600 }}>
            <span style={{ color: '#10b981' }}>● Accelerate (High Val / High Adop)</span>
            <span style={{ color: '#3b82f6' }}>● Optimize (Steady)</span>
            <span style={{ color: '#a855f7' }}>● Experiment (Early &lt;60d)</span>
            <span style={{ color: '#ef4444' }}>● Intervene (At Risk)</span>
          </div>
        </div>
        <div ref={scatterRef} style={{ height: 290, width: '100%' }} />
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 11 }} />
            <input
              type="text"
              placeholder="Search agent name, team, function..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(11, 19, 38, 0.9)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: '8px 12px 8px 36px',
                color: '#fff',
                fontSize: 13,
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Action Status Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'All Agents', value: '' },
            { label: 'Accelerate', value: 'accelerate' },
            { label: 'Optimize', value: 'optimize' },
            { label: 'Experiment', value: 'experiment' },
            { label: 'Intervene', value: 'intervene' }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setActionFilter(opt.value)}
              style={{
                background: actionFilter === opt.value ? 'rgba(0, 210, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: actionFilter === opt.value ? '#fff' : 'var(--text-muted)',
                border: actionFilter === opt.value ? '1px solid rgba(0, 210, 255, 0.4)' : '1px solid var(--border-subtle)',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Agent Scorecard Matrix Table */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Agent Portfolio Scorecard ({filtered.length} Agents)</h3>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click headers to sort · Click rows for deep-dive telemetry</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                  Agent Name <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: 4 }} />
                </th>
                <th>Function</th>
                <th>Team</th>
                <th onClick={() => handleSort('net_value')} style={{ cursor: 'pointer' }}>
                  Net Value <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: 4 }} />
                </th>
                <th onClick={() => handleSort('cost')} style={{ cursor: 'pointer' }}>
                  Cost <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: 4 }} />
                </th>
                <th onClick={() => handleSort('hours_saved')} style={{ cursor: 'pointer' }}>
                  Hours Saved <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: 4 }} />
                </th>
                <th onClick={() => handleSort('adoption_pct')} style={{ cursor: 'pointer' }}>
                  Adoption <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: 4 }} />
                </th>
                <th onClick={() => handleSort('eval_pass_rate')} style={{ cursor: 'pointer' }}>
                  Eval Pass Rate <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: 4 }} />
                </th>
                <th>Days in Prod</th>
                <th>Posture</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(agent => {
                const isUnderEval = agent.eval_runs > 0 && agent.eval_pass_rate < 88;
                return (
                  <tr
                    key={agent.id}
                    onClick={() => onSelectAgent(agent)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 600, color: '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {agent.name}
                        {agent.in_portfolio && (
                          <span style={{ fontSize: 9, background: 'rgba(0, 210, 255, 0.15)', color: 'var(--accent-cyan)', padding: '1px 5px', borderRadius: 4 }}>
                            PORTFOLIO
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{agent.function}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{agent.team}</td>
                    <td style={{ fontWeight: 700, color: '#fff' }}>{formatUSD(agent.net_value)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatUSD(agent.cost)}</td>
                    <td>{agent.hours_saved.toLocaleString()}h</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 40, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${agent.adoption_pct}%`, height: '100%', background: 'var(--accent-cyan)' }} />
                        </div>
                        <span style={{ fontSize: 12 }}>{agent.adoption_pct}%</span>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        background: isUnderEval ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                        color: isUnderEval ? '#f87171' : '#34d399'
                      }}>
                        {formatPct(agent.eval_pass_rate)}
                      </span>
                    </td>
                    <td>{agent.days_in_production}d</td>
                    <td>
                      <span className={`badge-status badge-${agent.action}`}>
                        {agent.action}
                      </span>
                    </td>
                    <td>
                      <ChevronRight size={16} color="var(--text-dim)" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
