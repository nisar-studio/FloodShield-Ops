const assert = require('node:assert/strict');
const { after, before, describe, it } = require('node:test');

const { createApp } = require('../src/app');

let server;
let baseUrl;

function listen(app) {
  return new Promise((resolve) => {
    const httpServer = app.listen(0, '127.0.0.1', () => resolve(httpServer));
  });
}

function close(httpServer) {
  return new Promise((resolve, reject) => {
    httpServer.close((error) => (error ? reject(error) : resolve()));
  });
}

async function request(path, options) {
  return fetch(`${baseUrl}${path}`, options);
}

function simulationFor(input, overrides = {}) {
  return {
    planId: input.planId,
    baselineScore: 5 / 6,
    planScore: 5 / 6,
    threshold: 0.8,
    passed: true,
    perFacility: [
      'fac_001',
      'fac_002',
      'fac_003',
      'fac_004',
      'fac_005',
      'fac_006',
    ].map((facilityId) => ({
      facilityId,
      reachableBefore: facilityId !== 'fac_003',
      reachableAfter: facilityId !== 'fac_003',
      minutesBefore: facilityId === 'fac_003' ? null : 15,
      minutesAfter: facilityId === 'fac_003' ? null : 15,
    })),
    floodedEdgeIds: ['edge_002', 'edge_003'],
    ...overrides,
  };
}

