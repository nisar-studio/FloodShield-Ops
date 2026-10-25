import React, { useState, useRef, useEffect } from 'react';
import { useOperationsRun } from './hooks/useOperationsRun';
import { CommandSpine } from './components/CommandSpine';
import { TopWorkflowStrip } from './components/TopWorkflowStrip';
import { RiskMap } from './components/RiskMap';
import { ContextualInspector } from './components/ContextualInspector';
import { BottomCommandTray } from './components/BottomCommandTray';
import { CommandPalette } from './components/CommandPalette';
import { ScoreComparison } from './components/ScoreComparison';
import { PlanActions } from './components/PlanActions';
import { AuditTimeline } from './components/AuditTimeline';
import { HotspotList } from './components/HotspotList';
import { FacilityReachabilityList } from './components/FacilityReachabilityList';
import { Reachability3DGauge } from './components/Reachability3DGauge';
import { Modal } from './components/ui/Modal';
import { Button } from './components/ui/Button';
import { CinematicIntro } from './components/CinematicIntro';
import { exportIncidentReport } from './utils/reportExporter';
import { AlertCircle, X, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function App() {
  const {
    dataSource,
    connectionStatus,
    scenario,
    facilities,
    hotspots,
    currentRun,
    auditEntries,
    isLoadingRun,
    isApproving,
    approvalResult,
    errorMessage,
    handleDataSourceChange,
    triggerRun,
    approvePlan,
    clearError,
  } = useOperationsRun();

  const [currentView, setCurrentView] = useState('command'); // 'command' | 'terrain' | 'plan' | 'verification' | 'audit'
  const [selectedItem, setSelectedItem] = useState(null); // { type, data }
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [replayHour, setReplayHour] = useState(6);

  // Cinematic opening sequence state
  const [showIntro, setShowIntro] = useState(true);
  const [hasEnteredDashboard, setHasEnteredDashboard] = useState(false);

  const handleIntroComplete = () => {
    setShowIntro(false);
    setHasEnteredDashboard(true);
    // Smoothly invalidate map size so Leaflet adjusts to the final layout
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 120);
  };

  // Approval modal state
  const [operatorNote, setOperatorNote] = useState('');
  const [acknowledgedSandbox, setAcknowledgedSandbox] = useState(false);

  const mapRef = useRef(null);

  // Global Ctrl+K / Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const plan = currentRun?.plan;
  const simulation = currentRun?.simulation;
  const steps = currentRun?.steps || [];
  const iteration = plan?.iteration || 1;
  const latestAudit = auditEntries && auditEntries.length > 0 ? auditEntries[auditEntries.length - 1] : null;

  // Fly to location on map
  const handleFocusMap = (lat, lng, zoom = 15) => {
    setCurrentView('command');
    if (mapRef.current && typeof lat === 'number' && typeof lng === 'number') {
      mapRef.current.flyTo(lat, lng, zoom);
    }
  };

  const handleExport = () => {
    exportIncidentReport({
      scenario,
      hotspots,
      facilities,
      currentRun,
      auditEntries,
    });
  };

  const handleConfirmApproval = () => {
    if (!acknowledgedSandbox || !plan?.planId) return;
    approvePlan(plan.planId, operatorNote);
    setIsApprovalModalOpen(false);
  };

  return (
    <>
      {showIntro && <CinematicIntro onComplete={handleIntroComplete} />}
      <div className={`floodshield-app ${hasEnteredDashboard ? 'dashboard-entrance' : ''}`}>
        {/* 1. Left Command Spine */}
        <CommandSpine
        currentView={currentView}
        onViewChange={setCurrentView}
        scenario={scenario}
        hotspots={hotspots}
        dataSource={dataSource}
        onDataSourceChange={handleDataSourceChange}
        connectionStatus={connectionStatus}
        onTriggerRun={triggerRun}
        isLoadingRun={isLoadingRun}
        onExportReport={handleExport}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* 2. Main Center Deck */}
      <div className="center-deck">
        {/* Top 7-Stage Workflow Strip + Event Ticker */}
        <TopWorkflowStrip
          steps={steps}
          currentIteration={iteration}
          planStatus={plan?.status}
          simulationResult={simulation}
          connectionStatus={connectionStatus}
          dataSource={dataSource}
          latestAudit={latestAudit}
          isLoadingRun={isLoadingRun}
        />

        {/* Error Notice */}
        {errorMessage && (
          <div
            style={{
              padding: '0.65rem 1.25rem',
              background: 'var(--color-danger-bg)',
              borderBottom: '1px solid var(--color-danger-border)',
              color: 'var(--color-vermilion)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 300,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={clearError}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-vermilion)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Main Geospatial Command Deck (Command & Terrain Views) */}
        {(currentView === 'command' || currentView === 'terrain') && (
          <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
            {/* Dominant Central Map */}
            <RiskMap
              ref={mapRef}
              facilities={facilities}
              hotspots={hotspots}
              simulation={simulation}
              bbox={scenario?.bbox}
              selectedItem={selectedItem}
              onSelectItem={setSelectedItem}
              replayHour={replayHour}
              rainfall={scenario?.rainfall}
            />

            {/* Contextual Right Inspector */}
            <ContextualInspector
              selectedItem={selectedItem}
              onClose={() => setSelectedItem(null)}
              onFocusMap={handleFocusMap}
              plan={plan}
              simulation={simulation}
              hotspots={hotspots}
              facilities={facilities}
              onSelectItem={setSelectedItem}
            />
          </div>
        )}

        {/* View: Response Plan Lab */}
        {currentView === 'plan' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: 'var(--color-obsidian)' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <PlanActions plan={plan} isApproved={plan?.status === 'approved' || plan?.status === 'executed_sandbox'} />
            </div>
          </div>
        )}

        {/* View: Verification Lab */}
        {currentView === 'verification' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: 'var(--color-obsidian)' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <Reachability3DGauge simulation={simulation} threshold={simulation?.threshold || 0.8} />
              <ScoreComparison simulation={simulation} planStatus={plan?.status} iteration={iteration} />
            </div>
          </div>
        )}

        {/* View: Audit Trail */}
        {currentView === 'audit' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: 'var(--color-obsidian)' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" onClick={handleExport}>
                  Export Incident Dossier (.md)
                </Button>
              </div>
              <AuditTimeline auditEntries={auditEntries} />
            </div>
          </div>
        )}

        {/* Bottom Verification & Command Tray (Always visible in Command & Terrain views) */}
        {(currentView === 'command' || currentView === 'terrain') && (
          <BottomCommandTray
            simulation={simulation}
            plan={plan}
            rainfall={scenario?.rainfall}
            currentHour={replayHour}
            onHourChange={setReplayHour}
            onApprove={approvePlan}
            isApproving={isApproving}
            approvalResult={approvalResult}
            onOpenApprovalModal={() => setIsApprovalModalOpen(true)}
          />
        )}
      </div>

      {/* 3. Ctrl+K Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setCurrentView}
        onFocusMap={handleFocusMap}
        onTriggerRun={triggerRun}
        onExportReport={handleExport}
        hotspots={hotspots}
        facilities={facilities}
      />

      {/* 4. Operator Approval Gate Modal */}
      <Modal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        title="Authorize Pre-Flood Sandbox Intervention"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem', fontSize: '0.9rem' }}>
          <div
            style={{
              padding: '0.85rem',
              background: 'var(--color-warning-bg)',
              border: '1px solid var(--color-warning-border)',
              borderRadius: '6px',
              color: 'var(--color-amber)',
              display: 'flex',
              gap: '0.65rem',
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Human-in-the-Loop Operator Gate:</strong>
              <div style={{ marginTop: '2px', fontSize: '0.85rem', lineHeight: '1.4' }}>
                You are authorizing the execution of Plan <strong className="font-mono">{plan?.planId}</strong> in the sandbox. Confirm proposed road closures and pump deployments.
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--color-steel-blue)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '0.85rem',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Baseline Reachability:</span>
              <span className="font-mono">{((simulation?.baselineScore || 0) * 100).toFixed(1)}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Verified Plan Reachability:</span>
              <span className="font-mono" style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                {((simulation?.planScore || 0) * 100).toFixed(1)}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Proposed Mitigations:</span>
              <span>{plan?.actions?.length || 0} candidate actions</span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.35rem' }}>
              Authorization Note (Audit Log):
            </label>
            <textarea
              rows={2}
              value={operatorNote}
              onChange={(e) => setOperatorNote(e.target.value)}
              placeholder="e.g., Confirmed ORR diversion and Sarjapur pump coordinates with Mahadevapura control."
              style={{
                width: '100%',
                background: 'var(--color-deep-slate)',
                border: '1px solid var(--border-medium)',
                borderRadius: '4px',
                padding: '0.65rem',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="sandbox_confirm"
              checked={acknowledgedSandbox}
              onChange={(e) => setAcknowledgedSandbox(e.target.checked)}
              style={{ marginTop: '3px', cursor: 'pointer' }}
            />
            <label htmlFor="sandbox_confirm" style={{ fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
              I confirm verification results meet the 80% safety threshold and authorize sandbox execution.
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="outline" onClick={() => setIsApprovalModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="success"
              disabled={!acknowledgedSandbox || isApproving}
              loading={isApproving}
              onClick={handleConfirmApproval}
              icon={CheckCircle2}
            >
              Sign & Dispatch Sandbox
            </Button>
          </div>
        </div>
      </Modal>
    </div>
    </>
  );
}
