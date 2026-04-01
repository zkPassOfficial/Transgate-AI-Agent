import config from '../config/index.js';
import { extractJson, withLock } from './utils.js';
import agent from './agent.js';
import type { ResolveResult, PageContext } from '../types/index.js';

/**
 * Resolve user intent via the LangGraph agent.
 * Pure intent parsing — no external API calls.
 */
export type OnProgress = (step: string, message: string) => void;

export async function resolve(
  userId: string,
  conversationId: string,
  message: string,
  context?: PageContext,
  onProgress?: OnProgress,
): Promise<ResolveResult> {
  const threadId = `${userId}:${conversationId}`;

  return withLock(threadId, async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.resolver.timeoutMs);

    try {
      let userContent = message;
      if (context) {
        userContent += `\n\n[Page context] platform: ${context.platform}, url: ${context.url}, pageType: ${context.pageType}`;
      }

      const toolNames: Record<string, string> = {
        search_schemas: 'Searching for matching schemas...',
        search_campaigns: 'Searching campaigns...',
      };

      let finalContent = '';
      const stream = agent.streamEvents(
        { messages: [{ role: 'user', content: userContent }] },
        {
          configurable: { thread_id: threadId },
          recursionLimit: config.resolver.recursionLimit,
          signal: controller.signal,
          version: 'v2',
        },
      );

      for await (const event of stream) {
        if (event.event === 'on_tool_start' && toolNames[event.name]) {
          onProgress?.('tool', toolNames[event.name]);
        } else if (event.event === 'on_tool_end') {
          onProgress?.('analyzing', 'Analyzing results...');
        } else if (event.event === 'on_chat_model_stream' && event.data?.chunk?.content) {
          const chunk = event.data.chunk.content;
          if (typeof chunk !== 'string') continue;
          finalContent += chunk;
          if (!finalContent.includes('{')) {
            onProgress?.('token', chunk);
          }
        }
      }

      const parsed = extractJson(finalContent);

      console.log(JSON.stringify({ event: 'resolved', userId, action: parsed.action, schemaIds: parsed.schemaIds, campaign: parsed.campaign }));

      return {
        action: parsed.action as ResolveResult['action'],
        reply: parsed.reply as string,
        schemaIds: parsed.schemaIds as string[] | undefined,
        campaign: parsed.campaign as ResolveResult['campaign'],
      };
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return { action: 'error', reply: 'Request timed out, please try again.' };
      }
      console.error(JSON.stringify({ event: 'resolver_error', userId, error: (err as Error).message }));
      return { action: 'error', reply: 'Service temporarily unavailable, please try again.' };
    } finally {
      clearTimeout(timeout);
    }
  });
}
