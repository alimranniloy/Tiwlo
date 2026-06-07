import crypto from 'node:crypto';

export const GATEWAY_PATH = process.env.TSECURITY_GATEWAY_PATH || '/data/v3/sync-state';
export const ADMIN_BLOCKS_PATH = process.env.TSECURITY_ADMIN_BLOCKS_PATH || '/data/v3/control-plane/user-blocks';

export const DEFAULT_POLICY = {
  enabled: true,
  gatewayTicketTtlSeconds: 600,
  challengeTtlSeconds: 90,
  cooldownDays: 90,
  blockOnVpn: true,
  blockOnDisposableEmail: true,
  blockOnTor: true,
  blockOnHosting: true,
  blockPrivateIps: false,
  subnetWindowMinutes: 30,
  subnetSignupLimit: 5,
  subnetCooldownMinutes: 240,
  humanVelocityMinMs: 1800,
  humanVelocityWarnMs: 3200,
  maxForwardedHops: 3,
  blockOnMissingEmailMx: true,
  blockOnMissingEmailNs: true,
  blockOnDnsLookupError: false,
  blockOnIdentityMutator: true,
  identitySimilarityThreshold: 0.9,
  identitySimilarityLookbackDays: 90,
  blockOnClockSkew: true,
  blockOnTimezoneMismatch: true,
  clockSkewToleranceMs: 10 * 60 * 1000,
  timezoneOffsetToleranceMinutes: 90,
  blockOnParamPollution: true,
  blockOnControlCharacters: true,
  blockOnSessionLockMismatch: true,
  blockOnConsoleInspection: true,
  devtoolsOpenSampleLimit: 2,
  blockOnMimeSpoof: true,
  blockOnRequestReplay: true,
  requestTtlMs: 10 * 60 * 1000,
  requestFutureToleranceMs: 90 * 1000,
  gatewayRateLimit: {
    windowMs: 60 * 1000,
    max: 90
  },
  memoryBrute: {
    perSecond: 14,
    perMinute: 140,
    banMs: 10 * 60 * 1000
  },
  weights: {
    disposableEmail: 100,
    activeCooldown: 130,
    vpn: 100,
    proxy: 95,
    tor: 120,
    hosting: 90,
    subnetBurst: 110,
    roboticVelocity: 95,
    weakDevice: 25,
    proxySpoof: 115,
    invalidEmailDns: 105,
    missingEmailMx: 90,
    missingEmailNs: 60,
    identityMutator: 115,
    clockSkew: 90,
    timezoneMismatch: 80,
    paramSanitizer: 115,
    sessionHijack: 120,
    consoleInspection: 75,
    mimeSpoof: 120,
    requestReplay: 95
  },
  ipReputation: {
    url: process.env.TSECURITY_IP_REPUTATION_URL || '',
    token: process.env.TSECURITY_IP_REPUTATION_TOKEN || '',
    timeoutMs: Number(process.env.TSECURITY_IP_REPUTATION_TIMEOUT_MS || 2200)
  }
};

export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  '10minutemail.com',
  '20minutemail.com',
  'anonaddy.com',
  'burnermail.io',
  'dispostable.com',
  'emailondeck.com',
  'fakeinbox.com',
  'getnada.com',
  'guerrillamail.com',
  'maildrop.cc',
  'mailinator.com',
  'moakt.com',
  'sharklasers.com',
  'temp-mail.org',
  'tempmail.com',
  'throwawaymail.com',
  'trashmail.com',
  'yopmail.com'
]);

const mergePolicy = (base, patch = {}) => ({
  ...base,
  ...patch,
  gatewayRateLimit: {
    ...base.gatewayRateLimit,
    ...(patch.gatewayRateLimit || {})
  },
  memoryBrute: {
    ...base.memoryBrute,
    ...(patch.memoryBrute || {})
  },
  weights: {
    ...base.weights,
    ...(patch.weights || {})
  },
  ipReputation: {
    ...base.ipReputation,
    ...(patch.ipReputation || {})
  }
});

export const getTSecurityPolicy = async (prisma) => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT "value"
    FROM "SystemSetting"
    WHERE "scope" = 'platform' AND "scopeId" = '' AND "key" = 'tSecurity'
    LIMIT 1
  `).catch(() => []);
  const value = rows?.[0]?.value && typeof rows[0].value === 'object' ? rows[0].value : {};
  return mergePolicy(DEFAULT_POLICY, value);
};

export const upsertTSecurityPolicy = async (prisma, value = {}) => {
  const policy = mergePolicy(DEFAULT_POLICY, value);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "SystemSetting" ("id", "scope", "scopeId", "key", "value", "createdAt", "updatedAt")
    VALUES ($1, 'platform', '', 'tSecurity', CAST($2 AS jsonb), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("scope", "scopeId", "key")
    DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = CURRENT_TIMESTAMP
  `, cryptoId(), JSON.stringify(policy));
  return policy;
};

const cryptoId = () => {
  return crypto.randomUUID();
};
