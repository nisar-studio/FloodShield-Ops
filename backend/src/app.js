const cors = require('cors');
const express = require('express');
const { randomUUID } = require('node:crypto');

const { replayScenarioBundle } = require('./data/replayScenario');
const {
  validatePlan,
  validateScenarioBundle,
  validateSimulationResult,
} = require('./contracts/validation');
const { createRunStore } = require('./runs/runStore');
const { createSimulatorClient } = require('./simulator/client');
const { createVerifier } = require('./verification/verifier');

const SCENARIO_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const APPROVAL_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const CONTROL_ROOM_OPERATOR = process.env.CONTROL_ROOM_OPERATOR || 'Control Room Operator';

function createCandidatePlan(scenarioId) {
  return {
    planId: `plan_${randomUUID()}`,
    scenarioId,
    iteration: 1,
    actions: [],
    status: 'proposed',
  };
}

function updateStep(steps, name, status, detail) {
  return steps.map((step) => (
    step.name === name ? { ...step, status, detail } : step
  ));
}

function appendAudit(runStore, runId, actor, event, payload) {
  runStore.appendAudit(runId, {
    ts: new Date().toISOString(),
    runId,
    actor,
    event,
    payload,
  });
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateApprovalRequest(body) {
  if (!isPlainObject(body)) {
    return { valid: false, message: 'Approval request must be a JSON object.' };
  }

  const allowedKeys = new Set(['approvedBy', 'note', 'approvedAt']);
  const unexpectedKey = Object.keys(body).find((key) => !allowedKeys.has(key));
  if (unexpectedKey) {
    return { valid: false, message: `Approval field '${unexpectedKey}' is not allowed.` };
  }
  if (typeof body.approvedBy !== 'string' || body.approvedBy.trim().length === 0) {
    return { valid: false, message: 'approvedBy must be a non-empty string.' };
  }
  if (typeof body.approvedAt !== 'string' || !APPROVAL_TIMESTAMP_PATTERN.test(body.approvedAt)) {
    return { valid: false, message: 'approvedAt must be an ISO 8601 UTC timestamp.' };
  }
  if (Number.isNaN(Date.parse(body.approvedAt))) {
    return { valid: false, message: 'approvedAt must be a valid ISO 8601 UTC timestamp.' };
  }
  if (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 1000)) {
    return { valid: false, message: 'note must be a string of at most 1000 characters.' };
  }

  return { valid: true };
}

function validateSandboxExecutionRequest(body) {
  if (!isPlainObject(body)) {
    return { valid: false, message: 'Sandbox execution request must be a JSON object.' };
  }

  const allowedKeys = new Set(['executedBy', 'executedAt']);
  const unexpectedKey = Object.keys(body).find((key) => !allowedKeys.has(key));
  if (unexpectedKey) {
    return { valid: false, message: `Sandbox field '${unexpectedKey}' is not allowed.` };
  }
  if (body.executedBy !== CONTROL_ROOM_OPERATOR) {
    return { valid: false, unauthorized: true, message: 'Sandbox execution is not authorized for this operator.' };
  }
  if (typeof body.executedAt !== 'string' || !APPROVAL_TIMESTAMP_PATTERN.test(body.executedAt)) {
    return { valid: false, message: 'executedAt must be an ISO 8601 UTC timestamp.' };
  }
  if (Number.isNaN(Date.parse(body.executedAt))) {
    return { valid: false, message: 'executedAt must be a valid ISO 8601 UTC timestamp.' };
  }

  return { valid: true };
}

