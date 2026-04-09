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

// ⚠️ Replace with your own campaign ID from the backend database
const campaignId = 8;

log('Starting campaign...');
const result = await agent.verifyCampaign(campaignId);

const name = result.campaign?.name || 'Unknown';
const passed = result.results.filter((r) => r.success).length;
log(`\nCampaign: ${name} (${passed}/${result.results.length} passed)`);
result.results.forEach((r) => {
  log(`${r.success ? '✓' : '✗'} ${r.title}`);
  if (r.proof) log(r.proof);
});
