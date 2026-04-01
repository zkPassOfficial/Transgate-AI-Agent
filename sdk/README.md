# TransGate Agent SDK

JavaScript/TypeScript SDK for integrating with the [TransGate AI Agent](https://github.com/zkPassOfficial/Transgate-AI-Agent) Chrome extension. Enables zero-knowledge proof verification from any webpage.

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

> **Not yet published.** npm installation will be available in a future release.

### Script tag

After building from source, reference the ESM bundle:

```html
<script type="module">
  import { TransGateAgent } from '/path/to/sdk/dist/index.js';
</script>
```

## Prerequisites

1. **TransGate AI Agent Chrome extension** must be installed in the user's browser. The extension handles all browser automation, zkTLS, and proof generation. Without it, SDK calls will not receive responses.

2. **Backend server** must be running for chat and campaign modes. See [backend setup](https://github.com/zkPassOfficial/Transgate-AI-Agent/tree/main/backend) for instructions.

> **Note:** If the extension is not installed, SDK methods (`verify()`, `verifyCampaign()`, `chat()`) will not resolve — the internal ready check waits for the extension's content script, which never loads without the extension.

> **Browser support:** Chrome only. The SDK communicates with a Chrome extension via `window.postMessage`.

## Quick Start

```js
import { TransGateAgent } from '@zkpass/transgate-agent-sdk';

const agent = new TransGateAgent();
```

The SDK automatically waits for the extension's content script to be ready before sending any messages. No manual initialization needed.

## Three Modes

### 1. Direct Verify

Verify one or more schemas by zkPass schema IDs. No AI agent involved — goes straight to verification.

```js
const agent = new TransGateAgent();

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

agent.on('chatProgress', (data) => {
  console.log('Thinking:', data.message);
});

// Ask the AI agent
const res = await agent.chat('verify my twitter followers');
console.log(`Agent: ${res.reply}`);

// If the agent found a match, confirm
if (res.action === 'verify_pending') {
  await agent.chat('yes');
  const result = await agent.waitForResult();
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
const off = agent.on('status', (status) => { ... });
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
// Stop current verification
agent.stop();

// Clean up when done (removes window listener)
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

See [examples/](examples/) for complete working examples:

- [examples/verify/](examples/verify/) — Direct verification
- [examples/chat/](examples/chat/) — AI-powered chat flow
- [examples/campaign/](examples/campaign/) — Campaign verification

To run examples, serve the SDK directory over HTTP:

```bash
cd sdk
npx serve . -l 5000
```

Then open `http://localhost:5000/examples/verify/` in a browser with the extension installed.

## API Reference

See [docs/api-reference.md](docs/api-reference.md) for the complete API documentation including all method signatures, event payloads, TypeScript types, and the underlying message protocol.
