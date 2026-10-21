import React, { useState } from 'react';
import { Sliders, Upload, Check, FileText } from 'lucide-react';
import { updateThresholds } from '../api';

interface AdminTabProps {
  initialThresholds: any;
  onThresholdsUpdated: () => void;
  theme?: 'dark' | 'light';
}

export const AdminTab: React.FC<AdminTabProps> = ({ initialThresholds, onThresholdsUpdated, theme = 'dark' }) => {
  const [thresholds, setThresholds] = useState<any>(initialThresholds || {
    experiment_days: 60,
    intervene_eval_pass: 88.0,
    intervene_cost_budget_pct: 110.0,
    intervene_value_min: 15000.0,
    accelerate_value_min: 40000.0,
    accelerate_adoption_min: 70.0
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const isLight = theme === 'light';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateThresholds(thresholds);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onThresholdsUpdated();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus(`Uploading ${file.name}...`);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dataset_type', 'agents');

    try {
      const res = await fetch('/api/v1/admin/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const json = await res.json();
        setUploadStatus(`✓ ${json.message}`);
        onThresholdsUpdated();
      } else {
        setUploadStatus('Upload failed. Please ensure file is valid CSV.');
      }
    } catch (err) {
      setUploadStatus('Upload error. Ensure backend is running.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Threshold Rules Engine Card */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            background: isLight ? '#E9EFFB' : 'rgba(0, 210, 255, 0.1)',
            padding: 8,
            borderRadius: 8,
            color: isLight ? '#00349B' : 'var(--accent-cyan)'
          }}>
            <Sliders size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Action Rule Engine Thresholds</h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Tune decision tree triggers (PPTX Slide 7) that classify agents into Accelerate, Optimize, Experiment, or Intervene
            </span>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20,
          marginTop: 20
        }}>
          {/* Rule 1: Experiment */}
          <div style={{
            background: isLight ? '#F3F6FC' : 'rgba(0,0,0,0.25)',
            border: isLight ? '1.5px solid #D6E2FA' : 'none',
            padding: 18,
            borderRadius: 10
          }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: isLight ? '#172D9D' : 'var(--accent-purple)' }}>
              1. EXPERIMENT: Days in Production Cutoff
            </label>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 10px 0' }}>
              Agents with production age below this limit are categorized as early pilot experiments.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="number"
                value={thresholds.experiment_days}
                onChange={e => setThresholds({ ...thresholds, experiment_days: +e.target.value })}
                style={{
                  background: isLight ? '#FFFFFF' : 'rgba(11, 19, 38, 0.9)',
                  border: isLight ? '1.5px solid #D6E2FA' : '1px solid var(--border-subtle)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  color: 'var(--text-main)',
                  width: 90,
                  fontSize: 14,
                  fontWeight: 600
                }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>days in production</span>
            </div>
          </div>

          {/* Rule 2: Intervene Eval Pass */}
          <div style={{
            background: isLight ? '#F3F6FC' : 'rgba(0,0,0,0.25)',
            border: isLight ? '1.5px solid #D6E2FA' : 'none',
            padding: 18,
            borderRadius: 10
          }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: isLight ? '#C62828' : 'var(--accent-rose)' }}>
              2. INTERVENE: Minimum Eval Pass Rate (%)
            </label>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 10px 0' }}>
              Trigger quality intervention if agent automated evaluation pass rate drops below threshold.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="number"
                value={thresholds.intervene_eval_pass}
                onChange={e => setThresholds({ ...thresholds, intervene_eval_pass: +e.target.value })}
                style={{
                  background: isLight ? '#FFFFFF' : 'rgba(11, 19, 38, 0.9)',
                  border: isLight ? '1.5px solid #D6E2FA' : '1px solid var(--border-subtle)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  color: 'var(--text-main)',
                  width: 90,
                  fontSize: 14,
                  fontWeight: 600
                }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>% minimum accuracy bar</span>
            </div>
          </div>

          {/* Rule 3: Budget Overage */}
          <div style={{
            background: isLight ? '#F3F6FC' : 'rgba(0,0,0,0.25)',
            border: isLight ? '1.5px solid #D6E2FA' : 'none',
            padding: 18,
            borderRadius: 10
          }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: isLight ? '#C62828' : 'var(--accent-rose)' }}>
              3. INTERVENE: Cost-to-Budget Ratio (%)
            </label>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 10px 0' }}>
              Trigger FinOps review if agent incurred expenditure exceeds budgeted plan.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="number"
                value={thresholds.intervene_cost_budget_pct}
                onChange={e => setThresholds({ ...thresholds, intervene_cost_budget_pct: +e.target.value })}
                style={{
                  background: isLight ? '#FFFFFF' : 'rgba(11, 19, 38, 0.9)',
                  border: isLight ? '1.5px solid #D6E2FA' : '1px solid var(--border-subtle)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  color: 'var(--text-main)',
                  width: 90,
                  fontSize: 14,
                  fontWeight: 600
                }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>% of budget cap</span>
            </div>
          </div>

          {/* Rule 4: Accelerate Value */}
          <div style={{
            background: isLight ? '#F3F6FC' : 'rgba(0,0,0,0.25)',
            border: isLight ? '1.5px solid #D6E2FA' : 'none',
            padding: 18,
            borderRadius: 10
          }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: isLight ? '#1B5E20' : 'var(--accent-emerald)' }}>
              4. ACCELERATE: Net Value Floor ($)
            </label>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 10px 0' }}>
              Minimum net monthly value needed to qualify an agent for multi-team scale-out.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="number"
                step="5000"
                value={thresholds.accelerate_value_min}
                onChange={e => setThresholds({ ...thresholds, accelerate_value_min: +e.target.value })}
                style={{
                  background: isLight ? '#FFFFFF' : 'rgba(11, 19, 38, 0.9)',
                  border: isLight ? '1.5px solid #D6E2FA' : '1px solid var(--border-subtle)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  color: 'var(--text-main)',
                  width: 110,
                  fontSize: 14,
                  fontWeight: 600
                }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>USD / month</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Updating...' : 'Save & Re-evaluate Portfolio'}
          </button>
          {saveSuccess && (
            <span style={{ color: isLight ? '#1B5E20' : '#34d399', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={16} /> Saved! Portfolio action states recalculated live.
            </span>
          )}
        </div>
      </div>

      {/* CSV Data Ingestion Card */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            background: isLight ? '#E3F1E4' : 'rgba(16, 185, 129, 0.1)',
            padding: 8,
            borderRadius: 8,
            color: isLight ? '#1B5E20' : 'var(--accent-emerald)'
          }}>
            <Upload size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Telemetry Data Mart Ingestion (CSV)</h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Bulk upload telemetry datasets (Agent monthly metrics, Cost allocation files, or Seat inventory logs)
            </span>
          </div>
        </div>

        <div style={{
          marginTop: 18,
          border: isLight ? '2px dashed #BFD0FF' : '2px dashed var(--border-subtle)',
          borderRadius: 12,
          padding: '36px 20px',
          textAlign: 'center',
          background: isLight ? '#F3F6FC' : 'rgba(0,0,0,0.15)'
        }}>
          <FileText size={36} color={isLight ? '#00349B' : 'var(--accent-cyan)'} style={{ margin: '0 auto 12px auto' }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
            Upload Agent Telemetry or FinOps CSV File
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Supports standard schema: Month, Agent, Team, Function, GrossValueUSD, CostUSD, EvalRuns, EvalPassed
          </p>
          <label style={{
            background: isLight ? '#00349B' : 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            padding: '8px 18px',
            borderRadius: 'var(--radius-pill)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-block'
          }}>
            Choose CSV File
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>

          {uploadStatus && (
            <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: uploadStatus.startsWith('✓') ? (isLight ? '#1B5E20' : '#34d399') : 'var(--text-main)' }}>
              {uploadStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
