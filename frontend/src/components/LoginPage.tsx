import React, { useState } from 'react';
import { Shield, Sparkles, UserCheck, Lock, ArrowRight, Building2, Cpu, DollarSign, Settings, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '../types';
import { loginUser } from '../api';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  theme: 'dark' | 'light';
}

const PRESET_USERS = [
  {
    email: 'cxo@wct.com',
    display_name: 'Chief Executive Officer',
    role: 'cxo' as const,
    roleTitle: 'CXO / Board Level',
    badgeColor: '#2563EB',
    badgeBg: '#EFF6FF',
    badgeBorder: '#BFDBFE',
    icon: Building2,
    scope: 'All Functions (Enterprise-wide)',
    desc: 'Strategic ROI ($1.80M Net Value, 5.37x Return), cross-functional executive summary, and portfolio health.'
  },
  {
    email: 'eng_head@wct.com',
    display_name: 'VP of Engineering & IT',
    role: 'function_head' as const,
    roleTitle: 'Department Head',
    badgeColor: '#7C3AED',
    badgeBg: '#FAF5FF',
    badgeBorder: '#DDD6FE',
    icon: Cpu,
    scope: 'Locked to "Eng & IT" Only',
    desc: 'Deep-dive agent scorecard for Eng & IT teams only. Other functional data is restricted by RBAC.'
  },
  {
    email: 'finops@wct.com',
    display_name: 'Lead FinOps Analyst',
    role: 'finops' as const,
    roleTitle: 'FinOps Lead',
    badgeColor: '#059669',
    badgeBg: '#ECFDF5',
    badgeBorder: '#A7F3D0',
    icon: DollarSign,
    scope: 'Locked to "Finance" Only',
    desc: 'Finance department agent portfolio, financial spend optimization, and Finance seat reclamation.'
  },
  {
    email: 'admin@wct.com',
    display_name: 'Cockpit Administrator',
    role: 'admin' as const,
    roleTitle: 'Super Administrator',
    badgeColor: '#EA580C',
    badgeBg: '#FFF7ED',
    badgeBorder: '#FED7AA',
    icon: Settings,
    scope: 'Full Unrestricted Authority',
    desc: 'Live editing for M365 Copilot prices, token rates, department wage models, and governance rule thresholds.'
  }
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, theme }) => {
  const [email, setEmail] = useState('cxo@wct.com');
  const [password, setPassword] = useState('demo-pass');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isLight = theme === 'light';

  // Direct 1-click instant login for any demo persona
  const handleInstantLogin = async (userEmail: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { user } = await loginUser(userEmail, 'demo');
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { user } = await loginUser(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 20px',
      background: isLight 
        ? 'linear-gradient(135deg, #F0F4F8 0%, #E2E8F0 100%)' 
        : 'radial-gradient(circle at 50% 10%, #0F172A 0%, #030712 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: isLight ? '#0F172A' : '#F8FAFC'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 1060,
        display: 'grid',
        gridTemplateColumns: '1fr 1.25fr',
        borderRadius: 20,
        background: isLight ? '#FFFFFF' : '#0B132B',
        border: isLight ? '1px solid #CBD5E1' : '1px solid #1E293B',
        boxShadow: isLight 
          ? '0 20px 40px -15px rgba(0,0,0,0.1), 0 0 1px rgba(0,0,0,0.1)' 
          : '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.06)',
        overflow: 'hidden'
      }}>
        {/* Left Column: Brand & Credentials Form */}
        <div style={{
          padding: '40px 36px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: isLight ? '1px solid #F1F5F9' : '1px solid #1E293B'
        }}>
          <div>
            {/* Header Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isLight ? '0 2px 8px rgba(0,52,155,0.15)' : '0 2px 8px rgba(0,0,0,0.4)',
                border: isLight ? '1.5px solid #E2E8F0' : '1.5px solid #334155',
                padding: 4,
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
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px', color: isLight ? '#00349B' : '#60A5FA' }}>
                  WCT <span style={{ opacity: 0.6 }}>//</span> AI Performance Cockpit
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: isLight ? '#64748B' : '#94A3B8' }}>
                  Identity &amp; Role-Based Access Control
                </div>
              </div>
            </div>

            <h1 style={{ fontSize: 23, fontWeight: 800, margin: '16px 0 6px 0', letterSpacing: '-0.5px' }}>
              Sign In to Cockpit
            </h1>
            <p style={{ fontSize: 13, color: isLight ? '#64748B' : '#94A3B8', margin: '0 0 20px 0', lineHeight: 1.45 }}>
              Choose a demo role from the right column for <strong>instant access</strong>, or sign in using enterprise credentials.
            </p>

            {errorMsg && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: isLight ? '#FEF2F2' : '#450A0A',
                border: isLight ? '1px solid #FCA5A5' : '1px solid #7F1D1D',
                color: isLight ? '#DC2626' : '#FCA5A5',
                fontSize: 12.5,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <Lock size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: isLight ? '#475569' : '#94A3B8', marginBottom: 6 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: isLight ? '1px solid #CBD5E1' : '1px solid #334155',
                    background: isLight ? '#F8FAFC' : '#0F172A',
                    color: isLight ? '#0F172A' : '#F8FAFC',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: isLight ? '#475569' : '#94A3B8', marginBottom: 6 }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: isLight ? '1px solid #CBD5E1' : '1px solid #334155',
                    background: isLight ? '#F8FAFC' : '#0F172A',
                    color: isLight ? '#0F172A' : '#F8FAFC',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  marginTop: 6,
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #00349B 0%, #0284C7 100%)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 13.5,
                  border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(0,52,155,0.25)',
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In With Credentials</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          <div style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: isLight ? '1px solid #F1F5F9' : '1px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: isLight ? '#94A3B8' : '#64748B'
          }}>
            <span>OAuth 2.0 / JWT Bearer</span>
            <span>WCT Security Governance v6.2</span>
          </div>
        </div>

        {/* Right Column: 1-Click Role Persona Selection */}
        <div style={{
          padding: '36px 32px',
          background: isLight ? '#F8FAFC' : '#070D1E',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Sparkles size={14} />
              <span>Select Persona (1-Click Instant Demo)</span>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>
              Choose a Role to Enter the Cockpit
            </h2>
            <p style={{ fontSize: 12, color: isLight ? '#64748B' : '#94A3B8', margin: '0 0 16px 0' }}>
              Click any user card below to enter the Cockpit immediately mapped to their data and permissions:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {PRESET_USERS.map((preset) => {
                const IconComponent = preset.icon;

                return (
                  <div
                    key={preset.email}
                    onClick={() => handleInstantLogin(preset.email)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: isLight ? '1.5px solid #E2E8F0' : '1.5px solid #1E293B',
                      background: isLight ? '#FFFFFF' : '#0B132B',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = preset.badgeColor;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isLight ? '#E2E8F0' : '#1E293B';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          background: preset.badgeBg,
                          color: preset.badgeColor,
                          border: `1px solid ${preset.badgeBorder}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <IconComponent size={15} />
                        </div>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 800, color: isLight ? '#0F172A' : '#F8FAFC' }}>
                            {preset.display_name}
                          </span>
                          <span style={{
                            marginLeft: 8,
                            padding: '2px 7px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            background: preset.badgeBg,
                            color: preset.badgeColor,
                            border: `1px solid ${preset.badgeBorder}`
                          }}>
                            {preset.roleTitle}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        style={{
                          background: preset.badgeColor,
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: 6,
                          padding: '5px 11px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <span>Enter</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>

                    <div style={{ fontSize: 11, fontWeight: 700, color: preset.badgeColor, margin: '2px 0 2px 36px' }}>
                      Scope: {preset.scope}
                    </div>
                    <div style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8', marginLeft: 36, lineHeight: 1.35 }}>
                      {preset.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{
            marginTop: 16,
            padding: '10px 12px',
            borderRadius: 8,
            background: isLight ? '#EFF6FF' : '#0F2347',
            border: isLight ? '1px solid #BFDBFE' : '1px solid #1E3A8A',
            fontSize: 11.5,
            color: isLight ? '#1E40AF' : '#93C5FD',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <UserCheck size={16} style={{ flexShrink: 0 }} />
            <span>
              <strong>RBAC Isolation:</strong> Selecting <em>VP of Engineering</em> locks the dashboard strictly to Eng &amp; IT data.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
