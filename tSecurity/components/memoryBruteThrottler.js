import requestIp from 'request-ip';
import { normalizeIp } from '../utils.js';

const buckets = new Map();

const defaults = {
  perSecond: 14,
  perMinute: 140,
  banMs: 10 * 60 * 1000
};

const bucketFor = (key, now) => {
  const existing = buckets.get(key);
  if (existing) return existing;
  const created = {
    secondCount: 0,
    secondResetAt: now + 1000,
    minuteCount: 0,
    minuteResetAt: now + 60 * 1000,
    bannedUntil: 0
  };
  buckets.set(key, created);
  return created;
};

const prune = (now) => {
  if (buckets.size < 10000) return;
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.secondResetAt < now && bucket.minuteResetAt < now && bucket.bannedUntil < now) {
      buckets.delete(key);
    }
  }
};

export const createMemoryBruteThrottler = (options = {}) => {
  const config = { ...defaults, ...(options || {}) };
  return (req, res, next) => {
    const now = Date.now();
    const key = normalizeIp(requestIp.getClientIp(req) || req.tSecurity?.requestIp?.(req) || req.ip || req.socket?.remoteAddress || '') || 'unknown';
    const bucket = bucketFor(key, now);

    if (bucket.bannedUntil > now) {
      res.setHeader('Cache-Control', 'no-store, private, max-age=0');
      res.status(429).json({
        ok: false,
        blocked: true,
        reason: 'Memory Brute Force Throttle',
        error: 'Too many security sync attempts.',
        retryAfterMs: bucket.bannedUntil - now
      });
      return;
    }

    if (bucket.secondResetAt <= now) {
      bucket.secondCount = 0;
      bucket.secondResetAt = now + 1000;
    }
    if (bucket.minuteResetAt <= now) {
      bucket.minuteCount = 0;
      bucket.minuteResetAt = now + 60 * 1000;
    }

    bucket.secondCount += 1;
    bucket.minuteCount += 1;
    if (bucket.secondCount > Number(config.perSecond || defaults.perSecond) || bucket.minuteCount > Number(config.perMinute || defaults.perMinute)) {
      bucket.bannedUntil = now + Number(config.banMs || defaults.banMs);
      prune(now);
      res.setHeader('Cache-Control', 'no-store, private, max-age=0');
      res.status(429).json({
        ok: false,
        blocked: true,
        reason: 'Memory Brute Force Throttle',
        error: 'Too many security sync attempts.',
        retryAfterMs: bucket.bannedUntil - now
      });
      return;
    }

    prune(now);
    next();
  };
};
