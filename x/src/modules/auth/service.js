import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { createToken } from '../../core/auth.js';
import { normalizeEmail, removeUndefined, toApi } from '../../core/format.js';
import { AppError } from '../../core/errors.js';
import { writeAudit } from '../../core/audit.js';
import { getAccountCreditPolicy } from '../../core/settings.js';
import { isProfileInputComplete, profileCompletionData } from '../../core/profile.js';
import { appOrigin, cta, paragraph, sendTiwloEmail } from '../../core/email.js';
import { consumeSensitivePayload, recordAuthDeviceSession } from '../../../../tSecurity/index.js';
import { hashValue, normalizeIp } from '../../../../tSecurity/utils.js';
import {
  attachWhatsAppState,
  createPasswordResetOtpChallenge,
  createSignupOtpChallenge,
  isWhatsAppEnabled,
  normalizeWhatsAppPhone,
  resendPasswordResetOtpChallenge,
  sendSecurityWhatsApp,
  signupAvailability,
  verifyPasswordResetOtpChallenge,
  verifyOtpChallenge
} from '../whatsapp/service.js';

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function addHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function addDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

const PASSWORD_RESET_EMAIL_PREFIX = 'email_reset_';
const PASSWORD_RESET_OTP_TTL_MS = 10 * 60 * 1000;
const PASSWORD_RESET_OTP_RESEND_MS = 60 * 1000;
const PASSWORD_RESET_OTP_MAX_ATTEMPTS = 6;

const passwordResetOtpHash = (challengeId, code) => crypto
  .createHmac('sha256', process.env.JWT_SECRET || 'dev-secret')
  .update(`${challengeId}:${String(code || '').trim()}`)
  .digest('hex');

const passwordResetOtpCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');
const resetJson = (value) => JSON.stringify(value ?? {});

