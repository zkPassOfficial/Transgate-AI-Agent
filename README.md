<div align="center">

# TransGate AI Agent

**Prove anything about yourself across the internet — privately and trustlessly.**

AI Agent meets zero-knowledge proofs. Autonomously verify anything across the internet — powered by [zkPass](https://zkpass.org)

Just tell the agent what you want to prove. It handles everything — schema matching, browser navigation, login detection, zkTLS data capture, and proof generation.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

</div>

## Demo

https://github.com/user-attachments/assets/44e3da60-1f25-4f4b-a92b-a2127c201f21

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

**Backend** — Express server with a LangGraph AI agent. Understands natural language, matches it to verification schemas, and allocates zkPass tasks.

**Extension** — Chrome extension (Manifest V3) with a Side Panel chat UI. Handles browser automation, login detection, HTTP request interception, and zkTLS proof generation.

## Quick Start

### 1. Set up the backend

```bash
cd backend
npm install
```

Create your production config (see [backend/README.md](backend/README.md) for details):

```bash
cp src/config/config.dev.ts src/config/config.prod.ts
# Edit config.prod.ts with your OpenAI API key and zkPass App ID
```

Initialize the database with test schemas:

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
- "Check my Binance balance"

The agent will find the matching schema, ask for confirmation, then run the full verification flow automatically.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ Chrome Extension                                     │
│                                                      │
│  Side Panel (React)  ←→  Service Worker              │
│  - Chat UI                - Backend API calls        │
│  - Verification progress  - Browser automation       │
│                           - Login detection          │
│                           - Request interception     │
│                           - zkTLS proof generation   │
└──────────────────────────────┬──────────────────────┘
                               │ SSE / REST
                               ▼
┌─────────────────────────────────────────────────────┐
│ Backend (Express + LangGraph)                        │
│                                                      │
│  AI Agent         → Intent parsing                   │
│  Schema Search    → SQLite full-text search          │
│  zkPass Adapter   → Schema fetch + task allocation   │
└─────────────────────────────────────────────────────┘
```

## External Webpage Integration

Third-party webpages can trigger verification via `window.postMessage`, without opening the Side Panel.

### Sending messages to the extension

```js
// Listen for responses
window.addEventListener('message', (e) => {
  if (e.data.source !== 'transgate-ai-agent') return;
  console.log('Response:', e.data);
});

// Chat
window.postMessage({
  target: 'transgate-ai-agent',
  type: 'TRANSGATE_CHAT',
  message: 'Verify my Twitter followers'
}, '*');

// Direct verification by zkPass schema ID
window.postMessage({
  target: 'transgate-ai-agent',
  type: 'TRANSGATE_VERIFY_SCHEMA',
  zkpassSchemaId: '7e068f51c9bc472fac28e07a901d446d'
}, '*');

// New conversation
window.postMessage({
  target: 'transgate-ai-agent',
  type: 'TRANSGATE_NEW_CONVERSATION'
}, '*');

// Stop verification
window.postMessage({
  target: 'transgate-ai-agent',
  type: 'TRANSGATE_STOP_VERIFICATION'
}, '*');
```

### Response message types

| Type | Description |
|---|---|
| `TRANSGATE_RESPONSE` | Direct response (e.g. new conversationId) |
| `TRANSGATE_CHAT_PROGRESS` | Chat progress (thinking, tool calls) |
| `TRANSGATE_CHAT_RESULT` | Chat result (action, reply, schemaIds) |
| `TRANSGATE_STATUS_UPDATE` | Verification progress step |
| `TRANSGATE_PROOF_RESULT` | Proof generated |
| `TRANSGATE_VERIFICATION_DONE` | Verification complete or error |
| `TRANSGATE_ERROR` | Extension error |

All responses include `source: 'transgate-ai-agent'` for identification.

## Adding Custom Schemas

See [backend/docs/schema.md](backend/docs/schema.md) for a complete guide on:

- Creating schemas on zkPass Dev
- Configuring login detection and page navigation
- Adding schemas to the database

## Project Structure

```
TransGate-AI-Agent/
├── backend/                    # Express + LangGraph backend (source)
│   ├── src/
│   │   ├── config/             # Environment configs
│   │   ├── db/                 # SQLite init + seed data
│   │   ├── middleware/         # Auth + rate limiting
│   │   ├── routes/             # API endpoints
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
└── LICENSE                     # Apache-2.0
```

## Requirements

- Node.js >= 22
- Chrome browser
- OpenAI API key (or compatible LLM API)
- zkPass Dev account ([sign up](https://dev.zkpass.org))

## License

Apache-2.0 — see [LICENSE](LICENSE)
