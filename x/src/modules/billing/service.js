import { getActor, isAdmin, ownerWhere } from '../../core/auth.js';
import { randomIp, removeUndefined, toApi } from '../../core/format.js';
import { writeAudit } from '../../core/audit.js';
import { AppError } from '../../core/errors.js';
import { pagination } from '../../core/validation.js';
import { sendTiwloEmail } from '../../core/email.js';
import { invoiceReceiptEmailHtml } from '../../core/receiptEmail.js';
import {
  convertCurrencyAmount as convertByPolicy,
  exchangeRatesForPolicy,
  normalizeCurrencyCode,
  readPlatformCurrencyPolicy
} from '../../core/currency.js';
import { ensureOwnerHasCredit, runCreditAutomationForOwner, runCreditAutomationJob } from './creditAutomation.js';
import { notifyDiscordInvoiceEvent } from '../discord/service.js';
import { sendInvoiceWhatsApp } from '../whatsapp/service.js';
import { getAccountCreditPolicy, getSignupPromoCredit, getSignupPromoHoldAmount, SIGNUP_PROMO_HOLD_AMOUNT } from '../../core/settings.js';
import {
  checkTPanelNodeUsername,
  createTPanelNodeAccount,
  tPanelNodeBaseUrl
} from '../tpanel/nodeApi.js';
import {
  createBkashPayment,
  createPaypalOrder,
  createStripeCheckout,
  defaultGateways,
  executeBkashPayment,
  frontendBaseUrl,
  hourlyRateFor,
  parseStripeWebhook,
  paymentResultUrl,
  PAYMENT_PROVIDERS,
  retrieveStripeSession,
  roundMoney,
  capturePaypalOrder,
  clearPaymentProviderCache,
  testPaymentGatewayConnection
} from './paymentProviders.js';

const paymentEnabledStatuses = new Set(['enabled', 'active']);
const autoIpResourceTypes = new Set(['droplet', 'system_server']);
const CREDIT_CURRENCY = 'USD';
const SIGNUP_PROMO_SCOPE = 'signup_promo_verification';
const SIGNUP_PROMO_DAYS = 30;

const invoiceNumber = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}`;

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const moneyLabel = (amount, currency = CREDIT_CURRENCY) => `${String(currency || CREDIT_CURRENCY).toUpperCase()} ${Number(amount || 0).toFixed(2)}`;

async function notifyBillingEvent(ctx, invoice, title, message, path = '/invoices') {
  if (!invoice?.ownerId) return;
  await ctx.prisma.notification.create({
    data: {
      ownerId: invoice.ownerId,
      scope: 'billing',
      scopeId: invoice.id,
      type: 'invoice',
      title,
      message,
      status: 'unread',
      metadata: { invoiceId: invoice.id, number: invoice.number, path }
    }
  }).catch(() => null);
  const owner = await ctx.prisma.user.findUnique({ where: { id: invoice.ownerId } }).catch(() => null);
  await sendTiwloEmail(ctx, {
    to: owner?.email,
    subject: title,
    title,
    preview: message,
    template: 'none',
    html: invoiceReceiptEmailHtml({
      invoice,
      title,
      message,
      actionUrl: `${frontendBaseUrl() || ''}${path || '/invoices'}`,
      supportUrl: `${frontendBaseUrl() || ''}/support`
    })
  });
  await sendInvoiceWhatsApp(ctx, invoice, owner, message, path);
  await notifyDiscordInvoiceEvent(ctx, 'created', invoice, { message });
}

const exchangeRate = (fromCurrency, toCurrency) => {
  const from = String(fromCurrency || CREDIT_CURRENCY).toUpperCase();
  const to = String(toCurrency || CREDIT_CURRENCY).toUpperCase();
  if (from === to) return 1;
  const directKey = `${from}_${to}`;
  const inverseKey = `${to}_${from}`;
  const direct = Number(process.env[`PAYMENT_RATE_${directKey}`] || (directKey === 'USD_BDT' ? 110 : 0));
  if (direct > 0) return direct;
  const inverse = Number(process.env[`PAYMENT_RATE_${inverseKey}`] || (inverseKey === 'USD_BDT' ? 110 : 0));
  if (inverse > 0) return 1 / inverse;
  throw new AppError(`Missing exchange rate for ${directKey}`, 'PAYMENT_CONFIGURATION_REQUIRED');
};

const convertMoney = (amount, fromCurrency, toCurrency = CREDIT_CURRENCY) => (
  roundMoney(Number(amount || 0) * exchangeRate(fromCurrency, toCurrency))
);

export const invoiceCreditAmount = (invoice) => convertMoney(invoice.amount, invoice.currency || CREDIT_CURRENCY, CREDIT_CURRENCY);

export const convertMoneyForCtx = async (ctx, amount, fromCurrency, toCurrency = CREDIT_CURRENCY) => {
  const policy = await readPlatformCurrencyPolicy(ctx.prisma);
  return roundMoney(convertByPolicy(amount, policy, toCurrency, fromCurrency));
};

export const invoiceCreditAmountForCtx = async (ctx, invoice) => (
  convertMoneyForCtx(ctx, invoice.amount, invoice.currency || CREDIT_CURRENCY, CREDIT_CURRENCY)
);

const gatewayWithPlatformRates = async (ctx, gateway) => {
  const policy = await readPlatformCurrencyPolicy(ctx.prisma);
  return {
    ...gateway,
    settings: {
      ...(gateway.settings || {}),
      exchangeRates: {
        ...exchangeRatesForPolicy(policy),
        ...(gateway.settings?.exchangeRates || {})
      }
    }
  };
};

const sanitizeSecretValue = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim();
};

const sanitizeCredentials = (credentials = {}) => (
  Object.fromEntries(Object.entries(credentials || {})
    .map(([key, value]) => [key, sanitizeSecretValue(value)])
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== ''))
);

const requiredCredentialFields = {
  bkash: ['appKey', 'appSecret', 'username', 'password'],
  stripe: ['secretKey'],
  paypal: ['clientId', 'clientSecret']
};

const credentialPreview = (value) => {
  const text = String(value || '').trim();
  if (!text) return null;
  return text.length <= 4 ? 'saved' : `••••${text.slice(-4)}`;
};

const credentialStatus = (gateway) => {
  const credentials = gateway.credentials || {};
  const required = requiredCredentialFields[gateway.provider] || [];
  const fields = Object.fromEntries(required.map((field) => [
    field,
    {
      saved: Boolean(String(credentials[field] || '').trim()),
      preview: credentialPreview(credentials[field])
    }
  ]));

  return {
    required,
    fields,
    complete: required.length > 0 && required.every((field) => Boolean(String(credentials[field] || '').trim())),
    savedKeys: Object.keys(credentials).filter((key) => Boolean(String(credentials[key] || '').trim())),
    checkedAt: gateway.updatedAt
  };
};

const safeGateway = (gateway) => ({
  ...gateway,
  credentials: credentialStatus(gateway)
});

export const ensureDefaultPaymentGateways = async (ctx) => {
  const existing = await ctx.prisma.paymentGateway.findMany({
    where: { key: { in: defaultGateways.map((gateway) => gateway.key) } },
    select: { key: true }
  });
  const existingKeys = new Set(existing.map((gateway) => gateway.key));
  await Promise.all(defaultGateways
    .filter((gateway) => !existingKeys.has(gateway.key))
    .map((gateway) => ctx.prisma.paymentGateway.create({
      data: {
        key: gateway.key,
        name: gateway.name,
        provider: gateway.provider,
        status: gateway.status,
        mode: gateway.mode,
        credentials: {},
        settings: gateway.settings
      }
    })));
};

const findGateway = async (ctx, provider, { allowDisabled = false } = {}) => {
  await ensureDefaultPaymentGateways(ctx);
  const normalized = String(provider || '').toLowerCase();
  if (!PAYMENT_PROVIDERS.includes(normalized)) {
    throw new AppError('Unsupported payment provider', 'BAD_USER_INPUT');
  }

  const gateway = await ctx.prisma.paymentGateway.findFirst({
    where: {
      OR: [{ key: normalized }, { provider: normalized }]
    }
  });
  if (!gateway) throw new AppError(`${provider} gateway is not configured`, 'PAYMENT_CONFIGURATION_REQUIRED');
  if (!allowDisabled && !paymentEnabledStatuses.has(String(gateway.status || '').toLowerCase())) {
    throw new AppError(`${gateway.name} is disabled`, 'PAYMENT_CONFIGURATION_REQUIRED');
  }
  return gatewayWithPlatformRates(ctx, gateway);
};

const canUseInvoice = async (ctx, invoice) => {
  const actor = await getActor(ctx);
  if (isAdmin(actor) || invoice.ownerId === actor?.id) return actor;
  throw new AppError('You cannot pay this invoice', 'FORBIDDEN');
};

const activeResourcesWhere = (ownerId) => ({
  ownerId,
  status: { notIn: ['deleted', 'destroyed', 'archived', 'off', 'suspended'] },
  monthlyCost: { gt: 0 }
});

const billingMetadata = (resource) => resource?.metadata?.billing || {};

const usageForResource = (resource, now = new Date()) => {
  const billing = billingMetadata(resource);
  const monthlyCost = Number(resource.monthlyCost || billing.monthlyCost || 0);
  const hourlyRate = roundMoney(Number(billing.hourlyRate || hourlyRateFor(monthlyCost)));
  const lastBilledAt = new Date(billing.lastBilledAt || billing.startedAt || resource.createdAt);
  const hours = Math.max(0, (now.getTime() - lastBilledAt.getTime()) / 3600000);
  return {
    resourceId: resource.id,
    name: resource.name,
    monthlyCost,
    hourlyRate,
    hours: roundMoney(hours),
    amount: roundMoney(hours * hourlyRate)
  };
};

const deploymentNodeIdForResource = (pendingResource) => {
  if (String(pendingResource?.type || 'droplet').toLowerCase() !== 'droplet') return '';
  return String(pendingResource?.metadata?.deploymentNode?.id || '').trim();
};

const cleanTPanelUsername = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16);
const isRealDomainName = (value) => /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i.test(String(value || '').trim())
  && !String(value || '').trim().toLowerCase().endsWith('.tpanel.local');
const accountDomainFor = (account, username) => {
  const raw = String(account?.domain || account?.hostname || '').trim().toLowerCase();
  if (raw && raw.includes('.')) return raw;
  return '';
};

const sanitizeResourceMetadata = (metadata = {}) => {
  const account = metadata?.tpanelAccount || null;
  if (!account) return metadata || {};
  const { password: _password, ...safeAccount } = account;
  return {
    ...metadata,
    tpanelAccount: safeAccount
  };
};

const activeDropletCountForNode = async (tx, nodeId) => {
  const rows = await tx.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS "count"
    FROM "CloudResource"
    WHERE "type" = 'droplet'
      AND "status" NOT IN ('deleted', 'destroyed', 'archived')
      AND "metadata"->'deploymentNode'->>'id' = $1
  `, nodeId);
  return Number(rows?.[0]?.count || 0);
};

