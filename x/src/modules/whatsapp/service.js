import crypto from 'node:crypto';
import { requireAuth } from '../../core/auth.js';
import { AppError } from '../../core/errors.js';
import { normalizeEmail, toApi } from '../../core/format.js';
import { appOrigin } from '../../core/email.js';

const SETTING_SCOPE = 'admin';
const SETTING_SCOPE_ID = 'main-admin';
const SETTING_KEY = 'mainAdmin:whatsappApi';
const OTP_PURPOSE_SIGNUP = 'signup';
const OTP_PURPOSE_USER_PHONE = 'user_phone';
const OTP_PURPOSE_PASSWORD_RESET = 'password_reset';
const OTP_TTL_MINUTES = 10;
const RESEND_SECONDS = 60;

const COUNTRY_DIAL_CODES = {
  BD: '+880',
  US: '+1',
  CA: '+1',
  GB: '+44',
  IN: '+91',
  PK: '+92',
  NP: '+977',
  LK: '+94',
  AE: '+971',
  SA: '+966',
  SG: '+65',
  MY: '+60',
  ID: '+62',
  TH: '+66',
  PH: '+63'
};

const clean = (value, fallback = '') => String(value ?? fallback).trim();
const digits = (value) => clean(value).replace(/\D/g, '');
const nowPlus = (ms) => new Date(Date.now() + ms);
const json = (value, fallback = {}) => JSON.stringify(value ?? fallback);
const secret = () => process.env.JWT_SECRET || process.env.WHATSAPP_OTP_SECRET || 'dev-secret';
const codeHash = (challengeId, code) => crypto.createHmac('sha256', secret()).update(`${challengeId}:${code}`).digest('hex');
const otpCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');
const templateDefinitionCache = new Map();

export const defaultWhatsAppConfig = () => ({
  enabled: false,
  apiVersion: 'v20.0',
  accessToken: '',
  phoneNumberId: '',
  businessId: '',
  fromNumber: '',
  templates: {
    otp: { name: '', language: 'en_US', button: true, buttonType: 'auto' },
    invoice: { name: '', language: 'en_US', button: true, buttonType: 'auto' },
    forgotPassword: { name: '', language: 'en_US', button: true, buttonType: 'auto' },
    security: { name: '', language: 'en_US', button: true, buttonType: 'auto' }
  }
});

