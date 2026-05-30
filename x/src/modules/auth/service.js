import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { createToken } from '../../core/auth.js';
import { normalizeEmail, removeUndefined, toApi } from '../../core/format.js';
import { AppError } from '../../core/errors.js';
import { writeAudit } from '../../core/audit.js';
import { getNewAccountCredit } from '../../core/settings.js';
import { isProfileInputComplete, profileCompletionData } from '../../core/profile.js';
import { appOrigin, cta, paragraph, sendTiwloEmail } from '../../core/email.js';
import { recordAuthDeviceSession } from './deviceSecurity.js';

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function addHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

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

export const login = async (ctx, input) => {
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
  return { token: createToken(user), user: toApi(user) };
};

export const signup = async (ctx, input) => {
  const email = normalizeEmail(input.email);
  const existing = await ctx.prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Account already exists', 'BAD_USER_INPUT');
  if (['admin@tiwlo.app', 'admin@tiwlo.com'].includes(email)) {
    throw new AppError('Administrator accounts cannot be created from public signup', 'FORBIDDEN');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const newAccountCredit = await getNewAccountCredit(ctx.prisma);
  if (!isProfileInputComplete(input)) {
    throw new AppError('Address, billing name, country, and mobile number are required to create an account.', 'BAD_USER_INPUT');
  }
  const profile = profileCompletionData(input);
  if (profile.error) throw new AppError(profile.error, 'BAD_USER_INPUT');
  const verificationToken = randomToken();
  const user = await ctx.prisma.user.create({
    data: {
      email,
      passwordHash,
      name: input.name,
      credits: newAccountCredit,
      role: 'user',
      emailVerifiedAt: null,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: addHours(48),
      ...profile.data
    }
  });

  const device = await recordAuthDeviceSession(ctx, user, input, 'signup');
  await writeAudit({ ...ctx, user }, 'signup', 'user', user.id, { email, device: device.session });
  queueVerificationEmail(ctx, user, verificationToken);
  return { token: createToken(user), user: toApi(user) };
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

export const requestPasswordReset = async (ctx, emailInput) => {
  const email = normalizeEmail(emailInput);
  const user = await ctx.prisma.user.findUnique({ where: { email } });
  if (!user) return true;
  const token = randomToken();
  await ctx.prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: tokenHash(token),
      passwordResetExpires: addHours(2)
    }
  });
  const link = `${appOrigin().replace(/\/$/, '')}/reset-password?token=${token}`;
  queueAuthEmail(ctx, {
    to: user.email,
    subject: 'Reset your Tiwlo password',
    title: 'Reset your password',
    preview: 'Use this secure link to choose a new Tiwlo password.',
    html: [
      paragraph(`Hi ${user.name || 'there'},`),
      paragraph('We received a request to reset your Tiwlo password. This link expires in 2 hours.'),
      cta('Reset Password', link)
    ].join('')
  });
  await writeAudit({ ...ctx, user }, 'request_password_reset', 'user', user.id, { email });
  return true;
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
  queueVerificationEmail(ctx, user, token);
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
