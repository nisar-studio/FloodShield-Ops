const DEFAULT_SIMULATOR_BASE_URL = 'http://127.0.0.1:8000';
const DEFAULT_SIMULATOR_TIMEOUT_MS = 5000;

function normalizeTimeout(timeoutMs) {
  const value = Number(timeoutMs);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Simulator timeout must be a positive finite number of milliseconds.');
  }
  return value;
}

function createSimulatorClient({
  baseUrl = process.env.SIMULATOR_BASE_URL || DEFAULT_SIMULATOR_BASE_URL,
  fetchImpl = globalThis.fetch,
  timeoutMs = Number(process.env.SIMULATOR_TIMEOUT_MS || DEFAULT_SIMULATOR_TIMEOUT_MS),
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required for simulator integration.');
  }
  const timeout = normalizeTimeout(timeoutMs);

  return {
    async simulate({ scenarioId, planId, actions, threshold } = {}) {
      const body = { scenarioId, planId, actions };
      if (threshold !== undefined) body.threshold = threshold;

      const controller = new AbortController();
      let timeoutHandle;
      const timeoutPromise = new Promise((resolve, reject) => {
        timeoutHandle = setTimeout(() => {
          controller.abort();
          const error = new Error(`Simulator request timed out after ${timeout} ms.`);
          error.code = 'simulator_timeout';
          error.statusCode = 504;
          reject(error);
        }, timeout);
      });

      try {
        const response = await Promise.race([
          fetchImpl(`${baseUrl.replace(/\/$/, '')}/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
          }),
          timeoutPromise,
        ]);

        const text = await Promise.race([response.text(), timeoutPromise]);
        let payload = null;
        if (text) {
          try {
            payload = JSON.parse(text);
          } catch (error) {
            const wrapped = new Error('Simulator returned invalid JSON.');
            wrapped.code = 'invalid_simulator_response';
            wrapped.statusCode = 502;
            wrapped.clientError = true;
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
          wrapped.clientError = true;
          throw wrapped;
        }

        return payload;
      } catch (error) {
        if (error?.code === 'simulator_timeout' || error?.clientError) throw error;
        const wrapped = new Error(`Simulator request failed: ${error.message}`);
        wrapped.code = 'simulator_unavailable';
        wrapped.statusCode = 502;
        throw wrapped;
      } finally {
        clearTimeout(timeoutHandle);
      }
    },
  };
}

module.exports = { createSimulatorClient };
