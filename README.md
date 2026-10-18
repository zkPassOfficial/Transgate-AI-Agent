<div align="center">

# TransGate AI Agent

**Use natural language to find and run configured zkPass verification workflows.**

AI Agent meets zero-knowledge proofs, powered by [zkPass](https://zkpass.org). Supported verification depends on configured schemas, compatible target websites, backend access, and the installed extension.

Just tell the agent what you want to prove. The intended flow connects schema matching, browser navigation, login detection, zkTLS data capture, and proof generation. Users still need to complete required logins and confirmations. This source review does not establish end-to-end privacy, trustlessness, or cryptographic correctness.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

</div>

## Demo

https://github.com/user-attachments/assets/1c9ebab2-f596-4a09-82f6-40d535a1f194

> **What's shown:** (1) Single schema — *"I want to verify I am a KOL"* → AI matches Twitter follower verification → proof generated. (2) Campaign — *"I want to attend zkPass airdrop"* → AI matches airdrop campaign → two schemas verified sequentially → aggregated results.

## Why TransGate AI Agent

Traditional verification systems require users to manually interpret workflows, understand underlying data structures, and coordinate execution step by step. This model does not scale to a world where autonomous agents, rather than humans, are the primary actors.

TransGate AI Agent introduces an autonomous execution layer — combining intelligent reasoning, resilient orchestration, and a programmable interface — evolving zkPass from a verification tool into a general-purpose, programmable trust infrastructure.

**What's new:**

- **Autonomous Intelligence Layer** — An AI agent capable of multi-step reasoning, contextual understanding, and adaptive execution. Interaction shifts from explicit instruction to intent-driven resolution.
- **Unified Execution Engine** — A pipeline that coordinates multi-stage verification. Recovery, cancellation, and proof correctness require end-to-end validation; the SDK does not itself verify proof contents.
- **Composable Orchestration Framework** — Configure schemas and campaigns for reuse through the Chrome extension and browser SDK. Compatibility depends on the target site and deployment.
- **Programmable Interface Layer** — A developer-centric SDK that exposes trust and verification as native, composable building blocks within any application.
- **Dual Interaction Model** — Designed for both human interaction and system-level integration, enabling seamless coordination between user-driven and programmatic execution.

## How It Works

```
User: "Verify my Twitter followers > 100"
  ↓
Chrome Extension (Side Panel) → Backend AI Agent → Schema Matching
  ↓
Extension navigates to Twitter → Login Detection → Request Interception
  ↓
zkTLS → Zero-Knowledge Proof Generation → Result
```

**Backend** — Express server with a LangGraph AI agent. Understands natural language, matches it to verification schemas and campaigns, and allocates zkPass tasks.

**Extension** — Chrome extension (Manifest V3) with a Side Panel chat UI. Handles browser automation, login detection, HTTP request interception, batch verification, and zkTLS proof generation.

**SDK** — JavaScript/TypeScript SDK for third-party webpages to trigger verification without building their own extension integration.

## Quick Start

### 1. Set up the backend

```bash
cd backend
npm install
```

Review the existing `src/config/config.dev.ts` and `src/config/config.prod.ts` privately; both are tracked in this checkout. `NODE_ENV=production` selects the latter; all other values select development. Do not overwrite one with the other or commit real API keys. See [backend configuration](backend/README.md#configuration) for a placeholder-only example and environment-injection caveat.

For an **empty, disposable demo database only**, you may load the sample schemas. **`npm run seed` deletes all existing schemas, campaigns, and campaign-schema links in the selected database before inserting samples.** Confirm the selected config/database and back up needed data first. Normal server startup creates missing tables without clearing existing data, so seeding is not mandatory for startup.

```bash
npm run seed
```

Start the server:

```bash
# Development
npm run dev

# Production
NODE_ENV=production npx tsx src/server.ts
```

The backend runs on `http://localhost:3000` by default.

### 2. Configure the extension

Edit `extension/config.json` to point to your backend:

```json
{
  "apiBase": "http://localhost:3000"
}
```

If your backend runs on a remote server, use its URL:

```json
{
  "apiBase": "http://your-server-ip:3000"
}
```

### 3. Load the extension in Chrome

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` directory
5. The TransGate AI Agent icon appears in your toolbar

### 4. Use it

Click the extension icon to open the Side Panel. Type what you want to verify:

- "Verify my Twitter followers"
- "Prove I completed Binance KYC"
- "I want to participate in the airdrop"

The agent will find the matching schema (or campaign), ask for confirmation, then run the full verification flow automatically.

## SDK Integration

Third-party webpages can integrate via the [TransGate Agent SDK](sdk/):

```js
// After building sdk/, use the browser-served ESM output.
import { TransGateAgent } from './sdk/dist/index.js';

const agent = new TransGateAgent();
if (!(await agent.isAvailable())) {
  agent.destroy();
  throw new Error('Extension bridge did not respond');
}

// Direct verification
const result = await agent.verify(['zkpass-schema-id-1', 'zkpass-schema-id-2']);

// Campaign verification
const campaignResult = await agent.verifyCampaign(1); // replace with your actual campaign ID

// AI-powered chat
const res = await agent.chat('verify my twitter followers');
```

The constructor only waits for page load. `isAvailable()` probes the page bridge; it does not verify backend health. Verification/chat methods have no response deadline, and one instance must not run overlapping result-producing operations. See [SDK lifecycle limits](sdk/README.md#lifecycle-and-concurrency).

Three modes:

| Mode | Use When |
|---|---|
| `verify(schemaIds)` | You know which zkPass schemas to verify |
| `verifyCampaign(id)` | You want to run a pre-defined campaign |
| `chat(message)` | Let the AI agent find the right schema |

See [sdk/README.md](sdk/README.md) for full documentation and examples.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ Chrome Extension                                     │
│                                                      │
│  Side Panel (React)  ←→  Service Worker              │
│  - Chat UI                - Backend API calls        │
│  - Verification progress  - Browser automation       │
│  - Auto confirm           - Login detection          │
│                           - Request interception     │
│                           - Batch verification       │
│                           - zkTLS proof generation   │
└───────────────┬──────────────────┬──────────────────┘
                │ SSE / REST       │ window.postMessage
                ▼                  ▼
┌──────────────────────────┐  ┌────────────────────────┐
│ Backend                   │  │ SDK / Webpage           │
│ (Express + LangGraph)     │  │                         │
│                           │  │  TransGateAgent          │
│  AI Agent → Intent parse  │  │  - verify()             │
│  Schema Search → SQLite   │  │  - verifyCampaign()     │
│  Campaign API             │  │  - chat()               │
│  zkPass → Task allocation │  │  - Events & Promises    │
└──────────────────────────┘  └────────────────────────┘
```

## Adding Custom Schemas

See [backend/docs/schema.md](backend/docs/schema.md) for a complete guide on:

- Creating schemas on zkPass Dev
- Configuring login detection and page navigation
- Adding schemas and campaigns to the database

## Project Structure

```
TransGate-AI-Agent/
├── backend/                    # Express + LangGraph backend (source)
│   ├── src/
│   │   ├── config/             # Environment configs
│   │   ├── db/                 # SQLite init + seed data
│   │   ├── middleware/         # Address-header presence + rate limiting
│   │   ├── routes/             # API endpoints (chat, verify, campaign)
│   │   ├── services/           # AI agent, resolver, tools, zkPass adapter
│   │   └── types/              # TypeScript types
│   ├── docs/                   # Documentation
│   └── public/                 # Test pages
├── extension/                  # Chrome extension (pre-built)
│   ├── config.json             # ← Edit this to set your backend URL
│   ├── manifest.json
│   ├── assets/
│   ├── sidepanel/
│   └── icons/
├── sdk/                        # JavaScript/TypeScript SDK (source)
│   ├── src/                    # SDK source code
│   ├── examples/               # Example pages (verify, chat, campaign)
│   └── docs/                   # API reference
└── LICENSE                     # Apache-2.0
```

## Requirements

- Node.js >= 22
- Chrome browser
- OpenAI API key (or compatible LLM API)
- zkPass Dev account ([sign up](https://dev.zkpass.org))

## Extension artifact and validation status

`extension/manifest.json` declares version **0.1.0**. The folder contains a prebuilt service worker, page bridge, side-panel assets, and a WASM asset. This checkout does not include an extension source project/build configuration or source maps that establish a reproducible source-to-bundle mapping. Backend and SDK source are available separately; their builds do not rebuild the extension.

The manifest requests broad host access (`<all_urls>`) and injects the bridge on matching HTTP(S) pages. Review the bundle and permissions in an isolated browser profile before enabling it on sensitive sessions. The backend receives chat messages and optional page context and invokes the configured LLM; verification preparation calls zkPass services. Do not describe this as an offline-only or independently audited privacy flow.

A manual integration check should cover page load versus bridge detection, missing extension/backend, each of the three modes, user login/confirmation, failed and stopped verification, missing replies, and repeated calls without overlapping pending promises. Validate schema selectors/navigation against the actual target site. Test the selected prebuilt extension version with the selected backend/SDK revisions and record them together.

No dependency install, build, backend startup, seed, API request, extension installation, proof generation, or runtime test was executed for this documentation update. No test script or tracked GitHub Actions workflow is present; external CI and published-package availability were not verified.

## License

Apache-2.0 — see [LICENSE](LICENSE)
