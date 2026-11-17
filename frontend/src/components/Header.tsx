import { normalizeFunction, CANONICAL_FUNCTIONS } from '../utils/functionNormalize';
import React from 'react';
import { RefreshCw, Lock, LogOut, Menu, Calendar, Building2 } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  activeTabTitle?: string;
  currentMonth: string;
  onMonthChange: (month: string) => void;
  selectedFunction: string;
  onFunctionChange: (fn: string) => void;
  cohort: 'enterprise' | 'pilot';
  onCohortChange: (cohort: 'enterprise' | 'pilot') => void;
  user: UserProfile;
  onUserChange?: (user: UserProfile) => void;
  onLogout: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  theme: 'dark' | 'light';
  onThemeChange?: (theme: 'dark' | 'light') => void;
  onOpenMobileMenu?: () => void;
}

const FUNCTIONS = CANONICAL_FUNCTIONS;

export const Header: React.FC<HeaderProps> = ({
  activeTabTitle = 'Executive Summary',
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
  onOpenMobileMenu
}) => {
  const isLight = theme === 'light';
  const isDeptLocked = user.role === 'function_head' || user.role === 'finops';
  const lockedDeptName = user.role === 'finops' 
    ? 'Finance' 
    : (normalizeFunction(user.function_name) || 'Engineering & IT');

  return (
    <header
      className="cockpit-topbar"
      style={{
        background: isLight ? '#FFFFFF' : '#070D1E',
        borderBottom: isLight ? '1px solid #E2E8F0' : '1px solid #1E293B',
        position: 'sticky',
        top: 0,
        zIndex: 90,
        boxSizing: 'border-box',
        boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.03)' : '0 2px 12px rgba(0,0,0,0.3)',
        transition: 'background 0.2s, border-color 0.2s'
      }}
    >
      {/* ============================================================== */}
      {/* 1. DESKTOP / TABLET ROW (>= 768px): Sleek single line 56px     */}
      {/* ============================================================== */}
      <div className="topbar-desktop-row">
        {/* Left: Mobile Trigger (hidden on desktop) + Tab Title + Badge + Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <h1 style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 800,
            color: isLight ? '#0F172A' : '#F8FAFC',
            fontFamily: 'Outfit, Satoshi, sans-serif',
            letterSpacing: '-0.2px',
            whiteSpace: 'nowrap'
          }}>
            {activeTabTitle}
          </h1>

          <button
            onClick={onRefresh}
            title="Refresh telemetry pipeline data"
            style={{
              background: isLight ? '#F8FAFC' : '#0B132B',
              border: isLight ? '1px solid #CBD5E1' : '1px solid #334155',
              borderRadius: '50%',
              width: 28,
              height: 28,
              color: isLight ? '#00349B' : '#94A3B8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.15s ease'
            }}
          >
            <RefreshCw size={12} className={isLoading ? 'spin' : ''} />
          </button>
        </div>

        {/* Right: Slicers in One Single Row */}
        <div className="topbar-filters-wrap" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'nowrap'
        }}>
          {/* Cohort Slicer (Enterprise / Pilot) */}
          <div className="topbar-cohort-slicer" style={{
            display: 'inline-flex',
            background: isLight ? '#F1F5F9' : '#0B132B',
            border: isLight ? '1px solid #CBD5E1' : '1px solid #1E293B',
            borderRadius: 20,
            padding: 2
          }}>
            <button
              onClick={() => onCohortChange('enterprise')}
              title="Enterprise Scale Portfolio: 1,248 Autonomous Agents"
              style={{
                background: cohort === 'enterprise' ? (isLight ? '#00349B' : '#1D4ED8') : 'transparent',
                color: cohort === 'enterprise' ? '#FFFFFF' : (isLight ? '#475569' : '#94A3B8'),
                border: 'none',
                borderRadius: 16,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              Enterprise View (1,248)
            </button>
            <button
              onClick={() => onCohortChange('pilot')}
              title="Live Interactive Pilot: 4 Onboarded Production Agents"
              style={{
                background: cohort === 'pilot' ? (isLight ? '#00349B' : '#1D4ED8') : 'transparent',
                color: cohort === 'pilot' ? '#FFFFFF' : (isLight ? '#475569' : '#94A3B8'),
                border: 'none',
                borderRadius: 16,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              Pilot View (4)
            </button>
          </div>

          {/* Month Slicer */}
          <div style={{
            display: 'inline-flex',
            background: isLight ? '#F1F5F9' : '#0B132B',
            border: isLight ? '1px solid #CBD5E1' : '1px solid #1E293B',
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
                    background: active ? (isLight ? '#00349B' : '#1D4ED8') : 'transparent',
                    color: active ? '#FFFFFF' : (isLight ? '#475569' : '#94A3B8'),
                    border: 'none',
                    borderRadius: 16,
                    padding: '4px 9px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {m === '2026-09' ? 'Sep 2026' : 'Oct 2026 (Live)'}
                </button>
              );
            })}
          </div>

          {/* Department Slicer */}
          {isDeptLocked ? (
            <div
              title="Locked by Role-Based Access Control policy."
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: isLight ? '#FAF5FF' : '#1E1B4B',
                color: isLight ? '#7C3AED' : '#C084FC',
                border: isLight ? '1.5px solid #DDD6FE' : '1px solid #4C1D95',
                borderRadius: 20,
                padding: '4px 9px',
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: 'nowrap'
              }}
            >
              <Lock size={11} />
              <span>{lockedDeptName} (Locked)</span>
            </div>
          ) : (
            <select
              value={normalizeFunction(selectedFunction) || ''}
              onChange={e => onFunctionChange(normalizeFunction(e.target.value))}
              style={{
                background: isLight ? '#FFFFFF' : '#0B132B',
                color: isLight ? '#0F172A' : '#F8FAFC',
                border: isLight ? '1.5px solid #CBD5E1' : '1px solid #1E293B',
                borderRadius: 20,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
                boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                maxWidth: 160
              }}
            >
              {FUNCTIONS.map(fn => (
                <option key={fn} value={fn === 'All Functions' ? '' : fn}>
                  {fn}
                </option>
              ))}
            </select>
          )}

          {/* Switch Persona Button */}
          <button
            onClick={onLogout}
            title="Log out or switch demo persona"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: isLight ? '#EFF6FF' : '#132147',
              color: isLight ? '#00349B' : '#60A5FA',
              border: isLight ? '1.5px solid #BFDBFE' : '1px solid #2563EB',
              borderRadius: 20,
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <LogOut size={11} />
            <span>Switch</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. MOBILE RESPONSIVE STRUCTURE (< 768px): Structured 2-Tiers   */}
      {/* Zero Horizontal Scrolling • Zero Overlapping • Zero Truncation */}
      {/* ============================================================== */}
      <div className="topbar-mobile-container">
        {/* Tier 1: Hamburger Menu + Page Title + Refresh Icon */}
        <div className="topbar-mobile-tier1">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <button
              onClick={onOpenMobileMenu}
              className="topbar-mobile-menu-btn"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu size={20} />
            </button>

            <h1 className="topbar-mobile-title">
              {activeTabTitle}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              onClick={onRefresh}
              className="topbar-mobile-refresh-btn"
              title="Refresh telemetry"
              aria-label="Refresh telemetry"
            >
              <RefreshCw size={13} className={isLoading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Tier 2: Dedicated Slicers Strip (Zero Scrolling) */}
        <div className="topbar-mobile-tier2">
          {/* Side-by-Side Clean Selectors (50% / 50%) */}
          <div className="topbar-mobile-dropdowns-row">
            {/* Month Dropdown */}
            <div className="topbar-mobile-select-wrapper">
              <Calendar size={13} className="topbar-mobile-select-icon" />
              <select
                value={currentMonth}
                onChange={e => onMonthChange(e.target.value)}
                className="topbar-mobile-select"
                aria-label="Select reporting cycle"
              >
                <option value="2026-10">Oct 2026 (Live)</option>
                <option value="2026-09">Sep 2026</option>
              </select>
            </div>

            {/* Department Dropdown or Locked Indicator */}
            {isDeptLocked ? (
              <div className="topbar-mobile-locked-pill">
                <Lock size={12} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lockedDeptName}
                </span>
              </div>
            ) : (
              <div className="topbar-mobile-select-wrapper">
                <Building2 size={13} className="topbar-mobile-select-icon" />
                <select
                  value={normalizeFunction(selectedFunction) || ''}
                  onChange={e => onFunctionChange(normalizeFunction(e.target.value))}
                  className="topbar-mobile-select"
                  aria-label="Select business function"
                >
                  {FUNCTIONS.map(fn => (
                    <option key={fn} value={fn === 'All Functions' ? '' : fn}>
                      {fn}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
