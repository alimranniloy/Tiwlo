import express from 'express';
import { createPublicKey, verify } from 'node:crypto';

const DISCORD_INTEGRATION_KEY = 'discord-bot';
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const DISCORD_API = 'https://discord.com/api/v10';

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

const cleanChannelName = (value, fallback) => String(value || fallback || 'tiwlo')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9-_ ]+/g, '')
  .replace(/\s+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 90) || fallback;

const discordFetch = async (token, path, options = {}) => {
  const response = await fetch(`${DISCORD_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    const message = data?.message || text || `Discord API failed: ${response.status}`;
    throw new Error(message);
  }
  return data;
};

const resolveGuildId = async (token, configuredGuildId) => {
  if (String(configuredGuildId || '').trim()) return String(configuredGuildId).trim();
  const guilds = await discordFetch(token, '/users/@me/guilds');
  if (Array.isArray(guilds) && guilds.length === 1) return guilds[0].id;
  if (Array.isArray(guilds) && guilds.length > 1) {
    throw new Error('Bot is installed in multiple servers. Add Server / guild ID before provisioning.');
  }
  throw new Error('Bot is not installed in a server yet. Invite the bot first, then provision channels.');
};

const findChannel = (channels, name, type, parentId = undefined) => channels.find((channel) => (
  channel.type === type
  && channel.name === name
  && (parentId === undefined || channel.parent_id === parentId)
));

const ensureCategory = async (token, guildId, channels, name) => {
  const existing = findChannel(channels, name, 4);
  if (existing) return { channel: existing, created: false };
  const channel = await discordFetch(token, `/guilds/${guildId}/channels`, {
    method: 'POST',
    body: JSON.stringify({ name, type: 4 })
  });
  channels.push(channel);
  return { channel, created: true };
};

const ensureTextChannel = async (token, guildId, channels, { name, parentId, topic }) => {
  const existing = findChannel(channels, name, 0, parentId);
  if (existing) return { channel: existing, created: false };
  const channel = await discordFetch(token, `/guilds/${guildId}/channels`, {
    method: 'POST',
    body: JSON.stringify({
      name,
      type: 0,
      parent_id: parentId || undefined,
      topic
    })
  });
  channels.push(channel);
  return { channel, created: true };
};

const provisionDiscordServer = async ({ prisma, userFromRequest }, req, res) => {
  const user = await userFromRequest(req);
  if (!user || !['super_admin', 'admin'].includes(user.role)) {
    res.status(user ? 403 : 401).json({ error: user ? 'Admin access required' : 'Authentication required' });
    return;
  }

  const integration = await prisma.integration.findUnique({ where: { key: DISCORD_INTEGRATION_KEY } });
  const config = integration?.config || {};
  const token = String(config.botToken || '').trim();
  if (!token) {
    res.status(400).json({ error: 'Discord bot token is required before provisioning.' });
    return;
  }

  const guildId = await resolveGuildId(token, config.guildId);
  const channels = await discordFetch(token, `/guilds/${guildId}/channels`);
  const ticketCategory = await ensureCategory(token, guildId, channels, String(config.ticketCategoryName || 'Tiwlo Tickets'));
  const liveCategory = await ensureCategory(token, guildId, channels, String(config.liveChatCategoryName || 'Tiwlo Live Chat'));
  const opsCategory = await ensureCategory(token, guildId, channels, 'Tiwlo Operations');

  const definitions = [
    {
      key: 'ticket',
      nameKey: 'ticketChannelName',
      linkKey: 'ticketChannelLink',
      fallback: 'support-tickets',
      parentId: ticketCategory.channel.id,
      topic: 'Tiwlo support ticket queue and automated ticket alerts.'
    },
    {
      key: 'liveChat',
      nameKey: 'liveChatChannelName',
      linkKey: 'liveChatChannelLink',
      fallback: 'live-support',
      parentId: liveCategory.channel.id,
      topic: 'Tiwlo live chat queue and staff reply workflow.'
    },
    {
      key: 'idVerified',
      nameKey: 'idVerifiedChannelName',
      linkKey: 'idVerifiedChannelLink',
      fallback: 'id-verified',
      parentId: opsCategory.channel.id,
      topic: 'Tiwlo ID verification review cards and approve/decline actions.'
    },
    {
      key: 'invoice',
      nameKey: 'invoiceChannelName',
      linkKey: 'invoiceChannelLink',
      fallback: 'invoices',
      parentId: opsCategory.channel.id,
      topic: 'Tiwlo invoice proof, paid/unpaid, dispute, and billing alerts.'
    },
    {
      key: 'log',
      nameKey: 'logChannelName',
      linkKey: 'logChannelLink',
      fallback: 'system-logs',
      parentId: opsCategory.channel.id,
      topic: 'Tiwlo bot audit logs, automation health, and backend events.'
    }
  ];

  const results = [];
  const nextConfig = {
    ...config,
    guildId,
    ticketCategoryId: ticketCategory.channel.id,
    liveChatCategoryId: liveCategory.channel.id,
    operationsCategoryId: opsCategory.channel.id
  };

  for (const definition of definitions) {
    const name = cleanChannelName(config[definition.nameKey], definition.fallback);
    const result = await ensureTextChannel(token, guildId, channels, {
      name,
      parentId: definition.parentId,
      topic: definition.topic
    });
    nextConfig[definition.nameKey] = name;
    nextConfig[definition.linkKey] = `https://discord.com/channels/${guildId}/${result.channel.id}`;
    nextConfig[`${definition.key}ChannelId`] = result.channel.id;
    results.push({
      key: definition.key,
      name,
      id: result.channel.id,
      link: nextConfig[definition.linkKey],
      created: result.created
    });
  }

  const updated = await prisma.integration.upsert({
    where: { key: DISCORD_INTEGRATION_KEY },
    create: {
      key: DISCORD_INTEGRATION_KEY,
      group: 'communications',
      name: 'Discord Bot',
      status: 'active',
      config: nextConfig,
      health: { status: 'provisioned', checkedAt: new Date().toISOString(), guildId }
    },
    update: {
      status: 'active',
      config: nextConfig,
      health: { ...(integration?.health || {}), status: 'provisioned', checkedAt: new Date().toISOString(), guildId },
      lastSyncAt: new Date()
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: 'discord_server_provisioned',
      resource: 'integration',
      resourceId: updated.id,
      metadata: { guildId, channels: results }
    }
  }).catch(() => null);

  res.json({
    ok: true,
    guildId,
    categories: {
      ticket: ticketCategory.channel.id,
      liveChat: liveCategory.channel.id,
      operations: opsCategory.channel.id
    },
    channels: results,
    config: nextConfig
  });
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

export const registerDiscordRoutes = (app, { prisma, userFromRequest }) => {
  const rawJson = express.raw({ type: 'application/json', limit: '256kb' });
  const json = express.json({ limit: '256kb' });

  app.post(['/discord/interactions', '/api/discord/interactions'], rawJson, (req, res) => {
    handleDiscordInteraction(prisma, req, res).catch((error) => {
      res.status(500).json({ error: error.message || 'Discord interaction failed' });
    });
  });

  app.post('/api/discord/provision', json, (req, res) => {
    provisionDiscordServer({ prisma, userFromRequest }, req, res).catch((error) => {
      res.status(400).json({ error: error.message || 'Discord provisioning failed' });
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
