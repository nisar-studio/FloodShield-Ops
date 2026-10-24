import React, { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertTriangle, 
  Terminal, 
  ShieldCheck,
  UserCheck,
  Info
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

  // Strict check on why approval is locked
  let lockReason = '';
  if (!plan) {
    lockReason = 'No mitigation plan has been proposed yet.';
  } else if (!simulation) {
    lockReason = 'Plan has not undergone deterministic simulation.';
  } else if (!simulation.passed) {
    lockReason = `Deterministic verification failed (Score: ${(simulation.planScore * 100).toFixed(1)}% < Threshold: ${(simulation.threshold * 100).toFixed(1)}%). Replan cycle active.`;
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
            <CheckCircle2 size={16} color="#10b981" />
          ) : isVerified ? (
            <Unlock size={16} color="#f59e0b" />
          ) : (
            <Lock size={16} color="#64748b" />
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
            ? 'AUTHORIZED & DISPATCHED'
            : isVerified
            ? 'AWAITING OPERATOR'
            : 'LOCKED'}
        </Badge>
      </div>

      <div className="ops-card-body">
        {/* Safety Gate Explanation */}
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.4', marginBottom: '0.85rem' }}>
          Strict safety policy requires explicit human confirmation before any AI-generated mitigation can be dispatched.
        </div>

        {/* Status Box */}
        {isAlreadyApproved ? (
          <div
            style={{
              padding: '0.75rem',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '6px',
              color: '#6ee7b7',
              fontSize: '0.78rem',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
            }}
          >
            <ShieldCheck size={20} color="#10b981" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: '#34d399' }}>
                Plan {planId} Authorized by Operator
              </div>
              <div style={{ fontSize: '0.72rem', color: '#a7f3d0', marginTop: '2px' }}>
                Execution state: <code className="font-mono">{approvalResult?.status || plan?.status}</code> &bull; Dispatched to sandbox simulator.
              </div>
            </div>
          </div>
        ) : !isButtonEnabled ? (
          <div
            style={{
              padding: '0.65rem 0.75rem',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '6px',
              color: '#fca5a5',
              fontSize: '0.75rem',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'flex-start',
            }}
          >
            <Lock size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Approval Gate Locked:</strong>
              <div style={{ marginTop: '2px', color: '#fecaca' }}>{lockReason}</div>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '0.65rem 0.75rem',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '6px',
              color: '#fcd34d',
              fontSize: '0.75rem',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
            }}
          >
            <Unlock size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
            <div>
              <strong>Ready for Operator Review:</strong> Deterministic verification passed (Reachability: {(simulation.planScore * 100).toFixed(1)}%).
            </div>
          </div>
        )}

        {/* Action Button */}
        <div style={{ marginTop: '0.85rem' }}>
          <Button
            variant={isAlreadyApproved ? 'outline' : isVerified ? 'success' : 'outline'}
            disabled={!isButtonEnabled}
            loading={isApproving}
            onClick={() => setIsModalOpen(true)}
            icon={isAlreadyApproved ? CheckCircle2 : UserCheck}
            style={{ width: '100%', padding: '0.65rem' }}
          >
            {isAlreadyApproved
              ? 'Plan Approved & Dispatched'
              : 'Review & Authorize Sandbox Dispatch'}
          </Button>
        </div>

        {/* Non-destructive Sandbox Notice */}
        <div
          style={{
            marginTop: '0.75rem',
            fontSize: '0.68rem',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <Terminal size={12} color="#64748b" />
          <span>Non-destructive testbed: No real physical road closures or emergency alerts dispatched.</span>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Confirm Pre-Flood Mitigation Authorization"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.8rem' }}>
          <div
            style={{
              padding: '0.75rem',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '6px',
              color: '#fcd34d',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Operator Authorization Sign-Off:</strong>
              <div style={{ marginTop: '2px', color: '#fef3c7', fontSize: '0.75rem' }}>
                You are authorizing the execution of Plan <strong className="font-mono">{planId}</strong> in the sandbox simulator. Verify that all 4 proposed mitigating actions comply with control room protocols.
              </div>
            </div>
          </div>

          {/* Plan Summary */}
          <div
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
              padding: '0.75rem',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.4rem' }}>
              Verification Summary
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ color: '#cbd5e1' }}>Baseline Reachability:</span>
              <span className="font-mono" style={{ color: '#f8fafc' }}>{((simulation?.baselineScore || 0) * 100).toFixed(1)}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ color: '#cbd5e1' }}>Verified Plan Reachability:</span>
              <span className="font-mono" style={{ color: '#10b981', fontWeight: 700 }}>{((simulation?.planScore || 0) * 100).toFixed(1)}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#cbd5e1' }}>Mitigating Actions:</span>
              <span style={{ color: '#38bdf8' }}>{plan?.actions?.length || 0} actions</span>
            </div>
          </div>

          {/* Operator Note */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.35rem' }}>
              Operator Authorization Notes (Audit Trail):
            </label>
            <textarea
              rows={2}
              value={operatorNote}
              onChange={(e) => setOperatorNote(e.target.value)}
              placeholder="e.g. Verified road diversion and pump staging coordinates with Mahadevapura field teams."
              style={{
                width: '100%',
                background: '#090d16',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '4px',
                padding: '0.5rem',
                color: '#f8fafc',
                fontSize: '0.75rem',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>

          {/* Explicit Confirmation Checkbox */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="ack_sandbox"
              checked={acknowledgedSandbox}
              onChange={(e) => setAcknowledgedSandbox(e.target.checked)}
              style={{ marginTop: '3px', cursor: 'pointer' }}
            />
            <label htmlFor="ack_sandbox" style={{ fontSize: '0.72rem', color: '#cbd5e1', cursor: 'pointer' }}>
              I confirm that I have reviewed the simulator reachability scores and authorize execution in the sandbox environment.
            </label>
          </div>

          {/* Modal Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
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
