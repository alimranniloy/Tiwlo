import { clean, normalizeEmail, normalizePhone } from '../utils.js';
import { buildDeviceClusterHash } from './deviceFingerprint.js';

const formFromPayload = (payload = {}) => payload.form && typeof payload.form === 'object' ? payload.form : payload;

const promoSummary = (user = {}) => ({
  promoCreditAmount: Number(user.promoCreditAmount || 0),
  promoCreditStatus: clean(user.promoCreditStatus),
  promoCreditSource: clean(user.promoCreditSource),
  promoVerifiedAt: user.promoVerifiedAt || null
});

const hasPromoCredit = (user = {}) => Number(user.promoCreditAmount || 0) > 0 || Boolean(clean(user.promoCreditSource));

const findPhoneOwner = async (prisma, phoneE164) => {
  if (!phoneE164) return null;
  const rows = await prisma.$queryRawUnsafe(`
    SELECT "id", "email", "phone", "mobileCountryCode", "country", "whatsappVerifiedPhone",
           "promoCreditAmount", "promoCreditStatus", "promoCreditSource", "promoVerifiedAt", "createdAt"
    FROM "User"
    WHERE "phone" IS NOT NULL OR "whatsappVerifiedPhone" IS NOT NULL
    ORDER BY "createdAt" DESC
    LIMIT 1000
  `).catch(() => []);
  return (rows || []).find((user) => {
    if (user.whatsappVerifiedPhone === phoneE164) return true;
    return normalizePhone({
      phone: user.phone,
      mobileCountryCode: user.mobileCountryCode
    }) === phoneE164;
  }) || null;
};

const recentSignupCounts = async (prisma, context = {}, policy = {}) => {
  const lookbackDays = Number(policy.accountAbuseLookbackDays || policy.cooldownDays || 90);
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      COUNT(*) FILTER (WHERE $2 <> '' AND "deviceHash" = $2)::int AS "deviceCount",
      COUNT(*) FILTER (WHERE $3 <> '' AND "ipAddress" = $3)::int AS "ipCount",
      COUNT(*) FILTER (WHERE $4 <> '' AND "ipSubnet" = $4)::int AS "subnetCount",
      COUNT(*) FILTER (WHERE $5 <> '' AND COALESCE("metadata"->>'deviceClusterHash', '') = $5)::int AS "deviceClusterCount"
    FROM "TSecurityGatewayTicket"
    WHERE "action" = 'signup'
      AND "verdict" = 'allow'
      AND "usedAt" IS NOT NULL
      AND "createdAt" > CURRENT_TIMESTAMP - ($1::int * INTERVAL '1 day')
  `, lookbackDays, clean(context.deviceHash), clean(context.ipAddress), clean(context.ipSubnet), clean(context.deviceClusterHash)).catch(() => []);
  return rows?.[0] || { deviceCount: 0, ipCount: 0, subnetCount: 0, deviceClusterCount: 0 };
};

const findExistingDeviceOwner = async (prisma, context = {}) => {
  const deviceHash = clean(context.deviceHash);
  const deviceClusterHash = clean(context.deviceClusterHash);
  if (!deviceHash && !deviceClusterHash) return null;
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      s."id" AS "sessionId",
      s."fingerprintHash",
      s."metadata",
      s."lastSeenAt",
      u."id" AS "userId",
      u."email",
      u."role"
    FROM "UserDeviceSession" s
    JOIN "User" u ON u."id" = s."userId"
    ORDER BY s."lastSeenAt" DESC
    LIMIT 500
  `).catch(() => []);

  const matches = (rows || []).filter((session) => {
    const metadata = session.metadata && typeof session.metadata === 'object' ? session.metadata : {};
    const storedDeviceHash = clean(metadata.gatewayDeviceHash);
    const storedClusterHash = clean(metadata.deviceClusterHash) || buildDeviceClusterHash(metadata);
    if (deviceHash && (storedDeviceHash === deviceHash || clean(session.fingerprintHash) === deviceHash)) return true;
    return Boolean(deviceClusterHash && storedClusterHash === deviceClusterHash);
  });
  return matches.find((session) => ['admin', 'super_admin'].includes(clean(session.role).toLowerCase()))
    || matches[0]
    || null;
};

