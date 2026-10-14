import { httpError } from './helpers.js';

/**
 * Small in-memory rate limiter (per IP). Only FAILED requests (status >= 400) are
 * counted, so normal users are never blocked but password guessing is slowed down.
 */
export function rateLimit({ windowMs = 15 * 60 * 1000, max = 15, message = 'Too many attempts. Please try again later.' } = {}) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, windowMs).unref();

  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    if (entry.count >= max) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return next(httpError(429, message));
    }
    res.on('finish', () => {
      if (res.statusCode >= 400) entry.count += 1;
    });
    next();
  };
}
