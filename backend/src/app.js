const cors = require('cors');
const express = require('express');

const { replayScenarioBundle } = require('./data/replayScenario');
const { validateScenarioBundle } = require('./contracts/validation');

const SCENARIO_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

function createApp({
  frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  scenarios = { [replayScenarioBundle.scenario.scenarioId]: replayScenarioBundle },
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
