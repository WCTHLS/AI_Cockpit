import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { 
  Users, 
  UserX, 
  Clock, 
  Award, 
  Calculator, 
  CheckCircle2, 
  Mail, 
  Sparkles, 
  Maximize2, 
  Table as TableIcon,
  Sliders,
  DollarSign,
  ShieldCheck,
  RotateCcw,
  Lock
} from 'lucide-react';
import { UserProfile } from '../types';
import { SeatInventorySummary } from '../types';
import { formatUSD, formatPct } from '../api';

interface SeatsAdoptionTabProps {
  seats: SeatInventorySummary | null;
  selectedFunction?: string;
  customCostPerSeat?: number;
  onCostPerSeatChange?: (cost: number) => void;
  theme?: 'dark' | 'light';
  user?: UserProfile;
}

interface FunctionSeatActivity {
  func: string;
  active: number;
  lapsing: number;
  idle: number;
  total: number;
  idlePct: number;
  adoptionPct: number;
}

export const SeatsAdoptionTab: React.FC<SeatsAdoptionTabProps> = ({ 
  seats, 
  selectedFunction = '',
  customCostPerSeat = 30,
  onCostPerSeatChange, 
  theme = 'light' 
}) => {
  const isLight = theme === 'light';
  const isScoped = Boolean(selectedFunction && selectedFunction !== 'All Functions');

  // Cost per seat slider state - initialized from custom enterprise config
  const [seatCost, setSeatCost] = useState<number>(customCostPerSeat || 30);

  useEffect(() => {
    if (customCostPerSeat && customCostPerSeat !== seatCost) {
      setSeatCost(customCostPerSeat);
    }
  }, [customCostPerSeat]);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Chart DOM refs
  const funcStackedChartRef = useRef<HTMLDivElement>(null);
  const histogramChartRef = useRef<HTMLDivElement>(null);
  const adoptRankingChartRef = useRef<HTMLDivElement>(null);

  // Baseline Seat Metrics (matching HTML v6 dataset: 4,600 total seats)
  const total = seats?.total_licensed_seats ?? 4600;
  const active = seats?.active_seats_7d ?? 3588;
  const lapsing = seats?.lapsing_seats_7_29d ?? 552;
  const idle = seats?.idle_seats_30d ?? 460;

  const monthlyIdleCost = idle * seatCost;
  const annualIdleCost = monthlyIdleCost * 12;

  // Breakdown by Function Dataset
  const funcData: FunctionSeatActivity[] = [
    { func: 'Customer Support', active: 1120, lapsing: 110, idle: 90, total: 1320, idlePct: 7, adoptionPct: 85 },
    { func: 'Engineering & IT', active: 940, lapsing: 140, idle: 120, total: 1200, idlePct: 10, adoptionPct: 78 },
    { func: 'Sales & Marketing', active: 680, lapsing: 130, idle: 110, total: 920, idlePct: 12, adoptionPct: 74 },
    { func: 'Operations', active: 530, lapsing: 100, idle: 80, total: 710, idlePct: 11, adoptionPct: 75 },
    { func: 'Finance', active: 318, lapsing: 72, idle: 60, total: 450, idlePct: 13, adoptionPct: 71 },
  ];

  // Inactivity Bins (Histogram dataset)
  const bins = [
    { label: '0–6d', days: 3, count: 3588, band: 'Active', color: '#00349B' },
    { label: '7–13d', days: 10, count: 230, band: 'Lapsing', color: '#88A9E6' },
    { label: '14–20d', days: 17, count: 184, band: 'Lapsing', color: '#88A9E6' },
    { label: '21–29d', days: 25, count: 138, band: 'Lapsing', color: '#88A9E6' },
    { label: '30–44d', days: 37, count: 180, band: 'Idle', color: '#E0A100' },
    { label: '45–59d', days: 52, count: 120, band: 'Idle', color: '#E0A100' },
    { label: '60–89d', days: 75, count: 90, band: 'Idle', color: '#C62828' },
    { label: '90+d', days: 100, count: 70, band: 'Idle', color: '#C62828' },
  ];

  const triggerAction = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  // Chart 1: Seat Activity by Function (Stacked Horizontal Bar Chart)
  useEffect(() => {
    if (!funcStackedChartRef.current) return;
    const chart = echarts.init(funcStackedChartRef.current);

    const sorted = [...funcData].reverse();

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#FFFFFF',
        borderColor: '#D6E2FA',
        borderWidth: 1,
        textStyle: { color: '#0F172A', fontFamily: 'Figtree, sans-serif' },
        formatter: (params: any) => {
          const item = sorted[params[0].dataIndex];
          return `<div style="padding: 4px;">
            <b style="color: #00349B; font-size: 13px;">${item.func} · ${item.total.toLocaleString()} seats</b><br/>
            <span style="color: #00349B;">● Active (&lt;7d):</span> <b>${item.active.toLocaleString()}</b> (${((item.active / item.total) * 100).toFixed(0)}%)<br/>
            <span style="color: #88A9E6;">● Lapsing (7–29d):</span> <b>${item.lapsing.toLocaleString()}</b> (${((item.lapsing / item.total) * 100).toFixed(0)}%)<br/>
            <span style="color: #E0A100;">● Idle (30+d):</span> <b>${item.idle.toLocaleString()}</b> (${item.idlePct}%)
          </div>`;
        }
      },
      legend: {
        top: 0,
        left: 0,
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { color: '#475569', fontSize: 11, fontWeight: 600 },
        data: ['Active (<7d)', 'Lapsing (7-29d)', 'Idle (30+d)']
      },
      grid: { top: 35, right: 65, bottom: 20, left: 130 },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } },
        axisLabel: { color: '#64748B', fontSize: 10 }
      },
      yAxis: {
        type: 'category',
        data: sorted.map(d => d.func),
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisTick: { show: false },
        axisLabel: { color: '#0F172A', fontSize: 11.5, fontWeight: 600 }
      },
      series: [
        {
          name: 'Active (<7d)',
          type: 'bar',
          stack: 'seats',
          barWidth: 18,
          data: sorted.map(d => d.active),
          itemStyle: { color: '#00349B' }
        },
        {
          name: 'Lapsing (7-29d)',
          type: 'bar',
          stack: 'seats',
          data: sorted.map(d => d.lapsing),
          itemStyle: { color: '#88A9E6' }
        },
        {
          name: 'Idle (30+d)',
          type: 'bar',
          stack: 'seats',
          data: sorted.map(d => d.idle),
          itemStyle: { color: '#E0A100', borderRadius: [0, 4, 4, 0] },
          label: {
            show: true,
            position: 'right',
            formatter: (p: any) => `${sorted[p.dataIndex].idlePct}% idle`,
            color: '#334155',
            fontWeight: 700,
            fontSize: 11
          }
        }
      ]
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, []);

  // Chart 2: Days Since Last Activity (Histogram Bins)
  useEffect(() => {
    if (!histogramChartRef.current) return;
    const chart = echarts.init(histogramChartRef.current);

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#FFFFFF',
        borderColor: '#D6E2FA',
        borderWidth: 1,
        textStyle: { color: '#0F172A' },
        formatter: (params: any) => {
          const item = bins[params[0].dataIndex];
          return `<div style="padding: 4px;">
            <b>${item.label} (${item.band})</b><br/>
            Seats: <b>${item.count.toLocaleString()}</b> (${((item.count / total) * 100).toFixed(1)}% of estate)
          </div>`;
        }
      },
      grid: { top: 25, right: 15, bottom: 25, left: 45 },
      xAxis: {
        type: 'category',
        data: bins.map(b => b.label),
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisTick: { show: false },
        axisLabel: { color: '#0F172A', fontSize: 11, fontWeight: 600 }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } },
        axisLabel: { color: '#64748B', fontSize: 10 }
      },
      series: [
        {
          name: 'Seats',
          type: 'bar',
          barWidth: 24,
          data: bins.map(b => ({
            value: b.count,
            itemStyle: { color: b.color, borderRadius: [4, 4, 0, 0] }
          })),
          label: {
            show: true,
            position: 'top',
            formatter: (p: any) => p.value.toLocaleString(),
            color: '#0F172A',
            fontWeight: 700,
            fontSize: 10.5
          }
        }
      ]
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [total]);

  // Chart 3: Adoption by Function (Horizontal Ranking Bar Chart)
  useEffect(() => {
    if (!adoptRankingChartRef.current) return;
    const chart = echarts.init(adoptRankingChartRef.current);

    const sorted = [...funcData].sort((a, b) => a.adoptionPct - b.adoptionPct);

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#FFFFFF',
        borderColor: '#D6E2FA',
        borderWidth: 1,
        textStyle: { color: '#0F172A' },
        formatter: (params: any) => {
          const item = sorted[params[0].dataIndex];
          return `<div style="padding: 4px;">
            <b style="color: #00349B;">${item.func}</b><br/>
            Adoption Rate: <b>${item.adoptionPct}%</b> (${item.active.toLocaleString()} of ${item.total.toLocaleString()} users)
          </div>`;
        }
      },
      grid: { top: 15, right: 60, bottom: 20, left: 130 },
      xAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } },
        axisLabel: { formatter: '{value}%', color: '#64748B', fontSize: 10 }
      },
      yAxis: {
        type: 'category',
        data: sorted.map(d => d.func),
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisTick: { show: false },
        axisLabel: { color: '#0F172A', fontSize: 11.5, fontWeight: 600 }
      },
      series: [
        {
          name: 'Adoption Rate',
          type: 'bar',
          barWidth: 16,
          data: sorted.map(d => ({
            value: d.adoptionPct,
            itemStyle: {
              color: d.adoptionPct >= 80 ? '#2E7D32' : d.adoptionPct >= 70 ? '#00349B' : '#E0A100',
              borderRadius: [0, 4, 4, 0]
            }
          })),
          label: {
            show: true,
            position: 'right',
            formatter: '{@[0]}%',
            color: '#00349B',
            fontWeight: 800,
            fontSize: 11
          }
        }
      ]
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Toast Feedback Notification */}
      {actionToast && (
        <div style={{
          position: 'fixed',
          top: 80,
          right: 32,
          zIndex: 1100,
          background: '#00349B',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0, 52, 155, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          fontWeight: 600
        }}>
          <CheckCircle2 size={16} color="#4ade80" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Month Subtitle Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          padding: '4px 14px',
          borderRadius: 20,
          fontSize: 12.5,
          fontWeight: 600,
          color: '#00349B'
        }}>
          <span>Snapshot:</span>
          <span style={{ fontWeight: 800 }}>30 Sep 2026 (Live Audit)</span>
        </div>

        <div style={{ fontSize: 12, color: '#64748B' }}>
          Seat data reflects active directory telemetry · Active &lt; 7 days · Idle ≥ 30 days
        </div>
      </div>

      {/* Scoped Function Seat Banner */}
      {isScoped && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#EFF6FF',
          border: '1.5px solid #BFDBFE',
          padding: '10px 16px',
          borderRadius: 10,
          color: '#1E40AF',
          fontSize: 13,
          fontWeight: 600
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#00349B', color: '#FFFFFF', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 800 }}>
              FUNCTION SEATS ACTIVE
            </span>
            <span>
              Seat allocation and adoption audit scoped to <b>{selectedFunction}</b> ({total.toLocaleString()} total seats · {active.toLocaleString()} active · {idle.toLocaleString()} idle)
            </span>
          </div>
        </div>
      )}

      {/* Top 5 FinOps Seat KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 14
      }}>
        {/* KPI 1: LICENSED SEATS (Hero Dark Navy Card) */}
        <div className="executive-card" style={{
          background: 'linear-gradient(135deg, #0A2540 0%, #00349B 100%)',
          borderRadius: 12,
          padding: '16px 18px',
          color: '#FFFFFF',
          boxShadow: '0 8px 24px -4px rgba(0, 52, 155, 0.28)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 120,
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
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#93C5FD'
              }}>
                LICENSED SEATS
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                background: 'rgba(255, 255, 255, 0.18)',
                backdropFilter: 'blur(8px)',
                color: '#FFFFFF',
                padding: '2px 7px',
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.25)'
              }}>
                Pooled
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
              <div style={{ fontSize: 29, fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>
                {total.toLocaleString()}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#93C5FD', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: 4, marginBottom: 4 }}>
                Active Estate
              </span>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: '#93C5FD', marginTop: 6 }}>
            Enterprise Pooled Capacity
          </div>
        </div>

        {/* KPI 2: ACTIVE SEATS (7 DAYS) */}
        <div className="executive-card" style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 16px -4px rgba(0, 52, 155, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 120,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, #10B981, #34D399)'
          }} />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#00349B'
              }}>
                ACTIVE SEATS (7 DAYS)
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                background: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
                padding: '2px 7px',
                borderRadius: 12
              }}>
                {((active / total) * 100).toFixed(0)}% Utilized
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
              <div style={{ fontSize: 29, fontWeight: 800, letterSpacing: '-0.02em', color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}>
                {active.toLocaleString()}
              </div>
              <svg width="56" height="20" viewBox="0 0 56 20" fill="none" style={{ marginBottom: 4 }}>
                <path d="M2 16 L14 13 L28 10 L42 6 L54 3" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="54" cy="3" r="2.5" fill="#10B981" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#16A34A', marginTop: 6 }}>
            {((active / total) * 100).toFixed(1)}% of seats actively utilized
          </div>
        </div>

        {/* KPI 3: LAPSING SEATS (7-29 DAYS) */}
        <div className="executive-card" style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 16px -4px rgba(0, 52, 155, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 120,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, #64748B, #94A3B8)'
          }} />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#475569'
              }}>
                LAPSING (7–29 DAYS)
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                background: '#F1F5F9',
                color: '#475569',
                border: '1px solid #E2E8F0',
                padding: '2px 7px',
                borderRadius: 12
              }}>
                Coaching Nudge
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
              <div style={{ fontSize: 29, fontWeight: 800, letterSpacing: '-0.02em', color: '#0F172A', fontFamily: 'Outfit, sans-serif' }}>
                {lapsing.toLocaleString()}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>
                {((lapsing / total) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 6 }}>
            Target for proactive coaching nudges
          </div>
        </div>

        {/* KPI 4: IDLE SEATS (30+ DAYS) */}
        <div className="executive-card" style={{
          background: '#FFFFFF',
          border: '1px solid #FEF3C7',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 16px -4px rgba(217, 119, 6, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 120,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, #D97706, #FBBF24)'
          }} />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#B45309'
              }}>
                IDLE SEATS (30+ DAYS)
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                background: '#FEF3C7',
                color: '#B45309',
                border: '1px solid #FDE68A',
                padding: '2px 7px',
                borderRadius: 12
              }}>
                Reclaimable
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
              <div style={{ fontSize: 29, fontWeight: 800, letterSpacing: '-0.02em', color: '#B45309', fontFamily: 'Outfit, sans-serif' }}>
                {idle.toLocaleString()}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#B45309' }}>
                {((idle / total) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#B45309', marginTop: 6 }}>
            Direct 1-click license harvest target
          </div>
        </div>

        {/* KPI 5: IDLE SEAT COST */}
        <div className="executive-card" style={{
          background: '#FFFFFF',
          border: '1px solid #FECACA',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 16px -4px rgba(220, 38, 38, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 120,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, #DC2626, #F87171)'
          }} />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#DC2626'
              }}>
                IDLE SEAT COST
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                background: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #FECACA',
                padding: '2px 7px',
                borderRadius: 12
              }}>
                Avoidable
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
              <div style={{ fontSize: 29, fontWeight: 800, letterSpacing: '-0.02em', color: '#DC2626', fontFamily: 'Outfit, sans-serif' }}>
                {formatUSD(monthlyIdleCost)}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', background: '#FEE2E2', padding: '2px 6px', borderRadius: 4, marginBottom: 4 }}>
                / month
              </span>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 6 }}>
            Annualized waste: <b style={{ color: '#DC2626' }}>{formatUSD(annualIdleCost)}</b> / year
          </div>
        </div>
      </div>

      {/* Middle Row: Seat Activity by Function & Days Since Last Activity Histogram */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: 16
      }}>
        {/* Seat Activity by Function */}
        <div className="executive-card" style={{
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          borderRadius: 12,
          padding: '18px 20px',
          boxShadow: '0 4px 16px rgba(0, 52, 155, 0.08)'
        }}>
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#00349B', fontFamily: 'Satoshi, sans-serif' }}>
              Seat activity by function
            </h4>
            <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
              Snapshot 30 Sep 2026 · Active &lt; 7 days · Idle ≥ 30 days
            </div>
          </div>
          <div ref={funcStackedChartRef} style={{ height: 280, width: '100%' }} />
        </div>

        {/* Days Since Last Activity Histogram */}
        <div className="executive-card" style={{
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          borderRadius: 12,
          padding: '18px 20px',
          boxShadow: '0 4px 16px rgba(0, 52, 155, 0.08)'
        }}>
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#00349B', fontFamily: 'Satoshi, sans-serif' }}>
              Days since last activity
            </h4>
            <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
              Number of seats by inactivity band (0-6d Active · 7-29d Lapsing · 30d+ Idle)
            </div>
          </div>
          <div ref={histogramChartRef} style={{ height: 280, width: '100%' }} />
        </div>
      </div>

      {/* Bottom Row: Adoption by Function & Licence Optimisation / Harvest Table */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: 16
      }}>
        {/* Adoption by Function */}
        <div className="executive-card" style={{
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          borderRadius: 12,
          padding: '18px 20px',
          boxShadow: '0 4px 16px rgba(0, 52, 155, 0.08)'
        }}>
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#00349B', fontFamily: 'Satoshi, sans-serif' }}>
              Adoption by function
            </h4>
            <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
              Active users ÷ licensed users across departments
            </div>
          </div>
          <div ref={adoptRankingChartRef} style={{ height: 320, width: '100%' }} />
        </div>

        {/* Licence Optimisation & Reclaim Harvest Engine */}
        <div className="executive-card" style={{
          background: '#FFFFFF',
          border: '1.5px solid #D6E2FA',
          borderRadius: 12,
          padding: '18px 20px',
          boxShadow: '0 4px 16px rgba(0, 52, 155, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#00349B', fontFamily: 'Satoshi, sans-serif' }}>
                  Licence optimisation &amp; cost harvest
                </h4>
                <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                  Automated financial recovery on 30+ day dormant licenses
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#166534', background: '#DCFCE7', padding: '2px 8px', borderRadius: 4 }}>
                {idle} Seats Recoverable
              </span>
            </div>

            {/* Interactive Seat Price Slider */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                  License Price Model:
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#00349B' }}>
                  ${seatCost} / seat / mo
                </span>
              </div>
              <input
                type="range"
                min={15}
                max={100}
                step={5}
                value={seatCost}
                onChange={e => {
                  const val = Number(e.target.value);
                  setSeatCost(val);
                  if (onCostPerSeatChange) onCostPerSeatChange(val);
                }}
                style={{ width: '100%', accentColor: '#00349B', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#64748B', marginTop: 4 }}>
                <span>$15 (Studio)</span>
                <span>$30 (M365 Copilot)</span>
                <span>$60 (Pro Dev Tier)</span>
                <span>$100 (Enterprise Suite)</span>
              </div>
            </div>

            {/* Department Harvest Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'Figtree, sans-serif' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', color: '#0F172A', textAlign: 'left', fontWeight: 700 }}>
                    <th style={{ padding: '6px 10px' }}>Department</th>
                    <th style={{ textAlign: 'right', padding: '6px 10px' }}>Provisioned</th>
                    <th style={{ textAlign: 'right', padding: '6px 10px' }}>Idle (30d+)</th>
                    <th style={{ textAlign: 'right', padding: '6px 10px' }}>Annual Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {funcData.map(f => (
                    <tr key={f.func} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 600, color: '#0F172A' }}>{f.func}</td>
                      <td style={{ textAlign: 'right', padding: '6px 10px', color: '#64748B' }}>{f.total.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', padding: '6px 10px', color: '#B45309', fontWeight: 700 }}>{f.idle}</td>
                      <td style={{ textAlign: 'right', padding: '6px 10px', color: '#16A34A', fontWeight: 700 }}>
                        {formatUSD(f.idle * seatCost * 12)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              onClick={() => triggerAction(`Deprovisioning batch job created for ${idle} idle seats (Saving ${formatUSD(annualIdleCost)}/yr)`)}
              style={{
                flex: 1,
                background: '#00349B',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 6,
                padding: '9px 12px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <RotateCcw size={14} /> Reclaim {idle} Idle Seats
            </button>

            <button
              onClick={() => triggerAction(`Automated prompt coaching playbook dispatched to ${lapsing} lapsing employees`)}
              style={{
                flex: 1,
                background: '#FFFFFF',
                color: '#00349B',
                border: '1.5px solid #00349B',
                borderRadius: 6,
                padding: '9px 12px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <Mail size={14} /> Nudge {lapsing} Lapsing Users
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
