import React from 'react';
import { ShieldCheck, ShieldAlert, TrendingUp } from 'lucide-react';
import { Badge } from './ui/Badge';

export function Reachability3DGauge({ simulation, threshold = 0.8 }) {
  const baselineScore = simulation?.baselineScore ?? 0.5;
  const planScore = simulation?.planScore ?? 0.833;
  const passed = simulation?.passed ?? true;

  const baselinePercent = Math.round(baselineScore * 100);
  const planPercent = Math.round(planScore * 100);
  const thresholdPercent = Math.round(threshold * 100);

  // SVG Gauge calculations (radius = 75, circ = 471.2)
  const radius = 75;
  const circ = 2 * Math.PI * radius;
  const offsetPlan = circ - (planScore * circ);
  const offsetBase = circ - (baselineScore * circ);

  const delta = (planScore - baselineScore) * 100;

  return (
    <div
      className="ops-card"
      style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-around',
        gap: '2rem',
        padding: '2rem',
      }}
    >
      {/* Radial Metric Ring */}
      <div style={{ position: 'relative', width: '190px', height: '190px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="190" height="190" viewBox="0 0 190 190" style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx="95"
            cy="95"
            r={radius}
            fill="transparent"
            stroke="var(--border-subtle)"
            strokeWidth="14"
          />

          {/* Baseline Arc */}
          <circle
            cx="95"
            cy="95"
            r={radius}
            fill="transparent"
            stroke="var(--border-medium)"
            strokeWidth="14"
            strokeDasharray={circ}
            strokeDashoffset={offsetBase}
            strokeLinecap="round"
          />

          {/* Plan Arc */}
          <circle
            cx="95"
            cy="95"
            r={radius}
            fill="transparent"
            stroke={passed ? 'var(--color-success)' : 'var(--color-danger)'}
            strokeWidth="14"
            strokeDasharray={circ}
            strokeDashoffset={offsetPlan}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.8s ease',
            }}
          />
        </svg>

        {/* Center Text */}
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
          <div className="font-mono" style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
            {planPercent}%
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 600 }}>
            Reachability
          </div>
          <Badge
            variant={passed ? 'success' : 'danger'}
            style={{ marginTop: '6px' }}
          >
            {passed ? 'Verified' : 'Rejected'}
          </Badge>
        </div>
      </div>

      {/* Metrics Readout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '260px' }}>
        <div>
          <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
            Deterministic Simulator Check
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '4px' }}>
            {passed ? (
              <>
                <ShieldCheck size={22} color="var(--color-success)" />
                <span>Safety Threshold Cleared</span>
              </>
            ) : (
              <>
                <ShieldAlert size={22} color="var(--color-danger)" />
                <span>Safety Threshold Failed</span>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Baseline:</div>
            <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {baselinePercent}%
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Required:</div>
            <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-info)', marginTop: '2px' }}>
              {thresholdPercent}%
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          <TrendingUp size={18} color={passed ? 'var(--color-success)' : 'var(--color-warning)'} />
          <span>
            Net Access Change:{' '}
            <strong className="font-mono" style={{ color: delta >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontSize: '1.05rem' }}>
              {delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
