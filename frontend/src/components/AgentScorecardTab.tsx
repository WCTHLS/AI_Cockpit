import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { Search, ArrowUpDown, ChevronRight } from 'lucide-react';
import { AgentScorecardItem } from '../types';
import { formatUSD, formatPct } from '../api';

interface AgentScorecardTabProps {
  agents: AgentScorecardItem[];
  onSelectAgent: (agent: AgentScorecardItem) => void;
  initialActionFilter?: string;
  theme?: 'dark' | 'light';
}

export const AgentScorecardTab: React.FC<AgentScorecardTabProps> = ({
  agents,
  onSelectAgent,
  initialActionFilter = '',
  theme = 'dark'
}) => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState(initialActionFilter);
  const [sortBy, setSortBy] = useState<string>('net_value');
  const [sortDesc, setSortDesc] = useState<boolean>(true);
  const scatterRef = useRef<HTMLDivElement>(null);

  const isLight = theme === 'light';

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

    const actionColors: Record<string, string> = isLight ? {
      accelerate: '#1B5E20',
      optimize: '#7A5300',
      experiment: '#455A64',
      intervene: '#A4161A'
    } : {
      accelerate: '#10b981',
      optimize: '#3b82f6',
      experiment: '#a855f7',
      intervene: '#ef4444'
    };

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: isLight ? '#FFFFFF' : '#101a33',
        borderColor: isLight ? '#D6E2FA' : 'rgba(0, 210, 255, 0.3)',
        textStyle: { color: isLight ? '#1A1A1A' : '#FFFFFF' },
        formatter: (params: any) => {
          const raw = params.data[3];
          return `<div style="font-family: Satoshi, Outfit, sans-serif; padding: 4px;">
            <b style="color: ${isLight ? '#00349B' : '#fff'}">${raw.name}</b> (${raw.function})<br/>
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
        nameTextStyle: { color: isLight ? '#475569' : '#94a3b8' },
        type: 'value',
        min: 0,
        max: 100,
        axisLine: { lineStyle: { color: isLight ? 'rgba(0, 52, 155, 0.2)' : 'rgba(255,255,255,0.1)' } },
        splitLine: { lineStyle: { color: isLight ? 'rgba(0, 52, 155, 0.08)' : 'rgba(255,255,255,0.06)' } },
        axisLabel: { color: isLight ? '#475569' : '#94a3b8', fontSize: 11, formatter: '{value}%' }
      },
      yAxis: {
        name: 'Net Value ($)',
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: { color: isLight ? '#475569' : '#94a3b8' },
        type: 'value',
        axisLine: { lineStyle: { color: isLight ? 'rgba(0, 52, 155, 0.2)' : 'rgba(255,255,255,0.1)' } },
        splitLine: { lineStyle: { color: isLight ? 'rgba(0, 52, 155, 0.08)' : 'rgba(255,255,255,0.06)' } },
        axisLabel: {
          color: isLight ? '#475569' : '#94a3b8',
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
            shadowBlur: isLight ? 4 : 8,
            shadowColor: isLight ? 'rgba(0, 52, 155, 0.2)' : 'rgba(0,0,0,0.4)'
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
  }, [agents, onSelectAgent, isLight]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Scatter Plot Card */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Value vs. Adoption Quadrant Map</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Bubble size represents hours saved · Click any bubble to inspect telemetry
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, fontWeight: 700, flexWrap: 'wrap' }}>
            <span style={{ color: isLight ? '#1B5E20' : '#10b981' }}>● Accelerate (High Val / High Adop)</span>
            <span style={{ color: isLight ? '#7A5300' : '#3b82f6' }}>● Optimize (Steady)</span>
            <span style={{ color: isLight ? '#455A64' : '#a855f7' }}>● Experiment (Early &lt;60d)</span>
            <span style={{ color: isLight ? '#A4161A' : '#ef4444' }}>● Intervene (At Risk)</span>
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
                background: isLight ? '#FFFFFF' : 'rgba(11, 19, 38, 0.9)',
                border: isLight ? '1.5px solid #D6E2FA' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-pill)',
                padding: '8px 12px 8px 36px',
                color: 'var(--text-main)',
                fontSize: 13,
                outline: 'none',
                boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
              }}
            />
          </div>
        </div>

        {/* Action Status Filter Tabs */}
        <div style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          background: isLight ? '#FFFFFF' : 'transparent',
          padding: isLight ? 4 : 0,
          borderRadius: isLight ? 'var(--radius-pill)' : 0,
          border: isLight ? '1.5px solid #D6E2FA' : 'none'
        }}>
          {[
            { label: 'All Agents', value: '' },
            { label: 'Accelerate', value: 'accelerate' },
            { label: 'Optimize', value: 'optimize' },
            { label: 'Experiment', value: 'experiment' },
            { label: 'Intervene', value: 'intervene' }
          ].map(opt => {
            const active = actionFilter === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setActionFilter(opt.value)}
                style={{
                  background: active 
                    ? (isLight ? '#1713FD' : 'rgba(0, 210, 255, 0.2)') 
                    : (isLight ? 'transparent' : 'rgba(255, 255, 255, 0.05)'),
                  color: active 
                    ? '#FFFFFF' 
                    : (isLight ? '#00349B' : 'var(--text-muted)'),
                  border: active 
                    ? (isLight ? '1px solid #1713FD' : '1px solid rgba(0, 210, 255, 0.4)') 
                    : (isLight ? '1px solid transparent' : '1px solid var(--border-subtle)'),
                  borderRadius: 'var(--radius-pill)',
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {opt.label}
              </button>
            );
          })}
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
                    <td style={{ fontWeight: 700, color: isLight ? '#00349B' : '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {agent.name}
                        {agent.in_portfolio && (
                          <span style={{
                            fontSize: 9,
                            fontWeight: 700,
                            background: isLight ? '#E9EFFB' : 'rgba(0, 210, 255, 0.15)',
                            color: isLight ? '#00349B' : 'var(--accent-cyan)',
                            border: isLight ? '1px solid #D6E2FA' : 'none',
                            padding: '1px 5px',
                            borderRadius: 4
                          }}>
                            PORTFOLIO
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{agent.function}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{agent.team}</td>
                    <td style={{ fontWeight: 700, color: isLight ? '#00349B' : '#fff' }}>{formatUSD(agent.net_value)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatUSD(agent.cost)}</td>
                    <td>{agent.hours_saved.toLocaleString()}h</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 44,
                          height: 6,
                          background: isLight ? '#D6E2FA' : 'rgba(255,255,255,0.1)',
                          borderRadius: 3,
                          overflow: 'hidden'
                        }}>
                          <div style={{ width: `${agent.adoption_pct}%`, height: '100%', background: isLight ? '#1713FD' : 'var(--accent-cyan)' }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{agent.adoption_pct}%</span>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 700,
                        background: isUnderEval 
                          ? (isLight ? '#F9DEDC' : 'rgba(239, 68, 68, 0.2)') 
                          : (isLight ? '#E3F1E4' : 'rgba(16, 185, 129, 0.15)'),
                        color: isUnderEval 
                          ? (isLight ? '#A4161A' : '#f87171') 
                          : (isLight ? '#1B5E20' : '#34d399')
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
