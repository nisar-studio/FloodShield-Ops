import React from 'react';
import { ShieldCheck, ShieldAlert, TrendingUp, AlertTriangle } from 'lucide-react';
import { Badge } from './ui/Badge';

export function Reachability3DGauge({ simulation, threshold = 0.8 }) {
  const baselineScore = simulation?.baselineScore ?? 0.5;
  const planScore = simulation?.planScore ?? 0.833;
  const passed = simulation?.passed ?? true;

  const baselinePercent = Math.round(baselineScore * 100);
  const planPercent = Math.round(planScore * 100);
  const thresholdPercent = Math.round(threshold * 100);

  // SVG Gauge calculations (radius = 70, circumference = 2 * PI * 70 = 439.82)
  const radius = 70;
  const circ = 2 * Math.PI * radius;
  const offsetPlan = circ - (planScore * circ);
  const offsetBase = circ - (baselineScore * circ);

  // Delta improvement
  const delta = (planScore - baselineScore) * 100;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-around',
        gap: '1.5rem',
        padding: '1.25rem',
        background: 'linear-gradient(145deg, rgba(14, 22, 42, 0.7) 0%, rgba(6, 10, 20, 0.85) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.15)',
        borderRadius: '12px',
        boxShadow: '0 12px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background ambient lighting */}
      <div
        style={{
          position: 'absolute',
          top: '-30%',
          right: '-10%',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: passed
            ? 'radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(239, 68, 68, 0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* 3D Gauge Circle */}
      <div style={{ position: 'relative', width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
          {/* Track Circle */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth="12"
          />

          {/* Baseline Score Arc (Muted white-blue) */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="transparent"
            stroke="rgba(148, 163, 184, 0.3)"
            strokeWidth="12"
            strokeDasharray={circ}
            strokeDashoffset={offsetBase}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />

          {/* Plan Score Arc (Vibrant emerald if pass, vibrant red if fail) */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="transparent"
            stroke={passed ? '#10b981' : '#ef4444'}
            strokeWidth="12"
            strokeDasharray={circ}
            strokeDashoffset={offsetPlan}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
              filter: passed
                ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))'
                : 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))',
            }}
          />
        </svg>

        {/* Center Readout */}
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <div className="font-mono" style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>
            {planPercent}%
          </div>
          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#94a3b8', marginTop: '4px', fontWeight: 600 }}>
            Reachability
          </div>
          <Badge
            variant={passed ? 'success' : 'danger'}
            style={{ marginTop: '4px', fontSize: '0.62rem', padding: '2px 5px' }}
          >
            {passed ? 'VERIFIED PASS' : 'REJECTED'}
          </Badge>
        </div>
      </div>

      {/* Metrics & Delta Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', minWidth: '220px' }}>
        <div>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>
            Deterministic Graph Verifier
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
            {passed ? (
              <>
                <ShieldCheck size={20} color="#10b981" />
                <span>Threshold Cleared</span>
              </>
            ) : (
              <>
                <ShieldAlert size={20} color="#ef4444" />
                <span>Verification Failed</span>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Baseline Score:</div>
            <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: '#cbd5e1' }}>
              {baselinePercent}%
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Target Safety Line:</div>
            <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: '#38bdf8' }}>
              {thresholdPercent}%
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#cbd5e1' }}>
          <TrendingUp size={16} color={passed ? '#10b981' : '#f59e0b'} />
          <span>
            Net Change:{' '}
            <strong className="font-mono" style={{ color: delta >= 0 ? '#10b981' : '#ef4444' }}>
              {delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
            </strong>{' '}
            reachable access
          </span>
        </div>
      </div>
    </div>
  );
}
