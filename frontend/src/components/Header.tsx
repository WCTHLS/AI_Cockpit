import React from 'react';
import { Activity, Shield, Users, Layers, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  currentMonth: string;
  onMonthChange: (month: string) => void;
  selectedFunction: string;
  onFunctionChange: (fn: string) => void;
  user: UserProfile;
  onUserChange: (user: UserProfile) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const ROLES: UserProfile[] = [
  { email: 'cxo@wct.com', display_name: 'Chief Executive Officer', role: 'cxo', function_name: null },
  { email: 'eng_head@wct.com', display_name: 'VP of Engineering', role: 'function_head', function_name: 'Eng & IT' },
  { email: 'finops@wct.com', display_name: 'Lead FinOps Analyst', role: 'finops', function_name: null },
  { email: 'admin@wct.com', display_name: 'Cockpit Administrator', role: 'admin', function_name: null },
];

const FUNCTIONS = ['All Functions', 'Customer', 'Eng & IT', 'Finance', 'Operations', 'Sales'];

export const Header: React.FC<HeaderProps> = ({
  currentMonth,
  onMonthChange,
  selectedFunction,
  onFunctionChange,
  user,
  onUserChange,
  onRefresh,
  isLoading
}) => {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(8, 13, 26, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '14px 32px'
    }}>
      <div style={{
        maxWidth: 1600,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #00d2ff 0%, #0051ff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0, 210, 255, 0.4)'
          }}>
            <Activity color="#fff" size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: 19,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(90deg, #ffffff, #a5f3fc)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                WCT AI Value Cockpit
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                background: 'rgba(0, 210, 255, 0.15)',
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(0, 210, 255, 0.3)',
                padding: '2px 7px',
                borderRadius: 4,
                textTransform: 'uppercase'
              }}>
                MVP v1.0
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Enterprise AI Performance, Telemetry &amp; Capital Allocation
            </div>
          </div>
        </div>

        {/* Global Controls & Scoping */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {/* Month Toggle */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: 3
          }}>
            {['2026-08', '2026-09'].map(m => (
              <button
                key={m}
                onClick={() => onMonthChange(m)}
                style={{
                  background: currentMonth === m ? 'rgba(0, 210, 255, 0.2)' : 'transparent',
                  color: currentMonth === m ? '#fff' : 'var(--text-muted)',
                  border: currentMonth === m ? '1px solid rgba(0, 210, 255, 0.4)' : '1px solid transparent',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {m === '2026-08' ? 'Aug 2026' : 'Sep 2026 (Live)'}
              </button>
            ))}
          </div>

          {/* Function Filter */}
          <select
            value={selectedFunction}
            onChange={e => onFunctionChange(e.target.value)}
            disabled={user.role === 'function_head'}
            style={{
              background: 'rgba(16, 26, 51, 0.9)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              fontWeight: 500,
              cursor: user.role === 'function_head' ? 'not-allowed' : 'pointer',
              outline: 'none'
            }}
          >
            {FUNCTIONS.map(fn => (
              <option key={fn} value={fn === 'All Functions' ? '' : fn}>
                {fn}
              </option>
            ))}
          </select>

          {/* Role Persona Switcher (Crucial for enterprise demos!) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>Role:</span>
            <select
              value={user.email}
              onChange={e => {
                const found = ROLES.find(r => r.email === e.target.value);
                if (found) onUserChange(found);
              }}
              style={{
                background: 'rgba(20, 30, 58, 0.95)',
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(0, 210, 255, 0.3)',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {ROLES.map(r => (
                <option key={r.email} value={r.email}>
                  {r.display_name} ({r.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            title="Refresh metrics from telemetry pipeline"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: '8px 10px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <RefreshCw size={15} className={isLoading ? 'spin' : ''} />
          </button>
        </div>
      </div>
    </header>
  );
};
