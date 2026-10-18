# API Reference

## TransGateAgent

Main class for interacting with the TransGate AI Agent Chrome extension.

### Constructor

```ts
const agent = new TransGateAgent();
```

Creates an agent instance and installs a `window` message listener. Its readiness promise waits only for the document to be complete or for `window.load`.

`isAvailable()`, `verify()`, `verifyCampaign()`, and `chat()` await page load. Only `isAvailable()` performs a bridge probe. `stop()` sends immediately, and `waitForResult()` simply registers a result waiter. Methods waiting for chat, conversation, or batch replies have no built-in response timeout. Use the [lifecycle and concurrency guidance](../README.md#lifecycle-and-concurrency); do not overlap pending operations on one instance.

---

### Methods

Operation examples below assume a successful `isAvailable()` check and one active flow per instance. Example schema/campaign IDs must be replaced with entries available to your deployment.

#### `isAvailable(timeout?: number): Promise<boolean>`

Check whether the TransGate AI Agent Chrome extension is installed and active in the current browser.

**Parameters:**

| Name | Type | Default | Description |
|---|---|---|---|
| `timeout` | `number` | `1000` | Response wait in milliseconds after page load; not a total deadline including load |

**Returns:** `Promise<boolean>` — `true` if the extension responds, `false` if it times out.

**Example:**

```js
const installed = await agent.isAvailable();
if (!installed) {
  agent.destroy();
  throw new Error('Extension bridge did not respond');
}
```

**Behavior:**

- Sends a `TRANSGATE_PING` message and waits for `TRANSGATE_PONG` from the extension's content script
- Does not involve the Service Worker — the bridge responds directly
- Safe to call multiple times; a reply is not a backend-health or authenticated extension-identity check

---

#### `verify(zkpassSchemaIds: string[]): Promise<BatchResult>`

Verify one or more schemas by zkPass schema IDs. Skips AI agent — triggers verification directly.

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `zkpassSchemaIds` | `string[]` | Array of zkPass schema IDs to verify |

**Returns:** `Promise<BatchResult>` — Resolves on a later `BATCH_RESULT` message. It does not independently verify completion or guarantee a result after stop.

**Example:**

```js
const result = await agent.verify(['925af1cca5bc4537b372cdfdc00b2a3b']);
```

**Behavior:**

- Posts `TRANSGATE_VERIFY_SCHEMA`; execution order and continuation after failure belong to the installed extension, not the SDK
- Forwards `status` messages and resolves/emits `result` on a `BATCH_RESULT` message
- Stores a single result waiter, with no timeout or per-request correlation
- Direct mode skips AI matching; it still depends on backend/zkPass verification preparation

---

#### `verifyCampaign(campaignId: number): Promise<BatchResult>`

Verify all schemas associated with a campaign. The extension fetches campaign data from the backend and runs batch verification.

**Prerequisites:** The backend must be running and must have a campaign with the given ID configured in the database. See [backend schema guide](https://github.com/zkPassOfficial/Transgate-AI-Agent/blob/main/backend/docs/schema.md) for how to set up campaigns.

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `campaignId` | `number` | Campaign ID from the backend database |

**Returns:** `Promise<BatchResult>` — Resolves when the bridge sends a `BATCH_RESULT` message for the active flow.

**Example:**

```js
const result = await agent.verifyCampaign(1);
console.log(result.campaign?.name); // "zkPass Airdrop Demo"
```

**Behavior:**

- Extension calls `GET /api/campaign/:id` to resolve campaign → schema IDs
- Then runs the same batch verification as `verify()`
- `BatchResult.campaign` contains the campaign info (`id` and `name`)

---

#### `chat(message: string): Promise<ChatResponse>`

Send a message to the AI agent. Returns when the agent replies.

**Prerequisites:** The backend must be running (the AI agent runs on the backend).

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `message` | `string` | Natural language message to send |

**Returns:** `Promise<ChatResponse>` — Resolves with the agent's reply.

**Example:**

```js
const res = await agent.chat('verify my twitter followers');
console.log(res.action); // 'verify_pending'
console.log(res.reply);  // 'I found a match. Proceed?'
```

**Behavior:**

- Each call is one turn of conversation
- The SDK manages `conversationId` internally — created lazily on first `chat()` call
- After a `BATCH_RESULT` (verification complete), the conversation resets automatically
- Emits `chatProgress` events during AI thinking
- Emits `chatResult` event and resolves the promise when the agent replies

**Chat actions:**

| Action | Meaning | Next Step |
|---|---|---|
| `chat` | General conversation, no verification | Continue chatting or done |
| `verify_pending` | Schema matched, waiting for user confirmation | Call `agent.chat('yes')` to confirm |
| `verify` | Verification is being started | Use a result waiter attached before the triggering confirmation; late attachment can miss a fast result |
| `clarify` | Ambiguous intent, agent needs more details | Send more details via `agent.chat(...)` |
| `none` | No matching schema found | Try different wording |
| `error` | Error occurred | Check `res.reply` for details |

---

#### `waitForResult(): Promise<BatchResult>`

Register a waiter for the next `BATCH_RESULT`. Attach it before the confirmation that can trigger verification; previously received results are not replayed. Do not call it alongside an existing `verify()` or `verifyCampaign()` waiter.

**Returns:** `Promise<BatchResult>` — Resolves when verification completes.

**Example:**

```js
// After receiving verify_pending and the user's confirmation:
const completion = agent.waitForResult();
const [res, result] = await Promise.all([agent.chat('yes'), completion]);
```

**Note:** No timeout is set. If confirmation does not start a batch, no result may arrive; the caller needs timeout/error handling and must not start another result wait on the same instance.

---

#### `stop(): void`

Post `TRANSGATE_STOP_VERIFICATION` immediately. The SDK does not await acknowledgement, cancel a backend request, or directly resolve/reject pending work. Any partial result or completion depends on the installed extension; the SDK does not guarantee a `BATCH_RESULT` after stop.

**Example:**

```js
agent.stop();
```

---

#### `destroy(): void`

Remove the main `window` message listener and reject currently registered chat/result waiters with `"Agent destroyed"`. This does not settle a conversation-initialization wait, send a stop message, or cancel backend/extension work. EventEmitter subscriptions and temporary availability listeners are not explicitly cleared by this method.

Call this when the agent is no longer needed to prevent memory leaks.

**Example:**

```js
agent.destroy();
```

---

#### `on<E extends EventType>(event: E, callback: (data: EventMap[E]) => void): () => void`

Subscribe to an event. Returns an unsubscribe function.

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `event` | `EventType` | Event name (see Events section) |
| `callback` | `(data: EventMap[E]) => void` | Typed event handler |

**Returns:** `() => void` — Call to unsubscribe.

**Example:**

```js
const off = agent.on('status', (status) => {
  console.log(status); // status is typed as string
});

off(); // unsubscribe
```

---

#### `off<E extends EventType>(event: E, callback: Function): void`

Unsubscribe a previously registered event handler.

**Example:**

```typescript
const handler = (status: string) => console.log(status);
agent.on('status', handler);
agent.off('status', handler);
```

---

### Events

#### `status`

Fired during verification with progress updates.

**Payload type:** `string`

```typescript
agent.on('status', (status: string) => {
  // "Verifying schema signature"
  // "Checking login status"
  // "Waiting for API requests to match"
  // "Generating proof"
  // "Verification 1/3: Twitter followers"  (batch mode)
});
```

---

#### `result`

Fired when all verifications complete (or are stopped).

**Payload type:** `BatchResult`

```typescript
agent.on('result', (data: BatchResult) => {
  // data.results — array of VerificationResult
  // data.campaign — CampaignInfo | undefined
});
```

---

#### `chatProgress`

Fired during AI progress text. Tokens arrive one by one via `step: 'token'`. Other steps indicate tool usage or analysis.

**Payload type:** `{ step: string, message: string }`

```js
agent.on('chatProgress', (data) => {
  if (data.step === 'token') {
    // Streamed progress text — append to display
  } else {
    // 'thinking', 'tool', 'analyzing' — status message
  }
});
```

---

#### `chatResult`

Fired when the AI agent replies. Contains the same data as the `chat()` promise resolution.

**Payload type:** `ChatResponse`

```typescript
agent.on('chatResult', (data: ChatResponse) => {
  console.log(data.action, data.reply);
});
```

---

#### `error`

Fired on `TRANSGATE_ERROR`. Rejects currently registered chat/result waiters, but not the separate conversation-initialization promise.

**Payload type:** `string`

```typescript
agent.on('error', (error: string) => {
  console.error(error);
});
```

---

### Types

#### `BatchResult`

```ts
interface BatchResult {
  results: VerificationResult[];
  campaign?: CampaignInfo;       // Present when triggered via verifyCampaign() or campaign chat
}
```

#### `VerificationResult`

```ts
interface VerificationResult {
  schemaId: string;    // zkPass schema ID
  title: string;       // Human-readable title
  success: boolean;    // Whether verification passed
  proof?: string;      // JSON proof string (present on success)
  error?: string;      // Error message (present on failure)
}
```

#### `ChatResponse`

```ts
interface ChatResponse {
  action: string;           // 'chat' | 'verify_pending' | 'verify' | 'clarify' | 'none' | 'error'
  reply: string;            // Agent's reply text (shown to user)
  schemaIds?: string[];     // Matched schema IDs (for verify_pending / verify)
  campaign?: CampaignInfo;  // Campaign info (if matched via campaign)
  thinking?: string;        // Optional extension-supplied text (not a guaranteed reasoning trace)
}
```

#### `CampaignInfo`

```ts
interface CampaignInfo {
  id: number;
  name: string;
}
```

#### `EventMap`

```ts
type EventMap = {
  status: string;
  result: BatchResult;
  chatProgress: { step: string; message: string };
  chatResult: ChatResponse;
  error: string;
};
```

#### `EventType`

```ts
type EventType = 'status' | 'result' | 'chatProgress' | 'chatResult' | 'error';
```

---

### Message Protocol

For developers who want to implement their own SDK or communicate with the extension directly without this library.

#### Sending messages (Webpage → Extension)

Use `window.postMessage` with `target: 'transgate-ai-agent'`:

```js
window.postMessage({
  target: 'transgate-ai-agent',
  type: 'TRANSGATE_*',
  // ... payload fields
}, '*');
```

| Type | Payload | Description |
|---|---|---|
| `TRANSGATE_PING` | — | Check if extension is installed |
| `TRANSGATE_CHAT` | `{ message, conversationId }` | Send chat message to AI agent |
| `TRANSGATE_VERIFY_SCHEMA` | `{ zkpassSchemaIds }` | Direct schema verification |
| `TRANSGATE_VERIFY_CAMPAIGN` | `{ campaignId }` | Campaign verification |
| `TRANSGATE_STOP_VERIFICATION` | — | Stop current verification |
| `TRANSGATE_NEW_CONVERSATION` | — | Create new conversation ID |

#### Receiving messages (Extension → Webpage)

Listen for same-window messages with `source: 'transgate-ai-agent'`. This marker is not authentication; any script on the same page can construct it:

```js
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.source !== 'transgate-ai-agent') return;
  console.log(event.data.type, event.data);
});
```

| Type | Payload | Description |
|---|---|---|
| `TRANSGATE_PONG` | — | Extension is installed |
| `TRANSGATE_RESPONSE` | `{ conversationId?, ok? }` | Acknowledgement |
| `TRANSGATE_CHAT_PROGRESS` | `{ step, message }` | AI progress text |
| `TRANSGATE_CHAT_RESULT` | `{ action, reply, schemaIds?, campaign? }` | AI agent reply |
| `TRANSGATE_STATUS_UPDATE` | `{ status }` | Verification progress |
| `TRANSGATE_BATCH_RESULT` | `{ results, campaign? }` | Verification complete |
| `TRANSGATE_ERROR` | `{ error }` | Error |

## Verification status

This reference was reconciled with `sdk/src/agent.ts`, `emitter.ts`, and `types.ts` using static inspection. No SDK build, browser integration, proof generation, or runtime test was performed. The example IDs and responses are illustrative; use entries that exist in your selected database and zkPass app.
