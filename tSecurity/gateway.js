import { DEFAULT_POLICY, getTSecurityPolicy } from './config.js';
import { behavioralCheck } from './components/behavioralCheck.js';
import { clockSkewDefender } from './components/clockSkewDefender.js';
import { consoleDefender } from './components/consoleDefender.js';
import { checkCooldown, saveCooldownsForBlock } from './components/cooldownManager.js';
import { analyzeDeviceFingerprint, buildDeviceFingerprint } from './components/deviceFingerprint.js';
import { dnsRecordChecker } from './components/dnsRecordChecker.js';
import { validateEmail } from './components/emailValidator.js';
import { identityLevenstein } from './components/identityLevenstein.js';
import { mimeShield } from './components/mimeShield.js';
import { trackNetwork } from './components/networkTracker.js';
import { paramSanitizer } from './components/paramSanitizer.js';
import { proxySpoofShield } from './components/proxySpoofShield.js';
import { requestExpiration } from './components/requestExpiration.js';
import { sessionLock } from './components/sessionLock.js';
import { vpnCheck } from './components/vpnCheck.js';
import { notifyTSecurityBlock } from './notifications/discordNotifier.js';
import {
  blockKnownUserByEmail,
  contextFromPayload,
  findGatewayTicketByTokenHash,
  insertBlockEvent,
  insertGatewayTicket,
  markGatewayTicketUsed,
  listBlockEvents,
  blockSummary
} from './db/repository.js';
import { ensureTSecuritySchema } from './db/schema.js';
import { decryptTicketPayload, encryptTicketPayload, safeTicketPayload } from './crypto/payloadCrypto.js';
import {
  addDays,
  addSeconds,
  clean,
  compact,
  hashValue,
  json,
  normalizeEmail,
  normalizePhone,
  randomId,
  randomToken,
  requestCountry,
  sha256,
  subnetForIp,
  toApi,
  TSecurityError
} from './utils.js';

const allowedActions = new Set(['login', 'signup', 'signupAvailability']);
const restrictedStatuses = new Set(['disabled', 'banned', 'blocked', 'suspended']);

const authPayloadFromGateway = (payload = {}) => {
  const form = payload.form && typeof payload.form === 'object' ? payload.form : payload;
  return {
    ...form,
    deviceFingerprint: payload.deviceFingerprint || form.deviceFingerprint,
    deviceMetadata: payload.deviceMetadata || payload.device || form.deviceMetadata || {},
    behavior: payload.behavior || form.behavior || {}
  };
};

const requestContext = (req, deps = {}) => {
  const ipAddress = deps.requestIp ? deps.requestIp(req) : (req.ip || req.socket?.remoteAddress || '');
  return {
    ipAddress,
    ipSubnet: subnetForIp(ipAddress),
    country: requestCountry(req.headers || ''),
    userAgent: req.headers?.['user-agent'] || '',
    headers: req.headers || {},
    route: req.originalUrl || req.url || ''
  };
};

const chooseBlockReason = (signals = []) => {
  const blocked = signals.filter((signal) => signal.block);
  if (!blocked.length) return '';
  return blocked.sort((left, right) => Number(right.score || 0) - Number(left.score || 0))[0].reason || blocked[0].label || 'Security Check Failed';
};

