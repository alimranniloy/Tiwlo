import express from 'express';
import { createPublicKey, verify } from 'node:crypto';
import {
  createIdentityVerificationRequest,
  identityAppOrigin,
  identityVerificationLink,
  publicIdentityVerification,
  reviewIdentityVerificationRequest
} from '../identity-verification/core.js';

const DISCORD_INTEGRATION_KEY = 'discord-bot';
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const DISCORD_API = 'https://discord.com/api/v10';
const DISCORD_GATEWAY = 'wss://gateway.discord.gg/?v=10&encoding=json';
const DISCORD_INTENTS = 1 | 512 | 32768;
const VIEW_CHANNEL = 1024n;
const SEND_MESSAGES = 2048n;
const EMBED_LINKS = 16384n;
const ATTACH_FILES = 32768n;
const READ_MESSAGE_HISTORY = 65536n;
const MANAGE_MESSAGES = 8192n;
const MANAGE_CHANNELS = 16n;
const SUPPORT_ALLOW = VIEW_CHANNEL | SEND_MESSAGES | EMBED_LINKS | ATTACH_FILES | READ_MESSAGE_HISTORY;
const SUPPORT_MANAGE_ALLOW = SUPPORT_ALLOW | MANAGE_MESSAGES | MANAGE_CHANNELS;
let gatewayState = null;
let gatewayWorkerStarted = false;

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

const componentResponse = async (prisma, payload) => {
  const customId = String(payload.data?.custom_id || '');
  if (customId.startsWith('tiwlo:identity:request:')) {
    return sendIdentityVerificationFromDiscord(prisma, payload, customId);
  }
  if (customId.startsWith('tiwlo:identity:review:')) {
    return reviewIdentityVerificationFromDiscord(prisma, payload, customId);
  }
  const [, kind, action, id, value] = customId.split(':');
  if ((kind === 'ticket' || kind === 'chat') && action === 'assign' && id) {
    const discordUserId = payload.data?.values?.[0];
    if (!discordUserId) {
      return { type: 4, data: { content: 'Select a Discord staff member first.', flags: 64 } };
    }
    await assignDiscordResource(prisma, kind, id, discordUserId, payload.member?.user?.id || payload.user?.id || '');
    return { type: 4, data: { content: `Assigned to <@${discordUserId}>. Only that staff member can see this case channel now.`, flags: 64, allowed_mentions: { users: [discordUserId] } } };
  }
  if (customId.startsWith('tiwlo:ticket:status:') && id && value) {
    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: { status: value },
      include: { owner: true, assignedTo: true, messages: { orderBy: { createdAt: 'asc' }, take: 20 } }
    });
    await notifyDiscordTicketEvent({ prisma }, 'status', ticket);
    return { type: 4, data: { content: `Ticket marked ${value}.`, flags: 64 } };
  }
  if (customId.startsWith('tiwlo:ticket:delete:') && action === 'delete' && id) {
    const integration = await readDiscordIntegration(prisma);
    const ticket = await prisma.supportTicket.findUnique({ where: { id } }).catch(() => null);
    if (integration && ticket) {
      await clearResourceDiscordChannel(prisma, 'ticket', ticket, integration.config);
    }
    await prisma.supportTicket.delete({ where: { id } });
    return { type: 4, data: { content: 'Ticket deleted from Tiwlo.', flags: 64 } };
  }
  if (customId.startsWith('tiwlo:chat:status:') && id && value) {
    const chat = await prisma.liveChatSession.update({
      where: { id },
      data: { status: value },
      include: { owner: true, assignedTo: true, messages: { orderBy: { createdAt: 'asc' }, take: 20 } }
    });
    await notifyDiscordLiveChatEvent({ prisma }, 'status', chat);
    return { type: 4, data: { content: `Live chat marked ${value}.`, flags: 64 } };
  }
  if (kind || action) {
    return { type: 4, data: { content: 'This Tiwlo action is not available for that record.', flags: 64 } };
  }
  return { type: 4, data: { content: 'Action received by Tiwlo.', flags: 64 } };
};

