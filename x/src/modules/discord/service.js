import express from 'express';
import { createPublicKey, verify } from 'node:crypto';

const DISCORD_INTEGRATION_KEY = 'discord-bot';
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

const html = (title, body) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} | Tiwlo</title>
    <style>
      body{margin:0;font-family:Inter,Arial,sans-serif;background:#f8fafc;color:#0f172a}
      main{max-width:860px;margin:0 auto;padding:56px 20px}
      section{background:#fff;border:1px solid #e2e8f0;padding:32px;box-shadow:0 20px 60px rgba(15,23,42,.08)}
      h1{margin:0 0 12px;font-size:32px;line-height:1.1}
      h2{margin:28px 0 8px;font-size:16px}
      p,li{font-size:14px;line-height:1.7;color:#475569}
      a{color:#0069ff;text-decoration:none;font-weight:700}
      .tag{display:inline-flex;margin-bottom:16px;color:#0069ff;font-weight:800;font-size:12px;letter-spacing:.14em;text-transform:uppercase}
    </style>
  </head>
  <body><main><section>${body}</section></main></body>
</html>`;

const termsHtml = () => html('Terms of Service', `
  <span class="tag">Tiwlo legal</span>
  <h1>Terms of Service</h1>
  <p>These terms govern access to Tiwlo cloud, billing, support, automation, Discord bot, and related platform services.</p>
  <h2>Use of services</h2>
  <p>You are responsible for account activity, accurate billing information, lawful use, and protecting credentials, API keys, and bot tokens.</p>
  <h2>Automation and integrations</h2>
  <p>Discord and other integrations may create support tickets, live chat records, invoice review actions, verification review actions, and audit logs according to your configured settings.</p>
  <h2>Payments and support</h2>
  <p>Invoices, payment proofs, refunds, and support actions are subject to review. Tiwlo may suspend abusive, fraudulent, or unsafe activity.</p>
  <h2>Contact</h2>
  <p>For legal or support questions, contact <a href="mailto:support@tiwlo.com">support@tiwlo.com</a>.</p>
`);

const privacyHtml = () => html('Privacy Policy', `
  <span class="tag">Tiwlo privacy</span>
  <h1>Privacy Policy</h1>
  <p>This policy explains how Tiwlo handles account, support, billing, identity verification, Discord integration, and service telemetry data.</p>
  <h2>Data we process</h2>
  <p>We may process names, emails, account status, support messages, live chat messages, invoice data, payment proof metadata, identity review evidence, audit logs, and integration configuration.</p>
  <h2>Discord bot data</h2>
  <p>When enabled, the Discord bot may receive ticket events, live chat events, invoice proof events, verification review events, staff actions, channel IDs, role IDs, and message metadata needed to run automation.</p>
  <h2>Security and retention</h2>
  <p>Access controls, audit logs, masking, retention settings, and administrator approvals help protect sensitive records. Retention depends on your configured policies and legal requirements.</p>
  <h2>Contact</h2>
  <p>For privacy questions, contact <a href="mailto:support@tiwlo.com">support@tiwlo.com</a>.</p>
`);

const linkedRoleHtml = () => html('Discord Linked Role Verification', `
  <span class="tag">Discord verification</span>
  <h1>Linked Role Verification</h1>
  <p>Tiwlo Discord linked-role verification is ready for OAuth connection. Configure this URL in Discord when you want server roles to require a verified Tiwlo account.</p>
  <h2>Current status</h2>
  <p>The endpoint is available. Full OAuth account linking can be connected to your Tiwlo account and Discord application credentials when you enable linked-role requirements.</p>
`);

const readDiscordPublicKey = async (prisma) => {
  const fromEnv = String(process.env.DISCORD_PUBLIC_KEY || '').trim();
  if (fromEnv) return fromEnv;
  const integration = await prisma.integration.findUnique({ where: { key: DISCORD_INTEGRATION_KEY } });
  return String(integration?.config?.publicKey || '').trim();
};

const ed25519KeyFromHex = (publicKeyHex) => {
  const raw = Buffer.from(publicKeyHex, 'hex');
  if (raw.length !== 32) throw new Error('Discord public key must be 32 bytes of hex');
  return createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, raw]), format: 'der', type: 'spki' });
};

const verifyDiscordRequest = async (prisma, req) => {
  const signature = String(req.headers['x-signature-ed25519'] || '');
  const timestamp = String(req.headers['x-signature-timestamp'] || '');
  const publicKey = await readDiscordPublicKey(prisma);
  if (!publicKey) return { ok: false, status: 503, error: 'Discord public key is not configured' };
  if (!signature || !timestamp) return { ok: false, status: 401, error: 'Missing Discord signature headers' };
  try {
    const message = Buffer.concat([Buffer.from(timestamp, 'utf8'), req.body]);
    const ok = verify(null, message, ed25519KeyFromHex(publicKey), Buffer.from(signature, 'hex'));
    return ok ? { ok: true } : { ok: false, status: 401, error: 'Invalid Discord request signature' };
  } catch (error) {
    return { ok: false, status: 401, error: error.message || 'Discord request verification failed' };
  }
};

const commandResponse = (name) => {
  const command = String(name || '').toLowerCase();
  const content = command === 'ticket'
    ? 'Ticket command received. Tiwlo support automation is ready.'
    : command === 'live'
      ? 'Live chat command received. Tiwlo live support automation is ready.'
      : command === 'invoice'
        ? 'Invoice command received. Tiwlo billing automation is ready.'
        : command === 'idreview'
          ? 'ID review command received. Tiwlo verification automation is ready.'
          : 'Tiwlo Discord automation is connected.';
  return { type: 4, data: { content, flags: 64 } };
};

const handleDiscordInteraction = async (prisma, req, res) => {
  const verified = await verifyDiscordRequest(prisma, req);
  if (!verified.ok) {
    res.status(verified.status).json({ error: verified.error });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(req.body.toString('utf8') || '{}');
  } catch {
    res.status(400).json({ error: 'Invalid Discord interaction JSON' });
    return;
  }

  await prisma.auditLog.create({
    data: {
      action: 'discord_interaction_received',
      resource: 'discordInteraction',
      resourceId: payload.id || null,
      metadata: {
        type: payload.type,
        command: payload.data?.name || null,
        guildId: payload.guild_id || null,
        channelId: payload.channel_id || null
      }
    }
  }).catch(() => null);

  if (payload.type === 1) {
    res.json({ type: 1 });
    return;
  }

  if (payload.type === 2) {
    res.json(commandResponse(payload.data?.name));
    return;
  }

  if (payload.type === 3) {
    res.json({ type: 4, data: { content: 'Action received. Tiwlo automation will process it.', flags: 64 } });
    return;
  }

  res.json({ type: 4, data: { content: 'Interaction received by Tiwlo.', flags: 64 } });
};

export const registerDiscordRoutes = (app, { prisma }) => {
  const rawJson = express.raw({ type: 'application/json', limit: '256kb' });

  app.post(['/discord/interactions', '/api/discord/interactions'], rawJson, (req, res) => {
    handleDiscordInteraction(prisma, req, res).catch((error) => {
      res.status(500).json({ error: error.message || 'Discord interaction failed' });
    });
  });

  app.get('/discord/verify', (_req, res) => {
    res.type('html').send(linkedRoleHtml());
  });

  app.get('/terms', (_req, res) => {
    res.type('html').send(termsHtml());
  });

  app.get('/privacy', (_req, res) => {
    res.type('html').send(privacyHtml());
  });
};
