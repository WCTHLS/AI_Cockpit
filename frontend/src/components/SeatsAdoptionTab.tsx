import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { Users, UserX, Clock, Award, Calculator, ArrowRight, DollarSign } from 'lucide-react';
import { SeatInventorySummary } from '../types';
import { formatUSD, formatPct } from '../api';

interface SeatsAdoptionTabProps {
  seats: SeatInventorySummary | null;
  onCostPerSeatChange: (cost: number) => void;
}

export const SeatsAdoptionTab: React.FC<SeatsAdoptionTabProps> = ({ seats, onCostPerSeatChange }) => {
  const [seatCost, setSeatCost] = useState<number>(30);
  const chartRef = useRef<HTMLDivElement>(null);

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
        formatter: (params: any) => {
          return `<div style="font-family: Outfit, sans-serif; padding: 4px;">
            <b>${params.name}</b><br/>
            Seats: <b>${params.value.toLocaleString()}</b> (${params.percent}%)
          </div>`;
        }
      },
      legend: {
        bottom: 0,
        textStyle: { color: '#94a3b8', fontSize: 11 }
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
            borderColor: '#0b1329',
            borderWidth: 2
          },
          label: { show: false },
          data: [
            { name: 'Active (Last 7 Days)', value: active7d, itemStyle: { color: '#10b981' } },
            { name: 'Lapsing (7-29 Days)', value: lapsing, itemStyle: { color: '#f59e0b' } },
            { name: 'Idle (30+ Days)', value: idle, itemStyle: { color: '#ef4444' } }
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
  }, [active7d, lapsing, idle]);

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
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>TOTAL LICENSED SEATS</span>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: 7, borderRadius: 8, color: 'var(--accent-blue)' }}>
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
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>ACTIVE SEATS (7 DAYS)</span>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: 7, borderRadius: 8, color: 'var(--accent-emerald)' }}>
              <Award size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--accent-emerald)' }}>
            {active7d.toLocaleString()}
          </div>
          <div className="kpi-sub">
            <span>{((active7d / total) * 100).toFixed(1)}% actively generating value</span>
          </div>
        </div>

        {/* Lapsing 7-29d */}
        <div className="glass-panel kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>LAPSING SEATS (7-29 DAYS)</span>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: 7, borderRadius: 8, color: 'var(--accent-amber)' }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--accent-amber)' }}>
            {lapsing.toLocaleString()}
          </div>
          <div className="kpi-sub">
            <span>{((lapsing / total) * 100).toFixed(1)}% · Nudge &amp; re-enable</span>
          </div>
        </div>

        {/* Idle 30d+ */}
        <div className="glass-panel kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>IDLE SEATS (30+ DAYS)</span>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: 7, borderRadius: 8, color: 'var(--accent-rose)' }}>
              <UserX size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#f87171' }}>
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
              <div style={{ background: 'rgba(0, 210, 255, 0.1)', padding: 8, borderRadius: 8, color: 'var(--accent-cyan)' }}>
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
            <div style={{ marginTop: 20, background: 'rgba(0,0,0,0.25)', padding: 16, borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Assumed Monthly Cost Per Seat:</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-cyan)' }}>${seatCost} / seat / mo</span>
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
                style={{ width: '100%', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
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
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: 16,
            borderRadius: 12
          }}>
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Monthly Cost Recovery</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#34d399' }}>{formatUSD(monthlySavings)}</div>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>from {idle} unassigned/idle seats</span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Annualized Savings</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#00d2ff' }}>{formatUSD(annualSavings)}</div>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Direct EBITDA contribution</span>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown by SKU Table */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Licence Utilization by Tool &amp; Platform</h3>
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
                  <td style={{ fontWeight: 600, color: '#fff' }}>{t.tool}</td>
                  <td>{t.total.toLocaleString()}</td>
                  <td style={{ color: '#34d399', fontWeight: 600 }}>{t.active.toLocaleString()}</td>
                  <td style={{ color: '#f87171', fontWeight: 600 }}>{t.idle.toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${util}%`, height: '100%', background: '#3b82f6' }} />
                      </div>
                      <span>{util}%</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color: '#00d2ff' }}>{formatUSD(potSavings)} / mo</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
