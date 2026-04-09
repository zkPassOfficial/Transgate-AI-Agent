import { Router, Request, Response } from 'express';
import { resolve } from '../services/resolver.js';
import type { SSEResult, ChatRequest } from '../types/index.js';

const router = Router();

const MAX_MESSAGE_LENGTH = 500;

function sendProgress(res: Response, step: string, message: string): void {
  res.write(`event: progress\ndata: ${JSON.stringify({ step, message })}\n\n`);
}

function sendResult(res: Response, result: SSEResult): void {
  res.write(`event: result\ndata: ${JSON.stringify(result)}\n\n`);
}

router.post('/', async (req: Request, res: Response) => {
  const { message, conversationId, context } = req.body as ChatRequest;
  const address = req.userAddress!;

  // Input validation (before SSE so we can return proper HTTP status codes)
  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ action: 'error', reply: 'Please enter a message' });
    return;
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ action: 'error', reply: `Message must be ${MAX_MESSAGE_LENGTH} characters or less` });
    return;
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Handle client disconnect (listen on res, not req — req 'close' fires when body is consumed)
  let aborted = false;
  res.on('close', () => { aborted = true; });

  try {
    sendProgress(res, 'thinking', 'Processing your request...');

    const onProgress = (step: string, message: string) => {
      if (!aborted) sendProgress(res, step, message);
    };

    const resolved = await resolve(address, conversationId || 'default', message, context, onProgress);

    if (aborted) return;

    sendResult(res, {
      action: resolved.action,
      reply: resolved.reply,
      schemaIds: resolved.schemaIds,
      campaign: resolved.campaign,
    });
  } catch (err) {
    if (!aborted) {
      console.error(JSON.stringify({ event: 'chat_error', address, error: (err as Error).message }));
      sendResult(res, { action: 'error', reply: 'Service temporarily unavailable, please try again' });
    }
  } finally {
    if (!aborted) res.end();
  }
});

export default router;
