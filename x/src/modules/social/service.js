import { randomBytes } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { isAdmin, requireAdmin, requireAuth } from '../../core/auth.js';
import { AppError, forbidden, notFound } from '../../core/errors.js';
import { removeUndefined } from '../../core/format.js';
import { writeAudit } from '../../core/audit.js';
import { convertMoneyForCtx, startInvoicePayment } from '../billing/service.js';
import { enforceTextModeration } from './moderation.js';

export const SOCIAL_SETTING_KEY = 'social';

const SOCIAL_DEFAULTS = Object.freeze({
  enabled: true,
  registrationsEnabled: true,
  postingEnabled: true,
  messagingEnabled: true,
  callsEnabled: true,
  liveEnabled: true,
  mediaMaxMb: 2048,
  autoTranscode: true,
  profileEffects: {
    replayIntervalSeconds: 0,
    loopCount: 2
  },
  verificationPackages: [
    { id: 'blue_pro', name: 'Blue Badge Pro', badgeType: 'blue', priceUsd: 11, periodMonths: 1, enabled: true, notableOnly: false, features: ['Verified blue badge', 'Account protection', 'Priority support'] },
    { id: 'blue_plus', name: 'Blue Badge Plus', badgeType: 'blue', priceUsd: 30, periodMonths: 1, enabled: true, notableOnly: false, features: ['Everything in Pro', 'Enhanced profile support', 'Priority review'] },
    { id: 'gold_notable', name: 'Gold Notable', badgeType: 'gold', priceUsd: 0, periodMonths: 0, enabled: true, notableOnly: true, features: ['For notable people and organizations', 'Administrator review required'] }
  ],
  moderation: {
    reportsEnabled: true,
    autoDisableExplicit: true,
    explicitThreshold: 0.68,
    reviewThreshold: 0.38,
    sexyBlockThreshold: 0.88,
    blockedWords: [],
    provider: 'local-nsfwjs-mobilenet-v2-mid'
  },
  stunServers: [{ urls: 'stun:stun.l.google.com:19302' }]
});

const DEFAULT_PROFILE_DECORATIONS = Object.freeze([
  { slug: 'angry', name: 'Angry Energy', assetUrl: '/brand/decorations/angry.png', fileName: 'angry.png', animated: true, sortOrder: 10 },
  { slug: 'spirit-embers', name: 'Spirit Embers', assetUrl: '/brand/decorations/spirit_embers.png', fileName: 'spirit_embers.png', animated: true, sortOrder: 20 },
  { slug: 'strawberry-vine', name: 'Strawberry Vine', assetUrl: '/brand/decorations/strawberry_vine.png', fileName: 'strawberry_vine.png', animated: true, sortOrder: 30 },
  { slug: 'wizards-staff', name: "Wizard's Staff", assetUrl: '/brand/decorations/wizards_staff.png', fileName: 'wizards_staff.png', animated: true, sortOrder: 40 },
  { slug: 'pumpkin-spice', name: 'Pumpkin Spice', assetUrl: '/brand/decorations/pumpkin_spice.png', fileName: 'pumpkin_spice.png', animated: true, sortOrder: 50 },
  { slug: 'soul-leaving-body', name: 'Soul Leaving Body', assetUrl: '/brand/decorations/soul_leaving_body.png', fileName: 'soul_leaving_body.png', animated: true, sortOrder: 60 },
  { slug: 'treasure-and-key', name: 'Treasure and Key', assetUrl: '/brand/decorations/treasure_and_key.png', fileName: 'treasure_and_key.png', animated: true, sortOrder: 70 }
]);

const DEFAULT_PROFILE_EFFECTS = Object.freeze([
  { slug: 'flow-profile-effect', name: 'Flow', assetUrl: '/brand/profile-effects/flow.png', fileName: 'flow.png', animated: true, width: 450, height: 880, sortOrder: 10 }
]);

const AVATAR_DECORATION_KIND = 'avatar-decoration';
const PROFILE_EFFECT_KIND = 'profile-effect';

const POST_TYPES = new Set(['post', 'news', 'reel', 'video', 'live', 'story']);
const VISIBILITIES = new Set(['public', 'followers', 'private']);
const COMMENT_PERMISSIONS = new Set(['everyone', 'followers', 'none']);
const GROUP_PRIVACIES = new Set(['public', 'private']);
const GROUP_ROLES = new Set(['admin', 'editor', 'member']);
const MESSAGE_TYPES = new Set(['text', 'image', 'video', 'audio', 'file', 'system']);
const CALL_TYPES = new Set(['audio', 'video']);
const PENDING_CALL_STATUSES = ['calling', 'ringing', 'connecting'];
const ACTIVE_CALL_STATUSES = ['calling', 'ringing', 'connecting', 'active'];
const CALL_EXPIRY_MS = 60_000;
const ACTIVE_CALL_STALE_MS = 90_000;
const ONLINE_CALL_WINDOW_MS = 75_000;
const RESTRICTED_SOCIAL_STATUSES = new Set(['disabled', 'banned', 'blocked', 'suspended']);
const SOCIAL_PRESENCE_TOUCH_MS = 60_000;
const socialPresenceTouches = new Map();
const linkPreviewCache = new Map();
const domainAgeCache = new Map();

const stableTextSeed = (value) => {
  let hash = 2166136261;
  for (const character of String(value || '')) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const recommendationTokens = (...values) => {
  const words = values.flatMap((value) => {
    if (value === null || value === undefined) return [];
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return text.toLowerCase().match(/[\p{L}\p{N}_]{3,}/gu) || [];
  });
  return new Set(words.filter((word) => !['this', 'that', 'with', 'from', 'your', 'have', 'will', 'post', 'video'].includes(word)).slice(0, 120));
};

const tokenOverlap = (left, right) => {
  if (!left.size || !right.size) return 0;
  let matches = 0;
  for (const token of left) if (right.has(token)) matches += 1;
  return matches;
};

const createSocialNotification = async (ctx, {
  ownerId,
  scopeId = '',
  type = 'info',
  title,
  message,
  metadata = {}
}) => {
  if (!ownerId) return null;
  return ctx.prisma.notification.create({
    data: {
      ownerId,
      scope: 'social',
      scopeId,
      type,
      title: bounded(title, 180) || 'Tiwi',
      message: bounded(message, 1000) || '',
      metadata
    }
  });
};

const createMessageNotification = async (ctx, actor, conversation, message) => {
  const recipients = (conversation.members || []).filter((member) => member.userId !== actor.id && !member.muted);
  await Promise.all(recipients.map(async (member) => {
    const existing = await ctx.prisma.notification.findFirst({
      where: {
        ownerId: member.userId,
        scope: 'social',
        scopeId: conversation.id,
        type: conversation.requestStatus === 'pending' ? 'message_request' : 'message',
        status: 'unread'
      },
      orderBy: { createdAt: 'desc' }
    });
    const count = Number(existing?.metadata?.count || 0) + 1;
    const metadata = {
      ...(existing?.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}),
      count,
      conversationId: conversation.id,
      actorId: actor.id,
      actorName: actor.name,
      actorAvatar: actor.avatar || null,
      messageId: message.id,
      messageType: message.type
    };
    const preview = message.body || (message.type === 'audio' ? 'Sent a voice message' : `Sent a ${message.type}`);
    if (existing) {
      await ctx.prisma.notification.update({
        where: { id: existing.id },
        data: {
          title: actor.name,
          message: count > 1 ? `${count} new messages` : preview,
          metadata,
          updatedAt: new Date()
        }
      });
    } else {
      await createSocialNotification(ctx, {
        ownerId: member.userId,
        scopeId: conversation.id,
        type: conversation.requestStatus === 'pending' ? 'message_request' : 'message',
        title: actor.name,
        message: conversation.requestStatus === 'pending' ? 'Sent you a message request' : preview,
        metadata
      });
    }
  }));
};

const bounded = (value, max = 5000) => {
  if (value === null || value === undefined) return value;
  return String(value).trim().slice(0, max);
};

const compactObject = (value, limits = {}) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(limits).flatMap(([key, max]) => {
    const item = value[key];
    if (item === null || item === undefined) return [];
    if (typeof max === 'number') return [[key, bounded(item, max)]];
    if (max === 'boolean') return [[key, Boolean(item)]];
    return [];
  }));
};

const sanitizePostMetadata = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const metadata = compactObject(value, {
    music: 160, locationLabel: 160, feeling: 80, background: 24, crossPost: 'boolean'
  });
  const ids = (items) => Array.isArray(items) ? [...new Set(items.map((item) => bounded(item, 80)).filter(Boolean))].slice(0, 20) : [];
  metadata.taggedUserIds = ids(value.taggedUserIds);
  metadata.collaboratorIds = ids(value.collaboratorIds);
  if (value.linkPreview && typeof value.linkPreview === 'object') {
    metadata.linkPreview = compactObject(value.linkPreview, {
      url: 2000, canonicalUrl: 2000, domain: 255, title: 300, description: 800,
      imageUrl: 2000, siteName: 160, faviconUrl: 2000, registeredAt: 80
    });
    const age = Number(value.linkPreview.domainAgeYears);
    if (Number.isFinite(age)) metadata.linkPreview.domainAgeYears = Math.max(0, Math.min(200, Math.floor(age)));
  }
  return metadata;
};

const isPrivateAddress = (address) => {
  const value = String(address || '').toLowerCase().split('%')[0];
  if (!value) return true;
  if (value === '::1' || value === '::' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb')) return true;
  if (value.startsWith('::ffff:')) return isPrivateAddress(value.slice(7));
  if (isIP(value) !== 4) return false;
  const [a, b] = value.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19));
};

const assertPublicUrl = async (rawUrl) => {
  let target;
  try { target = new URL(bounded(rawUrl, 2000)); } catch { throw new AppError('Enter a valid link', 'BAD_USER_INPUT'); }
  if (!['http:', 'https:'].includes(target.protocol)) throw new AppError('Only web links can be previewed', 'BAD_USER_INPUT');
  const hostname = target.hostname.toLowerCase();
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) throw new AppError('This link cannot be previewed', 'BAD_USER_INPUT');
  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new AppError('This link cannot be previewed', 'BAD_USER_INPUT');
  } else {
    const addresses = await lookup(hostname, { all: true, verbatim: true }).catch(() => []);
    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new AppError('This link cannot be previewed', 'BAD_USER_INPUT');
  }
  target.hash = '';
  return target;
};

const decodeHtml = (value = '') => String(value)
  .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));

const htmlAttributes = (tag = '') => Object.fromEntries([...tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
  .map((match) => [match[1].toLowerCase(), decodeHtml(match[2] ?? match[3] ?? match[4] ?? '')]));

const metaValue = (html, ...keys) => {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = htmlAttributes(match[0]);
    if (wanted.has(String(attributes.property || attributes.name || '').toLowerCase()) && attributes.content) return bounded(attributes.content, 2000);
  }
  return null;
};

const absoluteWebUrl = (value, base) => {
  if (!value) return null;
  try { return new URL(value, base).toString(); } catch { return null; }
};

const readLimitedHtml = async (response, maxBytes = 600_000) => {
  if (!response.body?.getReader) return (await response.text()).slice(0, maxBytes);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  while (size < maxBytes) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    text += decoder.decode(value, { stream: true });
    if (size >= maxBytes) await reader.cancel();
  }
  return text.slice(0, maxBytes);
};

const domainRegistration = async (hostname) => {
  const clean = hostname.replace(/^www\./, '');
  const labels = clean.split('.').filter(Boolean);
  const commonSecondLevel = new Set(['co', 'com', 'net', 'org', 'gov', 'ac', 'edu']);
  const key = labels.length <= 2 ? clean
    : commonSecondLevel.has(labels.at(-2)) && labels.at(-1)?.length === 2 ? labels.slice(-3).join('.')
      : labels.slice(-2).join('.');
  const cached = domainAgeCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  let value = { registeredAt: null, domainAgeYears: null };
  try {
    const response = await fetch(`https://rdap.org/domain/${encodeURIComponent(key)}`, { signal: controller.signal, headers: { accept: 'application/rdap+json, application/json' } });
    if (response.ok) {
      const json = await response.json();
      const event = (Array.isArray(json.events) ? json.events : []).find((item) => ['registration', 'registered'].includes(String(item.eventAction).toLowerCase()));
      const date = event?.eventDate ? new Date(event.eventDate) : null;
      if (date && !Number.isNaN(date.getTime())) value = {
        registeredAt: date.toISOString(),
        domainAgeYears: Math.max(0, Math.floor((Date.now() - date.getTime()) / 31_556_952_000))
      };
    }
  } catch { /* A preview still works when a registry does not expose RDAP. */ }
  finally { clearTimeout(timeout); }
  domainAgeCache.set(key, { value, expiresAt: Date.now() + 86_400_000 });
  return value;
};

export const getLinkPreview = async (ctx, rawUrl) => {
  await requireAuth(ctx);
  const original = await assertPublicUrl(rawUrl);
  const cached = linkPreviewCache.get(original.toString());
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  let target = original;
  let response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);
  try {
    for (let redirect = 0; redirect < 5; redirect += 1) {
      response = await fetch(target, {
        redirect: 'manual', signal: controller.signal,
        headers: { accept: 'text/html,application/xhtml+xml;q=0.9', 'user-agent': 'TiwiLinkPreview/1.0 (+https://tiwlo.com)' }
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) break;
        target = await assertPublicUrl(new URL(location, target).toString());
        continue;
      }
      break;
    }
    if (!response?.ok) throw new AppError('This link did not return a preview', 'BAD_USER_INPUT');
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) throw new AppError('This link has no web preview', 'BAD_USER_INPUT');
    const html = await readLimitedHtml(response);
    const canonicalMatch = html.match(/<link\b[^>]*rel\s*=\s*["'][^"']*canonical[^"']*["'][^>]*>/i);
    const iconMatch = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => htmlAttributes(match[0])).find((attributes) => String(attributes.rel || '').toLowerCase().includes('icon'));
    const canonical = absoluteWebUrl(canonicalMatch ? htmlAttributes(canonicalMatch[0]).href : null, target) || target.toString();
    const titleTag = decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() || '');
    const domainInfo = await domainRegistration(target.hostname);
    const value = {
      url: original.toString(), canonicalUrl: canonical, domain: target.hostname.replace(/^www\./, ''),
      title: metaValue(html, 'og:title', 'twitter:title') || bounded(titleTag, 300) || target.hostname,
      description: metaValue(html, 'og:description', 'twitter:description', 'description'),
      imageUrl: absoluteWebUrl(metaValue(html, 'og:image', 'twitter:image'), target),
      siteName: metaValue(html, 'og:site_name') || target.hostname.replace(/^www\./, ''),
      faviconUrl: absoluteWebUrl(iconMatch?.href, target),
      ...domainInfo
    };
    linkPreviewCache.set(original.toString(), { value, expiresAt: Date.now() + 600_000 });
    if (linkPreviewCache.size > 500) linkPreviewCache.delete(linkPreviewCache.keys().next().value);
    return value;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Link preview is temporarily unavailable', 'UPSTREAM_ERROR');
  } finally { clearTimeout(timeout); }
};

const reportTargetLabel = (targetType = '') => {
  const normalized = bounded(targetType, 40).toLowerCase();
  if (normalized === 'profile') return 'profile';
  if (normalized === 'comment') return 'comment';
  if (normalized === 'reel' || normalized === 'video') return 'reel';
  return 'post';
};

const supportCenterMetadata = (metadata = {}) => ({
  destination: 'support_center',
  noReply: true,
  ...metadata
});