const reserveDeploymentNodeCapacity = async (tx, pendingResource) => {
  const nodeId = deploymentNodeIdForResource(pendingResource);
  if (!nodeId) return;

  const rows = await tx.$queryRawUnsafe(`
    SELECT "id", "panel", "status", "maxAccounts", "activeAccounts"
    FROM "HostingComputeNode"
    WHERE "id" = $1
    FOR UPDATE
  `, nodeId);
  const node = rows?.[0];
  if (!node || node.status !== 'active') {
    throw new AppError('Selected tPanel server is not active anymore. Choose another location.', 'RESOURCE_EXHAUSTED');
  }
  if (!['tpanel', 'hosting-panel'].includes(String(node.panel || '').toLowerCase())) {
    throw new AppError('Selected server is not a tPanel deployment node.', 'BAD_USER_INPUT');
  }

  const cloudAccounts = await activeDropletCountForNode(tx, nodeId);
  const usedAccounts = Math.max(Number(node.activeAccounts || 0), cloudAccounts);
  const maxAccounts = Number(node.maxAccounts || 0);
  if (maxAccounts > 0 && usedAccounts >= maxAccounts) {
    throw new AppError('Selected tPanel server account limit is full. Choose another location.', 'RESOURCE_EXHAUSTED');
  }

  await tx.$executeRawUnsafe(`
    UPDATE "HostingComputeNode"
    SET "activeAccounts" = GREATEST("activeAccounts", $2) + 1,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = $1
  `, nodeId, usedAccounts);
};

const findTPanelDeploymentNode = async (tx, pendingResource) => {
  const nodeId = deploymentNodeIdForResource(pendingResource);
  if (!nodeId) return null;
  const rows = await tx.$queryRawUnsafe(`
    SELECT *
    FROM "HostingComputeNode"
    WHERE "id" = $1
    LIMIT 1
  `, nodeId);
  return rows?.[0] || null;
};

const provisionTPanelAccountForResource = async (tx, ownerId, pendingResource, resource) => {
  const accountInput = pendingResource?.metadata?.tpanelAccount || null;
  if (!accountInput || String(pendingResource?.type || '').toLowerCase() !== 'droplet') return null;

  const node = await findTPanelDeploymentNode(tx, pendingResource);
  const username = cleanTPanelUsername(accountInput.username);
  const password = String(accountInput.password || '');
  if (!node || !['tpanel', 'hosting-panel'].includes(String(node.panel || '').toLowerCase())) {
    throw new AppError('Selected tPanel server is not available anymore. Choose another location.', 'RESOURCE_EXHAUSTED');
  }
  if (!username || password.length < 8) {
    throw new AppError('tPanel username and password are required before creating this droplet.', 'BAD_USER_INPUT');
  }

  const domain = accountDomainFor(accountInput, username);
  if (!isRealDomainName(domain)) {
    throw new AppError('A real domain name is required before creating a tPanel droplet. Auto tpanel.local subdomains are disabled.', 'BAD_USER_INPUT');
  }
  const remoteAvailability = await checkTPanelNodeUsername(node, username, domain);
  if (!remoteAvailability.available) {
    throw new AppError('This tPanel username is already used on the selected server. Choose another username.', 'CONFLICT');
  }

  const owner = await tx.user.findUnique({ where: { id: ownerId } }).catch(() => null);
  const remoteAccount = await createTPanelNodeAccount(node, {
    username,
    password,
    domain,
    limits: accountInput.limits || {},
    packageCode: accountInput.packageCode || pendingResource.plan || '',
    packageName: accountInput.packageName || pendingResource.plan || '',
    ownerName: owner?.name || accountInput.ownerName || '',
    ownerEmail: owner?.email || accountInput.contactEmail || '',
    contactEmail: owner?.email || accountInput.contactEmail || '',
    displayName: pendingResource.name || domain,
    runtime: accountInput.runtime || 'php',
    permissionProfile: accountInput.permissionProfile || 'developer',
    shellAccess: accountInput.shellAccess !== false
  });
  const baseUrl = tPanelNodeBaseUrl(node);

  return {
    id: remoteAccount?.id || username,
    remoteId: remoteAccount?.id || null,
    nodeId: node.id,
    source: 'tpanel_node_api',
    username,
    domain: remoteAccount?.domain || domain,
    status: remoteAccount?.status || 'active',
    packageCode: accountInput.packageCode || pendingResource.plan || '',
    packageName: accountInput.packageName || pendingResource.plan || '',
    loginMode: 'sso',
    panelUrl: `${baseUrl}/login?username=${encodeURIComponent(username)}`,
    createdOnServerAt: new Date().toISOString()
  };
};

const createBillingResource = async (tx, ownerId, pendingResource, invoice, paidAt = new Date()) => {
  const metadata = sanitizeResourceMetadata(pendingResource.metadata || {});
  const billing = pendingResource.billing || {};
  const monthlyCost = Number(pendingResource.monthlyCost || billing.monthlyCost || 0);
  const hourlyRate = roundMoney(Number(billing.hourlyRate || hourlyRateFor(monthlyCost)));
  await reserveDeploymentNodeCapacity(tx, pendingResource);
  const resource = await tx.cloudResource.create({
    data: {
      ownerId,
      type: pendingResource.type || 'droplet',
      name: pendingResource.name,
      ip: pendingResource.ip || (autoIpResourceTypes.has(pendingResource.type || 'droplet') ? randomIp() : null),
      status: 'active',
      region: pendingResource.region,
      specs: pendingResource.specs,
      image: pendingResource.image,
      plan: pendingResource.plan,
      cpu: pendingResource.cpu,
      ram: pendingResource.ram,
      disk: pendingResource.disk,
      monthlyCost,
      metadata: {
        ...metadata,
        billing: {
          ...(metadata.billing || {}),
          monthlyCost,
          hourlyRate,
          billingCycle: 'hourly_monthly_cap',
          startedAt: paidAt.toISOString(),
          lastBilledAt: paidAt.toISOString(),
          monthlyCap: monthlyCost,
          initialInvoiceId: invoice.id,
          initialCharge: Number(invoice.amount || 0)
        }
      }
    }
  });
  const tpanelAccount = await provisionTPanelAccountForResource(tx, ownerId, pendingResource, resource);
  if (!tpanelAccount) return resource;
  return tx.cloudResource.update({
    where: { id: resource.id },
    data: {
      metadata: {
        ...(resource.metadata || {}),
        tpanelAccount: {
          ...((resource.metadata || {}).tpanelAccount || {}),
          ...tpanelAccount
        }
      }
    }
  });
};

