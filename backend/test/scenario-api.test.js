const assert = require('node:assert/strict');
const { after, before, describe, it } = require('node:test');

const { createApp } = require('../src/app');
const { replayScenarioBundle } = require('../src/data/replayScenario');
const { validateScenarioBundle } = require('../src/contracts/validation');

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

before(async () => {
  server = await listen(createApp());
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await close(server);
});

describe('replay scenario API', () => {
  it('returns a healthy replay-mode response with frontend CORS enabled', async () => {
    const response = await request('/api/health', {
      headers: { Origin: 'http://localhost:5173' },
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.deepEqual(await response.json(), {
      status: 'ok',
      service: 'floodshield-ops-backend',
      mode: 'replay',
    });
  });

  it('returns the stable replay bundle for the frontend scenario id', async () => {
    const response = await request('/api/scenario/blr-2022-09-replay');
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.scenario.scenarioId, 'blr-2022-09-replay');
    assert.equal(body.scenario.mode, 'replay');
    assert.equal(body.facilities.length, 6);
    assert.equal(body.hotspots.length, 4);
    assert.match(body.scenario.source, /Replay fixture/);
  });

  it('validates the scenario, facility, and hotspot structures', () => {
    const result = validateScenarioBundle(replayScenarioBundle);

    assert.equal(result.valid, true, result.errors.join('; '));
    assert.equal(replayScenarioBundle.scenario.bbox.south < replayScenarioBundle.scenario.bbox.north, true);
    assert.equal(replayScenarioBundle.facilities.every((facility) => facility.nodeId), true);
    assert.equal(replayScenarioBundle.hotspots.every((hotspot) => hotspot.riskScore >= 0 && hotspot.riskScore <= 1), true);
  });

  it('rejects invalid coordinates, risk scores, and required fields', () => {
    const invalidBundle = JSON.parse(JSON.stringify(replayScenarioBundle));
    invalidBundle.scenario.bbox.south = 91;
    invalidBundle.facilities[0].lat = -91;
    invalidBundle.facilities[0].nodeId = '';
    invalidBundle.hotspots[0].lng = 181;
    invalidBundle.hotspots[0].riskScore = 1.1;
    invalidBundle.hotspots[0].reasons = [''];

    const result = validateScenarioBundle(invalidBundle);

    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('scenario.bbox.south must be a latitude'));
    assert.ok(result.errors.includes('facilities[0].lat must be a latitude'));
    assert.ok(result.errors.includes('facilities[0].nodeId must be a non-empty string'));
    assert.ok(result.errors.includes('hotspots[0].lng must be a longitude'));
    assert.ok(result.errors.includes('hotspots[0].riskScore must be between 0 and 1'));
    assert.ok(result.errors.includes('hotspots[0].reasons must contain strings'));
  });

  it('rejects malformed scenario ids with a JSON 400 response', async () => {
    const response = await request('/api/scenario/bad%20scenario');
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.deepEqual(body, {
      error: 'invalid_scenario_id',
      message: 'scenarioId must be 1-128 characters using letters, numbers, dots, underscores, or hyphens.',
    });
  });

  it('returns a JSON 404 for an unknown but well-formed scenario id', async () => {
    const response = await request('/api/scenario/not-a-real-scenario');
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.error, 'scenario_not_found');
  });

  it('returns a JSON 400 when the request body is malformed', async () => {
    const response = await request('/api/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.deepEqual(body, {
      error: 'invalid_json',
      message: 'Request body must contain valid JSON.',
    });
  });

  it('fails closed when a configured fixture violates the contract', async () => {
    const invalidApp = createApp({ scenarios: { broken: { scenario: {} } } });
    const invalidServer = await listen(invalidApp);
    const invalidBaseUrl = `http://127.0.0.1:${invalidServer.address().port}`;

    try {
      const response = await fetch(`${invalidBaseUrl}/api/scenario/broken`);
      const body = await response.json();

      assert.equal(response.status, 500);
      assert.deepEqual(body, {
        error: 'invalid_scenario_fixture',
        message: 'Internal server error.',
        details: [
          'scenario.scenarioId must be a non-empty string',
          'scenario.mode must be "live" or "replay"',
          'scenario.areaName must be a non-empty string',
          'scenario.bbox must be an object',
          'scenario.rainfall must be an object',
          'scenario.source must be a non-empty string',
          'facilities must be an array',
          'hotspots must be an array',
        ],
      });
    } finally {
      await close(invalidServer);
    }
  });
});