async function executeInitialPlan({
  runId,
  scenarioId,
  scenarioBundle,
  runStore,
  simulatorClient,
  verifier,
}) {
  const plan = createCandidatePlan(scenarioId);
  runStore.updateRun(runId, (run) => ({
    ...run,
    status: 'running',
    plan,
    steps: updateStep(run.steps, 'SENSE', 'passed', 'Replay scenario loaded.'),
  }));
  appendAudit(runStore, runId, 'planner', 'plan_proposed', {
    planId: plan.planId,
    iteration: plan.iteration,
    actionCount: plan.actions.length,
  });

  let simulation;
  try {
    simulation = await simulatorClient.simulate({
      scenarioId,
      planId: plan.planId,
      actions: plan.actions,
    });
  } catch (error) {
    runStore.updateRun(runId, (run) => ({
      ...run,
      status: 'failed',
      steps: updateStep(run.steps, 'VERIFY', 'failed', error.message),
    }));
    appendAudit(runStore, runId, 'verifier', 'simulation_error', {
      planId: plan.planId,
      code: error.code || 'simulator_error',
      message: error.message,
    });
    return;
  }

  const simulationValidation = validateSimulationResult(simulation);
  const planValidation = validatePlan(plan);
  const verification = verifier.verify({
    plan,
    simulation,
    scenarioBundle,
  });

  if (!simulationValidation.valid || !planValidation.valid || !verification.verified) {
    const errors = [
      ...simulationValidation.errors,
      ...planValidation.errors,
      ...verification.errors,
    ];
    runStore.updateRun(runId, (run) => ({
      ...run,
      status: 'failed',
      simulation: null,
      plan: { ...plan, status: 'rejected' },
      steps: updateStep(run.steps, 'VERIFY', 'failed', errors.join('; ')),
    }));
    appendAudit(runStore, runId, 'verifier', 'verification_failed', {
      planId: plan.planId,
      errors,
    });
    return;
  }

  const passed = simulation.passed === true;
  const updatedPlan = { ...plan, status: passed ? 'verified' : 'rejected' };
  runStore.updateRun(runId, (run) => {
    let steps = updateStep(run.steps, 'ASSESS', 'passed', 'Synthetic hotspots assessed.');
    steps = updateStep(steps, 'PLAN', 'passed', 'Candidate plan generated.');
    steps = updateStep(
      steps,
      'VERIFY',
      passed ? 'passed' : 'failed',
      passed
        ? `Simulator reachability ${simulation.planScore} meets ${simulation.threshold}.`
        : `Simulator reachability ${simulation.planScore} is below ${simulation.threshold}.`,
    );
    steps = updateStep(
      steps,
      'REPLAN',
      passed ? 'disabled' : 'in_progress',
      passed ? 'Replanning is not required.' : 'Candidate plan requires revision.',
    );
    steps = updateStep(
      steps,
      'APPROVE',
      passed ? 'waiting_approval' : 'disabled',
      passed ? 'Awaiting explicit operator authorization.' : 'Approval blocked by failed verification.',
    );
    steps = updateStep(
      steps,
      'SANDBOX',
      'disabled',
      'Sandbox execution is locked until operator approval.',
    );
    return {
      ...run,
      status: passed ? 'waiting_approval' : 'replan_required',
      plan: updatedPlan,
      simulation,
      steps,
    };
  });
  appendAudit(runStore, runId, 'verifier', passed ? 'simulation_passed' : 'simulation_failed', {
    planId: plan.planId,
    baselineScore: simulation.baselineScore,
    planScore: simulation.planScore,
    threshold: simulation.threshold,
    passed: simulation.passed,
  });
}

