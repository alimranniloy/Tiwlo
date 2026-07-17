import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { writeAudit } from '../../core/audit.js';
import { requireAdmin, requireAuth } from '../../core/auth.js';
import { AppError, notFound } from '../../core/errors.js';
import { removeUndefined, slugify, toApi } from '../../core/format.js';
import { createProviderCheckout, ensureDefaultPaymentGateways } from '../billing/service.js';
import { PAYMENT_PROVIDERS, roundMoney } from '../billing/paymentProviders.js';

const enabledGatewayStatuses = ['enabled', 'active'];
const profileStatuses = new Set(['active', 'inactive', 'suspended']);
const withdrawalStatuses = new Set(['pending', 'processing', 'paid', 'completed', 'rejected', 'cancelled']);

const localHostnames = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);
const openWithdrawalStatuses = new Set(['pending', 'processing']);
const terminalWithdrawalStatuses = new Set(['paid', 'completed', 'rejected', 'cancelled']);
const minimumAutoWithdrawalAmount = 50;
let autoWithdrawalTimer = null;

const firstHeaderValue = (value) => (Array.isArray(value) ? value[0] : value || '');

const splitFirst = (value = '') => String(value || '').split(',')[0]?.trim() || '';

const originHost = (value = '') => {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return '';
  }
};

const isLocalUrl = (value = '') => {
  const hostname = originHost(value);
  return hostname ? localHostnames.has(hostname) : false;
};

const cleanBaseUrl = (value = '') => String(value || '').trim().replace(/\/+$/, '');

const publicBaseUrl = (ctx = {}) => {
  const configured = cleanBaseUrl(
    process.env.PUBLIC_APP_URL ||
    process.env.FRONTEND_ORIGIN ||
    process.env.APP_URL
  );
  if (configured && !isLocalUrl(configured)) return configured;

  const headers = ctx.requestHeaders || {};
  const origin = cleanBaseUrl(splitFirst(firstHeaderValue(headers.origin)));
  if (origin && !isLocalUrl(origin)) return origin;

  const host = splitFirst(
    firstHeaderValue(headers['x-forwarded-host']) ||
    firstHeaderValue(headers['x-original-host']) ||
    firstHeaderValue(headers.host)
  );
  const hostname = host.replace(/:\d+$/, '').replace(/^\[|\]$/g, '').toLowerCase();
  if (host && !localHostnames.has(hostname)) {
    const proto = splitFirst(firstHeaderValue(headers['x-forwarded-proto'])) || 'https';
    return `${proto}://${host}`.replace(/\/+$/, '');
  }

  return 'https://tiwlo.com';
};

const publicUrlFor = (link, ctx) => (link?.slug ? `${publicBaseUrl(ctx)}/pay/${link.slug}` : null);

const cleanText = (value, fallback = '') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const normalizeCurrency = (value = 'USD') => cleanText(value, 'USD').toUpperCase().slice(0, 8);

const normalizeProvider = (value) => cleanText(value).toLowerCase();

const normalizeDescriptor = (value) => {
  const text = cleanText(value, 'TIWLOPAY')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .slice(0, 22)
    .trim();
  return text || 'TIWLOPAY';
};

const generateApiKey = () => `twpk_${crypto.randomBytes(18).toString('hex')}`;

const generateSecretKey = () => `twsk_${crypto.randomBytes(30).toString('hex')}`;

const previewSecret = (secret) => `****${String(secret || '').slice(-8)}`;

const txReference = () => `tw_tx_${Date.now().toString(36)}_${crypto.randomBytes(5).toString('hex')}`;

const paymentInvoiceNumber = (link) => `TWPAY-${String(link.invoiceId || Date.now()).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 34)}-${Date.now().toString(36).toUpperCase()}`;

const gatewayWhere = {
  status: { in: enabledGatewayStatuses },
  provider: { in: PAYMENT_PROVIDERS }
};

const gatewayToApi = (gateway) => toApi({ ...gateway, credentials: null });

const linkToApi = (link, ctx) => toApi({ ...link, publicUrl: publicUrlFor(link, ctx) });

const mapLinks = (links, ctx) => links.map((link) => linkToApi(link, ctx));

const listEnabledGateways = async (ctx) => {
  await ensureDefaultPaymentGateways(ctx);
  const gateways = await ctx.prisma.paymentGateway.findMany({
    where: gatewayWhere,
    orderBy: { name: 'asc' }
  });
  return gateways.map(gatewayToApi);
};

const getEnabledGatewayRows = async (ctx) => {
  await ensureDefaultPaymentGateways(ctx);
  return ctx.prisma.paymentGateway.findMany({
    where: gatewayWhere,
    orderBy: { name: 'asc' }
  });
};

const filterAllowedProviders = (providers, gateways) => {
  const enabled = gateways.map((gateway) => normalizeProvider(gateway.provider || gateway.key));
  const requested = Array.isArray(providers) && providers.length
    ? providers.map(normalizeProvider).filter(Boolean)
    : enabled;
  return [...new Set(requested.filter((provider) => enabled.includes(provider)))];
};

const resolveGateway = async (ctx, provider, allowedProviders = []) => {
  const normalized = normalizeProvider(provider);
  if (!normalized) throw new AppError('Choose a payment gateway', 'BAD_USER_INPUT');

  const gateways = await getEnabledGatewayRows(ctx);
  const gateway = gateways.find((item) => (
    normalizeProvider(item.provider) === normalized || normalizeProvider(item.key) === normalized
  ));
  if (!gateway) throw new AppError('Payment gateway is not enabled by Tiwlo Team', 'PAYMENT_CONFIGURATION_REQUIRED');

  const allowed = Array.isArray(allowedProviders) ? allowedProviders.map(normalizeProvider).filter(Boolean) : [];
  if (allowed.length && !allowed.includes(normalizeProvider(gateway.provider))) {
    throw new AppError('This payment link does not allow the selected gateway', 'BAD_USER_INPUT');
  }
  return gateway;
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError('Invalid expiration date', 'BAD_USER_INPUT');
  return date;
};

const expirationFromInput = (input = {}) => {
  if (input.expiresAt) return parseDate(input.expiresAt);
  const days = Number(input.expiresInDays || 0);
  if (days <= 0) return null;
  const date = new Date();
  date.setDate(date.getDate() + Math.min(days, 365));
  return date;
};

