import React, { useState } from 'react';
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
import { AlertCircle, X } from 'lucide-react';

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

  const [selectedHotspotId, setSelectedHotspotId] = useState(null);

  const plan = currentRun?.plan;
  const simulation = currentRun?.simulation;
  const steps = currentRun?.steps || [];
  const iteration = plan?.iteration || 1;
  const isApproved =
    plan?.status === 'approved' ||
    plan?.status === 'executed_sandbox' ||
    approvalResult?.status === 'approved' ||
    approvalResult?.status === 'executed_sandbox';

  return (
    <div className="app-container">
      {/* 1. Header & Global Controls */}
      <ScenarioHeader
        scenario={scenario}
        connectionStatus={connectionStatus}
        dataSource={dataSource}
        onDataSourceChange={handleDataSourceChange}
        onTriggerRun={triggerRun}
        isLoadingRun={isLoadingRun}
      />

      {/* Optional Dismissible Error Notification */}
      {errorMessage && (
        <div
          style={{
            maxWidth: '1720px',
            margin: '0.75rem auto 0 auto',
            width: 'calc(100% - 2.5rem)',
            padding: '0.65rem 1rem',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '6px',
            color: '#fca5a5',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} color="#ef4444" />
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
              padding: '2px',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Operations Dashboard */}
      <main className="dashboard-layout" style={{ marginTop: '0.5rem' }}>
        {/* Left Column: Hotspots & Critical Facility Assets */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <HotspotList
            hotspots={hotspots}
            selectedHotspotId={selectedHotspotId}
            onSelectHotspot={setSelectedHotspotId}
          />
          <FacilityReachabilityList
            facilities={facilities}
            simulation={simulation}
          />
        </section>

        {/* Center Column: Workflow, Map & Deterministic Simulator Verification */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <WorkflowTracker
            steps={steps}
            currentIteration={iteration}
            planStatus={plan?.status}
          />
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
        </section>

        {/* Right Column: AI Mitigating Actions, Operator Approval Gate & Audit */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <ApprovalPanel
            plan={plan}
            simulation={simulation}
            onApprove={approvePlan}
            isApproving={isApproving}
            approvalResult={approvalResult}
          />
          <PlanActions
            plan={plan}
            isApproved={isApproved}
          />
          <AuditTimeline
            auditEntries={auditEntries}
          />
        </section>
      </main>
    </div>
  );
}
