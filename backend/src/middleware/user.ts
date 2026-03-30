import { Request, Response, NextFunction } from 'express';

/**
 * Extract userId from X-User-Id header and attach to req.userId.
 * Returns 400 if header is missing.
 */
export function requireUserId(req: Request, res: Response, next: NextFunction): void {
  const userId = req.headers['x-user-id'] as string | undefined;
  if (!userId) {
    res.status(400).json({ action: 'error', reply: 'Missing X-User-Id header' });
    return;
  }
  req.userId = userId;
  next();
}

/**
 * In-memory per-userId rate limiter.
 * Returns 429 when the limit is exceeded.
 */
export function rateLimit(windowMs: number, max: number) {
  const hits = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = req.userId!;
    const now = Date.now();
    const timestamps = (hits.get(userId) || []).filter(t => now - t < windowMs);

    if (timestamps.length >= max) {
      res.status(429).json({ action: 'error', reply: 'Too many requests, please try again later' });
      return;
    }

    timestamps.push(now);
    hits.set(userId, timestamps);
    next();
  };
}