const fulfillPaidInvoice = async (tx, invoice, paidAt = new Date()) => {
  let resource = null;
  let items = invoice.items || {};

  if (invoice.scope === 'credit_topup') {
    const creditAmount = Number(invoice.items?.creditAmount ?? invoiceCreditAmount(invoice));
    await tx.user.update({
      where: { id: invoice.ownerId },
      data: { credits: { increment: creditAmount } }
    });
    items = {
      ...items,
      creditAppliedAt: paidAt.toISOString(),
      creditAmount,
      creditCurrency: CREDIT_CURRENCY,
      sourceAmount: Number(invoice.amount || 0),
      sourceCurrency: invoice.currency || CREDIT_CURRENCY
    };
  }

  if (invoice.scope === SIGNUP_PROMO_SCOPE) {
    const promoCreditAmount = roundMoney(Number(items?.promoCreditAmount || await getSignupPromoCredit(tx)));
    const owner = await tx.user.findUnique({ where: { id: invoice.ownerId } });
    if (owner?.promoCreditStatus === 'active' || owner?.promoVerifiedAt) {
      items = {
        ...items,
        promoCreditSkippedAt: paidAt.toISOString(),
        promoCreditSkipReason: 'already_applied'
      };
    } else {
      const expiresAt = addDays(paidAt, SIGNUP_PROMO_DAYS);
      await tx.user.update({
        where: { id: invoice.ownerId },
        data: {
          credits: { increment: promoCreditAmount },
          promoCreditAmount,
          promoCreditExpiresAt: expiresAt,
          promoCreditStatus: 'active',
          promoCreditSource: 'signup_payment_verification',
          promoPaymentMethod: invoice.items?.lastCheckout?.provider || invoice.items?.promoPaymentMethod || null,
          promoVerifiedAt: paidAt
        }
      });
      items = {
        ...items,
        promoCreditAppliedAt: paidAt.toISOString(),
        promoCreditAmount,
        promoCreditCurrency: CREDIT_CURRENCY,
        promoCreditExpiresAt: expiresAt.toISOString(),
        verificationHoldAmount: Number(invoice.amount || SIGNUP_PROMO_HOLD_AMOUNT),
        verificationHoldCurrency: invoice.currency || CREDIT_CURRENCY,
        refundNotice: 'Verification hold should be returned after payment method verification.'
      };
    }
  }

  if (invoice.scope === 'social_verification') {
    const verification = items?.verification || {};
    const profile = await tx.socialProfile.findUnique({ where: { userId: invoice.ownerId } });
    if (profile) {
      const months = Math.max(1, Number(verification.periodMonths || 1));
      const currentEnd = profile.badgeExpiresAt && profile.badgeExpiresAt > paidAt ? profile.badgeExpiresAt : paidAt;
      const expiresAt = new Date(currentEnd);
      expiresAt.setMonth(expiresAt.getMonth() + months);
      await tx.socialProfile.update({
        where: { userId: invoice.ownerId },
        data: { verified: true, badgeType: 'blue', badgePlan: verification.packageId || invoice.scopeId || 'blue', badgeExpiresAt: expiresAt }
      });
      await tx.notification.create({
        data: {
          ownerId: invoice.ownerId,
          scope: 'social',
          scopeId: invoice.id,
          type: 'verification_approved',
          title: "You're verified on Tiwi",
          message: `Your payment was confirmed and your blue verified badge is active until ${expiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}.`,
          status: 'unread',
          metadata: {
            destination: 'support_center',
            noReply: true,
            caseType: 'verification',
            badgeType: 'blue',
            invoiceId: invoice.id,
            packageId: verification.packageId || invoice.scopeId || 'blue',
            expiresAt: expiresAt.toISOString()
          }
        }
      });
      items = { ...items, verificationActivatedAt: paidAt.toISOString(), verificationExpiresAt: expiresAt.toISOString() };
    }
  }

  if (invoice.scope === 'social_profile_decoration' || invoice.scope === 'social_profile_effect') {
    const catalogItem = invoice.scope === 'social_profile_effect' ? items?.profileEffect : items?.profileDecoration;
    const decorationId = catalogItem?.decorationId || invoice.scopeId;
    if (decorationId) {
      const decoration = await tx.socialProfileDecoration.findUnique({ where: { id: decorationId } });
      const expectedKind = invoice.scope === 'social_profile_effect' ? 'profile-effect' : 'avatar-decoration';
      if (decoration?.kind === expectedKind) {
        await tx.socialProfileDecorationOwnership.upsert({
          where: { userId_decorationId: { userId: invoice.ownerId, decorationId } },
          create: { userId: invoice.ownerId, decorationId, source: 'purchase', invoiceId: invoice.id, acquiredAt: paidAt },
          update: { source: 'purchase', invoiceId: invoice.id, acquiredAt: paidAt }
        });
        items = { ...items, catalogItemOwnedAt: paidAt.toISOString(), decorationOwnedAt: paidAt.toISOString(), decorationId };
      }
    }
  }

  if (invoice.scope === 'cloud_order' && items.pendingResource && !items.fulfilledResourceId) {
    resource = await createBillingResource(tx, invoice.ownerId, items.pendingResource, invoice, paidAt);
    items = {
      ...items,
      fulfilledResourceId: resource.id,
      fulfilledAt: paidAt.toISOString()
    };
  }

  if (invoice.scope === 'tpanel_license' && invoice.scopeId) {
    const months = Math.max(1, Number(items?.tPanel?.months || items?.tPanel?.renewalMonths || 1));
    const currentRows = await tx.$queryRawUnsafe('SELECT "currentPeriodEnd" FROM "TPanelLicense" WHERE "id" = $1', invoice.scopeId);
    const currentEnd = currentRows?.[0]?.currentPeriodEnd ? new Date(currentRows[0].currentPeriodEnd) : null;
    const base = currentEnd && currentEnd > paidAt ? currentEnd : paidAt;
    const periodEnd = new Date(base);
    periodEnd.setMonth(periodEnd.getMonth() + months);
    await tx.$executeRawUnsafe(`
      UPDATE "TPanelLicense"
      SET "status" = 'active',
          "billingStatus" = 'paid',
          "activatedAt" = COALESCE("activatedAt", $2),
          "currentPeriodStart" = COALESCE("currentPeriodStart", $2),
          "currentPeriodEnd" = $3,
          "suspendedAt" = NULL,
          "cancelledAt" = NULL,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = $1
    `, invoice.scopeId, paidAt, periodEnd);
    items = {
      ...items,
      tPanelActivatedAt: paidAt.toISOString(),
      tPanelPeriodEnd: periodEnd.toISOString()
    };
  }

  const updatedInvoice = await tx.invoice.update({
    where: { id: invoice.id },
    data: {
      status: 'paid',
      paidAt,
      items
    }
  });

  return { invoice: updatedInvoice, resource };
};

const createOrUpdatePayment = async (tx, { invoice, provider, reference, status, amount }) => {
  const existing = reference
    ? await tx.payment.findFirst({ where: { invoiceId: invoice.id, provider, reference } })
    : null;
  if (existing) {
    return tx.payment.update({
      where: { id: existing.id },
      data: { status, amount: Number(amount || invoice.amount || 0) }
    });
  }
  return tx.payment.create({
    data: {
      invoiceId: invoice.id,
      amount: Number(amount || invoice.amount || 0),
      provider,
      reference,
      status
    }
  });
};

