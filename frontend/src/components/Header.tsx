import React from 'react';
import { Activity, RefreshCw, Sun, Moon, Lock, LogOut, User, Shield } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  currentMonth: string;
  onMonthChange: (month: string) => void;
  selectedFunction: string;
  onFunctionChange: (fn: string) => void;
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
        return {
          shortLabel: 'CXO',
          badgeText: 'Enterprise Scope',
          color: '#00349B',
          bg: '#EFF6FF',
          border: '#BFDBFE'
        };
      case 'function_head':
        return {
          shortLabel: 'Dept Head',
          badgeText: 'Eng & IT Only',
          color: '#7C3AED',
          bg: '#FAF5FF',
          border: '#DDD6FE'
        };
      case 'finops':
        return {
          shortLabel: 'FinOps',
          badgeText: 'Finance Only',
          color: '#059669',
          bg: '#ECFDF5',
          border: '#A7F3D0'
        };
      case 'admin':
        return {
          shortLabel: 'Admin',
          badgeText: 'Super Admin',
          color: '#EA580C',
          bg: '#FFF7ED',
          border: '#FED7AA'
        };
      default:
        return {
          shortLabel: role.toUpperCase(),
          badgeText: 'Active',
          color: '#475569',
          bg: '#F1F5F9',
          border: '#CBD5E1'
        };
    }
  };

  const roleMeta = getRoleMeta(user.role);

  return (
    <header style={{
      borderBottom: isLight ? '1px solid #E2E8F0' : '1px solid #1E293B',
      background: isLight ? '#FFFFFF' : '#070D1E',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.04)' : '0 4px 20px rgba(0,0,0,0.4)',
      transition: 'background 0.2s, border-color 0.2s'
    }}>
      <div style={{
        maxWidth: 1680,
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16
      }}>
        {/* Brand & Left Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isLight ? '0 2px 8px rgba(0, 52, 155, 0.12)' : '0 2px 8px rgba(0, 0, 0, 0.4)',
            border: isLight ? '1.5px solid #E2E8F0' : '1.5px solid #334155',
            padding: 3,
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 16,
                fontWeight: 800,
                color: isLight ? '#00349B' : '#60A5FA',
                letterSpacing: '-0.3px',
                fontFamily: 'Outfit, sans-serif'
              }}>
                WCT <span style={{ opacity: 0.5 }}>//</span> AI Performance Cockpit
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                background: isLight ? '#EFF6FF' : 'rgba(2, 132, 199, 0.15)',
                color: isLight ? '#00349B' : '#38BDF8',
                border: isLight ? '1px solid #BFDBFE' : '1px solid rgba(56, 189, 248, 0.3)',
                padding: '2px 7px',
                borderRadius: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                Enterprise Live
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: isLight ? '#64748B' : '#94A3B8', marginTop: 1 }}>
              Autonomous Agent Portfolio • Financial Exposure &amp; Labor Capacity Intelligence
            </div>
          </div>
        </div>

        {/* Controls & User Profile Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Month Segmented Toggle */}
          <div style={{
            display: 'flex',
            background: isLight ? '#F1F5F9' : '#0F172A',
            border: isLight ? '1px solid #E2E8F0' : '1px solid #1E293B',
            borderRadius: 20,
            padding: 3
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
                    padding: '5px 12px',
                    fontSize: 12,
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
              title="Locked to Eng & IT by Role-Based Access Control policy."
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: isLight ? '#FAF5FF' : '#1E1B4B',
                color: isLight ? '#7C3AED' : '#C084FC',
                border: isLight ? '1.5px solid #DDD6FE' : '1px solid #4C1D95',
                borderRadius: 20,
                padding: '6px 14px',
                fontSize: 12.5,
                fontWeight: 700
              }}
            >
              <Lock size={13} />
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
                padding: '6px 14px',
                fontSize: 12.5,
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

          {/* User Profile Info Card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: isLight ? '#F8FAFC' : '#0F172A',
            border: isLight ? '1.5px solid #E2E8F0' : '1px solid #1E293B',
            borderRadius: 20,
            padding: '4px 10px 4px 6px'
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: roleMeta.bg,
              color: roleMeta.color,
              border: `1px solid ${roleMeta.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 800,
              flexShrink: 0
            }}>
              {user.role === 'cxo' ? 'CEO' : user.role === 'function_head' ? 'VP' : user.role === 'finops' ? 'FIN' : 'ADM'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: isLight ? '#0F172A' : '#F8FAFC', lineHeight: 1.15 }}>
                {user.display_name}
              </div>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: roleMeta.color, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                {roleMeta.shortLabel} • {roleMeta.badgeText}
              </div>
            </div>
          </div>

          {/* Prominent Switch User / Sign Out Button */}
          <button
            onClick={onLogout}
            title="Log out and return to the user selection screen"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: isLight ? '#EFF6FF' : '#1E293B',
              color: isLight ? '#00349B' : '#60A5FA',
              border: isLight ? '1.5px solid #BFDBFE' : '1px solid #3B82F6',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <LogOut size={13} />
            <span>Switch User</span>
          </button>

          {/* Theme Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: isLight ? '#F1F5F9' : '#0F172A',
            border: isLight ? '1px solid #E2E8F0' : '1px solid #1E293B',
            borderRadius: 20,
            padding: 2
          }}>
            <button
              onClick={() => onThemeChange('light')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: isLight ? '#FFFFFF' : 'transparent',
                color: isLight ? '#00349B' : '#64748B',
                border: isLight ? '1px solid #CBD5E1' : 'none',
                borderRadius: 16,
                padding: '4px 8px',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              <Sun size={12} />
              <span>Light</span>
            </button>
            <button
              onClick={() => onThemeChange('dark')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: !isLight ? '#1E293B' : 'transparent',
                color: !isLight ? '#F8FAFC' : '#64748B',
                border: !isLight ? '1px solid #334155' : 'none',
                borderRadius: 16,
                padding: '4px 8px',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Moon size={12} />
              <span>Dark</span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            title="Refresh metrics from telemetry pipeline"
            style={{
              background: isLight ? '#FFFFFF' : '#0F172A',
              border: isLight ? '1.5px solid #CBD5E1' : '1px solid #334155',
              borderRadius: '50%',
              width: 32,
              height: 32,
              color: isLight ? '#00349B' : '#94A3B8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
          </button>
        </div>
      </div>
    </header>
  );
};
