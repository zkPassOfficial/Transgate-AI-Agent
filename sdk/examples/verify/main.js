import { TransGateAgent } from '../../dist/index.js';

const output = document.getElementById('output');
const log = (msg) => { output.textContent += msg + '\n'; };

const agent = new TransGateAgent();

agent.on('status', (s) => log(`[status] ${s}`));
agent.on('error', (e) => log(`[error] ${e}`));

const installed = await agent.isAvailable();
if (!installed) {
  log('TransGate AI Agent extension is not installed.');
  throw new Error('Extension not installed');
}

// ⚠️ Replace with your own zkPass schema IDs
const schemaIds = [
  '925af1cca5bc4537b372cdfdc00b2a3b',  // Weatherstack demo (no login required)
];

log('Starting verification...');
const result = await agent.verify(schemaIds);

const passed = result.results.filter((r) => r.success).length;
log(`\nResult: ${passed}/${result.results.length} passed`);
result.results.forEach((r) => {
  log(`${r.success ? '✓' : '✗'} ${r.title}`);
  if (r.proof) log(r.proof);
});