const sendIdentityVerificationFromDiscord = async (prisma, payload, customId) => {
  const [, , , resourceKind, resourceId] = customId.split(':');
  const model = resourceKind === 'ticket' ? prisma.supportTicket : resourceKind === 'chat' ? prisma.liveChatSession : null;
  if (!model || !resourceId) {
    return { type: 4, data: { content: 'Verification can only be sent from a support ticket or live chat.', flags: 64 } };
  }

  const resource = await model.findUnique({
    where: { id: resourceId },
    include: { owner: true, assignedTo: true, messages: { orderBy: { createdAt: 'asc' }, take: 20 } }
  }).catch(() => null);
  if (!resource) {
    return { type: 4, data: { content: 'Tiwlo case was not found.', flags: 64 } };
  }

  const ownerId = String(resource.metadata?.accountUserId || resource.ownerId || '').trim();
  if (!ownerId) {
    return { type: 4, data: { content: 'This case does not have a linked Tiwlo user.', flags: 64 } };
  }

  const { request } = await createIdentityVerificationRequest(prisma, {
    ownerId,
    flow: 'account_recovery',
    source: 'discord',
    requestedById: payload.member?.user?.id || payload.user?.id || '',
    supportTicketId: resourceKind === 'ticket' ? resourceId : '',
    liveChatSessionId: resourceKind === 'chat' ? resourceId : ''
  });

  await prisma.auditLog.create({
    data: {
      action: 'discord_identity_verification_requested',
      resource: 'identityVerification',
      resourceId: request.id,
      metadata: {
        ownerId,
        sourceKind: resourceKind,
        sourceId: resourceId,
        discordUserId: payload.member?.user?.id || payload.user?.id || null
      }
    }
  }).catch(() => null);

  const link = identityVerificationLink(request);
  return {
    type: 4,
    data: {
      content: `ID verification request sent for ${resource.owner?.email || ownerId}.\n${link}`,
      flags: 64
    }
  };
};