const maskEmailAddress = (value = '') => {
  const [local = '', domain = ''] = String(value || '').trim().split('@');
  if (!local || !domain) return 'your email address';
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(3, local.length - 1))}@${domain}`;
};

const maskWhatsAppNumber = (value = '') => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 5) return 'your WhatsApp number';
  return `+${digits.slice(0, Math.min(3, digits.length - 4))}${'*'.repeat(Math.max(3, digits.length - 7))}${digits.slice(-4)}`;
};

const ensurePasswordResetEmailOtpSchema = async (prisma) => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PasswordResetOtpChallenge" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "channel" TEXT NOT NULL,
      "destination" TEXT NOT NULL,
      "codeHash" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "attempts" INTEGER NOT NULL DEFAULT 0,
      "delivery" JSONB DEFAULT '{}'::jsonb,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "resendAvailableAt" TIMESTAMP(3) NOT NULL,
      "verifiedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PasswordResetOtpChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "PasswordResetOtpChallenge_userId_channel_status_idx" ON "PasswordResetOtpChallenge" ("userId", "channel", "status")');
};

const getPasswordResetEmailChallenge = async (prisma, challengeId) => {
  await ensurePasswordResetEmailOtpSchema(prisma);
  const rows = await prisma.$queryRawUnsafe('SELECT * FROM "PasswordResetOtpChallenge" WHERE "id" = $1 LIMIT 1', challengeId);
  return toApi(rows?.[0] || null);
};

const sendPasswordResetEmailOtp = async (ctx, user, code) => {
  const result = await sendTiwloEmail(ctx, {
    to: user.email,
    subject: 'Your Tiwlo password reset code',
    title: 'Reset your password',
    preview: `Your Tiwlo password reset code is ${code}`,
    text: `Your Tiwlo password reset code is ${code}. This code expires in 10 minutes.`,
    html: [
      paragraph(`Hi ${user.name || 'there'},`),
      paragraph('Use this code to reset your Tiwlo password.'),
      `<div style="margin:22px 0;padding:16px 20px;border-radius:10px;background:#eef4ff;border:1px solid #cfe0ff;font-size:28px;letter-spacing:6px;font-weight:800;text-align:center;color:#0b63f6;">${code}</div>`,
      paragraph('This code expires in 10 minutes. If you did not request it, you can safely ignore this email.')
    ].join('')
  });
  if (!result?.sent) {
    throw new AppError(`Password reset email could not be sent. ${result?.message || result?.reason || 'Check SMTP delivery.'}`, 'EMAIL_SEND_FAILED');
  }
  return { sent: true, status: 'accepted', messageId: result.messageId || null };
};

const emailResetPayload = (challenge, delivery = {}) => ({
  ok: true,
  challengeId: challenge.id,
  channel: 'email',
  destination: maskEmailAddress(challenge.destination),
  expiresAt: new Date(challenge.expiresAt).toISOString(),
  resendAvailableAt: new Date(challenge.resendAvailableAt).toISOString(),
  deliveryId: delivery.messageId || null,
  deliveryStatus: delivery.status || 'sent',
  message: 'A 6 digit password reset code was sent to your email.'
});

const createPasswordResetEmailChallenge = async (ctx, user) => {
  await ensurePasswordResetEmailOtpSchema(ctx.prisma);
  const recentRows = await ctx.prisma.$queryRawUnsafe(`
    SELECT * FROM "PasswordResetOtpChallenge"
    WHERE "userId" = $1 AND "channel" = 'email' AND "status" = 'pending'
    ORDER BY "createdAt" DESC LIMIT 1
  `, user.id);
  const recent = toApi(recentRows?.[0] || null);
  if (recent?.resendAvailableAt && new Date(recent.resendAvailableAt).getTime() > Date.now()) {
    throw new AppError('Please wait 60 seconds before sending another email code.', 'BAD_USER_INPUT');
  }

  await ctx.prisma.$executeRawUnsafe(`
    UPDATE "PasswordResetOtpChallenge"
    SET "status" = 'superseded', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "userId" = $1 AND "channel" = 'email' AND "status" = 'pending'
  `, user.id);

  const id = `${PASSWORD_RESET_EMAIL_PREFIX}${crypto.randomUUID()}`;
  const code = passwordResetOtpCode();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_OTP_TTL_MS);
  const resendAvailableAt = new Date(Date.now() + PASSWORD_RESET_OTP_RESEND_MS);
  await ctx.prisma.$executeRawUnsafe(`
    INSERT INTO "PasswordResetOtpChallenge" (
      "id", "userId", "channel", "destination", "codeHash", "status", "attempts",
      "expiresAt", "resendAvailableAt", "createdAt", "updatedAt"
    ) VALUES ($1, $2, 'email', $3, $4, 'pending', 0, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, id, user.id, user.email, passwordResetOtpHash(id, code), expiresAt, resendAvailableAt);

  let delivery;
  try {
    delivery = await sendPasswordResetEmailOtp(ctx, user, code);
  } catch (error) {
    await ctx.prisma.$executeRawUnsafe(`
      UPDATE "PasswordResetOtpChallenge"
      SET "status" = 'send_failed', "delivery" = CAST($2 AS jsonb), "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = $1
    `, id, resetJson({ sent: false, error: error?.message || String(error) }));
    throw error;
  }
  await ctx.prisma.$executeRawUnsafe('UPDATE "PasswordResetOtpChallenge" SET "delivery" = CAST($2 AS jsonb), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1', id, resetJson(delivery));
  return emailResetPayload({ id, destination: user.email, expiresAt, resendAvailableAt }, delivery);
};

