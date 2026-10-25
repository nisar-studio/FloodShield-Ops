const { createApp } = require('./app');
const { createSimulatorClient } = require('./simulator/client');

const port = Number(process.env.PORT || 3000);
const app = createApp({ simulatorClient: createSimulatorClient() });

app.listen(port, () => {
  console.log(`FloodShield Ops backend listening on http://localhost:${port}`);
});
