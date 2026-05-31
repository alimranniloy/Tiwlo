import bcrypt from 'bcryptjs';
import ipaddr from 'ipaddr.js';
import { writeAudit } from '../../core/audit.js';
import { ensureDeviceSessionTable } from './deviceSecurity.js';

const RESTRICTED_STATUSES = ['disabled', 'banned', 'blocked', 'suspended'];
const TERMINAL_STATUSES = new Set(['deleted', 'destroyed', 'archived']);
const DEFAULT_SYSTEM_SHIELD = {
  enabled: true,
  autoDisable: true,
  disableDelaySeconds: 2,
  autoSuspendServices: true,
  blockDuplicatePhone: true,
  matchRestrictedOnly: true,
  vpnDetection: true,
  disableOnVpnOnly: false,
  riskThreshold: 80,
  weights: {
    duplicatePhone: 120,
    restrictedPhone: 120,
    sameDevice: 95,
    samePassword: 90,
    sameIp: 70,
    sameIpPrefix: 55,
    sameBillingName: 55,
    sameName: 45,
    sameAddress: 35,
    vpnOrProxy: 25
  }
};

const statusKey = (value) => String(value || '').trim().toLowerCase();
const isRestrictedStatus = (value) => RESTRICTED_STATUSES.includes(statusKey(value));
const isTerminal = (value) => TERMINAL_STATUSES.has(statusKey(value));

const text = (value) => String(value || '').trim();
const lower = (value) => text(value).toLowerCase();
const digits = (value) => text(value).replace(/\D/g, '');

const normText = (value) => lower(value)
  .replace(/[^a-z0-9\s]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const normAddress = (value) => normText(value)
  .replace(/\b(road|rd|street|st|avenue|ave|house|holding|flat|apt|apartment)\b/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const tokenOverlap = (left, right) => {
  const leftTokens = new Set(normText(left).split(/\s+/).filter((part) => part.length > 1));
  const rightTokens = new Set(normText(right).split(/\s+/).filter((part) => part.length > 1));
  if (!leftTokens.size || !rightTokens.size) return 0;
  let hits = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) hits += 1;
  });
  return hits / Math.max(leftTokens.size, rightTokens.size);
};

const normalizePhoneParts = (countryCode, phone) => {
  const codeDigits = digits(countryCode);
  const phoneDigits = digits(phone);
  const localDigits = codeDigits && phoneDigits.startsWith(codeDigits)
    ? phoneDigits.slice(codeDigits.length)
    : phoneDigits.replace(/^0+/, '');
  return {
    codeDigits,
    localDigits,
    fullDigits: codeDigits && localDigits ? `${codeDigits}${localDigits}` : phoneDigits
  };
};

const samePhone = (left, right) => {
  if (!left.fullDigits || !right.fullDigits) return false;
  if (left.fullDigits === right.fullDigits) return true;
  return Boolean(left.codeDigits && right.codeDigits && left.codeDigits === right.codeDigits && left.localDigits === right.localDigits);
};

const mergeShieldMetadata = (current, patch) => ({
  ...(current || {}),
  systemShield: {
    ...((current || {}).systemShield || {}),
    ...patch,
    updatedAt: new Date().toISOString()
  }
});

export const getSystemShieldPolicy = async (prisma) => {
  const setting = await prisma.systemSetting.findUnique({
    where: { scope_scopeId_key: { scope: 'platform', scopeId: '', key: 'systemShield' } }
  }).catch(() => null);
  const value = setting?.value || {};
  return {
    ...DEFAULT_SYSTEM_SHIELD,
    ...value,
    weights: {
      ...DEFAULT_SYSTEM_SHIELD.weights,
      ...(value.weights || {})
    }
  };
};

const addSignal = (signals, key, label, score, matchedUser = null, metadata = {}) => {
  signals.push({
    key,
    label,
    score: Number(score || 0),
    matchedUserId: matchedUser?.id || null,
    matchedUserEmail: matchedUser?.email || null,
    matchedUserStatus: matchedUser?.status || null,
    ...metadata
  });
};

const networkRiskFromHeaders = (ctx, policy) => {
  if (!policy.vpnDetection) return null;
  const headers = ctx.requestHeaders || {};
  const forwarded = String(headers['x-forwarded-for'] || '').split(',').map((item) => item.trim()).filter(Boolean);
  const ip = text(ctx.requestIp || forwarded[0]);
  const reasons = [];

  if (forwarded.length > 2) reasons.push('proxy_chain');
  try {
    const parsed = ipaddr.parse(ip.replace(/^::ffff:/, ''));
    const range = parsed.range();
    if (!['unicast', 'private'].includes(range)) reasons.push(`ip_range_${range}`);
  } catch {
    if (ip) reasons.push('ip_parse_failed');
  }

  const asn = String(headers['x-asn'] || headers['cf-asn'] || headers['x-vercel-ip-asn'] || '').toLowerCase();
  const org = String(headers['x-as-organization'] || headers['cf-as-organization'] || headers['x-vercel-ip-as-organization'] || '').toLowerCase();
  if (/(hosting|cloud|datacenter|data center|vpn|proxy|tor|colo|server)/i.test(`${asn} ${org}`)) {
    reasons.push('datacenter_or_proxy_asn');
  }

  return reasons.length ? { reasons, ip } : null;
};