function createApp({
  frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  scenarios = { [replayScenarioBundle.scenario.scenarioId]: replayScenarioBundle },
  runStore = createRunStore(),
  simulatorClient = process.env.SIMULATOR_BASE_URL
    ? createSimulatorClient()
    : null,
  verifier = createVerifier({ enabled: true }),
} = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: frontendOrigin }));
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'floodshield-ops-backend',
      mode: 'replay',
    });
  });

  app.get('/api/scenario/:scenarioId', (req, res, next) => {
    const { scenarioId } = req.params;

    if (!SCENARIO_ID_PATTERN.test(scenarioId)) {
      return res.status(400).json({
        error: 'invalid_scenario_id',
        message: 'scenarioId must be 1-128 characters using letters, numbers, dots, underscores, or hyphens.',
      });
    }

    const bundle = scenarios[scenarioId];
    if (!bundle) {
      return res.status(404).json({
        error: 'scenario_not_found',
        message: `No replay scenario exists for scenarioId "${scenarioId}".`,
      });
    }

    const validation = validateScenarioBundle(bundle);
    if (!validation.valid) {
      const error = new Error('Configured scenario failed contract validation.');
      error.statusCode = 500;
      error.code = 'invalid_scenario_fixture';
      error.details = validation.errors;
      return next(error);
    }

    return res.json(bundle);
  });

  app.post('/api/run', async (req, res, next) => {
    const body = req.body;
    const isObject = body !== null && typeof body === 'object' && !Array.isArray(body);

    if (!isObject || Object.keys(body).some((key) => key !== 'scenarioId')) {
      return res.status(400).json({
        error: 'invalid_run_request',
        message: 'Request body must contain only a scenarioId string.',
      });
    }

    const { scenarioId } = body;
    if (typeof scenarioId !== 'string' || !SCENARIO_ID_PATTERN.test(scenarioId)) {
      return res.status(400).json({
        error: 'invalid_run_request',
        message: 'scenarioId must be 1-128 characters using letters, numbers, dots, underscores, or hyphens.',
      });
    }

    const bundle = scenarios[scenarioId];
    if (!bundle) {
      return res.status(404).json({
        error: 'scenario_not_found',
        message: `No replay scenario exists for scenarioId "${scenarioId}".`,
      });
    }

    const validation = validateScenarioBundle(bundle);
    if (!validation.valid) {
      const error = new Error('Configured scenario failed contract validation.');
      error.statusCode = 500;
      error.code = 'invalid_scenario_fixture';
      error.details = validation.errors;
      return next(error);
    }

    const run = runStore.createRun(scenarioId);
    if (simulatorClient) {
      await executeInitialPlan({
        runId: run.runId,
        scenarioId,
        scenarioBundle: bundle,
        runStore,
        simulatorClient,
        verifier,
      });
    }
    return res.status(201).json({ runId: run.runId });
  });

  app.get('/api/run/:runId', (req, res) => {
    const run = runStore.getRun(req.params.runId);
    if (!run) {
      return res.status(404).json({
        error: 'run_not_found',
        message: `No run exists for runId "${req.params.runId}".`,
      });
    }

    return res.json(run);
  });

  app.post('/api/plan/:planId/approve', (req, res) => {
    const body = req.body;
    const approvalValidation = validateApprovalRequest(body);
    if (!approvalValidation.valid) {
      return res.status(400).json({
        error: 'invalid_approval_request',
        message: approvalValidation.message,
      });
    }
    if (body.approvedBy !== CONTROL_ROOM_OPERATOR) {
      return res.status(403).json({
        error: 'approval_not_authorized',
        message: 'Approval is restricted to the configured control-room operator.',
      });
    }

    const run = runStore.findRunByPlanId(req.params.planId);
    if (!run) {
      return res.status(404).json({
        error: 'plan_not_found',
        message: `No plan exists for planId "${req.params.planId}".`,
      });
    }
    if (run.plan.status !== 'verified') {
      return res.status(409).json({
        error: 'plan_not_verified',
        message: 'Only a simulator-verified plan can be approved.',
      });
    }

    runStore.updateRun(run.runId, (current) => ({
      ...current,
      status: 'approved',
      plan: { ...current.plan, status: 'approved' },
      steps: updateStep(
        current.steps,
        'APPROVE',
        'passed',
        'Approved by the control-room operator.',
      ),
    }));
    appendAudit(runStore, run.runId, 'operator', 'plan_approved', {
      planId: req.params.planId,
      note: typeof body.note === 'string' ? body.note : '',
      approvedBy: body.approvedBy,
      approvedAt: body.approvedAt,
    });
    runStore.updateRun(run.runId, (current) => ({
      ...current,
      steps: updateStep(
        current.steps,
        'SANDBOX',
        'pending',
        'Approved; awaiting explicit sandbox execution command.',
      ),
    }));
    return res.json(runStore.getRun(run.runId).plan);
  });

  app.post('/api/plan/:planId/execute-sandbox', (req, res) => {
    const body = req.body;
    const executionValidation = validateSandboxExecutionRequest(body);
    if (!executionValidation.valid) {
      return res.status(executionValidation.unauthorized ? 403 : 400).json({
        error: executionValidation.unauthorized
          ? 'sandbox_not_authorized'
          : 'invalid_sandbox_request',
        message: executionValidation.message,
      });
    }

    const run = runStore.findRunByPlanId(req.params.planId);
    if (!run) {
      return res.status(404).json({
        error: 'plan_not_found',
        message: `No plan exists for planId "${req.params.planId}".`,
      });
    }
    if (run.plan.status !== 'approved') {
      return res.status(409).json({
        error: 'plan_not_approved',
        message: 'Only an operator-approved plan can execute in the sandbox.',
      });
    }

    runStore.updateRun(run.runId, (current) => ({
      ...current,
      status: 'executed_sandbox',
      plan: { ...current.plan, status: 'executed_sandbox' },
      steps: updateStep(
        updateStep(
          current.steps,
          'APPROVE',
          'passed',
          'Approved by the control-room operator.',
        ),
        'SANDBOX',
        'in_progress',
        'Executing sandbox-only actions; no external dispatch is performed.',
      ),
    }));
    appendAudit(runStore, run.runId, 'operator', 'sandbox_execution_started', {
      planId: req.params.planId,
      executedBy: body.executedBy,
      executedAt: body.executedAt,
      simulatedOnly: true,
    });
    const updated = runStore.updateRun(run.runId, (current) => ({
      ...current,
      steps: updateStep(
        current.steps,
        'SANDBOX',
        'passed',
        'Sandbox-only actions recorded; no external dispatch was performed.',
      ),
    }));
    appendAudit(runStore, run.runId, 'operator', 'sandbox_execution_completed', {
      planId: req.params.planId,
      executedBy: body.executedBy,
      executedAt: body.executedAt,
      simulatedOnly: true,
    });
    return res.json(updated.plan);
  });

  app.get('/api/audit', (req, res) => {
    const runId = typeof req.query.runId === 'string' ? req.query.runId : null;
    if (!runId) return res.json([]);

    const audit = runStore.getAudit(runId);
    if (!audit) {
      return res.status(404).json({
        error: 'run_not_found',
        message: `No run exists for runId "${runId}".`,
      });
    }
    return res.json(audit);
  });

  app.use((req, res) => {
    res.status(404).json({
      error: 'not_found',
      message: `No route for ${req.method} ${req.originalUrl}.`,
    });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({
        error: 'invalid_json',
        message: 'Request body must contain valid JSON.',
      });
    }

    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
    const response = {
      error: error.code || 'internal_server_error',
      message: statusCode >= 500 ? 'Internal server error.' : error.message,
    };
    if (error.details) response.details = error.details;
    return res.status(statusCode).json(response);
  });

  return app;
}

module.exports = { createApp };