const reviewIdentityVerificationFromDiscord = async (prisma, payload, customId) => {
  const [, , , id, status] = customId.split(':');
  if (!id || !status) {
    return { type: 4, data: { content: 'Invalid verification review action.', flags: 64 } };
  }
  const discordUserId = payload.member?.user?.id || payload.user?.id || '';
  const request = await reviewIdentityVerificationRequest(prisma, id, status, {
    id: discordUserId,
    name: payload.member?.nick || payload.member?.user?.global_name || payload.user?.global_name || payload.user?.username || 'Discord Admin',
    email: ''
  }, status === 'approved' ? 'Verified from Discord.' : 'Not verified from Discord.');

  await prisma.auditLog.create({
    data: {
      action: 'discord_identity_verification_reviewed',
      resource: 'identityVerification',
      resourceId: id,
      metadata: { status: request.status, discordUserId }
    }
  }).catch(() => null);
  if (request.supportTicketId) {
    await prisma.supportTicket.update({
      where: { id: request.supportTicketId },
      data: {
        status: request.status === 'approved' ? 'resolved' : 'pending',
        metadata: {
          source: 'identity-verification',
          identityVerificationId: request.id,
          identityVerificationFlow: request.flow,
          reviewStatus: request.status,
          reviewedAt: new Date().toISOString()
        }
      }
    }).catch(() => null);
  }
  await notifyDiscordIdentityVerificationEvent({ prisma }, 'reviewed', request, {});

  return { type: 4, data: { content: `Identity verification marked ${request.status}.`, flags: 64 } };
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

const truncate = (value, length = 900) => {
  const text = String(value || '').trim();
  return text.length > length ? `${text.slice(0, length - 3)}...` : text;
};

const moneyLabel = (amount, currency = 'USD') => `${String(currency || 'USD').toUpperCase()} ${Number(amount || 0).toFixed(2)}`;

const caseNumber = (kind, id) => `${kind === 'ticket' ? 'TKT' : 'LC'}-${String(id || '').slice(-6).toUpperCase()}`;

const isDiscordReady = (integration) => (
  integration?.status === 'active'
  && integration?.config
  && String(integration.config.botToken || '').trim()
  && String(integration.config.guildId || '').trim()
);

const readDiscordIntegration = async (prisma) => {
  const integration = await prisma.integration.findUnique({ where: { key: DISCORD_INTEGRATION_KEY } }).catch(() => null);
  if (!isDiscordReady(integration)) return null;
  return integration;
};

const ensureConfigBotUser = async (prisma, config) => {
  if (config.botUserId) return config;
  const botUser = await discordFetch(String(config.botToken).trim(), '/users/@me').catch(() => null);
  if (!botUser?.id) return config;
  const nextConfig = { ...config, botUserId: botUser.id, botUsername: botUser.username };
  await prisma.integration.update({
    where: { key: DISCORD_INTEGRATION_KEY },
    data: { config: nextConfig }
  }).catch(() => null);
  return nextConfig;
};

const findResourceByDiscordChannel = async (prisma, channelId) => {
  const ticket = await prisma.supportTicket.findFirst({
    where: { metadata: { path: ['discord', 'channelId'], equals: channelId } },
    include: { owner: true, assignedTo: true, messages: { orderBy: { createdAt: 'asc' }, take: 20 } }
  }).catch(() => null);
  if (ticket) return { kind: 'ticket', resource: ticket };

  const chat = await prisma.liveChatSession.findFirst({
    where: { metadata: { path: ['discord', 'channelId'], equals: channelId } },
    include: { owner: true, assignedTo: true, messages: { orderBy: { createdAt: 'asc' }, take: 20 } }
  }).catch(() => null);
  if (chat) return { kind: 'live-chat', resource: chat };

  return null;
};

const persistDiscordChannelReply = async (prisma, message) => {
  if (!message?.channel_id || !String(message.content || '').trim() || message.author?.bot) return;
  const match = await findResourceByDiscordChannel(prisma, message.channel_id);
  if (!match) return;

  const authorName = message.member?.nick || message.author?.global_name || message.author?.username || 'Discord Staff';
  const body = truncate(message.content, 3800);
  if (match.kind === 'ticket') {
    const reply = await prisma.supportTicketMessage.create({
      data: {
        ticketId: match.resource.id,
        authorId: null,
        authorName,
        authorRole: 'support',
        body,
        visibility: 'public',
        attachments: (message.attachments || []).map((item) => ({ id: item.id, name: item.filename, url: item.url }))
      },
      include: { author: true }
    });
    await prisma.supportTicket.update({
      where: { id: match.resource.id },
      data: { status: match.resource.status === 'closed' ? 'closed' : 'pending' }
    }).catch(() => null);
    await postDiscordMessage((await readDiscordIntegration(prisma)).config, message.channel_id, {
      content: `Saved to Tiwlo ticket as ${reply.authorName}.`
    }).catch(() => null);
    return;
  }

  const reply = await prisma.liveChatMessage.create({
    data: {
      sessionId: match.resource.id,
      authorId: null,
      authorName,
      senderRole: 'support',
      body,
      attachments: (message.attachments || []).map((item) => ({ id: item.id, name: item.filename, url: item.url }))
    },
    include: { author: true }
  });
  await prisma.liveChatSession.update({
    where: { id: match.resource.id },
    data: { lastMessageAt: new Date(), status: match.resource.status === 'closed' ? 'closed' : 'assigned' }
  }).catch(() => null);
  await postDiscordMessage((await readDiscordIntegration(prisma)).config, message.channel_id, {
    content: `Saved to Tiwlo live chat as ${reply.authorName}.`
  }).catch(() => null);
};

const stopDiscordGateway = () => {
  if (!gatewayState) return;
  clearInterval(gatewayState.heartbeat);
  clearTimeout(gatewayState.reconnect);
  gatewayState.ws?.close?.();
  gatewayState = null;
};

const connectDiscordGateway = async (prisma, integration) => {
  const token = String(integration?.config?.botToken || '').trim();
  if (!token || typeof WebSocket === 'undefined') return;
  stopDiscordGateway();

  const ws = new WebSocket(DISCORD_GATEWAY);
  gatewayState = { ws, heartbeat: null, reconnect: null, token };
  let sequence = null;

  const send = (payload) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  };

  ws.addEventListener('message', (event) => {
    let payload;
    try {
      payload = JSON.parse(String(event.data || '{}'));
    } catch {
      return;
    }

    if (payload.op === 10) {
      gatewayState.heartbeat = setInterval(() => send({ op: 1, d: sequence }), payload.d.heartbeat_interval);
      send({
        op: 2,
        d: {
          token,
          intents: DISCORD_INTENTS,
          properties: { os: process.platform, browser: 'tiwlo', device: 'tiwlo' }
        }
      });
      return;
    }

    if (payload.s !== null && payload.s !== undefined) sequence = payload.s;
    if (payload.op === 11) return;
    if (payload.t === 'MESSAGE_CREATE') {
      persistDiscordChannelReply(prisma, payload.d).catch((error) => {
        updateDiscordHealth(prisma, { status: 'error', lastError: error.message, area: 'gateway-message' });
      });
    }
  });

  ws.addEventListener('open', () => {
    updateDiscordHealth(prisma, { status: 'gateway_connected' });
  });

  ws.addEventListener('close', () => {
    if (!gatewayState || gatewayState.ws !== ws) return;
    clearInterval(gatewayState.heartbeat);
    gatewayState.reconnect = setTimeout(() => {
      readDiscordIntegration(prisma).then((next) => {
        if (next) connectDiscordGateway(prisma, next);
      }).catch(() => null);
    }, 10000);
  });

  ws.addEventListener('error', () => {
    updateDiscordHealth(prisma, { status: 'error', lastError: 'Discord gateway connection failed', area: 'gateway' });
  });
};

