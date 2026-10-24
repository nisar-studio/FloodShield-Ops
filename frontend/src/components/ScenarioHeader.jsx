import React from 'react';
import { 
  ShieldAlert, 
  CloudRain, 
  Activity, 
  RefreshCw, 
  Database, 
  Server, 
  AlertTriangle,
  Radio,
  SlidersHorizontal
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

export function ScenarioHeader({
  scenario,
  connectionStatus,
  dataSource, // 'live' | 'replay_pass' | 'replay_fail'
  onDataSourceChange,
  onTriggerRun,
  isLoadingRun,
}) {
  const rainfall = scenario?.rainfall || { totalMm: 0, durationHours: 0, hourlyMm: [] };
  const hourly = rainfall.hourlyMm || [];
  const maxRain = Math.max(...hourly, 1);

  return (
    <header
      style={{
        background: 'rgba(17, 24, 39, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '0.85rem 1.25rem',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          maxWidth: '1720px',
          margin: '0 auto',
        }}
      >
        {/* Brand & Mission Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(2, 132, 199, 0.4)',
            }}
          >
            <ShieldAlert size={22} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.04em', color: '#f8fafc' }}>
                FLOODSHIELD OPS
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                }}
              >
                DECISION-SUPPORT &bull; SANDBOX
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>Bengaluru Command Center</span>
              <span>&bull;</span>
              <span className="font-mono" style={{ color: '#cbd5e1' }}>Mahadevapura Pilot Area</span>
            </div>
          </div>
        </div>

        {/* Center: Scenario & Meteorological Telemetry */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            background: 'rgba(11, 15, 25, 0.6)',
            padding: '0.4rem 0.85rem',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          {/* Scenario Info */}
          <div>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
              Active Scenario
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>{scenario?.scenarioId || 'No Scenario'}</span>
              <Badge variant={scenario?.mode === 'live' ? 'danger' : 'info'}>
                {scenario?.mode === 'live' ? 'LIVE RADAR' : 'REPLAY'}
              </Badge>
            </div>
          </div>

          <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.08)' }} />

          {/* Rainfall Stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CloudRain size={18} color="#38bdf8" />
            <div>
              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                Precipitation Event
              </div>
              <div className="font-mono" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8' }}>
                {rainfall.totalMm} mm <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>/ {rainfall.durationHours}h</span>
              </div>
            </div>

            {/* Sparkline of hourly rain */}
            {hourly.length > 0 && (
              <div
                title={`Hourly rainfall distribution: ${hourly.join(', ')} mm`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '2px',
                  height: '22px',
                  padding: '2px 4px',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '3px',
                }}
              >
                {hourly.map((val, idx) => {
                  const heightPercent = Math.max((val / maxRain) * 100, 15);
                  const isPeak = val === maxRain;
                  return (
                    <div
                      key={idx}
                      style={{
                        width: '4px',
                        height: `${heightPercent}%`,
                        background: isPeak ? '#f59e0b' : '#38bdf8',
                        borderRadius: '1px',
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Source Mode, Backend Health & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Data Source Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Source:</span>
            <select
              value={dataSource}
              onChange={(e) => onDataSourceChange(e.target.value)}
              style={{
                background: '#0f172a',
                color: '#f8fafc',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '4px',
                padding: '0.35rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="replay_pass">Replay Fixture: Verified Pass (Plan 001)</option>
              <option value="replay_fail">Replay Fixture: Verification Fail / Replan (Plan 002)</option>
              <option value="live">Live Backend API (http://localhost:3000)</option>
            </select>
          </div>

          {/* Connection Status Indicator */}
          <div
            title={connectionStatus.message || 'Connection Status'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.6rem',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 600,
              background:
                dataSource !== 'live'
                  ? 'rgba(100, 116, 139, 0.15)'
                  : connectionStatus.connected
                  ? 'rgba(16, 185, 129, 0.15)'
                  : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${
                dataSource !== 'live'
                  ? 'rgba(100, 116, 139, 0.3)'
                  : connectionStatus.connected
                  ? 'rgba(16, 185, 129, 0.4)'
                  : 'rgba(239, 68, 68, 0.4)'
              }`,
              color:
                dataSource !== 'live'
                  ? '#cbd5e1'
                  : connectionStatus.connected
                  ? '#34d399'
                  : '#f87171',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor:
                  dataSource !== 'live'
                    ? '#94a3b8'
                    : connectionStatus.connected
                    ? '#10b981'
                    : '#ef4444',
                boxShadow:
                  connectionStatus.connected && dataSource === 'live'
                    ? '0 0 6px #10b981'
                    : 'none',
              }}
            />
            <span>
              {dataSource !== 'live'
                ? 'FIXTURE REPLAY'
                : connectionStatus.connected
                ? 'BACKEND ONLINE'
                : 'OFFLINE / DISCONNECTED'}
            </span>
          </div>

          {/* Run / Refresh Button */}
          <Button
            variant="primary"
            onClick={onTriggerRun}
            loading={isLoadingRun}
            icon={RefreshCw}
          >
            {dataSource === 'live' ? 'Trigger Run' : 'Re-Run Scenario'}
          </Button>
        </div>
      </div>

      {/* Prominent Label Banner for Replay Mode (Honesty Rule) */}
      {dataSource !== 'live' && (
        <div
          style={{
            maxWidth: '1720px',
            margin: '0.5rem auto 0 auto',
            padding: '0.3rem 0.75rem',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: '#fcd34d',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertTriangle size={14} color="#f59e0b" />
            <span>
              <strong>OFFLINE REPLAY / FIXTURE MODE ACTIVE:</strong> Data shown is from deterministic test fixtures (Bengaluru Sep 2022 historical event). Not connected to live sensor telemetry.
            </span>
          </div>
          <span className="font-mono" style={{ fontSize: '0.68rem', color: '#fbbf24' }}>
            Contract: AGENTS.md compliant
          </span>
        </div>
      )}
    </header>
  );
}
