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
  X
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
  const [currentTheme, setCurrentTheme] = useState('dark'); // 'dark' | 'light'
  const [selectedHotspotId, setSelectedHotspotId] = useState(null);
  const [simulatedHour, setSimulatedHour] = useState(6);

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
      {/* 1. Minimal Header */}
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

      {/* 2. Spacious Tabbed Navigation */}
      <nav className="nav-tab-container">
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <LayoutDashboard size={18} />
          <span>Mission Command</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'spatial' ? 'active' : ''}`}
          onClick={() => setActiveTab('spatial')}
        >
          <Map size={18} />
          <span>Spatial Geo-Intelligence ({hotspots.length} Hotspots)</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'verification' ? 'active' : ''}`}
          onClick={() => setActiveTab('verification')}
        >
          <BrainCircuit size={18} />
          <span>AI Mitigations & Verification</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <History size={18} />
          <span>Incident Audit Trail ({auditEntries.length})</span>
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab(activeTab === 'all' ? 'overview' : 'all')}
            title="Toggle full 3-column command grid"
          >
            <Grid3X3 size={18} />
            <span>{activeTab === 'all' ? 'Tabbed View' : 'All Panels'}</span>
          </button>
        </div>
      </nav>

      {/* Dismissible Error Notice */}
      {errorMessage && (
        <div
          style={{
            maxWidth: '1720px',
            margin: '1rem auto 0 auto',
            width: 'calc(100% - 4rem)',
            padding: '0.85rem 1.25rem',
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            borderRadius: '8px',
            color: 'var(--color-danger)',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={20} />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-danger)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* 3. Main Views */}
      <div className="view-container">
        {/* TAB 1: Mission Command */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '1.5rem' }}>
              <Reachability3DGauge simulation={simulation} threshold={simulation?.threshold || 0.8} />
              <RainfallTimelineScrubber rainfall={scenario?.rainfall} onHourChange={setSimulatedHour} />
            </div>

            <WorkflowTracker steps={steps} currentIteration={iteration} planStatus={plan?.status} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '1.5rem', alignItems: 'start' }}>
            <RiskMap
              facilities={facilities}
              hotspots={hotspots}
              simulation={simulation}
              bbox={scenario?.bbox}
              selectedHotspotId={selectedHotspotId}
              onSelectHotspot={setSelectedHotspotId}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <HotspotList
                hotspots={hotspots}
                selectedHotspotId={selectedHotspotId}
                onSelectHotspot={setSelectedHotspotId}
              />
              <FacilityReachabilityList facilities={facilities} simulation={simulation} />
            </div>
          </div>
        )}

        {/* TAB 3: AI Mitigations & Verification */}
        {activeTab === 'verification' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
            <ScoreComparison
              simulation={simulation}
              planStatus={plan?.status}
              iteration={iteration}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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

        {/* TAB 4: Incident Audit Trail */}
        {activeTab === 'audit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="ops-btn ops-btn-primary"
                onClick={handleExport}
              >
                Export Incident Dossier (.md)
              </button>
            </div>
            <AuditTimeline auditEntries={auditEntries} />
          </div>
        )}

        {/* Expanded Grid Mode */}
        {activeTab === 'all' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <Reachability3DGauge simulation={simulation} threshold={simulation?.threshold || 0.8} />
            <WorkflowTracker steps={steps} currentIteration={iteration} planStatus={plan?.status} />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '360px 1fr 420px',
                gap: '1.5rem',
                alignItems: 'start',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <HotspotList
                  hotspots={hotspots}
                  selectedHotspotId={selectedHotspotId}
                  onSelectHotspot={setSelectedHotspotId}
                />
                <FacilityReachabilityList facilities={facilities} simulation={simulation} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
