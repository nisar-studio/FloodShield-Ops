import React from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Clock, 
  HelpCircle,
  AlertTriangle,
  Flame
} from 'lucide-react';
import { Badge } from './ui/Badge';

export function ScoreComparison({ simulation, planStatus, iteration = 1 }) {
  if (!simulation) {
    return (
      <div className="ops-card">
        <div className="ops-card-header">
          <div className="ops-card-title">
            <ShieldCheck size={16} color="#64748b" />
            <span>Deterministic Reachability Verification</span>
          </div>
          <Badge variant="neutral">NOT YET CALCULATED</Badge>
        </div>
        <div className="ops-card-body" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <Clock size={28} color="#64748b" style={{ margin: '0 auto 0.75rem auto' }} />
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Awaiting deterministic graph simulation from Python simulator.
          </div>
          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            Run the pipeline to calculate baseline and plan reachability.
          </div>
        </div>
      </div>
    );
  }

  const {
    baselineScore,
    planScore,
    threshold,
    passed,
    perFacility = [],
    floodedEdgeIds = [],
    rejectionReason,
  } = simulation;

  const baselinePercent = typeof baselineScore === 'number' ? (baselineScore * 100).toFixed(1) : 'N/A';
  const planPercent = typeof planScore === 'number' ? (planScore * 100).toFixed(1) : 'N/A';
  const thresholdPercent = typeof threshold === 'number' ? (threshold * 100).toFixed(1) : 'N/A';

  const delta =
    typeof planScore === 'number' && typeof baselineScore === 'number'
      ? ((planScore - baselineScore) * 100).toFixed(1)
      : null;

  return (
    <div className="ops-card">
      <div className="ops-card-header">
        <div className="ops-card-title">
          {passed ? (
            <ShieldCheck size={16} color="#10b981" />
          ) : (
            <ShieldAlert size={16} color="#ef4444" />
          )}
          <span>Deterministic Reachability Verification</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Badge variant={passed ? 'success' : 'danger'}>
            {passed ? 'SIMULATION PASSED' : 'VERIFICATION FAILED'}
          </Badge>
          <Badge variant="neutral">Iteration {iteration}</Badge>
        </div>
      </div>

      <div className="ops-card-body">
        {/* Core Formula and Simulator Definition Reminder */}
        <div
          style={{
            fontSize: '0.72rem',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '0.4rem 0.6rem',
            borderRadius: '4px',
            color: '#94a3b8',
            marginBottom: '1rem',
          }}
        >
          <strong style={{ color: '#cbd5e1' }}>Contract Definition:</strong> Reachability = (facilities reachable within T=30m from fixed dispatch origin) / (total facilities). Evaluated on deterministic OSM graph.
        </div>

        {/* Score Comparison Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          {/* Baseline Score */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '6px',
              padding: '0.75rem',
            }}
          >
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>
              Baseline (No Actions)
            </div>
            <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
              {baselinePercent}%
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
              Flooded edges cut access
            </div>
          </div>

          {/* Proposed Plan Score */}
          <div
            style={{
              background: passed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${passed ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
              borderRadius: '6px',
              padding: '0.75rem',
            }}
          >
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: passed ? '#34d399' : '#f87171', fontWeight: 700 }}>
              With Proposed Plan
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: passed ? '#10b981' : '#ef4444',
                marginTop: '2px',
              }}
            >
              {planPercent}%
            </div>
            <div style={{ fontSize: '0.68rem', color: passed ? '#6ee7b7' : '#fca5a5', marginTop: '2px' }}>
              {delta !== null ? `${delta >= 0 ? '+' : ''}${delta}% net improvement` : 'Calculated'}
            </div>
          </div>

          {/* Safety Threshold */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '6px',
              padding: '0.75rem',
            }}
          >
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>
              Required Safety Threshold
            </div>
            <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
              {thresholdPercent}%
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
              {passed ? 'Threshold satisfied' : 'Threshold NOT met'}
            </div>
          </div>
        </div>

        {/* Verification Failure / Rejection Notice */}
        {!passed && (
          <div
            style={{
              padding: '0.75rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '6px',
              color: '#fca5a5',
              fontSize: '0.78rem',
              marginBottom: '1rem',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#f87171' }}>VERIFICATION FAILED BY DETERMINISTIC SIMULATOR:</strong>
              <div style={{ marginTop: '3px', color: '#fecaca', lineHeight: '1.4' }}>
                {rejectionReason ||
                  `The proposed plan achieved a reachability score of ${planPercent}%, failing to meet the strict ${thresholdPercent}% safety threshold required for pre-flood operations.`}
              </div>
              <div style={{ marginTop: '4px', fontSize: '0.72rem', color: '#f87171' }}>
                &bull; Candidate plan rejected. Operator approval is strictly disabled.
                <br />
                &bull; Replan loop invoked: feedback dispatched to AI planner for revision.
              </div>
            </div>
          </div>
        )}

        {/* Per-Facility Reachability Table */}
        {perFacility.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '0.5rem',
              }}
            >
              Facility-by-Facility Reachability (T = 30 min)
            </div>

            <div
              style={{
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: '#94a3b8' }}>Facility</th>
                    <th style={{ textAlign: 'center', padding: '0.5rem', color: '#94a3b8' }}>Baseline</th>
                    <th style={{ textAlign: 'center', padding: '0.5rem', color: '#94a3b8' }}>With Plan</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', color: '#94a3b8' }}>Transit Time</th>
                  </tr>
                </thead>
                <tbody>
                  {perFacility.map((fac, idx) => {
                    const becameReachable = !fac.reachableBefore && fac.reachableAfter;
                    const stillUnreachable = !fac.reachableBefore && !fac.reachableAfter;

                    return (
                      <tr
                        key={fac.facilityId || idx}
                        style={{
                          borderBottom:
                            idx < perFacility.length - 1
                              ? '1px solid rgba(255,255,255,0.04)'
                              : 'none',
                          background: becameReachable
                            ? 'rgba(16, 185, 129, 0.04)'
                            : stillUnreachable
                            ? 'rgba(239, 68, 68, 0.03)'
                            : 'transparent',
                        }}
                      >
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                            {fac.name || fac.facilityId}
                          </div>
                          <div className="font-mono" style={{ fontSize: '0.65rem', color: '#64748b' }}>
                            {fac.facilityId}
                          </div>
                        </td>

                        <td style={{ textAlign: 'center', padding: '0.5rem' }}>
                          {fac.reachableBefore ? (
                            <span style={{ color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              <CheckCircle size={12} /> Yes
                            </span>
                          ) : (
                            <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              <XCircle size={12} /> Cut Off
                            </span>
                          )}
                        </td>

                        <td style={{ textAlign: 'center', padding: '0.5rem' }}>
                          {fac.reachableAfter ? (
                            <span style={{ color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              <CheckCircle size={12} /> Reachable
                            </span>
                          ) : (
                            <span style={{ color: '#ef4444', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              <XCircle size={12} /> Unreachable
                            </span>
                          )}
                        </td>

                        <td style={{ textAlign: 'right', padding: '0.5rem 0.75rem' }} className="font-mono">
                          {fac.reachableAfter && fac.minutesAfter !== null ? (
                            <span style={{ color: '#38bdf8' }}>
                              {fac.minutesAfter} min
                              {fac.minutesBefore !== null && fac.minutesBefore !== fac.minutesAfter && (
                                <span style={{ color: '#94a3b8', fontSize: '0.65rem', marginLeft: '4px' }}>
                                  ({fac.minutesBefore}m)
                                </span>
                              )}
                            </span>
                          ) : (
                            <span style={{ color: '#64748b' }}>&infin; (No Path)</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Flooded Edges Excluded List */}
        {floodedEdgeIds.length > 0 && (
          <div style={{ marginTop: '0.85rem' }}>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
              Simulator Inundated Network Edges Excluded ({floodedEdgeIds.length}):
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: '0.68rem',
                color: '#64748b',
                marginTop: '3px',
                wordBreak: 'break-all',
              }}
            >
              {floodedEdgeIds.join(' &bull; ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
