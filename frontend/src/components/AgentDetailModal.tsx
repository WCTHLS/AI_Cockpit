import React from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
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

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: isLight ? 'rgba(11, 31, 77, 0.5)' : 'rgba(4, 7, 18, 0.85)',
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
        maxWidth: 720,
        width: '100%',
        boxShadow: isLight ? '0 16px 40px rgba(0, 52, 155, 0.2)' : '0 20px 50px rgba(0,0,0,0.6)',
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        maxHeight: '90vh',
        overflowY: 'auto'
      }}
      onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: isLight ? '#00349B' : '#fff' }}>{agent.name}</h2>
              <span className={`badge-status badge-${agent.action}`}>
                {agent.action}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {agent.team} · {agent.function} · {agent.days_in_production} days in production
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12
        }}>
          <div style={{
            background: isLight ? '#F3F6FC' : 'rgba(0,0,0,0.3)',
            border: isLight ? '1px solid #D6E2FA' : 'none',
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
            background: isLight ? '#F3F6FC' : 'rgba(0,0,0,0.3)',
            border: isLight ? '1px solid #D6E2FA' : 'none',
            padding: 14,
            borderRadius: 10
          }}>
            <span style={{ fontSize: 11, color: isLight ? '#475569' : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
              Hours Saved
            </span>
            <div style={{ fontSize: 20, fontWeight: 800, color: isLight ? '#00349B' : '#fff', marginTop: 4 }}>
              {agent.hours_saved.toLocaleString()}h
            </div>
          </div>
          <div style={{
            background: isLight ? '#F3F6FC' : 'rgba(0,0,0,0.3)',
            border: isLight ? '1px solid #D6E2FA' : 'none',
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
            background: isLight ? '#F3F6FC' : 'rgba(0,0,0,0.3)',
            border: isLight ? '1px solid #D6E2FA' : 'none',
            padding: 14,
            borderRadius: 10
          }}>
            <span style={{ fontSize: 11, color: isLight ? '#475569' : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
              Adoption Rate
            </span>
            <div style={{ fontSize: 20, fontWeight: 800, color: isLight ? '#1B5E20' : '#10b981', marginTop: 4 }}>
              {agent.adoption_pct}%
            </div>
          </div>
        </div>

        {/* Quality & Telemetry Section */}
        <div style={{
          background: isLight ? '#F3F6FC' : 'rgba(0,0,0,0.2)',
          padding: 18,
          borderRadius: 12,
          border: isLight ? '1px solid #D6E2FA' : '1px solid var(--border-subtle)'
        }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: isLight ? '#00349B' : 'var(--accent-cyan)' }}>
            Evaluation &amp; Governance Telemetry
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Automated Eval Runs / Passed:</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                {agent.eval_passed} / {agent.eval_runs} ({formatPct(agent.eval_pass_rate)})
              </div>
            </div>
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Policy &amp; Safety Incidents:</span>
              <div style={{
                fontSize: 15,
                fontWeight: 700,
                color: agent.policy_incidents > 0 ? (isLight ? '#C62828' : '#f87171') : (isLight ? '#1B5E20' : '#34d399'),
                marginTop: 2
              }}>
                {agent.policy_incidents} logged
              </div>
            </div>
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Active Users vs Licensed:</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                {agent.active_users} active / {agent.licensed_users} licensed
              </div>
            </div>
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Allocated Budget Plan:</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                {formatUSD(agent.budget)} ({((agent.cost / agent.budget) * 100).toFixed(0)}% used)
              </div>
            </div>
          </div>
        </div>

        {/* Action Explanation & Remediation */}
        <div style={{
          background: agent.action === 'intervene' 
            ? (isLight ? '#F9DEDC' : 'rgba(239, 68, 68, 0.1)') 
            : (isLight ? '#E9EFFB' : 'rgba(0, 210, 255, 0.08)'),
          border: `1px solid ${agent.action === 'intervene' ? (isLight ? '#F8BBD0' : 'rgba(239, 68, 68, 0.3)') : (isLight ? '#BFD0FF' : 'rgba(0, 210, 255, 0.2)')}`,
          padding: 16,
          borderRadius: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {agent.action === 'intervene' ? (
              <AlertTriangle size={18} color={isLight ? '#A4161A' : '#f87171'} />
            ) : (
              <CheckCircle size={18} color={isLight ? '#00349B' : 'var(--accent-cyan)'} />
            )}
            <b style={{ color: agent.action === 'intervene' ? (isLight ? '#A4161A' : '#f87171') : (isLight ? '#00349B' : 'var(--accent-cyan)') }}>
              {agent.action === 'intervene' ? 'Action Required: Intervention Protocol' : 'Action Posture Guidance'}
            </b>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-main)' }}>
            {agent.suggested_action || 'Performance within expected telemetry thresholds.'}
          </p>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