const defaultSettings = () => ({
  paymentLinkExpiryDays: 14,
  feePercent: 2.9,
  feeFixed: 0.3,
  withdrawalMethods: ['bank', 'bkash', 'nagad', 'manual'],
  payoutDestination: null,
  autoWithdrawal: {
    enabled: false,
    minimumAmount: minimumAutoWithdrawalAmount,
    currency: 'BDT',
    method: '',
    destination: null,
    lastRunDate: '',
    lastRequestedAt: null,
    updatedAt: null
  },
  apiAccess: {
    allowedDomains: [],
    allowedIps: []
  },
  verification: {
    status: 'not_submitted',
    legalName: '',
    businessName: '',
    businessType: '',
    documentType: '',
    documentNumber: '',
    country: '',
    address: '',
    website: '',
    contactEmail: '',
    contactPhone: '',
    taxId: '',
    note: '',
    metadata: {},
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    capabilities: {
      paymentLinks: false,
      api: false,
      payouts: false
    }
  }
});

const settingsWithDefaults = (settings = {}) => {
  const base = defaultSettings();
  const incoming = settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {};
  const verification = incoming.verification && typeof incoming.verification === 'object' && !Array.isArray(incoming.verification)
    ? incoming.verification
    : {};
  const capabilities = verification.capabilities && typeof verification.capabilities === 'object' && !Array.isArray(verification.capabilities)
    ? verification.capabilities
    : {};
  const apiAccess = incoming.apiAccess && typeof incoming.apiAccess === 'object' && !Array.isArray(incoming.apiAccess)
    ? incoming.apiAccess
    : {};
  const autoWithdrawal = incoming.autoWithdrawal && typeof incoming.autoWithdrawal === 'object' && !Array.isArray(incoming.autoWithdrawal)
    ? incoming.autoWithdrawal
    : {};

  return {
    ...base,
    ...incoming,
    payoutDestination: incoming.payoutDestination === undefined ? base.payoutDestination : incoming.payoutDestination,
    autoWithdrawal: {
      ...base.autoWithdrawal,
      ...autoWithdrawal,
      minimumAmount: Number(autoWithdrawal.minimumAmount || base.autoWithdrawal.minimumAmount)
    },
    apiAccess: {
      ...base.apiAccess,
      ...apiAccess,
      allowedDomains: Array.isArray(apiAccess.allowedDomains) ? apiAccess.allowedDomains.filter(Boolean) : base.apiAccess.allowedDomains,
      allowedIps: Array.isArray(apiAccess.allowedIps) ? apiAccess.allowedIps.filter(Boolean) : base.apiAccess.allowedIps
    },
    verification: {
      ...base.verification,
      ...verification,
      capabilities: {
        ...base.verification.capabilities,
        ...capabilities
      }
    }
  };
};

const profileWithDefaults = (profile) => (profile ? { ...profile, settings: settingsWithDefaults(profile.settings) } : profile);

const verificationFor = (profile) => settingsWithDefaults(profile?.settings).verification;

const isProfileLive = (profile) => profile?.status === 'active' && verificationFor(profile).status === 'approved';

const requireActiveProfile = (profile, action) => {
  if (isProfileLive(profile)) return;
  if (profile?.status === 'suspended') {
    throw new AppError('Tiwlo Pay is suspended for this account', 'FORBIDDEN');
  }
  throw new AppError(`Tiwlo Pay is inactive. Please verify your ID before using ${action}.`, 'FORBIDDEN');
};

const createProfileData = async (actor, input = {}) => {
  const secretKey = generateSecretKey();
  return {
    ownerId: actor.id,
    displayName: cleanText(input.displayName, actor.name || 'Tiwlo Merchant'),
    companyName: cleanText(input.companyName, ''),
    supportEmail: cleanText(input.supportEmail, actor.email || ''),
    statementDescriptor: normalizeDescriptor(input.statementDescriptor),
    apiKey: generateApiKey(),
    secretHash: await bcrypt.hash(secretKey, 10),
    secretPreview: previewSecret(secretKey),
    status: 'inactive',
    settings: settingsWithDefaults(input.settings)
  };
};

const profileInclude = {
  owner: true
};

const ensureProfile = async (ctx, actor, input = {}) => {
  const profile = await ctx.prisma.tiwloPayProfile.upsert({
    where: { ownerId: actor.id },
    create: await createProfileData(actor, input),
    update: {},
    include: profileInclude
  });
  return profileWithDefaults(profile);
};

const expireLinks = async (ctx, ownerId) => {
  await ctx.prisma.tiwloPayLink.updateMany({
    where: {
      ...(ownerId ? { ownerId } : {}),
      status: 'unpaid',
      expiresAt: { lt: new Date() }
    },
    data: { status: 'expired' }
  });
};

const sumBy = (items, key, filter = () => true) => (
  roundMoney(items.filter(filter).reduce((total, item) => total + Number(item[key] || 0), 0))
);

const buildSummary = ({ links, transactions, withdrawals, merchants = 1 }) => {
  const isAdjustment = (item) => item.provider === 'tiwlo_team_adjustment' || item.metadata?.type === 'wallet_adjustment';
  const succeeded = (item) => item.status === 'succeeded';
  const revenue = (item) => succeeded(item) && !isAdjustment(item);
  const ledger = (item) => succeeded(item) || isAdjustment(item);
  const pendingWithdrawal = (item) => ['pending', 'processing'].includes(item.status);
  const withdrawn = (item) => ['paid', 'completed'].includes(item.status);
  const reserved = (item) => ['pending', 'processing', 'paid', 'completed'].includes(item.status);
  const net = sumBy(transactions, 'netAmount', ledger);
  const reservedWithdrawal = sumBy(withdrawals, 'amount', reserved);

  return {
    balance: roundMoney(net - sumBy(withdrawals, 'amount', withdrawn)),
    grossVolume: sumBy(transactions, 'amount', revenue),
    paidVolume: sumBy(transactions, 'amount', revenue),
    fees: sumBy(transactions, 'fee', revenue),
    availableForWithdrawal: Math.max(0, roundMoney(net - reservedWithdrawal)),
    pendingWithdrawal: sumBy(withdrawals, 'amount', pendingWithdrawal),
    totalWithdrawn: sumBy(withdrawals, 'amount', withdrawn),
    totalLinks: links.length,
    paidInvoices: links.filter((link) => link.status === 'paid').length,
    unpaidInvoices: links.filter((link) => link.status === 'unpaid').length,
    expiredInvoices: links.filter((link) => link.status === 'expired').length,
    transactions: transactions.length,
    merchants
  };
};

const buildChartData = (transactions, days = 10) => {
  const rows = [];
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - offset);
    const next = new Date(date);
    next.setDate(date.getDate() + 1);
    const items = transactions.filter((transaction) => {
      const createdAt = new Date(transaction.createdAt);
      return createdAt >= date && createdAt < next;
    });
    rows.push({
      name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      volume: sumBy(items, 'amount', (item) => item.status === 'succeeded'),
      fees: sumBy(items, 'fee', (item) => item.status === 'succeeded'),
      transactions: items.length
    });
  }
  return rows;
};

