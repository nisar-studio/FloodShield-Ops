import React, { useState } from 'react';
import { 
  History, 
  ChevronDown, 
  ChevronRight, 
  Terminal, 
  UserCheck, 
  CheckCircle, 
  Flame, 
  Brain, 
  Radar 
} from 'lucide-react';
import { Badge } from './ui/Badge';

const ACTOR_META = {
  sentinel: { label: 'Sentinel Telemetry', variant: 'info', icon: Radar },
  risk: { label: 'Risk Engine', variant: 'danger', icon: Flame },
  planner: { label: 'Gemini Planner', variant: 'ai', icon: Brain },
  verifier: { label: 'Reachability Verifier', variant: 'success', icon: CheckCircle },
  comms: { label: 'Advisory Comms', variant: 'warning', icon: Terminal },
  operator: { label: 'Control Room Operator', variant: 'warning', icon: UserCheck },
};

export function AuditTimeline({ auditEntries = [] }) {
  const [expandedIndices, setExpandedIndices] = useState({});

  const toggleExpand = (idx) => {
    setExpandedIndices((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  if (!auditEntries || auditEntries.length === 0) {
    return (
      <div className="ops-card">
        <div className="ops-card-header">
          <div className="ops-card-title">
            <History size={16} color="#38bdf8" />
            <span>Immutable Audit Trail</span>
          </div>
          <Badge variant="neutral">0 EVENTS</Badge>
        </div>
        <div className="ops-card-body" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
            No audit records registered for current operational run.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ops-card">
      <div className="ops-card-header">
        <div className="ops-card-title">
          <History size={16} color="#38bdf8" />
          <span>Operational Audit Trail</span>
        </div>
        <Badge variant="neutral">{auditEntries.length} LOGGED EVENTS</Badge>
      </div>

      <div className="ops-card-body" style={{ padding: '0.75rem', maxHeight: '360px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {auditEntries.map((entry, idx) => {
            const actorInfo = ACTOR_META[entry.actor] || {
              label: entry.actor || 'System',
              variant: 'neutral',
              icon: Terminal,
            };
            const Icon = actorInfo.icon;
            const isExpanded = !!expandedIndices[idx];
            const hasPayload = entry.payload && Object.keys(entry.payload).length > 0;

            // Format timestamp cleanly
            let timeStr = entry.ts || '';
            try {
              if (entry.ts) {
                const date = new Date(entry.ts);
                timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              }
            } catch (err) {
              timeStr = entry.ts;
            }

            return (
              <div
                key={idx}
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '5px',
                  padding: '0.6rem 0.75rem',
                  fontSize: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Icon size={13} color="#94a3b8" />
                    <Badge variant={actorInfo.variant} style={{ fontSize: '0.62rem' }}>
                      {actorInfo.label}
                    </Badge>
                    <span className="font-mono" style={{ fontWeight: 700, color: '#f8fafc' }}>
                      {entry.event}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="font-mono" style={{ color: '#64748b', fontSize: '0.68rem' }}>
                      {timeStr}
                    </span>
                    {hasPayload && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Payload */}
                {hasPayload && isExpanded && (
                  <pre
                    className="font-mono"
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '4px',
                      fontSize: '0.68rem',
                      color: '#a7f3d0',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {JSON.stringify(entry.payload, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
