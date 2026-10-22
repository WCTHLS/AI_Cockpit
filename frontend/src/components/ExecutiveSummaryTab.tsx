import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  ChevronRight, 
  Maximize2,
  Table as TableIcon,
  X,
  Sparkles,
  ShieldAlert,
  Cpu,
  Sliders,
  PlayCircle
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

interface RemediationAgentInfo {
  name: string;
  func: string;
  team: string;
  action: 'intervene' | 'accelerate' | 'optimize' | 'experiment';
  netValue: number;
  cost: number;
  adoption: number;
  evalPass: number;
  incidents: number;
  rootCause: string;
  remediationStep: string;
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

  // Remediation Drawer State
  const [activeRemediation, setActiveRemediation] = useState<RemediationAgentInfo | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // What-If Simulation State
  const [showSimulator, setShowSimulator] = useState<boolean>(false);
  const [adoptionBoost, setAdoptionBoost] = useState<number>(5);

  // Status breakdown calculations
  const statusCounts = {
    accelerate: agents.filter(a => a.action?.toLowerCase() === 'accelerate').length || 7,
    optimize: agents.filter(a => a.action?.toLowerCase() === 'optimize').length || 15,
    intervene: agents.filter(a => a.action?.toLowerCase() === 'intervene').length || 11,
    experiment: agents.filter(a => a.action?.toLowerCase() === 'experiment').length || 10,
  };
  const totalAgents = agents.length || 43;

  // Pre-configured diagnostic database for agents highlighted in executive brief
  const diagnosticProfiles: Record<string, RemediationAgentInfo> = {
    'Collections': {
      name: 'Collections Agent',
      func: 'Finance',
      team: 'Accounts Receivable',
      action: 'intervene',
      netValue: 12400,
      cost: 18200,
      adoption: 44,
      evalPass: 81,
      incidents: 0,
      rootCause: 'High prompt token inflation (avg 8.2k tokens/call) due to repetitive ERP retry loops. 129% of assigned budget.',
      remediationStep: 'Enforce prompt cache filter and set max context window to 4k tokens to immediately recover $5.8k/mo.'
    },
    'Variance Analysis': {
      name: 'Variance Analysis Agent',
      func: 'Finance',
      team: 'Financial Planning & Close',
      action: 'intervene',
      netValue: 13000,
      cost: 16800,
      adoption: 52,
      evalPass: 87,
      incidents: 0,
      rootCause: 'Eval pass rate dropped to 87% (below 92% SLA threshold). Model hallucinations detected in multi-currency FX tables.',
      remediationStep: 'Rerun ground-truth benchmark suite and restrict FX conversion logic to deterministic rule tool.'
    },
    'Invoice Matching': {
      name: 'Invoice Matching Agent',
      func: 'Finance',
      team: 'Procurement',
      action: 'intervene',
      netValue: 14200,
      cost: 17500,
      adoption: 58,
      evalPass: 86,
      incidents: 0,
      rootCause: 'Spend is at 129% of monthly budget with lower unit value conversion on non-standard PDF formats.',
      remediationStep: 'Update OCR pre-processing layer and set strict monthly token spend cap at $12,500.'
    },
    'RFP Response': {
      name: 'RFP Response Agent',
      func: 'Sales & Marketing',
      team: 'Bids & Proposals',
      action: 'intervene',
      netValue: 35000,
      cost: 24000,
      adoption: 71,
      evalPass: 89,
      incidents: 2,
      rootCause: '2 policy incidents triggered: agent included unredacted NDA pricing data in client proposal output.',
      remediationStep: 'Quarantine agent prompt chain with PII & Commercial Confidentiality regex guardrails before production resume.'
    },
    'Case Triage': {
      name: 'Case Triage Agent',
      func: 'Customer Support',
      team: 'Customer Service',
      action: 'accelerate',
      netValue: 84000,
      cost: 14200,
      adoption: 86,
      evalPass: 97,
      incidents: 0,
      rootCause: 'Top quartile performer: $84K net value generated with 86% tier-1 adoption and 97% eval accuracy.',
      remediationStep: 'Expand seat allocation to regional tier-2 escalation teams; fund rollout across EMEA.'
    },
    'Order Status': {
      name: 'Order Status Agent',
      func: 'Customer Support',
      team: 'IT Service Desk',
      action: 'accelerate',
      netValue: 78000,
      cost: 12100,
      adoption: 84,
      evalPass: 98,
      incidents: 0,
      rootCause: 'High operational leverage: 98% accuracy on real-time SAP order tracking queries with zero human intervention.',
      remediationStep: 'Promote to cross-functional global self-service customer portal.'
    }
  };

