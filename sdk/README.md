# TransGate Agent SDK

JavaScript/TypeScript SDK for integrating with the [TransGate AI Agent](https://github.com/zkPassOfficial/Transgate-AI-Agent) Chrome extension. Provides a page-message interface to an installed compatible extension on supported browser pages; the SDK itself does not generate or validate proofs.

## Installation

### From source

```bash
cd sdk
npm install
npm run build
```

Then import from `dist/`:

```js
import { TransGateAgent } from './dist/index.js';
```

### npm

The package metadata uses `@zkpass/transgate-agent-sdk`, but publication status was not verified. The instructions below use the checked-in source build and do not assume an npm release exists.

### Script tag

After building from source, reference the ESM bundle:

```html
<script type="module">
  import { TransGateAgent } from '/path/to/sdk/dist/index.js';
</script>
```

## Prerequisites

1. **TransGate AI Agent Chrome extension** must be installed in the user's browser. The extension handles all browser automation, zkTLS, and proof generation. Without it, SDK calls will not receive responses.

2. **Backend server** must be running for chat, campaign lookup, and verification payload/task preparation. Direct verification skips AI matching but still needs backend/zkPass preparation. See [backend setup](https://github.com/zkPassOfficial/Transgate-AI-Agent/tree/main/backend) for instructions.

> **Note:** The constructor waits for `document.readyState === 'complete'` or `window.load`, not for the extension. Call `isAvailable()` before starting work. After page load, a missing bridge can leave verification/chat promises pending because those methods have no response timeout.

> **Browser support:** Chrome only. The SDK communicates with a Chrome extension via `window.postMessage`.

## Quick Start

```js
import { TransGateAgent } from './dist/index.js';

const agent = new TransGateAgent();
if (!(await agent.isAvailable())) {
  agent.destroy();
  throw new Error('Extension bridge did not respond');
}
```

The example explicitly probes the bridge after page load. The probe is a message response check, not proof of extension identity, backend health, or verification readiness.

### Check Extension Availability

```js
const installed = await agent.isAvailable();
if (!installed) {
  agent.destroy();
  throw new Error('Please install or enable the TransGate AI Agent extension');
}
```

## Three Modes

### 1. Direct Verify

Verify one or more schemas by zkPass schema IDs. No AI agent involved — goes straight to verification.

```js
const agent = new TransGateAgent();
if (!(await agent.isAvailable())) {
  agent.destroy();
  throw new Error('Extension bridge did not respond');
}

// Listen for progress (optional)
agent.on('status', (status) => {
  console.log('Progress:', status);
});

// Verify — returns when all schemas are done
const result = await agent.verify([
  '7e068f51c9bc472fac28e07a901d446d',
  '6cc0b5af94fa45faab1e1a47f0df13dd',
]);

console.log(`${result.results.filter(r => r.success).length} passed`);
result.results.forEach((r) => {
  console.log(`${r.success ? '✓' : '✗'} ${r.title}`);
  if (r.proof) console.log(r.proof);
});
```

### 2. Campaign Verify

Verify all schemas in a pre-defined campaign by campaign ID. Requires the backend to have a campaign configured with the matching ID.

```js
const agent = new TransGateAgent();
if (!(await agent.isAvailable())) {
  agent.destroy();
  throw new Error('Extension bridge did not respond');
}

agent.on('status', (status) => {
  console.log('Progress:', status);
});

const result = await agent.verifyCampaign(1);

console.log(`Campaign: ${result.campaign?.name}`);
console.log(`${result.results.filter(r => r.success).length}/${result.results.length} passed`);
```

### 3. Chat (AI Recommend)

Let the AI agent find the right schema through natural language conversation. Requires the backend server to be running.

```js
const agent = new TransGateAgent();
if (!(await agent.isAvailable())) {
  agent.destroy();
  throw new Error('Extension bridge did not respond');
}

agent.on('chatProgress', (data) => {
  console.log('Thinking:', data.message);
});

// Ask the AI agent
const res = await agent.chat('verify my twitter followers');
console.log(`Agent: ${res.reply}`);

// If the agent found a match, confirm
if (res.action === 'verify_pending') {
  // Register before confirmation so a fast batch result is not missed.
  const completion = agent.waitForResult();
  const [, result] = await Promise.all([agent.chat('yes'), completion]);
  result.results.forEach((r) => {
    console.log(`${r.success ? '✓' : '✗'} ${r.title}`);
  });
}
```

Chat is multi-turn. The agent may ask for clarification:

```js
const res = await agent.chat('verify KYC');
// res.action === 'clarify'
// res.reply === 'I found KYC on multiple platforms. Which one?'

const res2 = await agent.chat('Binance');
// res2.action === 'verify_pending'
```

## Events

Subscribe to events for real-time updates. `on()` returns an unsubscribe function:

```js
const off = agent.on('status', (status) => { console.log(status); });
off(); // unsubscribe
```

| Event | Data Type | When |
|---|---|---|
| `status` | `string` | Verification progress step |
| `result` | `BatchResult` | All verifications complete |
| `chatProgress` | `{ step: string, message: string }` | AI agent thinking |
| `chatResult` | `ChatResponse` | AI agent replied |
| `error` | `string` | Error occurred |

## Control

```js
// Request a stop; this does not itself settle pending promises
agent.stop();

// Remove the main window listener and reject registered chat/result waiters
agent.destroy();
```

## Error Handling

Errors surface in two ways:

```js
// 1. Promise rejection
try {
  const result = await agent.verify(['invalid-id']);
} catch (err) {
  console.error(err.message);
}

// 2. Error event
agent.on('error', (error) => {
  console.error('Error:', error);
});
```

## Build from Source

```bash
cd sdk
npm install
npm run build
```

Output in `dist/`:
- `index.js` — ESM
- `index.cjs` — CommonJS
- `index.d.ts` — TypeScript declarations

## Examples

See [examples/](examples/) for illustrative integration pages (not runtime-verified by this review):

- [examples/verify/](examples/verify/) — Direct verification
- [examples/chat/](examples/chat/) — AI-powered chat flow
- [examples/campaign/](examples/campaign/) — Campaign verification

To run examples, serve the SDK directory over HTTP:

```bash
cd sdk
npx serve . -l 5000
```

Then open `http://localhost:5000/examples/verify/` in a browser with the extension installed.

## Lifecycle and concurrency

- `isAvailable(timeout = 1000)` starts its response timer **after page load**. It sends PING and accepts a same-window PONG-marked response; it does not check backend or provider availability.
- `verify()`, `verifyCampaign()`, `chat()`, conversation initialization, and `waitForResult()` do not set response deadlines. An application needs its own timeout/error UI; a `Promise.race` timeout alone does not cancel extension work.
- One instance stores only one result resolver and one chat resolver. Overlapping verification/campaign/result waits can overwrite each other. Serialize operations and attach `waitForResult()` before a confirmation that may start a batch; there is no stored last-result replay.
- `stop()` only posts `TRANSGATE_STOP_VERIFICATION`. Promise completion depends on a later bridge response; stop acknowledgement/result delivery is not guaranteed by the SDK.
- `destroy()` removes the main message listener and rejects currently registered chat/result waiters. It does not send stop, clear event subscriptions, cancel backend work, or settle a chat still awaiting its conversation-initialization acknowledgement. Do not reuse a destroyed instance.
- Messages are not correlated with per-request IDs. The SDK checks `event.source === window` and a source marker, not an authenticated extension identity; same-page scripts can post matching messages. Treat the page context as trusted and verify proof outputs through the intended application verification process.

No dependency install, build, extension/provider call, or automated test was run for this documentation revision. There is no `test` script or tracked GitHub Actions workflow in this checkout.

## API Reference

See [docs/api-reference.md](docs/api-reference.md) for the complete API documentation including all method signatures, event payloads, TypeScript types, and the underlying message protocol.