const runChecks = async ({ prisma, req, action, payload, request, policy }) => {
  if (policy.enabled === false) {
    const fingerprint = buildDeviceFingerprint({ req, request, payload });
    const context = contextFromPayload({ action, payload: authPayloadFromGateway(payload), request, deviceHash: fingerprint.deviceHash });
    return { allow: true, riskScore: 0, signals: [], context, fingerprint, payload };
  }

  const sanitizer = paramSanitizer({ payload, policy });
  const safePayload = sanitizer.sanitizedPayload || payload;
  let effectiveRequest = { ...request };
  const proxyShield = proxySpoofShield({ req, request: effectiveRequest, policy });
  if (proxyShield.clientIp) {
    effectiveRequest = {
      ...effectiveRequest,
      ipAddress: proxyShield.clientIp,
      ipSubnet: subnetForIp(proxyShield.clientIp)
    };
  }
  const fingerprint = buildDeviceFingerprint({ req, request: effectiveRequest, payload: safePayload });
  const context = contextFromPayload({ action, payload: authPayloadFromGateway(safePayload), request: effectiveRequest, deviceHash: fingerprint.deviceHash });
  const checks = [
    sanitizer,
    proxyShield,
    requestExpiration({ payload: safePayload, policy }),
    validateEmail({ payload: safePayload, policy }),
    await dnsRecordChecker({ payload: safePayload, policy }),
    analyzeDeviceFingerprint({ fingerprint, policy }),
    mimeShield({ payload: safePayload, policy }),
    await checkCooldown({ prisma, context, policy }),
    await vpnCheck({ request: effectiveRequest, policy }),
    await trackNetwork({ prisma, action, context, policy })
  ];
  if (action !== 'signupAvailability') {
    checks.splice(
      5,
      0,
      behavioralCheck({ payload: safePayload, policy }),
      clockSkewDefender({ payload: safePayload, request: effectiveRequest, policy }),
      consoleDefender({ payload: safePayload, policy }),
      sessionLock({ payload: safePayload, fingerprint, policy }),
      await identityLevenstein({ prisma, payload: safePayload, context, policy })
    );
  }
  const signals = checks.flatMap((check) => check.signals || []);
  const riskScore = Math.min(500, signals.reduce((total, signal) => total + Number(signal.score || 0), 0));
  const reason = chooseBlockReason(signals);
  return {
    allow: !reason,
    reason,
    riskScore,
    signals,
    context,
    fingerprint,
    payload: safePayload,
    request: effectiveRequest
  };
};

const persistBlock = async ({ prisma, req, action, payload, context, decision, policy }) => {
  const blockedUntil = addDays(policy.cooldownDays || DEFAULT_POLICY.cooldownDays);
  const blockEventId = await insertBlockEvent(prisma, {
    email: context.email,
    phone: context.phone,
    ipAddress: context.ipAddress,
    ipSubnet: context.ipSubnet,
    country: context.country,
    deviceHash: context.deviceHash,
    eventType: action,
    reason: decision.reason,
    reasons: decision.signals,
    riskScore: decision.riskScore,
    requestId: randomId(),
    payloadHash: context.payloadHash,
    blockedUntil,
    metadata: {
      userAgent: req.headers?.['user-agent'] || '',
      passiveFingerprint: req.fingerprint?.hash || '',
      payload: safeTicketPayload(authPayloadFromGateway(payload))
    }
  });
  await saveCooldownsForBlock(prisma, { ...context, blockedUntil }, blockEventId, decision.reason, policy);
  const knownUser = action === 'login' ? await blockKnownUserByEmail(prisma, context.email, decision.reason) : null;
  if (req.session?.destroy) {
    req.session.destroy(() => {});
  }
  await insertGatewayTicket(prisma, {
    id: randomId(),
    tokenHash: hashValue(`blocked:${blockEventId}`),
    action,
    verdict: 'blocked',
    riskScore: decision.riskScore,
    reasons: decision.signals,
    payloadCiphertext: null,
    emailHash: context.email ? hashValue(`email:${context.email}`) : '',
    phoneHash: context.phone ? hashValue(`phone:${context.phone}`) : '',
    deviceHash: context.deviceHash,
    ipAddress: context.ipAddress,
    ipSubnet: context.ipSubnet,
    country: context.country,
    metadata: { blockEventId, knownUser },
    expiresAt: addSeconds(60)
  });
  let discord = null;
  try {
    discord = await notifyTSecurityBlock({
      prisma,
      blockEventId,
      action,
      context,
      decision,
      blockedUntil,
      knownUser
    });
  } catch (error) {
    discord = { sent: false, error: error.message || 'Discord notification failed' };
  }
  return { blockEventId, knownUser, blockedUntil, discord };
};

