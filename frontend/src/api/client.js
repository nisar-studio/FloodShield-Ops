/**
 * FloodShield Ops - Central API Client
 * 
 * Strict contract implementation based on AGENTS.md
 * Integrates with Mohammed Nisaruddin's Express Backend and Uttham's Python Simulator.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const DEFAULT_TIMEOUT_MS = 8000;

class ApiError extends Error {
  constructor(message, status = null, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Universal fetch wrapper with timeout, JSON parsing, and detailed error mapping.
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    // Read response text first in case it's not valid JSON
    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (err) {
        data = { raw: text };
      }
    }

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `HTTP error ${response.status}: ${response.statusText}`;
      throw new ApiError(errorMsg, response.status, data);
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new ApiError(`Request timed out after ${options.timeoutMs || DEFAULT_TIMEOUT_MS}ms (${url})`, 408);
    }
    if (err instanceof ApiError) {
      throw err;
    }
    // Network error or CORS issue
    throw new ApiError(`Network or connection error connecting to ${API_BASE_URL}. Ensure backend is running and CORS is enabled. Original: ${err.message}`, 0);
  }
}

export const apiClient = {
  getBaseUrl() {
    return API_BASE_URL;
  },

  /**
   * Health check to detect whether the Express backend is alive.
   */
  async checkHealth() {
    try {
      const res = await apiRequest('/api/health', { timeoutMs: 3000 });
      return { connected: true, data: res };
    } catch (err) {
      // If /api/health doesn't exist, try root or scenario
      try {
        await apiRequest('/api/scenario/health-probe', { timeoutMs: 2500 });
        return { connected: true, data: { status: 'ok' } };
      } catch (innerErr) {
        // If HTTP 404/400 was returned, backend IS alive and responding!
        if (innerErr.status && innerErr.status >= 400 && innerErr.status < 500) {
          return { connected: true, status: innerErr.status };
        }
        return { connected: false, error: innerErr.message };
      }
    }
  },

  /**
   * GET /api/scenario/:scenarioId
   * Returns Scenario object with facilities and hotspots.
   */
  async getScenario(scenarioId) {
    if (!scenarioId) throw new Error('scenarioId is required');
    return await apiRequest(`/api/scenario/${encodeURIComponent(scenarioId)}`);
  },

  /**
   * POST /api/run
   * Submits a run request for the orchestrator to sense, assess, plan, and verify.
   * Body: { scenarioId: string }
   * Returns: { runId: string }
   */
  async startRun(scenarioId) {
    if (!scenarioId) throw new Error('scenarioId is required to start a run');
    return await apiRequest('/api/run', {
      method: 'POST',
      body: JSON.stringify({ scenarioId }),
    });
  },

  /**
   * GET /api/run/:runId
   * Returns: { status, steps: [], plan, simulation }
   */
  async getRunStatus(runId) {
    if (!runId) throw new Error('runId is required');
    return await apiRequest(`/api/run/${encodeURIComponent(runId)}`);
  },

  /**
   * POST /api/plan/:planId/approve
   * Requires verified plan before dispatch.
   * Returns the updated Plan object (status: 'approved' or 'executed_sandbox').
   */
  async approvePlan(planId, operatorNote = '') {
    if (!planId) throw new Error('planId is required to approve a plan');
    return await apiRequest(`/api/plan/${encodeURIComponent(planId)}/approve`, {
      method: 'POST',
      body: JSON.stringify({
        approvedBy: 'Control Room Operator',
        note: operatorNote || 'Operator manual sign-off for sandbox pre-flood execution',
        approvedAt: new Date().toISOString(),
      }),
    });
  },

  /**
   * GET /api/audit?runId=...
   * Returns AuditEntry[]: { ts, runId, actor, event, payload }
   */
  async getAuditLog(runId) {
    const query = runId ? `?runId=${encodeURIComponent(runId)}` : '';
    return await apiRequest(`/api/audit${query}`);
  },

  /* Simulator Direct Fallbacks (if querying simulator standalone) */
  async getSimulatorHotspots(scenarioId, simulatorBaseUrl = 'http://localhost:8000') {
    const res = await fetch(`${simulatorBaseUrl}/hotspots?scenarioId=${encodeURIComponent(scenarioId)}`);
    if (!res.ok) throw new Error(`Simulator error: ${res.statusText}`);
    return await res.json();
  },

  async getSimulatorFacilities(scenarioId, simulatorBaseUrl = 'http://localhost:8000') {
    const res = await fetch(`${simulatorBaseUrl}/facilities?scenarioId=${encodeURIComponent(scenarioId)}`);
    if (!res.ok) throw new Error(`Simulator error: ${res.statusText}`);
    return await res.json();
  },
};
