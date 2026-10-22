import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { ChevronDown, ChevronRight, Layers, Users, Maximize2, Table } from 'lucide-react';
import { AgentScorecardItem } from '../types';
import { formatUSD, formatPct } from '../api';

interface AgentScorecardTabProps {
  agents: AgentScorecardItem[];
  onSelectAgent: (agent: AgentScorecardItem) => void;
  initialActionFilter?: string;
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
  theme = 'light'
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>(initialActionFilter ? initialActionFilter.toLowerCase() : '');
  const [collapsedFunctions, setCollapsedFunctions] = useState<Set<string>>(new Set());
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'all' | 'teams' | 'functions'>('all');

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
    accelerate: agents.filter(a => a.action?.toLowerCase() === 'accelerate'),
    optimize: agents.filter(a => a.action?.toLowerCase() === 'optimize'),
    intervene: agents.filter(a => a.action?.toLowerCase() === 'intervene'),
    experiment: agents.filter(a => a.action?.toLowerCase() === 'experiment'),
  };

  // Filter agents by status if selected
  const activeAgents = selectedStatus 
    ? agents.filter(a => a.action?.toLowerCase() === selectedStatus)
    : agents;

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
      // Collapse all teams so only teams are visible
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

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [agents, isLight]);

  // Render Eval Pass Rate by Team Lollipop Chart
  useEffect(() => {
    if (!evalChartRef.current || !agents.length) return;
    const chart = echarts.init(evalChartRef.current);

    // Group teams and calculate average eval pass rate
    const teamMap: Record<string, { totalPass: number; count: number }> = {};
    agents.forEach(a => {
      if (!teamMap[a.team]) teamMap[a.team] = { totalPass: 0, count: 0 };
      teamMap[a.team].totalPass += (a.eval_pass_rate || 90);
      teamMap[a.team].count += 1;
    });

    const teamEntries = Object.entries(teamMap)
      .map(([team, val]) => ({
        team,
        passRate: Math.round(val.totalPass / (val.count || 1))
      }))
      .sort((a, b) => a.passRate - b.passRate); // Ascending for horizontal chart

    const yCategories = teamEntries.map(t => t.team);
    const passValues = teamEntries.map(t => t.passRate);

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#FFFFFF',
        borderColor: '#D6E2FA',
        textStyle: { color: '#1A1A1A', fontSize: 12 },
        formatter: (params: any) => `<b>${params.name}</b><br/>Eval Pass Rate: <b>${params.value}%</b>`
      },
      grid: { left: 140, right: 30, top: 30, bottom: 25 },
      xAxis: {
        type: 'value',
        min: 80,
        max: 100,
        axisLabel: { formatter: '{value}%', color: '#475569', fontSize: 11 },
        splitLine: { lineStyle: { color: '#E6ECF8' } },
        axisLine: { lineStyle: { color: '#BFD0FF' } }
      },
      yAxis: {
        type: 'category',
        data: yCategories,
        axisLabel: { color: '#1A1A1A', fontSize: 11.5, fontWeight: 500 },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [
        {
          name: 'Eval Pass Rate',
          type: 'scatter',
          symbolSize: 18,
          data: passValues.map((v, i) => ({
            value: v,
            itemStyle: {
              color: v >= 92 ? '#2E7D32' : v >= 88 ? '#E0A100' : '#C62828'
            },
            label: {
              show: true,
              formatter: '{@[0]}%',
              position: 'right',
              color: '#1A1A1A',
              fontSize: 10.5,
              fontWeight: 600
            }
          })),
          markLine: {
            silent: true,
            symbol: 'none',
            data: [
              { xAxis: 88, lineStyle: { type: 'dashed', color: '#C62828', width: 1.2 }, label: { formatter: '88%', position: 'start', color: '#C62828', fontSize: 10 } },
              { xAxis: 92, lineStyle: { type: 'solid', color: '#2E7D32', width: 1.2 }, label: { formatter: '92% target', position: 'start', color: '#2E7D32', fontSize: 10 } }
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
  }, [agents, isLight]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 4 Governance Action Status Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 14
      }}>
        {(['accelerate', 'optimize', 'intervene', 'experiment'] as const).map(statusKey => {
          const cfg = STATUS_CONFIG[statusKey];
          const group = statusGroups[statusKey];
          const isSelected = selectedStatus === statusKey;
          const isDim = selectedStatus !== '' && !isSelected;

          const namesSnippet = group.length > 0
            ? group.slice(0, 4).map(a => a.name.replace(' Agent', '')).join(' · ') + (group.length > 4 ? ` +${group.length - 4} more` : '')
            : 'No agents currently in this state';

          return (
            <div
              key={statusKey}
              onClick={() => setSelectedStatus(isSelected ? '' : statusKey)}
              style={{
                background: '#FFFFFF',
                border: `1.5px solid ${isSelected ? '#00349B' : '#D6E2FA'}`,
                borderLeft: `5px solid ${cfg.color}`,
                borderRadius: 12,
                padding: '16px 18px',
                cursor: 'pointer',
                boxShadow: isSelected 
                  ? '0 12px 30px rgba(0, 52, 155, 0.18)' 
                  : '0 4px 14px rgba(0, 52, 155, 0.06)',
                opacity: isDim ? 0.45 : 1,
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <div style={{
                fontSize: 12,
                fontWeight: 800,
                color: cfg.color,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <span>{cfg.icon}</span>
                <span>{cfg.label}</span>
              </div>
              <div style={{
                fontSize: 32,
                fontWeight: 800,
                color: '#00349B',
                lineHeight: 1.15,
                margin: '6px 0 4px 0',
                fontFamily: 'Satoshi, Outfit, sans-serif'
              }}>
                {group.length}
              </div>
              <div style={{
                fontSize: 12,
                color: '#64748B',
                lineHeight: 1.4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}>
                {namesSnippet}
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
        {/* Table Header Controls */}
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
              Each business function runs several teams, and each team runs several agents · agents are rated on value, adoption, cost and quality · click a row to expand or collapse
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
                fontSize: 12.5,
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
                fontSize: 12.5,
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
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Functions only
            </button>
          </div>
        </div>

        {/* Tree Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 13,
            fontFamily: 'Figtree, sans-serif'
          }}>
            <thead>
              <tr style={{ background: '#00349B', color: '#FFFFFF' }}>
                <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 12.5, fontWeight: 700 }}>
                  Business function / team / agent
                </th>
                <th style={{ textAlign: 'right', padding: '12px 12px', fontSize: 12.5, fontWeight: 700 }}>Net value / mo ▼</th>
                <th style={{ textAlign: 'right', padding: '12px 12px', fontSize: 12.5, fontWeight: 700 }}>Adoption</th>
                <th style={{ textAlign: 'right', padding: '12px 12px', fontSize: 12.5, fontWeight: 700 }}>Cost vs budget</th>
                <th style={{ textAlign: 'right', padding: '12px 12px', fontSize: 12.5, fontWeight: 700 }}>Eval pass</th>
                <th style={{ textAlign: 'right', padding: '12px 12px', fontSize: 12.5, fontWeight: 700 }}>Hours saved</th>
                <th style={{ textAlign: 'center', padding: '12px 10px', fontSize: 12.5, fontWeight: 700 }}>Incidents</th>
                <th style={{ textAlign: 'center', padding: '12px 10px', fontSize: 12.5, fontWeight: 700 }}>Days in prod</th>
                <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 12.5, fontWeight: 700 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {hierarchicalData.map(func => {
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
                                justifySelf: 'center',
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
                                onClick={() => onSelectAgent(agent)}
                                style={{
                                  borderBottom: '1px solid #F1F4F9',
                                  cursor: 'pointer',
                                  transition: 'background 0.15s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#F3F6FC'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <td style={{ padding: '7px 14px 7px 64px', color: '#1A1A1A', fontSize: 13 }}>
                                  {agent.name}
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
                                <td style={{ textAlign: 'center', padding: '7px 10px', color: '#475569' }}>
                                  {agent.policy_incidents || 0}
                                </td>
                                <td style={{ textAlign: 'center', padding: '7px 10px', color: '#64748B', fontSize: 12 }}>
                                  {agent.days_in_production || 0}
                                </td>
                                <td style={{ padding: '7px 14px' }}>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    background: cfg.bgLight,
                                    color: cfg.textLight,
                                    border: `1px solid ${cfg.color}33`,
                                    borderRadius: 14,
                                    padding: '2px 9px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    textTransform: 'capitalize'
                                  }}>
                                    <span>{cfg.icon}</span>
                                    <span>{status}</span>
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
              })}
            </tbody>

            {/* Total Footer */}
            <tfoot>
              <tr style={{
                background: '#F0F4FC',
                borderTop: '2px solid #00349B',
                fontWeight: 800,
                color: '#00349B',
                fontSize: 13
              }}>
                <td style={{ padding: '12px 14px' }}>
                  Total · {hierarchicalData.length} functions · {totalTeams} teams · {activeAgents.length} agents
                </td>
                <td style={{ textAlign: 'right', padding: '12px 12px' }}>{formatUSD(totalNetValue)}</td>
                <td style={{ textAlign: 'right', padding: '12px 12px' }}>{formatPct(avgTotalAdoption)}</td>
                <td style={{ textAlign: 'right', padding: '12px 12px' }}>{formatPct(avgTotalCostBudget)}</td>
                <td style={{ textAlign: 'right', padding: '12px 12px' }}>{formatPct(avgTotalEvalPass)}</td>
                <td style={{ textAlign: 'right', padding: '12px 12px' }}>{Math.round(totalHoursSaved).toLocaleString()}</td>
                <td style={{ textAlign: 'center', padding: '12px 10px' }}>{totalIncidents}</td>
                <td style={{ textAlign: 'center', padding: '12px 10px' }}>—</td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 6, fontSize: 11.5 }}>
                    <span style={{ color: '#2E7D32' }}>▲ {statusGroups.accelerate.length}</span>
                    <span style={{ color: '#E0A100' }}>◆ {statusGroups.optimize.length}</span>
                    <span style={{ color: '#C62828' }}>■ {statusGroups.intervene.length}</span>
                    <span style={{ color: '#607D8B' }}>● {statusGroups.experiment.length}</span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Legend & Threshold Note */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 4px 6px 4px',
          borderTop: '1px solid #D6E2FA',
          marginTop: 10,
          fontSize: 12,
          color: '#475569'
        }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <span><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#2E7D32', marginRight: 5 }} />On target</span>
            <span><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#E0A100', marginRight: 5 }} />Watch</span>
            <span><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#C62828', marginRight: 5 }} />Off target</span>
            <span style={{ color: '#94a3b8' }}>"-" means no evals run yet</span>
          </div>
          <div style={{ fontSize: 11.5, color: '#64748B', maxWidth: 880, lineHeight: 1.4 }}>
            Thresholds per agent: value green ≥ $40K, red &lt; $15K · adoption green ≥ 70% · cost green ≤ 100% of budget, red &gt; 110% · eval pass target 92%, red &lt; 88% · Experiment = under 60 days in production. Rules are applied in order: Experiment → Intervene → Accelerate → Optimize.
          </div>
        </div>
      </div>

      {/* Two Side-by-Side Analytics Charts (Value vs Adoption + Eval Pass Rate) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: 16
      }}>
        {/* Left Chart: Value vs Adoption (Scatter) */}
        <div style={{
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 4px 16px rgba(0, 52, 155, 0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#00349B', fontFamily: 'Satoshi, sans-serif' }}>
                Value vs adoption
              </h4>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>
                One bubble per agent · size = monthly cost · dashed lines = Accelerate thresholds · hover for names
              </div>
            </div>
          </div>
          <div ref={scatterChartRef} style={{ width: '100%', height: 420 }} />
        </div>

        {/* Right Chart: Eval Pass Rate by Team (Lollipop) */}
        <div style={{
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 4px 16px rgba(0, 52, 155, 0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#00349B', fontFamily: 'Satoshi, sans-serif' }}>
                Eval pass rate by team
              </h4>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>
                Axis starts at 80% · below 88% triggers Intervene · hover for each agent
              </div>
            </div>
          </div>
          <div ref={evalChartRef} style={{ width: '100%', height: 420 }} />
        </div>
      </div>
    </div>
  );
};