const createAllowTicket = async ({ prisma, action, authPayload, context, decision, policy }) => {
  const token = randomToken(36);
  const expiresAt = addSeconds(policy.gatewayTicketTtlSeconds || DEFAULT_POLICY.gatewayTicketTtlSeconds);
  await insertGatewayTicket(prisma, {
    id: randomId(),
    tokenHash: hashValue(`ticket:${token}`),
    action,
    verdict: 'allow',
    riskScore: decision.riskScore,
    reasons: decision.signals,
    payloadCiphertext: encryptTicketPayload(authPayload),
    emailHash: context.email ? hashValue(`email:${context.email}`) : '',
    phoneHash: context.phone ? hashValue(`phone:${context.phone}`) : '',
    deviceHash: context.deviceHash,
    ipAddress: context.ipAddress,
    ipSubnet: context.ipSubnet,
    country: context.country,
    metadata: {
      payloadShape: Object.keys(authPayload || {}).sort(),
      payloadHash: sha256(json(safeTicketPayload(authPayload)))
    },
    expiresAt
  });
  return { token, expiresAt };
};

const phoneUsedForSignup = async (prisma, phoneE164) => {
  if (!phoneE164) return null;
  const rows = await prisma.$queryRawUnsafe(`
    SELECT "id", "email", "phone", "mobileCountryCode", "country", "whatsappVerifiedPhone"
    FROM "User"
    WHERE "phone" IS NOT NULL OR "whatsappVerifiedPhone" IS NOT NULL
  `).catch(() => []);
  return (rows || []).find((user) => {
    if (user.whatsappVerifiedPhone === phoneE164) return true;
    return normalizePhone({
      phone: user.phone,
      mobileCountryCode: user.mobileCountryCode
    }) === phoneE164;
  }) || null;
};

export const signupAvailabilityViaTSecurity = async (prisma, input = {}) => {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input);
  const [emailOwner, phoneOwner] = await Promise.all([
    email ? prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, avatar: true } }).catch(() => null) : null,
    phone ? phoneUsedForSignup(prisma, phone) : null
  ]);
  return {
    ok: !emailOwner && !phoneOwner,
    emailAvailable: !emailOwner,
    phoneAvailable: !phoneOwner,
    normalizedPhone: phone,
    existingAccountName: emailOwner?.name || null,
    existingAccountEmail: emailOwner?.email || null,
    existingAccountAvatar: emailOwner?.avatar || null,
    message: emailOwner
      ? 'This email address is already in use.'
      : phoneOwner
        ? 'This phone number is already in use.'
        : 'Email and phone number are available.'
  };
};

export const handleGatewayPayload = async ({ prisma, req, deps, decryptedPayload }) => {
  await ensureTSecuritySchema(prisma);
  const policy = await getTSecurityPolicy(prisma);
  const action = clean(decryptedPayload.action);
  if (!allowedActions.has(action)) {
    throw new TSecurityError('Unknown security action.', 'BAD_USER_INPUT');
  }
  const payload = decryptedPayload.payload && typeof decryptedPayload.payload === 'object'
    ? { ...decryptedPayload.payload, action }
    : decryptedPayload;
  const request = requestContext(req, deps);
  const decision = await runChecks({ prisma, req, action, payload, request, policy });

  if (!decision.allow) {
    const safePayload = decision.payload || payload;
    const persisted = await persistBlock({ prisma, req, action, payload: safePayload, context: decision.context, decision, policy });
    return {
      ok: false,
      blocked: true,
      reason: decision.reason,
      reasons: decision.signals,
      riskScore: decision.riskScore,
      blockedUntil: persisted.blockedUntil.toISOString(),
      blockEventId: persisted.blockEventId,
      discord: persisted.discord,
      redirect: `/blocked?reason=${encodeURIComponent(decision.reason)}`
    };
  }

  const safePayload = decision.payload || payload;
  if (action === 'signupAvailability') {
    return {
      ok: true,
      blocked: false,
      verdict: 'allow',
      availability: await signupAvailabilityViaTSecurity(prisma, authPayloadFromGateway(safePayload))
    };
  }

  const authPayload = authPayloadFromGateway(safePayload);
  const ticket = await createAllowTicket({
    prisma,
    action,
    authPayload,
    context: decision.context,
    decision,
    policy
  });

  return {
    ok: true,
    blocked: false,
    verdict: 'allow',
    token: ticket.token,
    expiresAt: ticket.expiresAt.toISOString(),
    riskScore: decision.riskScore
  };
};

