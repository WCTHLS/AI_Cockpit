import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { Users, UserX, Clock, Award, Calculator } from 'lucide-react';
import { SeatInventorySummary } from '../types';
import { formatUSD } from '../api';

interface SeatsAdoptionTabProps {
  seats: SeatInventorySummary | null;
  onCostPerSeatChange: (cost: number) => void;
  theme?: 'dark' | 'light';
}

export const SeatsAdoptionTab: React.FC<SeatsAdoptionTabProps> = ({ seats, onCostPerSeatChange, theme = 'dark' }) => {
  const [seatCost, setSeatCost] = useState<number>(30);
  const chartRef = useRef<HTMLDivElement>(null);

  const isLight = theme === 'light';

  const total = seats?.total_licensed_seats ?? 1840;
  const active7d = seats?.active_seats_7d ?? 950;
  const lapsing = seats?.lapsing_seats_7_29d ?? 410;
  const idle = seats?.idle_seats_30d ?? 480;

  const monthlySavings = idle * seatCost;
  const annualSavings = monthlySavings * 12;

  // Render Seats Inactivity Donut
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: isLight ? '#FFFFFF' : '#101a33',
        borderColor: isLight ? '#D6E2FA' : 'rgba(0, 210, 255, 0.3)',
        textStyle: { color: isLight ? '#1A1A1A' : '#FFFFFF' },
        formatter: (params: any) => {
          return `<div style="font-family: Satoshi, Outfit, sans-serif; padding: 4px;">
            <b style="color: ${isLight ? '#00349B' : '#fff'}">${params.name}</b><br/>
            Seats: <b>${params.value.toLocaleString()}</b> (${params.percent}%)
          </div>`;
        }
      },
      legend: {
        bottom: 0,
        textStyle: { color: isLight ? '#475569' : '#94a3b8', fontSize: 11, fontWeight: isLight ? 600 : 400 }
      },
      series: [
        {
          name: 'Seat Inactivity',
          type: 'pie',
          radius: ['50%', '75%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: isLight ? '#FFFFFF' : '#0b1329',
            borderWidth: 2
          },
          label: { show: false },
          data: [
            { name: 'Active (Last 7 Days)', value: active7d, itemStyle: { color: isLight ? '#1B5E20' : '#10b981' } },
            { name: 'Lapsing (7-29 Days)', value: lapsing, itemStyle: { color: isLight ? '#A16207' : '#f59e0b' } },
            { name: 'Idle (30+ Days)', value: idle, itemStyle: { color: isLight ? '#C62828' : '#ef4444' } }
          ]
        }
      ]
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [active7d, lapsing, idle, isLight]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 4 Seat KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 18
      }}>
        {/* Total Licensed */}
        <div className="glass-panel kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="kpi-label">TOTAL LICENSED SEATS</span>
            <div style={{
              background: isLight ? '#E9EFFB' : 'rgba(59, 130, 246, 0.1)',
              padding: 7,
              borderRadius: 8,
              color: isLight ? '#00349B' : 'var(--accent-blue)'
            }}>
              <Users size={18} />
            </div>
          </div>
          <div className="kpi-value">{total.toLocaleString()}</div>
          <div className="kpi-sub">
            <span>Enterprise pooled inventory</span>
          </div>
        </div>

        {/* Active 7d */}
        <div className="glass-panel kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="kpi-label">ACTIVE SEATS (7 DAYS)</span>
            <div style={{
              background: isLight ? '#E3F1E4' : 'rgba(16, 185, 129, 0.1)',
              padding: 7,
              borderRadius: 8,
              color: isLight ? '#1B5E20' : 'var(--accent-emerald)'
            }}>
              <Award size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: isLight ? '#1B5E20' : 'var(--accent-emerald)' }}>
            {active7d.toLocaleString()}
          </div>
          <div className="kpi-sub">
            <span>{((active7d / total) * 100).toFixed(1)}% actively generating value</span>
          </div>
        </div>

        {/* Lapsing 7-29d */}
        <div className="glass-panel kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="kpi-label">LAPSING SEATS (7-29 DAYS)</span>
            <div style={{
              background: isLight ? '#FDF0C8' : 'rgba(245, 158, 11, 0.1)',
              padding: 7,
              borderRadius: 8,
              color: isLight ? '#7A5300' : 'var(--accent-amber)'
            }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: isLight ? '#A16207' : 'var(--accent-amber)' }}>
            {lapsing.toLocaleString()}
          </div>
          <div className="kpi-sub">
            <span>{((lapsing / total) * 100).toFixed(1)}% · Nudge &amp; re-enable</span>
          </div>
        </div>

        {/* Idle 30d+ */}
        <div className="glass-panel kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="kpi-label">IDLE SEATS (30+ DAYS)</span>
            <div style={{
              background: isLight ? '#F9DEDC' : 'rgba(239, 68, 68, 0.1)',
              padding: 7,
              borderRadius: 8,
              color: isLight ? '#A4161A' : 'var(--accent-rose)'
            }}>
              <UserX size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: isLight ? '#C62828' : '#f87171' }}>
            {idle.toLocaleString()}
          </div>
          <div className="kpi-sub">
            <span>{((idle / total) * 100).toFixed(1)}% · Direct reclaim target</span>
          </div>
        </div>
      </div>

      {/* Donut & Interactive Reclaim Calculator Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: 20
      }}>
        {/* Donut Distribution */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Seat Utilization &amp; Inactivity Bands</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Telemetry breakdown based on user login events</span>
          </div>
          <div ref={chartRef} style={{ height: 280, width: '100%' }} />
        </div>

        {/* Interactive License Reclaim Calculator */}
        <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                background: isLight ? '#E9EFFB' : 'rgba(0, 210, 255, 0.1)',
                padding: 8,
                borderRadius: 8,
                color: isLight ? '#00349B' : 'var(--accent-cyan)'
              }}>
                <Calculator size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700 }}>Licence Reclaim &amp; FinOps Harvest Calculator</h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Model cost savings from automated deprovisioning of 30+ day idle seats
                </span>
              </div>
            </div>

            {/* Slider */}
            <div style={{
              marginTop: 20,
              background: isLight ? '#F3F6FC' : 'rgba(0,0,0,0.25)',
              border: isLight ? '1px solid #D6E2FA' : 'none',
              padding: 16,
              borderRadius: 10
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>Assumed Monthly Cost Per Seat:</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: isLight ? '#00349B' : 'var(--accent-cyan)' }}>${seatCost} / seat / mo</span>
              </div>
              <input
                type="range"
                min="15"
                max="100"
                step="5"
                value={seatCost}
                onChange={e => {
                  const val = +e.target.value;
                  setSeatCost(val);
                  onCostPerSeatChange(val);
                }}
                style={{ width: '100%', accentColor: isLight ? '#00349B' : 'var(--accent-cyan)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                <span>$15 (Copilot Studio)</span>
                <span>$30 (M365 Copilot Std)</span>
                <span>$60 (Pro Dev Tier)</span>
                <span>$100 (Enterprise Suite)</span>
              </div>
            </div>
          </div>

          {/* Projection Results */}
          <div style={{
            marginTop: 20,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            background: isLight ? '#E3F1E4' : 'rgba(16, 185, 129, 0.08)',
            border: isLight ? '1.5px solid #C8E6C9' : '1px solid rgba(16, 185, 129, 0.25)',
            padding: 16,
            borderRadius: 12
          }}>
            <div>
              <span style={{ fontSize: 11, color: isLight ? '#1B5E20' : 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Monthly Cost Recovery
              </span>
              <div style={{ fontSize: 24, fontWeight: 800, color: isLight ? '#1B5E20' : '#34d399' }}>{formatUSD(monthlySavings)}</div>
              <span style={{ fontSize: 11, color: isLight ? '#475569' : 'var(--text-dim)' }}>from {idle} unassigned/idle seats</span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: isLight ? '#00349B' : 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Annualized Savings
              </span>
              <div style={{ fontSize: 24, fontWeight: 800, color: isLight ? '#00349B' : '#00d2ff' }}>{formatUSD(annualSavings)}</div>
              <span style={{ fontSize: 11, color: isLight ? '#475569' : 'var(--text-dim)' }}>Direct EBITDA contribution</span>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown by SKU Table */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Licence Utilization by Tool &amp; Platform</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Platform / SKU</th>
                <th>Total Provisioned</th>
                <th>Active (7d)</th>
                <th>Idle (30d+)</th>
                <th>Utilization Rate</th>
                <th>Potential Reclaimable Savings</th>
              </tr>
            </thead>
            <tbody>
              {(seats?.by_tool ?? [
                { tool: 'M365 Copilot', total: 1100, active: 620, idle: 290 },
                { tool: 'Copilot Studio', total: 740, active: 330, idle: 190 }
              ]).map((t, idx) => {
                const util = ((t.active / t.total) * 100).toFixed(1);
                const potSavings = t.idle * seatCost;
                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, color: isLight ? '#00349B' : '#fff' }}>{t.tool}</td>
                    <td>{t.total.toLocaleString()}</td>
                    <td style={{ color: isLight ? '#1B5E20' : '#34d399', fontWeight: 700 }}>{t.active.toLocaleString()}</td>
                    <td style={{ color: isLight ? '#C62828' : '#f87171', fontWeight: 700 }}>{t.idle.toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 60,
                          height: 6,
                          background: isLight ? '#D6E2FA' : 'rgba(255,255,255,0.1)',
                          borderRadius: 3,
                          overflow: 'hidden'
                        }}>
                          <div style={{ width: `${util}%`, height: '100%', background: isLight ? '#1713FD' : '#3b82f6' }} />
                        </div>
                        <span style={{ fontWeight: 600 }}>{util}%</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: isLight ? '#00349B' : '#00d2ff' }}>{formatUSD(potSavings)} / mo</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
