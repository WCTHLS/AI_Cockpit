import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { 
  ChevronDown, 
  ChevronRight, 
  Layers, 
  Users, 
  Maximize2, 
  Table, 
  Search, 
  SlidersHorizontal,
  X,
  Sparkles,
  ShieldAlert,
  Clock,
  TrendingUp,
  Cpu,
  CheckCircle2
} from 'lucide-react';
import { AgentScorecardItem } from '../types';
import { formatUSD, formatPct } from '../api';

interface AgentScorecardTabProps {
  agents: AgentScorecardItem[];
  onSelectAgent: (agent: AgentScorecardItem) => void;
  initialActionFilter?: string;
  selectedFunction?: string;
  theme?: 'dark' | 'light';
}

const STATUS_CONFIG: Record<string, { label: string; icon: string; color: string; bgLight: string; textLight: string }> = {
  accelerate: { label: 'ACCELERATE', icon: '▲', color: '#2E7D32', bgLight: '#E3F1E4', textLight: '#1B5E20' },
  optimize: { label: 'OPTIMIZE', icon: '◆', color: '#E0A100', bgLight: '#FDF0C8', textLight: '#7A5300' },
  intervene: { label: 'INTERVENE', icon: '■', color: '#C62828', bgLight: '#F9DEDC', textLight: '#A4161A' },
  experiment: { label: 'EXPERIMENT', icon: '●', color: '#607D8B', bgLight: '#ECEFF1', textLight: '#455A64' },
};

// Thresholds for RAG indicators
const TH = {
  net: { g: 40000, a: 15000 },
  adopt: { g: 0.70, a: 0.40 },
  cvb: { g: 1.00, a: 1.10 },
  evalp: { g: 0.92, a: 0.88 }
};

const getRagNet = (val: number) => val >= TH.net.g ? 'g' : val >= TH.net.a ? 'a' : 'r';
const getRagAdopt = (val: number) => val >= TH.adopt.g ? 'g' : val >= TH.adopt.a ? 'a' : 'r';
const getRagCvb = (val: number) => val <= TH.cvb.g ? 'g' : val <= TH.cvb.a ? 'a' : 'r';
const getRagEval = (val: number) => val >= TH.evalp.g ? 'g' : val >= TH.evalp.a ? 'a' : 'r';