  const handleOpenRemediation = (agentName: string) => {
    // Check if in diagnostic db or lookup from agents prop
    if (diagnosticProfiles[agentName]) {
      setActiveRemediation(diagnosticProfiles[agentName]);
    } else {
      const found = agents.find(a => (a.name || '').toLowerCase().includes(agentName.toLowerCase()));
      if (found) {
        setActiveRemediation({
          name: found.name,
          func: found.function,
          team: found.team,
          action: (found.action?.toLowerCase() || 'intervene') as any,
          netValue: found.net_value,
          cost: found.cost,
          adoption: found.adoption_pct,
          evalPass: found.eval_pass_rate,
          incidents: found.policy_incidents,
          rootCause: `Cost at ${found.cost > found.budget ? '120%+' : '100%'} of budget; eval pass rate ${found.eval_pass_rate}%.`,
          remediationStep: 'Perform token budget audit and verify accuracy on latest evaluation test harness.'
        });
      } else {
        setActiveRemediation({
          name: agentName,
          func: 'Operations',
          team: 'General Operations',
          action: 'intervene',
          netValue: 14000,
          cost: 16500,
          adoption: 50,
          evalPass: 86,
          incidents: 0,
          rootCause: 'Triggered intervention rule: Cost vs Budget exceeds 110% and net value under $15K threshold.',
          remediationStep: 'Cap token consumption and review prompt template logic.'
        });
      }
    }
  };

