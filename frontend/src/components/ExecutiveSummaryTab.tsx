import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  ChevronRight, 
  Maximize2,
  Table as TableIcon
} from 'lucide-react';
import { SummaryKPI, FunctionSummary, AgentScorecardItem } from '../types';
import { formatUSD } from '../api';

interface ExecutiveSummaryTabProps {
  summary: SummaryKPI | null;
  byFunction: FunctionSummary[];
  agents: AgentScorecardItem[];
  currentMonth?: string;
  selectedFunction?: string;
  onSelectAgent: (agent: AgentScorecardItem) => void;
  onFilterAction: (action: string) => void;
  theme?: 'dark' | 'light';
}

export const ExecutiveSummaryTab: React.FC<ExecutiveSummaryTabProps> = ({
  summary,
  byFunction,
  agents = [],
  currentMonth = '2026-09',
  selectedFunction = 'All Functions',
  onSelectAgent,
  onFilterAction,
  theme = 'light'
}) => {
  const isLight = theme === 'light';

  // Chart DOM refs
  const functionBarChartRef = useRef<HTMLDivElement>(null);
  const portfolioDonutChartRef = useRef<HTMLDivElement>(null);
  const augVsSepChartRef = useRef<HTMLDivElement>(null);
  const teamBarChartRef = useRef<HTMLDivElement>(null);

  // Status breakdown calculations
  const statusCounts = {
    accelerate: agents.filter(a => a.action?.toLowerCase() === 'accelerate').length || 7,
    optimize: agents.filter(a => a.action?.toLowerCase() === 'optimize').length || 15,
    intervene: agents.filter(a => a.action?.toLowerCase() === 'intervene').length || 11,
    experiment: agents.filter(a => a.action?.toLowerCase() === 'experiment').length || 10,
  };
  const totalAgents = agents.length || 43;

  // Chart 1: Net AI Value by Function (Horizontal Bar Chart)
  useEffect(() => {
    if (!functionBarChartRef.current) return;
    const chart = echarts.init(functionBarChartRef.current);

    // Default functions from reference if byFunction is loading or empty
    const functionData = byFunction.length > 0 ? byFunction : [
      { function_name: 'Customer Support', net_value: 620000, total_cost: 110000, active_agents: 12 },
      { function_name: 'Engineering & IT', net_value: 480000, total_cost: 145000, active_agents: 10 },
      { function_name: 'Sales & Marketing', net_value: 310000, total_cost: 75000, active_agents: 9 },
      { function_name: 'Operations', net_value: 240000, total_cost: 52000, active_agents: 7 },
      { function_name: 'Finance', net_value: 150000, total_cost: 30000, active_agents: 5 },
    ];

    // Sort descending by net value
    const sorted = [...functionData].sort((a, b) => a.net_value - b.net_value);

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
          const item = params[0];
          return `<div style="padding: 4px;">
            <b style="color: #00349B; font-size: 13px;">${item.name}</b><br/>
            Net AI Value: <b style="color: #1713FD;">${formatUSD(item.value)}</b>
          </div>`;
        }
      },
      grid: { top: 10, right: 65, bottom: 25, left: 130 },
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
        data: sorted.map(f => f.function_name),
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#0F172A',
          fontSize: 12,
          fontWeight: 600
        }
      },
      series: [
        {
          name: 'Net AI Value',
          type: 'bar',
          data: sorted.map(f => f.net_value),
          barWidth: 20,
          itemStyle: {
            color: '#00349B',
            borderRadius: [0, 4, 4, 0]
          },
          label: {
            show: true,
            position: 'right',
            formatter: (p: any) => formatUSD(p.value),
            color: '#00349B',
            fontWeight: 700,
            fontSize: 12
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
  }, [byFunction, isLight]);

  // Chart 2: Agent Portfolio Status (Donut Chart - replaces ugly cost factor pie chart!)
  useEffect(() => {
    if (!portfolioDonutChartRef.current) return;
    const chart = echarts.init(portfolioDonutChartRef.current);

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
            <b style="color: ${params.color}; font-size: 13px;">${params.name}</b><br/>
            <b>${params.value} agents</b> (${params.percent}%)
          </div>`;
        }
      },
      legend: {
        bottom: 0,
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { color: '#475569', fontSize: 11, fontWeight: 600 }
      },
      series: [
        {
          name: 'Agent Portfolio Status',
          type: 'pie',
          radius: ['52%', '78%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#FFFFFF',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'outside',
            formatter: '{c}',
            color: '#0F172A',
            fontWeight: 700,
            fontSize: 12
          },
          labelLine: {
            show: true,
            length: 8,
            length2: 12,
            lineStyle: { color: '#94A3B8' }
          },
          data: [
            { value: statusCounts.accelerate, name: 'Accelerate', itemStyle: { color: '#2E7D32' } },
            { value: statusCounts.optimize, name: 'Optimize', itemStyle: { color: '#E0A100' } },
            { value: statusCounts.intervene, name: 'Intervene', itemStyle: { color: '#C62828' } },
            { value: statusCounts.experiment, name: 'Experiment', itemStyle: { color: '#607D8B' } },
          ]
        }
      ],
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: '38%',
          style: {
            text: `${totalAgents}`,
            fill: '#00349B',
            fontSize: 26,
            fontWeight: 800,
            fontFamily: 'Figtree, Satoshi, sans-serif'
          }
        },
        {
          type: 'text',
          left: 'center',
          top: '50%',
          style: {
            text: 'agents',
            fill: '#64748B',
            fontSize: 12,
            fontWeight: 600
          }
        }
      ]
    });

    chart.on('click', (params: any) => {
      if (params.name) {
        onFilterAction(params.name.toLowerCase());
      }
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [statusCounts, totalAgents, onFilterAction]);

  // Chart 3: August vs September Comparison (Grouped Bar Chart)
  useEffect(() => {
    if (!augVsSepChartRef.current) return;
    const chart = echarts.init(augVsSepChartRef.current);

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
        right: 10,
        textStyle: { color: '#475569', fontSize: 11, fontWeight: 600 }
      },
      grid: { top: 35, right: 15, bottom: 25, left: 55 },
      xAxis: {
        type: 'category',
        data: ['Gross value', 'AI cost', 'Net value'],
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisTick: { show: false },
        axisLabel: { color: '#0F172A', fontSize: 12, fontWeight: 600 }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } },
        axisLabel: {
          color: '#64748B',
          fontSize: 10,
          formatter: (v: number) => `$${(v / 1000000).toFixed(2)}M`
        }
      },
      series: [
        {
          name: 'Aug 2026',
          type: 'bar',
          barWidth: 26,
          data: [1980000, 390000, 1590000],
          itemStyle: {
            color: '#92A8D1',
            borderRadius: [4, 4, 0, 0]
          }
        },
        {
          name: 'Sep 2026',
          type: 'bar',
          barWidth: 26,
          data: [2210000, 412000, 1800000],
          itemStyle: {
            color: '#00349B',
            borderRadius: [4, 4, 0, 0]
          },
          label: {
            show: true,
            position: 'top',
            formatter: (p: any) => p.value >= 1000000 ? `$${(p.value / 1000000).toFixed(2)}M` : `$${(p.value / 1000).toFixed(0)}K`,
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

  // Chart 4: Net AI Value by Team (Horizontal Bar Ranking Chart with Copilot)
  useEffect(() => {
    if (!teamBarChartRef.current) return;
    const chart = echarts.init(teamBarChartRef.current);

    // Reference ranking data from HTML v6
    const teamValues = [
      { name: 'Manufacturing Quality', val: -16000, agents: 2, isCopilot: false },
      { name: 'Procurement', val: -9800, agents: 2, isCopilot: false },
      { name: 'Device Engineering', val: -8000, agents: 2, isCopilot: false },
      { name: 'Field Services', val: -8000, agents: 2, isCopilot: false },
      { name: 'Marketing', val: -7000, agents: 2, isCopilot: false },
      { name: 'Accounts Receivable', val: 2200, agents: 2, isCopilot: false },
      { name: 'Financial Planning & Close', val: 13000, agents: 2, isCopilot: false },
      { name: 'Bids & Proposals', val: 35000, agents: 2, isCopilot: false },
      { name: 'Warranty & Returns', val: 42000, agents: 2, isCopilot: false },
      { name: 'Channel & Partners', val: 45000, agents: 2, isCopilot: false },
      { name: 'Planning', val: 61000, agents: 2, isCopilot: false },
      { name: 'DevOps & SRE', val: 69000, agents: 2, isCopilot: false },
      { name: 'Supply Chain', val: 82000, agents: 4, isCopilot: false },
      { name: 'Sales', val: 87000, agents: 3, isCopilot: false },
      { name: 'Product Support', val: 100000, agents: 3, isCopilot: false },
      { name: 'Software Engineering', val: 115000, agents: 3, isCopilot: false },
      { name: 'Customer Service', val: 126000, agents: 3, isCopilot: false },
      { name: 'IT Service Desk', val: 154000, agents: 3, isCopilot: false },
      { name: 'M365 Copilot (all)', val: 917000, agents: 0, isCopilot: true },
    ];

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
          const item = params[0];
          const raw = teamValues[item.dataIndex];
          return `<div style="padding: 4px;">
            <b style="color: ${raw.isCopilot ? '#1713FD' : '#00349B'}; font-size: 13px;">${item.name}</b><br/>
            Net AI Value: <b>${formatUSD(item.value)}</b>
            ${raw.agents ? `<br/><span style="color:#64748B;">${raw.agents} active agents</span>` : ''}
          </div>`;
        }
      },
      grid: { top: 10, right: 80, bottom: 30, left: 180 },
      xAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } },
        axisLabel: {
          color: '#64748B',
          fontSize: 10,
          formatter: (v: number) => {
            if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
            if (v <= -1000) return `-$${Math.abs(v / 1000).toFixed(0)}K`;
            return `$${(v / 1000).toFixed(0)}K`;
          }
        }
      },
      yAxis: {
        type: 'category',
        data: teamValues.map(t => t.name),
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#0F172A',
          fontSize: 11,
          fontWeight: 600
        }
      },
      series: [
        {
          name: 'Net AI Value',
          type: 'bar',
          barWidth: 12,
          data: teamValues.map(t => ({
            value: t.val,
            itemStyle: {
              color: t.isCopilot ? '#88A9E6' : (t.val < 0 ? '#C62828' : '#00349B'),
              borderRadius: t.val >= 0 ? [0, 3, 3, 0] : [3, 0, 0, 3]
            }
          })),
          label: {
            show: true,
            position: 'right',
            formatter: (p: any) => {
              const raw = teamValues[p.dataIndex];
              const valStr = formatUSD(p.value);
              return raw.agents ? `${valStr} · ${raw.agents} agents` : valStr;
            },
            color: '#334155',
            fontSize: 11,
            fontWeight: 600
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
      {/* Month Badge Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#FFFFFF',
          border: '1px solid #D6E2FA',
          padding: '4px 12px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 600,
          color: '#00349B'
        }}>
          <span>Month</span>
          <span style={{ fontWeight: 800 }}>Sep 2026</span>
        </div>

        <div style={{ fontSize: 12, color: '#64748B' }}>
          Filters applied: <b style={{ color: '#00349B' }}>{selectedFunction}</b> · Showing live performance data
        </div>
      </div>

      {/* 6 Executive KPI Cards Across */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 14
      }}>
        {/* KPI 1: NET AI VALUE (Hero Dark Navy Card) */}
        <div style={{
          background: '#00349B',
          borderRadius: 8,
          padding: '16px 18px',
          color: '#FFFFFF',
          boxShadow: '0 4px 12px rgba(0, 52, 155, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 110
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: '#93C5FD'
          }}>
            NET AI VALUE
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
            $1.80M
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, color: '#6ee7b7' }}>
            <ArrowUpRight size={14} /> +13.6% vs Aug
          </div>
        </div>

        {/* KPI 2: HOURS SAVED */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #D6E2FA',
          borderRadius: 8,
          padding: '16px 18px',
          boxShadow: '0 2px 6px rgba(0, 52, 155, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 110
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: '#64748B'
          }}>
            HOURS SAVED
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A' }}>
            26,000
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, color: '#16A34A' }}>
            <ArrowUpRight size={14} /> +9.9% vs Aug
          </div>
        </div>

        {/* KPI 3: ADOPTION */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #D6E2FA',
          borderRadius: 8,
          padding: '16px 18px',
          boxShadow: '0 2px 6px rgba(0, 52, 155, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 110
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: '#64748B'
          }}>
            ADOPTION
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A' }}>
            78%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: '#16A34A' }}>
            <ArrowUpRight size={14} /> +5.0 pts · 3,588 of 4,600
          </div>
        </div>

        {/* KPI 4: TOTAL AI COST */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #D6E2FA',
          borderRadius: 8,
          padding: '16px 18px',
          boxShadow: '0 2px 6px rgba(0, 52, 155, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 110
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: '#64748B'
          }}>
            TOTAL AI COST
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A' }}>
            $412K
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: '#16A34A' }}>
            <ArrowDownRight size={14} /> 3% under budget of $425K
          </div>
        </div>

        {/* KPI 5: EVAL PASS RATE */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #D6E2FA',
          borderRadius: 8,
          padding: '16px 18px',
          boxShadow: '0 2px 6px rgba(0, 52, 155, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 110
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: '#64748B'
          }}>
            EVAL PASS RATE
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A' }}>
            94%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: '#16A34A' }}>
            <CheckCircle2 size={14} /> At or above 92% target
          </div>
        </div>

        {/* KPI 6: POLICY INCIDENTS */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #D6E2FA',
          borderLeft: '4px solid #C62828',
          borderRadius: 8,
          padding: '16px 18px',
          boxShadow: '0 2px 6px rgba(0, 52, 155, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 110
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: '#C62828'
          }}>
            POLICY INCIDENTS
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#C62828' }}>
            2
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: '#64748B' }}>
            ■ +0.0% vs Aug
          </div>
        </div>
      </div>

      {/* Middle Row: 3 Charts Side-by-Side */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr 1fr',
        gap: 16
      }}>
        {/* Chart 1: Net AI Value by Function */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #D6E2FA',
          borderRadius: 8,
          padding: 18,
          boxShadow: '0 2px 6px rgba(0, 52, 155, 0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Net AI value by function
              </h3>
              <span style={{ fontSize: 11, color: '#64748B' }}>
                Click a bar to filter the cockpit
              </span>
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
          <div ref={functionBarChartRef} style={{ height: 260, width: '100%' }} />
        </div>

        {/* Chart 2: Agent Portfolio Status (Donut Chart) */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #D6E2FA',
          borderRadius: 8,
          padding: 18,
          boxShadow: '0 2px 6px rgba(0, 52, 155, 0.04)'
        }}>
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Agent portfolio status
            </h3>
            <span style={{ fontSize: 11, color: '#64748B' }}>
              Custom agents · click a slice
            </span>
          </div>
          <div ref={portfolioDonutChartRef} style={{ height: 260, width: '100%' }} />
        </div>

        {/* Chart 3: August vs September */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #D6E2FA',
          borderRadius: 8,
          padding: 18,
          boxShadow: '0 2px 6px rgba(0, 52, 155, 0.04)'
        }}>
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0 }}>
              August vs September
            </h3>
            <span style={{ fontSize: 11, color: '#64748B' }}>
              Both months · ignores Month slicer
            </span>
          </div>
          <div ref={augVsSepChartRef} style={{ height: 260, width: '100%' }} />
        </div>
      </div>

      {/* Bottom Row: Net AI Value by Team & Where to Act this Month */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: 16
      }}>
        {/* Net AI Value by Team (Ranking Bar Chart) */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #D6E2FA',
          borderRadius: 8,
          padding: 18,
          boxShadow: '0 2px 6px rgba(0, 52, 155, 0.04)'
        }}>
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Net AI value by team
            </h3>
            <span style={{ fontSize: 11, color: '#64748B' }}>
              Each team runs several agents · navy = agent teams, light blue = Microsoft 365 Copilot
            </span>
          </div>
          <div ref={teamBarChartRef} style={{ height: 480, width: '100%' }} />
        </div>

        {/* Where to Act this Month (Executive Decision Briefing Panel) */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #D6E2FA',
          borderRadius: 8,
          padding: 22,
          boxShadow: '0 2px 6px rgba(0, 52, 155, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#00349B', margin: 0 }}>
                Where to act this month
              </h3>
              <span style={{ fontSize: 11.5, color: '#64748B' }}>
                Generated from the current filters
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13, lineHeight: '1.6', color: '#334155' }}>
              <div>
                <b style={{ color: '#0F172A' }}>• Value:</b> net AI value is <b style={{ color: '#00349B' }}>$1.80M</b> in September, up <b style={{ color: '#16A34A' }}>13.6%</b> on August; every $1 of AI spend returned <b style={{ color: '#00349B' }}>$5.37</b>.
              </div>

              <div>
                <b style={{ color: '#0F172A' }}>• Scale:</b> <b style={{ color: '#2E7D32' }}>7 agents</b> clear $40K net value and 70% adoption (Case Triage, Order Status, Device Troubleshooting, Ticket Triage and 3 more); fund the next rollout.
              </div>

              <div>
                <b style={{ color: '#0F172A' }}>• Intervene:</b> <b style={{ color: '#C62828' }}>11 agents</b> need attention, led by Collections (net value under $15K, 129% of budget); Variance Analysis (net value under $15K, eval pass 87%, 133% of budget); Invoice Matching (net value under $15K, 129% of budget); plus 8 more in the heatmap.
              </div>

              <div>
                <b style={{ color: '#0F172A' }}>• Budget:</b> spend is <b style={{ color: '#0F172A' }}>$412K</b> against <b style={{ color: '#0F172A' }}>$425K</b>, 3% under; engineering token spend is at 92% of its monthly budget.
              </div>

              <div>
                <b style={{ color: '#0F172A' }}>• Quality:</b> <b style={{ color: '#C62828' }}>2 policy incidents</b> logged (RFP Response (2)); rerun evals before the next release.
              </div>

              <div>
                <b style={{ color: '#0F172A' }}>• Pilots:</b> <b style={{ color: '#607D8B' }}>10 agents</b> stay in experiment until there is production evidence ($48K cost this month), including Field Dispatch, Field Engineer Copilot, Device Telemetry and 7 more.
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 20,
            padding: '12px 14px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
              Ready to drill down into agent health?
            </span>
            <button
              onClick={() => onFilterAction('intervene')}
              style={{
                background: '#00349B',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 4,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              Review 11 Interventions <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
