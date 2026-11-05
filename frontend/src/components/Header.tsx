import React from 'react';
import { RefreshCw, Sun, Moon, Lock, LogOut } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  currentMonth: string;
  onMonthChange: (month: string) => void;
  selectedFunction: string;
  onFunctionChange: (fn: string) => void;
  cohort: 'enterprise' | 'pilot';
  onCohortChange: (cohort: 'enterprise' | 'pilot') => void;
  user: UserProfile;
  onUserChange: (user: UserProfile) => void;
  onLogout: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
}

const FUNCTIONS = ['All Functions', 'Customer', 'Eng & IT', 'Finance', 'Operations', 'Sales'];

export const Header: React.FC<HeaderProps> = ({
  currentMonth,
  onMonthChange,
  selectedFunction,
  onFunctionChange,
  cohort,
  onCohortChange,
  user,
  onLogout,
  onRefresh,
  isLoading,
  theme,
  onThemeChange
}) => {
  const isLight = theme === 'light';
  const isDeptLocked = user.role === 'function_head' || user.role === 'finops';
  const lockedDeptName = user.role === 'finops' ? 'Finance' : (user.function_name || 'Eng & IT');

  const getRoleMeta = (role: string) => {
    switch (role) {
      case 'cxo':
        return { shortLabel: 'CXO', badgeText: 'Enterprise Scope', color: '#00349B', bg: '#EFF6FF', border: '#BFDBFE' };
      case 'function_head':
        return { shortLabel: 'Dept Head', badgeText: 'Eng & IT Only', color: '#7C3AED', bg: '#FAF5FF', border: '#DDD6FE' };
      case 'finops':
        return { shortLabel: 'FinOps', badgeText: 'Finance Only', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };
      case 'admin':
        return { shortLabel: 'Admin', badgeText: 'Super Admin', color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' };
      default:
        return { shortLabel: role.toUpperCase(), badgeText: 'Active', color: '#475569', bg: '#F1F5F9', border: '#CBD5E1' };
    }
  };

  const roleMeta = getRoleMeta(user.role);

  return (
    <header className="cockpit-header" style={{
      borderBottom: isLight ? '1px solid #E2E8F0' : '1px solid #1E293B',
      background: isLight ? '#FFFFFF' : '#070D1E',
      boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.04)' : '0 4px 20px rgba(0,0,0,0.4)',
    }}>
      <div className="cockpit-header-inner">
        {/* Tier 1: Logo, Brand & Primary Actions */}
        <div className="header-brand-wrap">
          <div className="header-brand-left">
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isLight ? '0 2px 8px rgba(0, 52, 155, 0.12)' : '0 2px 8px rgba(0, 0, 0, 0.4)',
              border: isLight ? '1.5px solid #E2E8F0' : '1.5px solid #334155',
              padding: 2,
              flexShrink: 0,
              overflow: 'hidden'
            }}>
              <img 
                src="/WCT_logo.png" 
                alt="WCT Logo" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: isLight ? '#00349B' : '#60A5FA',
                  letterSpacing: '-0.3px',
                  fontFamily: 'Outfit, sans-serif',
                  whiteSpace: 'nowrap'
                }}>
                  WCT <span style={{ opacity: 0.5 }}>//</span> AI Cockpit
                </span>
                <span style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  background: isLight ? '#EFF6FF' : 'rgba(2, 132, 199, 0.15)',
                  color: isLight ? '#00349B' : '#38BDF8',
                  border: isLight ? '1px solid #BFDBFE' : '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '1px 6px',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  Live
                </span>
              </div>
              <div className="header-sub-text" style={{ color: isLight ? '#64748B' : '#94A3B8' }}>
                Autonomous Agent Portfolio • Labor Capacity Intelligence
              </div>
            </div>
          </div>

          {/* Quick Right Utilities (Theme & Refresh, rendered ONCE) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Theme Toggle Button */}
            <button
              onClick={() => onThemeChange(isLight ? 'dark' : 'light')}
              title={`Switch to ${isLight ? 'Dark' : 'Light'} theme`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                background: isLight ? '#F1F5F9' : '#0F172A',
                color: isLight ? '#00349B' : '#F8FAFC',
                border: isLight ? '1px solid #CBD5E1' : '1px solid #334155',
                borderRadius: 20,
                padding: '5px 10px',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {isLight ? <Moon size={13} /> : <Sun size={13} />}
              <span className="theme-toggle-label">{isLight ? 'Dark' : 'Light'}</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              title="Refresh telemetry pipeline data"
              style={{
                background: isLight ? '#FFFFFF' : '#0F172A',
                border: isLight ? '1.5px solid #CBD5E1' : '1px solid #334155',
                borderRadius: '50%',
                width: 30,
                height: 30,
                color: isLight ? '#00349B' : '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
            >
              <RefreshCw size={13} className={isLoading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Tier 2: Slicers, Filters & Persona Bar */}
        <div className="header-controls-wrap">
          {/* Cohort Toggle (Enterprise Scale vs Live Pilot) */}
          <div style={{
            display: 'inline-flex',
            background: isLight ? '#F1F5F9' : '#0F172A',
            border: isLight ? '1px solid #E2E8F0' : '1px solid #1E293B',
            borderRadius: 20,
            padding: 2
          }}>
            <button
              onClick={() => onCohortChange('enterprise')}
              title="Enterprise Scale Portfolio: 1,248 Autonomous Agents"
              style={{
                background: cohort === 'enterprise' ? '#00349B' : 'transparent',
                color: cohort === 'enterprise' ? '#FFFFFF' : (isLight ? '#475569' : '#94A3B8'),
                border: 'none',
                borderRadius: 16,
                padding: '4px 10px',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap'
              }}
            >
              Enterprise View (1,248)
            </button>
            <button
              onClick={() => onCohortChange('pilot')}
              title="Live Interactive Pilot: 4 Onboarded Production Agents"
              style={{
                background: cohort === 'pilot' ? '#00349B' : 'transparent',
                color: cohort === 'pilot' ? '#FFFFFF' : (isLight ? '#475569' : '#94A3B8'),
                border: 'none',
                borderRadius: 16,
                padding: '4px 10px',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap'
              }}
            >
              Pilot View (4)
            </button>
          </div>

          {/* Month Segmented Toggle */}
          <div style={{
            display: 'inline-flex',
            background: isLight ? '#F1F5F9' : '#0F172A',
            border: isLight ? '1px solid #E2E8F0' : '1px solid #1E293B',
            borderRadius: 20,
            padding: 2
          }}>
            {['2026-09', '2026-10'].map(m => {
              const active = currentMonth === m;
              return (
                <button
                  key={m}
                  onClick={() => onMonthChange(m)}
                  style={{
                    background: active ? '#00349B' : 'transparent',
                    color: active ? '#FFFFFF' : (isLight ? '#475569' : '#94A3B8'),
                    border: 'none',
                    borderRadius: 16,
                    padding: '4px 10px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {m === '2026-09' ? 'Sep 2026' : 'Oct 2026 (Live)'}
                </button>
              );
            })}
          </div>

          {/* Business Function Filter */}
          {isDeptLocked ? (
            <div
              title="Locked by Role-Based Access Control policy."
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: isLight ? '#FAF5FF' : '#1E1B4B',
                color: isLight ? '#7C3AED' : '#C084FC',
                border: isLight ? '1.5px solid #DDD6FE' : '1px solid #4C1D95',
                borderRadius: 20,
                padding: '4px 10px',
                fontSize: 11.5,
                fontWeight: 700,
                whiteSpace: 'nowrap'
              }}
            >
              <Lock size={12} />
              <span>{lockedDeptName} (Locked)</span>
            </div>
          ) : (
            <select
              value={selectedFunction}
              onChange={e => onFunctionChange(e.target.value)}
              style={{
                background: isLight ? '#FFFFFF' : '#0F172A',
                color: isLight ? '#0F172A' : '#F8FAFC',
                border: isLight ? '1.5px solid #CBD5E1' : '1px solid #334155',
                borderRadius: 20,
                padding: '4px 10px',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {FUNCTIONS.map(fn => (
                <option key={fn} value={fn === 'All Functions' ? '' : fn}>
                  {fn}
                </option>
              ))}
            </select>
          )}

          {/* User Persona & Role Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: isLight ? '#F8FAFC' : '#0F172A',
            border: isLight ? '1.5px solid #E2E8F0' : '1px solid #1E293B',
            borderRadius: 20,
            padding: '3px 8px 3px 4px'
          }}>
            <div style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: roleMeta.bg,
              color: roleMeta.color,
              border: `1px solid ${roleMeta.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9.5,
              fontWeight: 800,
              flexShrink: 0
            }}>
              {user.role === 'cxo' ? 'CEO' : user.role === 'function_head' ? 'VP' : user.role === 'finops' ? 'FIN' : 'ADM'}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: isLight ? '#0F172A' : '#F8FAFC', whiteSpace: 'nowrap' }}>
              {user.display_name}
            </div>
            <span style={{
              fontSize: 9,
              fontWeight: 800,
              color: roleMeta.color,
              background: roleMeta.bg,
              padding: '1px 5px',
              borderRadius: 10,
              textTransform: 'uppercase'
            }}>
              {roleMeta.shortLabel}
            </span>
          </div>

          {/* Switch User Button */}
          <button
            onClick={onLogout}
            title="Log out and return to persona selection screen"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: isLight ? '#EFF6FF' : '#1E293B',
              color: isLight ? '#00349B' : '#60A5FA',
              border: isLight ? '1.5px solid #BFDBFE' : '1px solid #3B82F6',
              borderRadius: 20,
              padding: '4px 10px',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <LogOut size={12} />
            <span>Switch</span>
          </button>
        </div>
      </div>
    </header>
  );
};