const startDiscordGatewayWorker = (prisma) => {
  if (gatewayWorkerStarted) return;
  gatewayWorkerStarted = true;
  if (typeof WebSocket === 'undefined') {
    updateDiscordHealth(prisma, { status: 'error', lastError: 'Node WebSocket API is not available', area: 'gateway' });
    return;
  }

  setInterval(async () => {
    const integration = await readDiscordIntegration(prisma);
    const token = String(integration?.config?.botToken || '').trim();
    if (!token) {
      stopDiscordGateway();
      return;
    }
    if (!gatewayState || gatewayState.token !== token || gatewayState.ws?.readyState === WebSocket.CLOSED) {
      await connectDiscordGateway(prisma, integration);
    }
  }, 30000).unref?.();

  readDiscordIntegration(prisma).then((integration) => {
    if (integration) connectDiscordGateway(prisma, integration);
  }).catch(() => null);
};

const postDiscordMessage = async (config, channelId, payload) => {
  if (!channelId) return null;
  return discordFetch(String(config.botToken).trim(), `/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      allowed_mentions: { parse: [] },
      ...payload
    })
  });
};

const deleteDiscordChannel = async (config, channelId) => {
  if (!channelId) return null;
  return discordFetch(String(config.botToken).trim(), `/channels/${channelId}`, { method: 'DELETE' });
};

const permissionOverwrite = (id, type, allow, deny = 0n) => ({
  id: String(id),
  type,
  allow: String(allow),
  deny: String(deny)
});

const caseChannelOverwrites = (config, { assignedUserId = '', includeSupportRole = true } = {}) => {
  const overwrites = [
    permissionOverwrite(config.guildId, 0, 0n, VIEW_CHANNEL)
  ];
  if (config.botUserId) {
    overwrites.push(permissionOverwrite(config.botUserId, 1, SUPPORT_MANAGE_ALLOW));
  }
  if (config.adminRoleId) {
    overwrites.push(permissionOverwrite(config.adminRoleId, 0, SUPPORT_MANAGE_ALLOW));
  }
  if (assignedUserId) {
    overwrites.push(permissionOverwrite(assignedUserId, 1, SUPPORT_ALLOW));
  } else if (includeSupportRole && config.supportRoleId) {
    overwrites.push(permissionOverwrite(config.supportRoleId, 0, SUPPORT_ALLOW));
  }

  return overwrites.filter((item, index, list) => (
    item.id && list.findIndex((candidate) => candidate.id === item.id && candidate.type === item.type) === index
  ));
};

const updateCaseChannelPermissions = async (config, channelId, options = {}) => {
  if (!channelId) return null;
  return discordFetch(String(config.botToken).trim(), `/channels/${channelId}`, {
    method: 'PATCH',
    body: JSON.stringify({ permission_overwrites: caseChannelOverwrites(config, options) })
  });
};

const clearResourceDiscordChannel = async (prisma, kind, resource, config) => {
  const discord = resource?.metadata?.discord || {};
  if (discord.channelId) {
    await deleteDiscordChannel(config, discord.channelId).catch(() => null);
  }

  const model = kind === 'ticket' ? prisma.supportTicket : prisma.liveChatSession;
  await model.update({
    where: { id: resource.id },
    data: {
      metadata: {
        ...(resource.metadata || {}),
        discord: {
          ...discord,
          channelId: null,
          channelName: null,
          channelLink: null,
          deletedAt: new Date().toISOString()
        }
      }
    }
  }).catch(() => null);
};

const assignDiscordResource = async (prisma, kind, id, discordUserId, assignedByDiscordUserId = '') => {
  const integration = await readDiscordIntegration(prisma);
  if (!integration) throw new Error('Discord integration is not active');
  const config = await ensureConfigBotUser(prisma, integration.config);
  const model = kind === 'ticket' ? prisma.supportTicket : prisma.liveChatSession;
  const resource = await model.findUnique({
    where: { id },
    include: { owner: true, assignedTo: true, messages: { orderBy: { createdAt: 'asc' }, take: 20 } }
  });
  if (!resource) throw new Error('Tiwlo case was not found');

  const discord = await ensureResourceChannel(prisma, config, kind === 'ticket' ? 'ticket' : 'live-chat', resource);
  await updateCaseChannelPermissions(config, discord.channelId, {
    assignedUserId: discordUserId,
    includeSupportRole: false
  });

  const nextDiscord = {
    ...(resource.metadata?.discord || {}),
    ...discord,
    assignedUserId: discordUserId,
    assignedByDiscordUserId,
    assignedAt: new Date().toISOString()
  };
  await model.update({
    where: { id: resource.id },
    data: { metadata: { ...(resource.metadata || {}), discord: nextDiscord } }
  });

  await postDiscordMessage(config, discord.channelId, {
    content: `<@${discordUserId}> you are assigned to ${caseNumber(kind === 'ticket' ? 'ticket' : 'live-chat', resource.id)}.`,
    allowed_mentions: { users: [discordUserId], roles: [] }
  });

  return { resource, discord: nextDiscord };
};

const ensureResourceChannel = async (prisma, config, kind, resource) => {
  const current = resource?.metadata?.discord || {};
  const readyConfig = await ensureConfigBotUser(prisma, config);
  if (current.channelId) {
    await updateCaseChannelPermissions(readyConfig, current.channelId, {
      assignedUserId: current.assignedUserId || '',
      includeSupportRole: !current.assignedUserId
    }).catch(() => null);
    return current;
  }

  const categoryId = kind === 'ticket' ? readyConfig.ticketCategoryId : readyConfig.liveChatCategoryId;
  if (!categoryId) return current;

  const suffix = String(resource.id || '').slice(-6).toLowerCase();
  const subject = cleanChannelName(resource.subject || resource.message || kind, kind).slice(0, 36);
  const name = cleanChannelName(`${kind}-${suffix}-${subject}`, `${kind}-${suffix}`);
  const channel = await discordFetch(String(readyConfig.botToken).trim(), `/guilds/${readyConfig.guildId}/channels`, {
    method: 'POST',
    body: JSON.stringify({
      name,
      type: 0,
      parent_id: categoryId,
      topic: `Tiwlo ${kind} ${caseNumber(kind, resource.id)} for ${resource.owner?.email || resource.ownerId || 'customer'}`,
      permission_overwrites: caseChannelOverwrites(readyConfig)
    })
  });

  const discord = {
    ...current,
    channelId: channel.id,
    channelName: channel.name,
    channelLink: `https://discord.com/channels/${readyConfig.guildId}/${channel.id}`,
    createdAt: new Date().toISOString()
  };

  const model = kind === 'ticket' ? prisma.supportTicket : prisma.liveChatSession;
  await model.update({
    where: { id: resource.id },
    data: { metadata: { ...(resource.metadata || {}), discord } }
  }).catch(() => null);

  return discord;
};

