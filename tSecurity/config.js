import crypto from 'node:crypto';

export const GATEWAY_PATH = process.env.TSECURITY_GATEWAY_PATH || '/data/v3/sync-state';
export const ADMIN_BLOCKS_PATH = process.env.TSECURITY_ADMIN_BLOCKS_PATH || '/data/v3/control-plane/user-blocks';

export const DEFAULT_POLICY = {
  enabled: true,
  mode: 'balanced',
  adminBypass: true,
  hideBlockReasonFromUsers: true,
  blockOnSignupAvailability: false,
  blockOnLogin: false,
  blockKnownUsersOnLogin: false,
  bindTicketToSubnet: false,
  blockOnMultipleAccount: true,
  blockOnSignupCreditReuse: true,
  blockOnSameDeviceSignup: true,
  blockOnSameSubnetSignup: true,
  blockOnAdminDeviceSignup: true,
  accountAbuseLookbackDays: 90,
  sameDeviceSignupWarnLimit: 1,
  sameDeviceSignupBlockLimit: 1,
  sameDeviceClusterSignupBlockLimit: 1,
  sameDeviceCreditSignupLimit: 1,
  sameIpSignupLimit: 4,
  sameSubnetSignupWarnLimit: 6,
  sameSubnetSignupBlockLimit: 1,
  signupRiskBlockThreshold: 240,
  loginRiskBlockThreshold: 360,
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
  blockOnMissingEmailNs: false,
  blockOnDnsLookupError: false,
  blockOnIdentityMutator: true,
  identitySimilarityThreshold: 0.9,
  identitySimilarityLookbackDays: 90,
  blockOnClockSkew: false,
  blockOnTimezoneMismatch: false,
  clockSkewToleranceMs: 10 * 60 * 1000,
  timezoneOffsetToleranceMinutes: 90,
  blockOnParamPollution: true,
  blockOnControlCharacters: true,
  blockOnSessionLockMismatch: false,
  blockOnConsoleInspection: false,
  devtoolsOpenSampleLimit: 2,
  blockOnMimeSpoof: true,
  blockOnRequestReplay: true,
  requestTtlMs: 10 * 60 * 1000,
  requestFutureToleranceMs: 90 * 1000,
  reverseDnsTimeoutMs: 650,
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
    pastedInput: 18,
    fastPastedSubmission: 45,
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
    requestReplay: 95,
    multipleSignupDevice: 85,
    multipleSignupDeviceCluster: 120,
    adminDeviceSignup: 180,
    existingUserDeviceSignup: 130,
    signupCreditReuse: 150,
    multipleSignupIp: 110,
    multipleSignupSubnet: 75
  },
  ipReputation: {
    url: process.env.TSECURITY_IP_REPUTATION_URL || '',
    token: process.env.TSECURITY_IP_REPUTATION_TOKEN || '',
    timeoutMs: Number(process.env.TSECURITY_IP_REPUTATION_TIMEOUT_MS || 2200),
    fallbackIpApi: process.env.TSECURITY_IP_API_FALLBACK !== 'false'
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

const modePreset = (mode) => {
  switch (String(mode || '').toLowerCase()) {
    case 'relaxed':
      return {
        mode: 'relaxed',
        blockOnSignupAvailability: false,
        blockOnLogin: false,
        blockKnownUsersOnLogin: false,
        bindTicketToSubnet: false,
        blockOnMultipleAccount: true,
        blockOnSignupCreditReuse: false,
        blockOnSameDeviceSignup: true,
        blockOnSameSubnetSignup: false,
        blockOnAdminDeviceSignup: true,
        sameDeviceSignupBlockLimit: 1,
        sameDeviceClusterSignupBlockLimit: 2,
        sameIpSignupLimit: 8,
        sameSubnetSignupWarnLimit: 12,
        sameSubnetSignupBlockLimit: 4,
        signupRiskBlockThreshold: 320,
        loginRiskBlockThreshold: 500,
        blockOnHosting: false,
        blockOnMissingEmailMx: false,
        blockOnMissingEmailNs: false,
        blockOnIdentityMutator: false,
        blockOnClockSkew: false,
        blockOnTimezoneMismatch: false,
        blockOnSessionLockMismatch: false,
        blockOnConsoleInspection: false,
        humanVelocityMinMs: 700,
        subnetSignupLimit: 12
      };
    case 'aggressive':
      return {
        mode: 'aggressive',
        blockOnSignupAvailability: false,
        blockOnLogin: true,
        blockKnownUsersOnLogin: false,
        bindTicketToSubnet: true,
        blockOnMultipleAccount: true,
        blockOnSignupCreditReuse: true,
        blockOnSameDeviceSignup: true,
        blockOnSameSubnetSignup: true,
        blockOnAdminDeviceSignup: true,
        sameDeviceSignupBlockLimit: 1,
        sameDeviceClusterSignupBlockLimit: 1,
        sameIpSignupLimit: 3,
        sameSubnetSignupWarnLimit: 4,
        sameSubnetSignupBlockLimit: 1,
        signupRiskBlockThreshold: 160,
        loginRiskBlockThreshold: 260,
        blockOnHosting: true,
        blockOnMissingEmailMx: true,
        blockOnMissingEmailNs: true,
        blockOnIdentityMutator: true,
        blockOnClockSkew: true,
        blockOnTimezoneMismatch: true,
        blockOnSessionLockMismatch: true,
        blockOnConsoleInspection: true,
        humanVelocityMinMs: 1800,
        subnetSignupLimit: 5
      };
    case 'balanced':
    default:
      return {
        mode: 'balanced',
        blockOnSignupAvailability: false,
        blockOnLogin: false,
        blockKnownUsersOnLogin: false,
        bindTicketToSubnet: false,
        blockOnMultipleAccount: true,
        blockOnSignupCreditReuse: true,
        blockOnSameDeviceSignup: true,
        blockOnSameSubnetSignup: true,
        blockOnAdminDeviceSignup: true,
        sameDeviceSignupBlockLimit: 1,
        sameDeviceClusterSignupBlockLimit: 1,
        sameIpSignupLimit: 4,
        sameSubnetSignupWarnLimit: 6,
        sameSubnetSignupBlockLimit: 1,
        signupRiskBlockThreshold: 240,
        loginRiskBlockThreshold: 360,
        blockOnHosting: true,
        blockOnMissingEmailMx: true,
        blockOnMissingEmailNs: false,
        blockOnIdentityMutator: true,
        blockOnClockSkew: false,
        blockOnTimezoneMismatch: false,
        blockOnSessionLockMismatch: false,
        blockOnConsoleInspection: false,
        humanVelocityMinMs: 1000,
        subnetSignupLimit: 8
      };
  }
};

const preservedPolicyKeys = [
  'enabled',
  'mode',
  'adminBypass',
  'hideBlockReasonFromUsers',
  'blockOnSignupAvailability',
  'blockOnLogin',
  'blockKnownUsersOnLogin',
  'bindTicketToSubnet',
  'blockOnMultipleAccount',
  'blockOnSignupCreditReuse',
  'blockOnSameDeviceSignup',
  'blockOnSameSubnetSignup',
  'blockOnAdminDeviceSignup',
  'cooldownDays',
  'sameDeviceSignupBlockLimit',
  'sameDeviceClusterSignupBlockLimit',
  'sameSubnetSignupBlockLimit',
  'signupRiskBlockThreshold',
  'loginRiskBlockThreshold',
  'gatewayTicketTtlSeconds',
  'requestTtlMs'
];

const pickPolicyKeys = (value = {}) => preservedPolicyKeys.reduce((picked, key) => {
  if (Object.prototype.hasOwnProperty.call(value, key)) picked[key] = value[key];
  return picked;
}, {});

const applyModePreset = (policy, rawValue = {}) => mergePolicy(
  mergePolicy(policy, modePreset(policy.mode)),
  pickPolicyKeys(rawValue)
);

export const getTSecurityPolicy = async (prisma) => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT "value"
    FROM "SystemSetting"
    WHERE "scope" = 'platform' AND "scopeId" = '' AND "key" = 'tSecurity'
    LIMIT 1
  `).catch(() => []);
  const value = rows?.[0]?.value && typeof rows[0].value === 'object' ? rows[0].value : {};
  return applyModePreset(mergePolicy(DEFAULT_POLICY, value), value);
};

export const upsertTSecurityPolicy = async (prisma, value = {}) => {
  const policy = applyModePreset(mergePolicy(DEFAULT_POLICY, value), value);
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