export const requireProvisioningCredit = async (ctx, ownerId, amount, message) => {
  const charge = roundMoney(amount);
  if (charge <= 0) return true;
  const owner = await ctx.prisma.user.findUnique({ where: { id: ownerId } });
  if (Number(owner?.credits || 0) < charge) {
    throw new AppError(message || `Insufficient credit balance. Add at least ${moneyLabel(charge)} before provisioning.`, 'BAD_USER_INPUT');
  }
  return true;
};

export const chargeProvisioningCredit = async (ctx, {
  ownerId,
  amount,
  currency = CREDIT_CURRENCY,
  displayCurrency,
  creditAmount,
  scope,
  scopeId,
  label,
  monthlyCost = 0,
  hourlyRate,
  metadata = {}
}) => {
  const sourceCurrency = normalizeCurrencyCode(currency || CREDIT_CURRENCY, CREDIT_CURRENCY);
  const invoiceCurrency = normalizeCurrencyCode(displayCurrency || sourceCurrency, sourceCurrency);
  const invoiceAmount = roundMoney(sourceCurrency === invoiceCurrency
    ? amount
    : await convertMoneyForCtx(ctx, amount, sourceCurrency, invoiceCurrency));
  const charge = roundMoney(creditAmount ?? await convertMoneyForCtx(ctx, invoiceAmount, invoiceCurrency, CREDIT_CURRENCY));
  if (charge <= 0 || invoiceAmount <= 0) return null;
  await requireProvisioningCredit(ctx, ownerId, charge);
  const paidAt = new Date();
  const baseHourlyRate = roundMoney(hourlyRate || hourlyRateFor(monthlyCost));
  const displayHourlyRate = roundMoney(sourceCurrency === invoiceCurrency
    ? baseHourlyRate
    : await convertMoneyForCtx(ctx, baseHourlyRate, sourceCurrency, invoiceCurrency));
  const displayMonthlyCost = roundMoney(sourceCurrency === invoiceCurrency
    ? monthlyCost
    : await convertMoneyForCtx(ctx, monthlyCost, sourceCurrency, invoiceCurrency));
  const invoice = await ctx.prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: ownerId }, data: { credits: { decrement: charge } } });
    const createdInvoice = await tx.invoice.create({
      data: {
        ownerId,
        number: invoiceNumber('PRV'),
        amount: invoiceAmount,
        currency: invoiceCurrency,
        status: 'paid',
        scope,
        scopeId,
        paidAt,
        items: {
          creditAmount: charge,
          creditCurrency: CREDIT_CURRENCY,
          sourceAmount: roundMoney(amount),
          sourceCurrency,
          lineItems: [{
            label,
            amount: invoiceAmount,
            monthlyCost: displayMonthlyCost,
            hourlyRate: displayHourlyRate,
            creditAmount: charge,
            creditCurrency: CREDIT_CURRENCY
          }],
          billing: {
            type: 'provisioning_first_hour',
            monthlyCost: displayMonthlyCost,
            hourlyRate: displayHourlyRate,
            initialCharge: invoiceAmount,
            baseCurrency: sourceCurrency,
            baseMonthlyCost: roundMoney(monthlyCost),
            baseHourlyRate,
            creditAmount: charge,
            creditCurrency: CREDIT_CURRENCY,
            chargedAt: paidAt.toISOString()
          },
          ...metadata
        }
      }
    });
    await tx.payment.create({
      data: {
        invoiceId: createdInvoice.id,
        amount: invoiceAmount,
        provider: 'credits',
        reference: `provision_${paidAt.getTime()}`,
        status: 'succeeded'
      }
    });
    return createdInvoice;
  });
  await runCreditAutomationForOwner(ctx, ownerId);
  await writeAudit(ctx, 'charge_provisioning_credit', scope || 'billing', scopeId || invoice.id, {
    amount: invoiceAmount,
    currency: invoiceCurrency,
    creditAmount: charge,
    creditCurrency: CREDIT_CURRENCY,
    ownerId
  });
  return toApi(invoice);
};

const tiwloPayFeeFor = (link) => {
  const settings = link.profile?.settings || {};
  const feePercent = Number(settings.feePercent ?? 2.9);
  const feeFixed = Number(settings.feeFixed ?? 0.3);
  return roundMoney((Number(link.amount || 0) * feePercent) / 100 + feeFixed);
};

const completeTiwloPayInvoice = async (ctx, invoice, { provider, reference, amount }) => {
  if (invoice.scope !== 'tiwlo_pay' || !invoice.scopeId) return;
  const link = await ctx.prisma.tiwloPayLink.findUnique({
    where: { id: invoice.scopeId },
    include: { profile: true }
  });
  if (!link) return;

  const fee = tiwloPayFeeFor(link);
  const netAmount = Math.max(0, roundMoney(Number(link.amount || 0) - fee));
  await ctx.prisma.$transaction(async (tx) => {
    const current = await tx.tiwloPayLink.findUnique({ where: { id: link.id } });
    if (!current || current.status === 'paid') return;
    await tx.tiwloPayLink.update({
      where: { id: link.id },
      data: {
        status: 'paid',
        paidAt: new Date(),
        metadata: {
          ...(current.metadata || {}),
          checkoutInvoiceId: invoice.id,
          lastPayment: {
            provider,
            reference,
            invoiceId: invoice.id,
            amount: Number(amount || link.amount || 0),
            paidAt: new Date().toISOString()
          }
        }
      }
    });

    const existing = reference
      ? await tx.tiwloPayTransaction.findFirst({ where: { linkId: link.id, reference } })
      : null;
    const data = {
      profileId: link.profileId,
      linkId: link.id,
      ownerId: link.ownerId,
      amount: Number(link.amount || 0),
      fee,
      netAmount,
      currency: link.currency,
      provider,
      status: 'succeeded',
      reference,
      customerName: link.customerName || '',
      customerEmail: link.customerEmail || '',
      metadata: {
        invoiceId: invoice.id,
        providerAmount: amount,
        providerCompletedAt: new Date().toISOString()
      }
    };

    if (existing) {
      await tx.tiwloPayTransaction.update({ where: { id: existing.id }, data });
    } else {
      await tx.tiwloPayTransaction.create({ data });
    }
  });
};

const failTiwloPayInvoice = async (ctx, invoice, { provider, reference, message }) => {
  if (invoice.scope !== 'tiwlo_pay' || !invoice.scopeId) return;
  const link = await ctx.prisma.tiwloPayLink.findUnique({ where: { id: invoice.scopeId } });
  if (!link) return;
  await ctx.prisma.$transaction(async (tx) => {
    await tx.tiwloPayLink.update({
      where: { id: link.id },
      data: {
        metadata: {
          ...(link.metadata || {}),
          lastPaymentError: {
            provider,
            reference,
            invoiceId: invoice.id,
            message,
            failedAt: new Date().toISOString()
          }
        }
      }
    });
    if (reference) {
      const existing = await tx.tiwloPayTransaction.findFirst({ where: { linkId: link.id, reference } });
      if (existing) {
        await tx.tiwloPayTransaction.update({
          where: { id: existing.id },
          data: { status: 'failed', metadata: { ...(existing.metadata || {}), failureMessage: message } }
        });
      }
    }
  });
};

const safeMerchantReturnUrl = (value) => {
  try {
    const url = new URL(String(value || '').trim());
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    if (['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'].includes(url.hostname.toLowerCase())) return null;
    return url;
  } catch {
    return null;
  }
};

const tiwloPayRedirectUrl = (link, { status, provider, invoiceId, message }) => {
  const metadata = link?.metadata || {};
  const merchantTarget = status === 'success'
    ? metadata.successUrl
    : metadata.cancelUrl || metadata.successUrl;
  const url = safeMerchantReturnUrl(merchantTarget) || new URL(`/pay/${link.slug}`, frontendBaseUrl());
  url.searchParams.set('payment', status);
  url.searchParams.set('provider', provider);
  url.searchParams.set('invoice', invoiceId);
  url.searchParams.set('tiwloPayLink', link.id);
  url.searchParams.set('slug', link.slug);
  if (message) url.searchParams.set('message', message);
  return url.toString();
};

