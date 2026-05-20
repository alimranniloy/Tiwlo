import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { prisma } from './db.js';
import { resolvers } from './resolvers.js';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const typeDefs = readFileSync(join(__dirname, '../graphql/schema.graphql'), 'utf8');

const app = express();
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const automationToken = process.env.AUTOMATION_API_TOKEN || jwtSecret;

const server = new ApolloServer({ typeDefs, resolvers });
await server.start();

app.set('trust proxy', true);
const allowedOrigins = new Set([
  frontendOrigin,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:5173'
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin) || /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
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

app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'tiwlo-x-backend' });
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

const requestIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  return Array.isArray(forwarded) ? forwarded[0] : forwarded || req.ip || req.socket.remoteAddress || '';
};

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
    res.status(user ? 403 : 401).json({ error: user ? 'Admin access required' : 'Authentication required' });
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
      userAgent: req.headers['user-agent'] || ''
    };
  }
}));

app.listen(port, () => {
  console.log(`Tiwlo X GraphQL API ready at http://localhost:${port}/graphql`);
  initializeAiModelRuntime({ prisma }).catch((error) => {
    console.error('AI model auto-start failed:', error.message || error);
  });
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
