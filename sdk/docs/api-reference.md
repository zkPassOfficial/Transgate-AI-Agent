# API Reference

## TransGateAgent

Main class for interacting with the TransGate AI Agent Chrome extension.

### Constructor

```ts
const agent = new TransGateAgent();
```

Creates a new agent instance. Sets up a `window` message event listener and waits for the extension's content script to be ready.

The SDK handles the readiness check internally — all public methods wait until the extension bridge is available before sending messages. If the extension is not installed, methods will not resolve (no timeout).

---

### Methods

#### `verify(zkpassSchemaIds: string[]): Promise<BatchResult>`

Verify one or more schemas by zkPass schema IDs. Skips AI agent — triggers verification directly.

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `zkpassSchemaIds` | `string[]` | Array of zkPass schema IDs to verify |

**Returns:** `Promise<BatchResult>` — Resolves when all schemas are verified (or stopped).

**Example:**

```js
const result = await agent.verify(['925af1cca5bc4537b372cdfdc00b2a3b']);
```

**Behavior:**

- Schemas are verified sequentially, one at a time
- If one schema fails, the next still runs (no abort on failure)
- Emits `status` events during verification
- Emits `result` event and resolves the promise when all complete

---

#### `verifyCampaign(campaignId: number): Promise<BatchResult>`

Verify all schemas associated with a campaign. The extension fetches campaign data from the backend and runs batch verification.

**Prerequisites:** The backend must be running and must have a campaign with the given ID configured in the database. See [backend schema guide](https://github.com/zkPassOfficial/Transgate-AI-Agent/blob/main/backend/docs/schema.md) for how to set up campaigns.

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `campaignId` | `number` | Campaign ID from the backend database |

**Returns:** `Promise<BatchResult>` — Resolves when all schemas in the campaign are verified.

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
| `verify` | User confirmed, verification starting | Call `agent.waitForResult()` for the result |
| `clarify` | Ambiguous intent, agent needs more details | Send more details via `agent.chat(...)` |
| `none` | No matching schema found | Try different wording |
| `error` | Error occurred | Check `res.reply` for details |

---

#### `waitForResult(): Promise<BatchResult>`

Wait for the next verification result. Use this after `chat()` triggers a verification (action is `verify`).

**Returns:** `Promise<BatchResult>` — Resolves when verification completes.

**Example:**

```js
const res = await agent.chat('yes'); // confirms verify_pending
// res.action === 'verify' — verification starts in background
const result = await agent.waitForResult(); // wait for it to finish
```

**Note:** If no verification is running, the promise will wait until the next `BATCH_RESULT` arrives.

---

#### `stop(): void`

Stop the current verification. The `BATCH_RESULT` will be emitted with results collected so far. If no schema has completed yet, `results` will be an empty array.

**Example:**

```js
agent.stop();
```

---

#### `destroy(): void`

Clean up the agent instance. Removes the `window` message event listener and rejects any pending promises with an `"Agent destroyed"` error.

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

```js
const handler = (status: string) => console.log(status);
agent.on('status', handler);
agent.off('status', handler);
```

---

### Events

#### `status`

Fired during verification with progress updates.

**Payload type:** `string`

```js
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

```js
agent.on('result', (data: BatchResult) => {
  // data.results — array of VerificationResult
  // data.campaign — CampaignInfo | undefined
});
```

---

#### `chatProgress`

Fired during AI agent thinking. Tokens arrive one by one via `step: 'token'`. Other steps indicate tool usage or analysis.

**Payload type:** `{ step: string, message: string }`

```js
agent.on('chatProgress', (data) => {
  if (data.step === 'token') {
    // Streaming thinking token — append to display
  } else {
    // 'thinking', 'tool', 'analyzing' — status message
  }
});
```

---

#### `chatResult`

Fired when the AI agent replies. Contains the same data as the `chat()` promise resolution.

**Payload type:** `ChatResponse`

```js
agent.on('chatResult', (data: ChatResponse) => {
  console.log(data.action, data.reply);
});
```

---

#### `error`

Fired when an error occurs. Also rejects any pending promises.

**Payload type:** `string`

```js
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
  thinking?: string;        // Agent's internal reasoning (if available)
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
| `TRANSGATE_CHAT` | `{ message, conversationId }` | Send chat message to AI agent |
| `TRANSGATE_VERIFY_SCHEMA` | `{ zkpassSchemaIds }` | Direct schema verification |
| `TRANSGATE_VERIFY_CAMPAIGN` | `{ campaignId }` | Campaign verification |
| `TRANSGATE_STOP_VERIFICATION` | — | Stop current verification |
| `TRANSGATE_NEW_CONVERSATION` | — | Create new conversation ID |

#### Receiving messages (Extension → Webpage)

Listen for messages with `source: 'transgate-ai-agent'`:

```js
window.addEventListener('message', (event) => {
  if (event.data?.source !== 'transgate-ai-agent') return;
  console.log(event.data.type, event.data);
});
```

| Type | Payload | Description |
|---|---|---|
| `TRANSGATE_RESPONSE` | `{ conversationId?, ok? }` | Acknowledgement |
| `TRANSGATE_CHAT_PROGRESS` | `{ step, message }` | AI agent thinking |
| `TRANSGATE_CHAT_RESULT` | `{ action, reply, schemaIds?, campaign? }` | AI agent reply |
| `TRANSGATE_STATUS_UPDATE` | `{ status }` | Verification progress |
| `TRANSGATE_BATCH_RESULT` | `{ results, campaign? }` | Verification complete |
| `TRANSGATE_ERROR` | `{ error }` | Error |
