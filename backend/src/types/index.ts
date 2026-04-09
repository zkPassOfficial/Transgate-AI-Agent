/**
 * - `chat`           — General conversation; no verification needed
 * - `verify_pending` — Schema matched, described to user, waiting for confirmation (schemaIds required)
 * - `verify`         — User confirmed a pending suggestion, ready to start verification (schemaIds required)
 * - `clarify`        — Ambiguous intent or multiple candidates, needs user to choose
 * - `none`           — User wants to verify but no matching schema was found
 * - `error`          — Internal error (timeout, LLM call failure, etc.)
 */
export type Action = 'chat' | 'verify_pending' | 'verify' | 'clarify' | 'none' | 'error';

/** Resolver output — intent parsed from natural language */
export interface CampaignInfo {
  id: number;
  name: string;
}

export interface ResolveResult {
  action: Action;
  reply: string;
  schemaIds?: string[];
  campaign?: CampaignInfo;
}

/** Optional page context injected by the extension service worker */
export interface PageContext {
  platform?: string;
  url?: string;
  pageType?: string;
}

/** POST /api/chat request body */
export interface ChatRequest {
  message: string;
  conversationId?: string;
  context?: PageContext;
}

/** Single schema in a verify SSE result */
export interface VerifySchema {
  title: string;
  zkpassSchemaId: string;
  website: string;
  APIs: Record<string, unknown>[];
  signature: string;
  httpVersion: string;
  task: string;
  nodeHost: string;
  nodeAddress: string;
  allocAddress: string;
  allocSignature: string;
  loginDetect: { checkUrl: string; loginUrl: string; selector: string } | null;
  targetPage: { steps: Array<{ action: string; url?: string; selector?: string }> } | null;
}

/**
 * SSE result event payload.
 * - `verify_pending` — schema matched, waiting for user confirmation (schemaIds included for display)
 * - `verify`         — user confirmed, full payload attached in schemas (ready to start verification)
 */
export interface SSEResult {
  action: Action;
  reply: string;
  schemaIds?: string[];
  campaign?: CampaignInfo;
  schemas?: VerifySchema[];
}

/** Cached platform summary entry */
export interface PlatformSummary {
  platform: string;
  categories: string[];
}

/** Cached campaign summary entry */
export interface CampaignSummary {
  id: number;
  name: string;
  aliases: string;
  description: string;
}

/** Extend Express Request with userAddress */
declare global {
  namespace Express {
    interface Request {
      userAddress?: string;
    }
  }
}
