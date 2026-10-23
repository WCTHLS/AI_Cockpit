import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  Check,
  CreditCard,
  Briefcase,
  ShieldAlert,
  Zap,
  TrendingUp,
  DollarSign,
  Clock,
  Sparkles,
  HelpCircle,
  Save,
  RotateCcw,
  Lock,
  UploadCloud,
  FileText,
  Download,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  X
} from 'lucide-react';
import { updateThresholds, formatUSD, uploadTelemetryFile, downloadCsvTemplate } from '../api';
import { UserProfile, IngestSummary } from '../types';

interface AdminTabProps {
  initialThresholds: any;
  onThresholdsUpdated: () => void;
  onConfigSaved?: (subs: SubscriptionConfig, labor: LaborRateConfig) => void;
  theme?: 'dark' | 'light';
  user?: UserProfile;
}

export interface SubscriptionConfig {
  m365CopilotPrice: number;
  copilotStudioPackPrice: number;
  copilotStudioIncludedMsgs: number;
  githubCopilotPrice: number;
  inputTokenPricePerMillion: number;
  outputTokenPricePerMillion: number;
}

export interface LaborRateConfig {
  engineering: number;
  finance: number;
  operations: number;
  sales: number;
  customerSupport: number;
  clinical: number;
  monthlyFteHours: number;
}

export interface GuardrailConfig {
  idleSeatDays: number;
  lapsingWindowMinDays: number;
  lapsingWindowMaxDays: number;
  tokenQuotaAlertPct: number;
  budgetOverrunAlertPct: number;
}

const DEFAULT_SUBSCRIPTION_CONFIG: SubscriptionConfig = {
  m365CopilotPrice: 30.0,
  copilotStudioPackPrice: 200.0,
  copilotStudioIncludedMsgs: 25000,
  githubCopilotPrice: 19.0,
  inputTokenPricePerMillion: 2.50,
  outputTokenPricePerMillion: 10.00
};

const DEFAULT_LABOR_CONFIG: LaborRateConfig = {
  engineering: 95.0,
  finance: 80.0,
  operations: 65.0,
  sales: 85.0,
  customerSupport: 60.0,
  clinical: 90.0,
  monthlyFteHours: 160
};

const DEFAULT_GUARDRAIL_CONFIG: GuardrailConfig = {
  idleSeatDays: 30,
  lapsingWindowMinDays: 7,
  lapsingWindowMaxDays: 29,
  tokenQuotaAlertPct: 90,
  budgetOverrunAlertPct: 110
};