async function startIntegrationRun(simulatorClient) {
  const integrationServer = await listen(createApp({ simulatorClient }));
  const integrationBaseUrl = `http://127.0.0.1:${integrationServer.address().port}`;
  const createResponse = await fetch(`${integrationBaseUrl}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId: 'blr-2022-09-replay' }),
  });
  const { runId } = await createResponse.json();
  return { integrationServer, integrationBaseUrl, createResponse, runId };
}

before(async () => {
  server = await listen(createApp());
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await close(server);
});

describe('run lifecycle API', () => {
  it('creates a queued run for the replay scenario', async () => {
    const response = await request('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId: 'blr-2022-09-replay' }),
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.match(body.runId, /^run_[0-9a-f-]{36}$/);
  });

  it('retrieves the created run with a non-executable lifecycle state', async () => {
    const createResponse = await request('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId: 'blr-2022-09-replay' }),
    });
    const { runId } = await createResponse.json();

    const response = await request(`/api/run/${encodeURIComponent(runId)}`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.runId, runId);
    assert.equal(body.scenarioId, 'blr-2022-09-replay');
    assert.equal(body.status, 'queued');
    assert.equal(body.plan, null);
    assert.equal(body.simulation, null);
    assert.ok(Array.isArray(body.steps));
    assert.equal(body.steps.find((step) => step.name === 'PLAN').status, 'pending');
    assert.equal(body.steps.find((step) => step.name === 'VERIFY').status, 'pending');
    assert.equal(body.steps.find((step) => step.name === 'APPROVE').status, 'disabled');
    assert.equal(body.steps.find((step) => step.name === 'SANDBOX').status, 'disabled');
  });

  it('returns a JSON 404 for an unknown run id', async () => {
    const response = await request('/api/run/run_unknown');
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.deepEqual(body, {
      error: 'run_not_found',
      message: 'No run exists for runId "run_unknown".',
    });
  });

  it('rejects missing, malformed, and extra run request fields', async () => {
    const invalidBodies = [
      {},
      { scenarioId: 42 },
      { scenarioId: 'bad scenario' },
      { scenarioId: 'blr-2022-09-replay', extra: true },
    ];

    for (const invalidBody of invalidBodies) {
      const response = await request('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidBody),
      });
      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.error, 'invalid_run_request');
    }
  });

  it('returns a JSON 404 when creating a run for an unknown scenario', async () => {
    const response = await request('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId: 'not-a-real-scenario' }),
    });
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.error, 'scenario_not_found');
  });

  it('integrates a simulator result before exposing operator approval', async () => {
    const simulatorCalls = [];
    const simulatorClient = {
      async simulate(input) {
        simulatorCalls.push(input);
        return simulationFor(input);
      },
    };
    const integrationServer = await listen(createApp({ simulatorClient }));
    const integrationBaseUrl = `http://127.0.0.1:${integrationServer.address().port}`;

    try {
      const createResponse = await fetch(`${integrationBaseUrl}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: 'blr-2022-09-replay' }),
      });
      const { runId } = await createResponse.json();
      const runResponse = await fetch(`${integrationBaseUrl}/api/run/${runId}`);
      const run = await runResponse.json();

      assert.equal(createResponse.status, 201);
      assert.equal(runResponse.status, 200);
      assert.equal(simulatorCalls.length, 1);
      assert.equal(simulatorCalls[0].scenarioId, 'blr-2022-09-replay');
      assert.deepEqual(simulatorCalls[0].actions, []);
      assert.equal(run.status, 'waiting_approval');
      assert.equal(run.plan.status, 'verified');
      assert.equal(run.simulation.passed, true);
      assert.equal(run.steps.find((step) => step.name === 'VERIFY').status, 'passed');
      assert.equal(run.steps.find((step) => step.name === 'APPROVE').status, 'waiting_approval');

      const auditResponse = await fetch(`${integrationBaseUrl}/api/audit?runId=${runId}`);
      const audit = await auditResponse.json();
      assert.equal(auditResponse.status, 200);
      assert.deepEqual(audit.map((entry) => entry.event), [
        'plan_proposed',
        'simulation_passed',
      ]);

      const malformedApprovalResponse = await fetch(
        `${integrationBaseUrl}/api/plan/${run.plan.planId}/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approvedBy: 'Control Room Operator' }),
        },
      );
      assert.equal(malformedApprovalResponse.status, 400);
      assert.equal((await malformedApprovalResponse.json()).error, 'invalid_approval_request');

      const unauthorizedApprovalResponse = await fetch(
        `${integrationBaseUrl}/api/plan/${run.plan.planId}/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            approvedBy: 'Unrecognized Operator',
            approvedAt: new Date().toISOString(),
          }),
        },
      );
      assert.equal(unauthorizedApprovalResponse.status, 403);
      assert.equal((await unauthorizedApprovalResponse.json()).error, 'approval_not_authorized');

      const earlySandboxResponse = await fetch(
        `${integrationBaseUrl}/api/plan/${run.plan.planId}/execute-sandbox`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            executedBy: 'Control Room Operator',
            executedAt: new Date().toISOString(),
          }),
        },
      );
      assert.equal(earlySandboxResponse.status, 409);
      assert.equal((await earlySandboxResponse.json()).error, 'plan_not_approved');

      const approveResponse = await fetch(
        `${integrationBaseUrl}/api/plan/${run.plan.planId}/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            approvedBy: 'Control Room Operator',
            approvedAt: new Date().toISOString(),
            note: 'Approved for the sandbox gate.',
          }),
        },
      );
      const approvedPlan = await approveResponse.json();
      assert.equal(approveResponse.status, 200);
      assert.equal(approvedPlan.status, 'approved');

      const executeResponse = await fetch(
        `${integrationBaseUrl}/api/plan/${run.plan.planId}/execute-sandbox`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            executedBy: 'Control Room Operator',
            executedAt: new Date().toISOString(),
          }),
        },
      );
      const executedPlan = await executeResponse.json();
      assert.equal(executeResponse.status, 200);
      assert.equal(executedPlan.status, 'executed_sandbox');

      const executedRun = await (await fetch(`${integrationBaseUrl}/api/run/${runId}`)).json();
      assert.equal(executedRun.status, 'executed_sandbox');
      assert.equal(executedRun.steps.find((step) => step.name === 'SANDBOX').status, 'passed');
      const finalAudit = await (await fetch(`${integrationBaseUrl}/api/audit?runId=${runId}`)).json();
      assert.deepEqual(finalAudit.map((entry) => entry.event), [
        'plan_proposed',
        'simulation_passed',
        'plan_approved',
        'sandbox_execution_started',
        'sandbox_execution_completed',
      ]);
    } finally {
      await close(integrationServer);
    }
  });

  it('fails closed when the simulator is unavailable', async () => {
    const simulatorClient = {
      async simulate() {
        const error = new Error('simulator offline');
        error.code = 'simulator_unavailable';
        throw error;
      },
    };
    const { integrationServer, integrationBaseUrl, runId } = await startIntegrationRun(simulatorClient);

    try {
      const run = await (await fetch(`${integrationBaseUrl}/api/run/${runId}`)).json();
      assert.equal(run.status, 'failed');
      assert.equal(run.plan.status, 'proposed');
      assert.equal(run.simulation, null);
      assert.equal(run.steps.find((step) => step.name === 'VERIFY').status, 'failed');

      const approval = await fetch(`${integrationBaseUrl}/api/plan/${run.plan.planId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedBy: 'Control Room Operator',
          approvedAt: new Date().toISOString(),
        }),
      });
      assert.equal(approval.status, 409);
      assert.equal((await approval.json()).error, 'plan_not_verified');
    } finally {
      await close(integrationServer);
    }
  });

  it('fails closed when the simulator returns malformed output', async () => {
    const simulatorClient = { async simulate() { return {}; } };
    const { integrationServer, integrationBaseUrl, runId } = await startIntegrationRun(simulatorClient);

    try {
      const run = await (await fetch(`${integrationBaseUrl}/api/run/${runId}`)).json();
      assert.equal(run.status, 'failed');
      assert.equal(run.plan.status, 'rejected');
      assert.equal(run.simulation, null);
      assert.equal(run.steps.find((step) => step.name === 'VERIFY').status, 'failed');
      const audit = await (await fetch(`${integrationBaseUrl}/api/audit?runId=${runId}`)).json();
      assert.equal(audit.at(-1).event, 'verification_failed');
    } finally {
      await close(integrationServer);
    }
  });

  it('blocks approval when simulation fails its threshold', async () => {
    const simulatorClient = {
      async simulate(input) {
        return simulationFor(input, { planScore: 0.5, passed: false });
      },
    };
    const { integrationServer, integrationBaseUrl, runId } = await startIntegrationRun(simulatorClient);

    try {
      const run = await (await fetch(`${integrationBaseUrl}/api/run/${runId}`)).json();
      assert.equal(run.status, 'replan_required');
      assert.equal(run.plan.status, 'rejected');
      assert.equal(run.simulation.passed, false);
      assert.equal(run.steps.find((step) => step.name === 'APPROVE').status, 'disabled');

      const approval = await fetch(`${integrationBaseUrl}/api/plan/${run.plan.planId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedBy: 'Control Room Operator',
          approvedAt: new Date().toISOString(),
        }),
      });
      assert.equal(approval.status, 409);
      assert.equal((await approval.json()).error, 'plan_not_verified');
    } finally {
      await close(integrationServer);
    }
  });

  it('fails closed when verification rejects the simulator result', async () => {
    const simulatorClient = {
      async simulate(input) {
        return simulationFor(input, { planId: 'plan_not_the_candidate' });
      },
    };
    const { integrationServer, integrationBaseUrl, runId } = await startIntegrationRun(simulatorClient);

    try {
      const run = await (await fetch(`${integrationBaseUrl}/api/run/${runId}`)).json();
      assert.equal(run.status, 'failed');
      assert.equal(run.plan.status, 'rejected');
      assert.equal(run.simulation, null);
      assert.equal(run.steps.find((step) => step.name === 'VERIFY').status, 'failed');

      const approval = await fetch(`${integrationBaseUrl}/api/plan/${run.plan.planId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedBy: 'Control Room Operator',
          approvedAt: new Date().toISOString(),
        }),
      });
      assert.equal(approval.status, 409);
      assert.equal((await approval.json()).error, 'plan_not_verified');
    } finally {
      await close(integrationServer);
    }
  });
});