const normalizeConfig = (value = {}) => {
  const base = defaultWhatsAppConfig();
  return {
    ...base,
    ...value,
    enabled: Boolean(value.enabled),
    apiVersion: clean(value.apiVersion || base.apiVersion, base.apiVersion).replace(/^graph\//i, ''),
    accessToken: clean(value.accessToken),
    phoneNumberId: clean(value.phoneNumberId || value.whatsappNumberId),
    businessId: clean(value.businessId),
    fromNumber: clean(value.fromNumber),
    templates: {
      otp: { ...base.templates.otp, ...(value.templates?.otp || {}) },
      invoice: { ...base.templates.invoice, ...(value.templates?.invoice || {}) },
      forgotPassword: { ...base.templates.forgotPassword, ...(value.templates?.forgotPassword || value.templates?.password || {}) },
      security: { ...base.templates.security, ...(value.templates?.security || value.templates?.loginAlert || {}) }
    }
  };
};

export const ensureWhatsAppAuthSchema = async (prisma) => {
  await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "whatsappVerifiedAt" TIMESTAMP(3)');
  await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "whatsappVerifiedPhone" TEXT');
  await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "whatsappLastOtpSentAt" TIMESTAMP(3)');
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "User_whatsappVerifiedPhone_unique" ON "User" ("whatsappVerifiedPhone") WHERE "whatsappVerifiedPhone" IS NOT NULL');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WhatsAppOtpChallenge" (
      "id" TEXT PRIMARY KEY,
      "purpose" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "userId" TEXT,
      "email" TEXT,
      "phone" TEXT NOT NULL,
      "mobileCountryCode" TEXT,
      "country" TEXT,
      "phoneE164" TEXT NOT NULL,
      "codeHash" TEXT NOT NULL,
      "payload" JSONB DEFAULT '{}'::jsonb,
      "attempts" INTEGER NOT NULL DEFAULT 0,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "resendAvailableAt" TIMESTAMP(3) NOT NULL,
      "verifiedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "WhatsAppOtpChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "WhatsAppOtpChallenge_purpose_status_createdAt_idx" ON "WhatsAppOtpChallenge" ("purpose", "status", "createdAt")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "WhatsAppOtpChallenge_userId_status_idx" ON "WhatsAppOtpChallenge" ("userId", "status")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "WhatsAppOtpChallenge_phoneE164_status_idx" ON "WhatsAppOtpChallenge" ("phoneE164", "status")');
};

export const getWhatsAppConfig = async (prisma) => {
  const setting = await prisma.systemSetting.findUnique({
    where: { scope_scopeId_key: { scope: SETTING_SCOPE, scopeId: SETTING_SCOPE_ID, key: SETTING_KEY } }
  }).catch(() => null);
  return normalizeConfig(setting?.value || {});
};

export const isWhatsAppEnabled = async (prisma) => Boolean((await getWhatsAppConfig(prisma)).enabled);

export const publicWhatsAppStatus = async (prisma) => {
  const config = await getWhatsAppConfig(prisma);
  return {
    enabled: Boolean(config.enabled),
    configured: Boolean(config.accessToken && config.phoneNumberId && config.templates?.otp?.name)
  };
};

export const normalizeWhatsAppPhone = ({ phone, mobileCountryCode, country } = {}) => {
  const rawDigits = digits(phone);
  const countryCode = clean(country, 'BD').toUpperCase().slice(0, 2);
  const dial = digits(mobileCountryCode || COUNTRY_DIAL_CODES[countryCode] || '');
  const local = (dial && rawDigits.startsWith(dial) ? rawDigits.slice(dial.length) : rawDigits).replace(/^0+/, '');
  if (!dial || !local) return { phoneE164: '', localPhone: local, dialCode: dial ? `+${dial}` : '', country: countryCode };
  return {
    phoneE164: `+${dial}${local}`,
    localPhone: local,
    dialCode: `+${dial}`,
    country: countryCode
  };
};

const challengePayload = (row) => row ? toApi(row) : null;

const getChallenge = async (prisma, id) => {
  const rows = await prisma.$queryRawUnsafe('SELECT * FROM "WhatsAppOtpChallenge" WHERE "id" = $1 LIMIT 1', id);
  return challengePayload(rows?.[0]);
};

const verifiedOwnerForPhone = async (prisma, phoneE164, exceptUserId = '') => {
  await ensureWhatsAppAuthSchema(prisma);
  const rows = await prisma.$queryRawUnsafe(`
    SELECT "id", "email", "name"
    FROM "User"
    WHERE "whatsappVerifiedPhone" = $1
      AND "whatsappVerifiedAt" IS NOT NULL
      AND ($2 = '' OR "id" <> $2)
    LIMIT 1
  `, phoneE164, exceptUserId || '');
  return toApi(rows?.[0] || null);
};

const phoneUsedForSignup = async (prisma, phoneE164) => {
  await ensureWhatsAppAuthSchema(prisma);
  const rows = await prisma.$queryRawUnsafe(`
    SELECT "id", "email", "phone", "mobileCountryCode", "country", "whatsappVerifiedPhone"
    FROM "User"
    WHERE "phone" IS NOT NULL OR "whatsappVerifiedPhone" IS NOT NULL
  `);
  return toApi(rows || []).find((user) => {
    if (user.whatsappVerifiedPhone === phoneE164) return true;
    return normalizeWhatsAppPhone({
      phone: user.phone,
      mobileCountryCode: user.mobileCountryCode,
      country: user.country
    }).phoneE164 === phoneE164;
  }) || null;
};

export const signupAvailability = async (ctx, input = {}) => {
  const email = normalizeEmail(input.email);
  const phone = normalizeWhatsAppPhone(input);
  const [emailOwner, phoneOwner] = await Promise.all([
    email ? ctx.prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, avatar: true } }).catch(() => null) : null,
    phone.phoneE164 ? phoneUsedForSignup(ctx.prisma, phone.phoneE164) : null
  ]);
  return {
    ok: !emailOwner && !phoneOwner,
    emailAvailable: !emailOwner,
    phoneAvailable: !phoneOwner,
    normalizedPhone: phone.phoneE164,
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

const placeholderCount = (text = '') => {
  const content = String(text || '');
  const numbers = [...content.matchAll(/{{\s*(\d+)\s*}}/g)].map((match) => Number(match[1] || 0)).filter(Boolean);
  if (numbers.length) return Math.max(...numbers);
  return (content.match(/{{[^}]+}}/g) || []).length;
};