const actionRow = (items) => ({
  type: 1,
  components: items.map((item) => ({
    type: 2,
    style: item.style,
    label: item.label,
    custom_id: item.id
  }))
});

const assignUserSelect = (kind, id) => ({
  type: 1,
  components: [{
    type: 5,
    custom_id: `tiwlo:${kind}:assign:${id}`,
    placeholder: 'Assign Discord staff',
    min_values: 1,
    max_values: 1
  }]
});

const isDisabledAccountCase = (resource) => {
  const metadata = resource?.metadata || {};
  const label = `${metadata.caseLabel || ''} ${metadata.label || ''} ${metadata.source || ''} ${resource?.subject || ''}`.toLowerCase();
  return label.includes('disable account')
    || label.includes('disabled account')
    || label.includes('restricted-account')
    || Boolean(metadata.accountUserId);
};

const identityRequestRow = (kind, id) => actionRow([
  { label: 'Send ID Verification', style: 1, id: `tiwlo:identity:request:${kind}:${id}` }
]);

const ticketButtons = (ticketId, ticket = null) => [
  actionRow([
    { label: 'Open', style: 1, id: `tiwlo:ticket:status:${ticketId}:open` },
    { label: 'Solved', style: 3, id: `tiwlo:ticket:status:${ticketId}:resolved` },
    { label: 'Close', style: 2, id: `tiwlo:ticket:status:${ticketId}:closed` },
    { label: 'Delete', style: 4, id: `tiwlo:ticket:delete:${ticketId}` }
  ]),
  ...(isDisabledAccountCase(ticket) ? [identityRequestRow('ticket', ticketId)] : []),
  assignUserSelect('ticket', ticketId)
];

