import React, { useState, useEffect } from 'react';
import { useOperationsRun } from './hooks/useOperationsRun';
import { ScenarioHeader } from './components/ScenarioHeader';
import { WorkflowTracker } from './components/WorkflowTracker';
import { RiskMap } from './components/RiskMap';
import { HotspotList } from './components/HotspotList';
import { FacilityReachabilityList } from './components/FacilityReachabilityList';
import { PlanActions } from './components/PlanActions';
import { ScoreComparison } from './components/ScoreComparison';
import { ApprovalPanel } from './components/ApprovalPanel';
import { AuditTimeline } from './components/AuditTimeline';
import { Reachability3DGauge } from './components/Reachability3DGauge';
import { RainfallTimelineScrubber } from './components/RainfallTimelineScrubber';
import { exportIncidentReport } from './utils/reportExporter';
import { 
  LayoutDashboard, 
  Map, 
  BrainCircuit, 
  History, 
  Grid3X3,
  AlertCircle, 
  X,
  Sparkles
} from 'lucide-react';

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

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'spatial' | 'verification' | 'audit' | 'all'
  const [currentTheme, setCurrentTheme] = useState('cyber'); // 'cyber' | 'tactical' | 'obsidian'
  const [selectedHotspotId, setSelectedHotspotId] = useState(null);
  const [simulatedHour, setSimulatedHour] = useState(6);

  // Sync theme with document root attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  const plan = currentRun?.plan;
  const simulation = currentRun?.simulation;
  const steps = currentRun?.steps || [];
  const iteration = plan?.iteration || 1;
  const isApproved =
    plan?.status === 'approved' ||
    plan?.status === 'executed_sandbox' ||
    approvalResult?.status === 'approved' ||
    approvalResult?.status === 'executed_sandbox';

  const handleExport = () => {
    exportIncidentReport({
      scenario,
      hotspots,
      facilities,
      currentRun,
      auditEntries,
    });
  };

  return (
    <div className="app-container">
      {/* 1. Header with Scenario, Source, Theme & Run Actions */}
      <ScenarioHeader
        scenario={scenario}
        connectionStatus={connectionStatus}
        dataSource={dataSource}
        onDataSourceChange={handleDataSourceChange}
        onTriggerRun={triggerRun}
        isLoadingRun={isLoadingRun}
        currentTheme={currentTheme}
        onThemeChange={setCurrentTheme}
        onExportReport={handleExport}
      />

      {/* 2. Spacious Tabbed Navigation (Prevents visual congestion) */}
      <nav className="nav-tab-container">
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <LayoutDashboard size={16} />
          <span>Mission Command</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'spatial' ? 'active' : ''}`}
          onClick={() => setActiveTab('spatial')}
        >
          <Map size={16} />
          <span>Spatial Geo-Intelligence ({hotspots.length} Hotspots)</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'verification' ? 'active' : ''}`}
          onClick={() => setActiveTab('verification')}
        >
          <BrainCircuit size={16} />
          <span>AI Mitigations & Verifier</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <History size={16} />
          <span>Incident Audit Trail ({auditEntries.length})</span>
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab(activeTab === 'all' ? 'overview' : 'all')}
            title="Toggle full 3-column command grid"
          >
            <Grid3X3 size={16} />
            <span>{activeTab === 'all' ? 'Tabbed Mode' : 'Expanded Grid'}</span>
          </button>
        </div>
      </nav>

      {/* Error Banner */}
      {errorMessage && (
        <div
          style={{
            maxWidth: '1720px',
            margin: '0.75rem auto 0 auto',
            width: 'calc(100% - 3rem)',
            padding: '0.65rem 1.25rem',
            background: 'rgba(239, 68, 68, 0.14)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '8px',
            color: '#fca5a5',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertCircle size={18} color="#ef4444" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fca5a5',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 3. Main Views (Spacious, Uncongested Layout) */}
      <div className="view-container">
        {/* TAB 1: Mission Command Overview */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* 3D Gauge & Storm Timeline Scrubber */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
              <Reachability3DGauge simulation={simulation} threshold={simulation?.threshold || 0.8} />
              <RainfallTimelineScrubber rainfall={scenario?.rainfall} onHourChange={setSimulatedHour} />
            </div>

            {/* Workflow Pipeline */}
            <WorkflowTracker steps={steps} currentIteration={iteration} planStatus={plan?.status} />

            {/* Operator Approval & Urgent Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
              <ApprovalPanel
                plan={plan}
                simulation={simulation}
                onApprove={approvePlan}
                isApproving={isApproving}
                approvalResult={approvalResult}
              />
              <PlanActions plan={plan} isApproved={isApproved} />
            </div>
          </div>
        )}

        {/* TAB 2: Spatial Geo-Intelligence */}
        {activeTab === 'spatial' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.25rem', alignItems: 'start' }}>
            <RiskMap
              facilities={facilities}
              hotspots={hotspots}
              simulation={simulation}
              bbox={scenario?.bbox}
              selectedHotspotId={selectedHotspotId}
              onSelectHotspot={setSelectedHotspotId}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <HotspotList
                hotspots={hotspots}
                selectedHotspotId={selectedHotspotId}
                onSelectHotspot={setSelectedHotspotId}
              />
              <FacilityReachabilityList facilities={facilities} simulation={simulation} />
            </div>
          </div>
        )}

        {/* TAB 3: AI Mitigations & Verifier Lab */}
        {activeTab === 'verification' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
            <ScoreComparison
              simulation={simulation}
              planStatus={plan?.status}
              iteration={iteration}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <PlanActions plan={plan} isApproved={isApproved} />
              <ApprovalPanel
                plan={plan}
                simulation={simulation}
                onApprove={approvePlan}
                isApproving={isApproving}
                approvalResult={approvalResult}
              />
            </div>
          </div>
        )}

        {/* TAB 4: Audit Log & Incident Trail */}
        {activeTab === 'audit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="ops-btn ops-btn-primary"
                onClick={handleExport}
              >
                Export Full Official Dossier (.md)
              </button>
            </div>
            <AuditTimeline auditEntries={auditEntries} />
          </div>
        )}

        {/* EXPANDED GRID VIEW (If operator toggles "Expanded Grid") */}
        {activeTab === 'all' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <Reachability3DGauge simulation={simulation} threshold={simulation?.threshold || 0.8} />
            <WorkflowTracker steps={steps} currentIteration={iteration} planStatus={plan?.status} />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '320px 1fr 380px',
                gap: '1.25rem',
                alignItems: 'start',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <HotspotList
                  hotspots={hotspots}
                  selectedHotspotId={selectedHotspotId}
                  onSelectHotspot={setSelectedHotspotId}
                />
                <FacilityReachabilityList facilities={facilities} simulation={simulation} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <RiskMap
                  facilities={facilities}
                  hotspots={hotspots}
                  simulation={simulation}
                  bbox={scenario?.bbox}
                  selectedHotspotId={selectedHotspotId}
                  onSelectHotspot={setSelectedHotspotId}
                />
                <ScoreComparison
                  simulation={simulation}
                  planStatus={plan?.status}
                  iteration={iteration}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <ApprovalPanel
                  plan={plan}
                  simulation={simulation}
                  onApprove={approvePlan}
                  isApproving={isApproving}
                  approvalResult={approvalResult}
                />
                <PlanActions plan={plan} isApproved={isApproved} />
                <AuditTimeline auditEntries={auditEntries} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