const templateLanguage = (template) => clean(template?.language || 'en_US');

const resolveTemplateBusinessId = async (config) => {
  if (config.businessId) return config.businessId;
  if (!config.phoneNumberId || !config.accessToken) return '';
  const cacheKey = `phone:${config.apiVersion}:${config.phoneNumberId}`;
  const cached = templateDefinitionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value || '';
  const response = await fetch(`https://graph.facebook.com/${config.apiVersion || 'v20.0'}/${config.phoneNumberId}?fields=whatsapp_business_account`, {
    headers: { Authorization: `Bearer ${config.accessToken}` }
  }).catch(() => null);
  const payload = await response?.json?.().catch(() => ({}));
  const value = payload?.whatsapp_business_account?.id || '';
  templateDefinitionCache.set(cacheKey, { value, expiresAt: Date.now() + 10 * 60 * 1000 });
  return value;
};

const fetchTemplateDefinition = async (config, template) => {
  const name = clean(template?.name);
  if (!name || !config.accessToken) return null;
  const businessId = await resolveTemplateBusinessId(config);
  if (!businessId) return null;
  const language = templateLanguage(template);
  const cacheKey = `template:${config.apiVersion}:${businessId}:${name}:${language}`;
  const cached = templateDefinitionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const url = new URL(`https://graph.facebook.com/${config.apiVersion || 'v20.0'}/${businessId}/message_templates`);
  url.searchParams.set('name', name);
  url.searchParams.set('fields', 'name,language,status,category,components');
  url.searchParams.set('limit', '100');
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${config.accessToken}` }
  }).catch(() => null);
  const payload = await response?.json?.().catch(() => ({}));
  if (!response?.ok) {
    console.warn('[whatsapp] template auto-detect failed:', payload?.error?.message || 'unable to read template');
    templateDefinitionCache.set(cacheKey, { value: null, expiresAt: Date.now() + 60 * 1000 });
    return null;
  }
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const exact = rows.find((item) => item.name === name && String(item.language || '').toLowerCase() === language.toLowerCase());
  const sameName = rows.find((item) => item.name === name);
  const value = exact || sameName || null;
  templateDefinitionCache.set(cacheKey, { value, expiresAt: Date.now() + 5 * 60 * 1000 });
  return value;
};

const inferTemplateShape = (definition, kind, template) => {
  const components = Array.isArray(definition?.components) ? definition.components : [];
  const componentOf = (type) => components.find((component) => String(component.type || '').toUpperCase() === type);
  const body = componentOf('BODY');
  const header = componentOf('HEADER');
  const buttons = componentOf('BUTTONS');
  const inferredButtons = [];

  for (const [index, button] of (buttons?.buttons || []).entries()) {
    const type = String(button.type || '').toUpperCase();
    const otpType = String(button.otp_type || button.otpType || '').toLowerCase();
    if (type === 'OTP' || otpType.includes('copy')) {
      inferredButtons.push({ index, subType: 'copy_code', count: 1 });
    } else if (type === 'URL') {
      const count = placeholderCount(button.url || button.text || '');
      if (count > 0) inferredButtons.push({ index, subType: 'url', count });
    } else if (type === 'COPY_CODE') {
      inferredButtons.push({ index, subType: 'copy_code', count: 1 });
    }
  }

  if (!definition && template.button !== false) {
    const rawButtonType = clean(template.buttonType).toLowerCase();
    const selected = !rawButtonType || rawButtonType === 'auto' ? (kind === 'otp' ? 'copy_code' : 'url') : rawButtonType;
    inferredButtons.push({ index: 0, subType: selected === 'copy_code' ? 'copy_code' : 'url', count: 1 });
  }
  const fallbackButtonType = clean(template.buttonType).toLowerCase();
  const fallbackOtpCopyCode = kind === 'otp' && (!fallbackButtonType || fallbackButtonType === 'auto' || fallbackButtonType === 'copy_code');

  return {
    headerTextCount: String(header?.format || '').toUpperCase() === 'TEXT' ? placeholderCount(header?.text || '') : 0,
    bodyCount: definition ? placeholderCount(body?.text || '') : (fallbackOtpCopyCode ? 0 : null),
    buttons: inferredButtons
  };
};

const exactTextParams = (values = [], count = 0, fallback = '') => Array.from({ length: Math.max(0, count) }, (_, index) => ({
  type: 'text',
  text: String(values[index] ?? values[0] ?? fallback ?? '')
}));

const buildTemplateComponents = async (config, kind, template, bodyParams, buttonParams) => {
  const definition = await fetchTemplateDefinition(config, template);
  const shape = inferTemplateShape(definition, kind, template);
  const components = [];
  const fallback = bodyParams[0] || buttonParams[0] || '';

  if (shape.headerTextCount > 0) {
    components.push({ type: 'header', parameters: exactTextParams(bodyParams, shape.headerTextCount, fallback) });
  }

  if (shape.bodyCount === null) {
    if (bodyParams.length) {
      components.push({ type: 'body', parameters: bodyParams.map((item) => ({ type: 'text', text: String(item ?? '') })) });
    }
  } else if (shape.bodyCount > 0) {
    components.push({ type: 'body', parameters: exactTextParams(bodyParams, shape.bodyCount, fallback) });
  }

  for (const button of shape.buttons) {
    if (template.button === false || button.count <= 0) continue;
    const buttonValue = String(buttonParams[0] ?? bodyParams[0] ?? fallback ?? '');
    components.push({
      type: 'button',
      sub_type: button.subType,
      index: String(button.index || 0),
      parameters: button.subType === 'copy_code'
        ? [{ type: 'coupon_code', coupon_code: buttonValue.slice(0, 15) }]
        : exactTextParams(buttonParams, button.count, buttonValue)
    });
  }

  return components;
};

const sendTemplate = async (ctx, kind, toPhoneE164, { bodyParams = [], buttonParams = [] } = {}) => {
  const config = await getWhatsAppConfig(ctx.prisma);
  if (!config.enabled) return { sent: false, reason: 'disabled' };
  if (!config.accessToken || !config.phoneNumberId) {
    throw new AppError('WhatsApp API is enabled but access token or phone number ID is missing.', 'WHATSAPP_CONFIGURATION_REQUIRED');
  }
  const template = config.templates?.[kind] || {};
  if (!template.name) {
    throw new AppError(`WhatsApp ${kind} template name is missing.`, 'WHATSAPP_CONFIGURATION_REQUIRED');
  }
  const components = await buildTemplateComponents(config, kind, template, bodyParams, buttonParams);

  const response = await fetch(`https://graph.facebook.com/${config.apiVersion || 'v20.0'}/${config.phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: digits(toPhoneE164),
      type: 'template',
      template: {
        name: template.name,
        language: { code: template.language || 'en_US' },
        ...(components.length ? { components } : {})
      }
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = payload?.error?.error_data?.details || payload?.error?.message || 'WhatsApp API message failed.';
    throw new AppError(details, 'WHATSAPP_SEND_FAILED');
  }
  return { sent: true, payload };
};