const chatButtons = (sessionId, session = null) => [
  actionRow([
    { label: 'Open', style: 1, id: `tiwlo:chat:status:${sessionId}:open` },
    { label: 'Assigned', style: 3, id: `tiwlo:chat:status:${sessionId}:assigned` },
    { label: 'Close', style: 2, id: `tiwlo:chat:status:${sessionId}:closed` }
  ]),
  ...(isDisabledAccountCase(session) ? [identityRequestRow('chat', sessionId)] : []),
  assignUserSelect('chat', sessionId)
];

const userLine = (owner) => owner ? `${owner.name || 'Customer'} <${owner.email || 'no-email'}>` : 'Customer';

const caseLabel = (resource) => {
  const label = resource?.metadata?.caseLabel || resource?.metadata?.label || resource?.metadata?.source;
  return label ? truncate(String(label), 120) : '';
};

const supportEmbed = ({ title, color, resource, description, fields = [] }) => ({
  title,
  description: truncate(description, 1800),
  color,
  fields: [
    { name: 'Customer', value: userLine(resource.owner), inline: false },
    { name: 'Status', value: String(resource.status || 'open'), inline: true },
    { name: 'Priority', value: String(resource.priority || 'normal'), inline: true },
    { name: 'Label', value: caseLabel(resource), inline: true },
    ...fields.filter((field) => field.value)
  ].slice(0, 12),
  timestamp: new Date().toISOString(),
  footer: { text: `Tiwlo ID ${resource.id}` }
});

export const notifyDiscordTicketEvent = async (ctx, event, ticket, message = null) => {
  try {
    const integration = await readDiscordIntegration(ctx.prisma);
    if (!integration) return null;
    const config = integration.config;
    const fresh = await ctx.prisma.supportTicket.findUnique({
      where: { id: ticket.id },
      include: { owner: true, assignedTo: true, messages: { orderBy: { createdAt: 'asc' }, take: 20 } }
    });
    if (!fresh) return null;

    const closed = event === 'status' && ['closed', 'resolved'].includes(String(fresh.status || '').toLowerCase());
    const discord = closed ? (fresh.metadata?.discord || {}) : await ensureResourceChannel(ctx.prisma, config, 'ticket', fresh);
    const title = event === 'assigned' ? 'Ticket assigned' : event === 'message' ? 'Ticket reply' : event === 'status' ? 'Ticket status updated' : 'New support ticket';
    const body = message?.body || fresh.message;
    const embed = supportEmbed({
      title,
      color: event === 'status' ? 0xf59e0b : 0x0069ff,
      resource: fresh,
      description: body,
      fields: [
        { name: 'Ticket number', value: caseNumber('ticket', fresh.id), inline: true },
        { name: 'Subject', value: truncate(fresh.subject, 256), inline: false },
        { name: 'Author', value: message ? `${message.authorName || 'Unknown'} (${message.authorRole || 'user'})` : userLine(fresh.owner), inline: false },
        { name: 'Assigned to', value: fresh.assignedTo ? userLine(fresh.assignedTo) : (discord.assignedUserId ? `<@${discord.assignedUserId}>` : 'Unassigned'), inline: false },
        { name: 'Discord thread', value: discord.channelLink || 'Not created', inline: false }
      ]
    });

    if (!discord.assignedUserId || event === 'created') {
      await postDiscordMessage(config, config.ticketChannelId, { embeds: [embed], components: ticketButtons(fresh.id, fresh) });
    }
    if (closed) {
      await clearResourceDiscordChannel(ctx.prisma, 'ticket', fresh, config);
      return;
    }
    if (discord.channelId) {
      await postDiscordMessage(config, discord.channelId, { embeds: [embed], components: ticketButtons(fresh.id, fresh) });
    }
  } catch (error) {
    await updateDiscordHealth(ctx.prisma, { status: 'error', lastError: error.message, area: 'ticket' });
  }
};

