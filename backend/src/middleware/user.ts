import { Request, Response, NextFunction } from 'express';

/**
 * Extract wallet address from X-User-Address header and attach to req.userAddress.
 * Returns 400 if header is missing.
 */
export function requireUserAddress(req: Request, res: Response, next: NextFunction): void {
  const address = req.headers['x-user-address'] as string | undefined;
  if (!address) {
    res.status(400).json({ action: 'error', reply: 'Missing X-User-Address header' });
    return;
  }
  req.userAddress = address;
  next();
}

/**
 * In-memory per-address rate limiter.
 * Returns 429 when the limit is exceeded.
 */
export function rateLimit(windowMs: number, max: number) {
  const hits = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const address = req.userAddress!;
    const now = Date.now();
    const timestamps = (hits.get(address) || []).filter(t => now - t < windowMs);

    if (timestamps.length >= max) {
      res.status(429).json({ action: 'error', reply: 'Too many requests, please try again later' });
      return;
    }

    timestamps.push(now);
    hits.set(address, timestamps);
    next();
  };
}