const resendPasswordResetEmailChallenge = async (ctx, challengeId) => {
  const challenge = await getPasswordResetEmailChallenge(ctx.prisma, challengeId);
  if (!challenge || challenge.channel !== 'email') throw new AppError('Password recovery session was not found.', 'BAD_USER_INPUT');
  if (challenge.status !== 'pending') throw new AppError('This password recovery session is already closed.', 'BAD_USER_INPUT');
  if (new Date(challenge.resendAvailableAt).getTime() > Date.now()) throw new AppError('Please wait 60 seconds before sending another email code.', 'BAD_USER_INPUT');

  const user = await ctx.prisma.user.findUnique({ where: { id: challenge.userId } });
  if (!user) throw new AppError('Password recovery session is invalid.', 'BAD_USER_INPUT');
  const code = passwordResetOtpCode();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_OTP_TTL_MS);
  const resendAvailableAt = new Date(Date.now() + PASSWORD_RESET_OTP_RESEND_MS);
  await ctx.prisma.$executeRawUnsafe(`
    UPDATE "PasswordResetOtpChallenge"
    SET "codeHash" = $2, "attempts" = 0, "expiresAt" = $3, "resendAvailableAt" = $4, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = $1
  `, challenge.id, passwordResetOtpHash(challenge.id, code), expiresAt, resendAvailableAt);

  let delivery;
  try {
    delivery = await sendPasswordResetEmailOtp(ctx, user, code);
  } catch (error) {
    await ctx.prisma.$executeRawUnsafe(`
      UPDATE "PasswordResetOtpChallenge"
      SET "resendAvailableAt" = CURRENT_TIMESTAMP, "delivery" = CAST($2 AS jsonb), "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = $1
    `, challenge.id, resetJson({ sent: false, error: error?.message || String(error) }));
    throw error;
  }
  await ctx.prisma.$executeRawUnsafe('UPDATE "PasswordResetOtpChallenge" SET "delivery" = CAST($2 AS jsonb), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1', challenge.id, resetJson(delivery));
  return emailResetPayload({ ...challenge, expiresAt, resendAvailableAt }, delivery);
};

const verifyPasswordResetEmailChallenge = async (ctx, challengeId, code) => {
  const challenge = await getPasswordResetEmailChallenge(ctx.prisma, challengeId);
  if (!challenge || challenge.channel !== 'email') throw new AppError('Password recovery session was not found.', 'BAD_USER_INPUT');
  if (challenge.status !== 'pending') throw new AppError('This password recovery session is already closed.', 'BAD_USER_INPUT');
  if (new Date(challenge.expiresAt).getTime() < Date.now()) throw new AppError('Email code expired. Send a new code.', 'BAD_USER_INPUT');
  if (Number(challenge.attempts || 0) >= PASSWORD_RESET_OTP_MAX_ATTEMPTS) throw new AppError('Too many code attempts. Send a new code.', 'BAD_USER_INPUT');

  const valid = challenge.codeHash === passwordResetOtpHash(challenge.id, code);
  await ctx.prisma.$executeRawUnsafe('UPDATE "PasswordResetOtpChallenge" SET "attempts" = "attempts" + 1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1', challenge.id);
  if (!valid) throw new AppError('Incorrect email password reset code.', 'BAD_USER_INPUT');
  await ctx.prisma.$executeRawUnsafe(`
    UPDATE "PasswordResetOtpChallenge"
    SET "status" = 'verified', "verifiedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = $1
  `, challenge.id);
  return challenge;
};

const signupPromoProviders = new Set(['bkash', 'stripe', 'paypal']);

const normalizeSignupPromoProvider = (value) => {
  const provider = String(value || '').trim().toLowerCase();
  return signupPromoProviders.has(provider) ? provider : '';
};

const signupCreditData = async (ctx, input = {}) => {
  const policy = await getAccountCreditPolicy(ctx.prisma);
  const initialCredits = policy.creditSystemEnabled ? Number(policy.newAccountCredit || 0) : 0;
  if (!policy.creditSystemEnabled || !input.signupPromoOptIn || Number(policy.signupPromoCredit || 0) <= 0) {
    return { initialCredits, promo: {} };
  }
  const promoCreditAmount = Number(policy.signupPromoCredit || 0);
  if (policy.signupPromoRequiresPayment === false) {
    return {
      initialCredits: initialCredits + promoCreditAmount,
      promo: {
        promoCreditAmount,
        promoCreditExpiresAt: addDays(30),
        promoCreditStatus: 'active',
        promoCreditSource: 'signup_direct_credit',
        promoPaymentMethod: null,
        promoVerifiedAt: new Date()
      }
    };
  }
  const provider = normalizeSignupPromoProvider(input.signupPromoProvider);
  if (!provider) throw new AppError('Choose a valid payment method for free credit verification.', 'BAD_USER_INPUT');
  return {
    initialCredits,
    promo: {
      promoCreditAmount,
      promoCreditStatus: 'pending',
      promoCreditSource: 'signup_payment_verification',
      promoPaymentMethod: provider
    }
  };
};

