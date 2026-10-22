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
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { AgentScorecardItem } from '../types';
import { formatUSD, formatPct } from '../api';

interface AgentDetailModalProps {
  agent: AgentScorecardItem | null;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const AgentDetailModal: React.FC<AgentDetailModalProps> = ({ agent, onClose, theme = 'dark' }) => {
  if (!agent) return null;

  const isLight = theme === 'light';
  const isIntervene = agent.action === 'intervene';

  const [activeRemediation, setActiveRemediation] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [remediationSuccess, setRemediationSuccess] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<string>(agent.action);

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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: isLight ? 'rgba(11, 31, 77, 0.55)' : 'rgba(4, 7, 18, 0.88)',
      backdropFilter: isLight ? 'none' : 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20
    }}
    onClick={onClose}
    >
      <div style={{
        background: isLight ? '#FFFFFF' : 'rgba(16, 26, 51, 0.98)',
        border: isLight ? '2px solid #00349B' : '1px solid rgba(0, 210, 255, 0.3)',
        borderRadius: 16,
        maxWidth: 780,
        width: '100%',
        boxShadow: isLight ? '0 16px 40px rgba(0, 52, 155, 0.2)' : '0 20px 50px rgba(0,0,0,0.6)',
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        maxHeight: '92vh',
        overflowY: 'auto'
      }}
      onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: isLight ? '#00349B' : '#fff', margin: 0 }}>
                {agent.name}
              </h2>
              <span className={`badge-status badge-${agentStatus}`} style={{ textTransform: 'uppercase', fontWeight: 800 }}>
                {agentStatus}
              </span>
            </div>
            <p style={{ fontSize: 13, color: isLight ? '#64748B' : 'var(--text-muted)', marginTop: 4, margin: '4px 0 0 0' }}>
              {agent.team} • {agent.function} • {agent.days_in_production} days in production
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: isLight ? '#F3F6FC' : 'rgba(255, 255, 255, 0.08)',
              border: isLight ? '1px solid #D6E2FA' : 'none',
              color: isLight ? '#00349B' : 'var(--text-muted)',
              borderRadius: 8,
              padding: 6,
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 4 Quick Metric Tiles */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12
        }}>
          <div style={{
            background: isLight ? '#F8FAFC' : 'rgba(0,0,0,0.3)',
            border: isLight ? '1px solid #E2E8F0' : 'none',
            padding: 14,
            borderRadius: 10
          }}>
            <span style={{ fontSize: 11, color: isLight ? '#475569' : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
              Monthly Net Value
            </span>
            <div style={{ fontSize: 20, fontWeight: 800, color: isLight ? '#00349B' : '#00d2ff', marginTop: 4 }}>
              {formatUSD(agent.net_value)}
            </div>
          </div>
          <div style={{
            background: isLight ? '#F8FAFC' : 'rgba(0,0,0,0.3)',
            border: isLight ? '1px solid #E2E8F0' : 'none',
            padding: 14,
            borderRadius: 10
          }}>
            <span style={{ fontSize: 11, color: isLight ? '#475569' : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
              Hours Saved
            </span>
            <div style={{ fontSize: 20, fontWeight: 800, color: isLight ? '#0F172A' : '#fff', marginTop: 4 }}>
              {agent.hours_saved.toLocaleString()}h
            </div>
          </div>
          <div style={{
            background: isLight ? '#F8FAFC' : 'rgba(0,0,0,0.3)',
            border: isLight ? '1px solid #E2E8F0' : 'none',
            padding: 14,
            borderRadius: 10
          }}>
            <span style={{ fontSize: 11, color: isLight ? '#475569' : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
              Incurred Cost
            </span>
            <div style={{ fontSize: 20, fontWeight: 800, color: isLight ? '#C62828' : '#f43f5e', marginTop: 4 }}>
              {formatUSD(agent.cost)}
            </div>
          </div>
          <div style={{
            background: isLight ? '#F8FAFC' : 'rgba(0,0,0,0.3)',
            border: isLight ? '1px solid #E2E8F0' : 'none',
            padding: 14,
            borderRadius: 10
          }}>
            <span style={{ fontSize: 11, color: isLight ? '#475569' : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
              Adoption Rate
            </span>
            <div style={{ fontSize: 20, fontWeight: 800, color: isLight ? '#16A34A' : '#10b981', marginTop: 4 }}>
              {agent.adoption_pct}%
            </div>
          </div>
        </div>

        {/* Quality & Telemetry Section */}
        <div style={{
          background: isLight ? '#F8FAFC' : 'rgba(0,0,0,0.2)',
          padding: 18,
          borderRadius: 12,
          border: isLight ? '1px solid #E2E8F0' : '1px solid var(--border-subtle)'
        }}>
          <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: isLight ? '#00349B' : 'var(--accent-cyan)', margin: '0 0 12px 0' }}>
            Evaluation &amp; Governance Telemetry
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <span style={{ fontSize: 12, color: isLight ? '#64748B' : 'var(--text-muted)' }}>Automated Eval Runs / Passed:</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: isLight ? '#0F172A' : 'var(--text-main)', marginTop: 2 }}>
                {agent.eval_passed} / {agent.eval_runs} ({formatPct(agent.eval_pass_rate)})
              </div>
            </div>
            <div>
              <span style={{ fontSize: 12, color: isLight ? '#64748B' : 'var(--text-muted)' }}>Policy &amp; Safety Incidents:</span>
              <div style={{
                fontSize: 15,
                fontWeight: 700,
                color: agent.policy_incidents > 0 ? (isLight ? '#C62828' : '#f87171') : (isLight ? '#16A34A' : '#34d399'),
                marginTop: 2
              }}>
                {agent.policy_incidents} logged {agent.policy_incidents > 0 ? '(Active Watch)' : '(Zero Violations)'}
              </div>
            </div>
            <div>
              <span style={{ fontSize: 12, color: isLight ? '#64748B' : 'var(--text-muted)' }}>Active Users vs Licensed:</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: isLight ? '#0F172A' : 'var(--text-main)', marginTop: 2 }}>
                {agent.active_users} active / {agent.licensed_users} licensed
              </div>
            </div>
            <div>
              <span style={{ fontSize: 12, color: isLight ? '#64748B' : 'var(--text-muted)' }}>Allocated Budget Plan:</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: isLight ? '#0F172A' : 'var(--text-main)', marginTop: 2 }}>
                {formatUSD(agent.budget)} ({((agent.cost / agent.budget) * 100).toFixed(0)}% consumed)
              </div>
            </div>
          </div>
        </div>

        {/* Diagnosis & Suggested Action Posture */}
        <div style={{
          background: isIntervene 
            ? (isLight ? '#FEF2F2' : 'rgba(239, 68, 68, 0.1)') 
            : (isLight ? '#EFF6FF' : 'rgba(0, 210, 255, 0.08)'),
          border: `1.5px solid ${isIntervene ? (isLight ? '#FECACA' : 'rgba(239, 68, 68, 0.35)') : (isLight ? '#BFDBFE' : 'rgba(0, 210, 255, 0.25)')}`,
          padding: 16,
          borderRadius: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {isIntervene ? (
              <AlertTriangle size={18} color={isLight ? '#DC2626' : '#f87171'} />
            ) : (
              <CheckCircle size={18} color={isLight ? '#00349B' : 'var(--accent-cyan)'} />
            )}
            <b style={{ color: isIntervene ? (isLight ? '#DC2626' : '#f87171') : (isLight ? '#00349B' : 'var(--accent-cyan)') }}>
              {isIntervene ? 'Action Required: Intervention Governance Protocol' : 'Action Posture Guidance'}
            </b>
          </div>
          <p style={{ fontSize: 13, color: isLight ? '#334155' : 'var(--text-main)', margin: '4px 0 0 0', lineHeight: 1.45 }}>
            {agent.suggested_action || (isIntervene ? 'Eval pass rate has dipped below the 88% threshold with token overages. Executive intervention recommended.' : 'Performance is within target operational and financial bounds.')}
          </p>
        </div>

        {/* ACTIVE REMEDIATION ACTIONS CONSOLE */}
        <div style={{
          background: isLight ? '#FFFFFF' : '#0B132B',
          border: isLight ? '1.5px solid #CBD5E1' : '1px solid #1E293B',
          borderRadius: 12,
          padding: 18,
          boxShadow: isLight ? '0 4px 12px rgba(0,0,0,0.03)' : 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: isIntervene ? '#FEE2E2' : '#EFF6FF',
                color: isIntervene ? '#DC2626' : '#00349B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShieldAlert size={16} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: isLight ? '#0F172A' : '#F8FAFC' }}>
                  One-Click Governance Remediation Console
                </h4>
                <div style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8' }}>
                  Execute automated operational guardrails directly from the Executive Cockpit
                </div>
              </div>
            </div>

            {agentStatus !== agent.action && (
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 6,
                background: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0'
              }}>
                Remediation Applied
              </span>
            )}
          </div>

          {remediationSuccess && (
            <div style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#065F46',
              fontSize: 12.5,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12
            }}>
              <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
              <span>{remediationSuccess}</span>
            </div>
          )}

          {isIntervene ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* Action 1: Quarantine */}
              <button
                onClick={() => handleExecuteRemediation(
                  'quarantine',
                  `🛡️ Agent Quarantined: ${agent.name} traffic safely routed to human supervisor queue. Safety incident contained.`
                )}
                disabled={isExecuting || agentStatus === 'quarantined'}
                style={{
                  background: isLight ? '#FEF2F2' : '#450A0A',
                  border: isLight ? '1.5px solid #FECACA' : '1px solid #7F1D1D',
                  color: isLight ? '#DC2626' : '#FCA5A5',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  textAlign: 'left',
                  cursor: isExecuting || agentStatus === 'quarantined' ? 'not-allowed' : 'pointer',
                  opacity: agentStatus === 'quarantined' ? 0.6 : 1,
                  transition: 'transform 0.1s ease'
                }}
              >
                <PauseCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {agentStatus === 'quarantined' ? 'Agent Quarantined' : 'Quarantine Agent'}
                  </div>
                  <div style={{ fontSize: 11, color: isLight ? '#7F1D1D' : '#F87171', marginTop: 2 }}>
                    Temporarily halt customer-facing traffic and reroute calls to human supervisor review.
                  </div>
                </div>
              </button>

              {/* Action 2: Rollback Prompt */}
              <button
                onClick={() => handleExecuteRemediation(
                  'rollback',
                  `⏪ Prompt Rolled Back: ${agent.name} reverted to v2.3 stable baseline. Eval pass rate projected to recover to 94.2%.`
                )}
                disabled={isExecuting || agentStatus === 'optimize'}
                style={{
                  background: isLight ? '#F0FDF4' : '#064E3B',
                  border: isLight ? '1.5px solid #BBF7D0' : '1px solid #065F46',
                  color: isLight ? '#166534' : '#6EE7B7',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  textAlign: 'left',
                  cursor: isExecuting ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.1s ease'
                }}
              >
                <RotateCcw size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Rollback Prompt to v2.3</div>
                  <div style={{ fontSize: 11, color: isLight ? '#14532D' : '#34D399', marginTop: 2 }}>
                    Instantly revert prompt to last week's validated baseline benchmark (94.6% pass rate).
                  </div>
                </div>
              </button>

              {/* Action 3: Enforce Token Cap */}
              <button
                onClick={() => handleExecuteRemediation(
                  'spend_cap',
                  `🛑 Spend Cap Enforced: Hard cap of $15,000/mo applied to ${agent.name}. Overrun halted.`
                )}
                disabled={isExecuting}
                style={{
                  background: isLight ? '#FFFBEB' : '#451A03',
                  border: isLight ? '1.5px solid #FDE68A' : '1px solid #78350F',
                  color: isLight ? '#B45309' : '#FCD34D',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  textAlign: 'left',
                  cursor: isExecuting ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.1s ease'
                }}
              >
                <DollarSign size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Enforce Hard Spend Cap</div>
                  <div style={{ fontSize: 11, color: isLight ? '#78350F' : '#FBBF24', marginTop: 2 }}>
                    Lock monthly token burn to $15,000 to immediately halt budget variance.
                  </div>
                </div>
              </button>

              {/* Action 4: Jira / DevOps Alert */}
              <button
                onClick={() => handleExecuteRemediation(
                  'jira',
                  `📨 Incident Dispatched: High-priority Jira ticket #AI-892 filed to ${agent.team} Engineering Lead.`
                )}
                disabled={isExecuting}
                style={{
                  background: isLight ? '#EFF6FF' : '#172554',
                  border: isLight ? '1.5px solid #BFDBFE' : '1px solid #1E40AF',
                  color: isLight ? '#1D4ED8' : '#93C5FD',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  textAlign: 'left',
                  cursor: isExecuting ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.1s ease'
                }}
              >
                <Send size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>File P0 Jira Incident</div>
                  <div style={{ fontSize: 11, color: isLight ? '#1E3A8A' : '#60A5FA', marginTop: 2 }}>
                    Dispatch automated alert and audit package to the team's engineering lead.
                  </div>
                </div>
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* Positive Actions for Good Agents */}
              <button
                onClick={() => handleExecuteRemediation(
                  'promote',
                  `🚀 Tier Promoted: ${agent.name} approved for enterprise-wide rollout (Accelerate Tier).`
                )}
                disabled={isExecuting || agentStatus === 'accelerate'}
                style={{
                  background: isLight ? '#F0FDF4' : '#064E3B',
                  border: isLight ? '1.5px solid #BBF7D0' : '1px solid #065F46',
                  color: isLight ? '#166534' : '#6EE7B7',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  textAlign: 'left',
                  cursor: isExecuting ? 'not-allowed' : 'pointer'
                }}
              >
                <Sparkles size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Promote to Accelerate Tier</div>
                  <div style={{ fontSize: 11, color: isLight ? '#14532D' : '#34D399', marginTop: 2 }}>
                    Certify agent as high-performing and allocate expansion capital for company-wide deployment.
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleExecuteRemediation(
                  'scale_gpu',
                  `⚡ Capacity Scaled: Dedicated H100 inference cache allocated to ${agent.name}. Latency down 45%.`
                )}
                disabled={isExecuting}
                style={{
                  background: isLight ? '#EFF6FF' : '#172554',
                  border: isLight ? '1.5px solid #BFDBFE' : '1px solid #1E40AF',
                  color: isLight ? '#1D4ED8' : '#93C5FD',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  textAlign: 'left',
                  cursor: isExecuting ? 'not-allowed' : 'pointer'
                }}
              >
                <Zap size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Scale GPU Inference Cache</div>
                  <div style={{ fontSize: 11, color: isLight ? '#1E3A8A' : '#60A5FA', marginTop: 2 }}>
                    Provision dedicated cache tier to accelerate token latency by 45% during peak hours.
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            onClick={onClose}
            style={{
              background: isLight ? '#00349B' : '#0284C7',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              padding: '9px 20px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 52, 155, 0.2)'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
