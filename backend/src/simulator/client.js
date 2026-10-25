const DEFAULT_SIMULATOR_BASE_URL = 'http://127.0.0.1:8000';

function createSimulatorClient({
  baseUrl = process.env.SIMULATOR_BASE_URL || DEFAULT_SIMULATOR_BASE_URL,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required for simulator integration.');
  }

  return {
    async simulate({ scenarioId, planId, actions, threshold } = {}) {
      const body = { scenarioId, planId, actions };
      if (threshold !== undefined) body.threshold = threshold;

      let response;
      try {
        response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/simulate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
        });
      } catch (error) {
        const wrapped = new Error(`Simulator request failed: ${error.message}`);
        wrapped.code = 'simulator_unavailable';
        wrapped.statusCode = 502;
        throw wrapped;
      }

      const text = await response.text();
      let payload = null;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch (error) {
          const wrapped = new Error('Simulator returned invalid JSON.');
          wrapped.code = 'invalid_simulator_response';
          wrapped.statusCode = 502;
          throw wrapped;
        }
      }

      if (!response.ok) {
        const simulatorError = payload?.error;
        const wrapped = new Error(
          simulatorError?.message || `Simulator returned HTTP ${response.status}.`,
        );
        wrapped.code = simulatorError?.code || 'simulator_error';
        wrapped.statusCode = 502;
        wrapped.details = simulatorError;
        throw wrapped;
      }

      return payload;
    },
  };
}

module.exports = { createSimulatorClient };
