# TransGate AI Agent Backend

Express backend with LangGraph AI agent for intent parsing, schema matching, and zkPass task allocation.

## Setup

```bash
npm install
```

## Configuration

Copy `src/config/config.dev.ts` and create `src/config/config.prod.ts` with your keys:

```ts
export default {
  openai: {
    apiKey: 'your-openai-api-key',
    model: 'gpt-5.4-mini',
  },
  zkpass: {
    devServer: 'https://dev.zkpass.org/v1',
    appId: 'your-app-id-from-zkpass-dev',
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

```bash
npm run seed
```

The `db/data/` directory is created automatically. This inserts test schemas and campaigns. See [docs/schema.md](docs/schema.md) for how to add custom schemas.

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
  -H "X-User-Id: test-user" \
  -d '{"message": "verify my twitter followers", "conversationId": "conv-1"}'
```

### POST /api/verify

Fetches zkPass schema + allocates verification task. Accepts either local `schemaId` or `zkpassSchemaId`.

```bash
# By local schema ID
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user" \
  -d '{"schemaId": "a7d5567181bc4ffeb87956f6e6bc74c0"}'

# By zkPass schema ID
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user" \
  -d '{"zkpassSchemaId": "7e068f51c9bc472fac28e07a901d446d"}'
```

### GET /health

Health check endpoint.

## Test Pages

| Page | URL | Description |
|---|---|---|
| API Test | `/test-api.html` | Direct backend API test (no extension needed) |
| Extension Test | `/test-extension.html` | Test extension external API with debug logs |
| OpenClaw | `/openclaw.html` | Chat interface for OpenClaw plugin integration |

## Docs

- [docs/schema.md](docs/schema.md) — How to add custom verification schemas