const providerReturnPayload = async (ctx, { invoiceId, status, provider, message }) => {
  const invoice = invoiceId ? await ctx.prisma.invoice.findUnique({ where: { id: invoiceId } }) : null;
  if (invoice?.scope === 'tiwlo_pay' && invoice.scopeId) {
    const link = await ctx.prisma.tiwloPayLink.findUnique({ where: { id: invoice.scopeId } });
    if (link?.slug) {
      return {
        status,
        invoiceId: invoice.id,
        provider,
        message,
        redirectUrl: tiwloPayRedirectUrl(link, { status, provider, invoiceId: invoice.id, message })
      };
    }
  }
  return { status, invoiceId, provider, message };
};

const completeInvoicePayment = async (ctx, { invoiceId, provider, reference, amount }) => {
  const result = await ctx.prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new AppError('Invoice was not found', 'NOT_FOUND');
    if (invoice.status === 'paid') return { invoice, resource: null };

    await createOrUpdatePayment(tx, {
      invoice,
      provider,
      reference,
      status: 'succeeded',
      amount
    });
    return fulfillPaidInvoice(tx, invoice);
  });

  await completeTiwloPayInvoice(ctx, result.invoice, { provider, reference, amount });
  await runCreditAutomationForOwner(ctx, result.invoice.ownerId);
  await notifyDiscordInvoiceEvent(ctx, 'paid', result.invoice, { provider, reference, amount, message: `${result.invoice.number} was paid via ${provider}.` });
  return result;
};

const failInvoicePayment = async (ctx, { invoiceId, provider, reference, message }) => {
  const invoice = await ctx.prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new AppError('Invoice was not found', 'NOT_FOUND');
  await ctx.prisma.$transaction(async (tx) => {
    await createOrUpdatePayment(tx, { invoice, provider, reference, status: 'failed' });
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'payment_failed',
        items: {
          ...(invoice.items || {}),
          lastPaymentError: message || 'Payment failed',
          lastPaymentProvider: provider,
          lastPaymentReference: reference
        }
      }
    });
  });
  await failTiwloPayInvoice(ctx, invoice, { provider, reference, message });
  await notifyDiscordInvoiceEvent(ctx, 'failed', invoice, { provider, reference, message });
  return { invoiceId, status: 'failed', provider, message };
};

const checkoutResponse = async (ctx, payload) => {
  const ownerId = payload.invoice?.ownerId || payload.ownerId;
  const owner = ownerId ? await ctx.prisma.user.findUnique({ where: { id: ownerId } }) : null;
  return toApi({
    status: payload.status,
    provider: payload.provider,
    paymentUrl: payload.paymentUrl,
    reference: payload.reference,
    message: payload.message,
    creditBalance: owner?.credits || 0,
    hourlyRate: payload.hourlyRate,
    monthlyCost: payload.monthlyCost,
    invoice: payload.invoice,
    resource: payload.resource
  });
};

export const createProviderCheckout = async (ctx, invoice, provider, actor) => {
  const gateway = await findGateway(ctx, provider);
  const session = provider === 'stripe'
    ? await createStripeCheckout({ invoice, gateway, actor })
    : provider === 'paypal'
      ? await createPaypalOrder({ invoice, gateway, actor })
      : await createBkashPayment({ invoice, gateway, actor });

  await ctx.prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      amount: Number(invoice.amount || 0),
      provider,
      reference: session.reference,
      status: 'pending'
    }
  });

  await ctx.prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: invoice.status === 'payment_failed' ? 'open' : invoice.status,
      items: {
        ...(invoice.items || {}),
        lastCheckout: {
          provider,
          reference: session.reference,
          settlement: session.settlement,
          createdAt: new Date().toISOString()
        }
      }
    }
  });

  return { ...session, invoice };
};

export const listInvoices = async (ctx, { scope, status, page, limit } = {}) => {
  const scoped = await ownerWhere(ctx);
  return toApi(await ctx.prisma.invoice.findMany({
    where: { ...scoped, ...removeUndefined({ scope, status }) },
    orderBy: { createdAt: 'desc' },
    ...pagination({ page, limit })
  }));
};

export const listPaymentGateways = async (ctx, status) => {
  await ensureDefaultPaymentGateways(ctx);
  const gateways = await ctx.prisma.paymentGateway.findMany({
    where: status ? { status } : {},
    orderBy: { name: 'asc' }
  });
  return toApi(gateways.map(safeGateway));
};

export const listAvailablePaymentGateways = async (ctx) => {
  await ensureDefaultPaymentGateways(ctx);
  const gateways = await ctx.prisma.paymentGateway.findMany({
    where: { status: { in: ['enabled', 'active'] }, provider: { in: PAYMENT_PROVIDERS } },
    orderBy: { name: 'asc' }
  });
  return toApi(gateways.map((gateway) => ({ ...gateway, credentials: null })));
};

export const upsertPaymentGateway = async (ctx, input) => {
  const existing = await ctx.prisma.paymentGateway.findUnique({ where: { key: input.key } });
  const incomingCredentials = input.credentials === undefined ? undefined : sanitizeCredentials(input.credentials);
  const nextCredentials = incomingCredentials === undefined
    ? undefined
    : { ...(existing?.credentials || {}), ...incomingCredentials };

  const gateway = await ctx.prisma.paymentGateway.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      name: input.name,
      provider: input.provider,
      status: input.status,
      mode: input.mode || 'test',
      credentials: incomingCredentials || {},
      settings: input.settings || {}
    },
    update: removeUndefined({
      name: input.name,
      provider: input.provider,
      status: input.status,
      mode: input.mode,
      credentials: nextCredentials,
      settings: input.settings
    })
  });
  clearPaymentProviderCache(gateway);
  await writeAudit(ctx, 'upsert_payment_gateway', 'paymentGateway', gateway.id, { key: input.key });
  return toApi(safeGateway(gateway));
};

export const testPaymentGateway = async (ctx, key) => {
  const gateway = await ctx.prisma.paymentGateway.findUnique({ where: { key } });
  if (!gateway) throw new AppError('Payment gateway was not found', 'NOT_FOUND');
  clearPaymentProviderCache(gateway);
  const result = await testPaymentGatewayConnection(gateway);
  await writeAudit(ctx, 'test_payment_gateway', 'paymentGateway', gateway.id, {
    key,
    ok: result.ok,
    provider: gateway.provider,
    mode: gateway.mode
  });
  return toApi({
    ...result,
    key: gateway.key,
    credentials: credentialStatus(gateway)
  });
};

export const createInvoice = async (ctx, input) => {
  if (input.scope === 'isp') {
    const invoice = await ctx.prisma.ispInvoice.create({
      data: {
        siteId: input.siteId,
        number: input.number,
        clientName: input.clientName || 'ISP Client',
        amount: input.amount,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        items: input.items
      }
    });
    await writeAudit(ctx, 'create_isp_invoice', 'ispInvoice', invoice.id);
    return toApi({
      id: invoice.id,
      ownerId: input.ownerId || '',
      number: invoice.number,
      amount: invoice.amount,
      currency: input.currency || 'USD',
      status: invoice.status,
      scope: 'isp',
      scopeId: input.siteId,
      items: invoice.items,
      dueDate: invoice.dueDate,
      paidAt: null,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt
    });
  }

  const actor = await getActor(ctx);
  const invoice = await ctx.prisma.invoice.create({
    data: {
      ownerId: input.ownerId || actor.id,
      number: input.number,
      amount: input.amount,
      currency: input.currency || 'USD',
      scope: input.scope,
      scopeId: input.scopeId,
      items: input.items,
      dueDate: input.dueDate ? new Date(input.dueDate) : null
    }
  });
  await writeAudit(ctx, 'create_invoice', 'invoice', invoice.id, { scope: input.scope });
  await notifyBillingEvent(ctx, invoice, 'New invoice created', `${invoice.number} is ready for ${moneyLabel(invoice.amount, invoice.currency)}.`);
  return toApi(invoice);
};

export const markInvoicePaid = async (ctx, id) => {
  const current = await ctx.prisma.invoice.findUnique({ where: { id } });
  if (!current) throw new AppError('Invoice was not found', 'NOT_FOUND');
  const { invoice } = await completeInvoicePayment(ctx, {
    invoiceId: id,
    provider: 'manual',
    reference: `manual_${Date.now()}`,
    amount: current.amount
  });
  await writeAudit(ctx, 'mark_invoice_paid', 'invoice', id);
  return toApi(invoice);
};