const buildGatewayBreakdown = (transactions) => {
  const groups = new Map();
  transactions.forEach((transaction) => {
    const provider = normalizeProvider(transaction.provider) || 'unknown';
    const current = groups.get(provider) || { provider, volume: 0, transactions: 0 };
    current.volume = roundMoney(current.volume + Number(transaction.amount || 0));
    current.transactions += 1;
    groups.set(provider, current);
  });
  return [...groups.values()];
};

const fetchScopedRecords = async (ctx, ownerId) => {
  const [links, transactions, withdrawals] = await Promise.all([
    ctx.prisma.tiwloPayLink.findMany({
      where: ownerId ? { ownerId } : {},
      orderBy: { createdAt: 'desc' },
      take: ownerId ? 100 : 250
    }),
    ctx.prisma.tiwloPayTransaction.findMany({
      where: ownerId ? { ownerId } : {},
      include: { link: true },
      orderBy: { createdAt: 'desc' },
      take: ownerId ? 150 : 400
    }),
    ctx.prisma.tiwloPayWithdrawal.findMany({
      where: ownerId ? { ownerId } : {},
      include: {
        owner: true,
        profile: {
          include: profileInclude
        }
      },
      orderBy: { requestedAt: 'desc' },
      take: ownerId ? 100 : 250
    })
  ]);
  return { links, transactions, withdrawals };
};

export const tiwloPayOverview = async (ctx) => {
  const actor = await requireAuth(ctx);
  const profile = await ensureProfile(ctx, actor);
  await expireLinks(ctx, actor.id);
  await processTiwloPayAutoWithdrawals(ctx, { ownerId: actor.id });
  const [{ links, transactions, withdrawals }, gateways] = await Promise.all([
    fetchScopedRecords(ctx, actor.id),
    listEnabledGateways(ctx)
  ]);

  return toApi({
    profile: profileWithDefaults(profile),
    summary: buildSummary({ links, transactions, withdrawals }),
    paymentLinks: mapLinks(links, ctx),
    transactions,
    withdrawals,
    gateways,
    chartData: buildChartData(transactions),
    gatewayBreakdown: buildGatewayBreakdown(transactions)
  });
};

export const adminTiwloPayOverview = async (ctx) => {
  await requireAdmin(ctx);
  await expireLinks(ctx);
  await processTiwloPayAutoWithdrawals(ctx);
  const [profileCount, profiles, records, gateways] = await Promise.all([
    ctx.prisma.tiwloPayProfile.count(),
    ctx.prisma.tiwloPayProfile.findMany({
      include: profileInclude,
      orderBy: { createdAt: 'desc' },
      take: 250
    }),
    fetchScopedRecords(ctx),
    listEnabledGateways(ctx)
  ]);

  return toApi({
    summary: buildSummary({ ...records, merchants: profileCount }),
    profiles: profiles.map(profileWithDefaults),
    paymentLinks: mapLinks(records.links, ctx),
    transactions: records.transactions,
    withdrawals: records.withdrawals,
    gateways,
    chartData: buildChartData(records.transactions, 14),
    gatewayBreakdown: buildGatewayBreakdown(records.transactions)
  });
};

export const upsertTiwloPayProfile = async (ctx, input = {}) => {
  const actor = await requireAuth(ctx);
  const profile = await ensureProfile(ctx, actor, input);
  const updated = await ctx.prisma.tiwloPayProfile.update({
    where: { id: profile.id },
    data: removeUndefined({
      displayName: input.displayName === undefined ? undefined : cleanText(input.displayName, profile.displayName),
      companyName: input.companyName === undefined ? undefined : cleanText(input.companyName, ''),
      supportEmail: input.supportEmail === undefined ? undefined : cleanText(input.supportEmail, ''),
      statementDescriptor: input.statementDescriptor === undefined ? undefined : normalizeDescriptor(input.statementDescriptor),
      settings: input.settings === undefined ? undefined : settingsWithDefaults({ ...(profile.settings || {}), ...(input.settings || {}) })
    }),
    include: profileInclude
  });
  return toApi(profileWithDefaults(updated));
};

export const rotateTiwloPayKeys = async (ctx) => {
  const actor = await requireAuth(ctx);
  const profile = await ensureProfile(ctx, actor);
  requireActiveProfile(profile, 'API keys');
  const secretKey = generateSecretKey();
  const updated = await ctx.prisma.tiwloPayProfile.update({
    where: { id: profile.id },
    data: {
      apiKey: generateApiKey(),
      secretHash: await bcrypt.hash(secretKey, 10),
      secretPreview: previewSecret(secretKey)
    },
    include: profileInclude
  });

  return toApi({ profile: profileWithDefaults(updated), secretKey });
};

export const requestTiwloPayVerification = async (ctx, input = {}) => {
  const actor = await requireAuth(ctx);
  const profile = await ensureProfile(ctx, actor);
  const legalName = cleanText(input.legalName, profile.companyName || actor.name || '');
  const documentType = cleanText(input.documentType, '');
  const documentNumber = cleanText(input.documentNumber, '');

  if (!legalName) throw new AppError('Legal name is required for ID verification', 'BAD_USER_INPUT');
  if (!documentType) throw new AppError('Document type is required for ID verification', 'BAD_USER_INPUT');
  if (!documentNumber) throw new AppError('Document number is required for ID verification', 'BAD_USER_INPUT');

  const settings = settingsWithDefaults(profile.settings);
  const verification = {
    ...settings.verification,
    status: 'submitted',
    legalName,
    businessName: cleanText(input.businessName, profile.companyName || ''),
    businessType: cleanText(input.businessType, 'individual'),
    documentType,
    documentNumber,
    country: cleanText(input.country, ''),
    address: cleanText(input.address, ''),
    website: cleanText(input.website, ''),
    contactEmail: cleanText(input.contactEmail, profile.supportEmail || actor.email || ''),
    contactPhone: cleanText(input.contactPhone, ''),
    taxId: cleanText(input.taxId, ''),
    note: cleanText(input.note, ''),
    metadata: input.metadata || {},
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    capabilities: {
      paymentLinks: false,
      api: false,
      payouts: false
    }
  };

  const updated = await ctx.prisma.tiwloPayProfile.update({
    where: { id: profile.id },
    data: {
      status: 'inactive',
      settings: { ...settings, verification }
    },
    include: profileInclude
  });

  await writeAudit(ctx, 'request_tiwlo_pay_verification', 'tiwloPayProfile', profile.id, {
    ownerId: actor.id,
    documentType,
    country: verification.country
  });

  return toApi({
    profile: profileWithDefaults(updated),
    message: 'ID verification submitted. Tiwlo Team approval is required before Tiwlo Pay becomes active.'
  });
};

