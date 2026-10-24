import React from 'react';
import { Building2, Cross, Home, CheckCircle, XCircle, Clock } from 'lucide-react';
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
          <Building2 size={16} color="#38bdf8" />
          <span>Critical Facility Access (T = 30 min)</span>
        </div>
        <Badge variant="neutral">{facilities.length} ASSETS</Badge>
      </div>

      <div className="ops-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {facilities.map((fac) => {
          const sim = perFacMap[fac.id];
          const isHospital = fac.type === 'hospital';
          const isReachable = sim ? sim.reachableAfter : null;

          return (
            <div
              key={fac.id}
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                padding: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {isHospital ? (
                    <Cross size={14} color="#38bdf8" />
                  ) : (
                    <Home size={14} color="#10b981" />
                  )}
                  <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.8rem' }}>
                    {fac.name}
                  </span>
                </div>
                <Badge variant={isHospital ? 'info' : 'success'}>
                  {fac.type}
                </Badge>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span className="font-mono" style={{ color: '#64748b' }}>
                  {fac.id} &bull; Node: {fac.nodeId}
                </span>

                {sim ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {sim.reachableAfter ? (
                      <span style={{ color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <CheckCircle size={12} />
                        {sim.minutesAfter !== null ? `${sim.minutesAfter} min` : 'Reachable'}
                      </span>
                    ) : (
                      <span style={{ color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <XCircle size={12} /> Unreachable
                      </span>
                    )}
                  </div>
                ) : (
                  <span style={{ color: '#64748b' }}>Pending simulation</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
