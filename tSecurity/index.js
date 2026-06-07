import Fingerprint from 'express-fingerprint';
import { ADMIN_BLOCKS_PATH, GATEWAY_PATH, getTSecurityPolicy, upsertTSecurityPolicy } from './config.js';
import { createGatewayChallenge, openGatewayEnvelope, parseGatewayBody, sealedResponse } from './crypto/payloadCrypto.js';
import { ensureTSecuritySchema } from './db/schema.js';
import { blockSummary, consumeSensitivePayload, enforceRestrictedStatusServices, handleGatewayPayload, listBlockEvents, releaseBlockEvent, signupAvailabilityViaTSecurity } from './gateway.js';
import { ensureDeviceSessionTable, recordAuthDeviceSession, securitySummaryForUser } from './components/deviceFingerprint.js';
import { createMemoryBruteThrottler } from './components/memoryBruteThrottler.js';
import { clean, normalizeIp, TSecurityError } from './utils.js';

export {
  consumeSensitivePayload,
  enforceRestrictedStatusServices,
  ensureDeviceSessionTable,
  recordAuthDeviceSession,
  securitySummaryForUser,
  signupAvailabilityViaTSecurity
};

const noStore = (res) => {
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
};

const createRateGuard = () => {
  const buckets = new Map();
  return async (req, res, next) => {
    const policy = await getTSecurityPolicy(req.tSecurity.prisma).catch(() => ({ gatewayRateLimit: { windowMs: 60000, max: 90 } }));
    const windowMs = Number(policy.gatewayRateLimit?.windowMs || 60000);
    const max = Number(policy.gatewayRateLimit?.max || 90);
    const key = normalizeIp(req.tSecurity.requestIp(req)) || req.ip || 'unknown';
    const now = Date.now();
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    current.count += 1;
    if (current.count > max) {
      noStore(res);
      res.status(429).json({ ok: false, error: 'Too many sync attempts. Please wait a moment.' });
      return;
    }
    if (buckets.size > 5000) {
      for (const [bucketKey, bucket] of buckets.entries()) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey);
      }
    }
    next();
  };
};

const fingerprintMiddleware = Fingerprint({
  parameters: [
    Fingerprint.useragent,
    Fingerprint.acceptHeaders,
    Fingerprint.geoip,
    function tSecurityHeaders(next) {
      next(null, {
        tSecurityHeaders: {
          fetchSite: this.req?.headers?.['sec-fetch-site'] || '',
          fetchMode: this.req?.headers?.['sec-fetch-mode'] || '',
          clientHints: this.req?.headers?.['sec-ch-ua'] || ''
        }
      });
    }
  ]
});

const adminOnly = (deps) => async (req, res, next) => {
  try {
    const user = await deps.userFromRequest(req);
    if (!user || !['super_admin', 'admin'].includes(String(user.role || '').toLowerCase())) {
      noStore(res);
      res.status(user ? 403 : 401).json({ error: user ? 'Admin access required' : 'Authentication required' });
      return;
    }
    req.tSecurityAdmin = user;
    next();
  } catch (error) {
    next(error);
  }
};

const sendGatewayError = (res, error, seal = null) => {
  const status = error instanceof TSecurityError && error.extensions?.code !== 'BAD_USER_INPUT' ? 403 : 400;
  const payload = {
    ok: false,
    blocked: error.extensions?.code === 'TSECURITY_BLOCKED',
    error: error.message || 'Security sync failed',
    code: error.extensions?.code || 'TSECURITY_ERROR'
  };
  noStore(res);
  if (seal) {
    res.status(status).json(sealedResponse(seal, payload));
    return;
  }
  res.status(status).json(payload);
};

export const registerTSecurity = (app, deps) => {
  const pluginDeps = {
    ...deps,
    requestIp: deps.requestIp || ((req) => req.ip || req.socket?.remoteAddress || '')
  };
  const rateGuard = createRateGuard();
  const memoryGuard = createMemoryBruteThrottler();

  app.use((req, _res, next) => {
    req.tSecurity = pluginDeps;
    next();
  });

  app.get(GATEWAY_PATH, memoryGuard, rateGuard, async (req, res) => {
    noStore(res);
    try {
      const policy = await getTSecurityPolicy(pluginDeps.prisma);
      const state = await createGatewayChallenge(pluginDeps.prisma, {
        ipAddress: pluginDeps.requestIp(req),
        userAgent: req.headers['user-agent'] || '',
        route: req.originalUrl || req.url
      }, policy);
      res.json({ ok: true, state });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message || 'Unable to sync state' });
    }
  });

  app.post(GATEWAY_PATH, memoryGuard, rateGuard, fingerprintMiddleware, async (req, res) => {
    let seal = null;
    try {
      const envelope = parseGatewayBody(req.body);
      const opened = await openGatewayEnvelope(pluginDeps.prisma, envelope);
      seal = opened.seal;
      const result = await handleGatewayPayload({
        prisma: pluginDeps.prisma,
        req,
        deps: pluginDeps,
        decryptedPayload: opened.payload
      });
      noStore(res);
      res.json(sealedResponse(opened.seal, result));
    } catch (error) {
      sendGatewayError(res, error, seal);
    }
  });

  app.get(`${ADMIN_BLOCKS_PATH}/summary`, adminOnly(pluginDeps), async (_req, res) => {
    noStore(res);
    res.json({ ok: true, summary: await blockSummary(pluginDeps.prisma) });
  });

  app.get(ADMIN_BLOCKS_PATH, adminOnly(pluginDeps), async (req, res) => {
    noStore(res);
    const events = await listBlockEvents(pluginDeps.prisma, {
      search: clean(req.query.search),
      reason: clean(req.query.reason),
      limit: Number(req.query.limit || 100),
      offset: Number(req.query.offset || 0)
    });
    res.json({ ok: true, events });
  });

  app.post(`${ADMIN_BLOCKS_PATH}/:id/release`, adminOnly(pluginDeps), async (req, res) => {
    noStore(res);
    const result = await releaseBlockEvent(pluginDeps.prisma, req.params.id, req.tSecurityAdmin);
    if (!result) {
      res.status(404).json({ ok: false, error: 'tSecurity block record was not found.' });
      return;
    }
    res.json({ ok: true, result });
  });

  app.get(`${ADMIN_BLOCKS_PATH}/policy`, adminOnly(pluginDeps), async (_req, res) => {
    noStore(res);
    res.json({ ok: true, policy: await getTSecurityPolicy(pluginDeps.prisma) });
  });

  app.post(`${ADMIN_BLOCKS_PATH}/policy`, adminOnly(pluginDeps), async (req, res) => {
    noStore(res);
    const policy = await upsertTSecurityPolicy(pluginDeps.prisma, req.body?.policy || {});
    res.json({ ok: true, policy });
  });

  ensureTSecuritySchema(pluginDeps.prisma).catch((error) => {
    console.warn('[tSecurity] schema prepare failed:', error?.message || error);
  });
};