export const accountAbuseCheck = async ({ prisma, action, payload = {}, context = {}, policy = {} }) => {
  const signals = [];
  if (!['signup', 'signupAvailability'].includes(action) || !prisma?.$queryRawUnsafe) {
    return { passed: true, score: 0, signals };
  }

  const form = formFromPayload(payload);
  const email = normalizeEmail(form.email || payload.email);
  const phone = normalizePhone({
    phone: form.phone || payload.phone,
    mobileCountryCode: form.mobileCountryCode || payload.mobileCountryCode
  });
  const promoRequested = form.signupPromoOptIn === true || payload.signupPromoOptIn === true;

  const [emailOwner, phoneOwner, counts, existingDeviceOwner] = await Promise.all([
    email
      ? prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          promoCreditAmount: true,
          promoCreditStatus: true,
          promoCreditSource: true,
          promoVerifiedAt: true,
          createdAt: true
        }
      }).catch(() => null)
      : null,
    findPhoneOwner(prisma, phone),
    recentSignupCounts(prisma, context, policy),
    findExistingDeviceOwner(prisma, context)
  ]);
  const existingDeviceOwnerRole = clean(existingDeviceOwner?.role).toLowerCase();
  const adminDeviceOwner = ['admin', 'super_admin'].includes(existingDeviceOwnerRole) ? existingDeviceOwner : null;

  if (adminDeviceOwner) {
    signals.push({
      key: 'admin_device_public_signup',
      label: 'Administrator device attempted public signup',
      score: policy.weights?.adminDeviceSignup || 180,
      block: policy.blockOnAdminDeviceSignup !== false,
      reason: 'Admin Device Used For Public Signup',
      existingUserId: adminDeviceOwner.userId,
      existingEmail: adminDeviceOwner.email,
      existingRole: adminDeviceOwner.role,
      previousSessionAt: adminDeviceOwner.lastSeenAt
    });
  } else if (existingDeviceOwner) {
    signals.push({
      key: 'existing_user_device_public_signup',
      label: 'Existing account device attempted another public signup',
      score: policy.weights?.existingUserDeviceSignup || 130,
      block: policy.blockOnSameDeviceSignup !== false,
      reason: 'Existing Device Account Reused',
      existingUserId: existingDeviceOwner.userId,
      existingEmail: existingDeviceOwner.email,
      existingRole: existingDeviceOwner.role,
      previousSessionAt: existingDeviceOwner.lastSeenAt
    });
  }

  if (emailOwner) {
    signals.push({
      key: 'existing_account_email',
      label: 'Signup email already belongs to an account',
      score: 120,
      block: policy.blockOnMultipleAccount !== false,
      reason: hasPromoCredit(emailOwner) ? 'Previous Signup Credit Account Reused' : 'Existing Account Email Reused',
      existingUserId: emailOwner.id,
      existingEmail: emailOwner.email,
      credit: promoSummary(emailOwner)
    });
  }

  if (phoneOwner) {
    signals.push({
      key: 'existing_account_phone',
      label: 'Signup phone number already belongs to an account',
      score: 125,
      block: policy.blockOnMultipleAccount !== false,
      reason: hasPromoCredit(phoneOwner) ? 'Previous Signup Credit Phone Reused' : 'Existing Account Phone Reused',
      existingUserId: phoneOwner.id,
      existingEmail: phoneOwner.email,
      credit: promoSummary(phoneOwner)
    });
  }

  const deviceCount = Number(counts.deviceCount || 0);
  const deviceClusterCount = Number(counts.deviceClusterCount || 0);
  const ipCount = Number(counts.ipCount || 0);
  const subnetCount = Number(counts.subnetCount || 0);
  const deviceWarnLimit = Number(policy.sameDeviceSignupWarnLimit || 1);
  const deviceBlockLimit = Number(policy.sameDeviceSignupBlockLimit || deviceWarnLimit);
  const deviceSignalLimit = Math.min(deviceWarnLimit, deviceBlockLimit || deviceWarnLimit);
  if (deviceCount >= deviceSignalLimit) {
    signals.push({
      key: 'multiple_signup_same_device',
      label: 'This device has already completed signup recently',
      score: policy.weights?.multipleSignupDevice || 85,
      block: policy.blockOnSameDeviceSignup !== false && deviceBlockLimit > 0 && deviceCount >= deviceBlockLimit,
      reason: 'Multiple Signup Device Pattern',
      deviceSignupCount: deviceCount
    });
  }

  if (deviceClusterCount >= Number(policy.sameDeviceClusterSignupBlockLimit || 1)) {
    signals.push({
      key: 'multiple_signup_same_device_cluster',
      label: 'This physical device profile has already started signup recently',
      score: policy.weights?.multipleSignupDeviceCluster || 120,
      block: policy.blockOnSameDeviceSignup !== false,
      reason: 'Multiple Signup Device Pattern',
      deviceClusterSignupCount: deviceClusterCount
    });
  }

  if (promoRequested && deviceCount >= Number(policy.sameDeviceCreditSignupLimit || 1)) {
    signals.push({
      key: 'signup_credit_reuse_device',
      label: 'Signup credit requested from a device that already completed signup',
      score: policy.weights?.signupCreditReuse || 150,
      block: policy.blockOnSignupCreditReuse !== false,
      reason: 'Signup Credit Reuse Attempt',
      deviceSignupCount: deviceCount
    });
  }

  if (ipCount >= Number(policy.sameIpSignupLimit || 4)) {
    signals.push({
      key: 'multiple_signup_same_ip',
      label: 'Multiple completed signups from the same IP',
      score: policy.weights?.multipleSignupIp || 110,
      block: policy.blockOnMultipleAccount !== false,
      reason: 'Multiple Accounts from Same IP',
      ipSignupCount: ipCount
    });
  }

  const subnetWarnLimit = Number(policy.sameSubnetSignupWarnLimit || 6);
  const subnetBlockLimit = Number(policy.sameSubnetSignupBlockLimit || 0);
  const subnetSignalLimit = subnetBlockLimit > 0 ? Math.min(subnetWarnLimit, subnetBlockLimit) : subnetWarnLimit;
  if (subnetCount >= subnetSignalLimit) {
    signals.push({
      key: 'multiple_signup_same_subnet',
      label: 'Multiple completed signups from the same subnet',
      score: policy.weights?.multipleSignupSubnet || 75,
      block: policy.blockOnSameSubnetSignup !== false && subnetBlockLimit > 0 && subnetCount >= subnetBlockLimit,
      reason: 'Multiple Accounts from Same Subnet',
      subnetSignupCount: subnetCount
    });
  }

  return {
    passed: !signals.some((signal) => signal.block),
    score: signals.reduce((total, signal) => total + Number(signal.score || 0), 0),
    signals
  };
};