export const AdminTab: React.FC<AdminTabProps> = ({ initialThresholds, onThresholdsUpdated, onConfigSaved, theme = 'light', user }) => {
  const isAdmin = user ? user.role === 'admin' : true;
  const [activeSection, setActiveSection] = useState<'subs' | 'labor' | 'guardrails' | 'governance' | 'ingestion'>('subs');

  // Governance action thresholds (slide 7)
  const [thresholds, setThresholds] = useState<any>(initialThresholds || {
    experiment_days: 60,
    intervene_eval_pass: 88.0,
    intervene_cost_budget_pct: 110.0,
    intervene_value_min: 15000.0,
    accelerate_value_min: 40000.0,
    accelerate_adoption_min: 70.0
  });

  // Enterprise Subscription Config
  const [subscriptions, setSubscriptions] = useState<SubscriptionConfig>(() => {
    const saved = localStorage.getItem('wct_subscription_config');
    return saved ? JSON.parse(saved) : DEFAULT_SUBSCRIPTION_CONFIG;
  });

  // Labor wage & productivity config
  const [laborRates, setLaborRates] = useState<LaborRateConfig>(() => {
    const saved = localStorage.getItem('wct_labor_config');
    return saved ? JSON.parse(saved) : DEFAULT_LABOR_CONFIG;
  });

  // Guardrail config
  const [guardrails, setGuardrails] = useState<GuardrailConfig>(() => {
    const saved = localStorage.getItem('wct_guardrail_config');
    return saved ? JSON.parse(saved) : DEFAULT_GUARDRAIL_CONFIG;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Data Ingestion State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [ingestSummary, setIngestSummary] = useState<IngestSummary | null>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = (file: File) => {
    const validExts = ['.csv', '.xlsx', '.xls'];
    const hasValidExt = validExts.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setUploadError('Invalid file format. Please select a .csv or .xlsx spreadsheet.');
      setSelectedFile(null);
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File size exceeds the 15MB maximum limit.');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setUploadError(null);
    setIngestSummary(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const res = await uploadTelemetryFile(selectedFile);
      setIngestSummary(res.summary);
      onThresholdsUpdated(); // Live re-hydrates all tabs in App.tsx!
    } catch (err: any) {
      setUploadError(err.message || 'Failed to process and ingest telemetry file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      await downloadCsvTemplate();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to download template.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const isLight = theme === 'light';

  // Real-time valuation calculations based on tuned parameters
  // Average blended rate weighted across typical enterprise estate (Eng 40%, Ops 30%, Finance 15%, Sales 15%)
  const blendedHourlyRate = (
    laborRates.engineering * 0.40 +
    laborRates.operations * 0.30 +
    laborRates.finance * 0.15 +
    laborRates.sales * 0.15
  );

  // Dynamic cost calculation based on tuned subscription parameters
  // Non-license costs = $244,000 (Platform $72K + Tokens $96K + Build & Run $52K + Enablement $24K)
  const baseNonLicenseCosts = 244000;
  const pooledSeats = 4600;
  // Dynamic license expenditure = pooledSeats * m365CopilotPrice + Studio capacity packs
  const simulatedLicenseCost = (pooledSeats * (subscriptions.m365CopilotPrice || 30)) + (120 * (subscriptions.copilotStudioPackPrice || 200));
  const dynamicTotalCost = baseNonLicenseCosts + simulatedLicenseCost;

  const baselineHoursSaved = 26000;
  const simulatedGrossValue = baselineHoursSaved * blendedHourlyRate;
  const simulatedNetValue = simulatedGrossValue - dynamicTotalCost;
  const simulatedRoiMultiplier = dynamicTotalCost > 0 ? (simulatedGrossValue / dynamicTotalCost) : 0;
  const simulatedFtesUnlocked = baselineHoursSaved / (laborRates.monthlyFteHours || 160);

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('wct_subscription_config', JSON.stringify(subscriptions));
      localStorage.setItem('wct_labor_config', JSON.stringify(laborRates));
      localStorage.setItem('wct_guardrail_config', JSON.stringify(guardrails));

      if (updateThresholds) {
        await updateThresholds(thresholds).catch(() => {});
      }
      if (onConfigSaved) {
        onConfigSaved(subscriptions, laborRates);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onThresholdsUpdated();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setSubscriptions(DEFAULT_SUBSCRIPTION_CONFIG);
    setLaborRates(DEFAULT_LABOR_CONFIG);
    setGuardrails(DEFAULT_GUARDRAIL_CONFIG);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {!isAdmin && (
        <div style={{
          padding: '14px 20px',
          borderRadius: 10,
          background: isLight ? '#FFFBEB' : 'rgba(245, 158, 11, 0.12)',
          border: `1.5px solid ${isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.35)'}`,
          color: isLight ? '#92400E' : '#FDE68A',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          boxShadow: isLight ? '0 2px 8px rgba(217, 119, 6, 0.08)' : 'none'
        }}>
          <Lock size={22} color={isLight ? '#D97706' : '#F59E0B'} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            <strong style={{ display: 'block', fontSize: 13.5, marginBottom: 2 }}>
              Read-Only Governance Mode (Restricted by RBAC)
            </strong>
            You are currently signed in as <strong>{user?.display_name || 'Non-Admin'}</strong> ({user?.role?.toUpperCase()}). 
            You have read access to view enterprise valuation assumptions, but modifying subscription pricing, hourly wage models, and governance guardrails requires <strong>Cockpit Administrator</strong> privileges.
          </div>
        </div>
      )}
      {/* Top Header Card */}
      <div style={{
        background: '#FFFFFF',
        border: '1.5px solid #D6E2FA',
        borderRadius: 12,
        padding: '20px 24px',
        boxShadow: '0 4px 16px rgba(0, 52, 155, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #00349B 0%, #1713FD 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <Sliders size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}>
                Enterprise AI Subscription &amp; Valuation Configurator
              </h2>
              <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>
                Configure seat subscription models, functional labor valuation rates, FinOps overage guardrails, and governance thresholds.
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleResetDefaults}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              borderRadius: 20,
              padding: '7px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={14} /> Reset Defaults
          </button>

          <button
            onClick={handleSaveAll}
            disabled={isSaving || !isAdmin}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#00349B',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 20,
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 52, 155, 0.25)'
            }}
          >
            {isAdmin ? <Save size={15} /> : <Lock size={15} />} {isSaving ? 'Saving...' : isAdmin ? 'Save & Recalculate Portfolio' : 'Admin Authority Required'}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div style={{
          background: '#ECFDF5',
          border: '1px solid #A7F3D0',
          color: '#065F46',
          padding: '12px 18px',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          fontWeight: 700
        }}>
          <Check size={18} color="#059669" />
          <span>Configuration saved successfully! All valuation models and governance action states have been recalculated.</span>
        </div>
      )}

      {/* Real-time Valuation Sandbox Impact Card */}
      <div style={{
        background: 'linear-gradient(135deg, #0A2540 0%, #00349B 100%)',
        borderRadius: 12,
        padding: '20px 24px',
        color: '#FFFFFF',
        boxShadow: '0 8px 24px -4px rgba(0, 52, 155, 0.28)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'linear-gradient(90deg, #38BDF8, #818CF8)'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="#38BDF8" />
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#93C5FD' }}>
              Live Portfolio Valuation Impact Sandbox
            </span>
          </div>
          <span style={{ fontSize: 11, background: 'rgba(255, 255, 255, 0.15)', padding: '3px 9px', borderRadius: 12, fontWeight: 700 }}>
            Dynamic Projection
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase' }}>
              Blended Labor Rate
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Outfit, sans-serif', marginTop: 3 }}>
              ${blendedHourlyRate.toFixed(2)} <span style={{ fontSize: 13, fontWeight: 500, color: '#CBD5E1' }}>/ hr</span>
            </div>
            <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 2 }}>
              Weighted across all active functions
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase' }}>
              Gross Value (26K hrs)
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Outfit, sans-serif', marginTop: 3 }}>
              {formatUSD(simulatedGrossValue)}
            </div>
            <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 2 }}>
              Hours Saved × Blended Wage
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase' }}>
              Net AI Value
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#6EE7B7', fontFamily: 'Outfit, sans-serif', marginTop: 3 }}>
              {formatUSD(simulatedNetValue)}
            </div>
            <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 2 }}>
              Gross Value - {formatUSD(dynamicTotalCost)} Cost
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase' }}>
              ROI Multiplier
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#FCD34D', fontFamily: 'Outfit, sans-serif', marginTop: 3 }}>
              {simulatedRoiMultiplier.toFixed(2)}x
            </div>
            <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 2 }}>
              Return per $1.00 spent
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase' }}>
              Labor Capacity Unlocked
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#FFFFFF', fontFamily: 'Outfit, sans-serif', marginTop: 3 }}>
              ~{simulatedFtesUnlocked.toFixed(0)} FTEs
            </div>
            <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 2 }}>
              Based on {laborRates.monthlyFteHours}h / month
            </div>
          </div>
        </div>
      </div>

      {/* Section Selector Pills */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '1.5px solid #E2E8F0',
        paddingBottom: 4
      }}>
        <button
          onClick={() => setActiveSection('subs')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeSection === 'subs' ? '#00349B' : 'transparent',
            color: activeSection === 'subs' ? '#FFFFFF' : '#475569',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <CreditCard size={15} /> AI Subscriptions &amp; Licenses
        </button>

        <button
          onClick={() => setActiveSection('labor')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeSection === 'labor' ? '#00349B' : 'transparent',
            color: activeSection === 'labor' ? '#FFFFFF' : '#475569',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Briefcase size={15} /> Labor Rates &amp; Productivity
        </button>

        <button
          onClick={() => setActiveSection('guardrails')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeSection === 'guardrails' ? '#00349B' : 'transparent',
            color: activeSection === 'guardrails' ? '#FFFFFF' : '#475569',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <ShieldAlert size={15} /> FinOps Quotas &amp; Guardrails
        </button>

        <button
          onClick={() => setActiveSection('governance')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeSection === 'governance' ? '#00349B' : 'transparent',
            color: activeSection === 'governance' ? '#FFFFFF' : '#475569',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Zap size={15} /> Governance Action Rules (Slide 7)
        </button>

        <button
          onClick={() => setActiveSection('ingestion')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeSection === 'ingestion' ? '#00349B' : 'transparent',
            color: activeSection === 'ingestion' ? '#FFFFFF' : '#475569',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <UploadCloud size={15} /> Telemetry Ingestion (CSV / Excel)
        </button>
      </div>

      {/* SECTION 1: AI SUBSCRIPTIONS & LICENSES */}
      {activeSection === 'subs' && (
        <div style={{
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 4px 16px rgba(0, 52, 155, 0.05)'
        }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#00349B' }}>
              Seat License Unit Pricing &amp; Token Metering
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 12.5, color: '#64748B' }}>
              Define default baseline unit prices used by the FinOps seat reclaim engine and consumption models.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16
          }}>
            {/* Sub 1: Microsoft 365 Copilot */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>M365 Copilot License</span>
                <span style={{ fontSize: 10, background: '#EFF6FF', color: '#00349B', padding: '2px 6px', borderRadius: 4 }}>Seat-Based</span>
              </label>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 12px 0' }}>
                Fixed monthly license cost per active directory seat. Standard commercial pricing: $30/user/mo.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>$</span>
                <input
                  type="number"
                  step="1"
                  value={subscriptions.m365CopilotPrice}
                  onChange={e => setSubscriptions({ ...subscriptions, m365CopilotPrice: +e.target.value })}
                  style={{
                    width: 100,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#0F172A'
                  }}
                />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>per user / month</span>
              </div>
            </div>

            {/* Sub 2: Copilot Studio Message Packs */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Copilot Studio Capacity Pack</span>
                <span style={{ fontSize: 10, background: '#F3E8FF', color: '#7E22CE', padding: '2px 6px', borderRadius: 4 }}>Hybrid Quota</span>
              </label>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 12px 0' }}>
                Tenant subscription for autonomous studio agents. Standard: $200/mo includes 25,000 billed messages.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>$</span>
                <input
                  type="number"
                  step="10"
                  value={subscriptions.copilotStudioPackPrice}
                  onChange={e => setSubscriptions({ ...subscriptions, copilotStudioPackPrice: +e.target.value })}
                  style={{
                    width: 100,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#0F172A'
                  }}
                />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>/ month (25K msgs)</span>
              </div>
            </div>

            {/* Sub 3: GitHub Copilot Enterprise */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>GitHub Copilot Developer Seat</span>
                <span style={{ fontSize: 10, background: '#ECFDF5', color: '#059669', padding: '2px 6px', borderRadius: 4 }}>Dev Seat</span>
              </label>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 12px 0' }}>
                Software engineering seat tier for developer productivity and pull request assistance.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>$</span>
                <input
                  type="number"
                  step="1"
                  value={subscriptions.githubCopilotPrice}
                  onChange={e => setSubscriptions({ ...subscriptions, githubCopilotPrice: +e.target.value })}
                  style={{
                    width: 100,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#0F172A'
                  }}
                />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>per developer / month</span>
              </div>
            </div>

            {/* Sub 4: Custom Agent Token API Pricing */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>LLM Token API Meter (PAYG)</span>
                <span style={{ fontSize: 10, background: '#FEF3C7', color: '#D97706', padding: '2px 6px', borderRadius: 4 }}>Consumption</span>
              </label>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 12px 0' }}>
                Blended input/output token pricing per 1 Million tokens (Azure OpenAI GPT-4o / Claude 3.5 Sonnet).
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>$</span>
                <input
                  type="number"
                  step="0.5"
                  value={subscriptions.outputTokenPricePerMillion}
                  onChange={e => setSubscriptions({ ...subscriptions, outputTokenPricePerMillion: +e.target.value })}
                  style={{
                    width: 100,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#0F172A'
                  }}
                />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>per 1M output tokens</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: LABOR RATES & PRODUCTIVITY */}
      {activeSection === 'labor' && (
        <div style={{
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 4px 16px rgba(0, 52, 155, 0.05)'
        }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#00349B' }}>
              Functional Blended Wage Rates &amp; FTE Working Hours
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 12.5, color: '#64748B' }}>
              Calibrate the hourly cost of labor by business function. Gross AI Value is computed as: <b>Hours Saved × Blended Wage Rate</b>.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16
          }}>
            {/* Rate 1: Software Engineering */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                Software Engineering &amp; IT
              </label>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 10px 0' }}>
                Full-stack engineers, DevOps, and cloud architects.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>$</span>
                <input
                  type="number"
                  step="5"
                  value={laborRates.engineering}
                  onChange={e => setLaborRates({ ...laborRates, engineering: +e.target.value })}
                  style={{ width: 90, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 14, fontWeight: 700 }}
                />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>USD / hour</span>
              </div>
            </div>

            {/* Rate 2: Finance & Accounting */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                Finance &amp; Corporate Accounting
              </label>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 10px 0' }}>
                FP&amp;A analysts, tax controllers, and treasury teams.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>$</span>
                <input
                  type="number"
                  step="5"
                  value={laborRates.finance}
                  onChange={e => setLaborRates({ ...laborRates, finance: +e.target.value })}
                  style={{ width: 90, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 14, fontWeight: 700 }}
                />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>USD / hour</span>
              </div>
            </div>

            {/* Rate 3: Operations & Supply Chain */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                Business Operations &amp; Supply Chain
              </label>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 10px 0' }}>
                Procurement officers, warehouse logistics, and invoice triage.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>$</span>
                <input
                  type="number"
                  step="5"
                  value={laborRates.operations}
                  onChange={e => setLaborRates({ ...laborRates, operations: +e.target.value })}
                  style={{ width: 90, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 14, fontWeight: 700 }}
                />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>USD / hour</span>
              </div>
            </div>

            {/* Rate 4: Clinical & Healthcare Operations */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                Clinical &amp; Healthcare Operations
              </label>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 10px 0' }}>
                Clinical research associates, trial coordinators, and medical scribes.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>$</span>
                <input
                  type="number"
                  step="5"
                  value={laborRates.clinical}
                  onChange={e => setLaborRates({ ...laborRates, clinical: +e.target.value })}
                  style={{ width: 90, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 14, fontWeight: 700 }}
                />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>USD / hour</span>
              </div>
            </div>

            {/* Rate 5: Monthly Working Hours per FTE */}
            <div style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#00349B', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={16} />
                <span>Monthly Working Hours / FTE</span>
              </label>
              <p style={{ fontSize: 12, color: '#1E40AF', margin: '4px 0 10px 0' }}>
                Benchmark hours per full-time employee used to convert hours saved into FTE capacity unlocked.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  step="5"
                  value={laborRates.monthlyFteHours}
                  onChange={e => setLaborRates({ ...laborRates, monthlyFteHours: +e.target.value })}
                  style={{ width: 90, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #93C5FD', fontSize: 14, fontWeight: 700, background: '#FFFFFF' }}
                />
                <span style={{ fontSize: 12.5, color: '#1E40AF', fontWeight: 600 }}>hours / FTE / month (std: 160h)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: FINOPS QUOTAS & GUARDRAILS */}
      {activeSection === 'guardrails' && (
        <div style={{
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 4px 16px rgba(0, 52, 155, 0.05)'
        }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#00349B' }}>
              FinOps Inactivity Cutoffs &amp; Quota Alerting
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 12.5, color: '#64748B' }}>
              Govern seat inactivity categorization and alert thresholds for proactive license harvesting.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16
          }}>
            {/* Guardrail 1: Idle Seat Inactivity Cutoff */}
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#B45309' }}>
                Idle Seat Inactivity Threshold
              </label>
              <p style={{ fontSize: 12, color: '#92400E', margin: '4px 0 10px 0' }}>
                Seats with zero telemetry for this duration are classified as idle and targeted for automatic reclaim.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  value={guardrails.idleSeatDays}
                  onChange={e => setGuardrails({ ...guardrails, idleSeatDays: +e.target.value })}
                  style={{ width: 90, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #FCD34D', fontSize: 14, fontWeight: 700, background: '#FFFFFF' }}
                />
                <span style={{ fontSize: 12.5, color: '#92400E', fontWeight: 600 }}>days without activity (std: 30d)</span>
              </div>
            </div>

            {/* Guardrail 2: Lapsing Window */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#475569' }}>
                Lapsing Seat Coaching Window
              </label>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 10px 0' }}>
                Users inactive between these day limits receive automated prompt engineering and coaching nudges.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  value={guardrails.lapsingWindowMinDays}
                  onChange={e => setGuardrails({ ...guardrails, lapsingWindowMinDays: +e.target.value })}
                  style={{ width: 65, padding: '8px 10px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 14, fontWeight: 700 }}
                />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>to</span>
                <input
                  type="number"
                  value={guardrails.lapsingWindowMaxDays}
                  onChange={e => setGuardrails({ ...guardrails, lapsingWindowMaxDays: +e.target.value })}
                  style={{ width: 65, padding: '8px 10px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 14, fontWeight: 700 }}
                />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>days</span>
              </div>
            </div>

            {/* Guardrail 3: Token Quota Warning Alert */}
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#DC2626' }}>
                Token Quota Consumption Alert (%)
              </label>
              <p style={{ fontSize: 12, color: '#991B1B', margin: '4px 0 10px 0' }}>
                Trigger FinOps notification when monthly token consumption exceeds this percentage of allocated quota.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  value={guardrails.tokenQuotaAlertPct}
                  onChange={e => setGuardrails({ ...guardrails, tokenQuotaAlertPct: +e.target.value })}
                  style={{ width: 90, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #F87171', fontSize: 14, fontWeight: 700, background: '#FFFFFF' }}
                />
                <span style={{ fontSize: 12.5, color: '#991B1B', fontWeight: 600 }}>% of monthly quota (std: 90%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: GOVERNANCE ACTION RULES (SLIDE 7) */}
      {activeSection === 'governance' && (
        <div style={{
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 4px 16px rgba(0, 52, 155, 0.05)'
        }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#00349B' }}>
              Action Rule Engine Thresholds (Slide 7 Decision Tree)
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 12.5, color: '#64748B' }}>
              Automated triggers that classify enterprise agents into <b>Accelerate</b>, <b>Optimize</b>, <b>Intervene</b>, or <b>Experiment</b>.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16
          }}>
            {/* Rule 1: Experiment Cutoff */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#475569' }}>
                1. EXPERIMENT: Production Age Cutoff
              </label>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 10px 0' }}>
                Agents younger than this threshold are categorized as early pilot experiments regardless of financial ROI.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="number"
                  value={thresholds.experiment_days}
                  onChange={e => setThresholds({ ...thresholds, experiment_days: +e.target.value })}
                  style={{ width: 90, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 14, fontWeight: 700 }}
                />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>days in production (std: 60)</span>
              </div>
            </div>

            {/* Rule 2: Intervene Eval Pass */}
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#DC2626' }}>
                2. INTERVENE: Minimum Eval Pass Rate
              </label>
              <p style={{ fontSize: 12, color: '#991B1B', margin: '4px 0 10px 0' }}>
                Trigger quality containment if automated evaluation pass rate drops below this bar.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="number"
                  value={thresholds.intervene_eval_pass}
                  onChange={e => setThresholds({ ...thresholds, intervene_eval_pass: +e.target.value })}
                  style={{ width: 90, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #F87171', fontSize: 14, fontWeight: 700, background: '#FFFFFF' }}
                />
                <span style={{ fontSize: 12.5, color: '#991B1B', fontWeight: 600 }}>% accuracy SLA (std: 88%)</span>
              </div>
            </div>

            {/* Rule 3: Intervene Budget Overage */}
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#DC2626' }}>
                3. INTERVENE: Cost-to-Budget Ratio
              </label>
              <p style={{ fontSize: 12, color: '#991B1B', margin: '4px 0 10px 0' }}>
                Trigger FinOps budget containment if actual expenditure exceeds plan.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="number"
                  value={thresholds.intervene_cost_budget_pct}
                  onChange={e => setThresholds({ ...thresholds, intervene_cost_budget_pct: +e.target.value })}
                  style={{ width: 90, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #F87171', fontSize: 14, fontWeight: 700, background: '#FFFFFF' }}
                />
                <span style={{ fontSize: 12.5, color: '#991B1B', fontWeight: 600 }}>% of budget cap (std: 110%)</span>
              </div>
            </div>

            {/* Rule 4: Accelerate Value Floor */}
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>
                4. ACCELERATE: Net Value Floor
              </label>
              <p style={{ fontSize: 12, color: '#065F46', margin: '4px 0 10px 0' }}>
                Minimum monthly net value required to qualify for enterprise-wide scale-out.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>$</span>
                <input
                  type="number"
                  step="5000"
                  value={thresholds.accelerate_value_min}
                  onChange={e => setThresholds({ ...thresholds, accelerate_value_min: +e.target.value })}
                  style={{ width: 100, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #6EE7B7', fontSize: 14, fontWeight: 700, background: '#FFFFFF' }}
                />
                <span style={{ fontSize: 12.5, color: '#065F46', fontWeight: 600 }}>USD / mo (std: $40K)</span>
              </div>
            </div>

            {/* Rule 5: Accelerate Adoption Floor */}
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>
                5. ACCELERATE: Minimum Adoption Rate
              </label>
              <p style={{ fontSize: 12, color: '#065F46', margin: '4px 0 10px 0' }}>
                Minimum team user adoption rate required to qualify for executive acceleration.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="number"
                  value={thresholds.accelerate_adoption_min}
                  onChange={e => setThresholds({ ...thresholds, accelerate_adoption_min: +e.target.value })}
                  style={{ width: 90, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #6EE7B7', fontSize: 14, fontWeight: 700, background: '#FFFFFF' }}
                />
                <span style={{ fontSize: 12.5, color: '#065F46', fontWeight: 600 }}>% adoption (std: 70%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: DATA INGESTION (CSV / EXCEL) */}
      {activeSection === 'ingestion' && (
        <div style={{
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 4px 16px rgba(0, 52, 155, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}>
          {/* Header & Template Download Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16,
            borderBottom: '1.5px solid #EEF2F6',
            paddingBottom: 16
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  background: 'linear-gradient(135deg, #00349B 0%, #0066CC 100%)',
                  color: '#FFFFFF',
                  padding: 8,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UploadCloud size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#00349B' }}>
                    Enterprise Telemetry &amp; Usage Ingestion Gateway
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: 12.5, color: '#64748B' }}>
                    Ingest raw batch runs or employee execution logs (.csv, .xlsx) to dynamically calculate hours saved, gross value, and portfolio ROI.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadTemplate}
              disabled={isDownloadingTemplate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#F0F7FF',
                border: '1.5px solid #BAE6FD',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 700,
                color: '#0284C7',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.1)'
              }}
            >
              <Download size={15} />
              {isDownloadingTemplate ? 'Downloading...' : 'Download Sample CSV Template'}
            </button>
          </div>

          {/* Error Banner */}
          {uploadError && (
            <div style={{
              background: '#FEF2F2',
              border: '1.5px solid #FECACA',
              borderRadius: 8,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: '#991B1B',
              fontSize: 13,
              fontWeight: 600
            }}>
              <AlertCircle size={18} color="#DC2626" />
              <div style={{ flex: 1 }}>{uploadError}</div>
              <button
                onClick={() => setUploadError(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#991B1B' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Interactive Drag & Drop Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: isDragging ? '2px dashed #00349B' : '2px dashed #CBD5E1',
              background: isDragging ? '#EFF6FF' : '#F8FAFC',
              borderRadius: 12,
              padding: '36px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              style={{ display: 'none' }}
            />

            <div style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: isDragging ? '#DBEAFE' : '#E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto',
              color: isDragging ? '#00349B' : '#475569'
            }}>
              <FileSpreadsheet size={28} />
            </div>

            <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>
              Drag &amp; drop your telemetry file here, or <span style={{ color: '#00349B', textDecoration: 'underline' }}>browse</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>
              Supported formats: <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.xls</strong> &bull; Maximum file size: 15 MB
            </div>
          </div>

          {/* Selected File Details & Upload Action */}
          {selectedFile && (
            <div style={{
              background: '#F1F5F9',
              border: '1.5px solid #CBD5E1',
              borderRadius: 10,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  background: '#00349B',
                  color: '#FFFFFF',
                  padding: 8,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileText size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB &bull; Ready for parsing &amp; recalculation
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setUploadError(null);
                  }}
                  disabled={isUploading}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: 6,
                    padding: '8px 14px',
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: '#64748B',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#00349B',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 20px',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#FFFFFF',
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(0, 52, 155, 0.25)'
                  }}
                >
                  {isUploading ? (
                    <>
                      <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                      Parsing &amp; Computing...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={15} />
                      Ingest &amp; Recalculate Portfolio
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Success Summary Impact Card */}
          {ingestSummary && (
            <div style={{
              background: '#F0FDF4',
              border: '1.5px solid #86EFAC',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <CheckCircle2 size={20} color="#16A34A" />
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#166534' }}>
                  Telemetry Ingested Successfully &bull; Cockpit Portfolio Re-hydrated
                </h4>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 12,
                background: '#FFFFFF',
                borderRadius: 8,
                padding: 16,
                border: '1px solid #BBF7D0'
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Rows Ingested
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                    {ingestSummary.rows_processed}
                  </div>
                  <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 600 }}>Parsed cleanly</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Agents Updated
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#00349B', marginTop: 2 }}>
                    {ingestSummary.agents_updated.length}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>Portfolio targets</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Tasks Completed
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                    {ingestSummary.total_tasks_completed.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>AI executions</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Hours Saved
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#059669', marginTop: 2 }}>
                    {ingestSummary.hours_saved.toLocaleString()}h
                  </div>
                  <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>10m / task avg</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Gross Value
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#00349B', marginTop: 2 }}>
                    {formatUSD(ingestSummary.gross_value_usd)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>Labor capacity</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Net Value &amp; ROI
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#16A34A', marginTop: 2 }}>
                    {formatUSD(ingestSummary.net_value_usd)}
                  </div>
                  <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 700 }}>
                    {ingestSummary.roi_ratio > 0 ? `${ingestSummary.roi_ratio.toFixed(1)}x ROI` : 'Positive'}
                  </div>
                </div>
              </div>

              {ingestSummary.agents_updated.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 6 }}>
                    Updated Agents in Portfolio:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {ingestSummary.agents_updated.map((name, i) => (
                      <span
                        key={i}
                        style={{
                          background: '#DCFCE7',
                          border: '1px solid #86EFAC',
                          color: '#15803D',
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: 20
                        }}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
