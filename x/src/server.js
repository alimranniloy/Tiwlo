import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { prisma } from './db.js';
import { resolvers } from './resolvers.js';
import { createCorsOptionsDelegate } from './core/cors.js';
import {
  handleBkashCallback,
  handlePaypalReturn,
  handleStripeReturn,
  handleStripeWebhook,
  paymentRedirectUrl
} from './modules/billing/service.js';
import { runCreditAutomationJob } from './modules/billing/creditAutomation.js';
import { initializeAiModelRuntime, streamAiModelChat } from './modules/ai-model/service.js';
import { streamSupportAiReply } from './modules/support/service.js';
import { registerSystemToolRoutes, startBackupAutomation, startSslAutomation } from './modules/system-tools/service.js';
import { registerTPanelRoutes } from './modules/tpanel/service.js';
import { registerTiwloPayApiRoutes } from './modules/tiwlo-pay/service.js';
import { startPowerDnsAutomation } from './modules/powerdns/service.js';
import { registerDiscordRoutes } from './modules/discord/service.js';
import { ensureWhatsAppAuthSchema, publicWhatsAppStatus } from './modules/whatsapp/service.js';
import { publicCurrencyContext } from './core/currency.js';
import { registerTSecurity } from '../../tSecurity/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const typeDefs = readFileSync(join(__dirname, '../graphql/schema.graphql'), 'utf8');
const systemAssetDir = join(__dirname, '../private-assets/system-pages');
const systemAssets = {
  disabled: 'disabled.jpeg',
  maintenance: 'maintenance.jpeg',
  'not-found': 'not-found.jpeg',
  404: 'not-found.jpeg'
};

const app = express();
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
const automationToken = process.env.AUTOMATION_API_TOKEN || jwtSecret;

const server = new ApolloServer({ typeDefs, resolvers });
await server.start();

app.set('trust proxy', true);
app.use(cors(createCorsOptionsDelegate()));
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(hpp());
app.use(['/graphql', '/api', '/ai', '/automation', '/payments'], rateLimit({
  windowMs: 60 * 1000,
  limit: 240,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  skip: (req) => req.path === '/health' || req.originalUrl.startsWith('/api/system-assets/')
}));

app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '');
    const result = await handleStripeWebhook(prisma, rawBody, req.headers['stripe-signature']);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Stripe webhook failed' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'tiwlo-x-backend' });
});

app.get('/api', (_req, res) => {
  res.redirect(301, '/developers');
});

const mailboxAddress = (value = '') => String(value || '').trim().toLowerCase();