const upsertSocialActivityNotification = async (ctx, {
  ownerId,
  scopeId,
  type,
  actor,
  singular,
  plural,
  count,
  metadata = {}
}) => {
  if (!ownerId || ownerId === actor.id) return null;
  const existing = await ctx.prisma.notification.findFirst({
    where: { ownerId, scope: 'social', scopeId, type, status: 'unread' },
    orderBy: { createdAt: 'desc' }
  });
  const normalizedCount = Math.max(1, Number(count) || Number(existing?.metadata?.count) + 1 || 1);
  const actorIds = [...new Set([actor.id, ...((Array.isArray(existing?.metadata?.actorIds) ? existing.metadata.actorIds : []))])].slice(0, 12);
  const nextMetadata = {
    ...(existing?.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}),
    ...metadata,
    count: normalizedCount,
    actorIds,
    actorId: actor.id,
    actorName: actor.name,
    actorAvatar: actor.avatar || null
  };
  const message = normalizedCount > 1 ? `${normalizedCount} people ${plural}` : singular;
  if (existing) return ctx.prisma.notification.update({
    where: { id: existing.id },
    data: { title: actor.name, message, metadata: nextMetadata, updatedAt: new Date() }
  });
  return createSocialNotification(ctx, {
    ownerId,
    scopeId,
    type,
    title: actor.name,
    message,
    metadata: nextMetadata
  });
};

const notifyMentions = async (ctx, actor, text, scopeId, targetType, metadata = {}, excludedIds = []) => {
  const usernames = [...new Set([...String(text || '').matchAll(/@([a-z0-9_.-]{2,40})/gi)].map((match) => match[1].toLowerCase()))];
  if (!usernames.length) return;
  const profiles = await ctx.prisma.socialProfile.findMany({
    where: { username: { in: usernames } },
    select: { userId: true, username: true, privacy: true }
  });
  const excluded = new Set([actor.id, ...excludedIds]);
  await Promise.all(profiles.filter((profile) => !excluded.has(profile.userId) && profile.privacy?.allowMentions !== false).map((profile) =>
    upsertSocialActivityNotification(ctx, {
      ownerId: profile.userId,
      scopeId,
      type: 'mention',
      actor,
      singular: `Mentioned you in a ${targetType}`,
      plural: `mentioned you in a ${targetType}`,
      count: 1,
      metadata: { ...metadata, targetType, mentionedUsername: profile.username }
    })
  ));
};

const safeDate = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError('Invalid date', 'BAD_USER_INPUT');
  return date;
};

const boundedLimit = (value, fallback = 30, max = 100) => Math.max(1, Math.min(Number(value) || fallback, max));

const touchSocialPresence = (ctx, userId) => {
  if (!userId) return;
  const now = Date.now();
  if (now - (socialPresenceTouches.get(userId) || 0) < SOCIAL_PRESENCE_TOUCH_MS) return;
  socialPresenceTouches.set(userId, now);
  if (socialPresenceTouches.size > 5000) socialPresenceTouches.delete(socialPresenceTouches.keys().next().value);
  ctx.prisma.user.update({ where: { id: userId }, data: { socialLastActiveAt: new Date(now) } }).catch(() => undefined);
};

const validateOwnedMedia = (actorId, media) => {
  const prefix = `/api/social/media/files/${actorId}/`;
  for (const item of media) {
    if (!item || !['image', 'video', 'audio', 'file'].includes(String(item.type || '').toLowerCase())) continue;
    const values = [item.url, item.hlsUrl, item.thumbnailUrl].filter(Boolean);
    if (!values.length) throw new AppError('Media URL is missing', 'BAD_USER_INPUT');
    for (const value of values) {
      let path = '';
      try { path = new URL(String(value), 'https://tiwlo.invalid').pathname; } catch { /* rejected below */ }
      if (!path.startsWith(prefix)) throw new AppError('Posts can only use media uploaded by this account', 'FORBIDDEN');
    }
  }
};

const usernameFrom = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9._]/g, '')
  .replace(/^[._]+|[._]+$/g, '')
  .slice(0, 30);

