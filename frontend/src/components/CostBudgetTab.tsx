import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  ShieldAlert, 
  CheckCircle2, 
  TrendingDown, 
  Cpu, 
  Layers, 
  Maximize2, 
  Table as TableIcon,
  X,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { CostBreakdownItem, AgentScorecardItem } from '../types';
import { formatUSD, formatPct } from '../api';

interface CostBudgetTabProps {
  costBreakdown: CostBreakdownItem[];
  agents: AgentScorecardItem[];
  selectedFunction?: string;
  customTotalCost?: number;
  customLicenseCost?: number;
  theme?: 'dark' | 'light';
}

interface CostFactorDetail {
  name: string;
  actual: number;
  budget: number;
  pctOfBudget: number;
  pctOfTotal: number;
  variance: number;
  status: 'healthy' | 'warning' | 'overrun';
  driver: string;
  remediation: string;
}

export const CostBudgetTab: React.FC<CostBudgetTabProps> = ({ 
  costBreakdown = [], 
  agents = [], 
  selectedFunction = '',
  customTotalCost,
  customLicenseCost,
  theme = 'light' 
}) => {
  const isLight = theme === 'light';
  const isScoped = Boolean(selectedFunction && selectedFunction !== 'All Functions');
  const effectiveAgents = isScoped ? agents.filter(a => a.function === selectedFunction) : agents;

  const totalActualCost = customTotalCost != null
    ? customTotalCost
    : (isScoped 
        ? effectiveAgents.reduce((s, a) => s + (a.cost || 0), 0)
        : 412000);
  const totalBudget = isScoped 
    ? effectiveAgents.reduce((s, a) => s + (a.budget || a.cost || 0), 0)
    : 425000;
  const budgetVariance = totalBudget - totalActualCost;
  const grossVal = effectiveAgents.reduce((s, a) => s + (a.gross_value || 0), 0);
  const valuePerDollar = totalActualCost > 0 ? (grossVal / totalActualCost) : 5.37;

  // Chart DOM refs
  const factorBulletChartRef = useRef<HTMLDivElement>(null);
  const treemapChartRef = useRef<HTMLDivElement>(null);
  const teamBulletChartRef = useRef<HTMLDivElement>(null);
  const momCompareChartRef = useRef<HTMLDivElement>(null);

  // Diagnostic Drawer State
  const [selectedFactor, setSelectedFactor] = useState<CostFactorDetail | null>(null);

  // Reference Cost Factor Benchmark Dataset
  const factorData: CostFactorDetail[] = [
    {
      name: 'Licences',
      actual: customLicenseCost != null ? customLicenseCost : 168000,
      budget: 170000,
      pctOfBudget: 99,
      pctOfTotal: 41,
      variance: -2000,
      status: 'healthy',
      driver: 'Enterprise Microsoft 365 Copilot user seat allocations across knowledge workers.',
      remediation: 'Seat utilization is at 84%. Reclaim inactive licenses past 30-day dormant threshold.'
    },
    {
      name: 'Platform',
      actual: 72000,
      budget: 75000,
      pctOfBudget: 96,
      pctOfTotal: 17,
      variance: -3000,
      status: 'healthy',
      driver: 'Dedicated GPU inference endpoints, Azure OpenAI instances, and vector indexing services.',
      remediation: 'Autoscale down off-peak embedding worker pools between 10 PM and 6 AM UTC.'
    },
    {
      name: 'Engineering tokens',
      actual: 55000,
      budget: 60000,
      pctOfBudget: 92,
      pctOfTotal: 13,
      variance: -5000,
      status: 'healthy',
      driver: 'High-tier frontier models (Claude 3.5 Sonnet & GPT-4o) used by Software Engineering & DevOps.',
      remediation: 'Enable prompt caching on code generation tools to lower recurring token costs by 24%.'
    },
    {
      name: 'Build and run',
      actual: 52000,
      budget: 55000,
      pctOfBudget: 95,
      pctOfTotal: 13,
      variance: -3000,
      status: 'healthy',
      driver: 'Continuous eval regression test harnesses, telemetry ingestion, and agent orchestration pipelines.',
      remediation: 'Run full 500-case eval test sets on pull request merges rather than per commit.'
    },
    {
      name: 'Other tokens',
      actual: 41000,
      budget: 40000,
      pctOfBudget: 102,
      pctOfTotal: 10,
      variance: 1000,
      status: 'overrun',
      driver: 'Un-cached ERP invoice extraction retry loops and unstructured PDF OCR processing.',
      remediation: 'Enforce maximum 4k context limits and move OCR pre-processing to lighter extraction models.'
    },
    {
      name: 'Enablement',
      actual: 24000,
      budget: 25000,
      pctOfBudget: 96,
      pctOfTotal: 6,
      variance: -1000,
      status: 'healthy',
      driver: 'Prompt engineering coaching, prompt safety reviews, and enterprise domain fine-tuning.',
      remediation: 'Conduct scheduled department bootcamps to elevate prompt efficiency.'
    }
  ];

  // Team Cost vs Budget Calculation from real agents data
  const teamsMap: Record<string, { team: string; cost: number; budget: number; function: string }> = {};
  agents.forEach(a => {
    if (!teamsMap[a.team]) {
      teamsMap[a.team] = { 
        team: a.team, 
        cost: 0, 
        budget: 0, 
        function: a.function 
      };
    }
    teamsMap[a.team].cost += a.cost || 0;
    teamsMap[a.team].budget += a.budget || a.cost || 1;
  });

  // Supplement with reference teams if empty
  const teamSpendData = Object.keys(teamsMap).length > 0 ? Object.values(teamsMap) : [
    { team: 'M365 Copilot (all)', cost: 210000, budget: 220000, function: 'Enterprise' },
    { team: 'Software Engineering', cost: 39000, budget: 33000, function: 'Eng & IT' },
    { team: 'IT Service Desk', cost: 27000, budget: 30000, function: 'Eng & IT' },
    { team: 'Customer Service', cost: 22000, budget: 24000, function: 'Customer' },
    { team: 'Product Support', cost: 18000, budget: 20000, function: 'Customer' },
    { team: 'Sales', cost: 16000, budget: 18000, function: 'Sales' },
    { team: 'Supply Chain', cost: 14000, budget: 15000, function: 'Operations' },
    { team: 'DevOps & SRE', cost: 12000, budget: 13000, function: 'Eng & IT' },
    { team: 'Planning', cost: 9000, budget: 10000, function: 'Operations' },
    { team: 'Warranty & Returns', cost: 7000, budget: 8000, function: 'Customer' },
  ];

  // Sort descending by cost
  teamSpendData.sort((a, b) => b.cost - a.cost);

  // Chart 1: Cost vs Budget by Cost Factor (Horizontal Bullet Bar Chart with Target Markers)
  useEffect(() => {
    if (!factorBulletChartRef.current) return;
    const chart = echarts.init(factorBulletChartRef.current);

    const sorted = [...factorData].reverse();

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#FFFFFF',
        borderColor: '#D6E2FA',
        borderWidth: 1,
        textStyle: { color: '#0F172A', fontFamily: 'Figtree, sans-serif' },
        formatter: (params: any) => {
          const item = sorted[params[0].dataIndex];
          const isOver = item.pctOfBudget > 100;
          return `<div style="padding: 4px;">
            <b style="color: #00349B; font-size: 13px;">${item.name}</b><br/>
            Actual Spend: <b>${formatUSD(item.actual)}</b> (${item.pctOfBudget}% of budget)<br/>
            Budget Cap: <b>${formatUSD(item.budget)}</b><br/>
            Variance: <b style="color: ${isOver ? '#C62828' : '#16A34A'};">${isOver ? '+' : ''}${formatUSD(item.variance)}</b>
            <div style="color: #1713FD; font-size: 11px; margin-top: 4px;">Click to view root cause breakdown →</div>
          </div>`;
        }
      },
      legend: {
        top: 0,
        left: 0,
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { color: '#475569', fontSize: 11, fontWeight: 600 },
        data: ['Actual cost', 'Budget']
      },
      grid: { top: 35, right: 65, bottom: 25, left: 140 },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } },
        axisLabel: {
          color: '#64748B',
          fontSize: 11,
          formatter: (v: number) => `$${(v / 1000).toFixed(0)}K`
        }
      },
      yAxis: {
        type: 'category',
        data: sorted.map(f => f.name),
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisTick: { show: false },
        axisLabel: { color: '#0F172A', fontSize: 12, fontWeight: 600 }
      },
      series: [
        {
          name: 'Actual cost',
          type: 'bar',
          barWidth: 16,
          data: sorted.map(f => ({
            value: f.actual,
            itemStyle: {
              color: f.pctOfBudget > 100 ? '#E0A100' : '#2E7D32',
              borderRadius: [0, 4, 4, 0]
            }
          })),
          label: {
            show: true,
            position: 'right',
            formatter: (p: any) => `${sorted[p.dataIndex].pctOfBudget}%`,
            color: '#334155',
            fontWeight: 700,
            fontSize: 11.5
          }
        },
        {
          name: 'Budget',
          type: 'scatter',
          symbol: 'rect',
          symbolSize: [3, 24],
          data: sorted.map(f => f.budget),
          itemStyle: { color: '#0B1F4D' },
          z: 10
        }
      ]
    });

    chart.on('click', (params: any) => {
      const item = sorted[params.dataIndex];
      if (item) setSelectedFactor(item);
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, []);

  // Chart 2: AI Cost by Factor (ECharts Treemap)
  useEffect(() => {
    if (!treemapChartRef.current) return;
    const chart = echarts.init(treemapChartRef.current);

    const treemapData = factorData.map((f, idx) => {
      const colors = ['#00349B', '#0A2540', '#1713FD', '#1E40AF', '#2563EB', '#607D8B'];
      return {
        name: f.name,
        value: f.actual,
        pct: f.pctOfTotal,
        itemStyle: {
          color: colors[idx % colors.length],
          borderColor: '#FFFFFF',
          borderWidth: 2
        }
      };
    });

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#FFFFFF',
        borderColor: '#D6E2FA',
        borderWidth: 1,
        textStyle: { color: '#0F172A' },
        formatter: (params: any) => {
          return `<div style="padding: 4px;">
            <b style="color: #00349B; font-size: 13px;">${params.name}</b><br/>
            Monthly Cost: <b>${formatUSD(params.value)}</b><br/>
            Share of Total Spend: <b>${params.data.pct}%</b>
          </div>`;
        }
      },
      series: [
        {
          name: 'AI Cost by Factor',
          type: 'treemap',
          width: '100%',
          height: '100%',
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          label: {
            show: true,
            position: 'insideTopLeft',
            formatter: (p: any) => {
              return `{name|${p.name}}\n{val|${formatUSD(p.value)} · ${p.data.pct}%}`;
            },
            rich: {
              name: {
                color: '#FFFFFF',
                fontSize: 12.5,
                fontWeight: 700,
                lineHeight: 18
              },
              val: {
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: 11,
                fontWeight: 600
              }
            }
          },
          itemStyle: {
            borderRadius: 4
          },
          data: treemapData
        }
      ]
    });

    chart.on('click', (params: any) => {
      const found = factorData.find(f => f.name === params.name);
      if (found) setSelectedFactor(found);
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, []);

  // Chart 3: Cost vs Budget by Team (Horizontal Bullet Bar Chart)
  useEffect(() => {
    if (!teamBulletChartRef.current) return;
    const chart = echarts.init(teamBulletChartRef.current);

    const topTeams = [...teamSpendData].slice(0, 10).reverse();

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#FFFFFF',
        borderColor: '#D6E2FA',
        borderWidth: 1,
        textStyle: { color: '#0F172A' },
        formatter: (params: any) => {
          const item = topTeams[params[0].dataIndex];
          const pct = Math.round((item.cost / item.budget) * 100);
          const isOver = pct > 100;
          return `<div style="padding: 4px;">
            <b style="color: #00349B; font-size: 13px;">${item.team}</b><br/>
            Actual Spend: <b>${formatUSD(item.cost)}</b> (${pct}% of budget)<br/>
            Budget Cap: <b>${formatUSD(item.budget)}</b><br/>
            Status: <b style="color: ${isOver ? '#C62828' : '#16A34A'};">${isOver ? 'OVER BUDGET' : 'WITHIN BUDGET'}</b>
          </div>`;
        }
      },
      legend: {
        top: 0,
        left: 0,
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { color: '#475569', fontSize: 11, fontWeight: 600 },
        data: ['Actual cost', 'Budget']
      },
      grid: { top: 35, right: 65, bottom: 25, left: 160 },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } },
        axisLabel: {
          color: '#64748B',
          fontSize: 10,
          formatter: (v: number) => `$${(v / 1000).toFixed(0)}K`
        }
      },
      yAxis: {
        type: 'category',
        data: topTeams.map(t => t.team),
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisTick: { show: false },
        axisLabel: { color: '#0F172A', fontSize: 11.5, fontWeight: 600 }
      },
      series: [
        {
          name: 'Actual cost',
          type: 'bar',
          barWidth: 14,
          data: topTeams.map(t => {
            const pct = Math.round((t.cost / t.budget) * 100);
            return {
              value: t.cost,
              itemStyle: {
                color: pct > 100 ? '#C62828' : '#2E7D32',
                borderRadius: [0, 4, 4, 0]
              }
            };
          }),
          label: {
            show: true,
            position: 'right',
            formatter: (p: any) => {
              const item = topTeams[p.dataIndex];
              return `${Math.round((item.cost / item.budget) * 100)}%`;
            },
            color: '#334155',
            fontWeight: 700,
            fontSize: 11
          }
        },
        {
          name: 'Budget',
          type: 'scatter',
          symbol: 'rect',
          symbolSize: [3, 20],
          data: topTeams.map(t => t.budget),
          itemStyle: { color: '#0B1F4D' },
          z: 10
        }
      ]
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [teamSpendData]);

  // Chart 4: Cost by Factor, Aug vs Sep (Grouped Bar Chart)
  useEffect(() => {
    if (!momCompareChartRef.current) return;
    const chart = echarts.init(momCompareChartRef.current);

    const categories = ['Enablement', 'Build and run', 'Platform', 'Consumption', 'Licences'];
    const augValues = [22000, 50000, 68000, 90000, 160000];
    const sepValues = [24000, 52000, 72000, 96000, 168000];

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#FFFFFF',
        borderColor: '#D6E2FA',
        borderWidth: 1,
        textStyle: { color: '#0F172A' },
        formatter: (params: any) => {
          let html = `<div style="padding: 4px;"><b style="color: #00349B;">${params[0].name}</b><br/>`;
          params.forEach((p: any) => {
            html += `<span style="color: ${p.color};">●</span> ${p.seriesName}: <b>${formatUSD(p.value)}</b><br/>`;
          });
          html += `</div>`;
          return html;
        }
      },
      legend: {
        top: 0,
        left: 0,
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { color: '#475569', fontSize: 11, fontWeight: 600 }
      },
      grid: { top: 35, right: 65, bottom: 25, left: 120 },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } },
        axisLabel: {
          color: '#64748B',
          fontSize: 10,
          formatter: (v: number) => `$${(v / 1000).toFixed(0)}K`
        }
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisTick: { show: false },
        axisLabel: { color: '#0F172A', fontSize: 11.5, fontWeight: 600 }
      },
      series: [
        {
          name: 'Aug 2026',
          type: 'bar',
          barWidth: 11,
          data: augValues,
          itemStyle: {
            color: '#92A8D1',
            borderRadius: [0, 3, 3, 0]
          }
        },
        {
          name: 'Sep 2026',
          type: 'bar',
          barWidth: 11,
          data: sepValues,
          itemStyle: {
            color: '#00349B',
            borderRadius: [0, 3, 3, 0]
          },
          label: {
            show: true,
            position: 'right',
            formatter: (p: any) => formatUSD(p.value),
            color: '#00349B',
            fontWeight: 700,
            fontSize: 11
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
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Month Subtitle Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          padding: '4px 14px',
          borderRadius: 20,
          fontSize: 12.5,
          fontWeight: 600,
          color: '#00349B'
        }}>
          <span>Reporting Month:</span>
          <span style={{ fontWeight: 800 }}>Sep 2026</span>
        </div>

        <div style={{ fontSize: 12, color: '#64748B' }}>
          Where the money goes, and how spend tracks against budget.
        </div>
      </div>

      {/* Scoped Function FinOps Banner */}
      {isScoped && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#EFF6FF',
          border: '1.5px solid #BFDBFE',
          padding: '10px 16px',
          borderRadius: 10,
          color: '#1E40AF',
          fontSize: 13,
          fontWeight: 600
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#00349B', color: '#FFFFFF', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 800 }}>
              FUNCTION SPEND SCOPED
            </span>
            <span>
              FinOps tracking filtered to <b>{selectedFunction}</b> ({effectiveAgents.length} agents · {formatUSD(totalActualCost)} spend)
            </span>
          </div>
        </div>
      )}

      {/* Top 5 FinOps KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 14
      }}>
        {/* KPI 1: TOTAL AI COST (Hero Midnight Gradient Card) */}
        <div className="executive-card" style={{
          background: 'linear-gradient(135deg, #0A2540 0%, #00349B 100%)',
          borderRadius: 12,
          padding: '16px 18px',
          color: '#FFFFFF',
          boxShadow: '0 8px 24px -4px rgba(0, 52, 155, 0.28)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 120,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, #38BDF8, #818CF8)'
          }} />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#93C5FD'
              }}>
                TOTAL AI COST
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                background: 'rgba(255, 255, 255, 0.18)',
                backdropFilter: 'blur(8px)',
                color: '#FFFFFF',
                padding: '2px 7px',
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.25)'
              }}>
                Monthly FinOps
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
              <div style={{ fontSize: 29, fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>
                {formatUSD(totalActualCost)}
              </div>
              <svg width="56" height="20" viewBox="0 0 56 20" fill="none" style={{ marginBottom: 4 }}>
                <path d="M2 14 L14 11 L28 12 L42 8 L54 6" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="54" cy="6" r="2.5" fill="#38BDF8" />
              </svg>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, color: '#93C5FD', marginTop: 6 }}>
            <ArrowUpRight size={14} /> +3.2% vs Aug ($399K)
          </div>
        </div>

        {/* KPI 2: BUDGET VARIANCE */}
        <div className="executive-card" style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 16px -4px rgba(0, 52, 155, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 120,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, #10B981, #34D399)'
          }} />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#64748B'
              }}>
                BUDGET VARIANCE
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                background: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
                padding: '2px 7px',
                borderRadius: 12
              }}>
                Favorable
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
              <div style={{ fontSize: 29, fontWeight: 800, letterSpacing: '-0.02em', color: '#059669', fontFamily: 'Outfit, sans-serif' }}>
                {formatUSD(Math.abs(budgetVariance))}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#D1FAE5', padding: '2px 6px', borderRadius: 4, marginBottom: 4 }}>
                Under Target
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, color: '#16A34A', marginTop: 6 }}>
            3.1% under budget of $425K
          </div>
        </div>

        {/* KPI 3: VALUE PER $1 SPENT */}
        <div className="executive-card" style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 16px -4px rgba(0, 52, 155, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 120,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, #00349B, #3B82F6)'
          }} />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#64748B'
              }}>
                VALUE PER $1 SPENT
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                background: '#EFF6FF',
                color: '#00349B',
                border: '1px solid #BFDBFE',
                padding: '2px 7px',
                borderRadius: 12
              }}>
                5.37x Return
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
              <div style={{ fontSize: 29, fontWeight: 800, letterSpacing: '-0.02em', color: '#00349B', fontFamily: 'Outfit, sans-serif' }}>
                ${valuePerDollar.toFixed(2)}
              </div>
              <svg width="56" height="20" viewBox="0 0 56 20" fill="none" style={{ marginBottom: 4 }}>
                <path d="M2 15 L14 12 L28 9 L42 6 L54 3" stroke="#00349B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="54" cy="3" r="2.5" fill="#00349B" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 6 }}>
            Gross value ÷ cost · prior $4.97
          </div>
        </div>

        {/* KPI 4: COST PER HOUR SAVED */}
        <div className="executive-card" style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 16px -4px rgba(0, 52, 155, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 120,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, #10B981, #059669)'
          }} />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#64748B'
              }}>
                COST PER HOUR SAVED
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                background: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
                padding: '2px 7px',
                borderRadius: 12
              }}>
                Efficiency
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
              <div style={{ fontSize: 29, fontWeight: 800, letterSpacing: '-0.02em', color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}>
                $15.85
              </div>
              <svg width="56" height="20" viewBox="0 0 56 20" fill="none" style={{ marginBottom: 4 }}>
                <path d="M2 5 L14 7 L28 10 L42 12 L54 16" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="54" cy="16" r="2.5" fill="#10B981" />
              </svg>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, color: '#16A34A', marginTop: 6 }}>
            <TrendingDown size={14} /> -6.1% vs Aug ($16.88)
          </div>
        </div>

        {/* KPI 5: ENGINEERING TOKENS */}
        <div className="executive-card" style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 16px -4px rgba(0, 52, 155, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 120,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, #64748B, #94A3B8)'
          }} />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#64748B'
              }}>
                ENGINEERING TOKENS
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                background: '#F1F5F9',
                color: '#475569',
                border: '1px solid #E2E8F0',
                padding: '2px 7px',
                borderRadius: 12
              }}>
                Target $60K
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
              <div style={{ fontSize: 29, fontWeight: 800, letterSpacing: '-0.02em', color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}>
                92%
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                $55K spent
              </span>
            </div>
          </div>
          <div style={{ marginTop: 6 }}>
            <div style={{ height: 5, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: '92%', height: '100%', background: '#00349B', borderRadius: 3 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Cost vs Budget by Factor & AI Cost by Factor Treemap */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: 16
      }}>
        {/* Cost vs Budget by Factor */}
        <div className="executive-card" style={{
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          borderRadius: 12,
          padding: '18px 20px',
          boxShadow: '0 4px 16px rgba(0, 52, 155, 0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#00349B', fontFamily: 'Satoshi, sans-serif' }}>
                Cost vs budget by cost factor
              </h4>
              <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                Bar = actual · marker = budget · not filtered by Function or Portfolio
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', background: '#F1F5F9', padding: '3px 8px', borderRadius: 4 }}>
              Click bar for diagnostics
            </span>
          </div>
          <div ref={factorBulletChartRef} style={{ height: 280, width: '100%' }} />
        </div>

        {/* AI Cost by Factor Treemap */}
        <div className="executive-card" style={{
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          borderRadius: 12,
          padding: '18px 20px',
          boxShadow: '0 4px 16px rgba(0, 52, 155, 0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#00349B', fontFamily: 'Satoshi, sans-serif' }}>
                AI cost by factor
              </h4>
              <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                Share of monthly AI cost · not filtered by Function or Portfolio
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={{
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: 4,
                padding: '3px 8px',
                fontSize: 11,
                fontWeight: 600,
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer'
              }}>
                <TableIcon size={12} /> Table
              </button>
              <button style={{
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: 4,
                padding: '3px 8px',
                fontSize: 11,
                fontWeight: 600,
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer'
              }}>
                <Maximize2 size={12} /> Focus
              </button>
            </div>
          </div>
          <div ref={treemapChartRef} style={{ height: 280, width: '100%' }} />
        </div>
      </div>

      {/* Bottom Row: Cost vs Budget by Team & Cost by Factor Aug vs Sep */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: 16
      }}>
        {/* Cost vs Budget by Team */}
        <div className="executive-card" style={{
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          borderRadius: 12,
          padding: '18px 20px',
          boxShadow: '0 4px 16px rgba(0, 52, 155, 0.08)'
        }}>
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#00349B', fontFamily: 'Satoshi, sans-serif' }}>
              Cost vs budget by team
            </h4>
            <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
              Bar colour = cost vs budget status · marker = budget
            </div>
          </div>
          <div ref={teamBulletChartRef} style={{ height: 380, width: '100%' }} />
        </div>

        {/* Cost by Factor, Aug vs Sep */}
        <div className="executive-card" style={{
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          borderRadius: 12,
          padding: '18px 20px',
          boxShadow: '0 4px 16px rgba(0, 52, 155, 0.08)'
        }}>
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#00349B', fontFamily: 'Satoshi, sans-serif' }}>
              Cost by factor, Aug vs Sep
            </h4>
            <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
              Both months · ignores Month slicer
            </div>
          </div>
          <div ref={momCompareChartRef} style={{ height: 380, width: '100%' }} />
        </div>
      </div>

      {/* Slide-over FinOps Cost Diagnostic Drawer */}
      {selectedFactor && (
        <div className="executive-drawer-overlay" onClick={() => setSelectedFactor(null)}>
          <div className="executive-drawer" onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              background: '#F8FAFC'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: selectedFactor.status === 'overrun' ? '#FEE2E2' : '#DCFCE7',
                    color: selectedFactor.status === 'overrun' ? '#B91C1C' : '#15803D'
                  }}>
                    {selectedFactor.status === 'overrun' ? 'BUDGET OVERRUN' : 'WITHIN BUDGET'}
                  </span>
                  <span style={{ fontSize: 12, color: '#64748B' }}>
                    {selectedFactor.pctOfTotal}% of Total Estate Spend
                  </span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {selectedFactor.name}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedFactor(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: 4
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Financial Variance Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>ACTUAL SPEND</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#00349B', marginTop: 2 }}>
                    {formatUSD(selectedFactor.actual)}
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>BUDGET CAP</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                    {formatUSD(selectedFactor.budget)}
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>BUDGET CONSUMPTION</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: selectedFactor.pctOfBudget > 100 ? '#C62828' : '#16A34A', marginTop: 2 }}>
                    {selectedFactor.pctOfBudget}%
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>VARIANCE</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: selectedFactor.variance > 0 ? '#C62828' : '#16A34A', marginTop: 2 }}>
                    {selectedFactor.variance > 0 ? '+' : ''}{formatUSD(selectedFactor.variance)}
                  </div>
                </div>
              </div>

              {/* Spend Driver Diagnosis */}
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 8,
                padding: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <ShieldAlert size={16} color="#DC2626" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#991B1B' }}>
                    FinOps Spend Driver Telemetry
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: '#7F1D1D' }}>
                  {selectedFactor.driver}
                </p>
              </div>

              {/* FinOps Remediation Action */}
              <div style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: 8,
                padding: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Sparkles size={16} color="#2563EB" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1E40AF' }}>
                    Recommended Cost Optimization
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: '#1E3A8A' }}>
                  {selectedFactor.remediation}
                </p>
              </div>

              <button
                onClick={() => setSelectedFactor(null)}
                style={{
                  background: '#00349B',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                Close Diagnostic View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