export const AgentScorecardTab: React.FC<AgentScorecardTabProps> = ({
  agents,
  onSelectAgent,
  initialActionFilter = '',
  selectedFunction = '',
  theme = 'light'
}) => {
  const isScoped = Boolean(selectedFunction && selectedFunction !== 'All Functions');
  const scopedAgents = isScoped 
    ? agents.filter(a => a.function === selectedFunction) 
    : agents;
  const [selectedStatus, setSelectedStatus] = useState<string>(initialActionFilter ? initialActionFilter.toLowerCase() : '');
  const [collapsedFunctions, setCollapsedFunctions] = useState<Set<string>>(new Set());
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'all' | 'teams' | 'functions'>('all');

  // Search and Productivity Quick Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [productivityFilter, setProductivityFilter] = useState<'all' | 'top-drivers' | 'intervene' | 'budget-overrun' | 'high-adopt'>('all');

  // Agent Telemetry Profile Drawer State
  

  const scatterChartRef = useRef<HTMLDivElement>(null);
  const evalChartRef = useRef<HTMLDivElement>(null);

  const isLight = theme === 'light';

  useEffect(() => {
    if (initialActionFilter) {
      setSelectedStatus(initialActionFilter.toLowerCase());
    }
  }, [initialActionFilter]);

  // Group agents by status for the top 4 status cards
  const statusGroups = {
    accelerate: scopedAgents.filter(a => a.action?.toLowerCase() === 'accelerate'),
    optimize: scopedAgents.filter(a => a.action?.toLowerCase() === 'optimize'),
    intervene: scopedAgents.filter(a => a.action?.toLowerCase() === 'intervene'),
    experiment: scopedAgents.filter(a => a.action?.toLowerCase() === 'experiment'),
  };

  // Filter agents by status, search query, and productivity filter
  const activeAgents = scopedAgents.filter(a => {
    // 1. Status Filter (from top cards)
    if (selectedStatus && a.action?.toLowerCase() !== selectedStatus) return false;

    // 2. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (a.name || '').toLowerCase().includes(q);
      const matchTeam = (a.team || '').toLowerCase().includes(q);
      const matchFunc = (a.function || '').toLowerCase().includes(q);
      if (!matchName && !matchTeam && !matchFunc) return false;
    }

    // 3. Productivity Quick Filter
    if (productivityFilter === 'top-drivers') {
      return (a.net_value || 0) >= 40000;
    }
    if (productivityFilter === 'intervene') {
      return a.action?.toLowerCase() === 'intervene';
    }
    if (productivityFilter === 'budget-overrun') {
      return a.budget ? a.cost > a.budget : false;
    }
    if (productivityFilter === 'high-adopt') {
      return (a.adoption_pct || 0) >= 70;
    }

    return true;
  });

  // Hierarchical Grouping: Function -> Team -> Agents
  const functionsList = Array.from(new Set(activeAgents.map(a => a.function))).sort();

  const hierarchicalData = functionsList.map(funcName => {
    const funcAgents = activeAgents.filter(a => a.function === funcName);
    const teamsList = Array.from(new Set(funcAgents.map(a => a.team))).sort();

    const teams = teamsList.map(teamName => {
      const teamAgents = funcAgents.filter(a => a.team === teamName);
      return {
        teamName,
        agents: teamAgents,
        totalNetValue: teamAgents.reduce((s, a) => s + (a.net_value || 0), 0),
        totalGrossValue: teamAgents.reduce((s, a) => s + (a.gross_value || 0), 0),
        totalCost: teamAgents.reduce((s, a) => s + (a.cost || 0), 0),
        avgAdoption: teamAgents.reduce((s, a) => s + (a.adoption_pct || 0), 0) / (teamAgents.length || 1),
        costVsBudget: teamAgents.reduce((s, a) => s + (a.cost || 0), 0) / (teamAgents.reduce((s, a) => s + (a.budget || a.cost || 1), 0) || 1) * 100,
        avgEvalPass: teamAgents.reduce((s, a) => s + (a.eval_pass_rate || 0), 0) / (teamAgents.length || 1),
        totalHoursSaved: teamAgents.reduce((s, a) => s + (a.hours_saved || 0), 0),
        totalIncidents: teamAgents.reduce((s, a) => s + (a.policy_incidents || 0), 0),
        statusCounts: {
          accelerate: teamAgents.filter(a => a.action?.toLowerCase() === 'accelerate').length,
          optimize: teamAgents.filter(a => a.action?.toLowerCase() === 'optimize').length,
          intervene: teamAgents.filter(a => a.action?.toLowerCase() === 'intervene').length,
          experiment: teamAgents.filter(a => a.action?.toLowerCase() === 'experiment').length,
        }
      };
    });

    return {
      functionName: funcName,
      agentCount: funcAgents.length,
      teamCount: teams.length,
      teams,
      totalNetValue: funcAgents.reduce((s, a) => s + (a.net_value || 0), 0),
      totalGrossValue: funcAgents.reduce((s, a) => s + (a.gross_value || 0), 0),
      totalCost: funcAgents.reduce((s, a) => s + (a.cost || 0), 0),
      avgAdoption: funcAgents.reduce((s, a) => s + (a.adoption_pct || 0), 0) / (funcAgents.length || 1),
      costVsBudget: funcAgents.reduce((s, a) => s + (a.cost || 0), 0) / (funcAgents.reduce((s, a) => s + (a.budget || a.cost || 1), 0) || 1) * 100,
      avgEvalPass: funcAgents.reduce((s, a) => s + (a.eval_pass_rate || 0), 0) / (funcAgents.length || 1),
      totalHoursSaved: funcAgents.reduce((s, a) => s + (a.hours_saved || 0), 0),
      totalIncidents: funcAgents.reduce((s, a) => s + (a.policy_incidents || 0), 0),
      statusCounts: {
        accelerate: funcAgents.filter(a => a.action?.toLowerCase() === 'accelerate').length,
        optimize: funcAgents.filter(a => a.action?.toLowerCase() === 'optimize').length,
        intervene: funcAgents.filter(a => a.action?.toLowerCase() === 'intervene').length,
        experiment: funcAgents.filter(a => a.action?.toLowerCase() === 'experiment').length,
      }
    };
  });

  // Grand Totals
  const totalNetValue = activeAgents.reduce((s, a) => s + (a.net_value || 0), 0);
  const totalHoursSaved = activeAgents.reduce((s, a) => s + (a.hours_saved || 0), 0);
  const totalIncidents = activeAgents.reduce((s, a) => s + (a.policy_incidents || 0), 0);
  const totalTeams = new Set(activeAgents.map(a => a.team)).size;
  const avgTotalAdoption = activeAgents.reduce((s, a) => s + (a.adoption_pct || 0), 0) / (activeAgents.length || 1);
  const avgTotalCostBudget = activeAgents.reduce((s, a) => s + (a.cost || 0), 0) / (activeAgents.reduce((s, a) => s + (a.budget || a.cost || 1), 0) || 1) * 100;
  const avgTotalEvalPass = activeAgents.reduce((s, a) => s + (a.eval_pass_rate || 0), 0) / (activeAgents.length || 1);

  // Toggle Function Row collapse
  const toggleFunction = (fName: string) => {
    const next = new Set(collapsedFunctions);
    if (next.has(fName)) next.delete(fName);
    else next.add(fName);
    setCollapsedFunctions(next);
  };

  // Toggle Team Row collapse
  const toggleTeam = (tKey: string) => {
    const next = new Set(collapsedTeams);
    if (next.has(tKey)) next.delete(tKey);
    else next.add(tKey);
    setCollapsedTeams(next);
  };

  // View mode handler
  const handleViewMode = (mode: 'all' | 'teams' | 'functions') => {
    setViewMode(mode);
    if (mode === 'all') {
      setCollapsedFunctions(new Set());
      setCollapsedTeams(new Set());
    } else if (mode === 'teams') {
      setCollapsedFunctions(new Set());
      const allTeamKeys = new Set<string>();
      hierarchicalData.forEach(f => f.teams.forEach(t => allTeamKeys.add(`${f.functionName}|${t.teamName}`)));
      setCollapsedTeams(allTeamKeys);
    } else if (mode === 'functions') {
      const allFuncs = new Set(functionsList);
      setCollapsedFunctions(allFuncs);
    }
  };

  // Render Value vs Adoption Scatter Chart
  useEffect(() => {
    if (!scatterChartRef.current || !agents.length) return;
    const chart = echarts.init(scatterChartRef.current);

    const seriesData = agents.map(a => ({
      name: a.name,
      value: [a.adoption_pct || 0, a.net_value || 0, a.cost || 5000, a.action?.toLowerCase() || 'optimize'],
      raw: a
    }));

    const colorMap: Record<string, string> = {
      accelerate: '#2E7D32',
      optimize: '#E0A100',
      intervene: '#C62828',
      experiment: '#607D8B'
    };

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#FFFFFF',
        borderColor: '#D6E2FA',
        textStyle: { color: '#1A1A1A', fontSize: 12, fontFamily: 'Satoshi, Figtree, sans-serif' },
        extraCssText: 'box-shadow: 0 8px 24px rgba(0,52,155,.16); border-radius: 6px;',
        formatter: (params: any) => {
          const raw = params.data.raw;
          const status = raw.action?.toLowerCase() || 'optimize';
          return `<div style="padding: 4px;">
            <div style="font-weight: 700; color: #00349B; margin-bottom: 2px;">${raw.name}</div>
            <div style="color: #64748B; font-size: 11.5px; margin-bottom: 6px;">${raw.team} · ${raw.function}</div>
            <div style="display:flex; justify-content:space-between; gap:16px;"><span>Status:</span><b style="color:${colorMap[status]}">${status.toUpperCase()}</b></div>
            <div style="display:flex; justify-content:space-between; gap:16px;"><span>Net value:</span><b>${formatUSD(raw.net_value)}</b></div>
            <div style="display:flex; justify-content:space-between; gap:16px;"><span>Adoption:</span><b>${formatPct(raw.adoption_pct)}</b></div>
            <div style="display:flex; justify-content:space-between; gap:16px;"><span>Cost:</span><b>${formatUSD(raw.cost)}</b></div>
            <div style="color: #1713FD; font-size: 11px; margin-top: 4px; font-weight: 600;">Click to view full agent telemetry →</div>
          </div>`;
        }
      },
      legend: {
        top: 0,
        left: 0,
        icon: 'roundRect',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: '#475569', fontSize: 12, fontFamily: 'Satoshi, sans-serif' },
        data: ['Accelerate', 'Optimize', 'Intervene', 'Experiment']
      },
      grid: { left: 55, right: 30, top: 40, bottom: 40 },
      xAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { formatter: '{value}%', color: '#475569', fontSize: 11 },
        splitLine: { lineStyle: { color: '#E6ECF8' } },
        axisLine: { lineStyle: { color: '#BFD0FF' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: (v: number) => `$${Math.round(v / 1000)}K`, color: '#475569', fontSize: 11 },
        splitLine: { lineStyle: { color: '#E6ECF8' } },
        axisLine: { show: false }
      },
      series: [
        {
          name: 'Accelerate',
          type: 'scatter',
          data: seriesData.filter(d => d.value[3] === 'accelerate'),
          itemStyle: { color: colorMap.accelerate, opacity: 0.85 },
          symbolSize: (data: any) => Math.max(16, Math.min(38, Math.sqrt(data[2] || 5000) / 7)),
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { type: 'dashed', color: '#0B1F4D', width: 1.2 },
            data: [
              { yAxis: 40000, label: { formatter: '$40K net value', position: 'start', color: '#64748B', fontSize: 10 } },
              { xAxis: 70, label: { formatter: '70% adoption', position: 'end', color: '#64748B', fontSize: 10 } }
            ]
          }
        },
        {
          name: 'Optimize',
          type: 'scatter',
          data: seriesData.filter(d => d.value[3] === 'optimize'),
          itemStyle: { color: colorMap.optimize, opacity: 0.85 },
          symbolSize: (data: any) => Math.max(16, Math.min(38, Math.sqrt(data[2] || 5000) / 7))
        },
        {
          name: 'Intervene',
          type: 'scatter',
          data: seriesData.filter(d => d.value[3] === 'intervene'),
          itemStyle: { color: colorMap.intervene, opacity: 0.85 },
          symbolSize: (data: any) => Math.max(16, Math.min(38, Math.sqrt(data[2] || 5000) / 7))
        },
        {
          name: 'Experiment',
          type: 'scatter',
          data: seriesData.filter(d => d.value[3] === 'experiment'),
          itemStyle: { color: colorMap.experiment, opacity: 0.85 },
          symbolSize: (data: any) => Math.max(16, Math.min(38, Math.sqrt(data[2] || 5000) / 7))
        }
      ]
    });

    chart.on('click', (params: any) => {
      if (params.data?.raw) {
        onSelectAgent(params.data.raw);
      }
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [agents]);

  // Render Eval Pass Rate by Team Lollipop Chart
  useEffect(() => {
    if (!evalChartRef.current || !hierarchicalData.length) return;
    const chart = echarts.init(evalChartRef.current);

    const teamEvals: { team: string; passRate: number; color: string }[] = [];
    hierarchicalData.forEach(func => {
      func.teams.forEach(t => {
        const rate = Math.round(t.avgEvalPass);
        const color = rate >= 92 ? '#2E7D32' : rate >= 88 ? '#E0A100' : '#C62828';
        teamEvals.push({ team: t.teamName, passRate: rate, color });
      });
    });

    teamEvals.sort((a, b) => a.passRate - b.passRate);

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        backgroundColor: '#FFFFFF',
        borderColor: '#D6E2FA',
        textStyle: { color: '#1A1A1A', fontSize: 12 },
        formatter: (params: any) => {
          const item = params[0];
          return `<div style="padding: 4px;">
            <b>${item.name}</b><br/>
            Eval Pass Rate: <b style="color: ${item.color};">${item.value}%</b>
          </div>`;
        }
      },
      grid: { left: 160, right: 60, top: 20, bottom: 30 },
      xAxis: {
        type: 'value',
        min: 80,
        max: 100,
        axisLabel: { formatter: '{value}%', color: '#475569', fontSize: 11 },
        splitLine: { lineStyle: { color: '#E6ECF8' } }
      },
      yAxis: {
        type: 'category',
        data: teamEvals.map(t => t.team),
        axisLabel: { color: '#1A1A1A', fontSize: 11.5, fontWeight: 500 },
        axisLine: { lineStyle: { color: '#BFD0FF' } },
        axisTick: { show: false }
      },
      series: [
        {
          name: 'Stem',
          type: 'bar',
          barWidth: 2,
          data: teamEvals.map(t => ({
            value: t.passRate,
            itemStyle: { color: '#CBD5E1' }
          }))
        },
        {
          name: 'Eval Pass Rate',
          type: 'scatter',
          symbolSize: 10,
          data: teamEvals.map(t => ({
            value: t.passRate,
            itemStyle: { color: t.color }
          })),
          label: {
            show: true,
            position: 'right',
            formatter: '{@[0]}%',
            fontSize: 10.5,
            color: '#475569'
          },
          markLine: {
            silent: true,
            symbol: 'none',
            data: [
              { xAxis: 88, lineStyle: { type: 'dashed', color: '#C62828' }, label: { formatter: '88% SLA', color: '#C62828', fontSize: 10 } },
              { xAxis: 92, lineStyle: { type: 'dashed', color: '#2E7D32' }, label: { formatter: '92% Target', color: '#2E7D32', fontSize: 10 } }
            ]
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
  }, [hierarchicalData]);

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
          <span style={{ fontWeight: 800 }}>Sep 2026 (Live Close)</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>
            Enterprise Estate: <b style={{ color: '#00349B' }}>{scopedAgents.length} Custom Agents Active</b>
            {isScoped && <span style={{ marginLeft: 6, color: '#1E40AF', fontWeight: 700 }}>(in {selectedFunction})</span>}
          </span>
        </div>
      </div>

      {/* Top 4 Governance Action Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16
      }}>
        {(['accelerate', 'optimize', 'intervene', 'experiment'] as const).map(statusKey => {
          const cfg = STATUS_CONFIG[statusKey];
          const group = statusGroups[statusKey] || [];
          const isSelected = selectedStatus === statusKey;
          const isDim = selectedStatus && !isSelected;

          return (
            <div
              key={statusKey}
              onClick={() => setSelectedStatus(isSelected ? '' : statusKey)}
              className="executive-card"
              style={{
                background: '#FFFFFF',
                border: isSelected ? '1.5px solid #00349B' : '1px solid #E2E8F0',
                borderRadius: 12,
                padding: '16px 18px',
                cursor: 'pointer',
                boxShadow: isSelected 
                  ? '0 0 0 2px #00349B, 0 12px 28px rgba(0, 52, 155, 0.14)' 
                  : '0 1px 3px rgba(0,0,0,0.04), 0 6px 18px -4px rgba(0, 52, 155, 0.05)',
                opacity: isDim ? 0.45 : 1,
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Top Hairline Gradient Accent */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}66)`,
                borderRadius: '12px 12px 0 0'
              }} />

              {/* Status Capsule & Share Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: cfg.color,
                  background: cfg.bgLight,
                  padding: '3px 9px',
                  borderRadius: 16,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5
                }}>
                  <span>{cfg.icon}</span>
                  <span>{cfg.label}</span>
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>
                  {Math.round((group.length / (agents.length || 1)) * 100)}% of estate
                </span>
              </div>

              {/* Number and Label */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '8px 0 10px 0' }}>
                <span style={{ fontSize: 30, fontWeight: 800, color: '#0F172A', fontFamily: 'Outfit, Satoshi, sans-serif' }}>
                  {group.length}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>
                  Active Agents
                </span>
              </div>

              {/* Interactive Agent Micro-Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {group.slice(0, 3).map(a => (
                  <span
                    key={a.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAgent(a);
                    }}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#334155',
                      background: '#F1F5F9',
                      border: '1px solid #E2E8F0',
                      padding: '2px 7px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#94A3B8'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}
                  >
                    {a.name}
                  </span>
                ))}
                {group.length > 3 && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '2px 4px' }}>
                    +{group.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Heatmap Tree Table Container */}
      <div style={{
        background: '#FFFFFF',
        border: '1.5px solid #D6E2FA',
        borderRadius: 12,
        padding: '18px 22px',
        boxShadow: '0 4px 16px rgba(0, 52, 155, 0.08)'
      }}>
        {/* Table Header & Controls Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 14,
          marginBottom: 16
        }}>
          <div>
            <h4 style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 800,
              color: '#00349B',
              letterSpacing: '-0.01em',
              fontFamily: 'Satoshi, Outfit, sans-serif'
            }}>
              AI portfolio heatmap by business function
            </h4>
            <div style={{ fontSize: 12.5, color: '#475569', marginTop: 2 }}>
              Each business function runs several teams, and each team runs several agents · agents are rated on value, adoption, cost and quality · click any row to inspect deep-dive telemetry
            </div>
          </div>

          {/* View Mode Buttons */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => handleViewMode('all')}
              style={{
                background: viewMode === 'all' ? '#00349B' : '#F3F6FC',
                color: viewMode === 'all' ? '#FFFFFF' : '#00349B',
                border: '1px solid #D6E2FA',
                borderRadius: 20,
                padding: '5px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Show all agents
            </button>
            <button
              onClick={() => handleViewMode('teams')}
              style={{
                background: viewMode === 'teams' ? '#00349B' : '#F3F6FC',
                color: viewMode === 'teams' ? '#FFFFFF' : '#00349B',
                border: '1px solid #D6E2FA',
                borderRadius: 20,
                padding: '5px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Teams only
            </button>
            <button
              onClick={() => handleViewMode('functions')}
              style={{
                background: viewMode === 'functions' ? '#00349B' : '#F3F6FC',
                color: viewMode === 'functions' ? '#FFFFFF' : '#00349B',
                border: '1px solid #D6E2FA',
                borderRadius: 20,
                padding: '5px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Functions only
            </button>
          </div>
        </div>

        {/* Productivity Search & Triage Filter Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '10px 14px',
          background: '#F8FAFD',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          marginBottom: 16
        }}>
          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: 6,
            padding: '6px 12px',
            minWidth: 260
          }}>
            <Search size={14} color="#64748B" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search agent, team, or capability..."
              style={{
                border: 'none',
                outline: 'none',
                fontSize: 12,
                width: '100%',
                background: 'transparent',
                color: '#0F172A'
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Productivity Quick Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#475569' }}>Quick Triage:</span>
            
            <button
              onClick={() => setProductivityFilter('all')}
              style={{
                background: productivityFilter === 'all' ? '#00349B' : '#FFFFFF',
                color: productivityFilter === 'all' ? '#FFFFFF' : '#475569',
                border: '1px solid #D6E2FA',
                borderRadius: 4,
                padding: '4px 10px',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              All ({agents.length})
            </button>

            <button
              onClick={() => setProductivityFilter('top-drivers')}
              style={{
                background: productivityFilter === 'top-drivers' ? '#166534' : '#FFFFFF',
                color: productivityFilter === 'top-drivers' ? '#FFFFFF' : '#166534',
                border: '1px solid #BBF7D0',
                borderRadius: 4,
                padding: '4px 10px',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              🚀 Top Value Drivers ($40K+)
            </button>

            <button
              onClick={() => setProductivityFilter('intervene')}
              style={{
                background: productivityFilter === 'intervene' ? '#991B1B' : '#FFFFFF',
                color: productivityFilter === 'intervene' ? '#FFFFFF' : '#991B1B',
                border: '1px solid #FECACA',
                borderRadius: 4,
                padding: '4px 10px',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              ⚠️ Needs Intervention ({statusGroups.intervene.length})
            </button>

            <button
              onClick={() => setProductivityFilter('budget-overrun')}
              style={{
                background: productivityFilter === 'budget-overrun' ? '#7C2D12' : '#FFFFFF',
                color: productivityFilter === 'budget-overrun' ? '#FFFFFF' : '#7C2D12',
                border: '1px solid #FED7AA',
                borderRadius: 4,
                padding: '4px 10px',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              💸 Budget Overrun
            </button>

            <button
              onClick={() => setProductivityFilter('high-adopt')}
              style={{
                background: productivityFilter === 'high-adopt' ? '#1E3A8A' : '#FFFFFF',
                color: productivityFilter === 'high-adopt' ? '#FFFFFF' : '#1E3A8A',
                border: '1px solid #BFDBFE',
                borderRadius: 4,
                padding: '4px 10px',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              👥 High Adoption (≥70%)
            </button>
          </div>
        </div>

        {/* Tree Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'Satoshi, Figtree, sans-serif' }}>
            <thead>
              <tr style={{ background: '#00349B', color: '#FFFFFF', textAlign: 'left', fontSize: 12, fontWeight: 700 }}>
                <th style={{ padding: '10px 14px' }}>Business function / team / agent</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Net value / mo ▼</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Adoption</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Cost vs budget</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Eval pass</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Hours saved</th>
                <th style={{ textAlign: 'center', padding: '10px 10px' }}>Incidents</th>
                <th style={{ textAlign: 'center', padding: '10px 10px' }}>Days in prod</th>
                <th style={{ padding: '10px 14px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {hierarchicalData.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#64748B' }}>
                    No agents match current filter criteria.
                  </td>
                </tr>
              ) : (
                hierarchicalData.map(func => {
                  const isFuncCollapsed = collapsedFunctions.has(func.functionName);

                  return (
                    <React.Fragment key={func.functionName}>
                      {/* Function Row */}
                      <tr
                        onClick={() => toggleFunction(func.functionName)}
                        style={{
                          background: '#EEF4FF',
                          borderBottom: '1px solid #D6E2FA',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        <td style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            background: '#00349B',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11
                          }}>
                            {isFuncCollapsed ? '+' : '−'}
                          </span>
                          <div>
                            <span style={{ fontSize: 14.5, color: '#00349B' }}>{func.functionName}</span>
                            <span style={{
                              marginLeft: 8,
                              fontSize: 11,
                              background: '#D6E2FA',
                              color: '#00349B',
                              padding: '2px 8px',
                              borderRadius: 12
                            }}>
                              {func.agentCount} agents
                            </span>
                            <span style={{
                              marginLeft: 6,
                              fontSize: 11,
                              background: '#FFFFFF',
                              color: '#475569',
                              border: '1px solid #D6E2FA',
                              padding: '2px 8px',
                              borderRadius: 12
                            }}>
                              {func.teamCount} teams
                            </span>
                            <span style={{
                              marginLeft: 6,
                              fontSize: 11,
                              background: '#ECFDF5',
                              color: '#065F46',
                              border: '1px solid #A7F3D0',
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontWeight: 700
                            }}>
                              ~{Math.round(func.totalHoursSaved / 160)} FTEs Unlocked
                            </span>
                            {!isFuncCollapsed && (
                              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500, marginTop: 2 }}>
                                {func.teams.map(t => `${t.teamName} (${t.agents.length})`).join(' · ')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', padding: '10px 12px', color: '#00349B', fontWeight: 800 }}>
                          {formatUSD(func.totalNetValue)}
                        </td>
                        <td style={{ textAlign: 'right', padding: '10px 12px', color: '#1A1A1A' }}>
                          {formatPct(func.avgAdoption)}
                        </td>
                        <td style={{ textAlign: 'right', padding: '10px 12px', color: '#1A1A1A' }}>
                          {formatPct(func.costVsBudget)}
                        </td>
                        <td style={{ textAlign: 'right', padding: '10px 12px', color: '#1A1A1A' }}>
                          {formatPct(func.avgEvalPass)}
                        </td>
                        <td style={{ textAlign: 'right', padding: '10px 12px', color: '#1A1A1A' }}>
                          {Math.round(func.totalHoursSaved).toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'center', padding: '10px 10px', color: '#1A1A1A' }}>
                          {func.totalIncidents}
                        </td>
                        <td style={{ textAlign: 'center', padding: '10px 10px', color: '#94a3b8' }}>—</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                            {func.statusCounts.accelerate > 0 && <span style={{ color: '#2E7D32', fontWeight: 700 }}>▲ {func.statusCounts.accelerate}</span>}
                            {func.statusCounts.optimize > 0 && <span style={{ color: '#E0A100', fontWeight: 700 }}>◆ {func.statusCounts.optimize}</span>}
                            {func.statusCounts.intervene > 0 && <span style={{ color: '#C62828', fontWeight: 700 }}>■ {func.statusCounts.intervene}</span>}
                            {func.statusCounts.experiment > 0 && <span style={{ color: '#607D8B', fontWeight: 700 }}>● {func.statusCounts.experiment}</span>}
                          </div>
                        </td>
                      </tr>

                      {/* Team Sub-Rows */}
                      {!isFuncCollapsed && func.teams.map(team => {
                        const tKey = `${func.functionName}|${team.teamName}`;
                        const isTeamCollapsed = collapsedTeams.has(tKey);

                        return (
                          <React.Fragment key={tKey}>
                            <tr
                              onClick={() => toggleTeam(tKey)}
                              style={{
                                background: '#F8FAFD',
                                borderBottom: '1px solid #E6ECF8',
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                            >
                              <td style={{ padding: '8px 14px 8px 36px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: 3,
                                  background: '#D6E2FA',
                                  color: '#00349B',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 10,
                                  textAlign: 'center'
                                }}>
                                  {isTeamCollapsed ? '+' : '−'}
                                </span>
                                <span style={{ color: '#1A1A1A', fontSize: 13.5 }}>{team.teamName}</span>
                                <span style={{
                                  fontSize: 10.5,
                                  background: '#FFFFFF',
                                  border: '1px solid #D6E2FA',
                                  color: '#64748B',
                                  padding: '1px 6px',
                                  borderRadius: 10
                                }}>
                                  {team.agents.length} agents
                                </span>
                              </td>
                              <td style={{ textAlign: 'right', padding: '8px 12px', color: '#00349B', fontWeight: 700 }}>
                                {formatUSD(team.totalNetValue)}
                              </td>
                              <td style={{ textAlign: 'right', padding: '8px 12px' }}>{formatPct(team.avgAdoption)}</td>
                              <td style={{ textAlign: 'right', padding: '8px 12px' }}>{formatPct(team.costVsBudget)}</td>
                              <td style={{ textAlign: 'right', padding: '8px 12px' }}>{formatPct(team.avgEvalPass)}</td>
                              <td style={{ textAlign: 'right', padding: '8px 12px' }}>{Math.round(team.totalHoursSaved).toLocaleString()}</td>
                              <td style={{ textAlign: 'center', padding: '8px 10px' }}>{team.totalIncidents}</td>
                              <td style={{ textAlign: 'center', padding: '8px 10px', color: '#94a3b8' }}>—</td>
                              <td style={{ padding: '8px 14px' }}>
                                <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                                  {team.statusCounts.accelerate > 0 && <span style={{ color: '#2E7D32', fontWeight: 700 }}>▲ {team.statusCounts.accelerate}</span>}
                                  {team.statusCounts.optimize > 0 && <span style={{ color: '#E0A100', fontWeight: 700 }}>◆ {team.statusCounts.optimize}</span>}
                                  {team.statusCounts.intervene > 0 && <span style={{ color: '#C62828', fontWeight: 700 }}>■ {team.statusCounts.intervene}</span>}
                                  {team.statusCounts.experiment > 0 && <span style={{ color: '#607D8B', fontWeight: 700 }}>● {team.statusCounts.experiment}</span>}
                                </div>
                              </td>
                            </tr>

                            {/* Agent Leaf Rows */}
                            {!isTeamCollapsed && team.agents.map(agent => {
                              const status = agent.action?.toLowerCase() || 'optimize';
                              const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.optimize;
                              const ragNet = getRagNet(agent.net_value);
                              const ragAdopt = getRagAdopt(agent.adoption_pct / 100);
                              const ragCvb = getRagCvb(agent.cost / (agent.budget || agent.cost || 1));
                              const ragEval = getRagEval(agent.eval_pass_rate / 100);

                              const ragDot = (ragType: string) => {
                                const color = ragType === 'g' ? '#2E7D32' : ragType === 'a' ? '#E0A100' : '#C62828';
                                return <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color, marginRight: 5 }} />;
                              };

                              return (
                                <tr
                                  key={agent.id}
                                  onClick={() => {
                                    onSelectAgent(agent);
                                  }}
                                  style={{
                                    borderBottom: '1px solid #F1F4F9',
                                    cursor: 'pointer',
                                    transition: 'background 0.15s'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#F3F6FC'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <td style={{ padding: '7px 14px 7px 64px', color: '#1A1A1A', fontSize: 13, fontWeight: 500 }}>
                                    <span style={{ color: '#00349B', marginRight: 4 }}>•</span> {agent.name}
                                  </td>
                                  <td style={{ textAlign: 'right', padding: '7px 12px', fontWeight: 600 }}>
                                    {ragDot(ragNet)}
                                    <span>{formatUSD(agent.net_value)}</span>
                                  </td>
                                  <td style={{ textAlign: 'right', padding: '7px 12px' }}>
                                    {ragDot(ragAdopt)}
                                    <span>{formatPct(agent.adoption_pct)}</span>
                                  </td>
                                  <td style={{ textAlign: 'right', padding: '7px 12px' }}>
                                    {ragDot(ragCvb)}
                                    <span>{formatPct(agent.budget ? (agent.cost / agent.budget) * 100 : 100)}</span>
                                  </td>
                                  <td style={{ textAlign: 'right', padding: '7px 12px' }}>
                                    {ragDot(ragEval)}
                                    <span>{formatPct(agent.eval_pass_rate)}</span>
                                  </td>
                                  <td style={{ textAlign: 'right', padding: '7px 12px', color: '#475569' }}>
                                    {Math.round(agent.hours_saved || 0).toLocaleString()}
                                  </td>
                                  <td style={{ textAlign: 'center', padding: '7px 10px', color: agent.policy_incidents ? '#C62828' : '#475569', fontWeight: agent.policy_incidents ? 700 : 400 }}>
                                    {agent.policy_incidents || 0}
                                  </td>
                                  <td style={{ textAlign: 'center', padding: '7px 10px', color: '#475569' }}>
                                    {(agent as any).days_in_production || 180}
                                  </td>
                                  <td style={{ padding: '7px 14px' }}>
                                    <span style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: cfg.color,
                                      background: cfg.bgLight,
                                      padding: '2px 8px',
                                      borderRadius: 4,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}>
                                      <span>{cfg.icon}</span>
                                      <span>{cfg.label.charAt(0) + cfg.label.slice(1).toLowerCase()}</span>
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
            <tfoot>
              {/* Grand Total Row */}
              <tr style={{ background: '#F8FAFD', borderTop: '2px solid #00349B', fontWeight: 800, color: '#00349B', fontSize: 13 }}>
                <td style={{ padding: '12px 14px' }}>
                  Total · {functionsList.length} functions · {totalTeams} teams · {activeAgents.length} agents
                </td>
                <td style={{ textAlign: 'right', padding: '12px 12px' }}>{formatUSD(totalNetValue)}</td>
                <td style={{ textAlign: 'right', padding: '12px 12px', color: '#1A1A1A' }}>{formatPct(avgTotalAdoption)}</td>
                <td style={{ textAlign: 'right', padding: '12px 12px', color: '#1A1A1A' }}>{formatPct(avgTotalCostBudget)}</td>
                <td style={{ textAlign: 'right', padding: '12px 12px', color: '#1A1A1A' }}>{formatPct(avgTotalEvalPass)}</td>
                <td style={{ textAlign: 'right', padding: '12px 12px', color: '#1A1A1A' }}>{Math.round(totalHoursSaved).toLocaleString()}</td>
                <td style={{ textAlign: 'center', padding: '12px 10px', color: '#1A1A1A' }}>{totalIncidents}</td>
                <td style={{ textAlign: 'center', padding: '12px 10px', color: '#94a3b8' }}>—</td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                    <span style={{ color: '#2E7D32' }}>▲ {activeAgents.filter(a => a.action?.toLowerCase() === 'accelerate').length}</span>
                    <span style={{ color: '#E0A100' }}>◆ {activeAgents.filter(a => a.action?.toLowerCase() === 'optimize').length}</span>
                    <span style={{ color: '#C62828' }}>■ {activeAgents.filter(a => a.action?.toLowerCase() === 'intervene').length}</span>
                    <span style={{ color: '#607D8B' }}>● {activeAgents.filter(a => a.action?.toLowerCase() === 'experiment').length}</span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Legend and Threshold Notes */}
        <div style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid #E6ECF8',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          fontSize: 11.5,
          color: '#64748B'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span><span style={{ color: '#2E7D32', fontWeight: 700 }}>●</span> On target</span>
            <span><span style={{ color: '#E0A100', fontWeight: 700 }}>●</span> Watch</span>
            <span><span style={{ color: '#C62828', fontWeight: 700 }}>●</span> Off target</span>
            <span>'—' means no evals run yet / aggregated total</span>
          </div>
          <div>
            Thresholds per agent: value green ≥ $40K, red &lt; $15K · adoption green ≥ 70% · cost green ≤ 100% of budget, red &gt; 110% · eval pass target 92%, red &lt; 88% · Experiment = under 60 days in production. Rules applied in order: Experiment → Intervene → Accelerate → Optimize.
          </div>
        </div>
      </div>

      {/* Two Side-by-Side Analytics Charts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
        gap: 18
      }}>
        {/* Value vs Adoption Scatter Chart */}
        <div className="executive-card" style={{
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          borderRadius: 12,
          padding: '18px 20px',
          boxShadow: '0 4px 16px rgba(0, 52, 155, 0.08)'
        }}>
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#00349B', fontFamily: 'Satoshi, sans-serif' }}>
              Value vs adoption
            </h4>
            <div style={{ fontSize: 12, color: '#64748B' }}>
              One bubble per agent · size = monthly cost · dashed lines = Accelerate thresholds · click any bubble to inspect
            </div>
          </div>
          <div ref={scatterChartRef} style={{ height: 380, width: '100%' }} />
        </div>

        {/* Eval Pass Rate by Team Lollipop Chart */}
        <div className="executive-card" style={{
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          borderRadius: 12,
          padding: '18px 20px',
          boxShadow: '0 4px 16px rgba(0, 52, 155, 0.08)'
        }}>
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#00349B', fontFamily: 'Satoshi, sans-serif' }}>
              Eval pass rate by team
            </h4>
            <div style={{ fontSize: 12, color: '#64748B' }}>
              Axis starts at 80% · below 88% triggers Intervene · hover for each team average
            </div>
          </div>
          <div ref={evalChartRef} style={{ height: 380, width: '100%' }} />
        </div>
      </div>

      
    </div>
  );
};
