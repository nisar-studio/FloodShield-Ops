import React from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';
import { Badge } from './ui/Badge';

export function ScoreComparison({ simulation, planStatus, iteration = 1 }) {
  if (!simulation) {
    return (
      <div className="ops-card">
        <div className="ops-card-header">
          <div className="ops-card-title">
            <Clock size={18} color="var(--text-muted)" />
            <span>Deterministic Reachability Verification</span>
          </div>
          <Badge variant="neutral">Not Yet Calculated</Badge>
        </div>
        <div className="ops-card-body" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <Clock size={36} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto' }} />
          <div style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', fontWeight: 600 }}>
            Awaiting deterministic graph calculation from Python simulator.
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Trigger a run to evaluate baseline and proposed-plan reachability.
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
            <ShieldCheck size={20} color="var(--color-success)" />
          ) : (
            <ShieldAlert size={20} color="var(--color-danger)" />
          )}
          <span>Deterministic Reachability Verification</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Badge variant={passed ? 'success' : 'danger'}>
            {passed ? 'Simulation Passed' : 'Verification Failed'}
          </Badge>
          <Badge variant="neutral">Iteration {iteration}</Badge>
        </div>
      </div>

      <div className="ops-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Definition Reminder */}
        <div
          style={{
            fontSize: '0.9rem',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            color: 'var(--text-secondary)',
          }}
        >
          <strong style={{ color: 'var(--text-primary)' }}>Shared Formula:</strong> Reachability = (facilities reachable within T = 30 minutes from fixed dispatch origin) / (total facilities).
        </div>

        {/* Big Score Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '1.25rem',
            }}
          >
            <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Baseline Reachability
            </div>
            <div className="font-mono" style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {baselinePercent}%
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              No interventions applied
            </div>
          </div>

          <div
            style={{
              background: passed ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
              border: `1px solid ${passed ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
              borderRadius: '8px',
              padding: '1.25rem',
            }}
          >
            <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: passed ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
              With Proposed Plan
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: '2.4rem',
                fontWeight: 800,
                color: passed ? 'var(--color-success)' : 'var(--color-danger)',
                marginTop: '4px',
              }}
            >
              {planPercent}%
            </div>
            <div style={{ fontSize: '0.85rem', color: passed ? 'var(--color-success)' : 'var(--color-danger)', marginTop: '4px' }}>
              {delta !== null ? `${delta >= 0 ? '+' : ''}${delta}% net improvement` : 'Simulated'}
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '1.25rem',
            }}
          >
            <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Target Safety Threshold
            </div>
            <div className="font-mono" style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--color-info)', marginTop: '4px' }}>
              {thresholdPercent}%
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {passed ? 'Threshold satisfied' : 'Threshold NOT met'}
            </div>
          </div>
        </div>

        {/* Verification Failure Warning */}
        {!passed && (
          <div
            style={{
              padding: '1.25rem',
              background: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              borderRadius: '8px',
              color: 'var(--color-danger)',
              fontSize: '0.95rem',
              display: 'flex',
              gap: '0.85rem',
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangle size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ fontSize: '1rem' }}>VERIFICATION FAILED BY DETERMINISTIC SIMULATOR:</strong>
              <div style={{ marginTop: '4px', lineHeight: '1.5' }}>
                {rejectionReason ||
                  `The proposed plan achieved reachability of ${planPercent}%, failing to meet the required safety threshold of ${thresholdPercent}%. Critical hospital corridors remain impassable.`}
              </div>
              <div style={{ marginTop: '6px', fontSize: '0.9rem' }}>
                &bull; Approval gate locked. Candidate plan cannot be dispatched.
                <br />
                &bull; Replan loop invoked: feedback sent back to AI planner.
              </div>
            </div>
          </div>
        )}

        {/* Facility Table */}
        {perFacility.length > 0 && (
          <div>
            <div
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.75rem',
              }}
            >
              Facility Transit & Connectivity Breakdown
            </div>

            <div
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Facility</th>
                    <th style={{ textAlign: 'center', padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Baseline Access</th>
                    <th style={{ textAlign: 'center', padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>With Plan</th>
                    <th style={{ textAlign: 'right', padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Transit Time</th>
                  </tr>
                </thead>
                <tbody>
                  {perFacility.map((fac, idx) => (
                    <tr
                      key={fac.facilityId || idx}
                      style={{
                        borderBottom:
                          idx < perFacility.length - 1
                            ? '1px solid var(--border-subtle)'
                            : 'none',
                      }}
                    >
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {fac.name || fac.facilityId}
                        </div>
                        <div className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {fac.facilityId}
                        </div>
                      </td>

                      <td style={{ textAlign: 'center', padding: '0.85rem 1rem' }}>
                        {fac.reachableBefore ? (
                          <span style={{ color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                            <CheckCircle size={16} /> Yes
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-danger)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                            <XCircle size={16} /> Severed
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'center', padding: '0.85rem 1rem' }}>
                        {fac.reachableAfter ? (
                          <span style={{ color: 'var(--color-success)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={16} /> Reachable
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-danger)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <XCircle size={16} /> Unreachable
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'right', padding: '0.85rem 1rem' }} className="font-mono">
                        {fac.reachableAfter && fac.minutesAfter !== null ? (
                          <span style={{ color: 'var(--color-info)', fontWeight: 600 }}>
                            {fac.minutesAfter} min
                            {fac.minutesBefore !== null && fac.minutesBefore !== fac.minutesAfter && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: '6px' }}>
                                (was {fac.minutesBefore}m)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>&infin; (Cut Off)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Excluded Flooded Edges */}
        {floodedEdgeIds.length > 0 && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong>Inundated network edges excluded by simulator:</strong>
            <div className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {floodedEdgeIds.join(' &bull; ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