const uniqueUsername = async (ctx, actor, requested) => {
  const base = usernameFrom(requested || actor.email?.split('@')[0] || actor.name) || `user${actor.id.slice(-6)}`;
  if (base.length < 3) throw new AppError('Username must contain at least 3 letters or numbers', 'BAD_USER_INPUT');
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base.slice(0, 25)}${attempt}`;
    const existing = await ctx.prisma.socialProfile.findUnique({ where: { username: candidate } });
    if (!existing || existing.userId === actor.id) return candidate;
  }
  throw new AppError('Unable to reserve this username', 'CONFLICT');
};

export const getSettings = async (ctx) => {
  const setting = await ctx.prisma.systemSetting.findUnique({
    where: { scope_scopeId_key: { scope: 'platform', scopeId: '', key: SOCIAL_SETTING_KEY } }
  });
  const stored = setting?.value && typeof setting.value === 'object' && !Array.isArray(setting.value) ? setting.value : {};
  return {
    ...SOCIAL_DEFAULTS,
    ...stored,
    moderation: { ...SOCIAL_DEFAULTS.moderation, ...(stored.moderation || {}) },
    profileEffects: { ...SOCIAL_DEFAULTS.profileEffects, ...(stored.profileEffects || {}) },
    verificationPackages: Array.isArray(stored.verificationPackages) ? stored.verificationPackages : SOCIAL_DEFAULTS.verificationPackages,
    stunServers: Array.isArray(stored.stunServers) ? stored.stunServers : SOCIAL_DEFAULTS.stunServers
  };
};

const requireSocialFeature = async (ctx, key) => {
  if (RESTRICTED_SOCIAL_STATUSES.has(String(ctx.user?.status || '').trim().toLowerCase())) {
    throw new AppError(ctx.user?.socialRestrictionReason || 'This account is disabled and cannot use Tiwi Social.', 'FORBIDDEN');
  }
  if (ctx.user?.signupSource === 'social_app' && !ctx.user?.emailVerifiedAt) {
    throw new AppError('Verify your email before using Tiwi Social', 'FORBIDDEN');
  }
  touchSocialPresence(ctx, ctx.user?.id);
  const settings = await getSettings(ctx);
  if (!settings.enabled) throw new AppError('Tiwlo Social is currently disabled', 'SERVICE_UNAVAILABLE');
  if (key && settings[key] === false) throw new AppError('This Social feature is currently disabled', 'FORBIDDEN');
  return settings;
};

const profileInclude = {
  avatarDecoration: true,
  profileEffect: true,
  user: {
    include: {
      _count: { select: { socialFollowers: true, socialFollowing: true, socialPosts: true } }
    }
  }
};

const decorationSlug = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80);

const ensureDefaultProfileDecorations = async (ctx) => {
  const count = await ctx.prisma.socialProfileDecoration.count({ where: { kind: AVATAR_DECORATION_KIND } });
  if (count > 0) return;
  await ctx.prisma.socialProfileDecoration.createMany({
    data: DEFAULT_PROFILE_DECORATIONS.map((item) => ({
      ...item,
      kind: AVATAR_DECORATION_KIND,
      mimeType: 'image/png',
      width: 288,
      height: 288,
      priceUsd: 0,
      status: 'active'
    })),
    skipDuplicates: true
  });
};

const ensureDefaultProfileEffects = async (ctx) => {
  const count = await ctx.prisma.socialProfileDecoration.count({ where: { kind: PROFILE_EFFECT_KIND } });
  if (count > 0) return;
  await ctx.prisma.socialProfileDecoration.createMany({
    data: DEFAULT_PROFILE_EFFECTS.map((item) => ({
      ...item,
      kind: PROFILE_EFFECT_KIND,
      mimeType: 'image/png',
      priceUsd: 0,
      status: 'active'
    })),
    skipDuplicates: true
  });
};

const mapDecoration = (decoration, actorId, appliedId) => {
  const ownership = decoration.ownerships?.find((row) => row.userId === actorId);
  return {
    ...decoration,
    owned: Number(decoration.priceUsd || 0) <= 0 || Boolean(ownership),
    applied: decoration.id === appliedId,
    ownershipSource: Number(decoration.priceUsd || 0) <= 0 ? 'free' : ownership?.source || null,
    ownershipCount: decoration._count?.ownerships || 0
  };
};

const mapProfile = async (ctx, profile, viewerId) => {
  if (!profile) return null;
  let activeProfile = profile;
  if (profile.verified && profile.badgeExpiresAt && profile.badgeExpiresAt <= new Date()) {
    activeProfile = await ctx.prisma.socialProfile.update({
      where: { userId: profile.userId },
      data: { verified: false, badgeType: 'none', badgePlan: null, badgeExpiresAt: null },
      include: profileInclude
    });
  }
  const isFollowing = viewerId && viewerId !== activeProfile.userId
    ? Boolean(await ctx.prisma.socialFollow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: activeProfile.userId } }
    }))
    : false;
  return {
    ...activeProfile,
    followerCount: activeProfile.user?._count?.socialFollowers || 0,
    followingCount: activeProfile.user?._count?.socialFollowing || 0,
    postCount: activeProfile.user?._count?.socialPosts || 0,
    isFollowing
  };
};

export const ensureProfile = async (ctx, actor) => {
  const found = await ctx.prisma.socialProfile.findUnique({ where: { userId: actor.id }, include: profileInclude });
  if (found) return found;
  await requireSocialFeature(ctx, 'registrationsEnabled');
  const username = await uniqueUsername(ctx, actor);
  return ctx.prisma.socialProfile.create({
    data: { userId: actor.id, username },
    include: profileInclude
  });
};

export const profileForUser = async (ctx, userId) => {
  const actor = await requireAuth(ctx);
  const user = await ctx.prisma.user.findUnique({ where: { id: userId } });
  if (!user) notFound('User');
  return mapProfile(ctx, await ensureProfile(ctx, user), actor.id);
};

export const getProfile = async (ctx, { userId, username }) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx);
  let profile = null;
  if (userId) profile = await ctx.prisma.socialProfile.findUnique({ where: { userId }, include: profileInclude });
  if (!profile && username) profile = await ctx.prisma.socialProfile.findUnique({ where: { username: usernameFrom(username) }, include: profileInclude });
  if (!profile && (!userId && !username)) profile = await ensureProfile(ctx, actor);
  if (!profile) return null;
  if (profile.userId !== actor.id && !isAdmin(actor)) {
    const blocked = await ctx.prisma.socialBlock.findFirst({ where: { OR: [
      { userId: actor.id, targetUserId: profile.userId }, { userId: profile.userId, targetUserId: actor.id }
    ] } });
    if (blocked) forbidden('This profile is unavailable');
  }
  const visibility = profile.privacy?.profileVisibility || 'public';
  if (visibility === 'private' && profile.userId !== actor.id && !isAdmin(actor)) forbidden('This profile is private');
  return mapProfile(ctx, profile, actor.id);
};

export const upsertProfile = async (ctx, input) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'registrationsEnabled');
  const existing = await ensureProfile(ctx, actor);
  await enforceTextModeration(ctx, {
    userId: actor.id, targetType: 'profile', targetId: existing.id,
    text: [input.username, input.bio, input.about, input.category, input.website, input.location].filter(Boolean).join(' ')
  });
  const username = input.username === undefined ? undefined : await uniqueUsername(ctx, actor, input.username);
  const profile = await ctx.prisma.$transaction(async (tx) => {
    if (input.avatar !== undefined) {
      await tx.user.update({ where: { id: actor.id }, data: { avatar: bounded(input.avatar, 2000) || null } });
    }
    return tx.socialProfile.update({
      where: { id: existing.id },
      data: removeUndefined({
        username,
        bio: input.bio === undefined ? undefined : bounded(input.bio, 240),
        about: input.about === undefined ? undefined : bounded(input.about, 3000),
        category: input.category === undefined ? undefined : bounded(input.category, 80),
        website: input.website === undefined ? undefined : bounded(input.website, 500),
        location: input.location === undefined ? undefined : bounded(input.location, 160),
        coverUrl: input.coverUrl === undefined ? undefined : bounded(input.coverUrl, 2000),
        privacy: input.privacy,
        preferences: input.preferences
      }),
      include: profileInclude
    });
  });
  return mapProfile(ctx, profile, actor.id);
};

export const searchProfiles = async (ctx, query, limit) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx);
  const search = bounded(query, 120);
  const [blocks, following] = await Promise.all([
    ctx.prisma.socialBlock.findMany({ where: { OR: [{ userId: actor.id }, { targetUserId: actor.id }] }, select: { userId: true, targetUserId: true } }),
    ctx.prisma.socialFollow.findMany({ where: { followerId: actor.id }, select: { followingId: true } })
  ]);
  const blockedIds = new Set(blocks.flatMap((row) => [row.userId, row.targetUserId]).filter((id) => id !== actor.id));
  const followingIds = new Set(following.map((row) => row.followingId));
  const [followsActor, secondDegree] = await Promise.all([
    ctx.prisma.socialFollow.findMany({ where: { followingId: actor.id }, select: { followerId: true }, take: 500 }),
    followingIds.size ? ctx.prisma.socialFollow.findMany({
      where: { followerId: { in: [...followingIds] }, followingId: { not: actor.id } },
      select: { followingId: true }, take: 1000
    }) : []
  ]);
  const followsActorIds = new Set(followsActor.map((row) => row.followerId));
  const commonConnectionCounts = secondDegree.reduce((counts, row) => {
    counts.set(row.followingId, (counts.get(row.followingId) || 0) + 1);
    return counts;
  }, new Map());
  const rows = await ctx.prisma.socialProfile.findMany({
    where: {
      userId: { notIn: [actor.id, ...blockedIds, ...followingIds] },
      user: { status: 'active' },
      ...(search ? {
        OR: [
          { username: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { bio: { contains: search, mode: 'insensitive' } }
        ]
      } : {}),
      NOT: { privacy: { path: ['profileVisibility'], equals: 'private' } }
    },
    include: profileInclude,
    orderBy: [{ verified: 'desc' }, { updatedAt: 'desc' }],
    take: Math.min(boundedLimit(limit, 30, 100) * 3, 100)
  });
  const ranked = rows.map((row) => ({
    row,
    score: (row.user?.country && actor.country && row.user.country === actor.country ? 40 : 0)
      + (row.user?.primaryRegion && actor.primaryRegion && row.user.primaryRegion === actor.primaryRegion ? 15 : 0)
      + (followsActorIds.has(row.userId) ? 70 : 0)
      + Math.min(commonConnectionCounts.get(row.userId) || 0, 8) * 12
      + (row.verified ? 18 : 0)
      + Math.log1p(row.user?._count?.socialFollowers || 0) * 5
  })).sort((left, right) => right.score - left.score).slice(0, boundedLimit(limit, 30, 100));
  return Promise.all(ranked.map(({ row }) => mapProfile(ctx, row, actor.id)));
};

export const listConnections = async (ctx, userId, limit) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx);
  const targetId = userId || actor.id;
  await getProfile(ctx, { userId: targetId });
  const [following, followers] = await Promise.all([
    ctx.prisma.socialFollow.findMany({ where: { followerId: targetId }, select: { followingId: true } }),
    ctx.prisma.socialFollow.findMany({ where: { followingId: targetId }, select: { followerId: true } })
  ]);
  const followerIds = new Set(followers.map((row) => row.followerId));
  const connectionIds = following.map((row) => row.followingId).filter((id) => followerIds.has(id));
  if (!connectionIds.length) return [];
  const blocks = await ctx.prisma.socialBlock.findMany({
    where: { OR: [{ userId: actor.id }, { targetUserId: actor.id }] },
    select: { userId: true, targetUserId: true }
  });
  const blockedIds = new Set(blocks.flatMap((row) => [row.userId, row.targetUserId]).filter((id) => id !== actor.id));
  const rows = await ctx.prisma.socialProfile.findMany({
    where: { userId: { in: connectionIds.filter((id) => !blockedIds.has(id)) }, user: { status: 'active' } },
    include: profileInclude,
    orderBy: [{ verified: 'desc' }, { updatedAt: 'desc' }],
    take: boundedLimit(limit, 12, 100)
  });
  return Promise.all(rows.map((row) => mapProfile(ctx, row, actor.id)));
};

const profilesForIds = async (ctx, ids, viewerId, limit) => {
  const normalized = [...new Set(ids.filter(Boolean))].slice(0, boundedLimit(limit, 50, 100));
  if (!normalized.length) return [];
  const rows = await ctx.prisma.socialProfile.findMany({
    where: { userId: { in: normalized } },
    include: profileInclude
  });
  const byUser = new Map(rows.map((row) => [row.userId, row]));
  return Promise.all(normalized.map((id) => byUser.get(id)).filter(Boolean).map((row) => mapProfile(ctx, row, viewerId)));
};

const visibleSocialIds = async (ctx, actorId, ids) => {
  if (!ids.length) return [];
  const blocks = await ctx.prisma.socialBlock.findMany({
    where: { OR: [{ userId: actorId }, { targetUserId: actorId }] },
    select: { userId: true, targetUserId: true }
  });
  const blockedIds = new Set(blocks.flatMap((row) => [row.userId, row.targetUserId]).filter((id) => id !== actorId));
  return ids.filter((id) => !blockedIds.has(id));
};

export const listFollowers = async (ctx, userId, limit) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx);
  const targetId = userId || actor.id;
  await getProfile(ctx, { userId: targetId });
  const rows = await ctx.prisma.socialFollow.findMany({
    where: { followingId: targetId },
    select: { followerId: true },
    orderBy: { createdAt: 'desc' },
    take: boundedLimit(limit, 50, 100)
  });
  const ids = await visibleSocialIds(ctx, actor.id, rows.map((row) => row.followerId));
  return profilesForIds(ctx, ids, actor.id, limit);
};

export const listFollowing = async (ctx, userId, limit) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx);
  const targetId = userId || actor.id;
  await getProfile(ctx, { userId: targetId });
  const rows = await ctx.prisma.socialFollow.findMany({
    where: { followerId: targetId },
    select: { followingId: true },
    orderBy: { createdAt: 'desc' },
    take: boundedLimit(limit, 50, 100)
  });
  const ids = await visibleSocialIds(ctx, actor.id, rows.map((row) => row.followingId));
  return profilesForIds(ctx, ids, actor.id, limit);
};

export const listBlockedUsers = async (ctx, limit) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx);
  const rows = await ctx.prisma.socialBlock.findMany({
    where: { userId: actor.id },
    select: { targetUserId: true },
    orderBy: { createdAt: 'desc' },
    take: boundedLimit(limit, 50, 100)
  });
  return profilesForIds(ctx, rows.map((row) => row.targetUserId), actor.id, limit);
};

export const followUser = async (ctx, userId, follow) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx);
  if (actor.id === userId) throw new AppError('You cannot follow yourself', 'BAD_USER_INPUT');
  const target = await ctx.prisma.user.findUnique({ where: { id: userId } });
  if (!target) notFound('User');
  const blocked = await ctx.prisma.socialBlock.findFirst({ where: { OR: [
    { userId: actor.id, targetUserId: userId }, { userId, targetUserId: actor.id }
  ] } });
  if (blocked) forbidden('This account is unavailable');
  await ensureProfile(ctx, actor);
  await ensureProfile(ctx, target);
  if (follow) {
    await ctx.prisma.socialFollow.upsert({
      where: { followerId_followingId: { followerId: actor.id, followingId: userId } },
      create: { followerId: actor.id, followingId: userId },
      update: {}
    });
    const followerCount = await ctx.prisma.socialFollow.count({ where: { followingId: userId } });
    await upsertSocialActivityNotification(ctx, {
      ownerId: userId,
      scopeId: 'followers',
      type: 'follow',
      actor,
      singular: 'Started following you',
      plural: 'started following you',
      count: followerCount,
      metadata: { actorId: actor.id, actorName: actor.name, actorAvatar: actor.avatar || null }
    });
  } else {
    await ctx.prisma.socialFollow.deleteMany({ where: { followerId: actor.id, followingId: userId } });
  }
  return profileForUser(ctx, userId);
};

export const blockUser = async (ctx, userId, block, reason) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx);
  if (actor.id === userId) throw new AppError('You cannot block yourself', 'BAD_USER_INPUT');
  const target = await ctx.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) notFound('User');
  await ctx.prisma.$transaction(async (tx) => {
    if (block) {
      await tx.socialBlock.upsert({
        where: { userId_targetUserId: { userId: actor.id, targetUserId: userId } },
        create: { userId: actor.id, targetUserId: userId, reason: bounded(reason, 500) },
        update: { reason: bounded(reason, 500) }
      });
      await tx.socialFollow.deleteMany({ where: { OR: [
        { followerId: actor.id, followingId: userId }, { followerId: userId, followingId: actor.id }
      ] } });
      await tx.socialFavorite.deleteMany({ where: { OR: [
        { userId: actor.id, targetUserId: userId }, { userId, targetUserId: actor.id }
      ] } });
    } else {
      await tx.socialBlock.deleteMany({ where: { userId: actor.id, targetUserId: userId } });
    }
  });
  await writeAudit(ctx, block ? 'block_social_user' : 'unblock_social_user', 'user', userId, { reason: bounded(reason, 500) });
  return Boolean(block);
};

const postInclude = (viewerId) => ({
  author: { include: {
    socialProfile: true,
    _count: { select: { socialFollowers: true, socialFollowing: true, socialPosts: true } },
    socialFollowers: viewerId ? { where: { followerId: viewerId }, take: 1 } : false
  } },
  _count: { select: { reactions: true, comments: true, savedBy: true } },
  reactions: viewerId ? { where: { userId: viewerId }, take: 1 } : false,
  savedBy: viewerId ? { where: { userId: viewerId }, take: 1 } : false
});

const mapPost = (post) => ({
  ...post,
  authorProfile: post.author?.socialProfile ? {
    ...post.author.socialProfile,
    followerCount: post.author?._count?.socialFollowers || 0,
    followingCount: post.author?._count?.socialFollowing || 0,
    postCount: post.author?._count?.socialPosts || 0,
    isFollowing: Boolean(post.author?.socialFollowers?.length)
  } : null,
  reactionCount: post._count?.reactions || 0,
  commentCount: post._count?.comments || 0,
  saveCount: post._count?.savedBy || 0,
  viewerReaction: post.reactions?.[0]?.kind || null,
  saved: Boolean(post.savedBy?.length),
  recommended: Boolean(post.recommended),
  recommendationLabel: post.recommendationLabel || null
});

const hydrateSharedPostMedia = async (ctx, posts, viewerId) => {
  const rows = Array.isArray(posts) ? posts : [posts];
  const sharedItems = rows.flatMap((post) => (Array.isArray(post?.media) ? post.media : []))
    .filter((item) => item?.type === 'shared_post' && item.sharedPostId);
  if (!sharedItems.length) return rows;
  const visibility = await feedVisibility(ctx, { id: viewerId });
  const sourceIds = [...new Set(sharedItems.map((item) => item.sharedPostId))];
  const sources = await ctx.prisma.socialPost.findMany({
    where: { id: { in: sourceIds }, status: 'published', deletedAt: null, OR: visibility },
    include: postInclude(viewerId)
  });
  const sourceById = new Map(sources.map((post) => [post.id, post]));
  const postById = new Map(sourceById);
  let pendingIds = [...new Set(sharedItems.flatMap((item) => [item.sharedRootPostId, item.sharedPostId]).filter(Boolean))];
  for (let depth = 0; depth < 6 && pendingIds.length; depth += 1) {
    const missing = pendingIds.filter((id) => !postById.has(id));
    if (missing.length) {
      const fetched = await ctx.prisma.socialPost.findMany({
        where: { id: { in: missing }, status: 'published', deletedAt: null, OR: visibility },
        include: postInclude(viewerId)
      });
      for (const post of fetched) postById.set(post.id, post);
    }
    pendingIds = [...new Set(pendingIds.flatMap((id) => {
      const post = postById.get(id);
      const share = (Array.isArray(post?.media) ? post.media : []).find((media) => media?.type === 'shared_post');
      return [share?.sharedRootPostId, share?.sharedPostId];
    }).filter((id) => id && !postById.has(id)))];
  }
  const resolveRoot = (item) => {
    let currentId = item.sharedRootPostId || item.sharedPostId;
    const visited = new Set();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const current = postById.get(currentId);
      if (!current) return null;
      const share = (Array.isArray(current.media) ? current.media : []).find((media) => media?.type === 'shared_post');
      if (!share) return current;
      currentId = share.sharedRootPostId || share.sharedPostId;
    }
    return null;
  };
  return rows.map((post) => ({
    ...post,
    media: (Array.isArray(post.media) ? post.media : []).map((item) => {
      if (item?.type !== 'shared_post' || !item.sharedPostId) return item;
      const source = sourceById.get(item.sharedPostId);
      const root = resolveRoot(item);
      if (!root) return item;
      const preview = (Array.isArray(root.media) ? root.media : []).find((media) => media?.type !== 'shared_post') || {};
      const video = ['video', 'reel'].includes(preview.type || root.type);
      return {
        ...item,
        url: preview.url || root.hlsUrl || item.url || '',
        hlsUrl: preview.hlsUrl || root.hlsUrl || item.hlsUrl || null,
        thumbnailUrl: preview.thumbnailUrl || root.thumbnailUrl || (video ? item.thumbnailUrl : preview.url) || '',
        processingStatus: preview.processingStatus || root.processingStatus || item.processingStatus || 'ready',
        sharedRootPostId: root.id,
        sharedAuthorId: item.sharedAuthorId || source?.authorId || null,
        sharedAuthor: item.sharedAuthor || source?.author?.name || source?.author?.socialProfile?.username || 'Tiwi User',
        sharedAvatar: item.sharedAvatar || source?.author?.avatar || '',
        sharedBody: root.body || '',
        sharedMediaType: preview.type || root.type,
        sharedViews: root.viewCount || 0,
        sharedReactions: root._count?.reactions || 0,
        sharedComments: root._count?.comments || 0,
        sharedPublishedAt: root.publishedAt?.toISOString?.() || String(root.publishedAt || '')
      };
    })
  }));
};

const feedVisibility = async (ctx, actor) => {
  const following = await ctx.prisma.socialFollow.findMany({ where: { followerId: actor.id }, select: { followingId: true } });
  return [
    { visibility: 'public' },
    { authorId: actor.id },
    { visibility: 'followers', authorId: { in: following.map((row) => row.followingId) } }
  ];
};

export const listFeed = async (ctx, args = {}) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx);
  if (args.groupId && !await getGroup(ctx, args.groupId)) notFound('Group');
  const take = boundedLimit(args.limit);
  const [favorites, snoozed, blocks, following, followers, recentReactions, actorProfile] = await Promise.all([
    ctx.prisma.socialFavorite.findMany({ where: { userId: actor.id }, select: { targetUserId: true } }),
    ctx.prisma.socialSnooze.findMany({ where: { userId: actor.id, until: { gt: new Date() } }, select: { targetUserId: true } }),
    ctx.prisma.socialBlock.findMany({ where: { OR: [{ userId: actor.id }, { targetUserId: actor.id }] }, select: { userId: true, targetUserId: true } }),
    ctx.prisma.socialFollow.findMany({ where: { followerId: actor.id }, select: { followingId: true } }),
    ctx.prisma.socialFollow.findMany({ where: { followingId: actor.id }, select: { followerId: true } }),
    ctx.prisma.socialPostReaction.findMany({
      where: { userId: actor.id },
      select: { post: { select: { type: true, authorId: true, body: true, author: { select: { socialProfile: { select: { category: true } } } } } } },
      orderBy: { updatedAt: 'desc' }, take: 100
    }),
    ctx.prisma.socialProfile.findUnique({ where: { userId: actor.id }, select: { category: true, preferences: true } })
  ]);
  const favoriteIds = new Set(favorites.map((row) => row.targetUserId));
  const followingIds = new Set(following.map((row) => row.followingId));
  const followerIds = new Set(followers.map((row) => row.followerId));
  const connectionIds = new Set([...followingIds].filter((id) => followerIds.has(id)));
  const hiddenAuthorIds = new Set([
    ...snoozed.map((row) => row.targetUserId),
    ...blocks.flatMap((row) => [row.userId, row.targetUserId]).filter((id) => id !== actor.id)
  ]);
  const typeAffinity = recentReactions.reduce((scores, row) => scores.set(row.post.type, (scores.get(row.post.type) || 0) + 1), new Map());
  const authorAffinity = recentReactions.reduce((scores, row) => scores.set(row.post.authorId, (scores.get(row.post.authorId) || 0) + 1), new Map());
  const interestTokens = recommendationTokens(
    actorProfile?.category,
    actorProfile?.preferences,
    ...recentReactions.slice(0, 40).flatMap((row) => [row.post.body, row.post.author?.socialProfile?.category])
  );
  const where = {
    status: 'published',
    moderationStatus: 'approved',
    deletedAt: null,
    OR: [
      { visibility: 'public' }, { authorId: actor.id },
      { visibility: 'followers', authorId: { in: [...followingIds] } }
    ],
    ...(String(args.type || '').toLowerCase() === 'reel'
      ? { type: { in: ['reel', 'video'] } }
      : args.type ? { type: String(args.type).toLowerCase() } : { type: { not: 'story' } }),
    ...(args.authorId ? { authorId: args.authorId } : {}),
    ...(args.groupId ? { groupId: args.groupId } : {}),
    ...(!args.authorId && hiddenAuthorIds.size ? { authorId: { notIn: [...hiddenAuthorIds] } } : {}),
    ...(args.before ? { publishedAt: { lt: safeDate(args.before) } } : {}),
    ...(String(args.type || '').toLowerCase() === 'story' ? { publishedAt: { gte: new Date(Date.now() - 86_400_000) } } : {})
  };
  const rawRows = await ctx.prisma.socialPost.findMany({
    where,
    include: postInclude(actor.id),
    orderBy: [...(args.authorId ? [{ pinned: 'desc' }] : []), { publishedAt: 'desc' }, { id: 'desc' }],
    take: args.authorId || args.groupId ? take : Math.min(take * 4, 200)
  });
  const rows = await hydrateSharedPostMedia(ctx, rawRows, actor.id);
  if (args.authorId || args.groupId) return rows.map(mapPost);
  const now = Date.now();
  const ranked = rows.map((row) => {
    const ageHours = Math.max(0, (now - new Date(row.publishedAt).getTime()) / 3_600_000);
    const reactions = row._count?.reactions || 0;
    const comments = row._count?.comments || 0;
    const engagement = Math.log1p(reactions + comments * 2.2 + (row.shareCount || 0) * 3 + Math.min(row.viewCount || 0, 50_000) * .025) * 10;
    const contentMatch = tokenOverlap(interestTokens, recommendationTokens(row.body, row.author?.socialProfile?.category));
    const signals = {
      favorite: favoriteIds.has(row.authorId) ? 220 : 0,
      following: followingIds.has(row.authorId) ? 145 : 0,
      connection: connectionIds.has(row.authorId) ? 55 : 0,
      country: actor.country && row.author?.country === actor.country ? 24 : 0,
      region: actor.primaryRegion && row.author?.primaryRegion === actor.primaryRegion ? 14 : 0,
      contentAffinity: Math.min(typeAffinity.get(row.type) || 0, 12) * 2.5,
      creatorAffinity: Math.min(authorAffinity.get(row.authorId) || 0, 10) * 3,
      interestAffinity: Math.min(contentMatch, 8) * 6,
      engagement,
      freshness: 75 / (1 + ageHours / 18),
      verified: row.author?.socialProfile?.verified ? 5 : 0,
      discovery: (stableTextSeed(`${actor.id}:${row.id}:${new Date().toISOString().slice(0, 10)}`) % 1000) / 1000 * 5
    };
    return { row, score: Object.values(signals).reduce((sum, value) => sum + value, 0), signals };
  }).sort((left, right) => right.score - left.score);
  const diversified = [];
  const authorFrequency = new Map();
  for (const item of ranked) {
    const seen = authorFrequency.get(item.row.authorId) || 0;
    item.score -= seen * 22;
    authorFrequency.set(item.row.authorId, seen + 1);
    diversified.push(item);
  }
  diversified.sort((left, right) => right.score - left.score);
  const priority = diversified.filter(({ row }) => favoriteIds.has(row.authorId) || followingIds.has(row.authorId));
  const discovery = diversified.filter(({ row }) => !favoriteIds.has(row.authorId) && !followingIds.has(row.authorId));
  const ordered = priority.splice(0, Math.min(4, priority.length));
  while (ordered.length < diversified.length) {
    if (discovery.length) ordered.push(discovery.shift());
    if (discovery.length) ordered.push(discovery.shift());
    if (priority.length) ordered.push(priority.shift());
    if (!discovery.length && !priority.length) break;
  }
  return ordered.slice(0, take).map(({ row, signals }) => {
    const recommended = row.authorId !== actor.id && !followingIds.has(row.authorId);
    const showRecommendationLabel = recommended && (
      signals.creatorAffinity >= 9 || signals.interestAffinity >= 12 ||
      stableTextSeed(`${actor.id}:${row.id}:recommendation-label`) % 3 === 0
    );
    const recommendationLabel = !showRecommendationLabel ? null
      : signals.creatorAffinity >= 9 ? 'Because you like this creator'
        : signals.interestAffinity >= 12 ? 'Based on your activity'
          : signals.country > 0 ? 'Popular near you'
            : 'Suggested for you';
    return mapPost({ ...row, rankingSignals: signals, recommended, recommendationLabel });
  });
};

export const feedModulePositions = (actorId, feedSize, day = new Date().toISOString().slice(0, 10)) => {
  const size = boundedLimit(feedSize, 60, 100);
  const seed = stableTextSeed(`${actorId}:${day}:feed-modules`);
  const positions = [];
  if (size >= 2) positions.push(2);
  let position = 2;
  let stepIndex = 0;
  while (position < size - 2 && positions.length < 6) {
    const wideGap = stepIndex % 2 === 0;
    const variance = (seed >>> (stepIndex * 3 % 24)) % (wideGap ? 5 : 4);
    position += (wideGap ? 8 : 5) + variance;
    if (position < size) positions.push(position);
    stepIndex += 1;
  }
  return positions;
};

export const listFeedModules = async (ctx, feedSize) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx);
  const day = new Date().toISOString().slice(0, 10);
  const seed = stableTextSeed(`${actor.id}:${day}:feed-modules`);
  const [profiles, reels] = await Promise.all([
    searchProfiles(ctx, '', 24),
    listFeed(ctx, { type: 'reel', limit: 24 })
  ]);
  const positions = feedModulePositions(actor.id, feedSize, day);
  return positions.map((insertAfter, index) => {
    const kind = index % 2 === 0 ? 'people' : 'reels';
    const profileOffset = profiles.length ? (seed + index * 7) % profiles.length : 0;
    const reelOffset = reels.length ? (seed + index * 5) % reels.length : 0;
    const rotate = (items, offset, count) => items.length
      ? [...items.slice(offset), ...items.slice(0, offset)].slice(0, count)
      : [];
    return {
      id: `${day}-${kind}-${insertAfter}`,
      kind,
      insertAfter,
      title: kind === 'people' ? 'People you may know' : 'Reels suggested for you',
      profiles: kind === 'people' ? rotate(profiles, profileOffset, 8) : [],
      posts: kind === 'reels' ? rotate(reels, reelOffset, 10) : []
    };
  }).filter((module) => module.profiles.length || module.posts.length);
};

export const listStories = async (ctx, args = {}) => listFeed(ctx, { ...args, type: 'story', limit: boundedLimit(args.limit, 50, 100) });

export const getPost = async (ctx, id) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx);
  const post = await ctx.prisma.socialPost.findUnique({ where: { id }, include: postInclude(actor.id) });
  if (!post || post.deletedAt || (post.status !== 'published' && post.authorId !== actor.id && !isAdmin(actor))) return null;
  if (post.moderationStatus !== 'approved' && post.authorId !== actor.id && !isAdmin(actor)) return null;
  if (post.authorId !== actor.id && !isAdmin(actor)) {
    const blocked = await ctx.prisma.socialBlock.findFirst({ where: { OR: [
      { userId: actor.id, targetUserId: post.authorId }, { userId: post.authorId, targetUserId: actor.id }
    ] } });
    if (blocked) forbidden('This post is unavailable');
  }
  if (post.visibility === 'private' && post.authorId !== actor.id && !isAdmin(actor)) forbidden();
  const [hydrated] = await hydrateSharedPostMedia(ctx, post, actor.id);
  return mapPost(hydrated);
};

export const createPost = async (ctx, input) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'postingEnabled');
  await ensureProfile(ctx, actor);
  const type = String(input.type || 'post').toLowerCase();
  const visibility = String(input.visibility || 'public').toLowerCase();
  if (!POST_TYPES.has(type)) throw new AppError('Invalid post type', 'BAD_USER_INPUT');
  if (!VISIBILITIES.has(visibility)) throw new AppError('Invalid visibility', 'BAD_USER_INPUT');
  const commentPermission = String(input.commentPermission || 'everyone').toLowerCase();
  if (!COMMENT_PERMISSIONS.has(commentPermission)) throw new AppError('Invalid comment permission', 'BAD_USER_INPUT');
  if (input.groupId) {
    const membership = await ctx.prisma.socialGroupMember.findUnique({ where: { groupId_userId: { groupId: input.groupId, userId: actor.id } } });
    if (!membership || membership.status !== 'active') forbidden('Join this group before posting');
  }
  const body = bounded(input.body, 10000);
  const media = Array.isArray(input.media) ? input.media.slice(0, 20) : [];
  const metadata = sanitizePostMetadata(input.metadata);
  await enforceTextModeration(ctx, { userId: actor.id, targetType: 'post', text: body });
  validateOwnedMedia(actor.id, media);
  if (!body && media.length === 0) throw new AppError('A post needs text or media', 'BAD_USER_INPUT');
  const processingIds = media.map((item) => bounded(item?.processingId, 240)).filter(Boolean);
  const mediaEvents = processingIds.length ? await ctx.prisma.socialModerationEvent.findMany({
    where: { userId: actor.id, targetId: { in: processingIds }, postId: null },
    select: { id: true, decision: true, reason: true, score: true }
  }) : [];
  const reviewEvents = mediaEvents.filter((event) => event.decision === 'review');
  const post = await ctx.prisma.socialPost.create({
    data: {
      authorId: actor.id,
      type,
      body,
      media,
      metadata,
      thumbnailUrl: bounded(input.thumbnailUrl, 2000),
      hlsUrl: bounded(input.hlsUrl, 2000),
      processingStatus: bounded(input.processingStatus, 40) || 'ready',
      visibility,
      commentPermission,
      groupId: input.groupId || null,
      moderationStatus: reviewEvents.length ? 'pending_review' : 'approved',
      moderationReason: reviewEvents[0]?.reason || null,
      moderationScore: reviewEvents.reduce((score, event) => Math.max(score, event.score || 0), 0),
      location: bounded(input.location, 160),
      durationSeconds: input.durationSeconds,
      aspectRatio: input.aspectRatio
    },
    include: postInclude(actor.id)
  });
  if (mediaEvents.length) await ctx.prisma.socialModerationEvent.updateMany({
    where: { id: { in: mediaEvents.map((event) => event.id) } }, data: { postId: post.id }
  });
  await notifyMentions(ctx, actor, body, post.id, 'post', { postId: post.id });
  const collaboratorIds = [...new Set([...(metadata.taggedUserIds || []), ...(metadata.collaboratorIds || [])])]
    .filter((id) => id && id !== actor.id);
  await Promise.all(collaboratorIds.map((ownerId) => upsertSocialActivityNotification(ctx, {
    ownerId, scopeId: post.id, type: 'mention', actor,
    singular: metadata.collaboratorIds?.includes(ownerId) ? 'Invited you to collaborate on a post' : 'Tagged you in a post',
    plural: 'tagged you in a post', count: 1, metadata: { postId: post.id, targetType: 'post' }
  })));
  return mapPost(post);
};

export const updatePost = async (ctx, input) => {
  const actor = await requireAuth(ctx);
  const existing = await ctx.prisma.socialPost.findUnique({ where: { id: input.id } });
  if (!existing) notFound('Post');
  if (existing.authorId !== actor.id && !isAdmin(actor)) forbidden();
  if (input.visibility && !VISIBILITIES.has(String(input.visibility).toLowerCase())) throw new AppError('Invalid visibility', 'BAD_USER_INPUT');
  if (input.commentPermission && !COMMENT_PERMISSIONS.has(String(input.commentPermission).toLowerCase())) throw new AppError('Invalid comment permission', 'BAD_USER_INPUT');
  if (input.body !== undefined) await enforceTextModeration(ctx, { userId: actor.id, targetType: 'post', targetId: input.id, text: input.body });
  if (input.media !== undefined) validateOwnedMedia(actor.id, Array.isArray(input.media) ? input.media.slice(0, 20) : []);
  const updatedMedia = input.media === undefined ? null : Array.isArray(input.media) ? input.media.slice(0, 20) : [];
  const processingIds = updatedMedia?.map((item) => bounded(item?.processingId, 240)).filter(Boolean) || [];
  const mediaEvents = processingIds.length ? await ctx.prisma.socialModerationEvent.findMany({
    where: { userId: actor.id, targetId: { in: processingIds }, postId: null },
    select: { id: true, decision: true, reason: true, score: true }
  }) : [];
  const reviewEvents = mediaEvents.filter((event) => event.decision === 'review');
  const post = await ctx.prisma.socialPost.update({
    where: { id: input.id },
    data: removeUndefined({
      body: input.body === undefined ? undefined : bounded(input.body, 10000),
      media: updatedMedia === null ? undefined : updatedMedia,
      metadata: input.metadata === undefined ? undefined : sanitizePostMetadata(input.metadata),
      thumbnailUrl: input.thumbnailUrl === undefined ? undefined : bounded(input.thumbnailUrl, 2000),
      hlsUrl: input.hlsUrl === undefined ? undefined : bounded(input.hlsUrl, 2000),
      processingStatus: input.processingStatus === undefined ? undefined : bounded(input.processingStatus, 40),
      visibility: input.visibility?.toLowerCase(),
      commentPermission: input.commentPermission?.toLowerCase(),
      pinned: input.pinned,
      location: input.location === undefined ? undefined : bounded(input.location, 160),
      moderationStatus: updatedMedia === null ? undefined : reviewEvents.length ? 'pending_review' : 'approved',
      moderationReason: updatedMedia === null ? undefined : reviewEvents[0]?.reason || null,
      moderationScore: updatedMedia === null ? undefined : reviewEvents.reduce((score, event) => Math.max(score, event.score || 0), 0)
    }),
    include: postInclude(actor.id)
  });
  if (mediaEvents.length) await ctx.prisma.socialModerationEvent.updateMany({
    where: { id: { in: mediaEvents.map((event) => event.id) } }, data: { postId: post.id }
  });
  return mapPost(post);
};

export const deletePost = async (ctx, id, adminOnly = false) => {
  const actor = adminOnly ? await requireAdmin(ctx) : await requireAuth(ctx);
  const post = await ctx.prisma.socialPost.findUnique({ where: { id } });
  if (!post) notFound('Post');
  if (!adminOnly && post.authorId !== actor.id && !isAdmin(actor)) forbidden();
  await ctx.prisma.socialPost.update({ where: { id }, data: { status: 'deleted', deletedAt: new Date() } });
  await writeAudit(ctx, adminOnly ? 'admin_delete_social_post' : 'delete_social_post', 'socialPost', id, { authorId: post.authorId });
  return true;
};

export const viewPost = async (ctx, id) => {
  const actor = await requireAuth(ctx);
  await getPost(ctx, id);
  const updated = await ctx.prisma.socialPost.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
    include: postInclude(actor.id)
  });
  return mapPost(updated);
};

export const reactToPost = async (ctx, id, kind) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx);
  const post = await getPost(ctx, id);
  if (!post) notFound('Post');
  const normalized = bounded(kind || 'like', 30).toLowerCase();
  const existing = await ctx.prisma.socialPostReaction.findUnique({ where: { postId_userId: { postId: id, userId: actor.id } } });
  const removing = existing?.kind === normalized;
  if (removing) {
    await ctx.prisma.socialPostReaction.delete({ where: { id: existing.id } });
  } else {
    await ctx.prisma.socialPostReaction.upsert({
      where: { postId_userId: { postId: id, userId: actor.id } },
      create: { postId: id, userId: actor.id, kind: normalized },
      update: { kind: normalized }
    });
  }
  const updated = await getPost(ctx, id);
  if (!removing && updated) await upsertSocialActivityNotification(ctx, {
    ownerId: post.authorId,
    scopeId: id,
    type: 'post_like',
    actor,
    singular: 'Liked your post',
    plural: 'liked your post',
    count: updated.reactionCount,
    metadata: { postId: id }
  });
  return updated;
};

export const repostPost = async (ctx, id) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'postingEnabled');
  const source = await getPost(ctx, id);
  if (!source) notFound('Post');
  const sourceShare = source.media?.find((item) => item?.type === 'shared_post');
  const rootPostId = sourceShare?.sharedRootPostId || sourceShare?.sharedPostId || source.id;
  const root = rootPostId === source.id ? source : await getPost(ctx, rootPostId);
  if (!root) notFound('Original post');
  const updates = [ctx.prisma.socialPost.update({
    where: { id: source.id },
    data: { shareCount: { increment: 1 } }
  })];
  if (root.id !== source.id) updates.push(ctx.prisma.socialPost.update({
    where: { id: root.id },
    data: { shareCount: { increment: 1 } }
  }));
  await ctx.prisma.$transaction(updates);
  const preview = root.media?.find((item) => item?.type !== 'shared_post') || root.media?.[0] || {};
  const mediaUrl = preview.url || root.hlsUrl || root.thumbnailUrl || '';
  const thumbnailUrl = preview.thumbnailUrl || root.thumbnailUrl || (preview.type === 'image' ? preview.url : '') || '';
  const repost = await ctx.prisma.socialPost.create({
    data: {
      authorId: actor.id,
      type: 'post',
      body: '',
      visibility: 'public',
      processingStatus: 'ready',
      media: [{
        type: 'shared_post',
        url: mediaUrl,
        hlsUrl: preview.hlsUrl || root.hlsUrl || null,
        thumbnailUrl,
        processingStatus: preview.processingStatus || root.processingStatus || 'ready',
        sharedPostId: source.id,
        sharedRootPostId: root.id,
        sharedAuthorId: source.authorId,
        sharedAuthor: source.author?.name || source.authorProfile?.username || 'Tiwi User',
        sharedAvatar: source.author?.avatar || '',
        sharedBody: root.body || '',
        sharedMediaType: preview.type || root.type,
        sharedViews: root.viewCount || 0,
        sharedReactions: root.reactionCount || 0,
        sharedComments: root.commentCount || 0,
        sharedPublishedAt: root.publishedAt?.toISOString?.() || String(root.publishedAt || '')
      }]
    },
    include: postInclude(actor.id)
  });
  await upsertSocialActivityNotification(ctx, {
    ownerId: source.authorId,
    scopeId: root.id,
    type: 'post_share',
    actor,
    singular: 'Shared your post',
    plural: 'shared your post',
    count: Number(source.shareCount || 0) + 1,
    metadata: { postId: root.id, sourcePostId: source.id, repostId: repost.id }
  });
  return mapPost(repost);
};

export const savePost = async (ctx, id, save) => {
  const actor = await requireAuth(ctx);
  if (!await getPost(ctx, id)) notFound('Post');
  if (save) {
    await ctx.prisma.socialSavedPost.upsert({
      where: { userId_postId: { userId: actor.id, postId: id } },
      create: { userId: actor.id, postId: id },
      update: {}
    });
  } else {
    await ctx.prisma.socialSavedPost.deleteMany({ where: { userId: actor.id, postId: id } });
  }
  return getPost(ctx, id);
};

export const listSavedPosts = async (ctx, limit) => {
  const actor = await requireAuth(ctx);
  const rows = await ctx.prisma.socialSavedPost.findMany({
    where: { userId: actor.id, post: { status: 'published', deletedAt: null } },
    include: { post: { include: postInclude(actor.id) } },
    orderBy: { createdAt: 'desc' },
    take: boundedLimit(limit, 50, 100)
  });
  return rows.map((row) => mapPost(row.post));
};

export const listMemories = async (ctx, limit) => {
  const actor = await requireAuth(ctx);
  const anniversary = new Date();
  anniversary.setDate(anniversary.getDate() - 30);
  const rows = await ctx.prisma.socialPost.findMany({
    where: { authorId: actor.id, status: 'published', deletedAt: null, publishedAt: { lte: anniversary } },
    include: postInclude(actor.id),
    orderBy: { publishedAt: 'desc' },
    take: boundedLimit(limit, 50, 100)
  });
  return rows.map(mapPost);
};

export const favoriteUser = async (ctx, userId, favorite) => {
  const actor = await requireAuth(ctx);
  if (actor.id === userId) throw new AppError('You cannot favorite yourself', 'BAD_USER_INPUT');
  if (!await ctx.prisma.user.findUnique({ where: { id: userId }, select: { id: true } })) notFound('User');
  if (favorite) await ctx.prisma.socialFavorite.upsert({
    where: { userId_targetUserId: { userId: actor.id, targetUserId: userId } },
    create: { userId: actor.id, targetUserId: userId }, update: {}
  });
  else await ctx.prisma.socialFavorite.deleteMany({ where: { userId: actor.id, targetUserId: userId } });
  return favorite;
};

export const snoozeUser = async (ctx, userId, days) => {
  const actor = await requireAuth(ctx);
  if (actor.id === userId) throw new AppError('You cannot snooze yourself', 'BAD_USER_INPUT');
  const normalizedDays = Math.max(0, Math.min(Number(days) || 0, 365));
  if (!normalizedDays) {
    await ctx.prisma.socialSnooze.deleteMany({ where: { userId: actor.id, targetUserId: userId } });
    return false;
  }
  const until = new Date(Date.now() + normalizedDays * 86_400_000);
  await ctx.prisma.socialSnooze.upsert({
    where: { userId_targetUserId: { userId: actor.id, targetUserId: userId } },
    create: { userId: actor.id, targetUserId: userId, until }, update: { until }
  });
  return true;
};

const groupInclude = (viewerId) => ({
  owner: true,
  _count: { select: { members: true } },
  members: viewerId ? { where: { userId: viewerId, status: 'active' }, take: 1 } : false
});

const mapGroup = (row) => ({
  ...row,
  memberCount: row._count?.members || 0,
  viewerRole: row.members?.[0]?.role || null,
  viewerJoined: Boolean(row.members?.length)
});

export const listGroups = async (ctx, { search, mine, limit } = {}) => {
  const actor = await requireAuth(ctx);
  const query = bounded(search, 120);
  const rows = await ctx.prisma.socialGroup.findMany({
    where: {
      status: 'active',
      ...(mine ? { members: { some: { userId: actor.id, status: 'active' } } } : {}),
      ...(query ? { OR: [{ name: { contains: query, mode: 'insensitive' } }, { description: { contains: query, mode: 'insensitive' } }] } : {})
    },
    include: groupInclude(actor.id),
    orderBy: { updatedAt: 'desc' },
    take: boundedLimit(limit, 50, 100)
  });
  return rows.map(mapGroup);
};

export const getGroup = async (ctx, id) => {
  const actor = await requireAuth(ctx);
  const row = await ctx.prisma.socialGroup.findUnique({ where: { id }, include: groupInclude(actor.id) });
  if (!row || row.status !== 'active') return null;
  if (row.privacy === 'private' && !row.members?.length && row.ownerId !== actor.id && !isAdmin(actor)) forbidden('This group is private');
  return mapGroup(row);
};

export const listGroupMembers = async (ctx, groupId, limit) => {
  const actor = await requireAuth(ctx);
  if (!await getGroup(ctx, groupId)) notFound('Group');
  return ctx.prisma.socialGroupMember.findMany({
    where: { groupId, status: 'active' }, include: { user: { include: { socialProfile: true } } },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }], take: boundedLimit(limit, 100, 200)
  });
};

export const createGroup = async (ctx, input) => {
  const actor = await requireAuth(ctx);
  const name = bounded(input.name, 120);
  const privacy = String(input.privacy || 'public').toLowerCase();
  if (!name) throw new AppError('Group name is required', 'BAD_USER_INPUT');
  if (!GROUP_PRIVACIES.has(privacy)) throw new AppError('Invalid group privacy', 'BAD_USER_INPUT');
  const row = await ctx.prisma.socialGroup.create({
    data: {
      ownerId: actor.id, name, description: bounded(input.description, 2000), coverUrl: bounded(input.coverUrl, 2000), privacy,
      members: { create: { userId: actor.id, role: 'admin', status: 'active' } }
    }, include: groupInclude(actor.id)
  });
  return mapGroup(row);
};

const requireGroupAdmin = async (ctx, groupId, userId) => {
  const membership = await ctx.prisma.socialGroupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
  if (!membership || membership.status !== 'active' || membership.role !== 'admin') forbidden('Group admin access is required');
  return membership;
};

export const updateGroup = async (ctx, input) => {
  const actor = await requireAuth(ctx);
  await requireGroupAdmin(ctx, input.id, actor.id);
  if (input.privacy && !GROUP_PRIVACIES.has(String(input.privacy).toLowerCase())) throw new AppError('Invalid group privacy', 'BAD_USER_INPUT');
  const row = await ctx.prisma.socialGroup.update({ where: { id: input.id }, data: removeUndefined({
    name: input.name === undefined ? undefined : bounded(input.name, 120),
    description: input.description === undefined ? undefined : bounded(input.description, 2000),
    coverUrl: input.coverUrl === undefined ? undefined : bounded(input.coverUrl, 2000), privacy: input.privacy?.toLowerCase()
  }), include: groupInclude(actor.id) });
  return mapGroup(row);
};

export const joinGroup = async (ctx, id) => {
  const actor = await requireAuth(ctx);
  const group = await ctx.prisma.socialGroup.findUnique({ where: { id } });
  if (!group || group.status !== 'active') notFound('Group');
  await ctx.prisma.socialGroupMember.upsert({
    where: { groupId_userId: { groupId: id, userId: actor.id } },
    create: { groupId: id, userId: actor.id, role: 'member', status: 'active' },
    update: { status: 'active' }
  });
  return getGroup(ctx, id);
};

export const leaveGroup = async (ctx, id) => {
  const actor = await requireAuth(ctx);
  const group = await ctx.prisma.socialGroup.findUnique({ where: { id } });
  if (!group) notFound('Group');
  if (group.ownerId === actor.id) throw new AppError('Transfer group ownership before leaving', 'BAD_USER_INPUT');
  await ctx.prisma.socialGroupMember.deleteMany({ where: { groupId: id, userId: actor.id } });
  return true;
};

export const updateGroupMember = async (ctx, groupId, userId, role, remove) => {
  const actor = await requireAuth(ctx);
  await requireGroupAdmin(ctx, groupId, actor.id);
  const group = await ctx.prisma.socialGroup.findUnique({ where: { id: groupId } });
  if (!group) notFound('Group');
  if (group.ownerId === userId) throw new AppError('The group owner cannot be changed here', 'BAD_USER_INPUT');
  if (remove) await ctx.prisma.socialGroupMember.deleteMany({ where: { groupId, userId } });
  else {
    const normalized = String(role || 'member').toLowerCase();
    if (!GROUP_ROLES.has(normalized)) throw new AppError('Invalid group role', 'BAD_USER_INPUT');
    await ctx.prisma.socialGroupMember.update({ where: { groupId_userId: { groupId, userId } }, data: { role: normalized } });
  }
  return getGroup(ctx, groupId);
};

const commentInclude = (viewerId) => ({
  author: { include: { socialProfile: true } },
  _count: { select: { reactions: true } },
  reactions: viewerId ? { where: { userId: viewerId }, take: 1 } : false
});

const mapComment = (row) => ({
  ...row,
  authorProfile: row.author?.socialProfile || null,
  reactionCount: row._count?.reactions || 0,
  viewerLiked: Boolean(row.reactions?.length)
});

export const listComments = async (ctx, { postId, before, limit }) => {
  const actor = await requireAuth(ctx);
  if (!await getPost(ctx, postId)) notFound('Post');
  const rows = await ctx.prisma.socialComment.findMany({
    where: { postId, status: 'published', ...(before ? { createdAt: { lt: safeDate(before) } } : {}) },
    include: commentInclude(actor.id),
    orderBy: { createdAt: 'desc' },
    take: boundedLimit(limit, 50, 100)
  });
  return rows.map(mapComment);
};

export const listPostReactions = async (ctx, postId, limit) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx);
  if (!await getPost(ctx, postId)) notFound('Post');
  const rows = await ctx.prisma.socialPostReaction.findMany({
    where: { postId },
    select: { userId: true },
    orderBy: { updatedAt: 'desc' },
    take: boundedLimit(limit, 50, 100)
  });
  const ids = await visibleSocialIds(ctx, actor.id, rows.map((row) => row.userId));
  return profilesForIds(ctx, ids, actor.id, limit);
};

export const addComment = async (ctx, postId, body, replyToId) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'postingEnabled');
  const post = await getPost(ctx, postId);
  if (!post) notFound('Post');
  if (post.authorId !== actor.id && post.commentPermission === 'none') forbidden('Comments are turned off for this post');
  if (post.authorId !== actor.id && post.commentPermission === 'followers') {
    const follows = await ctx.prisma.socialFollow.findUnique({ where: { followerId_followingId: { followerId: actor.id, followingId: post.authorId } } });
    if (!follows) forbidden('Only followers can comment on this post');
  }
  const text = bounded(body, 2000);
  if (!text) throw new AppError('Comment cannot be empty', 'BAD_USER_INPUT');
  await enforceTextModeration(ctx, { userId: actor.id, targetType: 'comment', targetId: postId, text });
  let parent = null;
  if (replyToId) {
    parent = await ctx.prisma.socialComment.findUnique({ where: { id: replyToId } });
    if (!parent || parent.postId !== postId) throw new AppError('Reply target is not part of this post', 'BAD_USER_INPUT');
  }
  const row = await ctx.prisma.socialComment.create({
    data: { postId, authorId: actor.id, body: text, replyToId },
    include: commentInclude(actor.id)
  });
  const commentCount = await ctx.prisma.socialComment.count({ where: { postId, status: 'published' } });
  await upsertSocialActivityNotification(ctx, {
    ownerId: post.authorId,
    scopeId: postId,
    type: 'post_comment',
    actor,
    singular: 'Commented on your post',
    plural: 'commented on your post',
    count: commentCount,
    metadata: { postId, commentId: row.id }
  });
  if (parent && parent.authorId !== post.authorId) await upsertSocialActivityNotification(ctx, {
    ownerId: parent.authorId,
    scopeId: parent.id,
    type: 'comment_reply',
    actor,
    singular: 'Replied to your comment',
    plural: 'replied to your comment',
    count: 1,
    metadata: { postId, commentId: row.id, parentCommentId: parent.id }
  });
  await notifyMentions(ctx, actor, text, row.id, 'comment', { postId, commentId: row.id }, [post.authorId, parent?.authorId].filter(Boolean));
  return mapComment(row);
};

export const reactToComment = async (ctx, id) => {
  const actor = await requireAuth(ctx);
  const comment = await ctx.prisma.socialComment.findUnique({ where: { id } });
  if (!comment || comment.status !== 'published') notFound('Comment');
  if (!await getPost(ctx, comment.postId)) notFound('Post');
  const existing = await ctx.prisma.socialCommentReaction.findUnique({
    where: { commentId_userId: { commentId: id, userId: actor.id } }
  });
  if (existing) await ctx.prisma.socialCommentReaction.delete({ where: { id: existing.id } });
  else await ctx.prisma.socialCommentReaction.create({ data: { commentId: id, userId: actor.id } });
  const updated = mapComment(await ctx.prisma.socialComment.findUnique({ where: { id }, include: commentInclude(actor.id) }));
  if (!existing) await upsertSocialActivityNotification(ctx, {
    ownerId: comment.authorId,
    scopeId: id,
    type: 'comment_like',
    actor,
    singular: 'Liked your comment',
    plural: 'liked your comment',
    count: updated.reactionCount,
    metadata: { postId: comment.postId, commentId: id }
  });
  return updated;
};

export const deleteComment = async (ctx, id) => {
  const actor = await requireAuth(ctx);
  const comment = await ctx.prisma.socialComment.findUnique({ where: { id } });
  if (!comment) notFound('Comment');
  if (comment.authorId !== actor.id && !isAdmin(actor)) forbidden();
  await ctx.prisma.socialComment.update({ where: { id }, data: { status: 'deleted', body: '' } });
  return true;
};

const requireConversationMember = async (ctx, conversationId, actorId) => {
  const member = await ctx.prisma.socialConversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: actorId } }
  });
  if (!member) forbidden('You are not a member of this conversation');
  return member;
};

const messageInclude = {
  sender: { include: { socialProfile: true } },
  reactions: true
};

const mapMessage = (message) => ({ ...message, senderProfile: message.sender?.socialProfile || null });

const mapConversation = async (ctx, conversation, actorId) => {
  const member = conversation.members?.find((row) => row.userId === actorId);
  const otherIds = (conversation.members || []).map((row) => row.userId).filter((id) => id !== actorId);
  const blocks = otherIds.length ? await ctx.prisma.socialBlock.findMany({
    where: { OR: [
      { userId: actorId, targetUserId: { in: otherIds } },
      { targetUserId: actorId, userId: { in: otherIds } }
    ] },
    select: { userId: true, targetUserId: true }
  }) : [];
  const blockedIds = new Set(blocks.map((row) => row.userId === actorId ? row.targetUserId : row.userId));
  const unreadCount = await ctx.prisma.socialMessage.count({
    where: {
      conversationId: conversation.id,
      senderId: { not: actorId },
      unsentAt: null,
      sentAt: { gt: member?.lastReadAt || new Date(0) },
      NOT: { hiddenFor: { some: { userId: actorId } } }
    }
  });
  return {
    ...conversation,
    members: (conversation.members || []).map((row) => {
      const blocked = blockedIds.has(row.userId);
      return {
        ...row,
        blocked,
        user: blocked ? { ...row.user, name: 'Tiwlo User', avatar: null, socialProfile: null } : row.user,
        profile: blocked ? null : row.user?.socialProfile || null
      };
    }),
    lastMessage: conversation.messages?.[0] ? mapMessage(conversation.messages[0]) : null,
    unreadCount
  };
};

const conversationInclude = (actorId) => ({
  members: { include: { user: { include: { socialProfile: true } } } },
  messages: {
    where: { deletedAt: null, NOT: { hiddenFor: { some: { userId: actorId } } } },
    include: messageInclude,
    orderBy: { sentAt: 'desc' },
    take: 1
  }
});

export const listConversations = async (ctx, archived = false) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'messagingEnabled');
  const rows = await ctx.prisma.socialConversation.findMany({
    where: {
      members: { some: { userId: actor.id, archived: Boolean(archived) } },
      OR: [
        {
          messages: {
            some: {
              deletedAt: null,
              NOT: { hiddenFor: { some: { userId: actor.id } } }
            }
          }
        },
        { members: { some: { userId: actor.id, lastReadAt: null } } }
      ]
    },
    include: conversationInclude(actor.id),
    orderBy: { updatedAt: 'desc' },
    take: 100
  });
  return Promise.all(rows.map((row) => mapConversation(ctx, row, actor.id)));
};

export const createConversation = async (ctx, input) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'messagingEnabled');
  const memberIds = [...new Set([actor.id, ...(input.memberIds || [])])];
  if (memberIds.length < 2) throw new AppError('Select at least one other user', 'BAD_USER_INPUT');
  const users = await ctx.prisma.user.findMany({ where: { id: { in: memberIds }, status: 'active' }, select: { id: true } });
  if (users.length !== memberIds.length) throw new AppError('One or more users cannot receive messages', 'BAD_USER_INPUT');
  const blocked = await ctx.prisma.socialBlock.findFirst({ where: { OR: [
    { userId: actor.id, targetUserId: { in: memberIds.filter((id) => id !== actor.id) } },
    { targetUserId: actor.id, userId: { in: memberIds.filter((id) => id !== actor.id) } }
  ] } });
  if (blocked) forbidden('A blocked account cannot start or receive this conversation');
  const type = input.type || (memberIds.length === 2 ? 'direct' : 'group');
  if (type === 'direct' && memberIds.length === 2) {
    const existing = await ctx.prisma.socialConversation.findFirst({
      where: {
        type: 'direct',
        AND: memberIds.map((userId) => ({ members: { some: { userId } } })),
        members: { every: { userId: { in: memberIds } } }
      },
      include: conversationInclude(actor.id)
    });
    if (existing) return mapConversation(ctx, existing, actor.id);
  }
  const recipientId = type === 'direct' ? memberIds.find((id) => id !== actor.id) : null;
  const recipientFollowsActor = recipientId ? await ctx.prisma.socialFollow.findUnique({
    where: { followerId_followingId: { followerId: recipientId, followingId: actor.id } }
  }) : true;
  const conversation = await ctx.prisma.socialConversation.create({
    data: {
      type,
      title: bounded(input.title, 120),
      avatarUrl: bounded(input.avatarUrl, 2000),
      requestStatus: recipientFollowsActor ? 'accepted' : 'pending',
      requestedById: recipientFollowsActor ? null : actor.id,
      members: { create: memberIds.map((userId) => ({ userId, role: userId === actor.id ? 'owner' : 'member' })) }
    },
    include: conversationInclude(actor.id)
  });
  if (conversation.requestStatus === 'pending' && recipientId) {
    await createSocialNotification(ctx, {
      ownerId: recipientId,
      scopeId: conversation.id,
      type: 'message_request',
      title: actor.name,
      message: 'Sent you a message request',
      metadata: { conversationId: conversation.id, actorId: actor.id, actorName: actor.name, actorAvatar: actor.avatar || null }
    });
  }
  return mapConversation(ctx, conversation, actor.id);
};

export const respondToMessageRequest = async (ctx, id, accept) => {
  const actor = await requireAuth(ctx);
  const conversation = await ctx.prisma.socialConversation.findUnique({ where: { id }, include: conversationInclude(actor.id) });
  if (!conversation) notFound('Conversation');
  await requireConversationMember(ctx, id, actor.id);
  if (conversation.requestStatus !== 'pending' || conversation.requestedById === actor.id) forbidden('This message request cannot be changed');
  const updated = await ctx.prisma.socialConversation.update({
    where: { id },
    data: { requestStatus: accept ? 'accepted' : 'declined' },
    include: conversationInclude(actor.id)
  });
  if (accept && conversation.requestedById) {
    await createSocialNotification(ctx, {
      ownerId: conversation.requestedById,
      scopeId: id,
      type: 'connection',
      title: actor.name,
      message: 'Accepted your message request. Tap to chat.',
      metadata: { conversationId: id, actorId: actor.id, actorName: actor.name, actorAvatar: actor.avatar || null }
    });
  }
  return mapConversation(ctx, updated, actor.id);
};

export const listMessages = async (ctx, { conversationId, before, limit }) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'messagingEnabled');
  await requireConversationMember(ctx, conversationId, actor.id);
  const now = new Date();
  await ctx.prisma.socialMessage.updateMany({
    where: { conversationId, senderId: { not: actor.id }, deliveredAt: null, unsentAt: null },
    data: { deliveryStatus: 'delivered', deliveredAt: now }
  });
  const rows = await ctx.prisma.socialMessage.findMany({
    where: {
      conversationId,
      deletedAt: null,
      NOT: { hiddenFor: { some: { userId: actor.id } } },
      ...(before ? { sentAt: { lt: safeDate(before) } } : {})
    },
    include: messageInclude,
    orderBy: { sentAt: 'desc' },
    take: boundedLimit(limit, 50, 100)
  });
  return rows.reverse().map(mapMessage);
};

export const sendMessage = async (ctx, input) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'messagingEnabled');
  await requireConversationMember(ctx, input.conversationId, actor.id);
  const directConversation = await ctx.prisma.socialConversation.findUnique({
    where: { id: input.conversationId },
    select: { type: true, members: { select: { userId: true } } }
  });
  if (directConversation?.type === 'direct') {
    const recipientIds = directConversation.members.map((member) => member.userId).filter((id) => id !== actor.id);
    const blocked = await ctx.prisma.socialBlock.findFirst({ where: { OR: [
      { userId: actor.id, targetUserId: { in: recipientIds } },
      { targetUserId: actor.id, userId: { in: recipientIds } }
    ] } });
    if (blocked) forbidden('You cannot message this blocked account');
  }
  const type = String(input.type || 'text').toLowerCase();
  if (!MESSAGE_TYPES.has(type)) throw new AppError('Invalid message type', 'BAD_USER_INPUT');
  const body = bounded(input.body, 8000);
  const media = Array.isArray(input.media) ? input.media.slice(0, 10) : [];
  if (!body && media.length === 0) throw new AppError('Message cannot be empty', 'BAD_USER_INPUT');
  if (input.replyToId) {
    const reply = await ctx.prisma.socialMessage.findUnique({ where: { id: input.replyToId } });
    if (!reply || reply.conversationId !== input.conversationId) throw new AppError('Reply target is not in this conversation', 'BAD_USER_INPUT');
  }
  const message = await ctx.prisma.$transaction(async (tx) => {
    const created = await tx.socialMessage.create({
      data: {
        conversationId: input.conversationId,
        senderId: actor.id,
        type,
        body,
        media,
        replyToId: input.replyToId
      },
      include: messageInclude
    });
    await tx.socialConversation.update({ where: { id: input.conversationId }, data: { updatedAt: new Date() } });
    return created;
  });
  const conversation = await ctx.prisma.socialConversation.findUnique({
    where: { id: input.conversationId },
    include: { members: true }
  });
  if (conversation) await createMessageNotification(ctx, actor, conversation, message);
  return mapMessage(message);
};

export const editMessage = async (ctx, id, body) => {
  const actor = await requireAuth(ctx);
  const message = await ctx.prisma.socialMessage.findUnique({ where: { id } });
  if (!message) notFound('Message');
  if (message.senderId !== actor.id) forbidden();
  if (message.unsentAt) throw new AppError('An unsent message cannot be edited', 'BAD_USER_INPUT');
  const text = bounded(body, 8000);
  if (!text && (!Array.isArray(message.media) || message.media.length === 0)) throw new AppError('Message cannot be empty', 'BAD_USER_INPUT');
  return mapMessage(await ctx.prisma.socialMessage.update({ where: { id }, data: { body: text, editedAt: new Date() }, include: messageInclude }));
};

export const markConversationRead = async (ctx, id) => {
  const actor = await requireAuth(ctx);
  await requireConversationMember(ctx, id, actor.id);
  const now = new Date();
  await ctx.prisma.$transaction([
    ctx.prisma.socialConversationMember.update({
      where: { conversationId_userId: { conversationId: id, userId: actor.id } },
      data: { lastReadAt: now }
    }),
    ctx.prisma.socialMessage.updateMany({
      where: { conversationId: id, senderId: { not: actor.id }, unsentAt: null, readAt: null },
      data: { deliveryStatus: 'read', deliveredAt: now, readAt: now }
    }),
    ctx.prisma.notification.updateMany({
      where: {
        ownerId: actor.id,
        scope: 'social',
        scopeId: id,
        type: { in: ['message', 'message_request'] },
        status: 'unread'
      },
      data: { status: 'read', readAt: now }
    })
  ]);
  const conversation = await ctx.prisma.socialConversation.findUnique({ where: { id }, include: conversationInclude(actor.id) });
  return mapConversation(ctx, conversation, actor.id);
};

export const updateConversationMember = async (ctx, { id, muted, archived, markUnread, leave, deleteForMe }) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'messagingEnabled');
  const membership = await requireConversationMember(ctx, id, actor.id);
  const conversation = await ctx.prisma.socialConversation.findUnique({
    where: { id },
    include: conversationInclude(actor.id)
  });
  if (!conversation) notFound('Conversation');

  if (deleteForMe) {
    const messages = await ctx.prisma.socialMessage.findMany({
      where: { conversationId: id, deletedAt: null },
      select: { id: true }
    });
    const now = new Date();
    await ctx.prisma.$transaction([
      ...(messages.length ? [ctx.prisma.socialMessageDeletion.createMany({
        data: messages.map((message) => ({ messageId: message.id, userId: actor.id })),
        skipDuplicates: true
      })] : []),
      ctx.prisma.socialConversationMember.update({
        where: { id: membership.id },
        data: { archived: false, lastReadAt: now }
      }),
      ctx.prisma.notification.updateMany({
        where: { ownerId: actor.id, scope: 'social', scopeId: id, type: { in: ['message', 'message_request'] }, status: 'unread' },
        data: { status: 'read', readAt: now }
      })
    ]);
    return null;
  }

  if (leave) {
    if (conversation.type === 'group') {
      await ctx.prisma.socialConversationMember.delete({ where: { id: membership.id } });
      return null;
    }
    archived = true;
  }

  let unreadAt;
  if (markUnread) {
    const latestIncoming = await ctx.prisma.socialMessage.findFirst({
      where: { conversationId: id, senderId: { not: actor.id }, unsentAt: null },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true }
    });
    unreadAt = latestIncoming ? new Date(latestIncoming.sentAt.getTime() - 1) : membership.lastReadAt;
  }
  const data = removeUndefined({
    muted: typeof muted === 'boolean' ? muted : undefined,
    archived: typeof archived === 'boolean' ? archived : undefined,
    lastReadAt: markUnread ? unreadAt : undefined
  });
  if (Object.keys(data).length) {
    await ctx.prisma.socialConversationMember.update({ where: { id: membership.id }, data });
  }
  const updated = await ctx.prisma.socialConversation.findUnique({
    where: { id },
    include: conversationInclude(actor.id)
  });
  return mapConversation(ctx, updated, actor.id);
};

export const addConversationMembers = async (ctx, id, userIds) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'messagingEnabled');
  const membership = await requireConversationMember(ctx, id, actor.id);
  const conversation = await ctx.prisma.socialConversation.findUnique({ where: { id } });
  if (!conversation) notFound('Conversation');
  if (conversation.type !== 'group') throw new AppError('Members can only be added to a group chat', 'BAD_USER_INPUT');
  if (!['owner', 'admin'].includes(membership.role) && !isAdmin(actor)) forbidden('Only group admins can add members');
  const ids = [...new Set((userIds || []).filter((userId) => userId && userId !== actor.id))].slice(0, 100);
  if (!ids.length) throw new AppError('Select at least one person', 'BAD_USER_INPUT');
  const users = await ctx.prisma.user.findMany({ where: { id: { in: ids }, status: 'active' }, select: { id: true } });
  if (users.length !== ids.length) throw new AppError('One or more people cannot be added', 'BAD_USER_INPUT');
  await ctx.prisma.socialConversationMember.createMany({
    data: ids.map((userId) => ({ conversationId: id, userId, role: 'member' })),
    skipDuplicates: true
  });
  await ctx.prisma.socialConversation.update({ where: { id }, data: { updatedAt: new Date() } });
  const updated = await ctx.prisma.socialConversation.findUnique({ where: { id }, include: conversationInclude(actor.id) });
  return mapConversation(ctx, updated, actor.id);
};

export const setConversationTyping = async (ctx, id, typing) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'messagingEnabled');
  const membership = await requireConversationMember(ctx, id, actor.id);
  return ctx.prisma.socialConversationMember.update({
    where: { id: membership.id },
    data: { typingAt: typing ? new Date() : null }
  });
};

export const reactToMessage = async (ctx, id, emoji) => {
  const actor = await requireAuth(ctx);
  const message = await ctx.prisma.socialMessage.findUnique({ where: { id } });
  if (!message) notFound('Message');
  await requireConversationMember(ctx, message.conversationId, actor.id);
  const value = bounded(emoji, 16);
  if (!value) throw new AppError('Reaction cannot be empty', 'BAD_USER_INPUT');
  const existing = await ctx.prisma.socialMessageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId: id, userId: actor.id, emoji: value } }
  });
  if (existing) await ctx.prisma.socialMessageReaction.delete({ where: { id: existing.id } });
  else await ctx.prisma.socialMessageReaction.create({ data: { messageId: id, userId: actor.id, emoji: value } });
  return mapMessage(await ctx.prisma.socialMessage.findUnique({ where: { id }, include: messageInclude }));
};

export const unsendMessage = async (ctx, id) => {
  const actor = await requireAuth(ctx);
  const message = await ctx.prisma.socialMessage.findUnique({ where: { id } });
  if (!message) notFound('Message');
  if (message.senderId !== actor.id && !isAdmin(actor)) forbidden();
  return mapMessage(await ctx.prisma.socialMessage.update({
    where: { id },
    data: { body: null, media: [], deliveryStatus: 'unsent', unsentAt: new Date() },
    include: messageInclude
  }));
};

export const deleteMessageForMe = async (ctx, id) => {
  const actor = await requireAuth(ctx);
  const message = await ctx.prisma.socialMessage.findUnique({ where: { id } });
  if (!message) notFound('Message');
  await requireConversationMember(ctx, message.conversationId, actor.id);
  await ctx.prisma.socialMessageDeletion.upsert({
    where: { messageId_userId: { messageId: id, userId: actor.id } },
    create: { messageId: id, userId: actor.id },
    update: {}
  });
  return true;
};

const callInclude = { caller: true, callee: true };

export const startCall = async (ctx, input) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'callsEnabled');
  const type = String(input.type || 'video').toLowerCase();
  if (!CALL_TYPES.has(type)) throw new AppError('Invalid call type', 'BAD_USER_INPUT');
  if (input.calleeId === actor.id) throw new AppError('You cannot call yourself', 'BAD_USER_INPUT');
  const blocked = await ctx.prisma.socialBlock.findFirst({ where: { OR: [
    { userId: actor.id, targetUserId: input.calleeId },
    { targetUserId: actor.id, userId: input.calleeId }
  ] } });
  if (blocked) forbidden('You cannot call this blocked account');
  const callee = await ctx.prisma.user.findUnique({ where: { id: input.calleeId }, include: { socialProfile: true } });
  if (!callee || callee.status !== 'active') throw new AppError('This user is unavailable', 'BAD_USER_INPUT');
  if (callee.socialProfile?.privacy?.allowCalls === false) throw new AppError('This user is not accepting calls', 'FORBIDDEN');
  if (input.conversationId) await requireConversationMember(ctx, input.conversationId, actor.id);
  const staleBefore = new Date(Date.now() - CALL_EXPIRY_MS);
  const staleActiveBefore = new Date(Date.now() - ACTIVE_CALL_STALE_MS);
  await ctx.prisma.socialCallSession.updateMany({
    where: { status: { in: PENDING_CALL_STATUSES }, createdAt: { lt: staleBefore } },
    data: { status: 'missed', endedAt: new Date() }
  });
  await ctx.prisma.socialCallSession.updateMany({
    where: { status: 'active', updatedAt: { lt: staleActiveBefore } },
    data: { status: 'failed', endedAt: new Date() }
  });
  const busyCall = await ctx.prisma.socialCallSession.findFirst({
    where: {
      status: { in: ACTIVE_CALL_STATUSES },
      OR: [
        { callerId: actor.id }, { calleeId: actor.id },
        { callerId: input.calleeId }, { calleeId: input.calleeId }
      ]
    },
    select: { id: true }
  });
  if (busyCall) throw new AppError('Line busy. This person is already on another call.', 'CONFLICT');
  const calleeOnline = callee.socialLastActiveAt && Date.now() - callee.socialLastActiveAt.getTime() <= ONLINE_CALL_WINDOW_MS;
  const call = await ctx.prisma.socialCallSession.create({
    data: {
      conversationId: input.conversationId,
      callerId: actor.id,
      calleeId: input.calleeId,
      type,
      status: calleeOnline ? 'ringing' : 'calling',
      offer: input.offer || undefined
    },
    include: callInclude
  });
  await createSocialNotification(ctx, {
    ownerId: input.calleeId,
    scopeId: call.id,
    type: 'call',
    title: actor.name,
    message: type === 'video' ? 'Incoming video call' : 'Incoming audio call',
    metadata: { callId: call.id, conversationId: input.conversationId || null, actorId: actor.id, actorName: actor.name, actorAvatar: actor.avatar || null, callType: type }
  });
  return call;
};

const requireCallParty = (actor, call) => {
  if (actor.id !== call.callerId && actor.id !== call.calleeId && !isAdmin(actor)) forbidden();
};

export const getCall = async (ctx, id) => {
  const actor = await requireAuth(ctx);
  const call = await ctx.prisma.socialCallSession.findUnique({ where: { id }, include: callInclude });
  if (!call) return null;
  requireCallParty(actor, call);
  return call;
};

export const incomingCalls = async (ctx) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'callsEnabled');
  const expiry = new Date(Date.now() - CALL_EXPIRY_MS);
  await ctx.prisma.socialCallSession.updateMany({
    where: {
      calleeId: actor.id,
      status: { in: PENDING_CALL_STATUSES },
      createdAt: { lt: expiry }
    },
    data: { status: 'missed', endedAt: new Date() }
  });
  await ctx.prisma.socialCallSession.updateMany({
    where: { calleeId: actor.id, status: 'calling', createdAt: { gte: expiry } },
    data: { status: 'ringing' }
  });
  return ctx.prisma.socialCallSession.findMany({
    where: { calleeId: actor.id, status: { in: ['ringing', 'connecting'] } },
    include: callInclude,
    orderBy: { createdAt: 'desc' },
    take: 10
  });
};

export const signalCall = async (ctx, input) => {
  const actor = await requireAuth(ctx);
  const call = await ctx.prisma.socialCallSession.findUnique({ where: { id: input.id } });
  if (!call) notFound('Call');
  requireCallParty(actor, call);
  const candidates = Array.isArray(call.iceCandidates) ? call.iceCandidates : [];
  if (input.iceCandidate) candidates.push({ ...input.iceCandidate, from: actor.id, at: new Date().toISOString() });
  const status = input.status || call.status;
  const terminalStatuses = new Set(['ended', 'declined', 'missed', 'failed']);
  const updateData = removeUndefined({
    status,
    offer: input.offer,
    answer: input.answer,
    iceCandidates: input.iceCandidate ? candidates.slice(-200) : undefined,
    startedAt: status === 'connecting' && !call.startedAt ? new Date() : undefined,
    answeredAt: status === 'active' && !call.answeredAt ? new Date() : undefined,
    endedAt: terminalStatuses.has(status) ? new Date() : undefined
  });
  let terminalTransition = false;
  let updated;
  if (terminalStatuses.has(status)) {
    const result = await ctx.prisma.socialCallSession.updateMany({
      where: { id: input.id, status: { notIn: [...terminalStatuses] } },
      data: updateData
    });
    terminalTransition = result.count > 0;
    updated = await ctx.prisma.socialCallSession.findUnique({ where: { id: input.id }, include: callInclude });
  } else {
    updated = await ctx.prisma.socialCallSession.update({ where: { id: input.id }, data: updateData, include: callInclude });
  }
  if (updated.conversationId && terminalTransition) {
    const endedAt = updated.endedAt || new Date();
    const startedAt = updated.answeredAt || updated.startedAt || updated.createdAt;
    const callEvent = [
      '__tiwi_call__',
      updated.type,
      status,
      startedAt.toISOString(),
      endedAt.toISOString(),
      updated.callerId
    ].join('|');
    await ctx.prisma.$transaction([
      ctx.prisma.socialMessage.create({
        data: {
          conversationId: updated.conversationId,
          senderId: actor.id,
          type: 'system',
          body: callEvent,
          deliveryStatus: 'sent'
        }
      }),
      ctx.prisma.socialConversation.update({
        where: { id: updated.conversationId },
        data: { updatedAt: endedAt }
      })
    ]);
  }
  return updated;
};

export const endCall = async (ctx, id, status = 'ended') => signalCall(ctx, { id, status: status || 'ended' });

const streamInclude = { host: { include: { socialProfile: true } } };
const mapStream = (stream, actor) => ({
  ...stream,
  hostProfile: stream.host?.socialProfile || null,
  streamKey: actor && (actor.id === stream.hostId || isAdmin(actor)) ? stream.streamKey : null,
  ingestUrl: actor && (actor.id === stream.hostId || isAdmin(actor)) ? stream.ingestUrl : null
});

export const listLiveStreams = async (ctx, args = {}) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'liveEnabled');
  const rows = await ctx.prisma.socialLiveStream.findMany({
    where: args.status ? { status: args.status } : { status: { in: ['scheduled', 'live'] } },
    include: streamInclude,
    orderBy: { createdAt: 'desc' },
    take: boundedLimit(args.limit, 30, 100)
  });
  return rows.map((row) => mapStream(row, actor));
};

export const startLiveStream = async (ctx, input) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'liveEnabled');
  await ensureProfile(ctx, actor);
  const streamKey = randomBytes(24).toString('hex');
  const ingestBase = String(process.env.SOCIAL_RTMP_URL || 'rtmp://localhost:1935/live').replace(/\/$/, '');
  const playbackBase = String(process.env.SOCIAL_LIVE_PLAYBACK_URL || '/live').replace(/\/$/, '');
  const stream = await ctx.prisma.socialLiveStream.create({
    data: {
      hostId: actor.id,
      title: bounded(input.title, 160),
      description: bounded(input.description, 3000),
      visibility: VISIBILITIES.has(input.visibility) ? input.visibility : 'public',
      streamKey,
      ingestUrl: `${ingestBase}/${streamKey}`,
      playbackUrl: `${playbackBase}/${streamKey}/master.m3u8`,
      qualities: ['auto', '720p', '480p', '360p'],
      scheduledAt: safeDate(input.scheduledAt)
    },
    include: streamInclude
  });
  return mapStream(stream, actor);
};

export const updateLiveStream = async (ctx, id, status, viewerCount) => {
  const actor = await requireAuth(ctx);
  const stream = await ctx.prisma.socialLiveStream.findUnique({ where: { id } });
  if (!stream) notFound('Live stream');
  if (stream.hostId !== actor.id && !isAdmin(actor)) forbidden();
  const normalized = String(status).toLowerCase();
  const updated = await ctx.prisma.socialLiveStream.update({
    where: { id },
    data: removeUndefined({
      status: normalized,
      viewerCount: viewerCount === undefined ? undefined : Math.max(0, viewerCount),
      startedAt: normalized === 'live' && !stream.startedAt ? new Date() : undefined,
      endedAt: normalized === 'ended' ? new Date() : undefined
    }),
    include: streamInclude
  });
  return mapStream(updated, actor);
};

export const reportContent = async (ctx, targetType, targetId, reason, details) => {
  const actor = await requireAuth(ctx);
  const settings = await requireSocialFeature(ctx);
  if (settings.moderation?.reportsEnabled === false) throw new AppError('Reports are disabled', 'FORBIDDEN');
  const type = bounded(targetType, 40).toLowerCase();
  const report = await ctx.prisma.socialReport.create({
    data: {
      reporterId: actor.id,
      postId: type === 'post' ? targetId : undefined,
      targetType: type,
      targetId,
      reason: bounded(reason, 120),
      details: bounded(details, 3000)
    }
  });
  const label = reportTargetLabel(type);
  await createSocialNotification(ctx, {
    ownerId: actor.id,
    scopeId: report.id,
    type: 'report_received',
    title: 'We received your report',
    message: `Thanks for reporting this ${label}. Your report is confidential, and the account you reported will not know who sent it.`,
    metadata: supportCenterMetadata({
      caseType: 'report',
      reportId: report.id,
      targetType: type,
      targetId
    })
  });
  return report;
};

export const adminOverview = async (ctx) => {
  await requireAdmin(ctx);
  const [profiles, verifiedProfiles, posts, reels, messages, activeLiveStreams, openReports] = await Promise.all([
    ctx.prisma.socialProfile.count(),
    ctx.prisma.socialProfile.count({ where: { verified: true } }),
    ctx.prisma.socialPost.count({ where: { deletedAt: null } }),
    ctx.prisma.socialPost.count({ where: { type: 'reel', deletedAt: null } }),
    ctx.prisma.socialMessage.count({ where: { deletedAt: null } }),
    ctx.prisma.socialLiveStream.count({ where: { status: 'live' } }),
    ctx.prisma.socialReport.count({ where: { status: 'open' } })
  ]);
  return { profiles, verifiedProfiles, posts, reels, messages, activeLiveStreams, openReports };
};

export const adminUsers = async (ctx, args = {}) => {
  const actor = await requireAdmin(ctx);
  const search = bounded(args.search, 160);
  const rows = await ctx.prisma.socialProfile.findMany({
    where: {
      ...(args.verified === undefined || args.verified === null ? {} : { verified: args.verified }),
      ...(args.status ? { user: { status: args.status } } : {}),
      ...(search ? { OR: [
        { username: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ] } : {})
    },
    include: profileInclude,
    orderBy: { createdAt: 'desc' },
    take: 200
  });
  return Promise.all(rows.map((row) => mapProfile(ctx, row, actor.id)));
};

export const adminPosts = async (ctx, args = {}) => {
  const actor = await requireAdmin(ctx);
  const search = bounded(args.search, 300);
  const rows = await ctx.prisma.socialPost.findMany({
    where: {
      ...(args.type ? { type: args.type } : {}),
      ...(args.status ? { status: args.status } : {}),
      ...(search ? { OR: [
        { body: { contains: search, mode: 'insensitive' } },
        { author: { name: { contains: search, mode: 'insensitive' } } },
        { author: { email: { contains: search, mode: 'insensitive' } } }
      ] } : {})
    },
    include: postInclude(actor.id),
    orderBy: { createdAt: 'desc' },
    take: boundedLimit(args.limit, 100, 300)
  });
  return rows.map(mapPost);
};

export const adminReports = async (ctx, status) => {
  await requireAdmin(ctx);
  return ctx.prisma.socialReport.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    take: 300
  });
};

export const adminModerationEvents = async (ctx, args = {}) => {
  await requireAdmin(ctx);
  return ctx.prisma.socialModerationEvent.findMany({
    where: {
      ...(args.decision ? { decision: bounded(args.decision, 30).toLowerCase() } : {}),
      ...(args.userId ? { userId: args.userId } : {})
    },
    orderBy: { createdAt: 'desc' },
    take: boundedLimit(args.limit, 100, 300)
  });
};

export const adminVerifyProfile = async (ctx, userId, verified) => {
  const actor = await requireAdmin(ctx);
  const user = await ctx.prisma.user.findUnique({ where: { id: userId } });
  if (!user) notFound('User');
  const previous = await ensureProfile(ctx, user);
  const profile = await ctx.prisma.socialProfile.update({
    where: { userId },
    data: { verified, badgeType: verified ? 'blue' : 'none', badgePlan: verified ? 'admin' : null, badgeExpiresAt: null },
    include: profileInclude
  });
  await writeAudit(ctx, 'admin_verify_social_profile', 'socialProfile', profile.id, { userId, verified });
  if (previous.verified !== verified || previous.badgeType !== (verified ? 'blue' : 'none')) await createSocialNotification(ctx, {
    ownerId: userId,
    scopeId: profile.id,
    type: verified ? 'verification_approved' : 'verification_updated',
    title: verified ? "You're verified on Tiwi" : 'Verification status updated',
    message: verified
      ? 'Your profile now has a blue verified badge. This decision is available in Support Center.'
      : 'Your blue verified badge has been removed. Open Support Center for this account decision.',
    metadata: supportCenterMetadata({ caseType: 'verification', badgeType: verified ? 'blue' : 'none', profileId: profile.id })
  });
  return mapProfile(ctx, profile, actor.id);
};

export const adminSetSocialBadge = async (ctx, userId, badgeType, badgePlan) => {
  const actor = await requireAdmin(ctx);
  const user = await ctx.prisma.user.findUnique({ where: { id: userId } });
  if (!user) notFound('User');
  const previous = await ensureProfile(ctx, user);
  const type = bounded(badgeType, 20).toLowerCase();
  if (!['none', 'blue', 'gold'].includes(type)) throw new AppError('Badge type must be none, blue or gold', 'BAD_USER_INPUT');
  const profile = await ctx.prisma.socialProfile.update({
    where: { userId },
    data: {
      verified: type !== 'none',
      badgeType: type,
      badgePlan: type === 'none' ? null : bounded(badgePlan || 'admin', 60),
      badgeExpiresAt: null
    },
    include: profileInclude
  });
  await writeAudit(ctx, 'admin_set_social_badge', 'socialProfile', profile.id, { userId, badgeType: type, badgePlan });
  if (previous.badgeType !== type || previous.verified !== (type !== 'none')) await createSocialNotification(ctx, {
    ownerId: userId,
    scopeId: profile.id,
    type: type === 'none' ? 'verification_updated' : 'verification_approved',
    title: type === 'gold' ? "You've received a gold badge" : type === 'blue' ? "You're verified on Tiwi" : 'Verification status updated',
    message: type === 'gold'
      ? 'Tiwi reviewed your notable-person application and added a gold verified badge to your profile.'
      : type === 'blue'
        ? 'Tiwi reviewed your account and added a blue verified badge to your profile.'
        : 'Your verified badge has been removed. Open Support Center for this account decision.',
    metadata: supportCenterMetadata({ caseType: 'verification', badgeType: type, profileId: profile.id, badgePlan: profile.badgePlan })
  });
  return mapProfile(ctx, profile, actor.id);
};

export const startVerificationCheckout = async (ctx, packageId, provider, currency = 'USD') => {
  const actor = await requireAuth(ctx);
  const settings = await requireSocialFeature(ctx);
  const plan = settings.verificationPackages.find((item) => item?.id === packageId && item?.enabled !== false);
  if (!plan) throw new AppError('Verification package was not found', 'NOT_FOUND');
  await ensureProfile(ctx, actor);

  if (plan.badgeType === 'gold' || plan.notableOnly) {
    const existing = await ctx.prisma.socialReport.findFirst({
      where: { reporterId: actor.id, targetType: 'verification', targetId: actor.id, status: 'open' }
    });
    if (!existing) {
      const report = await ctx.prisma.socialReport.create({
        data: {
          reporterId: actor.id,
          targetType: 'verification',
          targetId: actor.id,
          reason: 'gold_notable_application',
          details: JSON.stringify({ packageId: plan.id, packageName: plan.name, badgeType: 'gold' })
        }
      });
      await createSocialNotification(ctx, {
        ownerId: actor.id,
        scopeId: report.id,
        type: 'verification_received',
        title: 'Gold verification request received',
        message: 'Tiwi Team will review your notable-person application. You will receive a Support Center notification when a decision is made.',
        metadata: supportCenterMetadata({ caseType: 'verification', reportId: report.id, badgeType: 'gold', packageId: plan.id })
      });
    }
    return { status: 'pending_review', provider: 'manual', message: 'Your Gold Notable application was sent to the Social administrators.' };
  }

  if (plan.badgeType !== 'blue') throw new AppError('This package cannot be purchased', 'BAD_USER_INPUT');
  const requestedCurrency = bounded(currency || 'USD', 3).toUpperCase();
  const amount = Math.round((await convertMoneyForCtx(ctx, Number(plan.priceUsd || 0), 'USD', requestedCurrency)) * 100) / 100;
  if (amount <= 0) throw new AppError('Verification package price is invalid', 'BAD_USER_INPUT');
  let invoice = await ctx.prisma.invoice.findFirst({
    where: { ownerId: actor.id, scope: 'social_verification', scopeId: plan.id, status: { in: ['open', 'payment_failed'] } },
    orderBy: { createdAt: 'desc' }
  });
  if (invoice) {
    invoice = await ctx.prisma.invoice.update({
      where: { id: invoice.id },
      data: { amount, currency: requestedCurrency, status: 'open', dueDate: new Date(), items: {
        verification: { packageId: plan.id, packageName: plan.name, badgeType: 'blue', periodMonths: Math.max(1, Number(plan.periodMonths || 1)), priceUsd: Number(plan.priceUsd) },
        lineItems: [{ label: `${plan.name} subscription`, amount, currency: requestedCurrency }]
      } }
    });
  } else {
    invoice = await ctx.prisma.invoice.create({
      data: {
        ownerId: actor.id,
        number: `SOC-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`,
        amount,
        currency: requestedCurrency,
        scope: 'social_verification',
        scopeId: plan.id,
        dueDate: new Date(),
        items: {
          verification: { packageId: plan.id, packageName: plan.name, badgeType: 'blue', periodMonths: Math.max(1, Number(plan.periodMonths || 1)), priceUsd: Number(plan.priceUsd) },
          lineItems: [{ label: `${plan.name} subscription`, amount, currency: requestedCurrency }]
        }
      }
    });
  }
  await writeAudit(ctx, 'start_social_verification_checkout', 'invoice', invoice.id, { packageId: plan.id, provider, currency: requestedCurrency });
  return startInvoicePayment(ctx, { invoiceId: invoice.id, provider });
};

const profileCatalogConfig = (kind) => kind === PROFILE_EFFECT_KIND ? {
  kind,
  title: 'Profile effect',
  appliedIdField: 'profileEffectId',
  appliedRelation: 'effectProfiles',
  scope: 'social_profile_effect',
  invoicePrefix: 'EFX',
  itemKey: 'profileEffect',
  auditKey: 'profile_effect',
  brandPrefix: '/brand/profile-effects/',
  ensureDefaults: ensureDefaultProfileEffects
} : {
  kind: AVATAR_DECORATION_KIND,
  title: 'Profile decoration',
  appliedIdField: 'avatarDecorationId',
  appliedRelation: 'appliedProfiles',
  scope: 'social_profile_decoration',
  invoicePrefix: 'DEC',
  itemKey: 'profileDecoration',
  auditKey: 'profile_decoration',
  brandPrefix: '/brand/decorations/',
  ensureDefaults: ensureDefaultProfileDecorations
};

const listProfileCatalog = async (ctx, kind) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx);
  const config = profileCatalogConfig(kind);
  await config.ensureDefaults(ctx);
  const [profile, items] = await Promise.all([
    ctx.prisma.socialProfile.findUnique({ where: { userId: actor.id }, select: { [config.appliedIdField]: true } }),
    ctx.prisma.socialProfileDecoration.findMany({
      where: { kind: config.kind, status: 'active' },
      include: {
        ownerships: { where: { userId: actor.id }, take: 1 },
        _count: { select: { ownerships: true } }
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    })
  ]);
  return items.map((item) => mapDecoration(item, actor.id, profile?.[config.appliedIdField]));
};

const applyProfileCatalogItem = async (ctx, id, kind) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx);
  const config = profileCatalogConfig(kind);
  await config.ensureDefaults(ctx);
  await ensureProfile(ctx, actor);
  if (!id) {
    const profile = await ctx.prisma.socialProfile.update({
      where: { userId: actor.id },
      data: { [config.appliedIdField]: null },
      include: profileInclude
    });
    await writeAudit(ctx, `remove_social_${config.auditKey}`, 'socialProfile', profile.id, {});
    return mapProfile(ctx, profile, actor.id);
  }
  const item = await ctx.prisma.socialProfileDecoration.findUnique({ where: { id } });
  if (!item || item.kind !== config.kind || item.status !== 'active') notFound(config.title);
  const free = Number(item.priceUsd || 0) <= 0;
  const ownership = free ? null : await ctx.prisma.socialProfileDecorationOwnership.findUnique({
    where: { userId_decorationId: { userId: actor.id, decorationId: item.id } }
  });
  if (!free && !ownership) throw new AppError(`Purchase this ${config.title.toLowerCase()} before applying it`, 'PAYMENT_REQUIRED');
  if (free) await ctx.prisma.socialProfileDecorationOwnership.upsert({
    where: { userId_decorationId: { userId: actor.id, decorationId: item.id } },
    create: { userId: actor.id, decorationId: item.id, source: 'free' },
    update: { source: 'free', acquiredAt: new Date() }
  });
  const profile = await ctx.prisma.socialProfile.update({
    where: { userId: actor.id },
    data: { [config.appliedIdField]: item.id },
    include: profileInclude
  });
  await writeAudit(ctx, `apply_social_${config.auditKey}`, 'socialProfile', profile.id, { itemId: item.id, itemName: item.name });
  return mapProfile(ctx, profile, actor.id);
};

const startProfileCatalogCheckout = async (ctx, id, provider, currency, kind) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx);
  const config = profileCatalogConfig(kind);
  await config.ensureDefaults(ctx);
  await ensureProfile(ctx, actor);
  const item = await ctx.prisma.socialProfileDecoration.findUnique({ where: { id } });
  if (!item || item.kind !== config.kind || item.status !== 'active') notFound(config.title);
  const existingOwnership = await ctx.prisma.socialProfileDecorationOwnership.findUnique({
    where: { userId_decorationId: { userId: actor.id, decorationId: item.id } }
  });
  if (existingOwnership) return { status: 'owned', provider: 'existing', message: `This ${config.title.toLowerCase()} is already owned.` };
  if (Number(item.priceUsd || 0) <= 0) {
    await ctx.prisma.socialProfileDecorationOwnership.create({ data: { userId: actor.id, decorationId: item.id, source: 'free' } });
    return { status: 'owned', provider: 'free', message: `Free ${config.title.toLowerCase()} added to your account.` };
  }
  const requestedCurrency = bounded(currency || 'USD', 3).toUpperCase();
  const amount = Math.round((await convertMoneyForCtx(ctx, Number(item.priceUsd), 'USD', requestedCurrency)) * 100) / 100;
  let invoice = await ctx.prisma.invoice.findFirst({
    where: { ownerId: actor.id, scope: config.scope, scopeId: item.id, status: { in: ['open', 'payment_failed'] } },
    orderBy: { createdAt: 'desc' }
  });
  const catalogItem = { decorationId: item.id, name: item.name, assetUrl: item.assetUrl, priceUsd: Number(item.priceUsd), kind: item.kind };
  const items = {
    [config.itemKey]: catalogItem,
    lineItems: [{ label: `${item.name} ${config.title.toLowerCase()}`, amount, currency: requestedCurrency }]
  };
  if (invoice) invoice = await ctx.prisma.invoice.update({
    where: { id: invoice.id },
    data: { amount, currency: requestedCurrency, status: 'open', dueDate: new Date(), items }
  });
  else invoice = await ctx.prisma.invoice.create({
    data: {
      ownerId: actor.id,
      number: `${config.invoicePrefix}-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`,
      amount,
      currency: requestedCurrency,
      scope: config.scope,
      scopeId: item.id,
      dueDate: new Date(),
      items
    }
  });
  await writeAudit(ctx, `start_social_${config.auditKey}_checkout`, 'invoice', invoice.id, { itemId: item.id, provider, currency: requestedCurrency });
  return startInvoicePayment(ctx, { invoiceId: invoice.id, provider });
};

const adminProfileCatalog = async (ctx, kind) => {
  await requireAdmin(ctx);
  const config = profileCatalogConfig(kind);
  await config.ensureDefaults(ctx);
  const rows = await ctx.prisma.socialProfileDecoration.findMany({
    where: { kind: config.kind },
    include: { _count: { select: { ownerships: true, [config.appliedRelation]: true } } },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
  });
  return rows.map((item) => ({ ...item, owned: false, applied: false, ownershipCount: item._count.ownerships, appliedCount: item._count[config.appliedRelation] }));
};

const adminUpsertProfileCatalogItem = async (ctx, input, kind) => {
  const actor = await requireAdmin(ctx);
  const config = profileCatalogConfig(kind);
  const name = bounded(input.name, 120);
  if (!name) throw new AppError(`${config.title} name is required`, 'BAD_USER_INPUT');
  const assetUrl = bounded(input.assetUrl, 2000);
  if (!assetUrl || (!assetUrl.startsWith(`/api/social/media/files/${actor.id}/`) && !assetUrl.startsWith(config.brandPrefix))) {
    throw new AppError('Upload the PNG/APNG file from this administrator account first', 'BAD_USER_INPUT');
  }
  const mimeType = bounded(input.mimeType || 'image/png', 100).toLowerCase();
  if (mimeType !== 'image/png' || !assetUrl.toLowerCase().endsWith('.png')) throw new AppError(`${config.title}s must be PNG or animated PNG files`, 'BAD_USER_INPUT');
  const priceUsd = Math.max(0, Math.min(Number(input.priceUsd || 0), 10000));
  const status = ['active', 'inactive'].includes(String(input.status || '').toLowerCase()) ? String(input.status).toLowerCase() : 'active';
  const data = {
    kind: config.kind,
    name,
    assetUrl,
    fileName: bounded(input.fileName || assetUrl.split('/').pop() || `${config.auditKey}.png`, 255),
    mimeType,
    animated: Boolean(input.animated),
    width: Math.max(64, Math.min(Number(input.width || 288), 2048)),
    height: Math.max(64, Math.min(Number(input.height || 288), 2048)),
    priceUsd,
    status,
    sortOrder: Math.max(0, Math.min(Number(input.sortOrder || 0), 100000))
  };
  let item;
  if (input.id) {
    const current = await ctx.prisma.socialProfileDecoration.findUnique({ where: { id: input.id } });
    if (!current || current.kind !== config.kind) notFound(config.title);
    item = await ctx.prisma.socialProfileDecoration.update({ where: { id: input.id }, data });
  } else {
    const base = decorationSlug(input.slug || name) || `${config.auditKey}-${Date.now()}`;
    let slug = base;
    for (let attempt = 1; await ctx.prisma.socialProfileDecoration.findUnique({ where: { slug } }); attempt += 1) slug = `${base.slice(0, 72)}-${attempt}`;
    item = await ctx.prisma.socialProfileDecoration.create({ data: { ...data, slug } });
  }
  await writeAudit(ctx, input.id ? `admin_update_social_${config.auditKey}` : `admin_create_social_${config.auditKey}`, 'socialProfileDecoration', item.id, { name, priceUsd, animated: data.animated });
  return { ...item, owned: false, applied: false, ownershipCount: 0, appliedCount: 0 };
};

const adminArchiveProfileCatalogItem = async (ctx, id, kind) => {
  await requireAdmin(ctx);
  const config = profileCatalogConfig(kind);
  const item = await ctx.prisma.socialProfileDecoration.findUnique({ where: { id } });
  if (!item || item.kind !== config.kind) notFound(config.title);
  await ctx.prisma.$transaction([
    ctx.prisma.socialProfile.updateMany({ where: { [config.appliedIdField]: id }, data: { [config.appliedIdField]: null } }),
    ctx.prisma.socialProfileDecoration.update({ where: { id }, data: { status: 'archived' } })
  ]);
  await writeAudit(ctx, `admin_archive_social_${config.auditKey}`, 'socialProfileDecoration', id, { name: item.name });
  return true;
};

export const listProfileDecorations = (ctx) => listProfileCatalog(ctx, AVATAR_DECORATION_KIND);
export const listProfileEffects = (ctx) => listProfileCatalog(ctx, PROFILE_EFFECT_KIND);
export const applyProfileDecoration = (ctx, id) => applyProfileCatalogItem(ctx, id, AVATAR_DECORATION_KIND);
export const applyProfileEffect = (ctx, id) => applyProfileCatalogItem(ctx, id, PROFILE_EFFECT_KIND);
export const startProfileDecorationCheckout = (ctx, id, provider, currency = 'USD') => startProfileCatalogCheckout(ctx, id, provider, currency, AVATAR_DECORATION_KIND);
export const startProfileEffectCheckout = (ctx, id, provider, currency = 'USD') => startProfileCatalogCheckout(ctx, id, provider, currency, PROFILE_EFFECT_KIND);
export const adminProfileDecorations = (ctx) => adminProfileCatalog(ctx, AVATAR_DECORATION_KIND);
export const adminProfileEffects = (ctx) => adminProfileCatalog(ctx, PROFILE_EFFECT_KIND);
export const adminUpsertProfileDecoration = (ctx, input) => adminUpsertProfileCatalogItem(ctx, input, AVATAR_DECORATION_KIND);
export const adminUpsertProfileEffect = (ctx, input) => adminUpsertProfileCatalogItem(ctx, input, PROFILE_EFFECT_KIND);
export const adminArchiveProfileDecoration = (ctx, id) => adminArchiveProfileCatalogItem(ctx, id, AVATAR_DECORATION_KIND);
export const adminArchiveProfileEffect = (ctx, id) => adminArchiveProfileCatalogItem(ctx, id, PROFILE_EFFECT_KIND);

export const adminUpdateUserStatus = async (ctx, userId, status, reason) => {
  const actor = await requireAdmin(ctx);
  const normalizedStatus = bounded(status, 30).toLowerCase();
  if (!['active', 'suspended', 'banned', 'disabled'].includes(normalizedStatus)) throw new AppError('Invalid account status', 'BAD_USER_INPUT');
  if (actor.id === userId && normalizedStatus !== 'active') throw new AppError('You cannot restrict your own account', 'BAD_USER_INPUT');
  const user = await ctx.prisma.user.findUnique({ where: { id: userId } });
  if (!user) notFound('User');
  const restrictionReason = normalizedStatus === 'active' ? null : bounded(reason, 1000) || 'Restricted by a Tiwi Social administrator';
  await ctx.prisma.user.update({ where: { id: userId }, data: {
    status: normalizedStatus,
    socialRestrictionCode: normalizedStatus === 'active' ? null : `admin_${normalizedStatus}`,
    socialRestrictionReason: restrictionReason,
    socialRestrictedAt: normalizedStatus === 'active' ? null : new Date(),
    socialModerationScore: normalizedStatus === 'active' ? null : user.socialModerationScore
  } });
  await ensureProfile(ctx, user);
  await writeAudit(ctx, 'admin_update_social_user_status', 'user', userId, { status: normalizedStatus, reason: restrictionReason });
  return profileForUser(ctx, userId);
};

export const adminResolveReport = async (ctx, id, status, resolution) => {
  await requireAdmin(ctx);
  const report = await ctx.prisma.socialReport.findUnique({ where: { id } });
  if (!report) notFound('Report');
  const updated = await ctx.prisma.socialReport.update({
    where: { id },
    data: { status: bounded(status, 30).toLowerCase(), resolution: bounded(resolution, 2000) }
  });
  await writeAudit(ctx, 'admin_resolve_social_report', 'socialReport', id, { status });
  const normalizedStatus = updated.status;
  if (report.targetType === 'verification') {
    await createSocialNotification(ctx, {
      ownerId: report.reporterId,
      scopeId: report.id,
      type: 'verification_reviewed',
      title: 'Verification review completed',
      message: normalizedStatus === 'resolved'
        ? (bounded(resolution, 1000) || 'Tiwi Team completed the review of your verification request.')
        : 'Tiwi Team reviewed your verification request, but it was not approved at this time.',
      metadata: supportCenterMetadata({ caseType: 'verification', reportId: report.id, badgeType: 'gold', outcome: normalizedStatus })
    });
  } else {
    const label = reportTargetLabel(report.targetType);
    const actionTaken = normalizedStatus === 'resolved';
    await createSocialNotification(ctx, {
      ownerId: report.reporterId,
      scopeId: report.id,
      type: 'report_reviewed',
      title: actionTaken ? 'We took action on your report' : 'We reviewed your report',
      message: actionTaken
        ? `We found that the ${label} you reported does not follow our Community Guidelines, so we took action. The account will not know who submitted the report.`
        : `We reviewed the ${label} you reported and found that it follows our Community Guidelines, so we did not remove it. The account will not know who submitted the report.`,
      metadata: supportCenterMetadata({
        caseType: 'report',
        reportId: report.id,
        targetType: report.targetType,
        targetId: report.targetId,
        outcome: normalizedStatus,
        resolution: updated.resolution || ''
      })
    });
  }
  return updated;
};

export const adminUpdateSettings = async (ctx, input) => {
  await requireAdmin(ctx);
  const current = await getSettings(ctx);
  const value = {
    ...current,
    ...removeUndefined(input),
    moderation: input.moderation === undefined ? current.moderation : { ...current.moderation, ...input.moderation },
    profileEffects: input.profileEffects === undefined ? current.profileEffects : {
      replayIntervalSeconds: Math.max(0, Math.min(Number(input.profileEffects?.replayIntervalSeconds) || 0, 3600)),
      loopCount: Math.max(1, Math.min(Number(input.profileEffects?.loopCount) || 2, 10))
    },
    mediaMaxMb: input.mediaMaxMb === undefined ? current.mediaMaxMb : Math.max(1, Math.min(input.mediaMaxMb, 2048))
  };
  await ctx.prisma.systemSetting.upsert({
    where: { scope_scopeId_key: { scope: 'platform', scopeId: '', key: SOCIAL_SETTING_KEY } },
    create: { scope: 'platform', scopeId: '', key: SOCIAL_SETTING_KEY, value },
    update: { value }
  });
  await writeAudit(ctx, 'admin_update_social_settings', 'systemSetting', SOCIAL_SETTING_KEY, { fields: Object.keys(input) });
  return value;
};