async function sendVerificationEmail(ctx, user, token) {
  const link = `${appOrigin().replace(/\/$/, '')}/verify-email?token=${token}`;
  return sendTiwloEmail(ctx, {
    to: user.email,
    subject: 'Verify your Tiwlo email',
    title: 'Verify your email address',
    preview: 'Confirm your email to keep your Tiwlo account secure.',
    html: [
      paragraph(`Hi ${user.name || 'there'},`),
      paragraph('Please verify this email address so invoices, password resets, login alerts, and service notices can reach you.'),
      cta('Verify Email', link)
    ].join('')
  });
}

function queueAuthEmail(ctx, payload, onResult) {
  setImmediate(() => {
    sendTiwloEmail(ctx, payload)
      .then((result) => onResult?.(result))
      .catch((error) => {
        console.warn('[auth-email] send failed:', error?.message || error);
        onResult?.({ sent: false, reason: 'send-failed', message: error?.message || String(error) });
      });
  });
}

function queueVerificationEmail(ctx, user, token) {
  setImmediate(() => {
    sendVerificationEmail(ctx, user, token)
      .then(async (result) => {
        if (result?.sent) return;
        await ctx.prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerifiedAt: new Date(),
            emailVerificationToken: null,
            emailVerificationExpires: null
          }
        }).catch(() => null);
        console.warn('[auth-email] verification email skipped; user auto-verified:', result?.reason || result?.message || user.email);
      })
      .catch(async (error) => {
        await ctx.prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerifiedAt: new Date(),
            emailVerificationToken: null,
            emailVerificationExpires: null
          }
        }).catch(() => null);
        console.warn('[auth-email] verification email failed; user auto-verified:', error?.message || error);
      });
  });
}

function queueRequiredVerificationEmail(ctx, user, token) {
  setImmediate(() => {
    sendVerificationEmail(ctx, user, token)
      .then((result) => {
        if (!result?.sent) console.warn('[auth-email] required Social verification email was not sent:', result?.reason || result?.message || user.email);
      })
      .catch((error) => console.warn('[auth-email] required Social verification email failed:', error?.message || error));
  });
}

const normalizedSocialUsername = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9._]/g, '')
  .replace(/^[._]+|[._]+$/g, '')
  .slice(0, 30);

