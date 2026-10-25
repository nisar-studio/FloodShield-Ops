import React, { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertTriangle, 
  Terminal, 
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';

export function ApprovalPanel({
  plan,
  simulation,
  onApprove,
  isApproving = false,
  approvalResult = null,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [operatorNote, setOperatorNote] = useState('');
  const [acknowledgedSandbox, setAcknowledgedSandbox] = useState(false);

  const planId = plan?.planId;
  const isVerified = simulation && simulation.passed === true;
  const isAlreadyApproved =
    plan?.status === 'approved' ||
    plan?.status === 'executed_sandbox' ||
    approvalResult?.status === 'approved' ||
    approvalResult?.status === 'executed_sandbox';

  let lockReason = '';
  if (!plan) {
    lockReason = 'No mitigation plan has been proposed yet.';
  } else if (!simulation) {
    lockReason = 'Plan has not undergone deterministic simulation.';
  } else if (!simulation.passed) {
    lockReason = `Deterministic verification failed (Score: ${(simulation.planScore * 100).toFixed(1)}% < Threshold: ${(simulation.threshold * 100).toFixed(1)}%). Replan cycle is active.`;
  } else if (isAlreadyApproved) {
    lockReason = 'Plan has already received human operator authorization and dispatched to sandbox.';
  }

  const isButtonEnabled = planId && isVerified && !isAlreadyApproved && !isApproving;

  const handleConfirmApproval = () => {
    if (!acknowledgedSandbox) return;
    onApprove(planId, operatorNote);
    setIsModalOpen(false);
  };

  return (
    <div className="ops-card">
      <div className="ops-card-header">
        <div className="ops-card-title">
          {isAlreadyApproved ? (
            <CheckCircle2 size={20} color="var(--color-success)" />
          ) : isVerified ? (
            <Unlock size={20} color="var(--color-warning)" />
          ) : (
            <Lock size={20} color="var(--text-muted)" />
          )}
          <span>Human-in-the-Loop Operator Gate</span>
        </div>

        <Badge
          variant={
            isAlreadyApproved
              ? 'success'
              : isVerified
              ? 'warning'
              : 'neutral'
          }
        >
          {isAlreadyApproved
            ? 'Authorized & Dispatched'
            : isVerified
            ? 'Ready for Review'
            : 'Locked'}
        </Badge>
      </div>

      <div className="ops-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          Mandatory safety policy: No AI-generated recommendation reaches execution status without prior verification and explicit human operator sign-off.
        </div>

        {/* Status Notices */}
        {isAlreadyApproved ? (
          <div
            style={{
              padding: '1rem 1.25rem',
              background: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              borderRadius: '8px',
              color: 'var(--color-success)',
              fontSize: '0.95rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
            }}
          >
            <ShieldCheck size={24} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                Plan {planId} Authorized & Dispatched
              </div>
              <div style={{ fontSize: '0.85rem', marginTop: '2px', opacity: 0.9 }}>
                Execution state: <code className="font-mono">{approvalResult?.status || plan?.status}</code> &bull; Dispatched to sandbox environment.
              </div>
            </div>
          </div>
        ) : !isButtonEnabled ? (
          <div
            style={{
              padding: '1rem 1.25rem',
              background: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              borderRadius: '8px',
              color: 'var(--color-danger)',
              fontSize: '0.95rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
            }}
          >
            <Lock size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Approval Gate Locked:</strong>
              <div style={{ marginTop: '4px', lineHeight: '1.4' }}>{lockReason}</div>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '1rem 1.25rem',
              background: 'var(--color-warning-bg)',
              border: '1px solid var(--color-warning-border)',
              borderRadius: '8px',
              color: 'var(--color-warning)',
              fontSize: '0.95rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
            }}
          >
            <Unlock size={22} style={{ flexShrink: 0 }} />
            <div>
              <strong>Verified & Ready for Authorization:</strong> Deterministic simulation cleared target threshold ({(simulation.planScore * 100).toFixed(1)}%).
            </div>
          </div>
        )}

        {/* Action Button */}
        <div>
          <Button
            variant={isAlreadyApproved ? 'outline' : isVerified ? 'success' : 'outline'}
            disabled={!isButtonEnabled}
            loading={isApproving}
            onClick={() => setIsModalOpen(true)}
            icon={isAlreadyApproved ? CheckCircle2 : UserCheck}
            style={{ width: '100%', padding: '0.85rem 1.25rem', fontSize: '1rem' }}
          >
            {isAlreadyApproved
              ? 'Plan Approved & Dispatched'
              : 'Review & Authorize Sandbox Dispatch'}
          </Button>
        </div>

        <div
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Terminal size={16} />
          <span>Non-destructive testbed: Actions are executed only inside the sandbox simulation.</span>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Confirm Pre-Flood Mitigation Authorization"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.95rem' }}>
          <div
            style={{
              padding: '1rem',
              background: 'var(--color-warning-bg)',
              border: '1px solid var(--color-warning-border)',
              borderRadius: '8px',
              color: 'var(--color-warning)',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangle size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Operator Authorization Sign-Off:</strong>
              <div style={{ marginTop: '4px', fontSize: '0.9rem', lineHeight: '1.4' }}>
                You are authorizing the execution of Plan <strong className="font-mono">{planId}</strong> in the sandbox. Confirm that proposed road closures and pump deployments align with city protocols.
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '1rem',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>
              Verification Summary
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span>Baseline Reachability:</span>
              <span className="font-mono" style={{ fontWeight: 600 }}>{((simulation?.baselineScore || 0) * 100).toFixed(1)}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span>Verified Plan Reachability:</span>
              <span className="font-mono" style={{ color: 'var(--color-success)', fontWeight: 700 }}>{((simulation?.planScore || 0) * 100).toFixed(1)}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Candidate Actions:</span>
              <span>{plan?.actions?.length || 0} mitigations</span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.4rem' }}>
              Operator Authorization Notes:
            </label>
            <textarea
              rows={3}
              value={operatorNote}
              onChange={(e) => setOperatorNote(e.target.value)}
              placeholder="e.g., Verified diversion coordinates with Mahadevapura field marshals."
              style={{
                width: '100%',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-medium)',
                borderRadius: '6px',
                padding: '0.75rem',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
            <input
              type="checkbox"
              id="ack_sandbox"
              checked={acknowledgedSandbox}
              onChange={(e) => setAcknowledgedSandbox(e.target.checked)}
              style={{ marginTop: '4px', cursor: 'pointer', width: '18px', height: '18px' }}
            />
            <label htmlFor="ack_sandbox" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', cursor: 'pointer', lineHeight: '1.4' }}>
              I confirm that I have verified the reachability simulation results and authorize execution in the sandbox environment.
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.85rem', marginTop: '0.5rem' }}>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="success"
              disabled={!acknowledgedSandbox || isApproving}
              loading={isApproving}
              onClick={handleConfirmApproval}
              icon={CheckCircle2}
            >
              Sign & Dispatch to Sandbox
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