const uniqueLinkSlug = async (ctx, invoiceId, title) => {
  const base = slugify(`${invoiceId}-${title}`) || `tiwlo-pay-${Date.now().toString(36)}`;
  for (let index = 0; index < 8; index += 1) {
    const slug = `${base}-${crypto.randomBytes(3).toString('hex')}`;
    const existing = await ctx.prisma.tiwloPayLink.findUnique({ where: { slug } });
    if (!existing) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
};

const createTiwloPayLinkForProfile = async (ctx, actor, profile, input = {}) => {
  requireActiveProfile(profile, 'payment links');

  const amount = Number(input.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) throw new AppError('Payment amount must be greater than 0', 'BAD_USER_INPUT');

  const gateways = await getEnabledGatewayRows(ctx);
  const allowedProviders = filterAllowedProviders(input.allowedProviders, gateways);
  if (!allowedProviders.length) throw new AppError('No enabled payment gateway is available for Tiwlo Pay', 'PAYMENT_CONFIGURATION_REQUIRED');

  const invoiceId = cleanText(input.invoiceId, `TWP-${Date.now().toString(36).toUpperCase()}`);
  const link = await ctx.prisma.tiwloPayLink.create({
    data: {
      ownerId: actor.id,
      profileId: profile.id,
      slug: await uniqueLinkSlug(ctx, invoiceId, input.title),
      invoiceId,
      title: cleanText(input.title, 'Payment request'),
      description: cleanText(input.description, ''),
      amount: roundMoney(amount),
      currency: normalizeCurrency(input.currency),
      customerName: cleanText(input.customerName, ''),
      customerEmail: cleanText(input.customerEmail, ''),
      expiresAt: expirationFromInput(input),
      allowedProviders,
      metadata: input.metadata || {}
    }
  });

  return linkToApi(link, ctx);
};

export const createTiwloPayLink = async (ctx, input = {}) => {
  const actor = await requireAuth(ctx);
  const profile = await ensureProfile(ctx, actor);
  return createTiwloPayLinkForProfile(ctx, actor, profile, input);
};

export const publicTiwloPayLink = async (ctx, slug) => {
  const link = await ctx.prisma.tiwloPayLink.findUnique({
    where: { slug },
    include: {
      profile: { include: profileInclude }
    }
  });
  if (!link) notFound('Payment link');

  let currentLink = link;
  if (link.status === 'unpaid' && link.expiresAt && link.expiresAt < new Date()) {
    currentLink = await ctx.prisma.tiwloPayLink.update({
      where: { id: link.id },
      data: { status: 'expired' },
      include: {
        profile: { include: profileInclude }
      }
    });
  }

  const gateways = (await listEnabledGateways(ctx)).filter((gateway) => {
    const allowed = Array.isArray(currentLink.allowedProviders) ? currentLink.allowedProviders.map(normalizeProvider) : [];
    return !allowed.length || allowed.includes(normalizeProvider(gateway.provider));
  });

  return toApi({
    profile: profileWithDefaults(currentLink.profile),
    link: linkToApi(currentLink, ctx),
    gateways: isProfileLive(currentLink.profile) ? gateways : []
  });
};

export const payTiwloPayLink = async (ctx, input = {}) => {
  const link = await ctx.prisma.tiwloPayLink.findUnique({
    where: { slug: input.slug },
    include: { profile: true }
  });
  if (!link) notFound('Payment link');
  if (link.status === 'paid') {
    return toApi({
      status: 'paid',
      message: 'Payment was already completed',
      link: linkToApi(link, ctx),
      transaction: null,
      provider: '',
      paymentUrl: null,
      reference: null
    });
  }
  if (link.status !== 'unpaid') throw new AppError(`Payment link is ${link.status}`, 'BAD_USER_INPUT');
  if (link.expiresAt && link.expiresAt < new Date()) {
    const expired = await ctx.prisma.tiwloPayLink.update({ where: { id: link.id }, data: { status: 'expired' } });
    return toApi({
      status: 'expired',
      message: 'Payment link has expired',
      link: linkToApi(expired, ctx),
      transaction: null,
      provider: '',
      paymentUrl: null,
      reference: null
    });
  }
  if (!isProfileLive(link.profile)) throw new AppError('Merchant account is not accepting payments', 'FORBIDDEN');

  const gateway = await resolveGateway(ctx, input.provider, link.allowedProviders || []);
  const settings = { ...defaultSettings(), ...(link.profile.settings || {}) };
  const fee = roundMoney((Number(link.amount || 0) * Number(settings.feePercent || 0)) / 100 + Number(settings.feeFixed || 0));
  const netAmount = Math.max(0, roundMoney(Number(link.amount || 0) - fee));
  const customerName = cleanText(input.customerName, link.customerName || '');
  const customerEmail = cleanText(input.customerEmail, link.customerEmail || '');
  const invoice = await ctx.prisma.invoice.findFirst({
    where: {
      scope: 'tiwlo_pay',
      scopeId: link.id,
      status: { not: 'paid' }
    },
    orderBy: { createdAt: 'desc' }
  }) || await ctx.prisma.invoice.create({
    data: {
      ownerId: link.ownerId,
      number: paymentInvoiceNumber(link),
      amount: Number(link.amount || 0),
      currency: link.currency,
      status: 'open',
      scope: 'tiwlo_pay',
      scopeId: link.id,
      dueDate: link.expiresAt || undefined,
      items: {
        lineItems: [{ label: cleanText(link.title, 'Tiwlo Pay invoice'), amount: Number(link.amount || 0) }],
        tiwloPay: {
          linkId: link.id,
          slug: link.slug,
          invoiceId: link.invoiceId,
          customerName,
          customerEmail
        }
      }
    }
  });

  const session = await createProviderCheckout(ctx, invoice, gateway.provider, {
    id: link.ownerId,
    email: customerEmail,
    phone: input.metadata?.phone || ''
  });

  const result = await ctx.prisma.$transaction(async (tx) => {
    const updatedLink = await tx.tiwloPayLink.update({
      where: { id: link.id },
      data: {
        customerName,
        customerEmail,
        metadata: {
          ...(link.metadata || {}),
          lastCheckout: {
            provider: gateway.provider,
            reference: session.reference,
            paymentInvoiceId: invoice.id,
            paymentUrl: session.paymentUrl,
            userAgent: ctx.userAgent || '',
            requestIp: ctx.requestIp || '',
            createdAt: new Date().toISOString()
          }
        }
      }
    });
    const existing = session.reference
      ? await tx.tiwloPayTransaction.findFirst({ where: { linkId: link.id, reference: session.reference } })
      : null;
    const transactionData = {
        profileId: link.profileId,
        linkId: link.id,
        ownerId: link.ownerId,
        amount: Number(link.amount || 0),
        fee,
        netAmount,
        currency: link.currency,
        provider: gateway.provider,
        status: 'pending',
        reference: session.reference || txReference(),
        customerName,
        customerEmail,
        metadata: {
          gatewayKey: gateway.key,
          mode: gateway.mode,
          publicCheckout: true,
          paymentInvoiceId: invoice.id,
          paymentUrl: session.paymentUrl,
          ...(input.metadata || {})
        }
      };
    const transaction = existing
      ? await tx.tiwloPayTransaction.update({ where: { id: existing.id }, data: transactionData })
      : await tx.tiwloPayTransaction.create({ data: transactionData });
    return { updatedLink, transaction };
  });

  return toApi({
    status: 'redirect',
    message: `Redirecting to ${gateway.name || gateway.provider}.`,
    link: linkToApi(result.updatedLink, ctx),
    transaction: result.transaction,
    provider: gateway.provider,
    paymentUrl: session.paymentUrl,
    reference: session.reference
  });
};

const withdrawalDestinationFromInput = (input = {}, fallback = {}) => ({
  accountName: cleanText(input.accountName, fallback.accountName || ''),
  accountNumber: cleanText(input.accountNumber, fallback.accountNumber || ''),
  bankName: cleanText(input.bankName, fallback.bankName || ''),
  branchName: cleanText(input.branchName, fallback.branchName || ''),
  routingNumber: cleanText(input.routingNumber, fallback.routingNumber || ''),
  walletNumber: cleanText(input.walletNumber, fallback.walletNumber || ''),
  note: cleanText(input.note, fallback.note || '')
});

const hasWithdrawalDestination = (destination = {}) => Boolean(
  cleanText(destination.accountNumber) ||
  cleanText(destination.walletNumber) ||
  cleanText(destination.bankName) ||
  cleanText(destination.accountName)
);

const savePayoutDestination = async (ctx, profile, { method, currency, destination, autoWithdrawal }) => {
  const settings = settingsWithDefaults(profile.settings);
  const payoutDestination = {
    method,
    currency,
    destination,
    updatedAt: new Date().toISOString()
  };
  const nextSettings = {
    ...settings,
    payoutDestination,
    autoWithdrawal: autoWithdrawal
      ? {
        ...settings.autoWithdrawal,
        ...autoWithdrawal
      }
      : settings.autoWithdrawal
  };

  return ctx.prisma.tiwloPayProfile.update({
    where: { id: profile.id },
    data: { settings: nextSettings },
    include: profileInclude
  });
};

const createWithdrawalForProfile = async (ctx, profile, actor, input = {}, options = {}) => {
  const metadata = input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
    ? input.metadata
    : {};
  const amount = Number(input.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) throw new AppError('Withdrawal amount must be greater than 0', 'BAD_USER_INPUT');
  if (amount < minimumAutoWithdrawalAmount) {
    throw new AppError(`Minimum withdrawal amount is ${minimumAutoWithdrawalAmount}`, 'BAD_USER_INPUT');
  }

  const method = normalizeProvider(input.method);
  if (!method) throw new AppError('Withdrawal method is required', 'BAD_USER_INPUT');
  const currency = normalizeCurrency(input.currency);
  const destination = withdrawalDestinationFromInput(input);
  if (!hasWithdrawalDestination(destination)) throw new AppError('Withdrawal destination is required', 'BAD_USER_INPUT');

  const records = await fetchScopedRecords(ctx, actor.id);
  const openWithdrawal = records.withdrawals.find((withdrawal) => openWithdrawalStatuses.has(withdrawal.status));
  if (openWithdrawal) {
    throw new AppError('A withdrawal request is already pending. Wait for Tiwlo Team to complete or cancel it before sending another request.', 'CONFLICT');
  }

  const summary = buildSummary(records);
  if (amount > summary.availableForWithdrawal) {
    throw new AppError('Withdrawal amount is higher than the available Tiwlo Pay balance', 'BAD_USER_INPUT');
  }

  const withdrawal = await ctx.prisma.tiwloPayWithdrawal.create({
    data: {
      profileId: profile.id,
      ownerId: actor.id,
      amount: roundMoney(amount),
      currency,
      method,
      destination,
      metadata: {
        ...metadata,
        source: options.source || metadata.source || 'manual_withdrawal',
        requestedBy: options.requestedBy || actor.id
      }
    },
    include: {
      owner: true,
      profile: {
        include: profileInclude
      }
    }
  });

  await savePayoutDestination(ctx, profile, {
    method,
    currency,
    destination,
    autoWithdrawal: options.autoWithdrawal
  });

  return withdrawal;
};

export const requestTiwloPayWithdrawal = async (ctx, input = {}) => {
  const actor = await requireAuth(ctx);
  const profile = await ensureProfile(ctx, actor);
  requireActiveProfile(profile, 'payouts');
  const withdrawal = await createWithdrawalForProfile(ctx, profile, actor, input);
  return toApi(withdrawal);
};

export const setTiwloPayAutoWithdrawal = async (ctx, input = {}) => {
  const actor = await requireAuth(ctx);
  const profile = await ensureProfile(ctx, actor);
  requireActiveProfile(profile, 'auto withdrawals');
  const settings = settingsWithDefaults(profile.settings);
  const fallback = settings.payoutDestination || {};
  const enabled = Boolean(input.enabled);
  const method = normalizeProvider(input.method || fallback.method || settings.autoWithdrawal.method);
  const currency = normalizeCurrency(input.currency || fallback.currency || settings.autoWithdrawal.currency || 'BDT');
  const destination = withdrawalDestinationFromInput(input, fallback.destination || settings.autoWithdrawal.destination || {});
  const minimumAmount = Math.max(minimumAutoWithdrawalAmount, Number(input.minimumAmount || settings.autoWithdrawal.minimumAmount || minimumAutoWithdrawalAmount));

  if (enabled) {
    if (!method) throw new AppError('Choose a withdrawal method before enabling auto withdrawal', 'BAD_USER_INPUT');
    if (!hasWithdrawalDestination(destination)) throw new AppError('Save withdrawal destination details before enabling auto withdrawal', 'BAD_USER_INPUT');
  }

  const updated = await savePayoutDestination(ctx, profile, {
    method,
    currency,
    destination,
    autoWithdrawal: {
      ...settings.autoWithdrawal,
      enabled,
      method,
      currency,
      destination,
      minimumAmount,
      updatedAt: new Date().toISOString()
    }
  });

  return toApi(profileWithDefaults(updated));
};

const autoRunDateKey = (date = new Date()) => date.toISOString().slice(0, 10);

export const processTiwloPayAutoWithdrawals = async (ctx, options = {}) => {
  const ownerId = cleanText(options.ownerId, '');
  const profiles = await ctx.prisma.tiwloPayProfile.findMany({
    where: {
      ...(ownerId ? { ownerId } : {}),
      status: 'active'
    },
    include: profileInclude,
    take: ownerId ? 1 : 250
  });
  const today = autoRunDateKey();
  const results = [];

  for (const profile of profiles) {
    const settings = settingsWithDefaults(profile.settings);
    const auto = settings.autoWithdrawal || {};
    if (!auto.enabled || auto.lastRunDate === today) continue;
    if (!auto.method || !hasWithdrawalDestination(auto.destination || {})) continue;

    const records = await fetchScopedRecords(ctx, profile.ownerId);
    if (records.withdrawals.some((withdrawal) => openWithdrawalStatuses.has(withdrawal.status))) continue;

    const summary = buildSummary(records);
    const minimumAmount = Math.max(minimumAutoWithdrawalAmount, Number(auto.minimumAmount || minimumAutoWithdrawalAmount));
    const amount = roundMoney(summary.availableForWithdrawal);
    if (amount < minimumAmount) continue;

    try {
      const withdrawal = await createWithdrawalForProfile(ctx, profileWithDefaults(profile), profile.owner, {
        amount,
        currency: auto.currency || records.transactions[0]?.currency || 'BDT',
        method: auto.method,
        ...(auto.destination || {}),
        metadata: {
          source: 'auto_withdrawal',
          autoRunDate: today
        }
      }, {
        source: 'auto_withdrawal',
        requestedBy: 'tiwlo_auto_withdrawal',
        autoWithdrawal: {
          ...auto,
          lastRunDate: today,
          lastRequestedAt: new Date().toISOString()
        }
      });
      results.push(withdrawal);
    } catch (error) {
      console.warn('[tiwlo-pay] auto withdrawal skipped:', error?.message || error);
    }
  }

  return toApi(results);
};

const readBearerToken = (authorization = '') => {
  const value = String(authorization || '').trim();
  return value.toLowerCase().startsWith('bearer ') ? value.slice(7).trim() : '';
};

const apiErrorStatus = (error) => {
  const code = error?.extensions?.code || error?.code || '';
  if (code === 'UNAUTHENTICATED') return 401;
  if (code === 'FORBIDDEN') return 403;
  if (code === 'NOT_FOUND') return 404;
  if (code === 'CONFLICT') return 409;
  if (code === 'PAYMENT_CONFIGURATION_REQUIRED') return 409;
  return 400;
};

const merchantApiContext = (req, options = {}) => ({
  prisma: options.prisma,
  requestIp: typeof options.requestIp === 'function' ? options.requestIp(req) : '',
  userAgent: req.headers['user-agent'] || '',
  requestHeaders: req.headers || {}
});

const normalizeApiDomain = (value = '') => {
  let text = cleanText(value).toLowerCase();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) {
    text = originHost(text);
  }
  text = text.split('/')[0].split('?')[0].split('#')[0].replace(/:\d+$/, '').replace(/^\[|\]$/g, '');
  if (text.startsWith('*.')) {
    const base = text.slice(2).replace(/^\.+|\.+$/g, '');
    return base ? `*.${base}` : '';
  }
  return text.replace(/^\.+|\.+$/g, '');
};

