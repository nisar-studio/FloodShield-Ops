import React from 'react';
import { 
  BrainCircuit, 
  Ban, 
  ArrowRightLeft, 
  Droplet, 
  Ambulance, 
  ShieldCheck, 
  AlertCircle,
  Sparkles,
  Link2
} from 'lucide-react';
import { Badge } from './ui/Badge';

const ACTION_TYPE_META = {
  road_closure: { label: 'Road Closure', icon: Ban, color: '#ef4444', badge: 'danger' },
  diversion: { label: 'Route Diversion', icon: ArrowRightLeft, color: '#f59e0b', badge: 'warning' },
  pump_prepositioning: { label: 'Pump Deployment', icon: Droplet, color: '#06b6d4', badge: 'info' },
  ambulance_staging: { label: 'Ambulance Staging', icon: Ambulance, color: '#10b981', badge: 'success' },
};

export function PlanActions({ plan, isApproved = false }) {
  if (!plan || !plan.actions || plan.actions.length === 0) {
    return (
      <div className="ops-card">
        <div className="ops-card-header">
          <div className="ops-card-title">
            <BrainCircuit size={16} color="#8b5cf6" />
            <span>AI Planner Mitigating Actions</span>
          </div>
          <Badge variant="neutral">NO PLAN GENERATED</Badge>
        </div>
        <div className="ops-card-body" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <AlertCircle size={28} color="#64748b" style={{ margin: '0 auto 0.75rem auto' }} />
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            No candidate mitigation actions available.
          </div>
          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            Trigger a run to prompt the Gemini planner.
          </div>
        </div>
      </div>
    );
  }

  const { planId, iteration = 1, status = 'proposed', actions = [] } = plan;

  return (
    <div className="ops-card">
      <div className="ops-card-header">
        <div className="ops-card-title">
          <BrainCircuit size={16} color="#8b5cf6" />
          <span>AI Planner Proposed Actions</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Badge variant={isApproved ? 'success' : 'ai'}>
            {isApproved ? 'OPERATOR APPROVED' : `PROPOSED (ITERATION ${iteration})`}
          </Badge>
          <span className="font-mono" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
            {planId}
          </span>
        </div>
      </div>

      <div className="ops-card-body">
        {/* Prominent Disclaimer */}
        <div
          style={{
            padding: '0.5rem 0.75rem',
            background: 'rgba(139, 92, 246, 0.08)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            borderRadius: '4px',
            fontSize: '0.72rem',
            color: '#c4b5fd',
            marginBottom: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Sparkles size={14} color="#a78bfa" style={{ flexShrink: 0 }} />
          <span>
            <strong>AI-Generated Candidate Mitigations:</strong> Proposed by LLM orchestrator. Cannot be executed without passing deterministic simulation verification and receiving explicit human operator sign-off.
          </span>
        </div>

        {/* Action List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {actions.map((act, index) => {
            const meta = ACTION_TYPE_META[act.type] || {
              label: act.type || 'Action',
              icon: AlertCircle,
              color: '#94a3b8',
              badge: 'neutral',
            };
            const Icon = meta.icon;

            return (
              <div
                key={act.actionId || index}
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  padding: '0.75rem',
                }}
              >
                {/* Action Card Top Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        padding: '4px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Icon size={14} color={meta.color} />
                    </div>
                    <Badge variant={meta.badge}>
                      {meta.label}
                    </Badge>
                    <span className="font-mono" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      {act.actionId}
                    </span>
                  </div>

                  {typeof act.confidence === 'number' && (
                    <div style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>
                      Confidence: <strong className="font-mono" style={{ color: '#38bdf8' }}>{(act.confidence * 100).toFixed(0)}%</strong>
                    </div>
                  )}
                </div>

                {/* Target */}
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.3rem' }}>
                  Target: {act.target?.label || (Array.isArray(act.target?.edgeIds) ? act.target.edgeIds.join(', ') : 'Unspecified target')}
                </div>

                {/* Rationale */}
                <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: '1.4', marginBottom: '0.4rem' }}>
                  <span style={{ color: '#94a3b8' }}>Rationale: </span>
                  {act.rationale}
                </div>

                {/* Evidence & Edge IDs */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '0.4rem',
                    paddingTop: '0.4rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Link2 size={11} /> Evidence:
                  </span>
                  {(act.evidence || []).map((ev, evIdx) => (
                    <span
                      key={evIdx}
                      className="font-mono"
                      style={{
                        fontSize: '0.65rem',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        color: '#94a3b8',
                      }}
                    >
                      {ev}
                    </span>
                  ))}

                  {Array.isArray(act.target?.edgeIds) && act.target.edgeIds.length > 0 && (
                    <span
                      className="font-mono"
                      style={{
                        marginLeft: 'auto',
                        fontSize: '0.65rem',
                        color: '#64748b',
                      }}
                    >
                      Edges: {act.target.edgeIds.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
