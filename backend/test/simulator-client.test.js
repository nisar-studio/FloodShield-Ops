const assert = require('node:assert/strict');
const http = require('node:http');
const { describe, it } = require('node:test');

const { createSimulatorClient } = require('../src/simulator/client');

function listen(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function baseUrl(server) {
  return `http://127.0.0.1:${server.address().port}`;
}

describe('simulator HTTP client', () => {
  it('posts the simulation request and parses a successful response', async () => {
    const server = await listen((req, res) => {
      assert.equal(req.method, 'POST');
      assert.equal(req.url, '/simulate');

      let requestBody = '';
      req.on('data', (chunk) => { requestBody += chunk; });
      req.on('end', () => {
        const body = JSON.parse(requestBody);
        assert.deepEqual(body, {
          scenarioId: 'blr-2022-09-replay',
          planId: 'plan_001',
          actions: [],
          threshold: 0.8,
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ planId: 'plan_001', passed: true }));
      });
    });

    try {
      const client = createSimulatorClient({ baseUrl: baseUrl(server), timeoutMs: 500 });
      const result = await client.simulate({
        scenarioId: 'blr-2022-09-replay',
        planId: 'plan_001',
        actions: [],
        threshold: 0.8,
      });
      assert.deepEqual(result, { planId: 'plan_001', passed: true });
    } finally {
      await close(server);
    }
  });

  it('fails closed when the simulator returns malformed JSON', async () => {
    const server = await listen((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{');
    });

    try {
      const client = createSimulatorClient({ baseUrl: baseUrl(server), timeoutMs: 500 });
      await assert.rejects(
        client.simulate({ scenarioId: 'blr-2022-09-replay', actions: [] }),
        (error) => error.code === 'invalid_simulator_response',
      );
    } finally {
      await close(server);
    }
  });

  it('preserves structured simulator errors from non-success responses', async () => {
    const server = await listen((_req, res) => {
      res.writeHead(422, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: {
          code: 'UNSUPPORTED_ACTION',
          message: 'Action type is not supported.',
          actionId: 'act_001',
        },
      }));
    });

    try {
      const client = createSimulatorClient({ baseUrl: baseUrl(server), timeoutMs: 500 });
      await assert.rejects(
        client.simulate({ scenarioId: 'blr-2022-09-replay', actions: [] }),
        (error) => (
          error.code === 'UNSUPPORTED_ACTION'
          && error.details.actionId === 'act_001'
        ),
      );
    } finally {
      await close(server);
    }
  });

  it('reports connection failures as simulator_unavailable', async () => {
    const server = await listen(() => {});
    const url = baseUrl(server);
    await close(server);

    const client = createSimulatorClient({ baseUrl: url, timeoutMs: 500 });
    await assert.rejects(
      client.simulate({ scenarioId: 'blr-2022-09-replay', actions: [] }),
      (error) => error.code === 'simulator_unavailable',
    );
  });

  it('aborts a simulator request that exceeds the configured timeout', async () => {
    const server = await listen((req, res) => {
      const timer = setTimeout(() => res.end('{}'), 1000);
      req.on('close', () => clearTimeout(timer));
    });

    try {
      const client = createSimulatorClient({ baseUrl: baseUrl(server), timeoutMs: 25 });
      await assert.rejects(
        client.simulate({ scenarioId: 'blr-2022-09-replay', actions: [] }),
        (error) => error.code === 'simulator_timeout',
      );
    } finally {
      await close(server);
    }
  });
});
