import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../api/client';
import replayPassData from '../data/replayFallback.json';
import replayFailData from '../data/replayFailedPlan.json';
import replayAuditData from '../data/replayAuditEvents.json';

export function useOperationsRun() {
  const [dataSource, setDataSource] = useState('replay_pass'); // 'live' | 'replay_pass' | 'replay_fail'
  const [connectionStatus, setConnectionStatus] = useState({ connected: false, message: 'Checking backend...' });

  const [scenario, setScenario] = useState(replayPassData.scenario);
  const [facilities, setFacilities] = useState(replayPassData.facilities);
  const [hotspots, setHotspots] = useState(replayPassData.hotspots);

  const [currentRun, setCurrentRun] = useState(replayPassData.currentRun);
  const [auditEntries, setAuditEntries] = useState(replayAuditData);

  const [isLoadingRun, setIsLoadingRun] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalResult, setApprovalResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const pollingRef = useRef(null);

  // Periodically check live backend health
  useEffect(() => {
    let isMounted = true;
    async function checkBackend() {
      try {
        const res = await apiClient.checkHealth();
        if (isMounted) {
          if (res.connected) {
            setConnectionStatus({ connected: true, message: `Connected to Express Orchestrator (${apiClient.getBaseUrl()})` });
          } else {
            setConnectionStatus({ connected: false, message: `Backend offline at ${apiClient.getBaseUrl()}` });
          }
        }
      } catch (err) {
        if (isMounted) {
          setConnectionStatus({ connected: false, message: err.message });
        }
      }
    }

    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Handle source switching
  const handleDataSourceChange = useCallback((newSource) => {
    setDataSource(newSource);
    setErrorMessage(null);
    setApprovalResult(null);

    if (newSource === 'replay_pass') {
      setScenario(replayPassData.scenario);
      setFacilities(replayPassData.facilities);
      setHotspots(replayPassData.hotspots);
      setCurrentRun(replayPassData.currentRun);
      setAuditEntries(replayAuditData);
    } else if (newSource === 'replay_fail') {
      setScenario(replayFailData.scenario);
      setFacilities(replayFailData.facilities);
      setHotspots(replayFailData.hotspots);
      setCurrentRun(replayFailData.currentRun);
      setAuditEntries([
        {
          ts: new Date().toISOString(),
          runId: 'run_replay_fail_002',
          actor: 'sentinel',
          event: 'extreme_cloudburst_detected',
          payload: { totalMm: 160, hourlyMm: [15, 35, 60, 50] },
        },
        {
          ts: new Date().toISOString(),
          runId: 'run_replay_fail_002',
          actor: 'risk',
          event: 'severe_hotspots_scored',
          payload: { count: 3, maxRiskScore: 0.98 },
        },
        {
          ts: new Date().toISOString(),
          runId: 'run_replay_fail_002',
          actor: 'planner',
          event: 'plan_proposed',
          payload: { planId: 'plan_002_iter1', iteration: 1, actionCount: 2 },
        },
        {
          ts: new Date().toISOString(),
          runId: 'run_replay_fail_002',
          actor: 'verifier',
          event: 'simulation_failed',
          payload: {
            planId: 'plan_002_iter1',
            baselineScore: 0.333,
            planScore: 0.667,
            threshold: 0.80,
            passed: false,
            reason: 'Reachability score 66.7% strictly below 80.0% threshold. Critical facilities remaining cut off.',
          },
        },
        {
          ts: new Date().toISOString(),
          runId: 'run_replay_fail_002',
          actor: 'planner',
          event: 'replan_triggered',
          payload: {
            iteration: 2,
            targetThreshold: 0.80,
            feedback: 'Provide additional pump staging along Panathur & Sarjapur links.',
          },
        },
      ]);
    } else if (newSource === 'live') {
      // Load live scenario
      fetchLiveScenario();
    }
  }, []);

  // Fetch Live Scenario from Express Backend
  const fetchLiveScenario = async (scenarioId = 'blr-2022-09-replay') => {
    setIsLoadingRun(true);
    setErrorMessage(null);
    try {
      const data = await apiClient.getScenario(scenarioId);
      if (data) {
        setScenario(data.scenario || data);
        if (data.facilities) setFacilities(data.facilities);
        if (data.hotspots) setHotspots(data.hotspots);
      }
    } catch (err) {
      setErrorMessage(`Live API error fetching scenario: ${err.message}`);
    } finally {
      setIsLoadingRun(false);
    }
  };

  // Trigger Run
  const triggerRun = async () => {
    setIsLoadingRun(true);
    setErrorMessage(null);
    setApprovalResult(null);

    if (dataSource === 'live') {
      try {
        const scenarioId = scenario?.scenarioId || 'blr-2022-09-replay';
        const runRes = await apiClient.startRun(scenarioId);
        const runId = runRes?.runId;

        if (runId) {
          // Poll for run status until complete
          pollRunStatus(runId);
        } else {
          throw new Error('Backend did not return a valid runId');
        }
      } catch (err) {
        setErrorMessage(`Failed to start live run: ${err.message}`);
        setIsLoadingRun(false);
      }
    } else {
      // Replay mode: Simulate a run progression
      setTimeout(() => {
        setIsLoadingRun(false);
        // Refresh replay data
        if (dataSource === 'replay_pass') {
          setCurrentRun(replayPassData.currentRun);
        } else {
          setCurrentRun(replayFailData.currentRun);
        }
      }, 800);
    }
  };

  // Polling helper for live runs
  const pollRunStatus = (runId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    let attempts = 0;
    const maxAttempts = 30;

    pollingRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const runStatus = await apiClient.getRunStatus(runId);
        setCurrentRun(runStatus);

        // Also fetch latest audit trail
        try {
          const audit = await apiClient.getAuditLog(runId);
          if (Array.isArray(audit)) setAuditEntries(audit);
        } catch (auditErr) {
          // Silent non-blocking audit fetch error
        }

        if (
          runStatus.status === 'waiting_approval' ||
          runStatus.status === 'completed' ||
          runStatus.status === 'failed' ||
          runStatus.status === 'replan_required' ||
          attempts >= maxAttempts
        ) {
          clearInterval(pollingRef.current);
          setIsLoadingRun(false);
        }
      } catch (err) {
        setErrorMessage(`Polling run status error: ${err.message}`);
        clearInterval(pollingRef.current);
        setIsLoadingRun(false);
      }
    }, 2000);
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Operator Approval Handler
  const approvePlan = async (planId, operatorNote) => {
    setIsApproving(true);
    setErrorMessage(null);

    if (dataSource === 'live') {
      try {
        const updatedPlan = await apiClient.approvePlan(planId, operatorNote);
        setApprovalResult(updatedPlan);

        // Update plan status in current run
        setCurrentRun((prev) => ({
          ...prev,
          status: 'executed_sandbox',
          plan: {
            ...prev?.plan,
            status: updatedPlan?.status || 'approved',
          },
          steps: (prev?.steps || []).map((s) => {
            if (s.name === 'APPROVE') return { ...s, status: 'passed', detail: 'Approved by Control Room Operator' };
            if (s.name === 'SANDBOX') return { ...s, status: 'passed', detail: 'Executed in sandbox simulation' };
            return s;
          }),
        }));

        // Refresh audit log
        if (currentRun?.runId) {
          const audit = await apiClient.getAuditLog(currentRun.runId);
          if (Array.isArray(audit)) setAuditEntries(audit);
        }
      } catch (err) {
        setErrorMessage(`Approval rejected by backend: ${err.message}`);
      } finally {
        setIsApproving(false);
      }
    } else {
      // Replay mode authorization
      setTimeout(() => {
        const result = {
          planId,
          status: 'executed_sandbox',
          approvedBy: 'Control Room Operator (Replay)',
          approvedAt: new Date().toISOString(),
          note: operatorNote,
        };
        setApprovalResult(result);

        setCurrentRun((prev) => ({
          ...prev,
          status: 'executed_sandbox',
          plan: {
            ...prev?.plan,
            status: 'approved',
          },
          steps: (prev?.steps || []).map((s) => {
            if (s.name === 'APPROVE') return { ...s, status: 'passed', detail: 'Approved by Control Room Operator' };
            if (s.name === 'SANDBOX') return { ...s, status: 'passed', detail: 'Executed in sandbox simulation' };
            return s;
          }),
        }));

        // Append to audit entries
        setAuditEntries((prev) => [
          ...prev,
          {
            ts: new Date().toISOString(),
            runId: currentRun?.runId || 'run_replay_001',
            actor: 'operator',
            event: 'plan_approved',
            payload: { planId, note: operatorNote || 'Authorized for sandbox dispatch' },
          },
          {
            ts: new Date().toISOString(),
            runId: currentRun?.runId || 'run_replay_001',
            actor: 'operator',
            event: 'sandbox_dispatched',
            payload: { planId, status: 'executed_sandbox', simulatedOnly: true },
          },
        ]);

        setIsApproving(false);
      }, 600);
    }
  };

  return {
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
    clearError: () => setErrorMessage(null),
  };
}
