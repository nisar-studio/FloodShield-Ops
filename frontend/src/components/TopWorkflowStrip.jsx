import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  Clock, 
  Radio, 
  Activity, 
  CheckCircle2, 
  AlertOctagon, 
  RefreshCcw, 
  Lock, 
  Terminal,
  AlertCircle
} from 'lucide-react';
import { Badge } from './ui/Badge';

export function TopWorkflowStrip({
  steps = [],
  currentIteration = 1,
  planStatus = '',
  simulationResult = null,
  connectionStatus = {},
  dataSource = 'replay_pass',
  latestAudit = null,
  isLoadingRun = false,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStringIST = currentTime.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // 7-Stage Sequence
  const WORKFLOW_STAGES = [
    { id: 'SCENARIO', label: 'Scenario Ingestion', stepName: 'SENSE' },
    { id: 'RISK', label: 'Risk Assessment', stepName: 'ASSESS' },
    { id: 'PLAN', label: 'Action Plan', stepName: 'PLAN' },
    { id: 'SIM', label: 'Simulation', stepName: 'VERIFY' },
    { id: 'REPLAN', label: 'Replanning', stepName: 'REPLAN' },
    { id: 'APPROVAL', label: 'Approval Gate', stepName: 'APPROVE' },
    { id: 'SANDBOX', label: 'Sandbox Execution', stepName: 'SANDBOX' },
  ];

  const stepMap = (steps || []).reduce((acc, s) => {
    acc[s.name?.toUpperCase()] = s;
    return acc;
  }, {});

  const getStageStatus = (stage) => {
    const step = stepMap[stage.stepName];
    if (!step) {
      if (stage.id === 'REPLAN') {
        return simulationResult && !simulationResult.passed ? 'ACTIVE' : 'UNAVAILABLE';
      }
      return 'UNAVAILABLE';
    }

    const st = step.status?.toLowerCase();
    if (st === 'passed' || st === 'completed' || st === 'approved') return 'COMPLETE';
    if (st === 'in_progress' || st === 'running') return 'ACTIVE';
    if (st === 'failed' || st === 'rejected') return 'FAILED';
    if (st === 'waiting_approval' || st === 'pending') return 'WAITING';
    if (st === 'disabled') return 'UNAVAILABLE';
    return 'UNAVAILABLE';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETE':
        return <span style={{ color: 'var(--color-success)', fontSize: '0.68rem', fontWeight: 700 }}>&bull; COMPLETE</span>;
      case 'ACTIVE':
        return <span style={{ color: 'var(--color-water)', fontSize: '0.68rem', fontWeight: 700 }} className="live-beacon">&bull; ACTIVE</span>;
      case 'FAILED':
        return <span style={{ color: 'var(--color-vermilion)', fontSize: '0.68rem', fontWeight: 700 }}>&bull; FAILED</span>;
      case 'WAITING':
        return <span style={{ color: 'var(--color-amber)', fontSize: '0.68rem', fontWeight: 700 }}>&bull; WAITING</span>;
      case 'UNAVAILABLE':
      default:
        return <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>&bull; READY</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 150 }}>
      {/* Upper Pipeline Bar */}
      <div className="top-workflow-strip">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflowX: 'auto', flex: 1, paddingRight: '1rem' }}>
          {isLoadingRun ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.25rem 0.75rem', borderRadius: '4px', background: 'var(--color-steel-blue)' }}>
              <span className="live-beacon" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-water)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-water)' }}>
                ORCHESTRATING PIPELINE RUN (GEMINI &rarr; DETERMINISTIC VERIFIER)...
              </span>
            </div>
          ) : (
            WORKFLOW_STAGES.map((stg, idx) => {
              const status = getStageStatus(stg);
              return (
                <React.Fragment key={stg.id}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      background: status === 'ACTIVE' ? 'var(--color-steel-blue)' : 'transparent',
                      border: status === 'ACTIVE' ? '1px solid var(--border-medium)' : '1px solid transparent',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: status === 'ACTIVE' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {stg.label}
                    </span>
                    {getStatusBadge(status)}
                  </div>
                  {idx < WORKFLOW_STAGES.length - 1 && (
                    <ChevronRight size={14} color="var(--border-medium)" style={{ flexShrink: 0 }} />
                  )}
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Live System Time & Beacon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <Clock size={15} color="var(--color-water)" />
            <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              {timeStringIST} IST
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.25rem 0.6rem',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 700,
              background:
                dataSource !== 'live'
                  ? 'var(--color-steel-blue)'
                  : connectionStatus.connected
                  ? 'var(--color-success-bg)'
                  : 'var(--color-danger-bg)',
              color:
                dataSource !== 'live'
                  ? 'var(--color-water)'
                  : connectionStatus.connected
                  ? 'var(--color-success)'
                  : 'var(--color-vermilion)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor:
                  dataSource !== 'live'
                    ? 'var(--color-water)'
                    : connectionStatus.connected
                    ? 'var(--color-success)'
                    : 'var(--color-vermilion)',
              }}
            />
            <span>
              {dataSource !== 'live'
                ? 'REPLAY FIXTURE'
                : connectionStatus.connected
                ? 'BACKEND LIVE'
                : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* Thin Event Ticker Stream */}
      <div
        style={{
          height: '26px',
          background: 'rgba(10, 13, 18, 0.95)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.25rem',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span className="font-mono" style={{ color: 'var(--color-teal)', fontWeight: 700 }}>
            {dataSource === 'live' ? '[LIVE API]' : '[REPLAY FIXTURE]'}
          </span>
          <span style={{ color: 'var(--text-primary)' }}>
            {latestAudit
              ? `${latestAudit.actor?.toUpperCase()} &bull; ${latestAudit.event}: ${latestAudit.payload ? JSON.stringify(latestAudit.payload).slice(0, 85) : 'Event recorded'}`
              : 'Deterministic verification pipeline initialized for Bengaluru Mahadevapura corridor.'}
          </span>
        </div>

        <div className="font-mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          PROVENANCE: KSNDMC 2022 GAUGES &bull; AGENTS.MD SCHEMA
        </div>
      </div>
    </div>
  );
}
