import React from 'react';
import { Building2, Cross, Home, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from './ui/Badge';

export function FacilityReachabilityList({ facilities = [], simulation = null }) {
  const perFacMap = (simulation?.perFacility || []).reduce((acc, pf) => {
    acc[pf.facilityId] = pf;
    return acc;
  }, {});

  return (
    <div className="ops-card">
      <div className="ops-card-header">
        <div className="ops-card-title">
          <Building2 size={20} color="var(--color-info)" />
          <span>Critical Facility Network (T = 30 min)</span>
        </div>
        <Badge variant="neutral">{facilities.length} Assets</Badge>
      </div>

      <div className="ops-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {facilities.map((fac) => {
          const sim = perFacMap[fac.id];
          const isHospital = fac.type === 'hospital';

          return (
            <div
              key={fac.id}
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  {isHospital ? (
                    <Cross size={18} color="var(--color-info)" />
                  ) : (
                    <Home size={18} color="var(--color-success)" />
                  )}
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                    {fac.name}
                  </span>
                </div>
                <Badge variant={isHospital ? 'info' : 'success'}>
                  {fac.type}
                </Badge>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                  {fac.id} &bull; Node {fac.nodeId}
                </span>

                {sim ? (
                  <div>
                    {sim.reachableAfter ? (
                      <span style={{ color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem' }}>
                        <CheckCircle size={16} />
                        {sim.minutesAfter !== null ? `${sim.minutesAfter} min` : 'Reachable'}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem' }}>
                        <XCircle size={16} /> Cut Off
                      </span>
                    )}
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>Pending simulation</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