const mailboxInitialSvg = (address = '') => {
  const initial = (address.split('@')[0] || 'T').charAt(0).toUpperCase().replace(/[<>&"']/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" fill="#e8f0fe"/><text x="80" y="96" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="700" fill="#1967d2">${initial}</text></svg>`;
};

app.get('/mail/avatar/:address', async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  try {
    const address = mailboxAddress(decodeURIComponent(req.params.address || ''));
    const setting = await prisma.systemSetting.findUnique({
      where: { scope_scopeId_key: { scope: 'admin', scopeId: 'main-admin', key: 'mainAdmin:emailaccounts' } }
    });
    const records = Array.isArray(setting?.value?.records) ? setting.value.records : [];
    const record = records.find((item) => mailboxAddress(item?.data?.address || item?.title) === address);
    const image = String(record?.data?.profileImageUrl || '').trim();
    if (/^https?:\/\//i.test(image)) {
      res.redirect(302, image);
      return;
    }
    const dataMatch = image.match(/^data:(image\/(?:png|jpe?g|webp|gif|svg\+xml));base64,(.+)$/i);
    if (dataMatch) {
      res.type(dataMatch[1]);
      res.send(Buffer.from(dataMatch[2], 'base64'));
      return;
    }
    res.type('image/svg+xml').send(mailboxInitialSvg(address));
    return;
  } catch (error) {
    console.warn('[email] avatar lookup failed:', error?.message || error);
  }
  res.type('image/svg+xml').send(mailboxInitialSvg('tmail'));
});

app.get('/brand/bimi.svg', (_req, res) => {
  res.type('image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(join(__dirname, '../../public/brand/bimi.svg'));
});

app.get('/brand/logo.png', (_req, res) => {
  res.type('image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(join(__dirname, '../../public/brand/logo.png'));
});

app.get('/brand/icon.png', (_req, res) => {
  res.type('image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(join(__dirname, '../../public/brand/icon.png'));
});

const setPrivateAssetHeaders = (res, cacheControl = 'no-store, private, max-age=0') => {
  res.setHeader('Cache-Control', cacheControl);
  if (cacheControl.includes('no-store')) {
    res.setHeader('Pragma', 'no-cache');
  }
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, noimageindex');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
};

const blockAssetPreview = (res) => {
  setPrivateAssetHeaders(res);
  res.status(404).type('text/plain; charset=utf-8').send('Not found');
};

const cleanTextValue = (value = '', maxLength = 6000) => String(value || '').trim().slice(0, maxLength);

const googleMeasurementIdFrom = (value = '') => {
  const text = cleanTextValue(value);
  return text.match(/\bG-[A-Z0-9]{4,}\b/i)?.[0]?.toUpperCase() || '';
};

const googleTagManagerIdFrom = (value = '') => {
  const text = cleanTextValue(value);
  return text.match(/\bGTM-[A-Z0-9]{4,}\b/i)?.[0]?.toUpperCase() || '';
};

const facebookPixelIdFrom = (value = '') => {
  const text = cleanTextValue(value);
  const explicit = text.match(/fbq\(['"]init['"],\s*['"](\d{5,30})['"]\)/i)?.[1];
  if (explicit) return explicit;
  return text.match(/\b\d{5,30}\b/)?.[0] || '';
};

const publicTrackingConfig = async () => {
  const setting = await prisma.systemSetting.findUnique({
    where: { scope_scopeId_key: { scope: 'platform', scopeId: '', key: 'trackingIntegrations' } }
  });
  const value = setting?.value && typeof setting.value === 'object' && !Array.isArray(setting.value) ? setting.value : {};
  const google = value.googleAnalytics && typeof value.googleAnalytics === 'object' && !Array.isArray(value.googleAnalytics)
    ? value.googleAnalytics
    : {};
  const facebook = value.facebookPixel && typeof value.facebookPixel === 'object' && !Array.isArray(value.facebookPixel)
    ? value.facebookPixel
    : {};
  const tagManager = value.googleTagManager && typeof value.googleTagManager === 'object' && !Array.isArray(value.googleTagManager)
    ? value.googleTagManager
    : {};
  const measurementId = googleMeasurementIdFrom(google.measurementId || google.tagSnippet || google.script || '');
  const containerId = googleTagManagerIdFrom(tagManager.containerId || tagManager.tagSnippet || tagManager.script || '');
  const pixelId = facebookPixelIdFrom(facebook.pixelId || facebook.pixelSnippet || facebook.script || '');
  return {
    googleAnalytics: {
      enabled: Boolean(google.enabled) && Boolean(measurementId),
      measurementId
    },
    googleTagManager: {
      enabled: Boolean(tagManager.enabled) && Boolean(containerId),
      containerId
    },
    facebookPixel: {
      enabled: Boolean(facebook.enabled) && Boolean(pixelId),
      pixelId
    },
    updatedAt: setting?.updatedAt || null
  };
};

app.get('/api/platform/status', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { scope_scopeId_key: { scope: 'platform', scopeId: '', key: 'maintenance' } }
    });
    const value = setting?.value || {};
    res.json({
      maintenance: {
        enabled: Boolean(value.enabled),
        updatedAt: setting?.updatedAt || null
      },
      whatsapp: await publicWhatsAppStatus(prisma).catch(() => ({ enabled: false, configured: false }))
    });
  } catch (error) {
    res.status(500).json({ maintenance: { enabled: false }, error: error.message || 'Unable to read platform status' });
  }
});

app.get('/api/platform/tracking', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  try {
    res.json(await publicTrackingConfig());
  } catch (error) {
    res.status(500).json({
      googleAnalytics: { enabled: false, measurementId: '' },
      googleTagManager: { enabled: false, containerId: '' },
      facebookPixel: { enabled: false, pixelId: '' },
      error: error.message || 'Unable to read tracking settings'
    });
  }
});

app.get('/api/platform/currency', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  try {
    res.json(await publicCurrencyContext(prisma, requestIp(req)));
  } catch (error) {
    res.status(500).json({
      policy: null,
      detectedCountry: null,
      detectedCurrency: 'USD',
      fallbackCurrency: 'USD',
      error: error.message || 'Unable to read platform currency'
    });
  }
});

app.get('/api/system-assets/:asset', (req, res) => {
  const key = String(req.params.asset || '').toLowerCase().replace(/\.(?:jpe?g|png|webp|svg)$/i, '');
  const filename = systemAssets[key];
  const fetchDest = String(req.headers['sec-fetch-dest'] || '').toLowerCase();
  if (!filename || fetchDest === 'document') {
    blockAssetPreview(res);
    return;
  }

  const filePath = join(systemAssetDir, filename);
  if (!existsSync(filePath)) {
    blockAssetPreview(res);
    return;
  }

  const stat = statSync(filePath);
  const etag = `W/"${stat.size}-${Math.floor(stat.mtimeMs)}"`;
  if (req.headers['if-none-match'] === etag) {
    setPrivateAssetHeaders(res, 'private, max-age=86400, immutable');
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', stat.mtime.toUTCString());
    res.setHeader('Vary', 'Sec-Fetch-Dest, Accept');
    res.status(304).end();
    return;
  }

  setPrivateAssetHeaders(res, 'private, max-age=86400, immutable');
  res.type('image/jpeg');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', stat.mtime.toUTCString());
  res.setHeader('Vary', 'Sec-Fetch-Dest, Accept');
  res.setHeader('Content-Disposition', `inline; filename="${key}.jpeg"`);
  createReadStream(filePath).pipe(res);
});

const readAutomationToken = (req) => {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return req.headers['x-automation-token'];
};

const userFromRequest = async (req) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, jwtSecret);
    if (payload.kind === 'store_customer') return null;
    return prisma.user.findUnique({ where: { id: payload.sub } });
  } catch {
    return null;
  }
};

const storeCustomerFromRequest = async (req) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, jwtSecret);
    if (payload.kind !== 'store_customer') return null;
    return prisma.storeCustomer.findUnique({ where: { id: payload.sub } });
  } catch {
    return null;
  }
};

const firstHeaderValue = (value) => (Array.isArray(value) ? value[0] : value || '');

const normalizeClientIp = (value = '') => {
  const first = String(value || '').split(',')[0]?.trim() || '';
  const forwarded = first.match(/for="?([^";,\s]+)"?/i)?.[1] || first;
  const withoutPrefix = forwarded.replace(/^::ffff:/i, '');
  if (/^\[[^\]]+\](?::\d+)?$/.test(withoutPrefix)) return withoutPrefix.slice(1, withoutPrefix.indexOf(']'));
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(withoutPrefix)) return withoutPrefix.replace(/:\d+$/, '');
  return withoutPrefix;
};

const requestIp = (req) => normalizeClientIp(
  firstHeaderValue(req.headers['cf-connecting-ip'])
  || firstHeaderValue(req.headers['true-client-ip'])
  || firstHeaderValue(req.headers['x-real-ip'])
  || firstHeaderValue(req.headers['x-client-ip'])
  || firstHeaderValue(req.headers['x-forwarded-for'])
  || firstHeaderValue(req.headers.forwarded)
  || req.ip
  || req.socket.remoteAddress
  || ''
);

registerDiscordRoutes(app, { prisma, userFromRequest });

app.use(express.json({ limit: '20mb' }));

registerTSecurity(app, { prisma, requestIp, userFromRequest });

registerTiwloPayApiRoutes(app, { prisma, requestIp });

const writeSse = (res, event) => {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
};

app.post('/automation/credit-sync', async (req, res) => {
  if (readAutomationToken(req) !== automationToken) {
    res.status(401).json({ error: 'Invalid automation token' });
    return;
  }

  try {
    res.json(await runCreditAutomationJob({ prisma }, { ownerId: req.body?.ownerId }));
  } catch (error) {
    res.status(400).json({ error: error.message || 'Credit automation failed' });
  }
});

app.post('/ai/support/stream', async (req, res) => {
  const user = await userFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const abortController = new AbortController();
  let closed = false;
  let doneSent = false;
  res.on('close', () => {
    closed = true;
    abortController.abort();
  });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders?.();

  const sendEvent = (event) => {
    if (closed) return;
    if (event.type === 'done') doneSent = true;
    writeSse(res, event);
  };

  try {
    const result = await streamSupportAiReply({
      prisma,
      user,
      requestIp: requestIp(req),
      userAgent: req.headers['user-agent'] || ''
    }, user, {
      ...(req.body || {}),
      signal: abortController.signal
    }, {
      onChunk: (text) => sendEvent({ type: 'chunk', text }),
      onEvent: sendEvent
    });

    if (!doneSent) {
      sendEvent({ type: 'done', ok: Boolean(result?.ok), ...result });
    }
  } catch (error) {
    sendEvent({ type: 'error', error: error.message || 'Support AI stream failed' });
  } finally {
    if (!closed) res.end();
  }
});

app.post('/ai/model/stream', async (req, res) => {
  const user = await userFromRequest(req);
  if (!user || !['super_admin', 'admin'].includes(user.role)) {
    res.status(user ? 403 : 401).json({ error: user ? 'Tiwlo Team access required' : 'Authentication required' });
    return;
  }

  const abortController = new AbortController();
  let closed = false;
  let doneSent = false;
  res.on('close', () => {
    closed = true;
    abortController.abort();
  });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders?.();

  const sendEvent = (event) => {
    if (closed) return;
    if (event.type === 'done') doneSent = true;
    writeSse(res, event);
  };

  try {
    const result = await streamAiModelChat({
      prisma,
      user,
      requestIp: requestIp(req),
      userAgent: req.headers['user-agent'] || ''
    }, user, {
      ...(req.body || {}),
      signal: abortController.signal
    }, {
      onChunk: (text) => sendEvent({ type: 'chunk', text })
    });

    if (!doneSent) {
      sendEvent({ type: 'done', ok: Boolean(result?.ok), ...result });
    }
  } catch (error) {
    sendEvent({ type: 'error', error: error.message || 'AI model stream failed' });
  } finally {
    if (!closed) res.end();
  }
});

const redirectPayment = (res, result) => {
  res.redirect(paymentRedirectUrl(result));
};

app.get('/payments/stripe/return', async (req, res) => {
  try {
    redirectPayment(res, await handleStripeReturn(prisma, req.query));
  } catch (error) {
    redirectPayment(res, {
      status: 'failed',
      provider: 'stripe',
      invoiceId: req.query.invoiceId,
      message: error.message || 'Stripe payment failed'
    });
  }
});

app.get('/payments/paypal/return', async (req, res) => {
  try {
    redirectPayment(res, await handlePaypalReturn(prisma, req.query));
  } catch (error) {
    redirectPayment(res, {
      status: 'failed',
      provider: 'paypal',
      invoiceId: req.query.invoiceId,
      message: error.message || 'PayPal payment failed'
    });
  }
});

app.get('/payments/bkash/callback', async (req, res) => {
  try {
    redirectPayment(res, await handleBkashCallback(prisma, req.query));
  } catch (error) {
    redirectPayment(res, {
      status: 'failed',
      provider: 'bkash',
      invoiceId: req.query.invoiceId,
      message: error.message || 'bKash payment failed'
    });
  }
});

app.post('/payments/bkash/callback', async (req, res) => {
  try {
    res.json(await handleBkashCallback(prisma, { ...req.query, ...req.body }));
  } catch (error) {
    res.status(400).json({ error: error.message || 'bKash payment failed' });
  }
});

registerSystemToolRoutes(app, {
  prisma,
  userFromRequest,
  rootDir: join(__dirname, '../..')
});

registerTPanelRoutes(app, { prisma, requestIp });

app.use('/graphql', expressMiddleware(server, {
  context: async ({ req }) => {
    const [user, storeCustomer] = await Promise.all([
      userFromRequest(req),
      storeCustomerFromRequest(req)
    ]);
    return {
      prisma,
      user,
      storeCustomer,
      requestIp: requestIp(req),
      userAgent: req.headers['user-agent'] || '',
      requestHeaders: req.headers || {}
    };
  }
}));

app.listen(port, () => {
  console.log(`Tiwlo X GraphQL API ready at http://localhost:${port}/graphql`);
  ensureWhatsAppAuthSchema(prisma).catch((error) => {
    console.warn('[whatsapp] schema prepare failed:', error?.message || error);
  });
  startBackupAutomation({ prisma, rootDir: join(__dirname, '../..') });
  startSslAutomation({ prisma, rootDir: join(__dirname, '../..') });
  startPowerDnsAutomation({ prisma });
  initializeAiModelRuntime({ prisma }).catch((error) => {
    console.error('AI model auto-start failed:', error.message || error);
  });
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
