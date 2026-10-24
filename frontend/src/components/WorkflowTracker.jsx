import React from 'react';
import { 
  Radar, 
  Search, 
  Brain, 
  CheckCircle2, 
  RefreshCcw, 
  UserCheck, 
  Terminal,
  Clock
} from 'lucide-react';
import { Badge } from './ui/Badge';

const WORKFLOW_STEPS = [
  { id: 'SENSE', label: '1. Sense', desc: 'Rainfall & telemetry ingestion', icon: Radar },
  { id: 'ASSESS', label: '2. Assess', desc: 'Flood hotspot risk scoring', icon: Search },
  { id: 'PLAN', label: '3. Plan', desc: 'AI candidate mitigation proposal', icon: Brain },
  { id: 'VERIFY', label: '4. Verify', desc: 'Deterministic graph simulation', icon: CheckCircle2 },
  { id: 'REPLAN', label: '5. Replan', desc: 'Revision loop if below threshold', icon: RefreshCcw },
  { id: 'APPROVE', label: '6. Approve', desc: 'Human operator safety authorization', icon: UserCheck },
  { id: 'SANDBOX', label: '7. Sandbox', desc: 'Non-destructive simulation execution', icon: Terminal },
];

export function WorkflowTracker({ steps = [], currentIteration = 1, planStatus = '' }) {
  const stepMap = (steps || []).reduce((acc, step) => {
    acc[step.name?.toUpperCase()] = step;
    return acc;
  }, {});

  return (
    <div className="ops-card">
      <div className="ops-card-header">
        <div className="ops-card-title">
          <Clock size={18} color="var(--color-info)" />
          <span>Operational Lifecycle Pipeline</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Planner Iteration:</span>
          <Badge variant={currentIteration > 1 ? 'warning' : 'ai'}>
            Iteration {currentIteration} of 3
          </Badge>
          {planStatus && (
            <Badge
              variant={
                planStatus === 'verified'
                  ? 'success'
                  : planStatus === 'rejected'
                  ? 'danger'
                  : planStatus === 'approved' || planStatus === 'executed_sandbox'
                  ? 'info'
                  : 'neutral'
              }
            >
              Plan: {planStatus}
            </Badge>
          )}
        </div>
      </div>

      <div className="ops-card-body">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {WORKFLOW_STEPS.map((wfStep) => {
            const stepData = stepMap[wfStep.id];
            const rawStatus = stepData?.status || 'not_started';
            const Icon = wfStep.icon;

            let statusBadge = { label: 'Not Started', variant: 'neutral' };
            let borderColor = 'var(--border-subtle)';
            let iconColor = 'var(--text-muted)';

            if (rawStatus === 'passed' || rawStatus === 'completed' || rawStatus === 'approved' || rawStatus === 'executed') {
              statusBadge = { label: 'Passed', variant: 'success' };
              borderColor = 'var(--color-success-border)';
              iconColor = 'var(--color-success)';
            } else if (rawStatus === 'failed' || rawStatus === 'rejected') {
              statusBadge = { label: 'Failed', variant: 'danger' };
              borderColor = 'var(--color-danger-border)';
              iconColor = 'var(--color-danger)';
            } else if (rawStatus === 'waiting_approval') {
              statusBadge = { label: 'Awaiting Sign-off', variant: 'warning' };
              borderColor = 'var(--color-warning-border)';
              iconColor = 'var(--color-warning)';
            } else if (rawStatus === 'in_progress' || rawStatus === 'running') {
              statusBadge = { label: 'In Progress', variant: 'info' };
              borderColor = 'var(--color-info-border)';
              iconColor = 'var(--color-info)';
            } else if (rawStatus === 'disabled') {
              statusBadge = { label: 'Blocked', variant: 'neutral' };
            }

            return (
              <div
                key={wfStep.id}
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Icon size={18} color={iconColor} />
                  <Badge variant={statusBadge.variant}>
                    {statusBadge.label}
                  </Badge>
                </div>

                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {wfStep.label}
                </div>

                <div
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.4',
                  }}
                >
                  {stepData?.detail || wfStep.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
