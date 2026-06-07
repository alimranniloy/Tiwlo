import { clean } from '../utils.js';

const DISCORD_INTEGRATION_KEY = 'discord-bot';
const DISCORD_API = 'https://discord.com/api/v10';

const truncate = (value, length = 900) => {
  const text = clean(value);
  return text.length > length ? `${text.slice(0, length - 3)}...` : text;
};

const formatSignal = (signal = {}) => {
  const bits = [];
  if (signal.key) bits.push(`key=${signal.key}`);
  if (signal.score !== undefined) bits.push(`score=${signal.score}`);
  if (signal.block !== undefined) bits.push(`block=${signal.block ? 'yes' : 'no'}`);
  if (signal.previousReason) bits.push(`previous=${signal.previousReason}`);
  if (signal.keyType) bits.push(`type=${signal.keyType}`);
  if (signal.elapsedMs !== undefined) bits.push(`elapsed=${Math.round(Number(signal.elapsedMs || 0))}ms`);
  if (signal.deviceSignupCount !== undefined) bits.push(`deviceSignups=${signal.deviceSignupCount}`);
  if (signal.ipSignupCount !== undefined) bits.push(`ipSignups=${signal.ipSignupCount}`);
  if (signal.subnetSignupCount !== undefined) bits.push(`subnetSignups=${signal.subnetSignupCount}`);
  if (signal.domain) bits.push(`domain=${signal.domain}`);
  const reason = clean(signal.reason || signal.label || signal.key || 'Security signal');
  return bits.length ? `${reason} (${bits.join(', ')})` : reason;
};

const signalSummary = (signals = [], limit = 8) => {
  const lines = (signals || [])
    .filter((signal) => Number(signal.score || 0) > 0 || signal.block)
    .sort((left, right) => Number(right.block === true) - Number(left.block === true) || Number(right.score || 0) - Number(left.score || 0))
    .slice(0, limit)
    .map((signal) => `- ${formatSignal(signal)}`);
  return lines.length ? lines.join('\n') : 'n/a';
};

const discordFetch = async (token, path, options = {}) => {
  const response = await fetch(`${DISCORD_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Discord API failed: ${response.status}`);
  }
  return response.json().catch(() => null);
};

const readDiscordIntegration = async (prisma) => {
  const integration = await prisma.integration.findUnique({ where: { key: DISCORD_INTEGRATION_KEY } }).catch(() => null);
  const config = integration?.config || {};
  if (integration?.status !== 'active' || !clean(config.botToken)) return null;
  return integration;
};

const buildEmbed = ({ blockEventId, action, context = {}, decision = {}, blockedUntil, knownUser }) => {
  const exact = decision.exactReason || {};
  const exactReason = clean(exact.reason || decision.reason || 'Security Check Failed');
  const categories = Array.isArray(exact.categories) && exact.categories.length ? exact.categories.join(', ') : 'n/a';
  const signals = Array.isArray(decision.signals) ? decision.signals : [];
  const blocking = signals.filter((signal) => signal.block);
  return {
    title: 'tSecurity user blocked',
    color: 0xef4444,
    description: truncate(exactReason, 500),
    fields: [
      { name: 'Exact block reason', value: truncate(exactReason, 1024), inline: false },
      { name: 'Reason categories', value: truncate(categories, 512), inline: false },
      { name: 'All fraud signals', value: truncate(signalSummary(signals), 1024), inline: false },
      { name: 'Blocking signals', value: String(blocking.length), inline: true },
      { name: 'Action', value: clean(action || 'gateway'), inline: true },
      { name: 'Risk score', value: String(decision.riskScore || 0), inline: true },
      { name: 'Blocked until', value: blockedUntil ? new Date(blockedUntil).toISOString() : 'n/a', inline: true },
      { name: 'Email', value: context.email || 'n/a', inline: true },
      { name: 'Phone', value: context.phone || 'n/a', inline: true },
      { name: 'Country', value: context.country || 'n/a', inline: true },
      { name: 'IP', value: context.ipAddress || 'n/a', inline: true },
      { name: 'Subnet', value: context.ipSubnet || 'n/a', inline: true },
      { name: 'Device', value: context.deviceHash ? context.deviceHash.slice(0, 16) : 'n/a', inline: true },
      { name: 'Known user', value: knownUser?.id || 'n/a', inline: false }
    ],
    timestamp: new Date().toISOString(),
    footer: { text: `tSecurity block ${blockEventId}` }
  };
};

const postWebhook = async (webhookUrl, payload) => {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Discord webhook failed: ${response.status}`);
  }
  return true;
};

export const notifyTSecurityBlock = async ({ prisma, blockEventId, action, context, decision, blockedUntil, knownUser }) => {
  const embed = buildEmbed({ blockEventId, action, context, decision, blockedUntil, knownUser });
  const exactReason = clean(decision?.exactReason?.reason || decision?.reason || 'Security Check Failed');
  const payload = {
    content: truncate(`tSecurity blocked ${context?.email || context?.ipAddress || 'unknown user'} | ${exactReason}`, 1800),
    embeds: [embed],
    allowed_mentions: { parse: [] }
  };
  const delivered = [];
  const errors = [];
  const integration = await readDiscordIntegration(prisma);
  const config = integration?.config || {};

  const webhookUrl = clean(
    process.env.TSECURITY_DISCORD_WEBHOOK_URL
    || config.tSecurityWebhookUrl
    || config.securityWebhookUrl
    || config.webhookUrl
  );
  if (webhookUrl) {
    try {
      await postWebhook(webhookUrl, payload);
      delivered.push('webhook');
    } catch (error) {
      errors.push(`webhook: ${error.message || String(error)}`);
    }
  }

  const channelId = clean(config.tSecurityChannelId || config.logChannelId || config.ticketChannelId);
  if (integration && channelId) {
    try {
      await discordFetch(clean(config.botToken), `/channels/${encodeURIComponent(channelId)}/messages`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      delivered.push(channelId);
    } catch (error) {
      errors.push(`channel ${channelId}: ${error.message || String(error)}`);
    }
  }

  return { sent: delivered.length > 0, delivered, errors };
};