const hostFromHeader = (value = '') => normalizeApiDomain(splitFirst(firstHeaderValue(value)));

const requestDomainsForApi = (req) => {
  const headers = req.headers || {};
  return [...new Set([
    hostFromHeader(headers.origin),
    hostFromHeader(headers.referer),
    hostFromHeader(headers['x-forwarded-host']),
    hostFromHeader(headers['x-original-host']),
    hostFromHeader(headers.host)
  ].filter(Boolean))];
};

const normalizeApiIp = (value = '') => {
  let text = splitFirst(value).replace(/^::ffff:/, '').trim();
  if (!text) return '';
  if (text.startsWith('[') && text.includes(']')) return text.slice(1, text.indexOf(']'));
  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(text)) return text.replace(/:\d+$/, '');
  return text;
};

const requestIpsForApi = (ctx, req) => {
  const headers = req.headers || {};
  return [...new Set([
    normalizeApiIp(ctx.requestIp),
    normalizeApiIp(headers['cf-connecting-ip']),
    normalizeApiIp(headers['x-real-ip']),
    normalizeApiIp(headers['x-forwarded-for']),
    normalizeApiIp(req.ip),
    normalizeApiIp(req.socket?.remoteAddress)
  ].filter(Boolean))];
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const domainMatches = (pattern, domain) => {
  const allowed = normalizeApiDomain(pattern);
  const candidate = normalizeApiDomain(domain);
  if (!allowed || !candidate) return false;
  if (allowed.startsWith('*.')) {
    const base = allowed.slice(2);
    return candidate === base || candidate.endsWith(`.${base}`);
  }
  return candidate === allowed;
};

const ipMatches = (pattern, ip) => {
  const allowed = cleanText(pattern);
  const candidate = normalizeApiIp(ip);
  if (!allowed || !candidate) return false;
  if (!allowed.includes('*')) return allowed === candidate;
  const regex = new RegExp(`^${allowed.split('*').map(escapeRegex).join('.*')}$`);
  return regex.test(candidate);
};

const enforceMerchantApiWhitelist = (profile, ctx, req) => {
  const apiAccess = settingsWithDefaults(profile.settings).apiAccess || {};
  const allowedDomains = Array.isArray(apiAccess.allowedDomains)
    ? [...new Set(apiAccess.allowedDomains.map(normalizeApiDomain).filter(Boolean))]
    : [];
  const allowedIps = Array.isArray(apiAccess.allowedIps)
    ? [...new Set(apiAccess.allowedIps.map(normalizeApiIp).filter(Boolean))]
    : [];

  if (!allowedDomains.length && !allowedIps.length) return;

  const requestDomains = requestDomainsForApi(req);
  const requestIps = requestIpsForApi(ctx, req);
  const domainAllowed = allowedDomains.some((pattern) => requestDomains.some((domain) => domainMatches(pattern, domain)));
  const ipAllowed = allowedIps.some((pattern) => requestIps.some((ip) => ipMatches(pattern, ip)));
  if (domainAllowed || ipAllowed) return;

  throw new AppError('Tiwlo Pay API request blocked by merchant domain/IP whitelist', 'FORBIDDEN');
};

const authenticateMerchantApi = async (ctx, req) => {
  const apiKey = cleanText(req.headers['x-tiwlo-pay-key'] || req.body?.apiKey || req.query?.apiKey, '');
  const secretKey = cleanText(
    readBearerToken(req.headers.authorization) ||
    req.headers['x-tiwlo-pay-secret'] ||
    req.body?.secretKey,
    ''
  );
  if (!apiKey) throw new AppError('X-Tiwlo-Pay-Key header is required', 'UNAUTHENTICATED');
  if (!secretKey) throw new AppError('Bearer secret key is required', 'UNAUTHENTICATED');

  const profile = await ctx.prisma.tiwloPayProfile.findUnique({
    where: { apiKey },
    include: profileInclude
  });
  if (!profile) throw new AppError('Invalid Tiwlo Pay API key', 'UNAUTHENTICATED');

  const secretMatches = await bcrypt.compare(secretKey, profile.secretHash);
  if (!secretMatches) throw new AppError('Invalid Tiwlo Pay secret key', 'UNAUTHENTICATED');

  const withDefaults = profileWithDefaults(profile);
  requireActiveProfile(withDefaults, 'merchant API');
  enforceMerchantApiWhitelist(withDefaults, ctx, req);
  return withDefaults;
};

const apiLinkPayload = (link) => ({
  object: 'tiwlo_pay.payment_link',
  id: link.id,
  slug: link.slug,
  invoiceId: link.invoiceId,
  title: link.title,
  description: link.description,
  amount: link.amount,
  currency: link.currency,
  status: link.status,
  customerName: link.customerName,
  customerEmail: link.customerEmail,
  allowedProviders: link.allowedProviders || [],
  metadata: link.metadata || {},
  checkoutUrl: link.publicUrl,
  publicUrl: link.publicUrl,
  expiresAt: link.expiresAt,
  paidAt: link.paidAt,
  createdAt: link.createdAt,
  updatedAt: link.updatedAt
});

const apiTransactionPayload = (transaction) => ({
  object: 'tiwlo_pay.transaction',
  id: transaction.id,
  linkId: transaction.linkId,
  amount: transaction.amount,
  fee: transaction.fee,
  netAmount: transaction.netAmount,
  currency: transaction.currency,
  provider: transaction.provider,
  status: transaction.status,
  reference: transaction.reference,
  customerName: transaction.customerName,
  customerEmail: transaction.customerEmail,
  metadata: transaction.metadata || {},
  createdAt: transaction.createdAt,
  updatedAt: transaction.updatedAt
});

const findMerchantLink = async (ctx, profile, idOrSlug) => {
  const lookup = cleanText(idOrSlug, '');
  if (!lookup) throw new AppError('Payment link id, slug, or invoiceId is required', 'BAD_USER_INPUT');
  const link = await ctx.prisma.tiwloPayLink.findFirst({
    where: {
      ownerId: profile.ownerId,
      OR: [
        { id: lookup },
        { slug: lookup },
        { invoiceId: lookup }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });
  if (!link) notFound('Payment link');
  if (link.status === 'unpaid' && link.expiresAt && link.expiresAt < new Date()) {
    return ctx.prisma.tiwloPayLink.update({
      where: { id: link.id },
      data: { status: 'expired' }
    });
  }
  return link;
};

const merchantApiCreatePaymentLink = async (ctx, profile, input = {}) => {
  const actor = profile.owner || await ctx.prisma.user.findUnique({ where: { id: profile.ownerId } });
  const metadata = input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
    ? input.metadata
    : {};
  return createTiwloPayLinkForProfile(ctx, actor, profile, {
    ...input,
    metadata: {
      ...metadata,
      source: metadata.source || 'merchant_api',
      successUrl: cleanText(input.successUrl, metadata.successUrl || ''),
      cancelUrl: cleanText(input.cancelUrl, metadata.cancelUrl || ''),
      webhookUrl: cleanText(input.webhookUrl, metadata.webhookUrl || ''),
      idempotencyKey: cleanText(input.idempotencyKey || ctx.requestHeaders?.['idempotency-key'], metadata.idempotencyKey || '')
    }
  });
};

const merchantApiCreateCheckout = async (ctx, profile, input = {}) => {
  const link = await findMerchantLink(ctx, profile, input.linkId || input.slug || input.invoiceId);
  const allowed = Array.isArray(link.allowedProviders) ? link.allowedProviders.filter(Boolean) : [];
  const provider = normalizeProvider(input.provider || allowed[0]);
  if (!provider) throw new AppError('Provider is required for checkout session creation', 'BAD_USER_INPUT');
  return payTiwloPayLink(ctx, {
    slug: link.slug,
    provider,
    customerName: cleanText(input.customerName, link.customerName || ''),
    customerEmail: cleanText(input.customerEmail, link.customerEmail || ''),
    metadata: {
      ...(input.metadata || {}),
      source: 'merchant_api_checkout'
    }
  });
};

const sendApiError = (res, error) => {
  const status = apiErrorStatus(error);
  res.status(status).json({
    error: {
      message: error?.message || 'Tiwlo Pay API request failed',
      code: error?.extensions?.code || error?.code || 'BAD_REQUEST'
    }
  });
};

const asyncApiRoute = (handler) => async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  try {
    await handler(req, res);
  } catch (error) {
    sendApiError(res, error);
  }
};

export const registerTiwloPayApiRoutes = (app, options = {}) => {
  if (!autoWithdrawalTimer && options.prisma) {
    autoWithdrawalTimer = setInterval(() => {
      processTiwloPayAutoWithdrawals({ prisma: options.prisma }).catch((error) => {
        console.warn('[tiwlo-pay] auto withdrawal job failed:', error?.message || error);
      });
    }, 60 * 60 * 1000);
    autoWithdrawalTimer.unref?.();
  }

  app.get('/api/tiwlo-pay/v1', (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({
      service: 'Tiwlo Pay Merchant API',
      version: 'v1',
      status: 'available',
      documentation: '/documentation?section=tiwlo-pay-api',
      endpoints: {
        createPaymentLink: 'POST /api/tiwlo-pay/v1/payment-links',
        getPaymentLink: 'GET /api/tiwlo-pay/v1/payment-links/{idOrSlug}',
        createCheckoutSession: 'POST /api/tiwlo-pay/v1/checkout-sessions',
        listTransactions: 'GET /api/tiwlo-pay/v1/transactions'
      }
    });
  });

  app.get('/api/tiwlo-pay/v1/me', asyncApiRoute(async (req, res) => {
    const ctx = merchantApiContext(req, options);
    const profile = await authenticateMerchantApi(ctx, req);
    res.json({
      object: 'tiwlo_pay.merchant',
      id: profile.id,
      displayName: profile.displayName,
      companyName: profile.companyName,
      supportEmail: profile.supportEmail,
      statementDescriptor: profile.statementDescriptor,
      status: profile.status,
      capabilities: verificationFor(profile).capabilities,
      apiAccess: settingsWithDefaults(profile.settings).apiAccess,
      apiKey: profile.apiKey,
      createdAt: toApi(profile.createdAt),
      updatedAt: toApi(profile.updatedAt)
    });
  }));

  app.post('/api/tiwlo-pay/v1/payment-links', asyncApiRoute(async (req, res) => {
    const ctx = merchantApiContext(req, options);
    const profile = await authenticateMerchantApi(ctx, req);
    const link = await merchantApiCreatePaymentLink(ctx, profile, req.body || {});
    res.status(201).json(apiLinkPayload(link));
  }));

  app.get('/api/tiwlo-pay/v1/payment-links/:idOrSlug', asyncApiRoute(async (req, res) => {
    const ctx = merchantApiContext(req, options);
    const profile = await authenticateMerchantApi(ctx, req);
    const link = await findMerchantLink(ctx, profile, req.params.idOrSlug);
    res.json(apiLinkPayload(linkToApi(link, ctx)));
  }));

  app.post('/api/tiwlo-pay/v1/checkout-sessions', asyncApiRoute(async (req, res) => {
    const ctx = merchantApiContext(req, options);
    const profile = await authenticateMerchantApi(ctx, req);
    const checkout = await merchantApiCreateCheckout(ctx, profile, req.body || {});
    res.status(201).json({
      object: 'tiwlo_pay.checkout_session',
      status: checkout.status,
      provider: checkout.provider,
      paymentUrl: checkout.paymentUrl,
      reference: checkout.reference,
      message: checkout.message,
      link: apiLinkPayload(checkout.link),
      transaction: checkout.transaction ? apiTransactionPayload(checkout.transaction) : null
    });
  }));

  app.get('/api/tiwlo-pay/v1/transactions', asyncApiRoute(async (req, res) => {
    const ctx = merchantApiContext(req, options);
    const profile = await authenticateMerchantApi(ctx, req);
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 100);
    const transactions = await ctx.prisma.tiwloPayTransaction.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    res.json({
      object: 'list',
      data: transactions.map((transaction) => apiTransactionPayload(toApi(transaction)))
    });
  }));
};

export const adminUpdateTiwloPayProfileStatus = async (ctx, id, status) => {
  const actor = await requireAdmin(ctx);
  if (!profileStatuses.has(status)) throw new AppError('Invalid Tiwlo Pay profile status', 'BAD_USER_INPUT');
  const existing = await ctx.prisma.tiwloPayProfile.findUnique({ where: { id } });
  if (!existing) notFound('Tiwlo Pay profile');
  const settings = settingsWithDefaults(existing.settings);
  const verificationStatus = status === 'active'
    ? 'approved'
    : status === 'suspended'
      ? 'suspended'
      : (settings.verification.status === 'approved' ? 'needs_review' : settings.verification.status);
  const capabilities = {
    paymentLinks: status === 'active',
    api: status === 'active',
    payouts: status === 'active'
  };
  const profile = await ctx.prisma.tiwloPayProfile.update({
    where: { id },
    data: {
      status,
      settings: {
        ...settings,
        verification: {
          ...settings.verification,
          status: verificationStatus,
          reviewedAt: new Date().toISOString(),
          reviewedBy: actor.id,
          capabilities
        }
      }
    },
    include: profileInclude
  });
  await writeAudit(ctx, 'admin_update_tiwlo_pay_profile_status', 'tiwloPayProfile', id, { status });
  return toApi(profileWithDefaults(profile));
};

export const adminUpdateTiwloPayWithdrawalStatus = async (ctx, id, status) => {
  const actor = await requireAdmin(ctx);
  if (!withdrawalStatuses.has(status)) throw new AppError('Invalid withdrawal status', 'BAD_USER_INPUT');
  const existing = await ctx.prisma.tiwloPayWithdrawal.findUnique({ where: { id } });
  if (!existing) notFound('Tiwlo Pay withdrawal');
  if (terminalWithdrawalStatuses.has(existing.status) && existing.status !== status) {
    throw new AppError('This withdrawal request is already closed', 'CONFLICT');
  }
  if (['paid', 'completed', 'cancelled', 'rejected'].includes(status) && !openWithdrawalStatuses.has(existing.status) && existing.status !== status) {
    throw new AppError('Only pending or processing withdrawals can be closed', 'CONFLICT');
  }
  const withdrawal = await ctx.prisma.tiwloPayWithdrawal.update({
    where: { id },
    data: {
      status,
      processedAt: terminalWithdrawalStatuses.has(status) ? new Date() : null,
      metadata: {
        ...(existing.metadata && typeof existing.metadata === 'object' && !Array.isArray(existing.metadata) ? existing.metadata : {}),
        reviewedBy: actor.id,
        reviewedAt: new Date().toISOString()
      }
    },
    include: {
      owner: true,
      profile: {
        include: profileInclude
      }
    }
  });
  await writeAudit(ctx, 'admin_update_tiwlo_pay_withdrawal_status', 'tiwloPayWithdrawal', id, { status });
  return toApi(withdrawal);
};

export const adminAdjustTiwloPayBalance = async (ctx, input = {}) => {
  const actor = await requireAdmin(ctx);
  const profileId = cleanText(input.profileId, '');
  const amount = roundMoney(Number(input.amount || 0));
  if (!profileId) throw new AppError('Merchant profile is required', 'BAD_USER_INPUT');
  if (!Number.isFinite(amount) || amount === 0) throw new AppError('Adjustment amount must not be zero', 'BAD_USER_INPUT');

  const profile = await ctx.prisma.tiwloPayProfile.findUnique({
    where: { id: profileId },
    include: profileInclude
  });
  if (!profile) notFound('Tiwlo Pay profile');

  if (amount < 0) {
    const records = await fetchScopedRecords(ctx, profile.ownerId);
    const summary = buildSummary(records);
    if (Math.abs(amount) > summary.availableForWithdrawal) {
      throw new AppError('Debit amount is higher than the merchant available balance', 'BAD_USER_INPUT');
    }
  }

  const direction = amount > 0 ? 'credit' : 'debit';
  const transaction = await ctx.prisma.tiwloPayTransaction.create({
    data: {
      profileId: profile.id,
      ownerId: profile.ownerId,
      amount,
      fee: 0,
      netAmount: amount,
      currency: normalizeCurrency(input.currency || 'BDT'),
      provider: 'tiwlo_team_adjustment',
      status: 'succeeded',
      reference: `TWT-${direction.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      customerName: profile.companyName || profile.displayName,
      customerEmail: profile.supportEmail || profile.owner?.email || '',
      metadata: {
        type: 'wallet_adjustment',
        direction,
        reason: cleanText(input.reason, 'Tiwlo Team balance adjustment'),
        adjustedBy: actor.id,
        adjustedAt: new Date().toISOString()
      }
    },
    include: { link: true }
  });

  await writeAudit(ctx, 'admin_adjust_tiwlo_pay_balance', 'tiwloPayProfile', profile.id, { amount, direction });
  return toApi(transaction);
};
