import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  TrendingUp, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Play, 
  Pause, 
  RotateCcw, 
  CloudRain, 
  FastForward,
  Flag
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

// Milestone event markers along the 6-hour timeline
const TIMELINE_EVENTS = [
  { hour: 1, label: 'Telemetry Ingested', mm: 5 },
  { hour: 3, label: 'Runoff Threshold', mm: 20 },
  { hour: 4, label: 'Peak Cloudburst', mm: 35 },
  { hour: 5, label: 'Max Inundation', mm: 35 },
  { hour: 6, label: 'Verifier Evaluated', mm: 20 },
];

export function BottomCommandTray({
  simulation,
  plan,
  rainfall,
  currentHour: controlledHour,
  onApprove,
  isApproving,
  approvalResult,
  onOpenApprovalModal,
  onHourChange = () => {},
}) {
  const baselineScore = simulation?.baselineScore ?? 0.5;
  const planScore = simulation?.planScore ?? 0.833;
  const threshold = simulation?.threshold ?? 0.8;
  const passed = simulation?.passed ?? true;
  const iteration = plan?.iteration ?? 1;

  const hourly = rainfall?.hourlyMm || [5, 10, 20, 35, 35, 20];
  const durationHours = rainfall?.durationHours || 6;
  const totalMm = rainfall?.totalMm || 125;

  const [internalHour, setInternalHour] = useState(durationHours);
  const currentHour = controlledHour !== undefined ? controlledHour : internalHour;

  const handleHourUpdate = (val) => {
    setInternalHour(val);
    onHourChange(val);
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 4x

  // Playback timer taking speed into account
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      const intervalMs = Math.round(1100 / playbackSpeed);
      interval = setInterval(() => {
        const next = currentHour >= durationHours ? 1 : currentHour + 1;
        if (next === durationHours) {
          setIsPlaying(false);
        }
        handleHourUpdate(next);
      }, intervalMs);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, durationHours, currentHour]);

  const activeMm = hourly[currentHour - 1] || 0;
  const cumulativeMm = hourly.slice(0, currentHour).reduce((sum, v) => sum + v, 0);

  const isAlreadyApproved =
    plan?.status === 'approved' ||
    plan?.status === 'executed_sandbox' ||
    approvalResult?.status === 'approved' ||
    approvalResult?.status === 'executed_sandbox';

  const isApprovalEnabled = plan?.planId && passed && !isAlreadyApproved && !isApproving;

  const toggleSpeed = () => {
    if (playbackSpeed === 1) setPlaybackSpeed(2);
    else if (playbackSpeed === 2) setPlaybackSpeed(4);
    else setPlaybackSpeed(1);
  };

  const currentEvent = TIMELINE_EVENTS.find((e) => e.hour === currentHour);

  return (
    <div className="bottom-command-tray">
      {/* 1. Verification Reachability Score KPI Block */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              padding: '8px',
              borderRadius: '6px',
              background: passed ? 'rgba(52, 211, 153, 0.15)' : 'rgba(214, 91, 76, 0.15)',
              color: passed ? 'var(--color-success)' : 'var(--color-vermilion)',
            }}
          >
            {passed ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              Deterministic Reachability (T = 30m)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {(baselineScore * 100).toFixed(1)}% &rarr; {(planScore * 100).toFixed(1)}%
              </span>
              <Badge variant={passed ? 'success' : 'danger'}>
                {passed ? 'THRESHOLD CLEARED' : 'FAILED - REPLANNING'}
              </Badge>
            </div>
          </div>
        </div>

        <div style={{ width: '1px', height: '36px', background: 'var(--border-subtle)' }} />

        {/* Safety Threshold & Iteration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Target: <strong className="font-mono" style={{ color: 'var(--color-water)' }}>{(threshold * 100).toFixed(0)}%</strong>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Iteration: <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{iteration} of 3</strong>
          </div>
        </div>
      </div>

      {/* 2. Replay Timeline with Play/Pause, Speed, Markers & Scrubber */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          background: 'rgba(10, 13, 18, 0.65)',
          padding: '0.45rem 1rem',
          borderRadius: '8px',
          border: '1px solid var(--border-medium)',
        }}
      >
        {/* Playback Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            type="button"
            onClick={() => {
              if (currentHour >= durationHours) {
                handleHourUpdate(1);
              }
              setIsPlaying(!isPlaying);
            }}
            style={{
              background: isPlaying ? 'var(--color-vermilion)' : 'var(--color-steel-blue)',
              border: '1px solid var(--border-medium)',
              color: '#ffffff',
              borderRadius: '4px',
              padding: '5px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          {/* Speed Toggle (1x, 2x, 4x) */}
          <button
            type="button"
            onClick={toggleSpeed}
            title="Toggle replay playback speed"
            style={{
              background: 'var(--color-steel-blue)',
              border: '1px solid var(--border-medium)',
              color: 'var(--color-water)',
              borderRadius: '4px',
              padding: '5px 8px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            <FastForward size={11} />
            <span>{playbackSpeed}x</span>
          </button>
        </div>

        {/* Timeline Slider with Hour Marker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '220px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--color-water)', fontWeight: 600 }}>Hour {currentHour} of {durationHours}</span>
            <span>{currentEvent ? currentEvent.label : `Surge ${activeMm} mm/h`}</span>
          </div>

          <input
            type="range"
            min={1}
            max={durationHours}
            value={currentHour}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              handleHourUpdate(val);
            }}
            style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-water)', height: '5px' }}
          />

          {/* Event Marker Ticks */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
            {TIMELINE_EVENTS.map((ev) => (
              <span
                key={ev.hour}
                onClick={() => handleHourUpdate(ev.hour)}
                style={{
                  cursor: 'pointer',
                  color: ev.hour === currentHour ? 'var(--color-amber)' : 'var(--text-muted)',
                  fontWeight: ev.hour === currentHour ? 700 : 400,
                }}
              >
                H{ev.hour}
              </span>
            ))}
          </div>
        </div>

        <div className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--color-water)', whiteSpace: 'nowrap' }}>
          {cumulativeMm}/{totalMm} mm
        </div>
      </div>

      {/* 3. Operator Approval Gate Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Button
          variant={isAlreadyApproved ? 'outline' : passed ? 'success' : 'outline'}
          disabled={!isApprovalEnabled}
          onClick={onOpenApprovalModal}
          icon={isAlreadyApproved ? CheckCircle2 : passed ? Unlock : Lock}
          style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}
        >
          {isAlreadyApproved
            ? 'Plan Approved & Dispatched'
            : passed
            ? 'Authorize Sandbox Dispatch'
            : 'Approval Locked (Unverified)'}
        </Button>
      </div>
    </div>
  );
}
