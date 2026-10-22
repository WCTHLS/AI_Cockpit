import React from 'react';
import { Activity, RefreshCw, Sun, Moon } from 'lucide-react';
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
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
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
  isLoading,
  theme,
  onThemeChange
}) => {
  const isLight = theme === 'light';

  return (
    <header style={{
      borderBottom: '1px solid var(--header-border)',
      background: 'var(--header-bg)',
      backdropFilter: isLight ? 'none' : 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '14px 32px',
      transition: 'background 0.25s ease, border-color 0.25s ease'
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
        {/* Brand / Cockpit Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: isLight 
              ? '#FFFFFF' 
              : 'linear-gradient(135deg, #00d2ff 0%, #0051ff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isLight ? '0 4px 14px rgba(0,0,0,0.15)' : '0 0 20px rgba(0, 210, 255, 0.4)',
            border: isLight ? '1.5px solid #D6E2FA' : 'none'
          }}>
            <Activity color={isLight ? '#00349B' : '#fff'} size={24} strokeWidth={2.6} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: 20,
                letterSpacing: '-0.02em',
                background: 'var(--header-title-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: isLight ? '#FFFFFF' : 'transparent',
                color: '#fff'
              }}>
                WCT | AI Value &amp; Performance Cockpit
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                background: isLight ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 210, 255, 0.15)',
                color: isLight ? '#FFFFFF' : 'var(--accent-cyan)',
                border: isLight ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(0, 210, 255, 0.3)',
                padding: '2px 7px',
                borderRadius: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                Enterprise Live
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--header-sub-text)' }}>
              Autonomous Agent Portfolio · Financial Exposure &amp; Labor Capacity Intelligence
            </div>
          </div>
        </div>

        {/* Global Controls & Scoping */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Month Segmented Toggle */}
          <div style={{
            display: 'flex',
            background: isLight ? '#FFFFFF' : 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-pill)',
            padding: 3,
            boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
          }}>
            {['2026-08', '2026-09'].map(m => {
              const active = currentMonth === m;
              return (
                <button
                  key={m}
                  onClick={() => onMonthChange(m)}
                  style={{
                    background: active 
                      ? (isLight ? '#1713FD' : 'rgba(0, 210, 255, 0.2)') 
                      : 'transparent',
                    color: active 
                      ? '#FFFFFF' 
                      : (isLight ? '#00349B' : 'var(--text-muted)'),
                    border: active 
                      ? (isLight ? '1px solid #1713FD' : '1px solid rgba(0, 210, 255, 0.4)') 
                      : '1px solid transparent',
                    borderRadius: 'var(--radius-pill)',
                    padding: '5px 12px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {m === '2026-08' ? 'Aug 2026' : 'Sep 2026 (Live)'}
                </button>
              );
            })}
          </div>

          {/* Business Function Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <select
              value={selectedFunction}
              onChange={e => onFunctionChange(e.target.value)}
              disabled={user.role === 'function_head'}
              style={{
                background: isLight ? '#FFFFFF' : 'var(--bg-input)',
                color: isLight ? '#00349B' : 'var(--text-main)',
                border: isLight ? '1.5px solid #D6E2FA' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-pill)',
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 700,
                cursor: user.role === 'function_head' ? 'not-allowed' : 'pointer',
                outline: 'none',
                boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              {FUNCTIONS.map(fn => (
                <option key={fn} value={fn === 'All Functions' ? '' : fn}>
                  {fn}
                </option>
              ))}
            </select>
          </div>

          {/* Role Persona Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: isLight ? 'var(--on-navy-muted)' : 'var(--text-dim)', fontWeight: 700 }}>
              Role:
            </span>
            <select
              value={user.email}
              onChange={e => {
                const found = ROLES.find(r => r.email === e.target.value);
                if (found) onUserChange(found);
              }}
              style={{
                background: isLight ? '#FFFFFF' : 'rgba(20, 30, 58, 0.95)',
                color: isLight ? '#00349B' : 'var(--accent-cyan)',
                border: isLight ? '1.5px solid #D6E2FA' : '1px solid rgba(0, 210, 255, 0.3)',
                borderRadius: 'var(--radius-pill)',
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
                boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              {ROLES.map(r => (
                <option key={r.email} value={r.email}>
                  {r.display_name} ({r.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Theme Toggle (Dark / Light) */}
          <div
            title="Toggle Cockpit Theme (Dark vs Light WCT Executive)"
            style={{
              display: 'flex',
              alignItems: 'center',
              background: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.08)',
              border: isLight ? '1.5px solid #D6E2FA' : '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-pill)',
              padding: 2,
              gap: 2,
              boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            <button
              onClick={() => onThemeChange('dark')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: !isLight ? 'rgba(0, 210, 255, 0.25)' : 'transparent',
                color: !isLight ? '#FFFFFF' : '#00349B',
                border: !isLight ? '1px solid rgba(0, 210, 255, 0.5)' : '1px solid transparent',
                borderRadius: 'var(--radius-pill)',
                padding: '5px 10px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Moon size={13} />
              <span>Dark</span>
            </button>
            <button
              onClick={() => onThemeChange('light')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: isLight ? '#1713FD' : 'transparent',
                color: isLight ? '#FFFFFF' : 'var(--text-muted)',
                border: isLight ? '1px solid #1713FD' : '1px solid transparent',
                borderRadius: 'var(--radius-pill)',
                padding: '5px 10px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Sun size={13} />
              <span>Light</span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            title="Refresh metrics from telemetry pipeline"
            style={{
              background: isLight ? '#FFFFFF' : 'var(--bg-subtle)',
              border: isLight ? '1.5px solid #D6E2FA' : '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-pill)',
              padding: '8px 11px',
              color: isLight ? '#00349B' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <RefreshCw size={15} className={isLoading ? 'spin' : ''} />
          </button>
        </div>
      </div>
    </header>
  );
};