const createOtpChallenge = async (ctx, { purpose, userId = null, email = null, phone, mobileCountryCode, country, payload = {} }) => {
  await ensureWhatsAppAuthSchema(ctx.prisma);
  const normalized = normalizeWhatsAppPhone({ phone, mobileCountryCode, country });
  if (!normalized.phoneE164) throw new AppError('A valid WhatsApp mobile number is required.', 'BAD_USER_INPUT');
  const verifiedOwner = await verifiedOwnerForPhone(ctx.prisma, normalized.phoneE164, userId || '');
  if (verifiedOwner) throw new AppError('This WhatsApp number is already verified by another account.', 'BAD_USER_INPUT');

  const id = crypto.randomUUID();
  const code = otpCode();
  const expiresAt = nowPlus(OTP_TTL_MINUTES * 60 * 1000);
  const resendAvailableAt = nowPlus(RESEND_SECONDS * 1000);
  await ctx.prisma.$executeRawUnsafe(`
    INSERT INTO "WhatsAppOtpChallenge" (
      "id", "purpose", "status", "userId", "email", "phone", "mobileCountryCode", "country",
      "phoneE164", "codeHash", "payload", "expiresAt", "resendAvailableAt", "createdAt", "updatedAt"
    )
    VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, CAST($10 AS jsonb), $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, id, purpose, userId, email, normalized.localPhone, normalized.dialCode, normalized.country, normalized.phoneE164, codeHash(id, code), json(payload), expiresAt, resendAvailableAt);

  await sendTemplate(ctx, 'otp', normalized.phoneE164, { bodyParams: [code], buttonParams: [code] });
  return {
    ok: true,
    challengeId: id,
    phone: normalized.localPhone,
    phoneE164: normalized.phoneE164,
    expiresAt: expiresAt.toISOString(),
    resendAvailableAt: resendAvailableAt.toISOString(),
    message: 'A 6 digit OTP was sent to WhatsApp.'
  };
};

export const createSignupOtpChallenge = async (ctx, input, payload) => {
  const availability = await signupAvailability(ctx, input);
  if (!availability.emailAvailable) throw new AppError('This email address is already in use.', 'BAD_USER_INPUT');
  if (!availability.phoneAvailable) throw new AppError('This phone number is already in use.', 'BAD_USER_INPUT');
  return createOtpChallenge(ctx, {
    purpose: OTP_PURPOSE_SIGNUP,
    email: normalizeEmail(input.email),
    phone: input.phone,
    mobileCountryCode: input.mobileCountryCode,
    country: input.country,
    payload
  });
};

export const createPasswordResetOtpChallenge = async (ctx, user) => {
  const config = await getWhatsAppConfig(ctx.prisma);
  if (!config.enabled) {
    throw new AppError('WhatsApp password recovery is currently unavailable.', 'WHATSAPP_DISABLED');
  }

  const enriched = await attachWhatsAppState(ctx.prisma, user);
  const phone = enriched.whatsappVerifiedPhone || enriched.phone;
  const normalized = normalizeWhatsAppPhone({
    phone,
    mobileCountryCode: enriched.mobileCountryCode,
    country: enriched.country
  });
  if (!normalized.phoneE164) {
    throw new AppError('This account does not have a valid WhatsApp number.', 'BAD_USER_INPUT');
  }

  await ensureWhatsAppAuthSchema(ctx.prisma);
  const recentRows = await ctx.prisma.$queryRawUnsafe(`
    SELECT *
    FROM "WhatsAppOtpChallenge"
    WHERE "purpose" = $1 AND "userId" = $2 AND "status" = 'pending'
    ORDER BY "createdAt" DESC
    LIMIT 1
  `, OTP_PURPOSE_PASSWORD_RESET, enriched.id);
  const recent = challengePayload(recentRows?.[0]);
  if (recent?.resendAvailableAt && new Date(recent.resendAvailableAt).getTime() > Date.now()) {
    throw new AppError('Please wait 60 seconds before sending another OTP.', 'BAD_USER_INPUT');
  }

  await ctx.prisma.$executeRawUnsafe(`
    UPDATE "WhatsAppOtpChallenge"
    SET "status" = 'superseded', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "purpose" = $1 AND "userId" = $2 AND "status" = 'pending'
  `, OTP_PURPOSE_PASSWORD_RESET, enriched.id);

  return createOtpChallenge(ctx, {
    purpose: OTP_PURPOSE_PASSWORD_RESET,
    userId: enriched.id,
    email: enriched.email,
    phone: normalized.phoneE164,
    mobileCountryCode: normalized.dialCode,
    country: normalized.country,
    payload: { recovery: 'password' }
  });
};

export const resendPasswordResetOtpChallenge = async (ctx, challengeId) => (
  resendOtpChallenge(ctx, challengeId, OTP_PURPOSE_PASSWORD_RESET)
);

export const verifyPasswordResetOtpChallenge = async (ctx, challengeId, code) => (
  verifyOtpChallenge(ctx, challengeId, code, OTP_PURPOSE_PASSWORD_RESET)
);

export const verifyOtpChallenge = async (ctx, challengeId, code, purpose) => {
  await ensureWhatsAppAuthSchema(ctx.prisma);
  const challenge = await getChallenge(ctx.prisma, challengeId);
  if (!challenge || challenge.purpose !== purpose) throw new AppError('OTP session was not found.', 'BAD_USER_INPUT');
  if (challenge.status !== 'pending') throw new AppError('This OTP session is already closed.', 'BAD_USER_INPUT');
  if (new Date(challenge.expiresAt).getTime() < Date.now()) throw new AppError('OTP expired. Send a new code.', 'BAD_USER_INPUT');
  if (Number(challenge.attempts || 0) >= 6) throw new AppError('Too many OTP attempts. Send a new code.', 'BAD_USER_INPUT');
  const valid = challenge.codeHash === codeHash(challenge.id, clean(code));
  await ctx.prisma.$executeRawUnsafe('UPDATE "WhatsAppOtpChallenge" SET "attempts" = "attempts" + 1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1', challenge.id);
  if (!valid) throw new AppError('Incorrect WhatsApp OTP.', 'BAD_USER_INPUT');
  await ctx.prisma.$executeRawUnsafe('UPDATE "WhatsAppOtpChallenge" SET "status" = $2, "verifiedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1', challenge.id, 'verified');
  return challenge;
};

export const resendOtpChallenge = async (ctx, challengeId, purpose) => {
  await ensureWhatsAppAuthSchema(ctx.prisma);
  const challenge = await getChallenge(ctx.prisma, challengeId);
  if (!challenge || challenge.purpose !== purpose) throw new AppError('OTP session was not found.', 'BAD_USER_INPUT');
  if (challenge.status !== 'pending') throw new AppError('This OTP session is already closed.', 'BAD_USER_INPUT');
  if (new Date(challenge.resendAvailableAt).getTime() > Date.now()) throw new AppError('Please wait 60 seconds before sending another OTP.', 'BAD_USER_INPUT');
  const code = otpCode();
  const expiresAt = nowPlus(OTP_TTL_MINUTES * 60 * 1000);
  const resendAvailableAt = nowPlus(RESEND_SECONDS * 1000);
  await ctx.prisma.$executeRawUnsafe(`
    UPDATE "WhatsAppOtpChallenge"
    SET "codeHash" = $2, "expiresAt" = $3, "resendAvailableAt" = $4, "attempts" = 0, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = $1
  `, challenge.id, codeHash(challenge.id, code), expiresAt, resendAvailableAt);
  await sendTemplate(ctx, 'otp', challenge.phoneE164, { bodyParams: [code], buttonParams: [code] });
  return {
    ok: true,
    challengeId: challenge.id,
    phone: challenge.phone,
    phoneE164: challenge.phoneE164,
    expiresAt: expiresAt.toISOString(),
    resendAvailableAt: resendAvailableAt.toISOString(),
    message: 'A new WhatsApp OTP was sent.'
  };
};

export const changeSignupOtpPhone = async (ctx, challengeId, input = {}) => {
  const challenge = await getChallenge(ctx.prisma, challengeId);
  if (!challenge || challenge.purpose !== OTP_PURPOSE_SIGNUP) throw new AppError('OTP session was not found.', 'BAD_USER_INPUT');
  if (challenge.status !== 'pending') throw new AppError('This OTP session is already closed.', 'BAD_USER_INPUT');
  const payload = challenge.payload || {};
  return createSignupOtpChallenge(ctx, {
    ...payload.input,
    phone: input.phone,
    mobileCountryCode: input.mobileCountryCode,
    country: input.country || payload.input?.country
  }, {
    ...payload,
    input: {
      ...(payload.input || {}),
      phone: input.phone,
      mobileCountryCode: input.mobileCountryCode,
      country: input.country || payload.input?.country
    }
  });
};

export const startUserWhatsAppVerification = async (ctx, actorInput, input = {}) => {
  const actor = actorInput || await requireAuth(ctx);
  const phone = input.phone ?? actor.phone;
  const mobileCountryCode = input.mobileCountryCode ?? actor.mobileCountryCode;
  const country = input.country ?? actor.country;
  return createOtpChallenge(ctx, {
    purpose: OTP_PURPOSE_USER_PHONE,
    userId: actor.id,
    email: actor.email,
    phone,
    mobileCountryCode,
    country,
    payload: { phone, mobileCountryCode, country }
  });
};

export const verifyUserWhatsAppOtp = async (ctx, actorInput, challengeId, code) => {
  const actor = actorInput || await requireAuth(ctx);
  const challenge = await verifyOtpChallenge(ctx, challengeId, code, OTP_PURPOSE_USER_PHONE);
  if (challenge.userId !== actor.id) throw new AppError('OTP session does not belong to this account.', 'FORBIDDEN');
  const owner = await verifiedOwnerForPhone(ctx.prisma, challenge.phoneE164, actor.id);
  if (owner) throw new AppError('This WhatsApp number is already verified by another account.', 'BAD_USER_INPUT');
  await ctx.prisma.$executeRawUnsafe(`
    UPDATE "User"
    SET "phone" = $2,
        "mobileCountryCode" = $3,
        "country" = COALESCE($4, "country"),
        "whatsappVerifiedAt" = CURRENT_TIMESTAMP,
        "whatsappVerifiedPhone" = $5,
        "whatsappLastOtpSentAt" = CURRENT_TIMESTAMP,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = $1
  `, actor.id, challenge.phone, challenge.mobileCountryCode, challenge.country, challenge.phoneE164);
  const user = await ctx.prisma.user.findUnique({ where: { id: actor.id } });
  return attachWhatsAppState(ctx.prisma, user);
};

export const attachWhatsAppState = async (prisma, user) => {
  if (!user?.id) return user;
  await ensureWhatsAppAuthSchema(prisma);
  const rows = await prisma.$queryRawUnsafe(`
    SELECT "whatsappVerifiedAt", "whatsappVerifiedPhone", "whatsappLastOtpSentAt"
    FROM "User"
    WHERE "id" = $1
    LIMIT 1
  `, user.id);
  return { ...user, ...(toApi(rows?.[0] || {})) };
};

export const whatsAppVerificationRequiredFor = async (prisma, user) => {
  if (!user || ['admin', 'super_admin'].includes(String(user.role || '').toLowerCase())) return false;
  const status = await publicWhatsAppStatus(prisma);
  if (!status.enabled) return false;
  const enriched = user.whatsappVerifiedAt !== undefined ? user : await attachWhatsAppState(prisma, user);
  return !enriched.whatsappVerifiedAt;
};

export const sendForgotPasswordWhatsApp = async (ctx, user, resetLink) => {
  const enriched = await attachWhatsAppState(ctx.prisma, user);
  const normalized = enriched.whatsappVerifiedPhone || normalizeWhatsAppPhone(enriched).phoneE164;
  if (!normalized) return { sent: false, reason: 'no-phone' };
  return sendTemplate(ctx, 'forgotPassword', normalized, {
    bodyParams: [user.name || 'there', resetLink],
    buttonParams: [resetLink]
  }).catch((error) => {
    console.warn('[whatsapp] forgot password send failed:', error?.message || error);
    return { sent: false, reason: 'send-failed', message: error?.message || String(error) };
  });
};

export const sendInvoiceWhatsApp = async (ctx, invoice, owner, message, path = '/invoices') => {
  const enriched = await attachWhatsAppState(ctx.prisma, owner);
  const normalized = enriched?.whatsappVerifiedPhone || normalizeWhatsAppPhone(enriched || {}).phoneE164;
  if (!normalized) return { sent: false, reason: 'no-phone' };
  const url = `${appOrigin().replace(/\/$/, '')}${path || '/invoices'}`;
  return sendTemplate(ctx, 'invoice', normalized, {
    bodyParams: [owner?.name || 'there', invoice.number, `${String(invoice.currency || 'USD').toUpperCase()} ${Number(invoice.amount || 0).toFixed(2)}`, url, message || 'A new invoice is ready.'],
    buttonParams: [url]
  }).catch((error) => {
    console.warn('[whatsapp] invoice send failed:', error?.message || error);
    return { sent: false, reason: 'send-failed', message: error?.message || String(error) };
  });
};

export const sendSecurityWhatsApp = async (ctx, user, title, message, path = '/settings') => {
  const enriched = await attachWhatsAppState(ctx.prisma, user);
  const normalized = enriched?.whatsappVerifiedPhone || normalizeWhatsAppPhone(enriched || {}).phoneE164;
  if (!normalized) return { sent: false, reason: 'no-phone' };
  const url = `${appOrigin().replace(/\/$/, '')}${path || '/settings'}`;
  return sendTemplate(ctx, 'security', normalized, {
    bodyParams: [user?.name || 'there', title || 'Security alert', message || 'Your Tiwlo account has a new security event.', url],
    buttonParams: [url]
  }).catch((error) => {
    console.warn('[whatsapp] security send failed:', error?.message || error);
    return { sent: false, reason: 'send-failed', message: error?.message || String(error) };
  });
};
