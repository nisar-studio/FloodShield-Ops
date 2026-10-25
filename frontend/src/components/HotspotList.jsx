import React from 'react';
import { Flame, Waves } from 'lucide-react';
import { Badge } from './ui/Badge';

export function HotspotList({
  hotspots = [],
  selectedHotspotId = null,
  onSelectHotspot = () => {},
}) {
  if (!hotspots || hotspots.length === 0) {
    return (
      <div className="ops-card">
        <div className="ops-card-header">
          <div className="ops-card-title">
            <Flame size={18} color="var(--color-danger)" />
            <span>Flood Risk Hotspots</span>
          </div>
          <Badge variant="neutral">0 Detected</Badge>
        </div>
        <div className="ops-card-body" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <Waves size={32} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto' }} />
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            No critical flood hotspots flagged for this precipitation profile.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ops-card">
      <div className="ops-card-header">
        <div className="ops-card-title">
          <Flame size={20} color="var(--color-danger)" />
          <span>Vulnerable Flood Hotspots</span>
        </div>
        <Badge variant="danger">{hotspots.length} Active</Badge>
      </div>

      <div className="ops-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {hotspots.map((hs) => {
          const isSelected = selectedHotspotId === hs.id;
          const score = hs.riskScore || 0;
          const scorePercent = Math.round(score * 100);

          let riskVariant = 'danger';
          if (score < 0.7) riskVariant = 'warning';
          if (score < 0.4) riskVariant = 'info';

          return (
            <div
              key={hs.id}
              onClick={() => onSelectHotspot(hs.id)}
              style={{
                background: isSelected ? 'var(--color-danger-bg)' : 'var(--bg-surface-elevated)',
                border: `1px solid ${
                  isSelected ? 'var(--color-danger-border)' : 'var(--border-subtle)'
                }`,
                borderRadius: '8px',
                padding: '1.1rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                    {hs.name}
                  </div>
                  <div className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {hs.id} &bull; ({hs.lat?.toFixed(4)}, {hs.lng?.toFixed(4)})
                  </div>
                </div>

                <Badge variant={riskVariant}>
                  Risk {scorePercent}%
                </Badge>
              </div>

              {/* Progress Line */}
              <div
                style={{
                  height: '5px',
                  width: '100%',
                  background: 'var(--bg-surface)',
                  borderRadius: '3px',
                  marginTop: '0.75rem',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${scorePercent}%`,
                    background: score >= 0.8 ? 'var(--color-danger)' : score >= 0.6 ? 'var(--color-warning)' : 'var(--color-info)',
                    borderRadius: '3px',
                  }}
                />
              </div>

              {/* Reasons */}
              {Array.isArray(hs.reasons) && hs.reasons.length > 0 && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '4px' }}>
                    {hs.reasons.map((reason, rIdx) => (
                      <span
                        key={rIdx}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontSize: '0.85rem',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Flooded Edges */}
              {Array.isArray(hs.floodedEdgeIds) && hs.floodedEdgeIds.length > 0 && (
                <div style={{ marginTop: '0.65rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span className="font-mono">Flooded Edges: {hs.floodedEdgeIds.join(', ')}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
