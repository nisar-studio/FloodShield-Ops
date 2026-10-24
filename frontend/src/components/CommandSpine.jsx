import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Map, 
  Compass, 
  BrainCircuit, 
  ShieldCheck, 
  History, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  FileDown, 
  Flame, 
  CloudRain, 
  Layers, 
  Terminal,
  Activity,
  SlidersHorizontal,
  Command
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

export function CommandSpine({
  currentView,
  onViewChange,
  scenario,
  hotspots = [],
  dataSource,
  onDataSourceChange,
  connectionStatus,
  onTriggerRun,
  isLoadingRun,
  onExportReport,
  onOpenCommandPalette,
  isCollapsed,
  onToggleCollapse,
}) {
  const rainfall = scenario?.rainfall || { totalMm: 0, durationHours: 0 };
  const maxRisk = hotspots.length > 0 ? Math.max(...hotspots.map((h) => h.riskScore || 0)) : 0;

  const NAV_ITEMS = [
    { id: 'command', label: 'COMMAND', icon: Compass, desc: 'Dominant Tactical Map' },
    { id: 'terrain', label: 'TERRAIN', icon: Layers, desc: 'Watershed & Elevation' },
    { id: 'plan', label: 'RESPONSE PLAN', icon: BrainCircuit, desc: 'AI Mitigation Actions' },
    { id: 'verification', label: 'VERIFICATION', icon: ShieldCheck, desc: 'Graph Reachability' },
    { id: 'audit', label: 'AUDIT', icon: History, desc: 'Event Provenance Trail' },
  ];

  return (
    <aside className={`command-spine ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Header / Brand */}
      <div
        style={{
          padding: isCollapsed ? '1rem 0.5rem' : '1.15rem 1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #1C2B36 0%, #111A23 100%)',
              border: '1px solid var(--border-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-water)',
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={20} />
          </div>

          {!isCollapsed && (
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                FLOODSHIELD
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-water)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                OPS COMMAND
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: isCollapsed ? 'none' : 'block',
          }}
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Quick Status / Provenance */}
      {!isCollapsed && (
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Scenario ID
            </span>
            <Badge variant={scenario?.mode === 'live' ? 'danger' : 'info'}>
              {scenario?.mode === 'live' ? 'LIVE RADAR' : 'REPLAY'}
            </Badge>
          </div>
          <div className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {scenario?.scenarioId || 'blr-2022-09-replay'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Bengaluru &bull; Mahadevapura
          </div>
        </div>
      )}

      {/* Navigation Entries */}
      <nav style={{ padding: '0.85rem 0.65rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              title={item.desc}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: isCollapsed ? '0.75rem 0' : '0.65rem 0.85rem',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: isActive ? 'var(--color-teal)' : 'transparent',
                background: isActive ? 'rgba(60, 127, 130, 0.15)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Icon size={18} color={isActive ? 'var(--color-water)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
              {!isCollapsed && (
                <div>
                  <div style={{ fontSize: '0.825rem', fontWeight: 700, letterSpacing: '0.04em' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {item.desc}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Risk Summary Widget (If Expanded) */}
      {!isCollapsed && (
        <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border-subtle)', background: 'rgba(10, 13, 18, 0.4)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>
            Telemetry Profile
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div style={{ background: 'var(--color-steel-blue)', padding: '0.45rem 0.65rem', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Hotspots:</div>
              <div className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-vermilion)' }}>
                {hotspots.length} Active
              </div>
            </div>
            <div style={{ background: 'var(--color-steel-blue)', padding: '0.45rem 0.65rem', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Rainfall:</div>
              <div className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-water)' }}>
                {rainfall.totalMm} mm
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Provenance & Operations Switcher */}
      {!isCollapsed && (
        <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Data Provenance:
            </label>
            <select
              value={dataSource}
              onChange={(e) => onDataSourceChange(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--color-steel-blue)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-medium)',
                borderRadius: '4px',
                padding: '0.45rem 0.6rem',
                fontSize: '0.78rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="replay_pass">Replay: Pass (Plan 001)</option>
              <option value="replay_fail">Replay: Fail (Plan 002)</option>
              <option value="live">Live API (Port 3000)</option>
            </select>
          </div>

          <Button
            variant="primary"
            onClick={onTriggerRun}
            loading={isLoadingRun}
            icon={RefreshCw}
            style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}
          >
            {dataSource === 'live' ? 'Trigger Live Run' : 'Simulate Run'}
          </Button>

          <Button
            variant="outline"
            onClick={onExportReport}
            icon={FileDown}
            style={{ width: '100%', fontSize: '0.8rem', padding: '0.45rem' }}
          >
            Export Dossier
          </Button>

          {/* Quick command palette trigger */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            style={{
              background: 'transparent',
              border: '1px dashed var(--border-medium)',
              borderRadius: '4px',
              padding: '0.4rem',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              cursor: 'pointer',
            }}
          >
            <Command size={13} />
            <span>Command Palette (Ctrl+K)</span>
          </button>
        </div>
      )}

      {/* Collapsed expand button */}
      {isCollapsed && (
        <div style={{ padding: '0.75rem', display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onToggleCollapse}
            style={{
              background: 'var(--color-steel-blue)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)',
              borderRadius: '4px',
              padding: '6px',
              cursor: 'pointer',
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </aside>
  );
}