export const billingOverview = async (ctx) => {
  const actor = await getActor(ctx);
  if (!actor) throw new AppError('Authentication is required', 'UNAUTHENTICATED');

  const scoped = isAdmin(actor) ? {} : { ownerId: actor.id };
  const [freshActor, invoices, resources] = await Promise.all([
    ctx.prisma.user.findUnique({ where: { id: actor.id } }),
    ctx.prisma.invoice.findMany({ where: scoped, orderBy: { createdAt: 'desc' } }),
    ctx.prisma.cloudResource.findMany({
      where: isAdmin(actor) ? { status: { notIn: ['deleted', 'destroyed', 'archived', 'off', 'suspended'] }, monthlyCost: { gt: 0 } } : activeResourcesWhere(actor.id)
    })
  ]);

  const activeResources = resources.filter((resource) => !['deleted', 'destroyed', 'archived', 'off', 'suspended'].includes(String(resource.status || '').toLowerCase()));
  const monthlySpend = roundMoney(activeResources.reduce((sum, resource) => sum + Number(resource.monthlyCost || 0), 0));
  const hourlySpend = roundMoney(activeResources.reduce((sum, resource) => sum + hourlyRateFor(resource.monthlyCost || 0), 0));
  const usageLines = activeResources.map((resource) => usageForResource(resource)).filter((line) => line.amount > 0);
  const accruedUsage = roundMoney(usageLines.reduce((sum, line) => sum + line.amount, 0));
  const outstanding = roundMoney(invoices
    .filter((invoice) => invoice.status !== 'paid')
    .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0));
  const creditBalance = Number(freshActor?.credits || 0);

  return toApi({
    credits: creditBalance,
    monthlySpend,
    hourlySpend,
    accruedUsage,
    outstanding,
    dueAmount: roundMoney(Math.max(0, outstanding + accruedUsage - creditBalance)),
    projectedMonthly: monthlySpend,
    usageLines,
    invoices
  });
};

export const settleUsageBilling = async (ctx) => {
  const actor = await getActor(ctx);
  if (!actor) throw new AppError('Authentication is required', 'UNAUTHENTICATED');
  const owner = await ctx.prisma.user.findUnique({ where: { id: actor.id } });
  const resources = await ctx.prisma.cloudResource.findMany({ where: activeResourcesWhere(actor.id) });
  const now = new Date();
  const usageLines = resources.map((resource) => usageForResource(resource, now)).filter((line) => line.amount >= 0.01);
  const total = roundMoney(usageLines.reduce((sum, line) => sum + line.amount, 0));

  if (Number(owner?.credits || 0) <= 0) {
    await runCreditAutomationForOwner(ctx, actor.id);
  }

  if (total < 0.01) return billingOverview(ctx);

  if (Number(owner?.credits || 0) < total) {
    const existing = await ctx.prisma.invoice.findFirst({
      where: { ownerId: actor.id, scope: 'usage', status: { in: ['open', 'payment_failed'] } },
      orderBy: { createdAt: 'desc' }
    });
    const items = {
      lineItems: usageLines.map((line) => ({
        label: `${line.name} usage`,
        amount: line.amount,
        hours: line.hours,
        hourlyRate: line.hourlyRate
      })),
      billing: { type: 'hourly_usage', generatedAt: now.toISOString() }
    };
    if (existing) {
      await ctx.prisma.invoice.update({
        where: { id: existing.id },
        data: { amount: total, items, status: 'open' }
      });
    } else {
      await ctx.prisma.invoice.create({
        data: {
          ownerId: actor.id,
          number: invoiceNumber('USAGE'),
          amount: total,
          currency: 'USD',
          status: 'open',
          scope: 'usage',
          items,
          dueDate: now
        }
      });
    }
    if (Number(owner?.credits || 0) <= 0) {
      await runCreditAutomationForOwner(ctx, actor.id);
    }
    return billingOverview(ctx);
  }

  await ctx.prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: actor.id }, data: { credits: { decrement: total } } });
    const invoice = await tx.invoice.create({
      data: {
        ownerId: actor.id,
        number: invoiceNumber('USAGE'),
        amount: total,
        currency: 'USD',
        status: 'paid',
        scope: 'usage',
        paidAt: now,
        items: {
          lineItems: usageLines.map((line) => ({
            label: `${line.name} usage`,
            amount: line.amount,
            hours: line.hours,
            hourlyRate: line.hourlyRate
          })),
          billing: { type: 'hourly_usage', generatedAt: now.toISOString() }
        }
      }
    });
    await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: total,
        provider: 'credits',
        reference: `usage_${now.getTime()}`,
        status: 'succeeded'
      }
    });
    await Promise.all(resources.map((resource) => tx.cloudResource.update({
      where: { id: resource.id },
      data: {
        metadata: {
          ...(resource.metadata || {}),
          billing: {
            ...billingMetadata(resource),
            lastBilledAt: now.toISOString(),
            lastUsageInvoiceId: invoice.id
          }
        }
      }
    })));
  });

  await runCreditAutomationForOwner(ctx, actor.id);
  return billingOverview(ctx);
};

export const startInvoicePayment = async (ctx, { invoiceId, provider }) => {
  const normalizedProvider = String(provider || 'credit').toLowerCase();
  const invoice = await ctx.prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new AppError('Invoice was not found', 'NOT_FOUND');
  const actor = await canUseInvoice(ctx, invoice);

  if (invoice.status === 'paid') {
    return checkoutResponse(ctx, {
      status: 'paid',
      provider: normalizedProvider,
      invoice,
      message: 'Invoice is already paid.'
    });
  }

  if (normalizedProvider === 'credit' || normalizedProvider === 'credits') {
    if (invoice.scope === 'credit_topup') {
      throw new AppError('Credit top-up invoices must be paid with an external gateway', 'BAD_USER_INPUT');
    }
    const owner = await ctx.prisma.user.findUnique({ where: { id: invoice.ownerId } });
    const creditCharge = await invoiceCreditAmountForCtx(ctx, invoice);
    if (Number(owner?.credits || 0) < creditCharge) {
      return checkoutResponse(ctx, {
        status: 'requires_payment',
        provider: 'credit',
        invoice,
        message: `Insufficient credit balance. Add credit before paying this ${invoice.currency || CREDIT_CURRENCY} invoice.`
      });
    }

    const result = await ctx.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: invoice.ownerId }, data: { credits: { decrement: creditCharge } } });
      await createOrUpdatePayment(tx, {
        invoice,
        provider: 'credits',
        reference: `credit_${Date.now()}`,
        status: 'succeeded',
        amount: invoice.amount
      });
      return fulfillPaidInvoice(tx, {
        ...invoice,
        items: {
          ...(invoice.items || {}),
          creditCharge,
          creditCurrency: CREDIT_CURRENCY
        }
      });
    });
    await runCreditAutomationForOwner(ctx, invoice.ownerId);
    await writeAudit(ctx, 'pay_invoice_with_credits', 'invoice', invoice.id, { actorId: actor?.id });
    return checkoutResponse(ctx, {
      status: 'paid',
      provider: 'credit',
      invoice: result.invoice,
      resource: result.resource,
      message: 'Paid from credit balance.'
    });
  }

  const session = await createProviderCheckout(ctx, invoice, normalizedProvider, actor);
  await writeAudit(ctx, 'start_invoice_payment', 'invoice', invoice.id, { provider: normalizedProvider });
  return checkoutResponse(ctx, {
    status: 'redirect',
    provider: normalizedProvider,
    invoice,
    paymentUrl: session.paymentUrl,
    reference: session.reference,
    message: `Redirecting to ${normalizedProvider}.`
  });
};

export const startCreditTopUp = async (ctx, input) => {
  const actor = await getActor(ctx);
  if (!actor) throw new AppError('Authentication is required', 'UNAUTHENTICATED');
  const amount = roundMoney(input.amount);
  if (amount <= 0) throw new AppError('Top-up amount must be greater than zero', 'BAD_USER_INPUT');
  const currency = String(input.currency || CREDIT_CURRENCY).toUpperCase();
  const creditAmount = await convertMoneyForCtx(ctx, amount, currency, CREDIT_CURRENCY);

  const invoice = await ctx.prisma.invoice.create({
    data: {
      ownerId: actor.id,
      number: invoiceNumber('CR'),
      amount,
      currency,
      status: 'open',
      scope: 'credit_topup',
      dueDate: new Date(),
      items: {
        lineItems: [{ label: 'Tiwlo credit top-up', amount, currency }],
        creditTopUp: true,
        creditAmount,
        creditCurrency: CREDIT_CURRENCY
      }
    }
  });
  await writeAudit(ctx, 'create_credit_topup', 'invoice', invoice.id, { provider: input.provider });
  await notifyBillingEvent(ctx, invoice, 'Credit top-up started', `${invoice.number} was created for ${moneyLabel(amount, currency)}.`, '/billing');
  return startInvoicePayment(ctx, { invoiceId: invoice.id, provider: input.provider || 'bkash' });
};