export const notifyDiscordLiveChatEvent = async (ctx, event, session, message = null) => {
  try {
    const integration = await readDiscordIntegration(ctx.prisma);
    if (!integration) return null;
    const config = integration.config;
    const fresh = await ctx.prisma.liveChatSession.findUnique({
      where: { id: session.id },
      include: { owner: true, assignedTo: true, messages: { orderBy: { createdAt: 'asc' }, take: 20 } }
    });
    if (!fresh) return null;

    const closed = event === 'status' && String(fresh.status || '').toLowerCase() === 'closed';
    const discord = closed ? (fresh.metadata?.discord || {}) : await ensureResourceChannel(ctx.prisma, config, 'live-chat', fresh);
    const title = event === 'assigned' ? 'Live chat assigned' : event === 'message' ? 'Live chat message' : event === 'status' ? 'Live chat status updated' : 'New live support chat';
    const embed = supportEmbed({
      title,
      color: event === 'message' ? 0x22c55e : 0x06b6d4,
      resource: fresh,
      description: message?.body || fresh.subject || 'Live chat started.',
      fields: [
        { name: 'Ticket number', value: caseNumber('live-chat', fresh.id), inline: true },
        { name: 'Author', value: message ? `${message.authorName || 'Unknown'} (${message.senderRole || 'user'})` : userLine(fresh.owner), inline: false },
        { name: 'Assigned to', value: fresh.assignedTo ? userLine(fresh.assignedTo) : (discord.assignedUserId ? `<@${discord.assignedUserId}>` : 'Unassigned'), inline: false },
        { name: 'Discord channel', value: discord.channelLink || 'Not created', inline: false }
      ]
    });

    if (!discord.assignedUserId || event === 'created') {
      await postDiscordMessage(config, config.liveChatChannelId, { embeds: [embed], components: chatButtons(fresh.id, fresh) });
    }
    if (closed) {
      await clearResourceDiscordChannel(ctx.prisma, 'live-chat', fresh, config);
      return;
    }
    if (discord.channelId) {
      await postDiscordMessage(config, discord.channelId, { embeds: [embed], components: chatButtons(fresh.id, fresh) });
    }
  } catch (error) {
    await updateDiscordHealth(ctx.prisma, { status: 'error', lastError: error.message, area: 'live-chat' });
  }
};

const identityReviewButtons = (request) => {
  if (String(request?.status || '').toLowerCase() !== 'pending') return [];
  return [
    actionRow([
      { label: 'Verified', style: 3, id: `tiwlo:identity:review:${request.id}:approved` },
      { label: 'Not verified', style: 4, id: `tiwlo:identity:review:${request.id}:rejected` }
    ])
  ];
};

export const notifyDiscordIdentityVerificationEvent = async (ctx, event, request, extra = {}) => {
  try {
    const integration = await readDiscordIntegration(ctx.prisma);
    if (!integration?.config?.idVerifiedChannelId) return null;
    const fresh = await ctx.prisma.identityVerification.findUnique({
      where: { id: request.id },
      include: { owner: true }
    });
    if (!fresh) return null;

    const payload = publicIdentityVerification(fresh, { includePayload: true }) || {};
    const docs = Array.isArray(payload.payload?.documents) ? payload.payload.documents : [];
    const title = event === 'reviewed'
      ? `ID verification ${fresh.status}`
      : fresh.flow === 'tiwlo_pay'
        ? 'Tiwlo Pay ID verification'
        : 'Disabled account ID verification';
    const adminLink = `${identityAppOrigin()}/management/id-verifications?id=${encodeURIComponent(fresh.id)}`;
    const color = fresh.status === 'approved' ? 0x22c55e : fresh.status === 'rejected' ? 0xef4444 : 0x0069ff;

    await postDiscordMessage(integration.config, integration.config.idVerifiedChannelId, {
      embeds: [{
        title,
        color,
        description: truncate(event === 'reviewed'
          ? `Review completed for ${fresh.owner?.email || fresh.ownerId}.`
          : `Review submitted documents and live selfie for ${fresh.owner?.email || fresh.ownerId}.`),
        fields: [
          { name: 'Customer', value: userLine(fresh.owner), inline: false },
          { name: 'Flow', value: String(fresh.flow || 'account_recovery'), inline: true },
          { name: 'Status', value: String(fresh.status || 'pending'), inline: true },
          { name: 'Documents', value: docs.length ? docs.map((item) => item.kind || item.name || 'document').join(', ') : 'Waiting for upload', inline: false },
          { name: 'Admin preview', value: adminLink, inline: false },
          { name: 'Support ticket', value: extra.ticket?.id || fresh.supportTicketId || 'Not linked', inline: true },
          { name: 'Reason', value: extra.reason || fresh.review?.reason || '', inline: false }
        ].filter((field) => field.value),
        timestamp: new Date().toISOString(),
        footer: { text: `Tiwlo verification ${fresh.id}` }
      }],
      components: identityReviewButtons(fresh)
    });
  } catch (error) {
    await updateDiscordHealth(ctx.prisma, { status: 'error', lastError: error.message, area: 'identity-verification' });
  }
};

