import React from 'react';
import { AlertCircle, Flame, MapPin, ChevronRight, Waves } from 'lucide-react';
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
            <Flame size={16} color="#ef4444" />
            <span>Flood Risk Hotspots</span>
          </div>
          <Badge variant="neutral">0 DETECTED</Badge>
        </div>
        <div className="ops-card-body" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <Waves size={28} color="#64748b" style={{ margin: '0 auto 0.75rem auto' }} />
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            No critical flood hotspots identified for current precipitation threshold.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ops-card">
      <div className="ops-card-header">
        <div className="ops-card-title">
          <Flame size={16} color="#ef4444" />
          <span>Vulnerable Hotspots & Risk Drivers</span>
        </div>
        <Badge variant="danger">{hotspots.length} ACTIVE</Badge>
      </div>

      <div className="ops-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
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
                background: isSelected ? 'rgba(239, 68, 68, 0.12)' : 'rgba(15, 23, 42, 0.65)',
                border: `1px solid ${
                  isSelected ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.08)'
                }`,
                borderRadius: '6px',
                padding: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.825rem' }}>
                      {hs.name}
                    </span>
                  </div>
                  <span className="font-mono" style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                    {hs.id} &bull; ({hs.lat?.toFixed(4)}, {hs.lng?.toFixed(4)})
                  </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <Badge variant={riskVariant}>
                    RISK {scorePercent}%
                  </Badge>
                </div>
              </div>

              {/* Risk Score Meter */}
              <div
                style={{
                  height: '4px',
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '2px',
                  marginTop: '0.4rem',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${scorePercent}%`,
                    background: score >= 0.8 ? '#ef4444' : score >= 0.6 ? '#f59e0b' : '#38bdf8',
                    borderRadius: '2px',
                  }}
                />
              </div>

              {/* Reasons */}
              {Array.isArray(hs.reasons) && hs.reasons.length > 0 && (
                <div style={{ marginTop: '0.45rem', fontSize: '0.72rem', color: '#cbd5e1' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>
                    Contributing Factors:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '2px' }}>
                    {hs.reasons.map((reason, rIdx) => (
                      <span
                        key={rIdx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '3px',
                          padding: '1px 5px',
                          fontSize: '0.68rem',
                          color: '#e2e8f0',
                        }}
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Affected Edges */}
              {Array.isArray(hs.floodedEdgeIds) && hs.floodedEdgeIds.length > 0 && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.68rem', color: '#64748b' }}>
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
