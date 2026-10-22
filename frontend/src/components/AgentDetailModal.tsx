import React, { useState } from 'react';
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
  ShieldCheck
} from 'lucide-react';
import { AgentScorecardItem } from '../types';
import { formatUSD, formatPct } from '../api';

interface AgentDetailModalProps {
  agent: AgentScorecardItem | null;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const AgentDetailModal: React.FC<AgentDetailModalProps> = ({ agent, onClose, theme = 'light' }) => {
  if (!agent) return null;

  const isLight = theme === 'light';
  const isIntervene = agent.action === 'intervene';

  const [activeRemediation, setActiveRemediation] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [remediationSuccess, setRemediationSuccess] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<string>(agent.action || 'optimize');

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
                <div style={{ fontSize: 24, fontWeight: 800, color: isLight ? '#00349B' : '#93C5FD' }}>
                  {Math.round(agent.hours_saved || 0).toLocaleString()} hrs / mo
                </div>
                <div style={{ fontSize: 12, color: isLight ? '#475569' : '#94A3B8' }}>
                  Workforce time returned to core strategic operations
                </div>
              </div>
              <div style={{
                background: isLight ? '#FFFFFF' : '#0B132B',
                border: isLight ? '1px solid #93C5FD' : '1px solid #1E3A8A',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                color: isLight ? '#00349B' : '#60A5FA'
              }}>
                ~{((agent.hours_saved || 0) / 160).toFixed(1)} FTE Equiv.
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{
              background: isLight ? '#F8FAFC' : '#0F172A',
              border: isLight ? '1px solid #E2E8F0' : '1px solid #1E293B',
              padding: 12,
              borderRadius: 8
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: isLight ? '#64748B' : '#94A3B8' }}>NET AI VALUE</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: isLight ? '#00349B' : '#38BDF8', marginTop: 2 }}>
                {formatUSD(agent.net_value)}
              </div>
              <div style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8', marginTop: 2 }}>
                Gross: {formatUSD(agent.gross_value || (agent.net_value + agent.cost))}
              </div>
            </div>

            <div style={{
              background: isLight ? '#F8FAFC' : '#0F172A',
              border: isLight ? '1px solid #E2E8F0' : '1px solid #1E293B',
              padding: 12,
              borderRadius: 8
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

            <div style={{
              background: isLight ? '#F8FAFC' : '#0F172A',
              border: isLight ? '1px solid #E2E8F0' : '1px solid #1E293B',
              padding: 12,
              borderRadius: 8
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: isLight ? '#64748B' : '#94A3B8' }}>WORKFORCE ADOPTION</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: isLight ? '#0F172A' : '#F8FAFC', marginTop: 2 }}>
                {agent.adoption_pct}%
              </div>
              <div style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8', marginTop: 2 }}>
                {agent.active_users || 0} of {agent.licensed_users || 200} licensed
              </div>
            </div>

            <div style={{
              background: isLight ? '#F8FAFC' : '#0F172A',
              border: isLight ? '1px solid #E2E8F0' : '1px solid #1E293B',
              padding: 12,
              borderRadius: 8
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: isLight ? '#64748B' : '#94A3B8' }}>EVAL PASS RATE</div>
              <div style={{
                fontSize: 18,
                fontWeight: 800,
                color: agent.eval_pass_rate < 92 ? (isLight ? '#C62828' : '#F87171') : (isLight ? '#16A34A' : '#34D399'),
                marginTop: 2
              }}>
                {agent.eval_pass_rate}%
              </div>
              <div style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8', marginTop: 2 }}>
                {agent.eval_passed || 296} / {agent.eval_runs || 300} passed
              </div>
            </div>
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