const candidateUsers = async (prisma, userId, policy) => {
  const where = policy.matchRestrictedOnly
    ? { id: { not: userId }, status: { in: RESTRICTED_STATUSES } }
    : { id: { not: userId } };
  return prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 250,
    select: {
      id: true,
      email: true,
      passwordHash: true,
      name: true,
      status: true,
      phone: true,
      mobileCountryCode: true,
      billingName: true,
      addressLine1: true,
      city: true,
      postalCode: true
    }
  });
};

const duplicatePhoneUsers = async (prisma, userId, phoneParts) => {
  if (!phoneParts.fullDigits) return [];
  const users = await prisma.user.findMany({
    where: { id: { not: userId } },
    orderBy: { createdAt: 'desc' },
    take: 250,
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      phone: true,
      mobileCountryCode: true
    }
  });
  return users.filter((user) => samePhone(phoneParts, normalizePhoneParts(user.mobileCountryCode, user.phone)));
};

const matchingDeviceSessions = async (prisma, user, deviceSession, policy) => {
  if (!deviceSession?.fingerprintHash && !deviceSession?.ipAddress && !deviceSession?.ipPrefix) return [];
  await ensureDeviceSessionTable(prisma);
  const or = [];
  if (deviceSession.fingerprintHash) or.push({ fingerprintHash: deviceSession.fingerprintHash });
  if (deviceSession.ipAddress) or.push({ ipAddress: deviceSession.ipAddress });
  if (deviceSession.ipPrefix) or.push({ ipPrefix: deviceSession.ipPrefix });
  if (!or.length) return [];

  return prisma.userDeviceSession.findMany({
    where: {
      userId: { not: user.id },
      OR: or,
      ...(policy.matchRestrictedOnly ? { user: { status: { in: RESTRICTED_STATUSES } } } : {})
    },
    include: { user: true },
    orderBy: { lastSeenAt: 'desc' },
    take: 40
  });
};

