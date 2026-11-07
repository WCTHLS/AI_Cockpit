import React from 'react';
import {
  LayoutDashboard,
  TableProperties,
  PieChart,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  X
} from 'lucide-react';
import { UserProfile } from '../types';

interface SidebarProps {
  activeTab: 'summary' | 'scorecard' | 'costs' | 'seats' | 'admin';
  onTabChange: (tab: 'summary' | 'scorecard' | 'costs' | 'seats' | 'admin') => void;
  user: UserProfile;
  onLogout: () => void;
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

interface NavItem {
  id: 'summary' | 'scorecard' | 'costs' | 'seats' | 'admin';
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'summary', label: 'Executive Summary', shortLabel: 'Summary', icon: LayoutDashboard },
  { id: 'scorecard', label: 'Agent Scorecard', shortLabel: 'Scorecard', icon: TableProperties },
  { id: 'costs', label: 'Cost & Budget', shortLabel: 'Costs', icon: PieChart },
  { id: 'seats', label: 'Seats & Adoption', shortLabel: 'Seats', icon: Users },
  { id: 'admin', label: 'Admin & Config', shortLabel: 'Admin', icon: Settings, adminOnly: true }
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  user,
  onLogout,
  theme,
  onThemeChange,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onMobileClose
}) => {
  const isLight = theme === 'light';

  // CRITICAL: On mobile drawer, ALWAYS render fully expanded with labels, even if desktop rail was collapsed!
  const isExpanded = isMobileOpen || !isCollapsed;

  const getRoleMeta = (role: string) => {
    switch (role) {
      case 'cxo':
        return { label: 'CXO', color: '#00349B', bg: '#EFF6FF', border: '#BFDBFE' };
      case 'function_head':
        return { label: 'Dept Head', color: '#7C3AED', bg: '#FAF5FF', border: '#DDD6FE' };
      case 'finops':
        return { label: 'FinOps', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };
      case 'admin':
        return { label: 'Admin', color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' };
      default:
        return { label: role.toUpperCase(), color: '#475569', bg: '#F1F5F9', border: '#CBD5E1' };
    }
  };

  const roleMeta = getRoleMeta(user.role);
  const visibleNavItems = NAV_ITEMS.filter(item => !item.adminOnly || user.role === 'admin');

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="sidebar-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(7, 13, 30, 0.65)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            zIndex: 998,
            transition: 'opacity 0.25s ease'
          }}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`cockpit-sidebar ${isCollapsed && !isMobileOpen ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
        style={{
          width: isExpanded ? 260 : 72,
          background: isLight ? '#FFFFFF' : '#070D1E',
          borderRight: isLight ? '1px solid #E2E8F0' : '1px solid #1E293B',
          height: '100vh',
          position: isMobileOpen ? 'fixed' : 'sticky',
          top: 0,
          left: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          zIndex: isMobileOpen ? 1000 : 99,
          boxShadow: isLight
            ? (isMobileOpen ? '4px 0 24px rgba(0,0,0,0.15)' : '1px 0 4px rgba(0,0,0,0.03)')
            : '4px 0 24px rgba(0,0,0,0.5)',
          transition: isMobileOpen ? 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)' : 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          userSelect: 'none',
          boxSizing: 'border-box',
          overflowX: 'hidden'
        }}
      >
        {/* Top: Brand Header */}
        <div>
          <div style={{
            height: 60,
            padding: !isExpanded ? '0 16px' : '0 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: !isExpanded ? 'center' : 'space-between',
            borderBottom: isLight ? '1px solid #F1F5F9' : '1px solid #1E293B',
            boxSizing: 'border-box'
          }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                minWidth: 0,
                cursor: 'pointer'
              }}
              onClick={() => {
                onTabChange('summary');
                if (isMobileOpen) onMobileClose();
              }}
            >
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

              {isExpanded && (
                <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: isLight ? '#00349B' : '#60A5FA',
                      fontFamily: 'Outfit, Satoshi, sans-serif',
                      letterSpacing: '-0.3px'
                    }}>
                      WCT <span style={{ opacity: 0.5 }}>//</span> AI Cockpit
                    </span>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      background: isLight ? '#EFF6FF' : 'rgba(2, 132, 199, 0.15)',
                      color: isLight ? '#00349B' : '#38BDF8',
                      border: isLight ? '1px solid #BFDBFE' : '1px solid rgba(56, 189, 248, 0.3)',
                      padding: '1px 5px',
                      borderRadius: 4,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      Live
                    </span>
                  </div>
                  <div style={{
                    fontSize: 10.5,
                    color: isLight ? '#64748B' : '#94A3B8',
                    fontWeight: 500,
                    lineHeight: 1.2
                  }}>
                    Autonomous Agent Portfolio
                  </div>
                </div>
              )}
            </div>

            {/* Close button in mobile drawer */}
            {isMobileOpen && (
              <button
                onClick={onMobileClose}
                title="Close Navigation Drawer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isLight ? '#F1F5F9' : '#1E293B',
                  border: isLight ? '1px solid #CBD5E1' : '1px solid #334155',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  color: isLight ? '#0F172A' : '#F8FAFC',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Navigation Section */}
          <div style={{ padding: !isExpanded ? '16px 8px' : '16px 14px' }}>
            {isExpanded && (
              <div style={{
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: isLight ? '#94A3B8' : '#64748B',
                padding: '0 8px 10px 8px'
              }}>
                Platform Navigation
              </div>
            )}

            <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {visibleNavItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      if (isMobileOpen) onMobileClose();
                    }}
                    title={!isExpanded ? item.label : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: !isExpanded ? '12px 0' : '11px 14px',
                      justifyContent: !isExpanded ? 'center' : 'flex-start',
                      borderRadius: 10,
                      border: 'none',
                      borderLeft: isActive
                        ? `4px solid ${isLight ? '#00349B' : '#60A5FA'}`
                        : '4px solid transparent',
                      background: isActive
                        ? (isLight ? '#EFF6FF' : 'rgba(37, 99, 235, 0.20)')
                        : 'transparent',
                      color: isActive
                        ? (isLight ? '#00349B' : '#60A5FA')
                        : (isLight ? '#334155' : '#94A3B8'),
                      fontWeight: isActive ? 800 : 600,
                      fontSize: isExpanded ? 13.5 : 13,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = isLight ? '#F8FAFC' : '#0B132B';
                        e.currentTarget.style.color = isLight ? '#0F172A' : '#F8FAFC';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = isLight ? '#334155' : '#94A3B8';
                      }
                    }}
                  >
                    <Icon size={isExpanded ? 19 : 20} style={{ flexShrink: 0 }} />
                    {isExpanded && (
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Section: Theme, User Profile & Rail Toggle */}
        <div style={{
          borderTop: isLight ? '1px solid #F1F5F9' : '1px solid #1E293B',
          padding: !isExpanded ? '12px 8px' : '14px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
          {/* Theme Toggle Pill */}
          <button
            onClick={() => onThemeChange(isLight ? 'dark' : 'light')}
            title={`Switch to ${isLight ? 'Dark' : 'Light'} theme`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: !isExpanded ? 'center' : 'space-between',
              width: '100%',
              padding: !isExpanded ? '9px 0' : '9px 12px',
              borderRadius: 8,
              background: isLight ? '#F8FAFC' : '#0B132B',
              border: isLight ? '1px solid #E2E8F0' : '1px solid #1E293B',
              color: isLight ? '#00349B' : '#60A5FA',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isLight ? <Moon size={16} /> : <Sun size={16} />}
              {isExpanded && <span>{isLight ? 'Dark Theme' : 'Light Theme'}</span>}
            </div>
            {isExpanded && (
              <span style={{
                fontSize: 10,
                color: isLight ? '#64748B' : '#94A3B8',
                background: isLight ? '#FFFFFF' : '#1E293B',
                padding: '2px 7px',
                borderRadius: 4,
                fontWeight: 600
              }}>
                Toggle
              </span>
            )}
          </button>

          {/* User Profile Card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: !isExpanded ? 'center' : 'space-between',
            padding: !isExpanded ? '6px 0' : '9px 10px',
            background: isLight ? '#F8FAFD' : '#0A1227',
            border: isLight ? '1px solid #E6ECF8' : '1px solid #1E293B',
            borderRadius: 8
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: roleMeta.bg,
                color: roleMeta.color,
                border: `1.5px solid ${roleMeta.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10.5,
                fontWeight: 800,
                flexShrink: 0
              }}
              title={user.display_name}
              >
                {user.role === 'cxo' ? 'CEO' : user.role === 'function_head' ? 'VP' : user.role === 'finops' ? 'FIN' : 'ADM'}
              </div>

              {isExpanded && (
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: isLight ? '#0F172A' : '#F8FAFC',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {user.display_name}
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: roleMeta.color,
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>
                    {roleMeta.label}
                  </div>
                </div>
              )}
            </div>

            {isExpanded && (
              <button
                onClick={onLogout}
                title="Switch persona or sign out"
                style={{
                  background: isLight ? '#EFF6FF' : '#132147',
                  border: isLight ? '1px solid #BFDBFE' : '1px solid #2563EB',
                  color: isLight ? '#00349B' : '#60A5FA',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  transition: 'all 0.15s ease'
                }}
              >
                <LogOut size={12} />
                <span>Switch</span>
              </button>
            )}
          </div>

          {/* Desktop Collapse / Expand Rail Toggle Button (hidden on mobile) */}
          {!isMobileOpen && (
            <button
              onClick={onToggleCollapse}
              className="sidebar-collapse-toggle-btn"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse to rail'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: 8,
                width: '100%',
                padding: '6px 8px',
                borderRadius: 6,
                background: 'transparent',
                border: 'none',
                color: isLight ? '#94A3B8' : '#64748B',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = isLight ? '#00349B' : '#60A5FA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = isLight ? '#94A3B8' : '#64748B';
              }}
            >
              {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
              {!isCollapsed && <span>Collapse Sidebar</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
