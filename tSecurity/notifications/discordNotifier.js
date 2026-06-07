import { clean } from '../utils.js';

const DISCORD_INTEGRATION_KEY = 'discord-bot';
const DISCORD_API = 'https://discord.com/api/v10';

const truncate = (value, length = 900) => {
  const text = clean(value);
  return text.length > length ? `${text.slice(0, length - 3)}...` : text;
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

const buildEmbed = ({ blockEventId, action, context = {}, decision = {}, blockedUntil, knownUser }) => ({
  title: 'tSecurity user blocked',
  color: 0xef4444,
  description: truncate(decision.reason || 'Security Check Failed', 500),
  fields: [
    { name: 'Reason', value: truncate(decision.reason || 'Security Check Failed', 256), inline: false },
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
});

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
  const payload = { embeds: [embed] };
  const delivered = [];

  const webhookUrl = clean(process.env.TSECURITY_DISCORD_WEBHOOK_URL);
  if (webhookUrl) {
    await postWebhook(webhookUrl, payload);
    delivered.push('webhook');
  }

  const integration = await readDiscordIntegration(prisma);
  const config = integration?.config || {};
  const channelId = clean(config.tSecurityChannelId || config.logChannelId || config.ticketChannelId);
  if (integration && channelId) {
    await discordFetch(clean(config.botToken), `/channels/${encodeURIComponent(channelId)}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    delivered.push(channelId);
  }

  return { sent: delivered.length > 0, delivered };
};