export const consumeSensitivePayload = async (ctx, action, input = {}) => {
  await ensureTSecuritySchema(ctx.prisma);
  const token = clean(input.tSecurityToken || input.securityToken);
  if (!token) throw new TSecurityError('tSecurity verification is required.', 'TSECURITY_REQUIRED');
  const ticket = await findGatewayTicketByTokenHash(ctx.prisma, hashValue(`ticket:${token}`));
  if (!ticket) throw new TSecurityError('tSecurity verification was not found.', 'TSECURITY_REQUIRED');
  if (ticket.action !== action) throw new TSecurityError('tSecurity verification action mismatch.', 'TSECURITY_ACTION_MISMATCH');
  if (ticket.verdict !== 'allow') throw new TSecurityError('tSecurity blocked this request.', 'TSECURITY_BLOCKED');
  if (ticket.usedAt) throw new TSecurityError('tSecurity verification was already used.', 'TSECURITY_REPLAYED');
  if (new Date(ticket.expiresAt).getTime() < Date.now()) {
    throw new TSecurityError('tSecurity verification expired. Please retry.', 'TSECURITY_EXPIRED');
  }
  const currentSubnet = subnetForIp(ctx.requestIp || '');
  if (ticket.ipSubnet && currentSubnet && ticket.ipSubnet !== currentSubnet) {
    throw new TSecurityError('tSecurity network binding changed. Please retry.', 'TSECURITY_NETWORK_CHANGED');
  }
  const payload = decryptTicketPayload(ticket.payloadCiphertext || {});
  await markGatewayTicketUsed(ctx.prisma, ticket.id);
  return {
    payload,
    ticket: toApi({
      id: ticket.id,
      action: ticket.action,
      riskScore: ticket.riskScore,
      reasons: ticket.reasons,
      createdAt: ticket.createdAt,
      expiresAt: ticket.expiresAt
    })
  };
};

export const enforceRestrictedStatusServices = async (ctx, userId, status) => {
  if (!restrictedStatuses.has(clean(status).toLowerCase())) return null;
  await ensureTSecuritySchema(ctx.prisma);
  const user = await ctx.prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
  if (!user) return null;
  const context = {
    email: normalizeEmail(user.email),
    phone: normalizePhone(user),
    ipAddress: '',
    ipSubnet: '',
    country: clean(user.country).toUpperCase(),
    deviceHash: '',
    payloadHash: sha256(user.id)
  };
  const reason = `Admin marked user ${status}`;
  const policy = await getTSecurityPolicy(ctx.prisma);
  const blockedUntil = addDays(policy.cooldownDays || DEFAULT_POLICY.cooldownDays);
  const blockEventId = await insertBlockEvent(ctx.prisma, {
    userId,
    email: context.email,
    phone: context.phone,
    country: context.country,
    eventType: 'admin',
    reason,
    reasons: [{ key: 'admin_status_update', label: reason, score: 0, block: true, reason }],
    blockedUntil,
    metadata: compact({ status })
  });
  await saveCooldownsForBlock(ctx.prisma, { ...context, blockedUntil }, blockEventId, reason, policy);
  await notifyTSecurityBlock({
    prisma: ctx.prisma,
    blockEventId,
    action: 'admin',
    context,
    decision: {
      reason,
      riskScore: 0,
      signals: [{ key: 'admin_status_update', label: reason, score: 0, block: true, reason }]
    },
    blockedUntil,
    knownUser: { id: user.id, email: user.email, status }
  }).catch(() => null);
  return { blockEventId, blockedUntil: blockedUntil.toISOString(), reason };
};

export { listBlockEvents, blockSummary };
