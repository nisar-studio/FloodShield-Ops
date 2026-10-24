import React from 'react';
import { 
  ShieldAlert, 
  CloudRain, 
  RefreshCw, 
  FileDown, 
  AlertTriangle,
  Sun,
  Moon
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

export function ScenarioHeader({
  scenario,
  connectionStatus,
  dataSource,
  onDataSourceChange,
  onTriggerRun,
  isLoadingRun,
  currentTheme,
  onThemeChange,
  onExportReport,
}) {
  const rainfall = scenario?.rainfall || { totalMm: 0, durationHours: 0, hourlyMm: [] };

  return (
    <header
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '1.1rem 2rem',
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
          gap: '1.25rem',
          maxWidth: '1720px',
          margin: '0 auto',
        }}
      >
        {/* Brand & City Pilot Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'var(--text-primary)',
              color: 'var(--bg-app)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldAlert size={26} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                FloodShield Ops
              </span>
              <Badge variant="neutral">
                Bengaluru Mahadevapura
              </Badge>
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Pre-Flood Decision-Support &bull; Sandbox Testbed
            </div>
          </div>
        </div>

        {/* Center: Active Scenario & Precipitation Telemetry */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            background: 'var(--bg-surface-elevated)',
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Active Scenario
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1px' }}>
              <span>{scenario?.scenarioId || 'blr-2022-09-replay'}</span>
              <Badge variant={scenario?.mode === 'live' ? 'danger' : 'info'}>
                {scenario?.mode === 'live' ? 'Live Radar' : 'Replay'}
              </Badge>
            </div>
          </div>

          <div style={{ width: '1px', height: '32px', background: 'var(--border-subtle)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CloudRain size={22} color="var(--color-info)" />
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                Rainfall Total
              </div>
              <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                {rainfall.totalMm} mm <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>({rainfall.durationHours}h)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {/* Light/Dark Toggle */}
          <button
            type="button"
            className="ops-btn ops-btn-outline"
            onClick={() => onThemeChange(currentTheme === 'dark' ? 'light' : 'dark')}
            title="Toggle Light / Dark mode"
            style={{ padding: '0.65rem 0.85rem' }}
          >
            {currentTheme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Data Source Selector */}
          <select
            value={dataSource}
            onChange={(e) => onDataSourceChange(e.target.value)}
            style={{
              background: 'var(--bg-surface-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-medium)',
              borderRadius: '6px',
              padding: '0.65rem 0.85rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="replay_pass">Replay: Verified Pass (Plan 001)</option>
            <option value="replay_fail">Replay: Verification Fail (Plan 002)</option>
            <option value="live">Live Backend API (port 3000)</option>
          </select>

          {/* Connection Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background:
                dataSource !== 'live'
                  ? 'var(--bg-surface-elevated)'
                  : connectionStatus.connected
                  ? 'var(--color-success-bg)'
                  : 'var(--color-danger-bg)',
              border: `1px solid ${
                dataSource !== 'live'
                  ? 'var(--border-subtle)'
                  : connectionStatus.connected
                  ? 'var(--color-success-border)'
                  : 'var(--color-danger-border)'
              }`,
              color:
                dataSource !== 'live'
                  ? 'var(--text-secondary)'
                  : connectionStatus.connected
                  ? 'var(--color-success)'
                  : 'var(--color-danger)',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor:
                  dataSource !== 'live'
                    ? 'var(--text-muted)'
                    : connectionStatus.connected
                    ? 'var(--color-success)'
                    : 'var(--color-danger)',
              }}
            />
            <span>
              {dataSource !== 'live'
                ? 'Replay Fixture'
                : connectionStatus.connected
                ? 'Backend Online'
                : 'Disconnected'}
            </span>
          </div>

          {/* Export Report */}
          <Button
            variant="outline"
            onClick={onExportReport}
            icon={FileDown}
          >
            Export Dossier
          </Button>

          {/* Run Button */}
          <Button
            variant="primary"
            onClick={onTriggerRun}
            loading={isLoadingRun}
            icon={RefreshCw}
          >
            {dataSource === 'live' ? 'Trigger Run' : 'Simulate Run'}
          </Button>
        </div>
      </div>

      {/* Honest Notice for Replay Mode */}
      {dataSource !== 'live' && (
        <div
          style={{
            maxWidth: '1720px',
            margin: '0.75rem auto 0 auto',
            padding: '0.5rem 1rem',
            background: 'var(--color-warning-bg)',
            border: '1px solid var(--color-warning-border)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
            color: 'var(--color-warning)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} />
            <span>
              <strong>OFFLINE REPLAY MODE:</strong> Displaying deterministic Bengaluru Sep 2022 historical event data. Live telemetry is disconnected.
            </span>
          </div>
          <span className="font-mono" style={{ fontSize: '0.8rem' }}>
            Contract: AGENTS.md
          </span>
        </div>
      )}
    </header>
  );
}
