# Custom Schema Guide

This guide explains how to create your own verification schemas and add them to the database, so the AI agent can match user requests and trigger zkPass verification.

## Overview

The system has two layers of schema:

1. **zkPass Schema** — Created on [zkPass Dev](https://dev.zkpass.org). Defines the API interception rules, assertion conditions, and cryptographic signature. This is the core verification logic.
2. **Local Schema** — Stored in your SQLite database (`seed.ts`). Supplements the zkPass schema with metadata the AI agent needs: search keywords, login detection, page navigation, etc.

When a user says "verify my Twitter followers", the AI agent searches the **local schema** database. Once matched, the extension fetches the **zkPass schema** from the zkPass Dev server and runs the verification.

## Prerequisites

Follow the [zkPass Quick Start Guide](https://docs.zkpass.org/developer-guides/js-sdk/quick-start) to set up your account.

1. Create an account on [zkPass Dev](https://dev.zkpass.org)
2. Create your own **App** — you'll get an `app_id`
3. Create one or more **Schemas** — each gives you a `zkpass_schema_id`

> **Important:** You must replace the `appId` in `config.prod.ts` (or `config.dev.ts`) with your own. The default value in the repo is for demo only and may not work.

## Schema Fields Reference

Each entry in the `testSchemas` array in `backend/src/db/seed.ts` has the following fields:

### Required Fields

| Field | Type | Description | Example |
|---|---|---|---|
| `id` | string | Local unique identifier. Generate with `crypto.randomUUID().replace(/-/g, '')` | `a7d5567181bc4ffeb87956f6e6bc74c0` |
| `zkpass_schema_id` | string | Schema ID from zkPass Dev. Copy from your schema's detail page | `7e068f51c9bc472fac28e07a901d446d` |
| `platform` | string | Platform name in lowercase. Used by the AI agent for filtering | `twitter`, `binance`, `okx` |
| `category` | string | Verification category. Used by the AI agent for filtering | `followers`, `kyc`, `balance` |
| `title` | string | One-line description of what this schema verifies. Shown to the user when the agent presents a match | `Verify Twitter/X follower count greater than 1` |

### Optional Fields (but recommended)

| Field | Type | Description | Example |
|---|---|---|---|
| `description` | string | Detailed description. The AI agent uses this to understand what the schema does and match it to user intent. Be descriptive — include common use cases, related terms, and why someone might want this verification | `Proves the user has at least 1 follower on Twitter/X. Commonly used for KOL verification...` |
| `condition` | string | Short human-readable summary of the verification condition | `Followers > 1`, `KYC Verified`, `Balance > 100 USDT` |
| `keywords` | string | Comma-separated search terms. The AI agent searches these when trying to find a matching schema. Include platform names, feature names, synonyms, and related concepts | `twitter,x,followers,kol,influencer,social` |
| `aliases` | string | Comma-separated phrases that users might actually say. Think about natural language variations | `i am a kol,twitter followers,x follower count` |
| `site_url` | string | The main URL of the target website | `https://x.com/zkPass` |
| `login_config` | JSON string | How to detect if the user is logged in (see below) | — |
| `navigation` | JSON string | Steps to navigate to the correct page before verification (see below) | — |
| `http_version` | string | HTTP version of the target API. Default `1.1`. Set to `2` only for HTTP/2 APIs | `1.1` |

## login_config (Login Detection)

Before verification, the extension needs to check if the user is logged into the target website. If not, it redirects them to the login page and waits.

`login_config` is a **JSON string** containing:

```json
{
  "checkUrl": "https://x.com/home",
  "loginUrl": "https://x.com/i/flow/login",
  "selector": "[data-testid='AppTabBar_Home_Link']"
}
```

| Field | What it does | How to find the right value |
|---|---|---|
| `checkUrl` | The extension navigates here first to check login status | Use a page that requires login, like a dashboard or home page |
| `loginUrl` | If not logged in, the extension redirects the user here | The website's login/sign-in page URL |
| `selector` | A CSS selector for an element that **only exists when logged in** | Open the website in Chrome while logged in. Right-click an element that disappears when logged out (like your username or avatar). Use DevTools to get its CSS selector |

**How login detection works:**
1. Extension opens `checkUrl`
2. Checks if `selector` exists on the page
3. If yes → user is logged in, proceed
4. If no → redirect to `loginUrl`, wait for user to log in, keep checking `selector` on `checkUrl`

## navigation (Page Navigation)

After login, the extension may need to navigate to a specific page where the target API call happens. For example, Twitter's follower count API is triggered when you visit your profile page.

`navigation` is a **JSON string** containing an array of steps:

```json
{
  "steps": [
    { "action": "navigate", "url": "https://x.com/home" },
    { "action": "click", "selector": "[data-testid='AppTabBar_Profile_Link']" }
  ]
}
```

Steps are executed in order:

| Action | Required Fields | What it does | When to use |
|---|---|---|---|
| `navigate` | `url` | Opens a URL in the browser tab | When you need to go to a specific page |
| `click` | `selector` | Clicks an element on the current page | When you need to trigger a navigation or action by clicking a button/link |

**Example — Twitter follower verification:**
1. `navigate` to `https://x.com/home` — opens Twitter home
2. `click` on `[data-testid='AppTabBar_Profile_Link']` — clicks the "Profile" tab, which loads the user's profile and triggers the follower count API

**How to figure out the right navigation steps:**
1. Open the target website in Chrome
2. Open DevTools → Network tab
3. Navigate manually to trigger the API call that contains the data you want to verify
4. Note down each step you took (which URLs you visited, which buttons you clicked)
5. For each click, right-click the element → Inspect → get its CSS selector

## Complete Example

Here's a real example — verifying Twitter follower count:

```typescript
{
  // Local ID — generate a random one
  id: 'a7d5567181bc4ffeb87956f6e6bc74c0',

  // From zkPass Dev — your schema's ID
  zkpass_schema_id: '7e068f51c9bc472fac28e07a901d446d',

  // Platform and category — used for search
  platform: 'twitter',
  category: 'followers',

  // Title — shown to the user
  title: 'Verify Twitter/X follower count greater than 1',

  // Description — helps the AI agent understand what this verifies
  description: 'Proves the user has at least 1 follower on Twitter/X. '
    + 'Commonly used for KOL verification, influencer status checks, '
    + 'proving social media presence, or confirming an active account.',

  // Condition — human-readable summary
  condition: 'Followers > 1',

  // Keywords — the AI agent searches these
  keywords: 'twitter,x,followers,follower,kol,influencer,social,creator',

  // Aliases — natural language phrases users might say
  aliases: 'x followers,twitter followers,kol verification,i am a kol',

  // Target website
  site_url: 'https://x.com/zkPass',

  // Login detection
  login_config: JSON.stringify({
    checkUrl: 'https://x.com/home',
    loginUrl: 'https://x.com/i/flow/login',
    selector: "[data-testid='AppTabBar_Home_Link']"
  }),

  // Navigation — go to profile page to trigger the follower API
  navigation: JSON.stringify({
    steps: [
      { action: 'navigate', url: 'https://x.com/home' },
      { action: 'click', selector: "[data-testid='AppTabBar_Profile_Link']" }
    ]
  }),

  // HTTP version
  http_version: '1.1',
}
```

## Step-by-Step: Adding a New Schema

### 1. Create the zkPass schema

Go to [zkPass Dev](https://dev.zkpass.org) and create a schema. See the [Quick Start Guide](https://docs.zkpass.org/developer-guides/js-sdk/quick-start) for detailed instructions.

Copy the `schema_id` from the schema detail page.

### 2. Figure out login detection

1. Open the target website in Chrome (logged out)
2. Note the login page URL → this is your `loginUrl`
3. Log in
4. Note which page you land on → this is your `checkUrl`
5. Find an element that only appears when logged in → this is your `selector`

### 3. Figure out navigation steps

1. With DevTools Network tab open, navigate to trigger the API call
2. Record each step (URL visits, button clicks)
3. For clicks, get the CSS selector from DevTools

### 4. Add to seed.ts

Add your schema object to the `testSchemas` array in `backend/src/db/seed.ts`.

### 5. Update your app_id

Edit `backend/src/config/config.prod.ts` (or `config.dev.ts`):

```typescript
zkpass: {
  devServer: 'https://dev.zkpass.org/v1',
  appId: 'your-app-id-from-zkpass-dev',  // Replace with your own!
},
```

### 6. Run seed

```bash
cd backend
npm run seed
```

> **Warning:** `npm run seed` clears all existing schemas and campaigns, then re-inserts everything from `seed.ts`. Make sure all your schemas are in the file before running.

## Adding Campaigns

Campaigns group multiple schemas into a single verification flow. For example, an airdrop campaign might require both Twitter follower verification AND Binance KYC.

Add to the `testCampaigns` array in `seed.ts`:

```typescript
{
  name: 'zkPass Airdrop Demo',
  aliases: 'airdrop,demo,zkpass airdrop,free tokens',
  description: 'Verify Twitter follower count and Binance KYC to qualify for the airdrop.',
  schemas: ['local_schema_id_1', 'local_schema_id_2'],  // local id, NOT zkpass_schema_id
}
```

| Field | Description |
|---|---|
| `name` | Campaign name, shown to the user |
| `aliases` | Comma-separated search terms for the AI agent |
| `description` | What the campaign requires |
| `schemas` | Array of **local** schema `id` values (not `zkpass_schema_id`). Order matters — schemas are displayed in this order |

## Tips

- **keywords and aliases**: Be generous. The more terms you include, the better the AI agent can match user requests. Think about how different people might phrase the same request.
- **description**: Write it as if explaining to someone unfamiliar with the platform. Include the "why" — common reasons someone would want this verification.
- **login_config selector**: Pick an element that is reliably present when logged in and absent when logged out. Avoid elements that load lazily or change between page loads.
- **navigation**: Keep it minimal. Only include steps needed to trigger the specific API call. Unnecessary steps slow down verification and increase failure risk.
- **http_version**: Almost all websites use `1.1`. Only set to `2` if you specifically know the target API uses HTTP/2.