export const analyzeSignupShield = async (ctx, user, input, deviceSession) => {
  const policy = await getSystemShieldPolicy(ctx.prisma);
  if (!policy.enabled) {
    return { policy, score: 0, action: 'allow', signals: [], matchedUsers: [] };
  }

  const signals = [];
  const weights = policy.weights || DEFAULT_SYSTEM_SHIELD.weights;
  const newPhone = normalizePhoneParts(input.mobileCountryCode, input.phone);
  const candidates = await candidateUsers(ctx.prisma, user.id, policy);
  const duplicatePhones = policy.blockDuplicatePhone ? await duplicatePhoneUsers(ctx.prisma, user.id, newPhone) : [];

  duplicatePhones.forEach((candidate) => addSignal(
    signals,
    isRestrictedStatus(candidate.status) ? 'restricted_phone' : 'duplicate_phone',
    isRestrictedStatus(candidate.status) ? 'Same phone as restricted account' : 'Same phone already used',
    isRestrictedStatus(candidate.status) ? weights.restrictedPhone : weights.duplicatePhone,
    candidate
  ));

  const deviceMatches = await matchingDeviceSessions(ctx.prisma, user, deviceSession, policy);
  deviceMatches.forEach((session) => {
    if (deviceSession?.fingerprintHash && session.fingerprintHash === deviceSession.fingerprintHash) {
      addSignal(signals, 'same_device', 'Same device fingerprint', weights.sameDevice, session.user, { sessionId: session.id });
      return;
    }
    if (deviceSession?.ipAddress && session.ipAddress === deviceSession.ipAddress) {
      addSignal(signals, 'same_ip', 'Same signup IP', weights.sameIp, session.user, { sessionId: session.id });
      return;
    }
    if (deviceSession?.ipPrefix && session.ipPrefix === deviceSession.ipPrefix) {
      addSignal(signals, 'same_ip_prefix', 'Same Wi-Fi/network prefix', weights.sameIpPrefix, session.user, { sessionId: session.id });
    }
  });

  for (const candidate of candidates) {
    if (!duplicatePhones.some((item) => item.id === candidate.id) && samePhone(newPhone, normalizePhoneParts(candidate.mobileCountryCode, candidate.phone))) {
      addSignal(signals, 'restricted_phone', 'Same phone as restricted account', weights.restrictedPhone, candidate);
    }
    if (normText(input.name) && tokenOverlap(input.name, candidate.name) >= 0.66) {
      addSignal(signals, 'same_name', 'Similar account name', weights.sameName, candidate);
    }
    if (normText(input.billingName) && tokenOverlap(input.billingName, candidate.billingName) >= 0.66) {
      addSignal(signals, 'same_billing_name', 'Similar billing name', weights.sameBillingName, candidate);
    }
    const newAddress = `${normAddress(input.addressLine1)} ${normText(input.city)} ${normText(input.postalCode)}`.trim();
    const oldAddress = `${normAddress(candidate.addressLine1)} ${normText(candidate.city)} ${normText(candidate.postalCode)}`.trim();
    if (newAddress && oldAddress && (newAddress === oldAddress || tokenOverlap(newAddress, oldAddress) >= 0.72)) {
      addSignal(signals, 'same_address', 'Similar billing address', weights.sameAddress, candidate);
    }
  }

  if (input.password) {
    for (const candidate of candidates.filter((item) => item.passwordHash).slice(0, 80)) {
      const matched = await bcrypt.compare(input.password, candidate.passwordHash).catch(() => false);
      if (matched) addSignal(signals, 'same_password', 'Same password as restricted account', weights.samePassword, candidate);
    }
  }

  const networkRisk = networkRiskFromHeaders(ctx, policy);
  if (networkRisk) {
    addSignal(signals, 'vpn_or_proxy', 'VPN/proxy/datacenter network signal', weights.vpnOrProxy, null, networkRisk);
  }

  const strongestByKey = new Map();
  signals.forEach((signal) => {
    const current = strongestByKey.get(signal.key);
    if (!current || current.score < signal.score) strongestByKey.set(signal.key, signal);
  });
  const uniqueSignals = [...strongestByKey.values()];
  const score = Math.min(200, uniqueSignals.reduce((total, signal) => total + Number(signal.score || 0), 0));
  const hasOnlyVpnSignal = uniqueSignals.length === 1 && uniqueSignals[0].key === 'vpn_or_proxy';
  const action = policy.autoDisable && score >= Number(policy.riskThreshold || 80) && (!hasOnlyVpnSignal || policy.disableOnVpnOnly)
    ? 'disable'
    : 'allow';

  return {
    policy,
    score,
    action,
    signals: uniqueSignals,
    matchedUsers: [...new Map(signals.filter((item) => item.matchedUserId).map((item) => [item.matchedUserId, {
      id: item.matchedUserId,
      email: item.matchedUserEmail,
      status: item.matchedUserStatus
    }])).values()]
  };
};

