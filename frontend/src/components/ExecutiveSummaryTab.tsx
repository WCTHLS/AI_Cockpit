import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { DollarSign, TrendingUp, Cpu, AlertTriangle, ArrowUpRight, Zap, Target, CheckCircle2 } from 'lucide-react';
import { SummaryKPI, FunctionSummary, CostBreakdownItem, TrendMonth, AgentScorecardItem } from '../types';
import { formatUSD, formatPct } from '../api';

interface ExecutiveSummaryTabProps {
  summary: SummaryKPI | null;
  byFunction: FunctionSummary[];
  costBreakdown: CostBreakdownItem[];
  trend: TrendMonth[];
  whereToAct: AgentScorecardItem[];
  onSelectAgent: (agent: AgentScorecardItem) => void;
  onFilterAction: (action: string) => void;
}

export const ExecutiveSummaryTab: React.FC<ExecutiveSummaryTabProps> = ({
  summary,
  byFunction,
  costBreakdown,
  trend,
  whereToAct,
  onSelectAgent,
  onFilterAction
}) => {
  const functionChartRef = useRef<HTMLDivElement>(null);
  const costChartRef = useRef<HTMLDivElement>(null);
  const trendChartRef = useRef<HTMLDivElement>(null);

  // Render Net Value by Function Bar Chart
  useEffect(() => {
    if (!functionChartRef.current || !byFunction.length) return;
    const chart = echarts.init(functionChartRef.current);
    
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item = params[0];
          return `<div style="font-family: Outfit, sans-serif; padding: 4px;">
            <b>${item.name}</b><br/>
            Net Value: <span style="color: #00d2ff; font-weight:700;">${formatUSD(item.value)}</span>
          </div>`;
        }
      },
      grid: { top: 20, right: 20, bottom: 30, left: 60 },
      xAxis: {
        type: 'category',
        data: byFunction.map(f => f.function_name),
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
          formatter: (v: number) => `$${(v / 1000).toFixed(0)}k`
        }
      },
      series: [
        {
          name: 'Net Value',
          type: 'bar',
          data: byFunction.map(f => f.net_value),
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#00d2ff' },
              { offset: 1, color: '#0055ff' }
            ])
          },
          emphasis: {
            itemStyle: {
              color: '#38bdf8'
            }
          }
        }
      ]
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [byFunction]);

  // Render Cost Factors Breakdown Chart
  useEffect(() => {
    if (!costChartRef.current || !costBreakdown.length) return;
    const chart = echarts.init(costChartRef.current);

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          return `<div style="font-family: Outfit, sans-serif; padding: 4px;">
            <b>${params.name}</b><br/>
            Cost: <span style="color: #f43f5e; font-weight:700;">${formatUSD(params.value)}</span> (${params.percent}%)
          </div>`;
        }
      },
      legend: {
        bottom: 0,
        textStyle: { color: '#94a3b8', fontSize: 11 }
      },
      series: [
        {
          name: 'Cost Factors',
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#0b1329',
            borderWidth: 2
          },
          label: { show: false },
          data: costBreakdown.map((c, i) => {
            const colors = ['#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b'];
            return {
              name: c.factor,
              value: c.cost,
              itemStyle: { color: colors[i % colors.length] }
            };
          })
        }
      ]
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [costBreakdown]);

  // Render 6-Month Trend Chart
  useEffect(() => {
    if (!trendChartRef.current || !trend.length) return;
    const chart = echarts.init(trendChartRef.current);

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        top: 0,
        right: 0,
        textStyle: { color: '#94a3b8', fontSize: 11 }
      },
      grid: { top: 35, right: 40, bottom: 25, left: 55 },
      xAxis: {
        type: 'category',
        data: trend.map(t => t.month),
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Value ($)',
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
          axisLabel: {
            color: '#94a3b8',
            fontSize: 10,
            formatter: (v: number) => `$${(v / 1_000_000).toFixed(1)}M`
          }
        },
        {
          type: 'value',
          name: 'ROI',
          splitLine: { show: false },
          axisLabel: {
            color: '#94a3b8',
            fontSize: 10,
            formatter: (v: number) => `${v}x`
          }
        }
      ],
      series: [
        {
          name: 'Net Value',
          type: 'line',
          smooth: true,
          data: trend.map(t => t.net_value),
          lineStyle: { width: 3, color: '#00d2ff' },
          itemStyle: { color: '#00d2ff' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(0, 210, 255, 0.3)' },
              { offset: 1, color: 'rgba(0, 210, 255, 0.0)' }
            ])
          }
        },
        {
          name: 'Total Cost',
          type: 'line',
          smooth: true,
          data: trend.map(t => t.cost),
          lineStyle: { width: 2, color: '#f43f5e' },
          itemStyle: { color: '#f43f5e' }
        },
        {
          name: 'ROI Multiple',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: trend.map(t => t.roi),
          lineStyle: { width: 2, type: 'dashed', color: '#10b981' },
          itemStyle: { color: '#10b981' }
        }
      ]
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [trend]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Hero 4 KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 18
      }}>
        {/* KPI 1: Net Value */}
        <div className="glass-panel kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>NET VALUE DELIVERED</span>
            <div style={{ background: 'rgba(0, 210, 255, 0.1)', padding: 7, borderRadius: 8, color: 'var(--accent-cyan)' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className="kpi-value">
            {summary ? formatUSD(summary.total_net_value) : '$1.80M'}
          </div>
          <div className="kpi-sub">
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
              <ArrowUpRight size={14} /> +4.9%
            </span>
            <span>vs previous month ($1.72M)</span>
          </div>
        </div>

        {/* KPI 2: AI Cost */}
        <div className="glass-panel kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>TOTAL AI EXPENDITURE</span>
            <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: 7, borderRadius: 8, color: 'var(--accent-rose)' }}>
              <Cpu size={18} />
            </div>
          </div>
          <div className="kpi-value">
            {summary ? formatUSD(summary.total_cost) : '$412K'}
          </div>
          <div className="kpi-sub">
            <span>Budget $430K ·</span>
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>4.1% under plan</span>
          </div>
        </div>

        {/* KPI 3: Program ROI */}
        <div className="glass-panel kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>VALUE-TO-COST ROI</span>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: 7, borderRadius: 8, color: 'var(--accent-emerald)' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--accent-emerald)' }}>
            {summary ? `${summary.roi_ratio.toFixed(2)}x` : '5.38x'}
          </div>
          <div className="kpi-sub">
            <span>Return per $1.00 AI invested</span>
          </div>
        </div>

        {/* KPI 4: Active Agents */}
        <div className="glass-panel kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>PRODUCTION AGENTS</span>
            <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: 7, borderRadius: 8, color: 'var(--accent-purple)' }}>
              <Zap size={18} />
            </div>
          </div>
          <div className="kpi-value">
            {summary ? summary.active_agents : 44}
          </div>
          <div className="kpi-sub">
            <span>{summary ? formatUSD(summary.total_hours_saved).replace('$', '') : '38,920'} hrs saved/mo</span>
          </div>
        </div>
      </div>

      {/* Action Distribution Bar */}
      <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Target size={18} color="var(--accent-cyan)" />
          <span style={{ fontSize: 14, fontWeight: 700 }}>Portfolio Action Posture:</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => onFilterAction('accelerate')}
            className="badge-status badge-accelerate"
            style={{ cursor: 'pointer', border: 'none' }}
          >
            ● ACCELERATE ({summary?.action_counts.accelerate ?? 16})
          </button>
          <button
            onClick={() => onFilterAction('optimize')}
            className="badge-status badge-optimize"
            style={{ cursor: 'pointer', border: 'none' }}
          >
            ● OPTIMIZE ({summary?.action_counts.optimize ?? 15})
          </button>
          <button
            onClick={() => onFilterAction('experiment')}
            className="badge-status badge-experiment"
            style={{ cursor: 'pointer', border: 'none' }}
          >
            ● EXPERIMENT ({summary?.action_counts.experiment ?? 6})
          </button>
          <button
            onClick={() => onFilterAction('intervene')}
            className="badge-status badge-intervene"
            style={{ cursor: 'pointer', border: 'none' }}
          >
            ● INTERVENE ({summary?.action_counts.intervene ?? 7})
          </button>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: 20
      }}>
        {/* Net Value by Function */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Net Value Generated by Function</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Monthly gross hours value minus total cost</span>
          </div>
          <div ref={functionChartRef} style={{ height: 260, width: '100%' }} />
        </div>

        {/* Cost Breakdown */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>AI Expenditure by Cost Factor</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Licences, consumption, platform, build &amp; enablement</span>
          </div>
          <div ref={costChartRef} style={{ height: 260, width: '100%' }} />
        </div>
      </div>

      {/* 6-Month Trend Row */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>6-Month AI Value &amp; ROI Realization Trajectory</h3>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Historical ramp from POC to enterprise scale (Apr 2026 – Sep 2026)</span>
        </div>
        <div ref={trendChartRef} style={{ height: 280, width: '100%' }} />
      </div>

      {/* WHERE TO ACT Urgent Table */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} color="var(--accent-rose)" />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f87171' }}>Where to Act: Executive Intervention Backlog</h3>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Agents triggered by rule engine: pass rate &lt; 88%, cost &gt; 110% budget, net value &lt; $15K, or policy incidents
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent Name</th>
                <th>Business Function</th>
                <th>Team</th>
                <th>Net Value</th>
                <th>Cost vs Budget</th>
                <th>Eval Pass Rate</th>
                <th>Incidents</th>
                <th>Recommended Remediation</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {whereToAct.map(agent => {
                const budgetPct = agent.budget > 0 ? (agent.cost / agent.budget) * 100 : 0;
                return (
                  <tr key={agent.id} style={{ cursor: 'pointer' }} onClick={() => onSelectAgent(agent)}>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{agent.name}</td>
                    <td>{agent.function}</td>
                    <td>{agent.team}</td>
                    <td style={{ fontWeight: 600, color: agent.net_value < 10000 ? '#f87171' : 'var(--text-main)' }}>
                      {formatUSD(agent.net_value)}
                    </td>
                    <td>
                      <span style={{ color: budgetPct > 110 ? '#f87171' : 'var(--text-main)', fontWeight: 600 }}>
                        {budgetPct.toFixed(0)}%
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        background: agent.eval_pass_rate < 85 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: agent.eval_pass_rate < 85 ? '#f87171' : '#fbbf24'
                      }}>
                        {formatPct(agent.eval_pass_rate)}
                      </span>
                    </td>
                    <td>
                      {agent.policy_incidents > 0 ? (
                        <span style={{ color: '#f87171', fontWeight: 700 }}>{agent.policy_incidents} alert</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>0</span>
                      )}
                    </td>
                    <td>
                      <span style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: 12,
                        color: '#e2e8f0'
                      }}>
                        {agent.suggested_action}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAgent(agent);
                        }}
                      >
                        Inspect →
                      </button>
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