export const notifyDiscordInvoiceEvent = async (ctx, event, invoice, extra = {}) => {
  try {
    const integration = await readDiscordIntegration(ctx.prisma);
    if (!integration?.config?.invoiceChannelId) return null;
    const fresh = await ctx.prisma.invoice.findUnique({ where: { id: invoice.id }, include: { owner: true, payments: { orderBy: { createdAt: 'desc' }, take: 3 } } });
    if (!fresh) return null;
    const title = event === 'paid' ? 'Invoice paid' : event === 'failed' ? 'Invoice payment failed' : 'Invoice created';
    const color = event === 'paid' ? 0x22c55e : event === 'failed' ? 0xef4444 : 0xf59e0b;
    await postDiscordMessage(integration.config, integration.config.invoiceChannelId, {
      embeds: [{
        title,
        color,
        description: truncate(extra.message || `${fresh.number} is ${fresh.status}.`),
        fields: [
          { name: 'Invoice', value: fresh.number || fresh.id, inline: true },
          { name: 'Amount', value: moneyLabel(fresh.amount, fresh.currency), inline: true },
          { name: 'Status', value: String(fresh.status || 'open'), inline: true },
          { name: 'Customer', value: userLine(fresh.owner), inline: false },
          { name: 'Scope', value: String(fresh.scope || 'billing'), inline: true },
          { name: 'Provider', value: String(extra.provider || fresh.payments?.[0]?.provider || 'n/a'), inline: true }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: `Tiwlo invoice ${fresh.id}` }
      }]
    });
  } catch (error) {
    await updateDiscordHealth(ctx.prisma, { status: 'error', lastError: error.message, area: 'invoice' });
  }
};

export const notifyDiscordAuditLog = async (ctx, audit) => {
  try {
    if (String(audit.action || '').startsWith('discord_')) return null;
    const integration = await readDiscordIntegration(ctx.prisma);
    if (!integration?.config?.logChannelId) return null;
    await postDiscordMessage(integration.config, integration.config.logChannelId, {
      embeds: [{
        title: 'System log',
        color: 0x64748b,
        description: truncate(`${audit.action} on ${audit.resource || 'system'}`),
        fields: [
          { name: 'Resource ID', value: String(audit.resourceId || 'n/a'), inline: false },
          { name: 'Actor', value: String(audit.actorId || 'system'), inline: true }
        ],
        timestamp: new Date().toISOString()
      }]
    });
  } catch {
    return null;
  }
};

const updateDiscordHealth = async (prisma, patch) => {
  await prisma.integration.update({
    where: { key: DISCORD_INTEGRATION_KEY },
    data: {
      health: { ...patch, checkedAt: new Date().toISOString() },
      lastSyncAt: new Date()
    }
  }).catch(() => null);
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

  const botUser = await discordFetch(token, '/users/@me');
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
    botUserId: botUser?.id,
    botUsername: botUser?.username,
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
    res.json(await componentResponse(prisma, payload));
    return;
  }

  res.json({ type: 4, data: { content: 'Interaction received by Tiwlo.', flags: 64 } });
};

export const registerDiscordRoutes = (app, { prisma, userFromRequest }) => {
  startDiscordGatewayWorker(prisma);

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