  const triggerRemediationAction = (actionTitle: string) => {
    setActionSuccessMsg(`Governance action applied: ${actionTitle}`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // Chart 1: Net AI Value by Function (Horizontal Bar Chart)
  useEffect(() => {
    if (!functionBarChartRef.current) return;
    const chart = echarts.init(functionBarChartRef.current);

    const functionData = byFunction.length > 0 ? byFunction : [
      { function_name: 'Customer Support', net_value: 620000, total_cost: 110000, active_agents: 12 },
      { function_name: 'Engineering & IT', net_value: 480000, total_cost: 145000, active_agents: 10 },
      { function_name: 'Sales & Marketing', net_value: 310000, total_cost: 75000, active_agents: 9 },
      { function_name: 'Operations', net_value: 240000, total_cost: 52000, active_agents: 7 },
      { function_name: 'Finance', net_value: 150000, total_cost: 30000, active_agents: 5 },
    ];

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

  // Chart 2: Agent Portfolio Status (Donut Chart)
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
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div style={{
          position: 'fixed',
          top: 80,
          right: 32,
          zIndex: 1100,
          background: '#00349B',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0, 52, 155, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          fontWeight: 600
        }}>
          <CheckCircle2 size={16} color="#4ade80" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Top Telemetry & Live Governance Status Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
            <span>Reporting Cycle:</span>
            <span style={{ fontWeight: 800 }}>Sep 2026 (Live Close)</span>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            padding: '4px 10px',
            borderRadius: 20,
            fontSize: 11.5,
            fontWeight: 600,
            color: '#166534'
          }}>
            <span className="pulse-live-dot" />
            <span>Telemetry Pipeline Synced</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            Scope: <b style={{ color: '#00349B' }}>{selectedFunction}</b> · 43 Active Agents Tracked
          </div>

          <button
            onClick={() => setShowSimulator(!showSimulator)}
            style={{
              background: showSimulator ? '#00349B' : '#FFFFFF',
              color: showSimulator ? '#FFFFFF' : '#00349B',
              border: '1px solid #D6E2FA',
              borderRadius: 6,
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Sliders size={13} />
            <span>ROI Simulator</span>
          </button>
        </div>
      </div>

      {/* Collapsible Executive What-If Simulator */}
      {showSimulator && (
        <div style={{
          background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
          border: '1px solid #BFDBFE',
          borderRadius: 8,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color="#2563EB" />
              <span style={{ fontSize: 14, fontWeight: 800, color: '#1E3A8A' }}>
                Executive AI Value Multiplier Simulator
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>
              Simulate enterprise net value impact if custom agent adoption increases across knowledge workers.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Adoption Lift:</span>
              <input 
                type="range" 
                min={2} 
                max={15} 
                value={adoptionBoost}
                onChange={e => setAdoptionBoost(Number(e.target.value))}
                style={{ width: 120, accentColor: '#00349B', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, fontWeight: 800, color: '#00349B', minWidth: 40 }}>
                +{adoptionBoost}%
              </span>
            </div>

            <div style={{
              background: '#FFFFFF',
              border: '1px solid #BFDBFE',
              borderRadius: 6,
              padding: '6px 14px',
              textAlign: 'right'
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Projected Value Add
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#16A34A' }}>
                +${(adoptionBoost * 23.4).toFixed(1)}K / mo
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6 Executive KPI Cards Across */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: 14
      }}>
        {/* KPI 1: NET AI VALUE (Hero Midnight Gradient Card with Sparkline) */}
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
                NET AI VALUE
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                background: 'rgba(255, 255, 255, 0.18)',
                backdropFilter: 'blur(8px)',
                color: '#FFFFFF',
                padding: '2px 7px',
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.25)'
              }}>
                5.37x ROI
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
              <div style={{ fontSize: 29, fontWeight: 800, letterSpacing: '-0.03em', color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>
                $1.80M
              </div>
              {/* Mini Sparkline SVG */}
              <svg width="68" height="24" viewBox="0 0 68 24" fill="none" style={{ marginBottom: 4 }}>
                <defs>
                  <linearGradient id="netValGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M2 18 L18 15 L34 11 L50 8 L66 3" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M2 18 L18 15 L34 11 L50 8 L66 3 L66 22 L2 22 Z" fill="url(#netValGrad)" />
                <circle cx="66" cy="3" r="2.5" fill="#38BDF8" />
              </svg>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, color: '#6EE7B7', marginTop: 6 }}>
            <ArrowUpRight size={14} /> +13.6% vs Aug ($1.59M)
          </div>
        </div>

        {/* KPI 2: HOURS SAVED */}
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
                HOURS SAVED
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
                ~162 FTEs
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
              <div style={{ fontSize: 29, fontWeight: 800, letterSpacing: '-0.02em', color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}>
                26,000
              </div>
              <svg width="60" height="22" viewBox="0 0 60 22" fill="none" style={{ marginBottom: 4 }}>
                <path d="M2 17 L16 14 L30 15 L44 9 L58 4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="58" cy="4" r="2.5" fill="#10B981" />
              </svg>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, color: '#16A34A', marginTop: 6 }}>
            <ArrowUpRight size={14} /> +9.9% vs Aug (23.6K)
          </div>
        </div>

        {/* KPI 3: ADOPTION */}
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
                ADOPTION
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
                3,588 / 4,600
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
              <div style={{ fontSize: 29, fontWeight: 800, letterSpacing: '-0.02em', color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}>
                78%
              </div>
              <svg width="60" height="22" viewBox="0 0 60 22" fill="none" style={{ marginBottom: 4 }}>
                <path d="M2 18 L16 16 L30 11 L44 8 L58 5" stroke="#00349B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="58" cy="5" r="2.5" fill="#00349B" />
              </svg>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: '#16A34A', marginTop: 6 }}>
            <ArrowUpRight size={14} /> +5.0 pts vs Aug
          </div>
        </div>

        {/* KPI 4: TOTAL AI COST */}
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
                TOTAL AI COST
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
                Target $425K
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
              <div style={{ fontSize: 29, fontWeight: 800, letterSpacing: '-0.02em', color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}>
                $412K
              </div>
              <svg width="60" height="22" viewBox="0 0 60 22" fill="none" style={{ marginBottom: 4 }}>
                <path d="M2 7 L16 9 L30 11 L44 14 L58 13" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="58" cy="13" r="2.5" fill="#64748B" />
              </svg>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: '#16A34A', marginTop: 6 }}>
            <ArrowDownRight size={14} /> 3% under budget
          </div>
        </div>

        {/* KPI 5: EVAL PASS RATE */}
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
            background: 'linear-gradient(90deg, #16A34A, #22C55E)'
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
                EVAL PASS RATE
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
                Target 92%
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
              <div style={{ fontSize: 29, fontWeight: 800, letterSpacing: '-0.02em', color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}>
                94%
              </div>
              <svg width="60" height="22" viewBox="0 0 60 22" fill="none" style={{ marginBottom: 4 }}>
                <path d="M2 14 L16 11 L30 13 L44 8 L58 5" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="58" cy="5" r="2.5" fill="#16A34A" />
              </svg>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: '#16A34A', marginTop: 6 }}>
            <CheckCircle2 size={14} /> At or above 92% target
          </div>
        </div>

        {/* KPI 6: POLICY INCIDENTS */}
        <div className="executive-card" style={{
          background: '#FFFFFF',
          border: '1px solid #FECACA',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 16px -4px rgba(220, 38, 38, 0.08)',
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
            background: 'linear-gradient(90deg, #DC2626, #F87171)'
          }} />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#DC2626'
              }}>
                POLICY INCIDENTS
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                background: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #FECACA',
                padding: '2px 7px',
                borderRadius: 12
              }}>
                1 Contained
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
              <div style={{ fontSize: 29, fontWeight: 800, letterSpacing: '-0.02em', color: '#DC2626', fontFamily: 'Outfit, sans-serif' }}>
                2
              </div>
              <span style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: '#DC2626',
                background: '#FEE2E2',
                padding: '3px 8px',
                borderRadius: 6,
                marginBottom: 4
              }}>
                Active Watch
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: '#64748B', marginTop: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#DC2626', display: 'inline-block' }} /> RFP Response (Containment Active)
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
        <div className="executive-card" style={{
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
        <div className="executive-card" style={{
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
              Custom agents · click a slice to filter
            </span>
          </div>
          <div ref={portfolioDonutChartRef} style={{ height: 260, width: '100%' }} />
        </div>

        {/* Chart 3: August vs September */}
        <div className="executive-card" style={{
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
        <div className="executive-card" style={{
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

        {/* Where to Act this Month (Executive Intelligence & Remediation Panel) */}
        <div className="executive-card" style={{
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#00349B', margin: 0 }}>
                  Where to act this month
                </h3>
                <span style={{ fontSize: 11.5, color: '#64748B' }}>
                  Click any highlighted agent chip to view diagnostics &amp; action plan
                </span>
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                background: '#F1F5F9',
                color: '#475569',
                padding: '3px 8px',
                borderRadius: 4
              }}>
                Interactive
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13, lineHeight: '1.6', color: '#334155' }}>
              <div>
                <b style={{ color: '#0F172A' }}>• Value:</b> Net AI value is <b style={{ color: '#00349B' }}>$1.80M</b> in September, up <b style={{ color: '#16A34A' }}>13.6%</b> on August; every $1 of AI spend returned <b style={{ color: '#00349B' }}>$5.37</b>.
              </div>

              <div>
                <b style={{ color: '#0F172A' }}>• Scale:</b> <b style={{ color: '#2E7D32' }}>7 agents</b> clear $40K net value and 70% adoption (
                <button onClick={() => handleOpenRemediation('Case Triage')} className="agent-action-chip accelerate">▲ Case Triage</button>,{' '}
                <button onClick={() => handleOpenRemediation('Order Status')} className="agent-action-chip accelerate">▲ Order Status</button>, Device Troubleshooting, Ticket Triage and 3 more); fund the next rollout.
              </div>

              <div>
                <b style={{ color: '#0F172A' }}>• Intervene:</b> <b style={{ color: '#C62828' }}>11 agents</b> need attention, led by{' '}
                <button onClick={() => handleOpenRemediation('Collections')} className="agent-action-chip intervene">■ Collections</button> (net value under $15K, 129% budget);{' '}
                <button onClick={() => handleOpenRemediation('Variance Analysis')} className="agent-action-chip intervene">■ Variance Analysis</button> (eval pass 87%, 133% budget);{' '}
                <button onClick={() => handleOpenRemediation('Invoice Matching')} className="agent-action-chip intervene">■ Invoice Matching</button> (129% budget); plus 8 more in the heatmap.
              </div>

              <div>
                <b style={{ color: '#0F172A' }}>• Budget:</b> Spend is <b style={{ color: '#0F172A' }}>$412K</b> against <b style={{ color: '#0F172A' }}>$425K</b>, 3% under; engineering token spend is at 92% of its monthly budget.
              </div>

              <div>
                <b style={{ color: '#0F172A' }}>• Quality:</b> <b style={{ color: '#C62828' }}>2 policy incidents</b> logged (
                <button onClick={() => handleOpenRemediation('RFP Response')} className="agent-action-chip intervene">■ RFP Response (2)</button>
                ); rerun evals before next release.
              </div>

              <div>
                <b style={{ color: '#0F172A' }}>• Pilots:</b> <b style={{ color: '#607D8B' }}>10 agents</b> stay in experiment until production evidence is verified ($48K cost), including Field Dispatch, Field Engineer Copilot, and Device Telemetry.
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
              Want to see all 11 at-risk agents?
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
              Filter Scorecard (11) <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Slide-over Executive Remediation Drawer */}
      {activeRemediation && (
        <div className="executive-drawer-overlay" onClick={() => setActiveRemediation(null)}>
          <div className="executive-drawer" onClick={e => e.stopPropagation()}>
            {/* Drawer Header */}
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
                  <span className={`badge-status badge-${activeRemediation.action}`}>
                    {activeRemediation.action.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 12, color: '#64748B' }}>
                    {activeRemediation.func} · {activeRemediation.team}
                  </span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {activeRemediation.name}
                </h2>
              </div>
              <button 
                onClick={() => setActiveRemediation(null)}
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

            {/* Drawer Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>NET AI VALUE</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#00349B', marginTop: 2 }}>
                    {formatUSD(activeRemediation.netValue)}
                  </div>
                </div>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>MONTHLY COST</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#C62828', marginTop: 2 }}>
                    {formatUSD(activeRemediation.cost)}
                  </div>
                </div>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>ADOPTION RATE</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                    {activeRemediation.adoption}%
                  </div>
                </div>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>EVAL PASS RATE</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: activeRemediation.evalPass < 92 ? '#C62828' : '#16A34A', marginTop: 2 }}>
                    {activeRemediation.evalPass}%
                  </div>
                </div>
              </div>

              {/* Root Cause Diagnostics */}
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 8,
                padding: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <ShieldAlert size={16} color="#DC2626" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#991B1B' }}>
                    Root Cause Telemetry Diagnosis
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: '#7F1D1D' }}>
                  {activeRemediation.rootCause}
                </p>
              </div>

              {/* Recommended Action */}
              <div style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: 8,
                padding: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Sparkles size={16} color="#2563EB" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1E40AF' }}>
                    Recommended Governance Action
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: '#1E3A8A' }}>
                  {activeRemediation.remediationStep}
                </p>
              </div>

              {/* One-Click Executive Remediation Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                  Execute Remediation:
                </span>
                <button
                  onClick={() => triggerRemediationAction(`Token budget capped at 100% plan for ${activeRemediation.name}`)}
                  style={{
                    background: '#00349B',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 6,
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}
                >
                  <Cpu size={16} /> Enforce Token Quota Cap
                </button>

                <button
                  onClick={() => triggerRemediationAction(`Automated 500-case eval benchmark suite dispatched for ${activeRemediation.name}`)}
                  style={{
                    background: '#FFFFFF',
                    color: '#00349B',
                    border: '1.5px solid #00349B',
                    borderRadius: 6,
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}
                >
                  <PlayCircle size={16} /> Trigger Automated Eval Rerun
                </button>

                <button
                  onClick={() => {
                    setActiveRemediation(null);
                    onFilterAction(activeRemediation.action);
                  }}
                  style={{
                    background: '#F1F5F9',
                    color: '#475569',
                    border: '1px solid #CBD5E1',
                    borderRadius: 6,
                    padding: '8px 16px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  View in Agent Scorecard Tab →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