export const startSignupPromoVerification = async (ctx, input = {}) => {
  const actor = await getActor(ctx);
  if (!actor) throw new AppError('Authentication is required', 'UNAUTHENTICATED');
  const policy = await getAccountCreditPolicy(ctx.prisma);
  const promoCreditAmount = Number(policy.creditSystemEnabled ? policy.signupPromoCredit : 0);
  if (!policy.creditSystemEnabled || promoCreditAmount <= 0) {
    throw new AppError('Signup credit is currently disabled.', 'BAD_USER_INPUT');
  }
  if (actor.promoCreditStatus === 'active') {
    throw new AppError('Free signup credit is already active on this account.', 'BAD_USER_INPUT');
  }
  if (actor.promoCreditStatus !== 'pending') {
    throw new AppError('Free signup credit was not selected for this account.', 'BAD_USER_INPUT');
  }

  if (policy.signupPromoRequiresPayment === false) {
    const paidAt = new Date();
    const expiresAt = addDays(paidAt, SIGNUP_PROMO_DAYS);
    const updated = await ctx.prisma.user.update({
      where: { id: actor.id },
      data: {
        credits: { increment: promoCreditAmount },
        promoCreditAmount,
        promoCreditExpiresAt: expiresAt,
        promoCreditStatus: 'active',
        promoCreditSource: 'signup_direct_credit',
        promoPaymentMethod: null,
        promoVerifiedAt: paidAt
      }
    });
    await writeAudit(ctx, 'activate_signup_promo_credit', 'user', actor.id, { promoCreditAmount, source: 'no_payment_required' });
    return {
      status: 'paid',
      provider: 'system',
      paymentUrl: null,
      reference: `signup_credit_${Date.now()}`,
      message: 'Signup credit activated without payment verification.',
      creditBalance: Number(updated.credits || 0),
      invoice: null,
      resource: null
    };
  }

  const provider = String(input.provider || actor.promoPaymentMethod || '').trim().toLowerCase();
  if (!PAYMENT_PROVIDERS.includes(provider)) {
    throw new AppError('Choose a valid payment method for free credit verification.', 'BAD_USER_INPUT');
  }
  const holdAmount = Math.max(0.01, await getSignupPromoHoldAmount(ctx.prisma));
  const existingInvoice = await ctx.prisma.invoice.findFirst({
    where: {
      ownerId: actor.id,
      scope: SIGNUP_PROMO_SCOPE,
      status: 'open'
    },
    orderBy: { createdAt: 'desc' }
  });
  if (existingInvoice) {
    await ctx.prisma.invoice.update({
      where: { id: existingInvoice.id },
      data: {
        amount: holdAmount,
        items: {
          ...(existingInvoice.items || {}),
          promoPaymentMethod: provider,
          verificationHoldAmount: holdAmount,
          verificationHoldCurrency: CREDIT_CURRENCY
        }
      }
    });
    await ctx.prisma.user.update({
      where: { id: actor.id },
      data: {
        promoPaymentMethod: provider,
        promoCreditAmount
      }
    });
    return startInvoicePayment(ctx, { invoiceId: existingInvoice.id, provider });
  }

  const invoice = await ctx.prisma.invoice.create({
    data: {
      ownerId: actor.id,
      number: invoiceNumber('VRF'),
      amount: holdAmount,
      currency: CREDIT_CURRENCY,
      status: 'open',
      scope: SIGNUP_PROMO_SCOPE,
      dueDate: new Date(),
      items: {
        signupPromoVerification: true,
        lineItems: [{
          label: 'Payment method verification hold',
          amount: holdAmount,
          currency: CREDIT_CURRENCY
        }],
        promoCreditAmount,
        promoCreditCurrency: CREDIT_CURRENCY,
        promoCreditDays: SIGNUP_PROMO_DAYS,
        promoPaymentMethod: provider,
        verificationHoldAmount: holdAmount,
        verificationHoldCurrency: CREDIT_CURRENCY,
        refundNotice: 'This verification hold is marked for return after payment method verification.'
      }
    }
  });

  await ctx.prisma.user.update({
    where: { id: actor.id },
    data: {
      promoCreditAmount,
      promoCreditStatus: 'pending',
      promoCreditSource: 'signup_payment_verification',
      promoPaymentMethod: provider
    }
  });
  await writeAudit(ctx, 'start_signup_promo_verification', 'invoice', invoice.id, { provider, promoCreditAmount });
  await notifyBillingEvent(ctx, invoice, 'Signup credit verification started', `${invoice.number} was created for payment method verification.`, '/billing');
  return startInvoicePayment(ctx, { invoiceId: invoice.id, provider });
};

export const skipSignupPromoCredit = async (ctx) => {
  const actor = await getActor(ctx);
  if (!actor) throw new AppError('Authentication is required', 'UNAUTHENTICATED');
  if (actor.promoCreditStatus === 'active') {
    throw new AppError('Free signup credit is already active on this account.', 'BAD_USER_INPUT');
  }

  const user = await ctx.prisma.$transaction(async (tx) => {
    await tx.invoice.updateMany({
      where: {
        ownerId: actor.id,
        scope: SIGNUP_PROMO_SCOPE,
        status: { in: ['open', 'payment_failed'] }
      },
      data: { status: 'void' }
    });
    return tx.user.update({
      where: { id: actor.id },
      data: {
        promoCreditAmount: 0,
        promoCreditExpiresAt: null,
        promoCreditStatus: 'skipped',
        promoCreditSource: 'signup_skip',
        promoPaymentMethod: null
      }
    });
  });
  await writeAudit(ctx, 'skip_signup_promo_credit', 'user', actor.id);
  return toApi(user);
};

const createCloudOrderInvoice = async (ctx, actor, resourceInput, billing) => {
  const amount = roundMoney(billing.initialCharge);
  const currency = normalizeCurrencyCode(billing.currency || CREDIT_CURRENCY, CREDIT_CURRENCY);
  const creditAmount = roundMoney(billing.creditAmount ?? await convertMoneyForCtx(ctx, amount, currency, CREDIT_CURRENCY));
  const displayMonthlyCost = roundMoney(billing.displayMonthlyCost ?? billing.monthlyCost);
  const displayHourlyRate = roundMoney(billing.displayHourlyRate ?? billing.hourlyRate);
  const invoice = await ctx.prisma.invoice.create({
    data: {
      ownerId: actor.id,
      number: invoiceNumber('CLD'),
      amount,
      currency,
      status: 'open',
      scope: 'cloud_order',
      dueDate: new Date(),
      items: {
        creditAmount,
        creditCurrency: CREDIT_CURRENCY,
        lineItems: [{
          label: `${resourceInput.name} first usage charge`,
          amount,
          monthlyCost: displayMonthlyCost,
          hourlyRate: displayHourlyRate,
          creditAmount,
          creditCurrency: CREDIT_CURRENCY
        }],
        billing: {
          type: 'hourly_monthly_cap',
          monthlyCost: displayMonthlyCost,
          hourlyRate: displayHourlyRate,
          initialCharge: amount,
          baseCurrency: CREDIT_CURRENCY,
          baseMonthlyCost: billing.monthlyCost,
          baseHourlyRate: billing.hourlyRate,
          creditAmount,
          creditCurrency: CREDIT_CURRENCY
        },
        pendingResource: {
          ...resourceInput,
          billing: {
            monthlyCost: billing.monthlyCost,
            hourlyRate: billing.hourlyRate,
            initialCharge: creditAmount,
            displayCurrency: currency,
            displayInitialCharge: amount,
            displayMonthlyCost,
            displayHourlyRate
          }
        }
      }
    }
  });
  await notifyBillingEvent(ctx, invoice, 'Cloud order invoice created', `${resourceInput.name} is waiting for payment.`, '/billing');
  return invoice;
};

