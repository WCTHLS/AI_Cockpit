import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertCircle, X, Download } from 'lucide-react';
import { formatUSD } from '../api';

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  theme?: 'dark' | 'light';
}

export const IngestModal: React.FC<IngestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  theme = 'light'
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const isLight = theme === 'light';

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/v1/ingest/template');
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wct_agent_usage_template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to download template');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a CSV or Excel file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/v1/ingest/excel', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to ingest file');
      }

      const data = await res.json();
      setResult(data.summary);
      onSuccess(); // Triggers live re-fetch of cockpit KPIs
    } catch (err: any) {
      setError(err.message || 'An error occurred during ingestion.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(7, 12, 24, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20
    }}>
      <div style={{
        background: isLight ? '#FFFFFF' : '#101a33',
        border: `1.5px solid ${isLight ? '#00349B' : 'rgba(0, 210, 255, 0.3)'}`,
        borderRadius: 14,
        width: '100%',
        maxWidth: 580,
        boxShadow: isLight ? '0 14px 40px rgba(0, 52, 155, 0.18)' : '0 20px 50px rgba(0, 0, 0, 0.6)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          background: isLight ? '#00349B' : '#0b1326',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileSpreadsheet size={22} color={isLight ? '#FFFFFF' : '#00d2ff'} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Ingest Employee Usage Spreadsheet</div>
              <div style={{ fontSize: 11.5, opacity: 0.85 }}>Dynamic Productivity &amp; ROI Calculation Engine</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              padding: 4
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px 28px' }}>
          <p style={{
            fontSize: 13.5,
            color: isLight ? '#475569' : '#94a3b8',
            lineHeight: 1.5,
            marginBottom: 16
          }}>
            Upload an Excel (<code>.xlsx</code>) or <code>.csv</code> file containing employee agent utilization. 
            The system dynamically calculates labor hours saved, token API spend, and net financial ROI across your organization.
          </p>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: isLight ? '#F3F6FC' : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${isLight ? '#D6E2FA' : 'rgba(255, 255, 255, 0.08)'}`,
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 20
          }}>
            <div style={{ fontSize: 12.5, color: isLight ? '#1A1A1A' : '#cbd5e1' }}>
              Expected columns: <code>agent_name, department, employee_email, tasks_completed, tokens_used</code>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              style={{
                background: isLight ? '#FFFFFF' : 'rgba(0, 210, 255, 0.1)',
                border: `1px solid ${isLight ? '#00349B' : 'rgba(0, 210, 255, 0.3)'}`,
                color: isLight ? '#00349B' : '#00d2ff',
                borderRadius: 6,
                padding: '5px 10px',
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer'
              }}
            >
              <Download size={13} />
              Sample CSV
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* File Dropzone */}
            <label style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px dashed ${file ? (isLight ? '#1713FD' : '#00d2ff') : (isLight ? '#BFD0FF' : 'rgba(255,255,255,0.15)')}`,
              borderRadius: 10,
              padding: '24px 16px',
              cursor: 'pointer',
              background: isLight ? (file ? '#F3F6FC' : '#FAFBFD') : 'rgba(0,0,0,0.2)',
              transition: 'all 0.2s ease',
              marginBottom: 16
            }}>
              <UploadCloud size={36} color={isLight ? '#00349B' : '#00d2ff'} style={{ marginBottom: 8 }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: isLight ? '#00349B' : '#fff' }}>
                {file ? file.name : 'Click to select or drag CSV / Excel file'}
              </span>
              <span style={{ fontSize: 11.5, color: isLight ? '#64748B' : '#94a3b8', marginTop: 4 }}>
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports .csv and .xlsx files'}
              </span>
              <input
                type="file"
                accept=".csv, .xlsx, .xls, .txt"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>

            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: isLight ? '#F9DEDC' : 'rgba(239, 68, 68, 0.15)',
                color: '#C62828',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 16
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {result && (
              <div style={{
                background: isLight ? '#E3F1E4' : 'rgba(16, 185, 129, 0.15)',
                border: `1px solid ${isLight ? '#A5D6A7' : 'rgba(16, 185, 129, 0.3)'}`,
                borderRadius: 8,
                padding: '14px 16px',
                marginBottom: 16
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: isLight ? '#1B5E20' : '#34d399',
                  fontWeight: 800,
                  fontSize: 14,
                  marginBottom: 8
                }}>
                  <CheckCircle size={18} />
                  <span>Productivity Successfully Re-Calculated!</span>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                  fontSize: 12.5,
                  color: isLight ? '#1A1A1A' : '#f8fafc'
                }}>
                  <div>
                    <span style={{ color: isLight ? '#475569' : '#94a3b8', display: 'block', fontSize: 11 }}>Rows Ingested</span>
                    <b>{result.rows_processed} rows</b>
                  </div>
                  <div>
                    <span style={{ color: isLight ? '#475569' : '#94a3b8', display: 'block', fontSize: 11 }}>Hours Saved</span>
                    <b style={{ color: isLight ? '#1B5E20' : '#34d399' }}>+{result.hours_saved} hrs</b>
                  </div>
                  <div>
                    <span style={{ color: isLight ? '#475569' : '#94a3b8', display: 'block', fontSize: 11 }}>Net Value Added</span>
                    <b style={{ color: isLight ? '#00349B' : '#00d2ff' }}>+{formatUSD(result.net_value_usd)}</b>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: isLight ? '#F3F6FC' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${isLight ? '#D6E2FA' : 'rgba(255,255,255,0.1)'}`,
                  color: isLight ? '#1A1A1A' : '#fff',
                  borderRadius: 8,
                  padding: '9px 18px',
                  fontWeight: 600,
                  fontSize: 13.5,
                  cursor: 'pointer'
                }}
              >
                {result ? 'Done' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={!file || isUploading}
                style={{
                  background: isLight ? '#00349B' : 'linear-gradient(135deg, #00d2ff, #0066ff)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 20px',
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: (!file || isUploading) ? 'not-allowed' : 'pointer',
                  opacity: (!file || isUploading) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                {isUploading ? 'Calculating...' : 'Ingest & Re-Calculate'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
