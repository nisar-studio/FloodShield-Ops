const { randomUUID } = require('node:crypto');

const INITIAL_STEPS = [
  {
    name: 'SENSE',
    status: 'pending',
    detail: 'Replay run queued; sensing is not executed in this milestone.',
  },
  {
    name: 'ASSESS',
    status: 'pending',
    detail: 'Risk assessment is not executed in this milestone.',
  },
  {
    name: 'PLAN',
    status: 'pending',
    detail: 'Candidate plan will be generated for deterministic verification.',
  },
  {
    name: 'VERIFY',
    status: 'pending',
    detail: 'Simulator verification is pending.',
  },
  {
    name: 'REPLAN',
    status: 'disabled',
    detail: 'Replanning is not enabled in this milestone.',
  },
  {
    name: 'APPROVE',
    status: 'disabled',
    detail: 'Human approval is unavailable until a plan is verified.',
  },
  {
    name: 'SANDBOX',
    status: 'disabled',
    detail: 'Sandbox execution is locked until operator approval.',
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createRunStore() {
  const runs = new Map();
  const auditEntries = new Map();

  return {
    createRun(scenarioId) {
      const run = {
        runId: `run_${randomUUID()}`,
        scenarioId,
        status: 'queued',
        steps: clone(INITIAL_STEPS),
        plan: null,
        simulation: null,
      };

      runs.set(run.runId, run);
      auditEntries.set(run.runId, []);
      return clone(run);
    },

    getRun(runId) {
      const run = runs.get(runId);
      return run ? clone(run) : null;
    },

    updateRun(runId, updater) {
      const current = runs.get(runId);
      if (!current) return null;

      const draft = clone(current);
      const updated = typeof updater === 'function' ? updater(draft) : updater;
      runs.set(runId, clone(updated));
      return clone(updated);
    },

    findRunByPlanId(planId) {
      for (const run of runs.values()) {
        if (run.plan?.planId === planId) return clone(run);
      }
      return null;
    },

    appendAudit(runId, entry) {
      if (!runs.has(runId)) return null;
      const entries = auditEntries.get(runId) || [];
      entries.push(clone(entry));
      auditEntries.set(runId, entries);
      return clone(entry);
    },

    getAudit(runId) {
      if (!runs.has(runId)) return null;
      return clone(auditEntries.get(runId) || []);
    },
  };
}

module.exports = { createRunStore };