const availableSocialUsername = async (prisma, requested, email) => {
  const requestedName = normalizedSocialUsername(requested);
  const fallback = normalizedSocialUsername(String(email || '').split('@')[0]);
  const base = (requestedName.length >= 3 ? requestedName : fallback.length >= 3 ? fallback : `tiwi${crypto.randomBytes(4).toString('hex')}`).slice(0, 26);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base.slice(0, 26)}${attempt}`;
    if (!await prisma.socialProfile.findUnique({ where: { username: candidate }, select: { id: true } })) return candidate;
  }
  throw new AppError('That username is unavailable. Choose another username.', 'BAD_USER_INPUT');
};

export const login = async (ctx, input) => {
  const secure = await consumeSensitivePayload(ctx, 'login', input);
  input = secure.payload;
  const email = normalizeEmail(input.email);
  const user = await ctx.prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) throw new AppError('Invalid credentials', 'UNAUTHENTICATED');

  const validPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!validPassword) throw new AppError('Invalid credentials', 'UNAUTHENTICATED');

  const device = await recordAuthDeviceSession(ctx, user, input, 'login');
  await writeAudit({ ...ctx, user }, 'login', 'user', user.id, { email, device: device.session, unusual: device.unusual, reasons: device.reasons });
  queueAuthEmail(ctx, {
    to: user.email,
    subject: device.unusual ? 'Unusual login to your Tiwlo account' : 'New login to your Tiwlo account',
    title: device.unusual ? 'Unusual login detected' : 'New login detected',
    preview: 'Your Tiwlo account was just accessed.',
    html: [
      paragraph(`Hi ${user.name || 'there'},`),
      paragraph(`Your Tiwlo account was signed in on ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC.`),
      paragraph(`Device: ${device.session.deviceName || 'Unknown device'}. Location: ${[device.session.city, device.session.region, device.session.country].filter(Boolean).join(', ') || device.session.ipAddress || 'Unknown'}.`),
      ...(device.unusual ? [paragraph(`Security note: ${device.reasons.join(', ').replace(/_/g, ' ')}.`)] : []),
      paragraph('If this was not you, reset your password immediately from the login page.')
    ].join('')
  });
  await sendSecurityWhatsApp(
    ctx,
    user,
    device.unusual ? 'Unusual login detected' : 'New login detected',
    `Your Tiwlo account was signed in from ${device.session.deviceName || 'an unknown device'} at ${[device.session.city, device.session.region, device.session.country].filter(Boolean).join(', ') || device.session.ipAddress || 'an unknown location'}.`,
    '/settings'
  );
  return { token: createToken(user), user: toApi(user) };
};

export const signup = async (ctx, input) => {
  const secure = await consumeSensitivePayload(ctx, 'signup', input);
  input = secure.payload;
  const email = normalizeEmail(input.email);
  const existing = await ctx.prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Account already exists', 'BAD_USER_INPUT');
  if (['admin@tiwlo.app', 'admin@tiwlo.com'].includes(email)) {
    throw new AppError('Tiwlo Team accounts cannot be created from public signup', 'FORBIDDEN');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  if (!isProfileInputComplete(input)) {
    throw new AppError('Address, billing name, country, and mobile number are required to create an account.', 'BAD_USER_INPUT');
  }
  const profile = profileCompletionData(input);
  if (profile.error) throw new AppError(profile.error, 'BAD_USER_INPUT');
  const verificationToken = randomToken();
  const availability = await signupAvailability(ctx, input);
  if (!availability.emailAvailable) throw new AppError('This email address is already in use.', 'BAD_USER_INPUT');
  if (!availability.phoneAvailable) throw new AppError('This phone number is already in use.', 'BAD_USER_INPUT');
  const credit = await signupCreditData(ctx, input);
  if (!input.signupPromoOptIn && await isWhatsAppEnabled(ctx.prisma)) {
    const challenge = await createSignupOtpChallenge(ctx, input, {
      input: {
        ...input,
        password: undefined,
        email,
        mobileCountryCode: profile.data.mobileCountryCode,
        phone: profile.data.phone,
        country: profile.data.country
      },
      profile: profile.data,
      passwordHash,
      verificationToken,
      promo: credit.promo,
      initialCredits: credit.initialCredits
    });
    return {
      ok: true,
      requiresWhatsAppOtp: true,
      ...challenge,
      token: null,
      user: null,
      message: 'A 6 digit WhatsApp OTP was sent to your signup mobile number.'
    };
  }
  const user = await ctx.prisma.user.create({
    data: {
      email,
      passwordHash,
      name: input.name,
      role: 'user',
      emailVerifiedAt: null,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: addHours(48),
      credits: credit.initialCredits,
      ...credit.promo,
      ...profile.data
    }
  });

  const device = await recordAuthDeviceSession(ctx, user, input, 'signup');
  await writeAudit({ ...ctx, user }, 'signup', 'user', user.id, { email, device: device.session });
  queueVerificationEmail(ctx, user, verificationToken);
  return { ok: true, requiresWhatsAppOtp: false, token: createToken(user), user: toApi(user), message: 'Account created.' };
};

export const socialAppSignup = async (ctx, input = {}) => {
  const email = normalizeEmail(input.email);
  const name = String(input.name || '').trim().slice(0, 120);
  const password = String(input.password || '');
  const deviceFingerprint = String(input.deviceFingerprint || '').trim().toLowerCase();
  if (!name || name.length < 2) throw new AppError('Enter your full name.', 'BAD_USER_INPUT');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('Enter a valid email address.', 'BAD_USER_INPUT');
  if (password.length < 8) throw new AppError('Password must contain at least 8 characters.', 'BAD_USER_INPUT');
  if (!/^[a-f0-9]{64}$/.test(deviceFingerprint)) throw new AppError('This Android device could not be verified.', 'BAD_USER_INPUT');
  if (['admin@tiwlo.app', 'admin@tiwlo.com'].includes(email)) throw new AppError('Tiwlo Team accounts cannot be created from the Social app.', 'FORBIDDEN');
  if (await ctx.prisma.user.findUnique({ where: { email }, select: { id: true } })) throw new AppError('Account already exists. Sign in instead.', 'BAD_USER_INPUT');

  const ipAddress = normalizeIp(ctx.requestIp || '');
  const fingerprintHash = hashValue(`auth-device:${deviceFingerprint}`);
  const duplicateSession = await ctx.prisma.userDeviceSession.findFirst({
    where: {
      OR: [
        { fingerprintHash },
        ...(ipAddress ? [{ ipAddress }] : [])
      ]
    },
    include: { user: { select: { id: true, email: true, status: true } } },
    orderBy: { lastSeenAt: 'desc' }
  }).catch(() => null);
  const duplicateAccount = Boolean(duplicateSession?.userId);
  const username = await availableSocialUsername(ctx.prisma, input.username, email);
  const verificationToken = randomToken();
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await ctx.prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role: 'user',
      status: duplicateAccount ? 'disabled' : 'active',
      signupSource: 'social_app',
      credits: 0,
      emailVerifiedAt: null,
      emailVerificationToken: duplicateAccount ? null : verificationToken,
      emailVerificationExpires: duplicateAccount ? null : addHours(48),
      socialProfile: { create: { username } }
    }
  });
  const deviceInput = { deviceFingerprint, deviceMetadata: input.deviceMetadata || {} };
  const device = await recordAuthDeviceSession(ctx, user, deviceInput, 'social_app_signup');
  await writeAudit({ ...ctx, user }, duplicateAccount ? 'social_app_signup_disabled' : 'social_app_signup', 'user', user.id, {
    email,
    signupSource: 'social_app',
    freeCredit: false,
    duplicateDeviceOrIp: duplicateAccount,
    matchedUserId: duplicateSession?.userId || null,
    device: device.session
  });
  if (duplicateAccount) {
    return {
      ok: false,
      requiresWhatsAppOtp: false,
      requiresEmailVerification: false,
      token: createToken(user),
      user: toApi(user),
      message: 'Only one Social account is allowed per device and IP. This account has been disabled.'
    };
  }
  queueRequiredVerificationEmail(ctx, user, verificationToken);
  return {
    ok: true,
    requiresWhatsAppOtp: false,
    requiresEmailVerification: true,
    token: createToken(user),
    user: toApi(user),
    message: 'Account created without free credit. Verify your email to open Tiwi Social.'
  };
};

export const verifySignupWhatsAppOtp = async (ctx, challengeId, code) => {
  const challenge = await verifyOtpChallenge(ctx, challengeId, code, 'signup');
  const payload = challenge.payload || {};
  const input = payload.input || {};
  const profile = payload.profile || profileCompletionData(input).data;
  const email = normalizeEmail(input.email || challenge.email);
  if (!email || !payload.passwordHash) throw new AppError('Signup session is incomplete. Start signup again.', 'BAD_USER_INPUT');
  const availability = await signupAvailability(ctx, {
    email,
    phone: profile.phone || challenge.phone,
    mobileCountryCode: profile.mobileCountryCode || challenge.mobileCountryCode,
    country: profile.country || challenge.country
  });
  if (!availability.emailAvailable) throw new AppError('This email address is already in use.', 'BAD_USER_INPUT');
  if (!availability.phoneAvailable) throw new AppError('This phone number is already in use.', 'BAD_USER_INPUT');

  const emailVerificationToken = payload.verificationToken || randomToken();
  const promo = payload.promo || {};
  const initialCredits = Number(payload.initialCredits ?? 0);
  const user = await ctx.prisma.user.create({
    data: {
      email,
      passwordHash: payload.passwordHash,
      name: input.name,
      credits: initialCredits,
      role: 'user',
      emailVerifiedAt: null,
      emailVerificationToken,
      emailVerificationExpires: addHours(48),
      ...promo,
      ...profile
    }
  });
  const normalizedPhone = normalizeWhatsAppPhone(profile);
  await ctx.prisma.$executeRawUnsafe(`
    UPDATE "User"
    SET "whatsappVerifiedAt" = CURRENT_TIMESTAMP,
        "whatsappVerifiedPhone" = $2,
        "whatsappLastOtpSentAt" = CURRENT_TIMESTAMP,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = $1
  `, user.id, normalizedPhone.phoneE164 || challenge.phoneE164);

  const device = await recordAuthDeviceSession(ctx, user, input, 'signup');
  await writeAudit({ ...ctx, user }, 'signup', 'user', user.id, { email, device: device.session, whatsappVerified: true });
  queueVerificationEmail(ctx, user, emailVerificationToken);
  const enriched = await attachWhatsAppState(ctx.prisma, user);
  return { token: createToken(enriched), user: toApi(enriched) };
};

export const updateProfile = async (ctx, actor, input) => {
  const id = input.id || actor.id;
  const profileFields = ['phone', 'mobileCountryCode', 'country', 'addressLine1', 'city', 'state', 'postalCode', 'billingName'];
  const hasProfileInput = profileFields.some((field) => input[field] !== undefined);
  let profileData = {};
  if (hasProfileInput) {
    if (!isProfileInputComplete(input)) {
      throw new AppError('Address, billing name, country, and mobile number are required before dashboard access is unlocked.', 'BAD_USER_INPUT');
    }
    const profile = profileCompletionData(input);
    if (profile.error) throw new AppError(profile.error, 'BAD_USER_INPUT');
    profileData = profile.data;
  }
  const user = await ctx.prisma.user.update({
    where: { id },
    data: removeUndefined({
      name: input.name,
      primaryRegion: input.primaryRegion,
      avatar: input.avatar,
      ...profileData
    })
  });
  await writeAudit(ctx, 'update_profile', 'user', user.id, { fields: Object.keys(removeUndefined(input)) });
  return toApi(user);
};

export const verifyPassword = async (ctx, actor, password) => {
  if (!actor.passwordHash) throw new AppError('Password verification is not available for this account', 'BAD_USER_INPUT');
  const validPassword = await bcrypt.compare(password, actor.passwordHash);
  if (!validPassword) throw new AppError('Incorrect password', 'UNAUTHENTICATED');

  await writeAudit(ctx, 'verify_password', 'user', actor.id, { purpose: 'sensitive_action' });
  return true;
};

const findPasswordResetUser = async (ctx, input = {}) => {
  const identifier = typeof input === 'string' ? input : (input.identifier || input.email || input.phone || '');
  const email = String(identifier || '').includes('@') ? normalizeEmail(identifier) : normalizeEmail(input.email || '');
  if (email) {
    const user = await ctx.prisma.user.findUnique({ where: { email } }).catch(() => null);
    if (user) return { user, channel: 'email', auditIdentifier: email };
    return { user: null, channel: 'email', auditIdentifier: email };
  }

  const phoneInput = typeof input === 'string' ? identifier : (input.phone || identifier);
  const target = normalizeWhatsAppPhone({
    phone: phoneInput,
    mobileCountryCode: input.mobileCountryCode,
    country: input.country
  }).phoneE164;
  if (!target) return { user: null, channel: 'whatsapp', auditIdentifier: identifier };

  const users = await ctx.prisma.$queryRawUnsafe(`
    SELECT "id", "email", "passwordHash", "name", "phone", "mobileCountryCode", "country", "whatsappVerifiedPhone"
    FROM "User"
    WHERE "phone" IS NOT NULL OR "whatsappVerifiedPhone" IS NOT NULL
  `).catch(() => []);
  const user = toApi(users || []).find((candidate) => {
    if (candidate.whatsappVerifiedPhone === target) return true;
    return normalizeWhatsAppPhone({
      phone: candidate.phone,
      mobileCountryCode: candidate.mobileCountryCode,
      country: candidate.country
    }).phoneE164 === target;
  }) || null;
  return {
    user,
    channel: 'whatsapp',
    auditIdentifier: target,
    phoneInput: {
      phone: target,
      mobileCountryCode: input.mobileCountryCode,
      country: input.country
    }
  };
};

export const startPasswordResetOtp = async (ctx, input) => {
  const { user, channel, auditIdentifier, phoneInput } = await findPasswordResetUser(ctx, input);
  if (!user) {
    throw new AppError('No Tiwlo account matches that email address or mobile number.', 'BAD_USER_INPUT');
  }

  const challenge = channel === 'email'
    ? await createPasswordResetEmailChallenge(ctx, user)
    : await createPasswordResetOtpChallenge(ctx, user, phoneInput);
  const response = channel === 'email' ? challenge : {
    ...challenge,
    channel: 'whatsapp',
    destination: maskWhatsAppNumber(challenge.phoneE164)
  };
  await writeAudit({ ...ctx, user }, 'request_password_reset_otp', 'user', user.id, {
    channel,
    identifier: auditIdentifier,
    challengeId: response.challengeId,
    deliveryId: response.deliveryId,
    deliveryStatus: response.deliveryStatus
  });
  return response;
};

export const resendPasswordResetOtp = async (ctx, challengeId) => {
  if (String(challengeId || '').startsWith(PASSWORD_RESET_EMAIL_PREFIX)) {
    return resendPasswordResetEmailChallenge(ctx, challengeId);
  }
  const challenge = await resendPasswordResetOtpChallenge(ctx, challengeId);
  return {
    ...challenge,
    channel: 'whatsapp',
    destination: maskWhatsAppNumber(challenge.phoneE164)
  };
};

export const verifyPasswordResetOtp = async (ctx, challengeId, code) => {
  const channel = String(challengeId || '').startsWith(PASSWORD_RESET_EMAIL_PREFIX) ? 'email' : 'whatsapp';
  const challenge = channel === 'email'
    ? await verifyPasswordResetEmailChallenge(ctx, challengeId, code)
    : await verifyPasswordResetOtpChallenge(ctx, challengeId, code);
  if (!challenge.userId) {
    throw new AppError('Password recovery session is invalid.', 'BAD_USER_INPUT');
  }

  const user = await ctx.prisma.user.findUnique({ where: { id: challenge.userId } });
  if (!user) throw new AppError('Password recovery session is invalid.', 'BAD_USER_INPUT');

  const resetToken = randomToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await ctx.prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: tokenHash(resetToken),
      passwordResetExpires: expiresAt
    }
  });
  await writeAudit({ ...ctx, user }, 'verify_password_reset_otp', 'user', user.id, {
    challengeId: challenge.id,
    channel
  });

  return {
    ok: true,
    resetToken,
    expiresAt: expiresAt.toISOString(),
    message: `${channel === 'email' ? 'Email' : 'WhatsApp'} code verified. Choose a new password now.`
  };
};

export const resetPassword = async (ctx, token, password) => {
  if (!token || !password || password.length < 6) {
    throw new AppError('A reset token and a password of at least 6 characters are required.', 'BAD_USER_INPUT');
  }
  const user = await ctx.prisma.user.findFirst({
    where: {
      passwordResetTokenHash: tokenHash(token),
      passwordResetExpires: { gt: new Date() }
    }
  });
  if (!user) throw new AppError('Password reset link is invalid or expired.', 'BAD_USER_INPUT');
  const updated = await ctx.prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      passwordResetTokenHash: null,
      passwordResetExpires: null
    }
  });
  await writeAudit({ ...ctx, user: updated }, 'reset_password', 'user', updated.id, {});
  queueAuthEmail(ctx, {
    to: updated.email,
    subject: 'Your Tiwlo password was changed',
    title: 'Password changed',
    preview: 'Your Tiwlo password was updated successfully.',
    html: paragraph('Your password was changed successfully. If this was not you, contact support immediately.')
  });
  await sendSecurityWhatsApp(ctx, updated, 'Password changed', 'Your Tiwlo password was changed. If this was not you, contact support immediately.', '/settings');
  return { token: createToken(updated), user: toApi(updated) };
};

export const resendEmailVerification = async (ctx, actor) => {
  if (actor.emailVerifiedAt) return true;
  const token = randomToken();
  const user = await ctx.prisma.user.update({
    where: { id: actor.id },
    data: {
      emailVerificationToken: token,
      emailVerificationExpires: addHours(48)
    }
  });
  if (user.signupSource === 'social_app') queueRequiredVerificationEmail(ctx, user, token);
  else queueVerificationEmail(ctx, user, token);
  return true;
};

export const verifyEmail = async (ctx, token) => {
  if (!token) throw new AppError('Verification token is required.', 'BAD_USER_INPUT');
  const user = await ctx.prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerificationExpires: { gt: new Date() }
    }
  });
  if (!user) throw new AppError('Email verification link is invalid or expired.', 'BAD_USER_INPUT');
  const updated = await ctx.prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpires: null
    }
  });
  await writeAudit({ ...ctx, user: updated }, 'verify_email', 'user', updated.id, {});
  return { token: createToken(updated), user: toApi(updated) };
};
