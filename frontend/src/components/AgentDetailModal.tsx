import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle, 
  AlertTriangle, 
  ShieldAlert, 
  RotateCcw, 
  PauseCircle, 
  DollarSign, 
  Send, 
  Zap, 
  CheckCircle2, 
  Sparkles,
  Clock,
  ShieldCheck,
  Activity,
  ChevronDown,
  ChevronUp,
  Cpu,
  ExternalLink
} from 'lucide-react';
import { AgentScorecardItem } from '../types';
import { formatUSD, formatPct, fetchAgentDailySummary, AgentDailyTelemetrySummary } from '../api';

interface AgentDetailModalProps {
  agent: AgentScorecardItem | null;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const AgentDetailModal: React.FC<AgentDetailModalProps> = ({ agent, onClose, theme = 'light' }) => {
  if (!agent) return null;

  const isLight = theme === 'light';
  const isIntervene = agent.action === 'intervene';
  const isCopilotStudio = (agent as any).provider === 'Microsoft Copilot Studio' || 
    agent.name.toLowerCase().includes('supply chain') || 
    (agent as any).category === 'built_with';

  const isTicketTriage = agent.name.toLowerCase().includes('ticket triage') || 
    agent.name.toLowerCase().includes('it service desk') || 
    agent.name.toLowerCase().includes('it support');

  const isAzure = typeof window !== 'undefined' && window.location.hostname.includes('azurecontainerapps.io');
  
  const liveAgentUrl = isCopilotStudio
    ? '/api/v1/copilot-studio/ui'
    : isTicketTriage
      ? (isAzure ? 'https://wct-it-agent.kindbay-88317352.eastus2.azurecontainerapps.io/' : 'http://localhost:8080/')
      : null;

  const [activeRemediation, setActiveRemediation] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [remediationSuccess, setRemediationSuccess] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<string>(agent.action || 'optimize');

  // Live Daily Telemetry & Employee Usage State
  const [dailySummary, setDailySummary] = useState<AgentDailyTelemetrySummary | null>(null);
  const [isLoadingDaily, setIsLoadingDaily] = useState<boolean>(true);
  const [showEmployeeBreakdown, setShowEmployeeBreakdown] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingDaily(true);
    fetchAgentDailySummary(agent.name)
      .then(data => {
        if (isMounted) {
          setDailySummary(data);
          setIsLoadingDaily(false);
        }
      })
      .catch(err => {
        console.error('Failed to load daily telemetry:', err);
        if (isMounted) setIsLoadingDaily(false);
      });
    return () => {
      isMounted = false;
    };
  }, [agent.name]);

  const handleExecuteRemediation = (actionKey: string, successMessage: string) => {
    setIsExecuting(true);
    setActiveRemediation(actionKey);
    setTimeout(() => {
      setIsExecuting(false);
      setRemediationSuccess(successMessage);
      if (actionKey === 'quarantine') {
        setAgentStatus('quarantined');
      } else if (actionKey === 'rollback') {
        setAgentStatus('optimize');
      } else if (actionKey === 'promote') {
        setAgentStatus('accelerate');
      }
    }, 600);
  };

  return (
    <div className="executive-drawer-overlay" onClick={onClose}>
      <div 
        className="executive-drawer"
        style={{
          width: 560,
          background: isLight ? '#FFFFFF' : '#0B132B',
          color: isLight ? '#0F172A' : '#F8FAFC',
          borderLeft: isLight ? '1.5px solid #CBD5E1' : '1px solid #1E293B'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: isLight ? '1px solid #E2E8F0' : '1px solid #1E293B',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          background: isLight ? '#F8FAFC' : '#070D1E'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className={`badge-status badge-${agentStatus}`} style={{ textTransform: 'uppercase', fontWeight: 800 }}>
                {agentStatus}
              </span>
              <span style={{ fontSize: 12, color: isLight ? '#64748B' : '#94A3B8' }}>
                {agent.function} • {agent.team}
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: isLight ? '#0F172A' : '#F8FAFC', margin: 0 }}>
              {agent.name}
            </h2>
            <div style={{ fontSize: 12, color: isLight ? '#64748B' : '#94A3B8', marginTop: 3 }}>
              Production Age: <b>{(agent as any).days_in_production || 180} days</b> • Tier-1 Enterprise Agent
            </div>
            {liveAgentUrl && (
              <div style={{ marginTop: 10 }}>
                <a
                  href={liveAgentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    background: isCopilotStudio ? '#464EB8' : '#0284C7',
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1.0'}
                >
                  <ExternalLink size={13} />
                  Open Live Agent ↗
                </a>
              </div>
            )}
          </div>
          <button 
            onClick={onClose}
            title="Close Drawer"
            style={{
              background: 'none',
              border: 'none',
              color: isLight ? '#64748B' : '#94A3B8',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 6
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto' }}>
          {/* Productivity Impact & Labor Capacity Card */}
          <div style={{
            background: isLight 
              ? 'linear-gradient(135deg, #EEF4FF 0%, #E0EAFF 100%)' 
              : 'linear-gradient(135deg, #0F1E3D 0%, #071530 100%)',
            border: isLight ? '1px solid #BFDBFE' : '1px solid #1E3A8A',
            borderRadius: 10,
            padding: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Clock size={16} color={isLight ? '#00349B' : '#60A5FA'} />
              <span style={{ fontSize: 13, fontWeight: 800, color: isLight ? '#00349B' : '#60A5FA' }}>
                Productivity Impact &amp; Labor Capacity
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 }}>
              <div>
                <div title={`Calculated as: ${agent.eval_passed ?? 8} successful runs × ${agent.baseline_employee_hours || 0.5} hrs baseline task time = ${Math.round(agent.hours_saved || 0)} hrs/mo`} style={{ fontSize: 24, fontWeight: 800, color: isLight ? '#00349B' : '#93C5FD', cursor: 'help' }}>
                  {Math.round(agent.hours_saved || 0).toLocaleString()} hrs / mo
                </div>
                <div style={{ fontSize: 12, color: isLight ? '#475569' : '#94A3B8' }}>
                  Workforce time returned to core strategic operations
                </div>
              </div>
              <div title={`Calculated as: ${Math.round(agent.hours_saved || 0)} hours saved ÷ 160 employee monthly working hours = ~${((agent.hours_saved || 0) / 160).toFixed(1)} Full-Time Employees`} style={{
                background: isLight ? '#FFFFFF' : '#0B132B',
                border: isLight ? '1px solid #93C5FD' : '1px solid #1E3A8A',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                color: isLight ? '#00349B' : '#60A5FA',
                cursor: 'help'
              }}>
                ~{((agent.hours_saved || 0) / 160).toFixed(1)} FTE Equiv.
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div title={`Calculated as: Gross Value (${formatUSD(agent.gross_value || (agent.net_value + agent.cost))}) - Actual AI Cost (${formatUSD(agent.cost)})&#10;Gross Value = Hours Saved × Hourly Rate ($6,500 / 160 hrs = $40.63/hr)`} style={{
              background: isLight ? '#F8FAFC' : '#0F172A',
              border: isLight ? '1px solid #E2E8F0' : '1px solid #1E293B',
              padding: 12,
              borderRadius: 8,
              cursor: 'help'
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: isLight ? '#64748B' : '#94A3B8' }}>NET AI VALUE</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: isLight ? '#00349B' : '#38BDF8', marginTop: 2 }}>
                {formatUSD(agent.net_value)}
              </div>
              <div style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8', marginTop: 2 }}>
                Gross: {formatUSD(agent.gross_value || (agent.net_value + agent.cost))}
              </div>
            </div>

            <div title={`Calculated as: (Actual Cost ${formatUSD(agent.cost)} / Budget ${formatUSD(agent.budget || agent.cost)}) × 100%&#10;Actual AI Cost = Token Cost + Monthly Infra Cost (no seat licenses for custom agents)`} style={{
              background: isLight ? '#F8FAFC' : '#0F172A',
              border: isLight ? '1px solid #E2E8F0' : '1px solid #1E293B',
              padding: 12,
              borderRadius: 8,
              cursor: 'help'
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: isLight ? '#64748B' : '#94A3B8' }}>COST VS BUDGET</div>
              <div style={{
                fontSize: 18,
                fontWeight: 800,
                color: agent.budget && agent.cost > agent.budget ? (isLight ? '#C62828' : '#F87171') : (isLight ? '#0F172A' : '#F8FAFC'),
                marginTop: 2
              }}>
                {formatUSD(agent.cost)}
              </div>
              <div style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8', marginTop: 2 }}>
                Budget: {formatUSD(agent.budget || agent.cost)} ({agent.budget ? ((agent.cost / agent.budget) * 100).toFixed(0) : 100}%)
              </div>
            </div>

            <div title={`Calculated as: (${agent.active_users || 0} active employees / ${agent.licensed_users || 4} assigned) × 100%`} style={{
              background: isLight ? '#F8FAFC' : '#0F172A',
              border: isLight ? '1px solid #E2E8F0' : '1px solid #1E293B',
              padding: 12,
              borderRadius: 8,
              cursor: 'help'
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: isLight ? '#64748B' : '#94A3B8' }}>WORKFORCE ADOPTION</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: isLight ? '#0F172A' : '#F8FAFC', marginTop: 2 }}>
                {agent.adoption_pct}%
              </div>
              <div style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8', marginTop: 2 }}>
                {agent.active_users || 0} of {agent.licensed_users || 4} assigned
              </div>
            </div>

            <div title={`Calculated as: (${agent.eval_passed ?? 0} successful sessions / ${agent.eval_runs ?? 0} total sessions) × 100% across all employees`} style={{
              background: isLight ? '#F8FAFC' : '#0F172A',
              border: isLight ? '1px solid #E2E8F0' : '1px solid #1E293B',
              padding: 12,
              borderRadius: 8,
              cursor: 'help'
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: isLight ? '#64748B' : '#94A3B8' }}>EVAL PASS RATE (ALL USERS)</div>
              <div style={{
                fontSize: 18,
                fontWeight: 800,
                color: (agent.eval_pass_rate || 0) < 80 ? (isLight ? '#C62828' : '#F87171') : (isLight ? '#16A34A' : '#34D399'),
                marginTop: 2
              }}>
                {agent.eval_pass_rate}%
              </div>
              <div style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8', marginTop: 2 }}>
                {agent.eval_passed ?? 0} / {agent.eval_runs ?? 0} passed
              </div>
            </div>
          </div>

          {/* ⚡ LIVE DAILY TELEMETRY & EMPLOYEE USAGE (TODAY'S AGGREGATED METRICS) */}
          <div style={{
            background: isLight 
              ? 'linear-gradient(180deg, #F0F6FF 0%, #FFFFFF 100%)' 
              : 'linear-gradient(180deg, #0B1E3B 0%, #0F172A 100%)',
            border: isLight ? '1.5px solid #BFDBFE' : '1px solid #1E3A8A',
            borderRadius: 10,
            padding: 16,
            boxShadow: isLight ? '0 2px 10px rgba(0, 52, 155, 0.05)' : '0 2px 10px rgba(0, 0, 0, 0.3)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: isLight ? '#00349B' : '#3B82F6',
                  color: '#FFFFFF'
                }}>
                  <Activity size={15} />
                </span>
                <div>
                  <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: isLight ? '#00349B' : '#93C5FD' }}>
                    Live Daily Telemetry &amp; Employee Usage
                  </h4>
                  <div style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8' }}>
                    Usage Date: <b>{dailySummary?.date || '2026-10-27'}</b> • {dailySummary?.employees_count || 0} active employees
                  </div>
                </div>
              </div>
              <span style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 12,
                background: '#DCFCE7',
                color: '#15803D',
                border: '1px solid #86EFAC',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }} />
                DB Synced
              </span>
            </div>

            {/* 4 Core Daily KPI Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* 1. Token Usage / Copilot Capacity Pack Usage */}
              <div title={isCopilotStudio 
                ? "Calculated as: Copilot Studio Billed Queries consumed across supply chain employees. Billed under tenant Capacity Pack ($200/mo flat for 25,000 queries) with zero per-token LLM charges."
                : "Calculated as: Sum of prompt tokens + completion tokens consumed in all employee sessions today"} style={{
                background: isLight ? '#FFFFFF' : '#0F172A',
                border: isLight ? '1px solid #D6E2FA' : '1px solid #1E293B',
                borderRadius: 8,
                padding: 12,
                cursor: 'help'
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: isLight ? '#475569' : '#94A3B8' }}>
                  {isCopilotStudio ? 'COPILOT CAPACITY & BILLED QUERIES' : 'TOKEN USAGE (ALL EMPLOYEES)'}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: isLight ? '#00349B' : '#60A5FA', marginTop: 2 }}>
                  {isCopilotStudio 
                    ? `${(dailySummary?.total_sessions ? dailySummary.total_sessions * 4 : 14)} queries`
                    : `${(dailySummary?.total_tokens || 0).toLocaleString()} tokens`}
                </div>
                <div style={{ fontSize: 10.5, color: isLight ? '#64748B' : '#94A3B8', marginTop: 3 }}>
                  {isCopilotStudio 
                    ? '1 Pack ($200/mo flat • 25k queries • 0.2% util)'
                    : `Prompt: ${(dailySummary?.prompt_tokens || 0).toLocaleString()} • Completion: ${(dailySummary?.completion_tokens || 0).toLocaleString()}`}
                </div>
              </div>

              {/* 2. Average number of sessions in a day */}
              <div title="Calculated as: Total daily sessions ÷ Number of active participating employees today" style={{
                background: isLight ? '#FFFFFF' : '#0F172A',
                border: isLight ? '1px solid #D6E2FA' : '1px solid #1E293B',
                borderRadius: 8,
                padding: 12,
                cursor: 'help'
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: isLight ? '#475569' : '#94A3B8' }}>
                  AVG SESSIONS / DAY
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: isLight ? '#0F172A' : '#F8FAFC', marginTop: 2 }}>
                  {dailySummary?.avg_sessions_in_day || 0} <span style={{ fontSize: 11.5, fontWeight: 600 }}>per user</span>
                </div>
                <div style={{ fontSize: 10.5, color: isLight ? '#64748B' : '#94A3B8', marginTop: 3 }}>
                  {dailySummary?.total_sessions || 0} total sessions across {dailySummary?.employees_count || 0} users
                </div>
              </div>

              {/* 3. Average success rate of agent in a day (of all users) */}
              <div title="Calculated as: (Total successful sessions today ÷ Total executed sessions today) × 100%" style={{
                background: isLight ? '#FFFFFF' : '#0F172A',
                border: isLight ? '1px solid #D6E2FA' : '1px solid #1E293B',
                borderRadius: 8,
                padding: 12,
                cursor: 'help'
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: isLight ? '#475569' : '#94A3B8' }}>
                  AVG SUCCESS RATE (ALL USERS)
                </div>
                <div style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: (dailySummary?.avg_success_rate_pct || 0) >= 80 ? (isLight ? '#16A34A' : '#4ADE80') : (isLight ? '#DC2626' : '#F87171'),
                  marginTop: 2
                }}>
                  {dailySummary?.avg_success_rate_pct || 0}%
                </div>
                <div style={{ fontSize: 10.5, color: isLight ? '#64748B' : '#94A3B8', marginTop: 3 }}>
                  {dailySummary?.total_success_count || 0} of {dailySummary?.total_sessions || 0} sessions successful
                </div>
              </div>

              {/* 4. Average agent completion time */}
              <div title="Calculated as: Average duration in seconds from agent_start_time to agent_end_time across all runs today" style={{
                background: isLight ? '#FFFFFF' : '#0F172A',
                border: isLight ? '1px solid #D6E2FA' : '1px solid #1E293B',
                borderRadius: 8,
                padding: 12,
                cursor: 'help'
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: isLight ? '#475569' : '#94A3B8' }}>
                  AVG AGENT COMPLETION TIME
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: isLight ? '#0F172A' : '#F8FAFC', marginTop: 2 }}>
                  {dailySummary?.avg_agent_completion_seconds || 0}s
                </div>
                <div style={{ fontSize: 10.5, color: isLight ? '#64748B' : '#94A3B8', marginTop: 3 }}>
                  Loop execution time across all users
                </div>
              </div>
            </div>

            {/* Employee Breakdown Table */}
            {dailySummary && dailySummary.employees_breakdown && dailySummary.employees_breakdown.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <button
                  onClick={() => setShowEmployeeBreakdown(!showEmployeeBreakdown)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px 0',
                    fontSize: 12,
                    fontWeight: 700,
                    color: isLight ? '#00349B' : '#60A5FA',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span>{showEmployeeBreakdown ? 'Hide' : 'Show'} Employee Usage Breakdown ({dailySummary.employees_breakdown.length} Employees)</span>
                  {showEmployeeBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showEmployeeBreakdown && (
                  <div style={{
                    marginTop: 8,
                    background: isLight ? '#FFFFFF' : '#0F172A',
                    border: isLight ? '1px solid #E2E8F0' : '1px solid #1E293B',
                    borderRadius: 6,
                    overflow: 'hidden'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                      <thead>
                        <tr style={{ background: isLight ? '#F8FAFC' : '#1E293B', borderBottom: isLight ? '1px solid #E2E8F0' : '1px solid #334155' }}>
                          <th style={{ textAlign: 'left', padding: '7px 10px', color: isLight ? '#64748B' : '#94A3B8' }}>Employee</th>
                          <th style={{ textAlign: 'center', padding: '7px 8px', color: isLight ? '#64748B' : '#94A3B8' }}>Sessions</th>
                          <th style={{ textAlign: 'right', padding: '7px 8px', color: isLight ? '#64748B' : '#94A3B8' }}>{isCopilotStudio ? "Billed Queries & Topic" : "Tokens (In/Out)"}</th>
                          <th style={{ textAlign: 'center', padding: '7px 8px', color: isLight ? '#64748B' : '#94A3B8' }}>Success Rate</th>
                          <th style={{ textAlign: 'right', padding: '7px 10px', color: isLight ? '#64748B' : '#94A3B8' }}>Avg Completion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailySummary.employees_breakdown.map((emp, i) => (
                          <tr key={emp.employee_id || i} style={{ borderBottom: isLight ? '1px solid #F1F5F9' : '1px solid #1E293B' }}>
                            <td style={{ padding: '7px 10px', fontWeight: 600, color: isLight ? '#0F172A' : '#F8FAFC' }}>
                              <div>{emp.display_name}</div>
                              <div style={{ fontSize: 10, color: isLight ? '#64748B' : '#94A3B8', fontWeight: 400 }}>{emp.email}</div>
                            </td>
                            <td style={{ textAlign: 'center', padding: '7px 8px', fontWeight: 700, color: isLight ? '#00349B' : '#93C5FD' }}>
                              {emp.sessions_count}
                            </td>
                            <td style={{ textAlign: 'right', padding: '7px 8px' }}>
                              {isCopilotStudio ? (
                                <>
                                  <div style={{ fontWeight: 700, color: isLight ? '#5B5FC7' : '#A5B4FC' }}>
                                    {emp.sessions_count * 4} queries
                                  </div>
                                  <div style={{ fontSize: 9.5, color: isLight ? '#64748B' : '#94A3B8' }}>SAP Shipment &amp; RMA</div>
                                </>
                              ) : (
                                <>
                                  <div style={{ fontWeight: 600 }}>{emp.total_tokens.toLocaleString()}</div>
                                  <div style={{ fontSize: 9.5, color: isLight ? '#64748B' : '#94A3B8' }}>{emp.prompt_tokens}/{emp.completion_tokens}</div>
                                </>
                              )}
                            </td>
                            <td style={{ textAlign: 'center', padding: '7px 8px' }}>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 700,
                                background: emp.success_rate_pct >= 80 ? '#ECFDF5' : '#FEF2F2',
                                color: emp.success_rate_pct >= 80 ? '#059669' : '#DC2626'
                              }}>
                                {emp.success_rate_pct}% ({emp.sucess}/{emp.sessions_count})
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 600, color: isLight ? '#334155' : '#E2E8F0' }}>
                              {emp.agent_completion}s
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Governance & Action Guidance */}
          <div style={{
            background: isIntervene ? (isLight ? '#FEF2F2' : '#450A0A') : (isLight ? '#F0FDF4' : '#064E3B'),
            border: `1px solid ${isIntervene ? (isLight ? '#FECACA' : '#7F1D1D') : (isLight ? '#BBF7D0' : '#065F46')}`,
            borderRadius: 8,
            padding: 14
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {isIntervene ? (
                <AlertTriangle size={16} color={isLight ? '#DC2626' : '#F87171'} />
              ) : (
                <CheckCircle size={16} color={isLight ? '#16A34A' : '#34D399'} />
              )}
              <span style={{ fontSize: 13, fontWeight: 700, color: isIntervene ? (isLight ? '#DC2626' : '#F87171') : (isLight ? '#16A34A' : '#34D399') }}>
                Governance Decision Guidance
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, color: isLight ? '#334155' : '#E2E8F0' }}>
              {agent.suggested_action || (isIntervene ? 'Action required. Agent triggers governance thresholds with costs exceeding budget or eval accuracy under 88% SLA.' : 'Stable production performance. Solid adoption and positive value return. Continue periodic eval checks.')}
            </p>
          </div>

          {/* ACTIVE REMEDIATION ACTIONS CONSOLE */}
          <div style={{
            background: isLight ? '#FFFFFF' : '#0B132B',
            border: isLight ? '1.5px solid #CBD5E1' : '1px solid #1E293B',
            borderRadius: 10,
            padding: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={16} color={isIntervene ? '#DC2626' : '#00349B'} />
                <div>
                  <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: isLight ? '#0F172A' : '#F8FAFC' }}>
                    One-Click Governance Remediation Console
                  </h4>
                </div>
              </div>

              {agentStatus !== (agent.action || 'optimize') && (
                <span style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 4,
                  background: '#ECFDF5',
                  color: '#059669',
                  border: '1px solid #A7F3D0'
                }}>
                  Applied
                </span>
              )}
            </div>

            {remediationSuccess && (
              <div style={{
                padding: '10px 12px',
                borderRadius: 6,
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#065F46',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12
              }}>
                <CheckCircle2 size={15} color="#059669" style={{ flexShrink: 0 }} />
                <span>{remediationSuccess}</span>
              </div>
            )}

            {isIntervene ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  onClick={() => handleExecuteRemediation(
                    'quarantine',
                    `🛡️ Quarantined: ${agent.name} traffic routed to supervisor queue.`
                  )}
                  disabled={isExecuting || agentStatus === 'quarantined'}
                  style={{
                    background: isLight ? '#FEF2F2' : '#450A0A',
                    border: isLight ? '1px solid #FECACA' : '1px solid #7F1D1D',
                    color: isLight ? '#DC2626' : '#FCA5A5',
                    borderRadius: 6,
                    padding: '10px 12px',
                    textAlign: 'left',
                    cursor: isExecuting || agentStatus === 'quarantined' ? 'not-allowed' : 'pointer',
                    opacity: agentStatus === 'quarantined' ? 0.6 : 1
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700 }}>
                    {agentStatus === 'quarantined' ? 'Quarantined' : 'Quarantine Agent'}
                  </div>
                  <div style={{ fontSize: 10.5, color: isLight ? '#991B1B' : '#F87171', marginTop: 2 }}>
                    Halt customer traffic immediately
                  </div>
                </button>

                <button
                  onClick={() => handleExecuteRemediation(
                    'rollback',
                    `⏪ Rolled Back: ${agent.name} reverted to v2.3 prompt baseline.`
                  )}
                  disabled={isExecuting || agentStatus === 'optimize'}
                  style={{
                    background: isLight ? '#F0FDF4' : '#064E3B',
                    border: isLight ? '1px solid #BBF7D0' : '1px solid #065F46',
                    color: isLight ? '#166534' : '#6EE7B7',
                    borderRadius: 6,
                    padding: '10px 12px',
                    textAlign: 'left',
                    cursor: isExecuting ? 'not-allowed' : 'pointer'
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700 }}>Rollback to v2.3</div>
                  <div style={{ fontSize: 10.5, color: isLight ? '#14532D' : '#34D399', marginTop: 2 }}>
                    Revert to last validated prompt
                  </div>
                </button>

                <button
                  onClick={() => handleExecuteRemediation(
                    'spend_cap',
                    `🛑 Hard Cap: $15K/mo spend cap enforced on ${agent.name}.`
                  )}
                  disabled={isExecuting}
                  style={{
                    background: isLight ? '#FFFBEB' : '#451A03',
                    border: isLight ? '1px solid #FDE68A' : '1px solid #78350F',
                    color: isLight ? '#B45309' : '#FCD34D',
                    borderRadius: 6,
                    padding: '10px 12px',
                    textAlign: 'left',
                    cursor: isExecuting ? 'not-allowed' : 'pointer'
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700 }}>Hard Spend Cap</div>
                  <div style={{ fontSize: 10.5, color: isLight ? '#78350F' : '#FBBF24', marginTop: 2 }}>
                    Cap monthly spend to $15K
                  </div>
                </button>

                <button
                  onClick={() => handleExecuteRemediation(
                    'jira',
                    `📨 Incident Filed: Ticket #AI-892 sent to ${agent.team} Lead.`
                  )}
                  disabled={isExecuting}
                  style={{
                    background: isLight ? '#EFF6FF' : '#172554',
                    border: isLight ? '1px solid #BFDBFE' : '1px solid #1E40AF',
                    color: isLight ? '#1D4ED8' : '#93C5FD',
                    borderRadius: 6,
                    padding: '10px 12px',
                    textAlign: 'left',
                    cursor: isExecuting ? 'not-allowed' : 'pointer'
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700 }}>File P0 Jira Bug</div>
                  <div style={{ fontSize: 10.5, color: isLight ? '#1E3A8A' : '#60A5FA', marginTop: 2 }}>
                    Notify engineering team lead
                  </div>
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  onClick={() => handleExecuteRemediation(
                    'promote',
                    `🚀 Promoted: ${agent.name} approved for company-wide deployment.`
                  )}
                  disabled={isExecuting || agentStatus === 'accelerate'}
                  style={{
                    background: isLight ? '#F0FDF4' : '#064E3B',
                    border: isLight ? '1px solid #BBF7D0' : '1px solid #065F46',
                    color: isLight ? '#166534' : '#6EE7B7',
                    borderRadius: 6,
                    padding: '10px 12px',
                    textAlign: 'left',
                    cursor: isExecuting ? 'not-allowed' : 'pointer'
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700 }}>Promote to Accelerate</div>
                  <div style={{ fontSize: 10.5, color: isLight ? '#14532D' : '#34D399', marginTop: 2 }}>
                    Expand to enterprise rollout
                  </div>
                </button>

                <button
                  onClick={() => handleExecuteRemediation(
                    'scale_gpu',
                    `⚡ Scaled: Dedicated inference cache allocated to ${agent.name}.`
                  )}
                  disabled={isExecuting}
                  style={{
                    background: isLight ? '#EFF6FF' : '#172554',
                    border: isLight ? '1px solid #BFDBFE' : '1px solid #1E40AF',
                    color: isLight ? '#1D4ED8' : '#93C5FD',
                    borderRadius: 6,
                    padding: '10px 12px',
                    textAlign: 'left',
                    cursor: isExecuting ? 'not-allowed' : 'pointer'
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700 }}>Scale GPU Cache</div>
                  <div style={{ fontSize: 10.5, color: isLight ? '#1E3A8A' : '#60A5FA', marginTop: 2 }}>
                    Accelerate inference latency by 45%
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Close Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={onClose}
              style={{
                background: '#00349B',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 6,
                padding: '10px 24px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Close Telemetry Inspector
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