export const suspendOwnerServices = async (ctx, ownerId, reason = 'system_shield_restricted_account') => {
  const now = new Date();
  const stamp = now.toISOString();
  const result = {
    resourcesSuspended: 0,
    storesSuspended: 0,
    ispSitesSuspended: 0,
    networkNodesSuspended: 0,
    tiwloPayProfilesSuspended: 0,
    tiwloPayLinksExpired: 0,
    apiCredentialsRevoked: 0
  };

  const resources = await ctx.prisma.cloudResource.findMany({ where: { ownerId } });
  const resourceTargets = resources.filter((resource) => !isTerminal(resource.status) && statusKey(resource.status) !== 'suspended');
  await Promise.all(resourceTargets.map((resource) => ctx.prisma.cloudResource.update({
    where: { id: resource.id },
    data: {
      status: 'suspended',
      metadata: mergeShieldMetadata(resource.metadata, { reason, previousStatus: resource.status, suspendedAt: stamp })
    }
  })));
  result.resourcesSuspended = resourceTargets.length;

  const stores = await ctx.prisma.store.findMany({ where: { ownerId } });
  const storeTargets = stores.filter((store) => !isTerminal(store.status) && statusKey(store.status) !== 'suspended');
  await Promise.all(storeTargets.map((store) => ctx.prisma.store.update({
    where: { id: store.id },
    data: {
      status: 'suspended',
      settings: mergeShieldMetadata(store.settings, { reason, previousStatus: store.status, suspendedAt: stamp })
    }
  })));
  result.storesSuspended = storeTargets.length;

  const sites = await ctx.prisma.ispSite.findMany({ where: { ownerId } });
  const siteTargets = sites.filter((site) => !isTerminal(site.status) && statusKey(site.status) !== 'suspended');
  await Promise.all(siteTargets.map((site) => ctx.prisma.ispSite.update({
    where: { id: site.id },
    data: {
      status: 'suspended',
      settings: mergeShieldMetadata(site.settings, { reason, previousStatus: site.status, suspendedAt: stamp })
    }
  })));
  result.ispSitesSuspended = siteTargets.length;

  const siteIds = sites.map((site) => site.id);
  if (siteIds.length) {
    const [routers, radiusServers, devices] = await Promise.all([
      ctx.prisma.ispRouter.findMany({ where: { siteId: { in: siteIds } } }),
      ctx.prisma.radiusServer.findMany({ where: { siteId: { in: siteIds } } }),
      ctx.prisma.networkDevice.findMany({ where: { siteId: { in: siteIds } } })
    ]);
    const routerTargets = routers.filter((item) => statusKey(item.status) !== 'offline');
    const radiusTargets = radiusServers.filter((item) => statusKey(item.status) !== 'offline');
    const deviceTargets = devices.filter((item) => statusKey(item.status) !== 'offline');
    await Promise.all([
      ...routerTargets.map((item) => ctx.prisma.ispRouter.update({
        where: { id: item.id },
        data: { status: 'offline', config: mergeShieldMetadata(item.config, { reason, previousStatus: item.status, suspendedAt: stamp }) }
      })),
      ...radiusTargets.map((item) => ctx.prisma.radiusServer.update({
        where: { id: item.id },
        data: { status: 'offline', metadata: mergeShieldMetadata(item.metadata, { reason, previousStatus: item.status, suspendedAt: stamp }) }
      })),
      ...deviceTargets.map((item) => ctx.prisma.networkDevice.update({
        where: { id: item.id },
        data: { status: 'offline', metadata: mergeShieldMetadata(item.metadata, { reason, previousStatus: item.status, suspendedAt: stamp }) }
      }))
    ]);
    result.networkNodesSuspended = routerTargets.length + radiusTargets.length + deviceTargets.length;
  }

  const profiles = await ctx.prisma.tiwloPayProfile.findMany({ where: { ownerId } }).catch(() => []);
  await Promise.all(profiles.filter((profile) => statusKey(profile.status) !== 'suspended').map((profile) => ctx.prisma.tiwloPayProfile.update({
    where: { id: profile.id },
    data: {
      status: 'suspended',
      settings: mergeShieldMetadata(profile.settings, { reason, previousStatus: profile.status, suspendedAt: stamp })
    }
  })));
  result.tiwloPayProfilesSuspended = profiles.filter((profile) => statusKey(profile.status) !== 'suspended').length;

  const linkUpdate = await ctx.prisma.tiwloPayLink.updateMany({
    where: { ownerId, status: 'unpaid' },
    data: { status: 'expired' }
  }).catch(() => ({ count: 0 }));
  result.tiwloPayLinksExpired = linkUpdate.count || 0;

  const credentialUpdate = await ctx.prisma.apiCredential.updateMany({
    where: { ownerId, status: 'active' },
    data: { status: 'revoked' }
  }).catch(() => ({ count: 0 }));
  result.apiCredentialsRevoked = credentialUpdate.count || 0;

  await writeAudit(ctx, 'system_shield_suspend_owner_services', 'user', ownerId, { reason, result });
  return result;
};

export const enforceSignupShield = async (ctx, user, input, deviceSession) => {
  const analysis = await analyzeSignupShield(ctx, user, input, deviceSession);
  await writeAudit({ ...ctx, user }, 'system_shield_signup_scan', 'user', user.id, {
    score: analysis.score,
    action: analysis.action,
    signals: analysis.signals,
    matchedUsers: analysis.matchedUsers
  });

  if (analysis.action !== 'disable') return { user, analysis, serviceResult: null };

  const delay = Math.max(0, Math.min(5, Number(analysis.policy.disableDelaySeconds || 0))) * 1000;
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));

  const disabled = await ctx.prisma.user.update({
    where: { id: user.id },
    data: { status: 'disabled' }
  });
  const serviceResult = analysis.policy.autoSuspendServices
    ? await suspendOwnerServices(ctx, user.id, 'system_shield_signup_match')
    : null;

  await writeAudit({ ...ctx, user: disabled }, 'system_shield_auto_disable_account', 'user', user.id, {
    score: analysis.score,
    signals: analysis.signals,
    matchedUsers: analysis.matchedUsers,
    serviceResult
  });

  return { user: disabled, analysis, serviceResult };
};

export const enforceRestrictedStatusServices = async (ctx, userId, status) => {
  if (!isRestrictedStatus(status)) return null;
  const policy = await getSystemShieldPolicy(ctx.prisma);
  if (!policy.enabled || !policy.autoSuspendServices) return null;
  return suspendOwnerServices(ctx, userId, `account_${statusKey(status)}`);
};
