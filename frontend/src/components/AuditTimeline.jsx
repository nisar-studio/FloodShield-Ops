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
  sentinel: { label: 'Sentinel', variant: 'info', icon: Radar },
  risk: { label: 'Risk Engine', variant: 'danger', icon: Flame },
  planner: { label: 'Gemini Planner', variant: 'ai', icon: Brain },
  verifier: { label: 'Graph Verifier', variant: 'success', icon: CheckCircle },
  comms: { label: 'Advisory', variant: 'warning', icon: Terminal },
  operator: { label: 'Operator', variant: 'warning', icon: UserCheck },
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
            <History size={20} color="var(--color-info)" />
            <span>Immutable Audit Trail</span>
          </div>
          <Badge variant="neutral">0 Events</Badge>
        </div>
        <div className="ops-card-body" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
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
          <History size={20} color="var(--color-info)" />
          <span>Operational Audit Trail</span>
        </div>
        <Badge variant="neutral">{auditEntries.length} Recorded Events</Badge>
      </div>

      <div className="ops-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '480px', overflowY: 'auto' }}>
        {auditEntries.map((entry, idx) => {
          const actorInfo = ACTOR_META[entry.actor] || {
            label: entry.actor || 'System',
            variant: 'neutral',
            icon: Terminal,
          };
          const Icon = actorInfo.icon;
          const isExpanded = !!expandedIndices[idx];
          const hasPayload = entry.payload && Object.keys(entry.payload).length > 0;

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
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '0.85rem 1.25rem',
                fontSize: '0.95rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Icon size={16} color="var(--text-muted)" />
                  <Badge variant={actorInfo.variant}>
                    {actorInfo.label}
                  </Badge>
                  <span className="font-mono" style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                    {entry.event}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {timeStr}
                  </span>
                  {hasPayload && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                  )}
                </div>
              </div>

              {hasPayload && isExpanded && (
                <pre
                  className="font-mono"
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
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
  );
}