export const createCloudResourceOrder = async (ctx, input) => {
  const actor = await getActor(ctx);
  if (!actor) throw new AppError('Authentication is required', 'UNAUTHENTICATED');
  await ensureOwnerHasCredit(ctx, actor.id, 'Credit balance is empty. Add credit now before placing cloud resource orders.');
  const resourceInput = input.resource;
  const provider = String(input.provider || 'credit').toLowerCase();
  const currency = normalizeCurrencyCode(input.currency || 'USD', 'USD');
  const monthlyCost = roundMoney(resourceInput.monthlyCost || 0);
  const hourlyRate = roundMoney(
    currency === CREDIT_CURRENCY && input.hourlyRate
      ? input.hourlyRate
      : resourceInput.metadata?.billing?.baseHourlyRate || resourceInput.metadata?.billing?.hourlyRate || hourlyRateFor(monthlyCost)
  );
  const displayHourlyRate = roundMoney(
    currency === CREDIT_CURRENCY
      ? hourlyRate
      : input.hourlyRate || await convertMoneyForCtx(ctx, hourlyRate, CREDIT_CURRENCY, currency)
  );
  const displayMonthlyCost = roundMoney(
    currency === CREDIT_CURRENCY
      ? monthlyCost
      : await convertMoneyForCtx(ctx, monthlyCost, CREDIT_CURRENCY, currency)
  );
  const initialCharge = roundMoney(
    input.initialCharge || resourceInput.metadata?.billing?.displayInitialCharge || Math.max(displayHourlyRate, currency === CREDIT_CURRENCY ? 0.01 : await convertMoneyForCtx(ctx, 0.01, CREDIT_CURRENCY, currency))
  );
  const creditCharge = roundMoney(await convertMoneyForCtx(ctx, initialCharge, currency, CREDIT_CURRENCY));

  if (monthlyCost <= 0 || creditCharge <= 0) {
    const resource = await ctx.prisma.$transaction((tx) => createBillingResource(tx, actor.id, {
      ...resourceInput,
      billing: { monthlyCost, hourlyRate, initialCharge: creditCharge }
    }, { id: null, amount: 0 }, new Date()));
    await writeAudit(ctx, 'create_free_cloud_order', 'cloudResource', resource.id);
    return checkoutResponse(ctx, {
      status: 'paid',
      provider: 'free',
      resource,
      ownerId: actor.id,
      monthlyCost,
      hourlyRate,
      message: 'Free resource created.'
    });
  }

  const invoice = await createCloudOrderInvoice(ctx, actor, resourceInput, {
    monthlyCost,
    hourlyRate,
    displayMonthlyCost,
    displayHourlyRate,
    initialCharge,
    creditAmount: creditCharge,
    currency
  });

  if (provider === 'credit' || provider === 'credits') {
    const owner = await ctx.prisma.user.findUnique({ where: { id: actor.id } });
    if (Number(owner?.credits || 0) < creditCharge) {
      await writeAudit(ctx, 'cloud_order_requires_credit', 'invoice', invoice.id, { monthlyCost, hourlyRate, creditCharge, currency });
      return checkoutResponse(ctx, {
        status: 'requires_payment',
        provider: 'credit',
        invoice,
        monthlyCost,
        hourlyRate,
        message: 'Insufficient credit balance. Add credit or pay this invoice from bKash, Stripe, or PayPal.'
      });
    }
    const paid = await startInvoicePayment(ctx, { invoiceId: invoice.id, provider: 'credit' });
    return { ...paid, monthlyCost, hourlyRate };
  }

  const checkout = await startInvoicePayment(ctx, { invoiceId: invoice.id, provider });
  return { ...checkout, monthlyCost, hourlyRate };
};

export const syncCreditAutomation = async (ctx, input = {}) => {
  const actor = await getActor(ctx);
  if (!actor) throw new AppError('Authentication is required', 'UNAUTHENTICATED');

  const requestedOwnerId = input?.ownerId;
  if (requestedOwnerId && !isAdmin(actor) && requestedOwnerId !== actor.id) {
    throw new AppError('You cannot run credit automation for this account', 'FORBIDDEN');
  }

  const result = await runCreditAutomationJob(ctx, {
    ownerId: requestedOwnerId || (isAdmin(actor) ? undefined : actor.id)
  });
  await writeAudit(ctx, 'run_credit_automation', 'billing', requestedOwnerId || 'all', {
    owners: result.owners,
    suspended: result.suspended,
    resumed: result.resumed
  });
  return toApi(result);
};

export const handleStripeReturn = async (prisma, { invoiceId, session_id: sessionId }) => {
  const ctx = { prisma, user: null };
  const gateway = await findGateway(ctx, 'stripe', { allowDisabled: true });
  const session = await retrieveStripeSession(gateway, sessionId);
  if (session.payment_status === 'paid' || session.status === 'complete') {
    await completeInvoicePayment(ctx, {
      invoiceId: invoiceId || session.metadata?.invoiceId,
      provider: 'stripe',
      reference: session.id,
      amount: Number(session.amount_total || 0) / 100
    });
    return providerReturnPayload(ctx, { status: 'success', invoiceId: invoiceId || session.metadata?.invoiceId, provider: 'stripe' });
  }
  await failInvoicePayment(ctx, {
    invoiceId: invoiceId || session.metadata?.invoiceId,
    provider: 'stripe',
    reference: session.id,
    message: session.payment_status || session.status
  });
  return providerReturnPayload(ctx, { status: 'failed', invoiceId: invoiceId || session.metadata?.invoiceId, provider: 'stripe', message: session.payment_status || session.status });
};

export const handleStripeWebhook = async (prisma, rawBody, signatureHeader) => {
  const ctx = { prisma, user: null };
  const gateway = await findGateway(ctx, 'stripe', { allowDisabled: true });
  const event = parseStripeWebhook(gateway, rawBody, signatureHeader);
  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object || {};
    if (session.metadata?.invoiceId) {
      await completeInvoicePayment(ctx, {
        invoiceId: session.metadata.invoiceId,
        provider: 'stripe',
        reference: session.id,
        amount: Number(session.amount_total || 0) / 100
      });
    }
  }
  return { received: true };
};

export const handlePaypalReturn = async (prisma, { invoiceId, token }) => {
  const ctx = { prisma, user: null };
  const gateway = await findGateway(ctx, 'paypal', { allowDisabled: true });
  const capture = await capturePaypalOrder(gateway, token, invoiceId);
  if (capture.status === 'COMPLETED') {
    await completeInvoicePayment(ctx, {
      invoiceId,
      provider: 'paypal',
      reference: token,
      amount: capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value
    });
    return providerReturnPayload(ctx, { status: 'success', invoiceId, provider: 'paypal' });
  }
  await failInvoicePayment(ctx, {
    invoiceId,
    provider: 'paypal',
    reference: token,
    message: capture.status || 'PayPal capture failed'
  });
  return providerReturnPayload(ctx, { status: 'failed', invoiceId, provider: 'paypal', message: capture.status || 'PayPal capture failed' });
};

export const handleBkashCallback = async (prisma, query) => {
  const ctx = { prisma, user: null };
  const { invoiceId, paymentID, status } = query;
  if (status !== 'success') {
    await failInvoicePayment(ctx, {
      invoiceId,
      provider: 'bkash',
      reference: paymentID,
      message: status || 'bKash payment was not successful'
    });
    return providerReturnPayload(ctx, { status: 'failed', invoiceId, provider: 'bkash', message: status });
  }

  const gateway = await findGateway(ctx, 'bkash', { allowDisabled: true });
  const executed = await executeBkashPayment(gateway, paymentID);
  if (executed.statusCode === '0000' || String(executed.transactionStatus || '').toLowerCase() === 'completed') {
    await completeInvoicePayment(ctx, {
      invoiceId,
      provider: 'bkash',
      reference: paymentID,
      amount: executed.amount
    });
    return providerReturnPayload(ctx, { status: 'success', invoiceId, provider: 'bkash' });
  }
  await failInvoicePayment(ctx, {
    invoiceId,
    provider: 'bkash',
    reference: paymentID,
    message: executed.statusMessage || executed.transactionStatus || 'bKash execute payment failed'
  });
  return providerReturnPayload(ctx, { status: 'failed', invoiceId, provider: 'bkash', message: executed.statusMessage });
};

export const paymentRedirectUrl = (result) => result.redirectUrl || paymentResultUrl(result.status, result.invoiceId, result.provider, result.message);
