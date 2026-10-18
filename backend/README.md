# TransGate AI Agent Backend

Express backend with LangGraph AI agent for intent parsing, schema matching, and zkPass task allocation.

## Setup

Run these commands from `backend/`. The root guide specifies Node.js 22+; `better-sqlite3` is a native dependency, so installation may require a compatible native build environment. This review did not install dependencies or verify a runtime version.

```bash
npm install
```

## Configuration

Both `src/config/config.dev.ts` and `src/config/config.prod.ts` are tracked. Review them privately instead of overwriting either file. `NODE_ENV=production` selects production; other values select development. The source does not automatically load OpenAI/zkPass settings from environment variables. The following is an **example config adaptation** that reads private process-environment values; it is not a claim that this adaptation is already installed. Do not commit real keys:

```ts
export default {
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: process.env.OPENAI_MODEL ?? '<model-supported-by-your-provider>',
  },
  zkpass: {
    devServer: 'https://dev.zkpass.org/v1',
    appId: process.env.ZKPASS_APP_ID ?? '',
  },
  db: {
    path: './db/data/transgate.db',
  },
  resolver: {
    recursionLimit: 10,
    timeoutMs: 30_000,
  },
};
```

> **Note:** Get your `appId` from [zkPass Dev](https://dev.zkpass.org). See [docs/schema.md](docs/schema.md) for details.

## Initialize Database

**Destructive demo operation:** `npm run seed` deletes every row from `campaign_schemas`, `campaigns`, and `schemas` in the database selected by the active config, then inserts the demo dataset. Use a disposable database or back up and explicitly review the replacement data first. It is not an incremental migration or a required step for every startup.

```bash
npm run seed
```

The configured database path resolves relative to the process working directory. Its parent directory and missing tables are created automatically by `getDb()`, including on normal server startup. Seeding replaces test schemas and campaigns; campaign IDs are autoincremented, so do not assume ID 1 after repeated seeds. Restart the backend after external data changes to refresh its startup-loaded summary cache. See [docs/schema.md](docs/schema.md) for how to add custom schemas.

## Run

```bash
# Development (with hot reload)
npm run dev

# Production
NODE_ENV=production npx tsx src/server.ts

# Or build first, then run
npm run build
NODE_ENV=production node dist/server.js
```

Default port: `3000`. Override with `PORT` env var.

## API

### POST /api/chat

SSE endpoint. Accepts natural language, returns schema matches via AI agent.

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-User-Address: 0xYourWalletAddress" \
  -d '{"message": "verify my twitter followers", "conversationId": "conv-1"}'
```

### POST /api/verify

Fetches zkPass schema + allocates verification task. Accepts either local `schemaId` or `zkpassSchemaId`.

```bash
# By local schema ID
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -H "X-User-Address: 0xYourWalletAddress" \
  -d '{"schemaId": "a7d5567181bc4ffeb87956f6e6bc74c0"}'

# By zkPass schema ID
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -H "X-User-Address: 0xYourWalletAddress" \
  -d '{"zkpassSchemaId": "7e068f51c9bc472fac28e07a901d446d"}'
```

### GET /api/campaign/:id

Returns `{ campaign: { id, name }, zkpassSchemaIds }`, ordered by campaign-schema display order. Invalid parsed IDs return 400 and missing campaigns return 404. This route does not use the address-header middleware or the chat/verify rate limit.

### GET /health

Returns static `{ "status": "ok" }`. It does not check the LLM, zkPass, or target websites.

### Access and external dependencies

`/api/chat` and `/api/verify` require a nonempty `X-User-Address` header; this is a presence check, not wallet-signature authentication. Each route gets its own in-memory limiter of 20 requests per address per 60 seconds. Limits reset on process restart and are not shared across replicas. CORS is unrestricted by the current `cors()` call.

Chat validates nonempty messages of at most 500 characters, then emits SSE `progress` and `result` events. It sends messages and optional page context through the configured LLM agent. The resolver's timeout/recursion settings apply to that agent flow; they are not universal HTTP or verification timeouts.

Verification preparation requires a matching local database row for **either** ID form, fetches the remote zkPass schema, and allocates a task through the configured zkPass service. The `/api/verify` examples above can allocate external work; they do not generate or validate a final proof on the backend. Local `schemaId` takes precedence when both IDs are supplied. Sample IDs are illustrative and may not exist in your database/app.

There is no general request-cancellation guarantee: chat disconnects suppress response writes, but the resolver has its own lifecycle. Protect access to the backend and its static test pages before exposing a deployment.

## Test Pages

| Page | URL | Description |
|---|---|---|
| API Test | `/test-api.html` | Direct backend API test (no extension needed) |
| Extension Test | `/test-extension.html` | Test extension external API with debug logs |
| OpenClaw | `/openclaw.html` | Chat interface for OpenClaw plugin integration |

## Validation status

No dependency installation, build, seed, server startup, LLM request, zkPass task allocation, or runtime test was performed for this documentation update. Neither backend nor SDK package defines a test script, and no tracked GitHub Actions workflow is present. The static pages are manual test clients and may call external services.

## Docs

- [docs/schema.md](docs/schema.md) — How to add custom verification schemas
