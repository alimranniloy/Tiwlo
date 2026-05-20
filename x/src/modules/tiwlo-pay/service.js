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

const publicBaseUrl = () => String(process.env.FRONTEND_ORIGIN || 'http://localhost:3000').replace(/\/$/, '');

const publicUrlFor = (link) => (link?.slug ? `${publicBaseUrl()}/pay/${link.slug}` : null);

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

const linkToApi = (link) => toApi({ ...link, publicUrl: publicUrlFor(link) });

const mapLinks = (links) => links.map(linkToApi);

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
  if (!gateway) throw new AppError('Payment gateway is not enabled by the platform admin', 'PAYMENT_CONFIGURATION_REQUIRED');

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

  return {
    ...base,
    ...incoming,
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
  const succeeded = (item) => item.status === 'succeeded';
  const pendingWithdrawal = (item) => ['pending', 'processing'].includes(item.status);
  const withdrawn = (item) => ['paid', 'completed'].includes(item.status);
  const reserved = (item) => ['pending', 'processing', 'paid', 'completed'].includes(item.status);
  const net = sumBy(transactions, 'netAmount', succeeded);
  const reservedWithdrawal = sumBy(withdrawals, 'amount', reserved);

  return {
    balance: roundMoney(net - sumBy(withdrawals, 'amount', withdrawn)),
    grossVolume: sumBy(transactions, 'amount'),
    paidVolume: sumBy(transactions, 'amount', succeeded),
    fees: sumBy(transactions, 'fee', succeeded),
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
  const [{ links, transactions, withdrawals }, gateways] = await Promise.all([
    fetchScopedRecords(ctx, actor.id),
    listEnabledGateways(ctx)
  ]);

  return toApi({
    profile: profileWithDefaults(profile),
    summary: buildSummary({ links, transactions, withdrawals }),
    paymentLinks: mapLinks(links),
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
    paymentLinks: mapLinks(records.links),
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
    message: 'ID verification submitted. Admin approval is required before Tiwlo Pay becomes active.'
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

export const createTiwloPayLink = async (ctx, input = {}) => {
  const actor = await requireAuth(ctx);
  const profile = await ensureProfile(ctx, actor);
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

  return linkToApi(link);
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
    link: linkToApi(currentLink),
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
      link: linkToApi(link),
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
      link: linkToApi(expired),
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
    link: linkToApi(result.updatedLink),
    transaction: result.transaction,
    provider: gateway.provider,
    paymentUrl: session.paymentUrl,
    reference: session.reference
  });
};

export const requestTiwloPayWithdrawal = async (ctx, input = {}) => {
  const actor = await requireAuth(ctx);
  const profile = await ensureProfile(ctx, actor);
  requireActiveProfile(profile, 'payouts');
  const amount = Number(input.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) throw new AppError('Withdrawal amount must be greater than 0', 'BAD_USER_INPUT');

  const records = await fetchScopedRecords(ctx, actor.id);
  const summary = buildSummary(records);
  if (amount > summary.availableForWithdrawal) {
    throw new AppError('Withdrawal amount is higher than the available Tiwlo Pay balance', 'BAD_USER_INPUT');
  }

  const method = normalizeProvider(input.method);
  const withdrawal = await ctx.prisma.tiwloPayWithdrawal.create({
    data: {
      profileId: profile.id,
      ownerId: actor.id,
      amount: roundMoney(amount),
      currency: normalizeCurrency(input.currency),
      method,
      destination: {
        accountName: cleanText(input.accountName, ''),
        accountNumber: cleanText(input.accountNumber, ''),
        bankName: cleanText(input.bankName, ''),
        branchName: cleanText(input.branchName, ''),
        routingNumber: cleanText(input.routingNumber, ''),
        walletNumber: cleanText(input.walletNumber, ''),
        note: cleanText(input.note, '')
      },
      metadata: input.metadata || {}
    }
  });

  return toApi(withdrawal);
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
  await requireAdmin(ctx);
  if (!withdrawalStatuses.has(status)) throw new AppError('Invalid withdrawal status', 'BAD_USER_INPUT');
  const withdrawal = await ctx.prisma.tiwloPayWithdrawal.update({
    where: { id },
    data: {
      status,
      processedAt: ['paid', 'completed', 'rejected', 'cancelled'].includes(status) ? new Date() : null
    }
  });
  return toApi(withdrawal);
};
