import React from 'react';
import { 
  Radar, 
  Search, 
  Brain, 
  CheckCircle2, 
  RefreshCcw, 
  UserCheck, 
  Terminal,
  AlertOctagon,
  Clock,
  Lock
} from 'lucide-react';
import { Badge } from './ui/Badge';

const WORKFLOW_STEPS = [
  { id: 'SENSE', label: '1. SENSE', desc: 'Rainfall & Hydrology Telemetry', icon: Radar },
  { id: 'ASSESS', label: '2. ASSESS', desc: 'Flood Hotspot Scoring', icon: Search },
  { id: 'PLAN', label: '3. PLAN', desc: 'AI Planner Candidate Proposal', icon: Brain },
  { id: 'VERIFY', label: '4. VERIFY', desc: 'Deterministic Graph Reachability', icon: CheckCircle2 },
  { id: 'REPLAN', label: '5. REPLAN', desc: 'Loop if Verification Fails (Max 3)', icon: RefreshCcw },
  { id: 'APPROVE', label: '6. APPROVE', desc: 'Human-in-the-Loop Operator Gate', icon: UserCheck },
  { id: 'SANDBOX', label: '7. SANDBOX', desc: 'Non-Destructive Action Dispatch', icon: Terminal },
];

export function WorkflowTracker({ steps = [], currentIteration = 1, planStatus = '' }) {
  // Map steps array by name for fast lookup
  const stepMap = (steps || []).reduce((acc, step) => {
    acc[step.name?.toUpperCase()] = step;
    return acc;
  }, {});

  return (
    <div className="ops-card" style={{ marginBottom: '1.25rem' }}>
      <div className="ops-card-header">
        <div className="ops-card-title">
          <Clock size={16} color="#38bdf8" />
          <span>Operational Lifecycle Pipeline</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Planner Iteration:</span>
          <Badge variant={currentIteration > 1 ? 'warning' : 'ai'}>
            Iteration {currentIteration} of 3 max
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

      <div className="ops-card-body" style={{ padding: '0.85rem 1rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.5rem',
          }}
        >
          {WORKFLOW_STEPS.map((wfStep, idx) => {
            const stepData = stepMap[wfStep.id];
            const rawStatus = stepData?.status || 'not_started';
            const Icon = wfStep.icon;

            // Determine display styling based on actual step status
            let statusBadge = { label: 'NOT STARTED', variant: 'neutral' };
            let borderColor = 'rgba(255, 255, 255, 0.08)';
            let bgOpacity = 'rgba(15, 23, 42, 0.5)';
            let iconColor = '#64748b';

            if (rawStatus === 'passed' || rawStatus === 'completed' || rawStatus === 'approved' || rawStatus === 'executed') {
              statusBadge = { label: 'PASSED', variant: 'success' };
              borderColor = 'rgba(16, 185, 129, 0.4)';
              bgOpacity = 'rgba(16, 185, 129, 0.08)';
              iconColor = '#10b981';
            } else if (rawStatus === 'failed' || rawStatus === 'rejected') {
              statusBadge = { label: 'FAILED', variant: 'danger' };
              borderColor = 'rgba(239, 68, 68, 0.4)';
              bgOpacity = 'rgba(239, 68, 68, 0.08)';
              iconColor = '#ef4444';
            } else if (rawStatus === 'waiting_approval') {
              statusBadge = { label: 'GATE WAITING', variant: 'warning' };
              borderColor = 'rgba(245, 158, 11, 0.4)';
              bgOpacity = 'rgba(245, 158, 11, 0.08)';
              iconColor = '#f59e0b';
            } else if (rawStatus === 'in_progress' || rawStatus === 'running') {
              statusBadge = { label: 'ACTIVE', variant: 'info' };
              borderColor = 'rgba(6, 182, 212, 0.5)';
              bgOpacity = 'rgba(6, 182, 212, 0.1)';
              iconColor = '#06b6d4';
            } else if (rawStatus === 'disabled') {
              statusBadge = { label: 'BLOCKED', variant: 'neutral' };
              borderColor = 'rgba(255, 255, 255, 0.05)';
              iconColor = '#475569';
            }

            return (
              <div
                key={wfStep.id}
                style={{
                  background: bgOpacity,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '6px',
                  padding: '0.65rem 0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Icon size={16} color={iconColor} />
                  <Badge variant={statusBadge.variant} style={{ fontSize: '0.62rem' }}>
                    {statusBadge.label}
                  </Badge>
                </div>

                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                  {wfStep.label}
                </div>

                <div
                  style={{
                    fontSize: '0.68rem',
                    color: '#94a3b8',
                    lineHeight: '1.25',
                    minHeight: '2.5em',
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
