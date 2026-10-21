import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { ShieldAlert, CheckCircle } from 'lucide-react';
import { CostBreakdownItem } from '../types';
import { formatUSD } from '../api';

interface CostBudgetTabProps {
  costBreakdown: CostBreakdownItem[];
  agents: any[];
  theme?: 'dark' | 'light';
}

export const CostBudgetTab: React.FC<CostBudgetTabProps> = ({ costBreakdown, agents, theme = 'dark' }) => {
  const teamChartRef = useRef<HTMLDivElement>(null);
  const factorChartRef = useRef<HTMLDivElement>(null);

  const isLight = theme === 'light';

  // Group costs by team
  const teamsMap: Record<string, { team: string; cost: number; budget: number; function: string }> = {};
  agents.forEach(a => {
    if (!teamsMap[a.team]) {
      teamsMap[a.team] = { team: a.team, cost: 0, budget: 0, function: a.function };
    }
    teamsMap[a.team].cost += a.cost;
    teamsMap[a.team].budget += a.budget;
  });

  const teamData = Object.values(teamsMap).sort((a, b) => b.cost - a.cost);

  // Render Cost vs Budget by Team grouped bar chart
  useEffect(() => {
    if (!teamChartRef.current || !teamData.length) return;
    const chart = echarts.init(teamChartRef.current);

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: isLight ? '#FFFFFF' : '#101a33',
        borderColor: isLight ? '#D6E2FA' : 'rgba(0, 210, 255, 0.3)',
        textStyle: { color: isLight ? '#1A1A1A' : '#FFFFFF' }
      },
      legend: {
        top: 0,
        right: 10,
        textStyle: { color: isLight ? '#475569' : '#94a3b8', fontSize: 11, fontWeight: isLight ? 600 : 400 }
      },
      grid: { top: 35, right: 20, bottom: 65, left: 60 },
      xAxis: {
        type: 'category',
        data: teamData.map(t => t.team),
        axisLine: { lineStyle: { color: isLight ? 'rgba(0, 52, 155, 0.2)' : 'rgba(255,255,255,0.1)' } },
        axisLabel: {
          color: isLight ? '#475569' : '#94a3b8',
          fontSize: 10,
          fontWeight: isLight ? 600 : 400,
          interval: 0,
          rotate: 30
        }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: isLight ? 'rgba(0, 52, 155, 0.08)' : 'rgba(255,255,255,0.06)' } },
        axisLabel: {
          color: isLight ? '#475569' : '#94a3b8',
          fontSize: 10,
          formatter: (v: number) => `$${(v / 1000).toFixed(0)}k`
        }
      },
      series: [
        {
          name: 'Actual Cost',
          type: 'bar',
          data: teamData.map(t => t.cost),
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: isLight ? '#C62828' : '#f43f5e'
          }
        },
        {
          name: 'Allocated Budget',
          type: 'bar',
          data: teamData.map(t => t.budget),
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: isLight ? '#00349B' : '#3b82f6'
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
  }, [teamData, isLight]);

  // Render Cost Factor Waterfall/Horizontal Stack
  useEffect(() => {
    if (!factorChartRef.current || !costBreakdown.length) return;
    const chart = echarts.init(factorChartRef.current);

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: isLight ? '#FFFFFF' : '#101a33',
        borderColor: isLight ? '#D6E2FA' : 'rgba(0, 210, 255, 0.3)',
        textStyle: { color: isLight ? '#1A1A1A' : '#FFFFFF' }
      },
      grid: { top: 20, right: 30, bottom: 20, left: 110 },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: isLight ? 'rgba(0, 52, 155, 0.08)' : 'rgba(255,255,255,0.06)' } },
        axisLabel: {
          color: isLight ? '#475569' : '#94a3b8',
          fontSize: 10,
          formatter: (v: number) => `$${(v / 1000).toFixed(0)}k`
        }
      },
      yAxis: {
        type: 'category',
        data: costBreakdown.map(c => c.factor),
        axisLine: { lineStyle: { color: isLight ? 'rgba(0, 52, 155, 0.2)' : 'rgba(255,255,255,0.1)' } },
        axisLabel: { color: isLight ? '#1A1A1A' : '#e2e8f0', fontSize: 11, fontWeight: isLight ? 700 : 400 }
      },
      series: [
        {
          name: 'Cost',
          type: 'bar',
          data: costBreakdown.map(c => c.cost),
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
            color: isLight
              ? new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                  { offset: 0, color: '#1713FD' },
                  { offset: 1, color: '#00349B' }
                ])
              : new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                  { offset: 0, color: '#3b82f6' },
                  { offset: 1, color: '#1e3a8a' }
                ])
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
  }, [costBreakdown, isLight]);

  const totalCost = costBreakdown.reduce((acc, c) => acc + c.cost, 0);
  const totalBudget = costBreakdown.reduce((acc, c) => acc + c.budget, 0);
  const totalVariance = totalCost - totalBudget;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Cost Variance Summary Card */}
      <div className="glass-panel" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>AI Portfolio Financial Health</h3>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Comparing metered expenditure against CFO allocations for Current Billing Cycle
          </span>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Incurred Cost</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: isLight ? '#00349B' : '#fff' }}>{formatUSD(totalCost)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Plan Budget</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: isLight ? '#1713FD' : 'var(--accent-blue)' }}>{formatUSD(totalBudget)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Budget Variance</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: totalVariance <= 0 ? (isLight ? '#1B5E20' : 'var(--accent-emerald)') : (isLight ? '#C62828' : 'var(--accent-rose)') }}>
              {totalVariance <= 0 ? `${formatUSD(Math.abs(totalVariance))} under` : `${formatUSD(totalVariance)} over`}
            </div>
          </div>
        </div>
      </div>

      {/* Grouped Bar & Factor Charts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: 20
      }}>
        {/* Team Cost vs Budget */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Team Cost vs. Allocated Budget</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Identify cost anomalies across operating units</span>
          </div>
          <div ref={teamChartRef} style={{ height: 320, width: '100%' }} />
        </div>

        {/* Cost Drivers */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Cost Driver Factor Analysis</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Where AI capital is consumed</span>
          </div>
          <div ref={factorChartRef} style={{ height: 320, width: '100%' }} />
        </div>
      </div>

      {/* Cost Factor Detail Table */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Cost Factor Accounting Mart</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Factor</th>
                <th>Scope Description</th>
                <th>Actual Cost</th>
                <th>Budget Plan</th>
                <th>Variance ($)</th>
                <th>Share of AI Spend</th>
                <th>FinOps Status</th>
              </tr>
            </thead>
            <tbody>
              {costBreakdown.map((row, idx) => {
                const under = row.variance <= 0;
                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, color: isLight ? '#00349B' : '#fff' }}>{row.factor}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {row.factor === 'Licences' && 'M365 Copilot, Copilot Studio seats, Claude API licenses'}
                      {row.factor === 'Consumption' && 'Metered LLM inference tokens, agent tool executions'}
                      {row.factor === 'Platform' && 'Fabric Lakehouse compute, vector indexing, Azure AI Search'}
                      {row.factor === 'Build and run' && 'FDE engineering pods, CI/CD, evaluation harness'}
                      {row.factor === 'Enablement' && 'Change management, prompt libraries, user onboarding'}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatUSD(row.cost)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatUSD(row.budget)}</td>
                    <td style={{ color: under ? (isLight ? '#1B5E20' : '#34d399') : (isLight ? '#C62828' : '#f87171'), fontWeight: 700 }}>
                      {under ? `-$${Math.abs(row.variance).toLocaleString()}` : `+$${row.variance.toLocaleString()}`}
                    </td>
                    <td>{row.pct_of_total}%</td>
                    <td>
                      {under ? (
                        <span style={{ color: isLight ? '#1B5E20' : '#34d399', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={14} /> Within Budget
                        </span>
                      ) : (
                        <span style={{ color: isLight ? '#C62828' : '#f87171', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ShieldAlert size={14} /> Attention
                        </span>
                      )}
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
