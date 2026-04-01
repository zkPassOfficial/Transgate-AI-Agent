import { TransGateAgent } from '../../dist/index.js';

const output = document.getElementById('output');
const log = (msg) => { output.textContent += msg + '\n'; };

const agent = new TransGateAgent();

// Accumulate thinking tokens into one line, update in place
let thinkingLine = '';
agent.on('chatProgress', (d) => {
  if (d.step === 'token') {
    thinkingLine += d.message;
    // Update last line in output
    const lines = output.textContent.split('\n');
    lines[lines.length - 1] = `[thinking] ${thinkingLine}`;
    output.textContent = lines.join('\n');
  } else {
    thinkingLine = '';
    log(`[${d.step}] ${d.message}`);
  }
});
agent.on('status', (s) => log(`[status] ${s}`));
agent.on('error', (e) => log(`[error] ${e}`));

// ⚠️ Replace with your own verification request
const message = 'verify my twitter followers';

log(`> ${message}`);
thinkingLine = '';
log(''); // empty line for thinking to fill
const res = await agent.chat(message);
log(`\n[agent] ${res.reply}`);

if (res.action === 'verify_pending') {
  log('\n> yes');
  thinkingLine = '';
  log('');
  await agent.chat('yes');
  const result = await agent.waitForResult();
  result.results.forEach((r) => {
    log(`\n${r.success ? '✓' : '✗'} ${r.title}`);
    if (r.proof) log(r.proof);
  });
}
