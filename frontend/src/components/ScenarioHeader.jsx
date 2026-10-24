import React from 'react';
import { 
  ShieldAlert, 
  CloudRain, 
  Activity, 
  RefreshCw, 
  FileDown, 
  Palette, 
  AlertTriangle,
  Radio,
  ExternalLink
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
  const hourly = rainfall.hourlyMm || [];
  const maxRain = Math.max(...hourly, 1);

  return (
    <header
      style={{
        background: 'rgba(8, 14, 28, 0.85)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '0.85rem 1.5rem',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
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
        {/* Brand & City Pilot Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: '1px solid rgba(56, 189, 248, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(2, 132, 199, 0.45)',
            }}
          >
            <ShieldAlert size={24} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.04em', color: '#f8fafc' }}>
                FLOODSHIELD OPS
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '2px 7px',
                  borderRadius: '4px',
                }}
              >
                DECISION-SUPPORT &bull; SANDBOX
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1px' }}>
              <span>Bengaluru Operations Room</span>
              <span>&bull;</span>
              <span className="font-mono" style={{ color: '#cbd5e1' }}>Mahadevapura Pilot Corridor</span>
            </div>
          </div>
        </div>

        {/* Center: Active Scenario Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            background: 'rgba(0, 0, 0, 0.35)',
            padding: '0.45rem 1rem',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
              Scenario Profile
            </div>
            <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>{scenario?.scenarioId || 'blr-2022-09-replay'}</span>
              <Badge variant={scenario?.mode === 'live' ? 'danger' : 'info'}>
                {scenario?.mode === 'live' ? 'RADAR FEED' : 'REPLAY'}
              </Badge>
            </div>
          </div>

          <div style={{ width: '1px', height: '26px', background: 'rgba(255,255,255,0.08)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CloudRain size={18} color="#38bdf8" />
            <div>
              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                Precipitation
              </div>
              <div className="font-mono" style={{ fontSize: '0.825rem', fontWeight: 700, color: '#38bdf8' }}>
                {rainfall.totalMm} mm <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>/ {rainfall.durationHours}h</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Controls & Pro Features */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Theme Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Palette size={14} color="#94a3b8" />
            <select
              value={currentTheme}
              onChange={(e) => onThemeChange(e.target.value)}
              style={{
                background: '#090d18',
                color: '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                padding: '0.35rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="cyber">Cyber Command (Default)</option>
              <option value="tactical">Tactical Slate</option>
              <option value="obsidian">Minimal Obsidian</option>
            </select>
          </div>

          {/* Data Source Selector */}
          <select
            value={dataSource}
            onChange={(e) => onDataSourceChange(e.target.value)}
            style={{
              background: '#090d18',
              color: '#f8fafc',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '6px',
              padding: '0.35rem 0.6rem',
              fontSize: '0.75rem',
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
            title={connectionStatus.message || 'Status'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 700,
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
              className="pulse-beacon"
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor:
                  dataSource !== 'live'
                    ? '#94a3b8'
                    : connectionStatus.connected
                    ? '#10b981'
                    : '#ef4444',
                boxShadow:
                  connectionStatus.connected && dataSource === 'live'
                    ? '0 0 8px #10b981'
                    : 'none',
              }}
            />
            <span>
              {dataSource !== 'live'
                ? 'REPLAY FIXTURE'
                : connectionStatus.connected
                ? 'BACKEND ONLINE'
                : 'DISCONNECTED'}
            </span>
          </div>

          {/* Export Report Button */}
          <Button
            variant="outline"
            onClick={onExportReport}
            icon={FileDown}
            title="Download formatted executive incident briefing dossier"
          >
            Export Dossier
          </Button>

          {/* Run / Refresh Button */}
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

      {/* Honesty Banner for Replay Mode */}
      {dataSource !== 'live' && (
        <div
          style={{
            maxWidth: '1720px',
            margin: '0.6rem auto 0 auto',
            padding: '0.35rem 0.85rem',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: '#fcd34d',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={14} color="#f59e0b" />
            <span>
              <strong>OFFLINE REPLAY / TESTBED MODE:</strong> Operating with deterministic Bengaluru 2022 historical event data. Live radar disconnected.
            </span>
          </div>
          <span className="font-mono" style={{ fontSize: '0.68rem', color: '#fbbf24' }}>
            Strict Contract: AGENTS.md
          </span>
        </div>
      )}
    </header>
  );
}
