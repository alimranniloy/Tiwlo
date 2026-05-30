import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { canManageOwnerResource, getActor, isAdmin, ownerWhere, requireAdmin } from '../../core/auth.js';
import { normalizeEmail, removeUndefined, slugify, toApi } from '../../core/format.js';
import { writeAudit } from '../../core/audit.js';
import { AppError } from '../../core/errors.js';
import { pagination, searchWhere } from '../../core/validation.js';
import { paragraph, sendTiwloEmail } from '../../core/email.js';
import { ensureOwnerHasCredit } from '../billing/creditAutomation.js';
import { chargeProvisioningCredit, requireProvisioningCredit } from '../billing/service.js';
import { defaultNameserversFor, primaryDomainFor, serverIpFor, syncPowerDnsDomain } from '../powerdns/service.js';
import { queueSslInstallForDomains } from '../system-tools/service.js';
import { ECOMMERCE_CONTROL_SECTIONS, findEcommerceControlSection } from './controlCatalog.js';
import {
  AURA_THEME_CATALOG,
  DEMO_PRODUCTS_BY_THEME,
  DEMO_RECORDS_BY_THEME,
  DEFAULT_STOREFRONT_THEME_KEY,
  STOREFRONT_PLUGIN_MODULES,
  STOREFRONT_THEME_CATALOG,
  defaultThemeSettings,
  findStorefrontTheme,
  findThemeTemplate,
  normalizeStorefrontThemeKey
} from './themeCatalog.js';

const STOREFRONT_ROOT_DOMAIN = (process.env.STOREFRONT_ROOT_DOMAIN || 'tiwlo.com').toLowerCase();
const RESERVED_STOREFRONT_SUBDOMAINS = new Set([
  'admin',
  'api',
  'app',
  'assets',
  'billing',
  'blog',
  'broadband',
  'cdn',
  'cloud',
  'commerce',
  'cpanel',
  'dashboard',
  'dev',
  'docs',
  'documentation',
  'ecommerce',
  'ftp',
  'help',
  'imap',
  'isp',
  'login',
  'mail',
  'management',
  'ns1',
  'ns2',
  'pay',
  'pop',
  'products',
  'root',
  'services',
  'signup',
  'smtp',
  'ssh',
  'staging',
  'store',
  'stores',
  'support',
  'test',
  'tiwlo',
  'webmail',
  'www'
]);

const normalizeStoreSubdomain = (value) => slugify(value || '').toLowerCase();
const firstHourCharge = (monthlyCost) => Math.max(Math.round((Number(monthlyCost || 0) / 730) * 100) / 100, 0.01);

const normalizeHostname = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, '')
  .replace(/\/.*$/, '')
  .replace(/:\d+$/, '')
  .replace(/^\.+|\.+$/g, '');

const domainForSubdomain = (subdomain, rootDomain = STOREFRONT_ROOT_DOMAIN) => `${subdomain}.${rootDomain}`;

const storefrontRouteRecord = (subdomain, serverIp) => ({
  type: 'A',
  name: subdomain,
  value: serverIp,
  ttl: 300,
  proxied: false,
  ssl: 'queued',
  routeMode: 'powerdns_authoritative'
});

const customDomainRecord = (serverIp) => ({
  type: 'A',
  name: '@',
  value: serverIp,
  ttl: 300,
  proxied: false,
  ssl: 'queued',
  routeMode: 'powerdns_authoritative'
});

const subdomainValidationError = (subdomain) => {
  if (!subdomain) return 'Subdomain is required.';
  if (subdomain.length < 3) return 'Subdomain must be at least 3 characters.';
  if (subdomain.length > 63) return 'Subdomain must be 63 characters or fewer.';
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(subdomain)) {
    return 'Use only lowercase letters, numbers, and hyphens. It cannot start or end with a hyphen.';
  }
  if (RESERVED_STOREFRONT_SUBDOMAINS.has(subdomain)) return 'This subdomain is reserved for Tiwlo.';
  return '';
};

export const checkStoreSubdomainAvailability = async (ctx, rawSubdomain) => {
  const subdomain = normalizeStoreSubdomain(rawSubdomain);
  const rootDomain = await primaryDomainFor(ctx).catch(() => STOREFRONT_ROOT_DOMAIN);
  const domain = subdomain ? domainForSubdomain(subdomain, rootDomain) : '';
  const validation = subdomainValidationError(subdomain);
  if (validation) {
    return {
      available: false,
      subdomain,
      domain,
      reason: validation
    };
  }

  const [store, domainRecord, ispSite] = await Promise.all([
    ctx.prisma.store.findFirst({
      where: {
        OR: [
          { slug: subdomain },
          { domain },
          { customDomain: domain }
        ]
      },
      select: { id: true }
    }),
    ctx.prisma.domain.findUnique({ where: { name: domain }, select: { id: true } }),
    ctx.prisma.ispSite.findFirst({ where: { code: subdomain }, select: { id: true } })
  ]);

  const available = !store && !domainRecord && !ispSite;
  return {
    available,
    subdomain,
    domain,
    reason: available ? '' : 'This subdomain is already taken.'
  };
};

const assertStoreSubdomainAvailable = async (ctx, rawSubdomain) => {
  const result = await checkStoreSubdomainAvailability(ctx, rawSubdomain);
  if (!result.available) {
    throw new AppError(result.reason || 'Subdomain is not available', 'BAD_USER_INPUT');
  }
  return result;
};

export const planByCode = async (ctx, product, code) => {
  if (!code) return null;
  return ctx.prisma.plan.findUnique({ where: { product_code: { product, code } } });
};

export const listStores = async (ctx, { status, search, page, limit } = {}) => {
  const scoped = await ownerWhere(ctx);
  return toApi(await ctx.prisma.store.findMany({
    where: { ...scoped, ...(status ? { status } : {}), ...searchWhere(search, ['name', 'slug', 'category', 'domain', 'customDomain']) },
    orderBy: { createdAt: 'desc' },
    ...pagination({ page, limit })
  }));
};

export const getStore = async (ctx, { id, slug }) => {
  const store = await ctx.prisma.store.findFirst({ where: id ? { id } : { slug } });
  if (!store) return null;
  await canManageOwnerResource(ctx, store.ownerId);
  return toApi(store);
};

const requireStoreAccess = async (ctx, storeId) => {
  const store = await ctx.prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new AppError('Store not found', 'NOT_FOUND');
  await canManageOwnerResource(ctx, store.ownerId);
  return store;
};

const ensurePublicStorefrontAccess = async (ctx, store) => {
  const actor = await getActor(ctx);
  const serviceModule = await ctx.prisma.adminModule.findUnique({ where: { key: 'service.ecommerce' } }).catch(() => null);
  const ecommerceDisabled = ['disabled', 'inactive', 'off', 'suspended'].includes(String(serviceModule?.status || '').toLowerCase());
  if (ecommerceDisabled && !(actor && isAdmin(actor))) {
    throw new AppError('Storefront is not available', 'FORBIDDEN');
  }
  if (actor && (isAdmin(actor) || actor.id === store.ownerId)) return actor;
  if (['deleted', 'closed', 'suspended', 'disabled'].includes(String(store.status || '').toLowerCase())) {
    throw new AppError('Storefront is not available', 'FORBIDDEN');
  }
  return actor;
};

const recordKey = (section) => `storeAdmin:${slugify(section || 'general')}`;

const normalizeRecords = (value) => (
  Array.isArray(value?.records) ? value.records : []
);

const toStoreAdminRecord = (storeId, section, setting, record) => ({
  id: record.id,
  storeId,
  section,
  title: record.title || record.data?.name || record.id,
  status: record.status || 'active',
  data: record.data || {},
  createdAt: record.createdAt || setting?.createdAt,
  updatedAt: record.updatedAt || setting?.updatedAt
});

const activeThemeStatus = 'active';
const legacyDemoProductPrefixes = ['AETHER-DEMO-', 'ERA-DEMO-'];
const STORE_CUSTOMER_TOKEN_KIND = 'store_customer';
const jwtSecret = process.env.JWT_SECRET || 'dev-secret';

const mergeSettings = (base, next) => ({
  ...(base || {}),
  ...(next || {}),
  controls: {
    ...(base?.controls || {}),
    ...(next?.controls || {})
  }
});

const normalizeAuraSettings = (catalogTheme, settings) => {
  const nextSettings = mergeSettings(defaultThemeSettings(catalogTheme.defaultTemplate), settings);
  const template = findThemeTemplate(catalogTheme.key, nextSettings.homepageTemplate || catalogTheme.defaultTemplate);
  nextSettings.homepageTemplate = template.key;

  const headerStyle = String(nextSettings.headerStyle || '');
  if (!headerStyle || headerStyle.startsWith('header-') || headerStyle.includes('aether') || headerStyle.includes('era')) {
    nextSettings.headerStyle = template.header;
  }

  return nextSettings;
};

const legacyDemoProductWhere = (storeId) => ({
  storeId,
  status: { not: 'deleted' },
  OR: legacyDemoProductPrefixes.map((prefix) => ({ sku: { startsWith: prefix } }))
});

const demoProductsForTheme = (normalizedKey) => DEMO_PRODUCTS_BY_THEME[normalizedKey] || DEMO_PRODUCTS_BY_THEME[DEFAULT_STOREFRONT_THEME_KEY] || [];

const demoRecordsForTheme = (normalizedKey) => DEMO_RECORDS_BY_THEME[normalizedKey] || DEMO_RECORDS_BY_THEME[DEFAULT_STOREFRONT_THEME_KEY] || {};

const isDemoStorefront = (store) => (
  Boolean(store?.settings?.demoMode) ||
  String(store?.settings?.themeDataMode || '').toLowerCase() === 'demo'
);

const demoProductToStoreProduct = (storeId, normalizedKey, product, index) => {
  const [sku, name, category, price, stock, image, description, rating, reviews, oldPrice] = product;
  return {
    id: `${storeId}:${sku}`,
    storeId,
    sku,
    name,
    category,
    price,
    stock,
    image,
    status: 'active',
    description: description || `${name} demo catalog item for preview mode.`,
    metadata: {
      demo: true,
      source: normalizedKey,
      compareEnabled: true,
      wishlistEnabled: true,
      oldPrice: oldPrice || null,
      compareAtPrice: oldPrice || null,
      rating: rating || 4.6,
      reviews: reviews || 120,
      sortOrder: index + 1
    },
    createdAt: null,
    updatedAt: null
  };
};

const runtimeProductsForTheme = (store, normalizedKey, products) => {
  const themeProducts = products.filter((product) => (
    product.metadata?.demo === true &&
    String(product.metadata?.source || '').toLowerCase() === normalizedKey
  ));
  if (themeProducts.length) return themeProducts;
  if (isDemoStorefront(store)) {
    return demoProductsForTheme(normalizedKey).map((product, index) => demoProductToStoreProduct(store.id, normalizedKey, product, index));
  }
  return products;
};

const demoRecordGroupsForTheme = (storeId, normalizedKey) => (
  normalizeAuraDemoRecords(new Date().toISOString(), normalizedKey).reduce((acc, { sectionName, records }) => {
    acc[sectionName] = records.map((record) => toStoreAdminRecord(storeId, sectionName, null, record));
    return acc;
  }, {})
);

const runtimeRecordGroupsForTheme = (storeId, normalizedKey, recordGroups, template) => {
  const demoGroups = demoRecordGroupsForTheme(storeId, normalizedKey);
  const sections = new Set([
    ...Object.keys(demoGroups),
    ...Object.keys(recordGroups || {})
  ]);
  const merged = {};
  sections.forEach((section) => {
    merged[section] = recordGroups?.[section]?.length ? recordGroups[section] : (demoGroups[section] || []);
  });
  merged['homepage-sections'] = recordGroups?.['homepage-sections']?.length
    ? recordGroups['homepage-sections']
    : (demoGroups['homepage-sections']?.length ? demoGroups['homepage-sections'] : sectionControlRecords(template));
  return merged;
};

const normalizeAuraDemoRecords = (now, normalizedKey) => Object.entries(demoRecordsForTheme(normalizedKey)).map(([sectionName, records]) => ({
  sectionName,
  records: records.map((record, index) => ({
    id: `${sectionName}-${index + 1}`,
    title: record.title,
    status: record.status || 'active',
    data: {
      ...(record.data || {}),
      demo: true
    },
    createdAt: now,
    updatedAt: now
  }))
}));

const upsertAuraDemoProducts = async (ctx, storeId, normalizedKey) => Promise.all(demoProductsForTheme(normalizedKey).map(([sku, name, category, price, stock, image, description, rating, reviews, oldPrice]) => ctx.prisma.storeProduct.upsert({
  where: { storeId_sku: { storeId, sku } },
  create: {
    storeId,
    sku,
    name,
    category,
    price,
    stock,
    image,
    status: 'active',
    description: description || `${name} demo catalog item for preview mode.`,
    metadata: {
      demo: true,
      source: normalizedKey,
      compareEnabled: true,
      wishlistEnabled: true,
      oldPrice: oldPrice || null,
      compareAtPrice: oldPrice || null,
      rating: rating || 4.6,
      reviews: reviews || 120
    }
  },
  update: {
    name,
    category,
    price,
    stock,
    image,
    status: 'active',
    description: description || `${name} demo catalog item for preview mode.`,
    metadata: {
      demo: true,
      source: normalizedKey,
      compareEnabled: true,
      wishlistEnabled: true,
      oldPrice: oldPrice || null,
      compareAtPrice: oldPrice || null,
      rating: rating || 4.6,
      reviews: reviews || 120
    }
  }
})));

const upsertAuraDemoRecords = async (ctx, storeId, now, normalizedKey) => Promise.all(normalizeAuraDemoRecords(now, normalizedKey).map(({ sectionName, records }) => ctx.prisma.systemSetting.upsert({
  where: { scope_scopeId_key: { scope: 'store', scopeId: storeId, key: recordKey(sectionName) } },
  create: {
    scope: 'store',
    scopeId: storeId,
    key: recordKey(sectionName),
    value: { section: sectionName, records }
  },
  update: {
    value: { section: sectionName, records }
  }
})));

const applyAuraDemoData = async (ctx, storeId, normalizedKey, { replaceLegacyProducts = false, replaceRecords = true } = {}) => {
  if (replaceLegacyProducts) {
    await ctx.prisma.storeProduct.updateMany({
      where: legacyDemoProductWhere(storeId),
      data: { status: 'deleted' }
    });
  }

  await upsertAuraDemoProducts(ctx, storeId, normalizedKey);
  const now = new Date().toISOString();
  if (replaceRecords) await upsertAuraDemoRecords(ctx, storeId, now, normalizedKey);

  return now;
};

const ensureAuraDemoMigration = async (ctx, storeId, normalizedKey) => {
  const legacyProductCount = await ctx.prisma.storeProduct.count({
    where: legacyDemoProductWhere(storeId)
  });
  const adminSettings = await ctx.prisma.systemSetting.findMany({
    where: {
      scope: 'store',
      scopeId: storeId,
      key: { startsWith: 'storeAdmin:' }
    }
  });
  const hasLegacyAdminRecords = adminSettings.some((setting) => {
    const serialized = JSON.stringify(setting.value || {}).toLowerCase();
    return serialized.includes('aether') || serialized.includes('era-commerce') || serialized.includes('aether-commerce');
  });

  if (!legacyProductCount && !hasLegacyAdminRecords) return null;
  return applyAuraDemoData(ctx, storeId, normalizedKey, {
    replaceLegacyProducts: Boolean(legacyProductCount),
    replaceRecords: hasLegacyAdminRecords
  });
};

const ensureAuraThemeForStore = async (ctx, storeId) => {
  const currentThemes = await ctx.prisma.storeTheme.findMany({ where: { storeId } });
  const catalogKeys = STOREFRONT_THEME_CATALOG.map((theme) => theme.key);
  await ctx.prisma.storeTheme.updateMany({
    where: { storeId, key: { notIn: catalogKeys }, status: { not: 'deleted' } },
    data: { status: 'deleted' }
  });
  const hasActiveTheme = currentThemes.some((theme) => catalogKeys.includes(theme.key) && theme.status === activeThemeStatus);
  const upsertedThemes = await Promise.all(STOREFRONT_THEME_CATALOG.map((catalogTheme) => {
    const existingTheme = currentThemes.find((theme) => theme.key === catalogTheme.key);
    const nextSettings = normalizeAuraSettings(catalogTheme, existingTheme?.settings);
    const status = existingTheme?.status === activeThemeStatus || (!hasActiveTheme && catalogTheme.key === DEFAULT_STOREFRONT_THEME_KEY)
      ? activeThemeStatus
      : (existingTheme?.status || 'available');

    return ctx.prisma.storeTheme.upsert({
      where: { storeId_key: { storeId, key: catalogTheme.key } },
      create: {
        storeId,
        key: catalogTheme.key,
        name: catalogTheme.name,
        status,
        settings: nextSettings
      },
      update: {
        name: catalogTheme.name,
        status,
        settings: nextSettings
      }
    });
  }));

  await Promise.all(STOREFRONT_PLUGIN_MODULES.map((plugin) => ctx.prisma.storePlugin.upsert({
    where: { storeId_key: { storeId, key: plugin.key } },
    create: {
      storeId,
      key: plugin.key,
      name: plugin.name,
      status: plugin.status,
      settings: plugin.settings
    },
    update: {
      name: plugin.name,
      settings: mergeSettings(plugin.settings, {})
    }
  })));

  return upsertedThemes.find((theme) => theme.status === activeThemeStatus) || upsertedThemes[0];
};

const ensureStorefrontTheme = async (ctx, storeId, key = DEFAULT_STOREFRONT_THEME_KEY) => {
  await ensureAuraThemeForStore(ctx, storeId);
  const normalizedKey = normalizeStorefrontThemeKey(key);
  const theme = findStorefrontTheme(normalizedKey);
  if (!theme) throw new AppError('Theme not found', 'NOT_FOUND');
  return ctx.prisma.storeTheme.upsert({
    where: { storeId_key: { storeId, key: normalizedKey } },
    create: { storeId, key: theme.key, name: theme.name, status: 'available', settings: defaultThemeSettings(theme.defaultTemplate) },
    update: { name: theme.name }
  });
};

const readStoreRecordGroups = async (ctx, storeId, sections) => {
  if (!sections.length) return {};
  const settings = await ctx.prisma.systemSetting.findMany({
    where: {
      scope: 'store',
      scopeId: storeId,
      key: { in: sections.map(recordKey) }
    }
  });
  return settings.reduce((acc, setting) => {
    const section = setting.value?.section || String(setting.key || '').replace('storeAdmin:', '');
    acc[section] = normalizeRecords(setting.value).map((record) => toStoreAdminRecord(storeId, section, setting, record));
    return acc;
  }, {});
};

const sectionControlRecords = (template) => template.sections.map((item) => ({
  id: item.id,
  title: item.title,
  status: item.enabled ? 'active' : 'disabled',
  data: item
}));

export const listProducts = async (ctx, storeId, { status, search, page, limit } = {}) => {
  await requireStoreAccess(ctx, storeId);
  return toApi(await ctx.prisma.storeProduct.findMany({
    where: { storeId, ...(status ? { status } : {}), ...searchWhere(search, ['name', 'sku', 'category']) },
    orderBy: { createdAt: 'desc' },
    ...pagination({ page, limit })
  }));
};

export const listOrders = async (ctx, storeId, { status, page, limit } = {}) => {
  await requireStoreAccess(ctx, storeId);
  return toApi(await ctx.prisma.storeOrder.findMany({
    where: { storeId, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
    ...pagination({ page, limit })
  }));
};

export const listCustomers = async (ctx, storeId, { search, page, limit } = {}) => {
  await requireStoreAccess(ctx, storeId);
  return toApi(await ctx.prisma.storeCustomer.findMany({
    where: { storeId, ...searchWhere(search, ['name', 'email', 'phone', 'tier']) },
    orderBy: { createdAt: 'desc' },
    ...pagination({ page, limit })
  }));
};

export const listThemes = async (ctx, storeId) => {
  await requireStoreAccess(ctx, storeId);
  await ensureAuraThemeForStore(ctx, storeId);
  return toApi(await ctx.prisma.storeTheme.findMany({
    where: { storeId, status: { not: 'deleted' } },
    orderBy: { name: 'asc' }
  }));
};

export const listPlugins = async (ctx, storeId) => {
  await requireStoreAccess(ctx, storeId);
  await ensureAuraThemeForStore(ctx, storeId);
  return toApi(await ctx.prisma.storePlugin.findMany({
    where: { storeId, status: { not: 'deleted' } },
    orderBy: { name: 'asc' }
  }));
};

export const createStore = async (ctx, actor, input) => {
  if (!isAdmin(actor)) {
    await ensureOwnerHasCredit(ctx, actor.id, 'Credit balance is empty. Add credit now before opening an ecommerce store.');
  }

  const [rootDomain, nameservers, serverIp] = await Promise.all([
    primaryDomainFor(ctx),
    defaultNameserversFor(ctx),
    serverIpFor(ctx)
  ]);
  const { subdomain: cleanSlug, domain: storeDomain } = await assertStoreSubdomainAvailable(ctx, input.slug || input.name);
  const customDomain = normalizeHostname(input.customDomain);
  if (customDomain) {
    const existingCustomDomain = await ctx.prisma.store.findFirst({
      where: {
        OR: [
          { domain: customDomain },
          { customDomain }
        ]
      },
      select: { id: true }
    });
    if (existingCustomDomain) {
      throw new AppError('Custom domain is already connected to another store.', 'BAD_USER_INPUT');
    }
  }

  const plan = await planByCode(ctx, 'ecommerce', input.planCode || 'pro');
  const monthlyCost = Number(plan?.price || 0);
  const hourlyRate = monthlyCost > 0 ? firstHourCharge(monthlyCost) : 0;
  if (!isAdmin(actor) && hourlyRate > 0) {
    await requireProvisioningCredit(ctx, actor.id, hourlyRate, `Add at least USD ${hourlyRate.toFixed(2)} credit before opening this ecommerce store.`);
  }
  const store = await ctx.prisma.store.create({
    data: {
      ownerId: actor.id,
      planId: plan?.id,
      name: input.name,
      slug: cleanSlug,
      category: input.category,
      domain: storeDomain,
      customDomain: customDomain || null,
      contactEmail: input.contactEmail,
      phone: input.phone,
      address: input.address,
      settings: mergeSettings(input.settings, {
        theme: DEFAULT_STOREFRONT_THEME_KEY,
        homepageTemplate: DEFAULT_STOREFRONT_THEME_KEY,
        rootDomain,
        routeMode: 'powerdns_authoritative',
        ssl: 'queued'
      })
    }
  });

  const domain = await ctx.prisma.domain.upsert({
    where: { name: rootDomain },
    create: {
      ownerId: actor.id,
      name: rootDomain,
      dns: nameservers,
      status: 'active',
      records: [storefrontRouteRecord(cleanSlug, serverIp)]
    },
    update: {
      ownerId: actor.id,
      status: 'active',
      dns: nameservers,
      records: [storefrontRouteRecord(cleanSlug, serverIp)]
    }
  });

  await ctx.prisma.dnsRecord.upsert({
    where: { id: `store_${store.id}_subdomain_a` },
    create: {
      id: `store_${store.id}_subdomain_a`,
      domainId: domain.id,
      type: 'A',
      name: cleanSlug,
      value: serverIp,
      ttl: 300,
      metadata: { storeId: store.id, autoProvisioned: true, routeMode: 'powerdns_authoritative', ssl: 'queued', provider: 'powerdns' }
    },
    update: { type: 'A', name: cleanSlug, value: serverIp, status: 'active', metadata: { storeId: store.id, autoProvisioned: true, routeMode: 'powerdns_authoritative', ssl: 'queued', provider: 'powerdns' } }
  });
  await syncPowerDnsDomain(ctx, domain.id).catch(() => {});
  await queueSslInstallForDomains({ prisma: ctx.prisma, domains: [store.domain], actor }).catch(() => {});

  let customDomainId = null;
  if (customDomain) {
    const custom = await ctx.prisma.domain.upsert({
      where: { name: customDomain },
      create: {
        ownerId: actor.id,
        name: customDomain,
        dns: nameservers,
        status: 'active',
        records: [customDomainRecord(serverIp)]
      },
      update: {
        ownerId: actor.id,
        status: 'active',
        dns: nameservers,
        records: [customDomainRecord(serverIp)]
      }
    });
    customDomainId = custom.id;

    await ctx.prisma.dnsRecord.upsert({
      where: { id: `store_${store.id}_custom_domain_cname` },
      create: {
        id: `store_${store.id}_custom_domain_cname`,
        domainId: custom.id,
        type: 'A',
        name: '@',
        value: serverIp,
        ttl: 300,
        metadata: { storeId: store.id, autoProvisioned: true, routeMode: 'powerdns_authoritative', ssl: 'queued', provider: 'powerdns' }
      },
      update: { type: 'A', value: serverIp, status: 'active', metadata: { storeId: store.id, autoProvisioned: true, routeMode: 'powerdns_authoritative', ssl: 'queued', provider: 'powerdns' } }
    });
    await syncPowerDnsDomain(ctx, custom.id).catch(() => {});
    await queueSslInstallForDomains({ prisma: ctx.prisma, domains: [customDomain], actor }).catch(() => {});
  }

  await ensureAuraThemeForStore(ctx, store.id);

  await ctx.prisma.systemSetting.upsert({
    where: { scope_scopeId_key: { scope: 'store', scopeId: store.id, key: 'provisioning' } },
    create: {
      scope: 'store',
      scopeId: store.id,
      key: 'provisioning',
      value: {
        publicUrl: `https://${store.domain}`,
        wildcardUrl: `https://*.${rootDomain}`,
        customUrl: customDomain ? `https://${customDomain}` : null,
        ssl: 'queued',
        customDomainSsl: customDomain ? 'queued_powerdns_auto_ssl' : null,
        domainId: domain.id,
        customDomainId,
        theme: DEFAULT_STOREFRONT_THEME_KEY,
        journey: ['plan_selected', 'identity_created', 'subdomain_checked', 'powerdns_record_synced', 'ssl_queued', 'theme_installed', 'plugins_seeded']
      }
    },
    update: {
      value: {
        publicUrl: `https://${store.domain}`,
        wildcardUrl: `https://*.${rootDomain}`,
        customUrl: customDomain ? `https://${customDomain}` : null,
        ssl: 'queued',
        customDomainSsl: customDomain ? 'queued_powerdns_auto_ssl' : null,
        domainId: domain.id,
        customDomainId,
        theme: DEFAULT_STOREFRONT_THEME_KEY,
        journey: ['plan_selected', 'identity_created', 'subdomain_checked', 'powerdns_record_synced', 'ssl_queued', 'theme_installed', 'plugins_seeded']
      }
    }
  });

  await writeAudit(ctx, 'create_store', 'store', store.id, { slug: cleanSlug });
  if (!isAdmin(actor) && hourlyRate > 0) {
    await chargeProvisioningCredit(ctx, {
      ownerId: actor.id,
      amount: hourlyRate,
      scope: 'store',
      scopeId: store.id,
      label: `${store.name} ecommerce first hour`,
      monthlyCost,
      hourlyRate,
      metadata: { storeId: store.id, planCode: plan?.code || input.planCode || 'pro' }
    });
  }
  return toApi(store);
};

export const updateStore = async (ctx, input) => {
  const { id, ...data } = input;
  const existing = await ctx.prisma.store.findUnique({ where: { id } });
  if (!existing) throw new AppError('Store not found', 'NOT_FOUND');
  await canManageOwnerResource(ctx, existing.ownerId);
  const store = await ctx.prisma.store.update({ where: { id }, data: removeUndefined(data) });
  await writeAudit(ctx, 'update_store', 'store', id);
  return toApi(store);
};

export const deleteStore = async (ctx, id) => {
  const store = await ctx.prisma.store.findUnique({ where: { id } });
  if (!store) throw new AppError('Store not found', 'NOT_FOUND');
  await canManageOwnerResource(ctx, store.ownerId);

  await ctx.prisma.$transaction(async (tx) => {
    await tx.systemSetting.deleteMany({ where: { scope: 'store', scopeId: id } });
    await tx.subscription.deleteMany({ where: { scope: 'store', scopeId: id } });
    await tx.domain.deleteMany({
      where: {
        ownerId: store.ownerId,
        name: { in: [store.domain, store.customDomain].filter(Boolean) }
      }
    });
    await tx.store.delete({ where: { id } });
  });

  await writeAudit(ctx, 'delete_store', 'store', id, { slug: store.slug });
  return true;
};

export const createProduct = async (ctx, input) => {
  const store = await ctx.prisma.store.findUnique({ where: { id: input.storeId } });
  await canManageOwnerResource(ctx, store.ownerId);
  const product = await ctx.prisma.storeProduct.create({
    data: { ...input, stock: input.stock ?? 0, status: input.status || 'active' }
  });
  await writeAudit(ctx, 'create_product', 'storeProduct', product.id, { storeId: input.storeId });
  return toApi(product);
};

export const updateProduct = async (ctx, input) => {
  const { id, ...data } = input;
  const current = await ctx.prisma.storeProduct.findUnique({ where: { id }, include: { store: true } });
  await canManageOwnerResource(ctx, current.store.ownerId);
  const product = await ctx.prisma.storeProduct.update({ where: { id }, data: removeUndefined(data) });
  await writeAudit(ctx, 'update_product', 'storeProduct', id);
  return toApi(product);
};

export const deleteProduct = async (ctx, id) => {
  const current = await ctx.prisma.storeProduct.findUnique({ where: { id }, include: { store: true } });
  await canManageOwnerResource(ctx, current.store.ownerId);
  await ctx.prisma.storeProduct.delete({ where: { id } });
  await writeAudit(ctx, 'delete_product', 'storeProduct', id);
  return true;
};

export const createCustomer = async (ctx, input) => {
  const store = await ctx.prisma.store.findUnique({ where: { id: input.storeId } });
  await canManageOwnerResource(ctx, store.ownerId);
  const customer = await ctx.prisma.storeCustomer.create({
    data: {
      ...input,
      email: normalizeEmail(input.email),
      tier: input.tier || 'standard',
      status: input.status || 'active'
    }
  });
  await writeAudit(ctx, 'create_customer', 'storeCustomer', customer.id, { storeId: input.storeId });
  return toApi(customer);
};

const signStoreCustomerToken = (customer) => (
  jwt.sign({
    sub: customer.id,
    kind: STORE_CUSTOMER_TOKEN_KIND,
    storeId: customer.storeId
  }, jwtSecret, { expiresIn: '30d' })
);

const resolvePublicStore = async (ctx, { storeId, slug, domain } = {}) => {
  const cleanDomain = normalizeHostname(domain);
  const where = storeId
    ? { id: storeId }
    : slug
      ? { slug }
      : cleanDomain
        ? { OR: [{ domain: cleanDomain }, { customDomain: cleanDomain }] }
        : ctx.storeCustomer?.storeId
          ? { id: ctx.storeCustomer.storeId }
          : {};
  const store = await ctx.prisma.store.findFirst({ where });
  if (!store) throw new AppError('Store not found', 'NOT_FOUND');
  await ensurePublicStorefrontAccess(ctx, store);
  return store;
};

const requireStoreCustomer = async (ctx, storeId) => {
  const customer = ctx.storeCustomer;
  if (!customer) throw new AppError('Store customer login is required', 'UNAUTHENTICATED');
  if (storeId && customer.storeId !== storeId) {
    throw new AppError('This customer account belongs to another store', 'FORBIDDEN');
  }
  if (['deleted', 'disabled', 'blocked', 'banned', 'suspended'].includes(String(customer.status || '').toLowerCase())) {
    throw new AppError('This store customer account is not active', 'FORBIDDEN');
  }
  return customer;
};

const themeKeyForStore = (store, themeKey) => normalizeStorefrontThemeKey(themeKey || store.settings?.theme || DEFAULT_STOREFRONT_THEME_KEY);

const dashboardStats = (customer, orders) => {
  const paidStatuses = new Set(['paid', 'delivered', 'fulfilled', 'in_transit', 'shipped']);
  const openOrders = orders.filter((order) => !['delivered', 'cancelled', 'canceled', 'refunded'].includes(String(order.status || '').toLowerCase()));
  return {
    orderCount: orders.length,
    openOrders: openOrders.length,
    deliveredOrders: orders.filter((order) => String(order.status || '').toLowerCase() === 'delivered').length,
    totalSpent: orders.reduce((sum, order) => (
      paidStatuses.has(String(order.status || '').toLowerCase()) ? sum + Number(order.total || 0) : sum
    ), 0),
    points: customer.points || 0,
    tier: customer.tier || 'standard'
  };
};

export const getStoreCustomerDashboard = async (ctx, args = {}) => {
  const store = await resolvePublicStore(ctx, args);
  const customer = await requireStoreCustomer(ctx, store.id);
  const themeKey = themeKeyForStore(store, args.themeKey);
  const runtime = await getStoreThemeRuntime(ctx, { storeId: store.id, themeKey, preview: false });
  const orders = await ctx.prisma.storeOrder.findMany({
    where: {
      storeId: store.id,
      OR: [
        { customerId: customer.id },
        { shipping: { path: ['email'], equals: customer.email } },
        { payment: { path: ['email'], equals: customer.email } }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  return toApi({
    store,
    activeTheme: runtime.activeTheme,
    settings: runtime.settings,
    customer,
    orders,
    products: runtime.products,
    categories: runtime.categories,
    records: runtime.records,
    stats: dashboardStats(customer, orders)
  });
};

const storeCustomerAuthPayload = async (ctx, customer, store, themeKey) => {
  const nextCustomer = await ctx.prisma.storeCustomer.update({
    where: { id: customer.id },
    data: { lastLoginAt: new Date() }
  });
  const token = signStoreCustomerToken(nextCustomer);
  const dashboard = await getStoreCustomerDashboard({
    ...ctx,
    storeCustomer: nextCustomer
  }, { storeId: store.id, themeKey });
  return toApi({ token, customer: nextCustomer, dashboard });
};

export const registerStoreCustomer = async (ctx, input) => {
  const store = await resolvePublicStore(ctx, input);
  const email = normalizeEmail(input.email);
  if (!email) throw new AppError('Email is required', 'BAD_USER_INPUT');
  if (!input.password || String(input.password).length < 6) {
    throw new AppError('Password must be at least 6 characters', 'BAD_USER_INPUT');
  }

  const existing = await ctx.prisma.storeCustomer.findUnique({
    where: { storeId_email: { storeId: store.id, email } }
  });
  if (existing?.passwordHash) {
    throw new AppError('A customer account already exists for this store and email', 'BAD_USER_INPUT');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const customer = existing
    ? await ctx.prisma.storeCustomer.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        phone: input.phone,
        address: input.address,
        passwordHash,
        status: 'active'
      }
    })
    : await ctx.prisma.storeCustomer.create({
      data: {
        storeId: store.id,
        name: input.name,
        email,
        phone: input.phone,
        address: input.address,
        passwordHash,
        status: 'active',
        tier: 'standard'
      }
    });

  await writeAudit(ctx, 'register_store_customer', 'storeCustomer', customer.id, { storeId: store.id });
  return storeCustomerAuthPayload(ctx, customer, store, input.themeKey);
};

export const loginStoreCustomer = async (ctx, input) => {
  const store = await resolvePublicStore(ctx, input);
  const customer = await ctx.prisma.storeCustomer.findUnique({
    where: { storeId_email: { storeId: store.id, email: normalizeEmail(input.email) } }
  });
  if (!customer?.passwordHash) throw new AppError('Invalid email or password', 'UNAUTHENTICATED');
  if (['deleted', 'disabled', 'blocked', 'banned', 'suspended'].includes(String(customer.status || '').toLowerCase())) {
    throw new AppError('This customer account is not active', 'FORBIDDEN');
  }
  const ok = await bcrypt.compare(input.password || '', customer.passwordHash);
  if (!ok) throw new AppError('Invalid email or password', 'UNAUTHENTICATED');
  return storeCustomerAuthPayload(ctx, customer, store, input.themeKey);
};

export const updateStoreCustomerProfile = async (ctx, input = {}) => {
  const customer = await requireStoreCustomer(ctx);
  const updated = await ctx.prisma.storeCustomer.update({
    where: { id: customer.id },
    data: removeUndefined({
      name: input.name,
      phone: input.phone,
      address: input.address
    })
  });
  await writeAudit(ctx, 'update_store_customer_profile', 'storeCustomer', updated.id, { storeId: updated.storeId });
  return toApi(updated);
};

export const updateStoreCustomer = async (ctx, input) => {
  const { id, ...data } = input;
  const current = await ctx.prisma.storeCustomer.findUnique({ where: { id }, include: { store: true } });
  if (!current) throw new AppError('Store customer not found', 'NOT_FOUND');
  await canManageOwnerResource(ctx, current.store.ownerId);
  const customer = await ctx.prisma.storeCustomer.update({
    where: { id },
    data: removeUndefined({
      ...data,
      email: data.email ? normalizeEmail(data.email) : undefined
    })
  });
  await writeAudit(ctx, 'update_store_customer', 'storeCustomer', id, { storeId: current.storeId });
  return toApi(customer);
};

export const deleteStoreCustomer = async (ctx, id) => {
  const current = await ctx.prisma.storeCustomer.findUnique({ where: { id }, include: { store: true } });
  if (!current) throw new AppError('Store customer not found', 'NOT_FOUND');
  await canManageOwnerResource(ctx, current.store.ownerId);
  await ctx.prisma.storeCustomer.update({ where: { id }, data: { status: 'deleted' } });
  await writeAudit(ctx, 'delete_store_customer', 'storeCustomer', id, { storeId: current.storeId });
  return true;
};

export const listStoreCustomerGroups = async (ctx, { search } = {}) => {
  await requireAdmin(ctx);
  const stores = await ctx.prisma.store.findMany({
    where: {
      status: { not: 'deleted' },
      ...searchWhere(search, ['name', 'slug', 'domain', 'customDomain'])
    },
    orderBy: { createdAt: 'desc' },
    take: 200
  });
  const groups = await Promise.all(stores.map(async (store) => {
    const [customerCount, activeCount, latestCustomer] = await Promise.all([
      ctx.prisma.storeCustomer.count({ where: { storeId: store.id, status: { not: 'deleted' } } }),
      ctx.prisma.storeCustomer.count({ where: { storeId: store.id, status: 'active' } }),
      ctx.prisma.storeCustomer.findFirst({
        where: { storeId: store.id, status: { not: 'deleted' } },
        orderBy: { createdAt: 'desc' }
      })
    ]);
    return { store, customerCount, activeCount, latestCustomer };
  }));
  return toApi(groups);
};

export const createOrder = async (ctx, input) => {
  const store = await ctx.prisma.store.findUnique({ where: { id: input.storeId } });
  if (!store) throw new AppError('Store not found', 'NOT_FOUND');
  await ensurePublicStorefrontAccess(ctx, store);
  await ensureOwnerHasCredit(ctx, store.ownerId, 'This store is paused because its owner has no credit. Add credit now before accepting orders.');
  const number = input.number || `TW${Date.now().toString().slice(-6)}`;
  const storeCustomer = ctx.storeCustomer?.storeId === store.id ? ctx.storeCustomer : null;
  const order = await ctx.prisma.storeOrder.create({
    data: {
      ...input,
      customerId: input.customerId || storeCustomer?.id,
      number,
      status: input.status || 'pending',
      currency: input.currency || store.currency || 'USD'
    }
  });
  if (Array.isArray(input.items)) {
    await Promise.all(input.items
      .filter((item) => item?.productId && Number(item.qty || 0) > 0)
      .map((item) => ctx.prisma.storeProduct.updateMany({
        where: { id: item.productId, storeId: input.storeId },
        data: { stock: { decrement: Number(item.qty || 0) } }
      })));
  }
  await writeAudit(ctx, 'create_order', 'storeOrder', order.id, { storeId: input.storeId });
  await ctx.prisma.notification.create({
    data: {
      ownerId: store.ownerId,
      scope: 'store',
      scopeId: store.id,
      type: 'order',
      title: 'New store order',
      message: `${store.name} received order ${order.number} for ${order.currency} ${Number(order.total || 0).toFixed(2)}.`,
      status: 'unread',
      metadata: { storeId: store.id, orderId: order.id, path: '/store/admin/orders' }
    }
  }).catch(() => null);
  const owner = await ctx.prisma.user.findUnique({ where: { id: store.ownerId } }).catch(() => null);
  await sendTiwloEmail(ctx, {
    to: owner?.email,
    subject: `New order ${order.number}`,
    title: 'New store order',
    preview: `${store.name} received a new order.`,
    html: [
      paragraph(`${store.name} received order ${order.number}.`),
      paragraph(`Total: ${order.currency} ${Number(order.total || 0).toFixed(2)}.`)
    ].join('')
  });
  if (storeCustomer?.email) {
    await sendTiwloEmail(ctx, {
      to: storeCustomer.email,
      subject: `Order ${order.number} received`,
      title: 'Order received',
      preview: `${store.name} received your order.`,
      html: [
        paragraph(`Thanks ${storeCustomer.name || 'there'}, your order ${order.number} was received by ${store.name}.`),
        paragraph(`Total: ${order.currency} ${Number(order.total || 0).toFixed(2)}.`)
      ].join('')
    });
  }
  return toApi(order);
};

export const updateOrderStatus = async (ctx, id, status) => {
  const current = await ctx.prisma.storeOrder.findUnique({ where: { id }, include: { store: true } });
  await canManageOwnerResource(ctx, current.store.ownerId);
  const order = await ctx.prisma.storeOrder.update({ where: { id }, data: { status } });
  await writeAudit(ctx, 'update_order_status', 'storeOrder', id, { status });
  return toApi(order);
};

export const selectTheme = async (ctx, storeId, key) => {
  const store = await ctx.prisma.store.findUnique({ where: { id: storeId } });
  await canManageOwnerResource(ctx, store.ownerId);
  const normalizedKey = normalizeStorefrontThemeKey(key);
  await ensureStorefrontTheme(ctx, storeId, normalizedKey);
  await ctx.prisma.storeTheme.updateMany({ where: { storeId }, data: { status: 'available' } });
  const theme = await ctx.prisma.storeTheme.update({ where: { storeId_key: { storeId, key: normalizedKey } }, data: { status: 'active' } });
  const catalogTheme = findStorefrontTheme(normalizedKey) || findStorefrontTheme(DEFAULT_STOREFRONT_THEME_KEY);
  await ctx.prisma.store.update({
    where: { id: storeId },
    data: {
      settings: mergeSettings(store.settings, {
        theme: normalizedKey,
        homepageTemplate: theme.settings?.homepageTemplate || catalogTheme?.defaultTemplate || DEFAULT_STOREFRONT_THEME_KEY
      })
    }
  });
  await writeAudit(ctx, 'select_theme', 'storeTheme', theme.id, { key: normalizedKey });
  return toApi(theme);
};

export const installPlugin = async (ctx, storeId, key, name) => {
  const store = await ctx.prisma.store.findUnique({ where: { id: storeId } });
  await canManageOwnerResource(ctx, store.ownerId);
  const plugin = await ctx.prisma.storePlugin.upsert({
    where: { storeId_key: { storeId, key } },
    create: { storeId, key, name, status: 'active', settings: {} },
    update: { status: 'active' }
  });
  await writeAudit(ctx, 'install_plugin', 'storePlugin', plugin.id, { key });
  return toApi(plugin);
};

export const togglePlugin = async (ctx, id, status) => {
  const current = await ctx.prisma.storePlugin.findUnique({ where: { id }, include: { store: true } });
  await canManageOwnerResource(ctx, current.store.ownerId);
  const plugin = await ctx.prisma.storePlugin.update({ where: { id }, data: { status } });
  await writeAudit(ctx, 'toggle_plugin', 'storePlugin', id, { status });
  return toApi(plugin);
};

export const storefrontThemeCatalog = async () => toApi(STOREFRONT_THEME_CATALOG);

export const updateThemeSettings = async (ctx, input) => {
  const store = await requireStoreAccess(ctx, input.storeId);
  const normalizedKey = normalizeStorefrontThemeKey(input.key);
  await ensureStorefrontTheme(ctx, input.storeId, normalizedKey);
  const current = await ctx.prisma.storeTheme.findUnique({ where: { storeId_key: { storeId: input.storeId, key: normalizedKey } } });
  const nextSettings = mergeSettings(current?.settings || defaultThemeSettings(), input.settings || {});
  const template = findThemeTemplate(normalizedKey, nextSettings.homepageTemplate);
  const theme = await ctx.prisma.storeTheme.update({
    where: { storeId_key: { storeId: input.storeId, key: normalizedKey } },
    data: {
      settings: {
        ...nextSettings,
        homepageTemplate: template.key,
        headerStyle: nextSettings.headerStyle || template.header
      }
    }
  });
  await ctx.prisma.store.update({
    where: { id: store.id },
    data: { settings: mergeSettings(store.settings, { theme: normalizedKey, homepageTemplate: template.key }) }
  });
  await writeAudit(ctx, 'update_store_theme_settings', 'storeTheme', theme.id, {
    storeId: input.storeId,
    key: normalizedKey
  });
  return toApi(theme);
};

export const selectHomepageTemplate = async (ctx, input) => {
  const normalizedKey = normalizeStorefrontThemeKey(input.themeKey || input.templateKey);
  const template = findThemeTemplate(normalizedKey, input.templateKey || normalizedKey);
  return updateThemeSettings(ctx, {
    storeId: input.storeId,
    key: normalizedKey,
    settings: {
      homepageTemplate: template.key,
      headerStyle: template.header
    }
  });
};

const runtimeStoreWhere = ({ storeId, slug, domain } = {}) => {
  if (storeId) return { id: storeId };
  if (slug) return { slug };
  const cleanDomain = normalizeHostname(domain);
  if (cleanDomain) return { OR: [{ domain: cleanDomain }, { customDomain: cleanDomain }] };
  throw new AppError('Store id, slug, or domain is required', 'BAD_USER_INPUT');
};

export const getStoreThemeRuntime = async (ctx, args = {}) => {
  const store = await ctx.prisma.store.findFirst({ where: runtimeStoreWhere(args) });
  if (!store) throw new AppError('Store not found', 'NOT_FOUND');
  await ensurePublicStorefrontAccess(ctx, store);

  const themeKey = normalizeStorefrontThemeKey(args.themeKey || args.templateKey || store.settings?.theme || DEFAULT_STOREFRONT_THEME_KEY);
  await ensureStorefrontTheme(ctx, store.id, themeKey);
  await ensureAuraDemoMigration(ctx, store.id, themeKey);
  let activeTheme = await ctx.prisma.storeTheme.findUnique({ where: { storeId_key: { storeId: store.id, key: themeKey } } });
  if (!activeTheme) activeTheme = await ensureStorefrontTheme(ctx, store.id, DEFAULT_STOREFRONT_THEME_KEY);

  const catalogTheme = findStorefrontTheme(activeTheme.key) || findStorefrontTheme(DEFAULT_STOREFRONT_THEME_KEY) || AURA_THEME_CATALOG;
  const mergedSettings = mergeSettings(defaultThemeSettings(catalogTheme.defaultTemplate), activeTheme.settings);
  const template = findThemeTemplate(activeTheme.key, args.templateKey || mergedSettings.homepageTemplate || catalogTheme.defaultTemplate);
  const products = await ctx.prisma.storeProduct.findMany({
    where: { storeId: store.id, status: { not: 'deleted' } },
    orderBy: { createdAt: 'desc' },
    take: 60
  });
  const recordGroups = await readStoreRecordGroups(ctx, store.id, [
    'categories',
    'brands',
    'header',
    'homepage-sections',
    'homepage-sliders',
    'homepage-banners',
    'navigation',
    'footer',
    'widgets',
    'media',
    'reviews',
    'coupons',
    'seo',
    'online-store',
    'product-page',
    'category-page',
    'search-page',
    'cart-page',
    'compare',
    'checkout-flow',
    'track-order',
    'customer-dashboard',
    'plugin-map',
    'blog-posts',
    'theme-settings',
    'domains',
    'languages'
  ]);
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))].map((name) => ({
    id: slugify(name),
    name,
    count: products.filter((product) => product.category === name).length
  }));
  const runtimeProducts = runtimeProductsForTheme(store, activeTheme.key, products);
  const runtimeCategories = [...new Set(runtimeProducts.map((product) => product.category).filter(Boolean))].map((name) => ({
    id: slugify(name),
    name,
    count: runtimeProducts.filter((product) => product.category === name).length
  }));
  const managedCategories = (recordGroups.categories || [])
    .filter((record) => !['disabled', 'deleted', 'hidden'].includes(String(record.status || '').toLowerCase()))
    .map((record) => {
      const name = record.data?.name || record.title;
      return {
        id: record.data?.slug || slugify(name),
        name,
        count: runtimeProducts.filter((product) => product.category === name).length,
        image: record.data?.image || '',
        parent: record.data?.parent || '',
        type: record.data?.type || 'main'
      };
    })
    .filter((category) => category.name);
  const categoryRows = [...managedCategories, ...(runtimeCategories.length ? runtimeCategories : categories)];
  const categoryMap = new Map(categoryRows.map((category) => [String(category.name).toLowerCase(), category]));
  const runtimeRecords = isDemoStorefront(store)
    ? runtimeRecordGroupsForTheme(store.id, activeTheme.key, recordGroups, template)
    : {
      ...recordGroups,
      'homepage-sections': recordGroups['homepage-sections']?.length ? recordGroups['homepage-sections'] : sectionControlRecords(template)
    };

  return toApi({
    theme: catalogTheme,
    store,
    activeTheme,
    activeTemplate: template,
    settings: mergeSettings(mergedSettings, {
      homepageTemplate: template.key,
      previewMode: Boolean(args.preview)
    }),
    preview: Boolean(args.preview),
    products: runtimeProducts,
    categories: Array.from(categoryMap.values()),
    records: runtimeRecords,
    modules: catalogTheme.modules || [],
    adminControls: catalogTheme.controls
  });
};

export const importStoreThemeDemoData = async (ctx, storeId, themeKey = DEFAULT_STOREFRONT_THEME_KEY) => {
  const store = await requireStoreAccess(ctx, storeId);
  const normalizedKey = normalizeStorefrontThemeKey(themeKey);
  await ensureStorefrontTheme(ctx, storeId, normalizedKey);
  const now = await applyAuraDemoData(ctx, storeId, normalizedKey, {
    replaceLegacyProducts: true,
    replaceRecords: true
  });

  await updateThemeSettings(ctx, {
    storeId,
    key: normalizedKey,
    settings: {
      demoMode: true,
      demoImportedAt: now,
      homepageTemplate: store.settings?.homepageTemplate || normalizedKey,
      previewTransactions: false
    }
  });

  await writeAudit(ctx, 'import_store_theme_demo_data', 'storeTheme', normalizedKey, { storeId });
  return getStoreThemeRuntime(ctx, { storeId, themeKey: normalizedKey, preview: true });
};

export const eraseStoreThemeDemoData = async (ctx, storeId, themeKey) => {
  const store = await requireStoreAccess(ctx, storeId);
  const normalizedKey = themeKey ? normalizeStorefrontThemeKey(themeKey) : '';
  const now = new Date().toISOString();

  const products = await ctx.prisma.storeProduct.findMany({
    where: { storeId },
    select: { id: true, sku: true, metadata: true }
  });
  const demoProductIds = products
    .filter((product) => {
      const source = String(product.metadata?.source || '').toLowerCase();
      const isLegacyDemo = legacyDemoProductPrefixes.some((prefix) => String(product.sku || '').startsWith(prefix));
      const isCurrentTheme = !normalizedKey || source === normalizedKey || !source;
      return (product.metadata?.demo === true || isLegacyDemo) && isCurrentTheme;
    })
    .map((product) => product.id);

  if (demoProductIds.length) {
    await ctx.prisma.storeProduct.deleteMany({ where: { id: { in: demoProductIds } } });
  }

  const recordSettings = await ctx.prisma.systemSetting.findMany({
    where: {
      scope: 'store',
      scopeId: storeId,
      key: { startsWith: 'storeAdmin:' }
    }
  });
  let deletedRecords = 0;
  for (const setting of recordSettings) {
    const records = normalizeRecords(setting.value);
    const nextRecords = records.filter((record) => record.data?.demo !== true);
    if (nextRecords.length === records.length) continue;
    deletedRecords += records.length - nextRecords.length;
    await ctx.prisma.systemSetting.update({
      where: { id: setting.id },
      data: {
        value: {
          ...(setting.value || {}),
          section: setting.value?.section || String(setting.key || '').replace('storeAdmin:', ''),
          records: nextRecords
        }
      }
    });
  }

  await ctx.prisma.store.update({
    where: { id: storeId },
    data: {
      settings: mergeSettings(store.settings, {
        demoMode: false,
        themeDataMode: 'live',
        demoImportedAt: null,
        demoErasedAt: now
      })
    }
  });

  const themes = await ctx.prisma.storeTheme.findMany({
    where: normalizedKey ? { storeId, key: normalizedKey } : { storeId }
  });
  for (const theme of themes) {
    await ctx.prisma.storeTheme.update({
      where: { id: theme.id },
      data: {
        settings: mergeSettings(theme.settings, {
          demoMode: false,
          themeDataMode: 'live',
          demoImportedAt: null,
          demoErasedAt: now
        })
      }
    });
  }

  await writeAudit(ctx, 'erase_store_theme_demo_data', 'storeTheme', normalizedKey || 'all', {
    storeId,
    products: demoProductIds.length,
    records: deletedRecords
  });

  return getStoreThemeRuntime(ctx, {
    storeId,
    themeKey: normalizedKey || store.settings?.theme || DEFAULT_STOREFRONT_THEME_KEY,
    preview: false
  });
};

export const listAdminRecords = async (ctx, storeId, section) => {
  await requireStoreAccess(ctx, storeId);
  const setting = await ctx.prisma.systemSetting.findUnique({
    where: { scope_scopeId_key: { scope: 'store', scopeId: storeId, key: recordKey(section) } }
  });
  return normalizeRecords(setting?.value).map((record) => toStoreAdminRecord(storeId, section, setting, record));
};

export const upsertAdminRecord = async (ctx, input) => {
  await requireStoreAccess(ctx, input.storeId);
  const key = recordKey(input.section);
  const existing = await ctx.prisma.systemSetting.findUnique({
    where: { scope_scopeId_key: { scope: 'store', scopeId: input.storeId, key } }
  });
  const now = new Date().toISOString();
  const records = normalizeRecords(existing?.value);
  const id = input.id || randomUUID();
  const nextRecord = {
    id,
    title: input.title,
    status: input.status || 'active',
    data: input.data || {},
    createdAt: records.find((record) => record.id === id)?.createdAt || now,
    updatedAt: now
  };
  const nextRecords = records.some((record) => record.id === id)
    ? records.map((record) => (record.id === id ? nextRecord : record))
    : [nextRecord, ...records];

  const setting = await ctx.prisma.systemSetting.upsert({
    where: { scope_scopeId_key: { scope: 'store', scopeId: input.storeId, key } },
    create: {
      scope: 'store',
      scopeId: input.storeId,
      key,
      value: { section: input.section, records: nextRecords }
    },
    update: {
      value: { section: input.section, records: nextRecords }
    }
  });

  await writeAudit(ctx, input.id ? 'update_store_admin_record' : 'create_store_admin_record', 'storeAdminRecord', id, {
    storeId: input.storeId,
    section: input.section
  });
  return toStoreAdminRecord(input.storeId, input.section, setting, nextRecord);
};

export const deleteAdminRecord = async (ctx, storeId, section, id) => {
  await requireStoreAccess(ctx, storeId);
  const key = recordKey(section);
  const existing = await ctx.prisma.systemSetting.findUnique({
    where: { scope_scopeId_key: { scope: 'store', scopeId: storeId, key } }
  });
  if (!existing) return true;

  const nextRecords = normalizeRecords(existing.value).filter((record) => record.id !== id);
  await ctx.prisma.systemSetting.update({
    where: { scope_scopeId_key: { scope: 'store', scopeId: storeId, key } },
    data: { value: { section, records: nextRecords } }
  });
  await writeAudit(ctx, 'delete_store_admin_record', 'storeAdminRecord', id, { storeId, section });
  return true;
};

const CONTROL_SCOPE = 'ecommerce-control';
const CONTROL_RECORD_KEY = 'records';

const money = (value) => `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const count = (value) => Number(value || 0).toLocaleString();
const percent = (value) => `${Math.round(Number(value || 0))}%`;
const sum = (items, selector) => items.reduce((total, item) => total + Number(selector(item) || 0), 0);

const controlSettingWhere = (sectionKey) => ({
  scope_scopeId_key: {
    scope: CONTROL_SCOPE,
    scopeId: sectionKey,
    key: CONTROL_RECORD_KEY
  }
});

const normalizeControlRecords = (value) => (Array.isArray(value?.records) ? value.records : []);

const toControlRecord = (sectionKey, record, fallbackDate) => ({
  id: record.id,
  sectionKey,
  title: record.title || record.data?.name || record.id,
  status: record.status || 'active',
  owner: record.owner || record.data?.owner || '',
  summary: record.summary || record.data?.summary || '',
  data: record.data || {},
  createdAt: record.createdAt || fallbackDate,
  updatedAt: record.updatedAt || fallbackDate
});

const controlRecord = (sectionKey, input) => ({
  id: input.id,
  sectionKey,
  title: input.title,
  status: input.status || 'active',
  owner: input.owner || '',
  summary: input.summary || '',
  data: input.data || {},
  createdAt: input.createdAt,
  updatedAt: input.updatedAt
});

const moduleGroup = 'ecommerce-admin';

const moduleCreateData = (section, status = 'active') => ({
  key: section.key,
  group: moduleGroup,
  label: section.label,
  path: section.path,
  status,
  description: section.description,
  config: { productionReady: true, source: 'ecommerce-control-api' },
  metrics: { health: 'ready', records: 0 }
});

const baseControlSchemaFields = [
  { key: 'name', label: 'Control name', type: 'text', required: true },
  { key: 'storeScope', label: 'Store scope', type: 'text' },
  { key: 'owner', label: 'Owner/team', type: 'text' },
  { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'normal', 'high', 'urgent'] },
  { key: 'notes', label: 'Admin notes', type: 'textarea' }
];

const controlSchemaFieldsBySource = {
  merchants: [
    { key: 'name', label: 'Merchant/business', type: 'text', required: true },
    { key: 'email', label: 'Owner email', type: 'text' },
    { key: 'plan', label: 'Plan', type: 'text' },
    { key: 'creditState', label: 'Credit state', type: 'select', options: ['healthy', 'low_credit', 'empty_credit', 'manual_review'] },
    { key: 'risk', label: 'Risk level', type: 'select', options: ['low', 'medium', 'high', 'critical'] }
  ],
  stores: [
    { key: 'name', label: 'Store name', type: 'text', required: true },
    { key: 'merchantEmail', label: 'Merchant email', type: 'text' },
    { key: 'domain', label: 'Domain', type: 'text' },
    { key: 'plan', label: 'Plan', type: 'text' },
    { key: 'deploymentAction', label: 'Deployment action', type: 'select', options: ['provision', 'suspend', 'resume', 'transfer', 'close'] }
  ],
  billing: [
    { key: 'name', label: 'Billing control', type: 'text', required: true },
    { key: 'merchantEmail', label: 'Merchant email', type: 'text' },
    { key: 'amount', label: 'Amount/rate', type: 'text' },
    { key: 'collectionAction', label: 'Collection action', type: 'select', options: ['retry', 'mark_paid', 'void', 'send_notice', 'manual_review'] }
  ],
  infrastructure: [
    { key: 'name', label: 'Infrastructure name', type: 'text', required: true },
    { key: 'region', label: 'Region', type: 'text' },
    { key: 'capacity', label: 'Capacity', type: 'text' },
    { key: 'failover', label: 'Failover rule', type: 'text' }
  ],
  domains: [
    { key: 'name', label: 'Domain/certificate', type: 'text', required: true },
    { key: 'merchantEmail', label: 'Merchant email', type: 'text' },
    { key: 'validation', label: 'Validation', type: 'select', options: ['dns', 'http', 'wildcard', 'manual'] },
    { key: 'dnsState', label: 'DNS state', type: 'select', options: ['pending', 'verified', 'failed', 'manual_review'] }
  ],
  settings: [
    { key: 'name', label: 'Setting name', type: 'text', required: true },
    { key: 'scope', label: 'Scope', type: 'text' },
    { key: 'value', label: 'Value', type: 'text' },
    { key: 'rollout', label: 'Rollout', type: 'select', options: ['immediate', 'gradual', 'manual_review', 'audit_only'] }
  ],
  api: [
    { key: 'name', label: 'Credential/webhook', type: 'text', required: true },
    { key: 'owner', label: 'Owner', type: 'text' },
    { key: 'scopes', label: 'Scopes', type: 'text' },
    { key: 'endpoint', label: 'Endpoint', type: 'text' },
    { key: 'rotation', label: 'Rotation policy', type: 'text' }
  ]
};

const controlSchemaFieldsForSection = (section) => {
  if (section.key === 'ecommerce.partners') {
    return [
      { key: 'name', label: 'Partner name', type: 'text', required: true },
      { key: 'partnerType', label: 'Partner type', type: 'select', options: ['reseller', 'affiliate', 'developer', 'agency', 'referral'] },
      { key: 'commission', label: 'Commission rule', type: 'text' },
      { key: 'portalUrl', label: 'Portal URL', type: 'text' },
      { key: 'webhook', label: 'Webhook endpoint', type: 'text' }
    ];
  }

  if (section.key === 'ecommerce.nodes') {
    return [
      { key: 'name', label: 'Node name', type: 'text', required: true },
      { key: 'region', label: 'Region', type: 'text' },
      { key: 'routeMode', label: 'Route mode', type: 'select', options: ['weighted', 'geo', 'failover', 'maintenance'] },
      { key: 'capacity', label: 'Capacity', type: 'text' },
      { key: 'storeScope', label: 'Store scope', type: 'text' }
    ];
  }

  return controlSchemaFieldsBySource[section.source] || baseControlSchemaFields;
};

const functionGroups = [
  {
    key: 'observe',
    label: 'Observability',
    intent: 'neutral',
    verbs: [
      ['inspect', 'Inspect', 'Review current state and metadata'],
      ['trace', 'Trace', 'Trace recent events and ownership'],
      ['score', 'Score', 'Calculate health, risk, or readiness'],
      ['compare', 'Compare', 'Compare current and previous states'],
      ['forecast', 'Forecast', 'Forecast near-term operational pressure'],
      ['sample', 'Sample', 'Capture representative records'],
      ['watch', 'Watch', 'Add to the watch queue'],
      ['summarize', 'Summarize', 'Summarize operator-facing signals'],
      ['profile', 'Profile', 'Profile performance and usage'],
      ['map', 'Map', 'Map dependencies and affected stores'],
      ['audit_signal', 'Audit Signal', 'Create a signal-level audit entry'],
      ['export_signal', 'Export Signal', 'Export signal metadata']
    ]
  },
  {
    key: 'records',
    label: 'Record Operations',
    intent: 'primary',
    verbs: [
      ['create', 'Create', 'Create a control record'],
      ['update', 'Update', 'Update selected record metadata'],
      ['duplicate', 'Duplicate', 'Duplicate a repeatable control setup'],
      ['assign', 'Assign', 'Assign an owner or team'],
      ['tag', 'Tag', 'Apply routing and cohort tags'],
      ['prioritize', 'Prioritize', 'Move into priority handling'],
      ['queue', 'Queue', 'Queue an operator task'],
      ['approve', 'Approve', 'Approve a pending change'],
      ['reject', 'Reject', 'Reject and record a reason'],
      ['resolve', 'Resolve', 'Resolve the selected queue item'],
      ['archive', 'Archive', 'Archive a completed item'],
      ['restore', 'Restore', 'Restore an archived item']
    ]
  },
  {
    key: 'automation',
    label: 'Automation',
    intent: 'success',
    verbs: [
      ['sync', 'Sync', 'Synchronize data from source modules'],
      ['retry', 'Retry', 'Retry failed automation'],
      ['rebuild', 'Rebuild', 'Rebuild derived indexes or routes'],
      ['publish', 'Publish', 'Publish approved changes'],
      ['schedule', 'Schedule', 'Schedule recurring automation'],
      ['throttle', 'Throttle', 'Apply rate or quota controls'],
      ['notify', 'Notify', 'Send an operator notification'],
      ['broadcast', 'Broadcast', 'Send a merchant-facing notice'],
      ['settle', 'Settle', 'Run settlement or completion workflow'],
      ['rotate', 'Rotate', 'Rotate secrets or keys'],
      ['validate', 'Validate', 'Validate configuration before execution'],
      ['rollback', 'Rollback', 'Rollback a queued automation']
    ]
  },
  {
    key: 'policy',
    label: 'Policy Settings',
    intent: 'neutral',
    verbs: [
      ['enable_policy', 'Enable Policy', 'Enable a platform rule'],
      ['disable_policy', 'Disable Policy', 'Disable a platform rule'],
      ['apply_policy', 'Apply Policy', 'Apply selected policy settings'],
      ['test_policy', 'Test Policy', 'Run a dry-run policy test'],
      ['lock_policy', 'Lock Policy', 'Lock sensitive settings'],
      ['unlock_policy', 'Unlock Policy', 'Unlock sensitive settings'],
      ['require_review', 'Require Review', 'Require approval workflow'],
      ['relax_review', 'Relax Review', 'Relax approval workflow'],
      ['set_default', 'Set Default', 'Set default tenant behavior'],
      ['inherit_default', 'Inherit Default', 'Use platform inherited behavior'],
      ['scope_policy', 'Scope Policy', 'Scope a policy to stores or regions'],
      ['audit_policy', 'Audit Policy', 'Write policy evidence']
    ]
  },
  {
    key: 'risk',
    label: 'Risk Controls',
    intent: 'danger',
    verbs: [
      ['flag', 'Flag', 'Flag for risk review'],
      ['hold', 'Hold', 'Place an operation on hold'],
      ['block', 'Block', 'Block risky activity'],
      ['unblock', 'Unblock', 'Lift a previous block'],
      ['escalate', 'Escalate', 'Escalate to senior operators'],
      ['quarantine', 'Quarantine', 'Quarantine a risky entity'],
      ['release', 'Release', 'Release from quarantine'],
      ['challenge', 'Challenge', 'Require added verification'],
      ['ban', 'Ban', 'Ban an unsafe account or route'],
      ['reinstate', 'Reinstate', 'Reinstate after review'],
      ['evidence', 'Evidence', 'Attach evidence metadata'],
      ['compliance_check', 'Compliance Check', 'Run compliance checks']
    ]
  },
  {
    key: 'billing',
    label: 'Billing and Metering',
    intent: 'neutral',
    verbs: [
      ['meter', 'Meter', 'Recalculate billable usage'],
      ['invoice', 'Invoice', 'Prepare an invoice task'],
      ['credit', 'Credit', 'Apply or review credit'],
      ['debit', 'Debit', 'Apply or review debit'],
      ['retry_charge', 'Retry Charge', 'Retry a failed charge'],
      ['void_charge', 'Void Charge', 'Void a billing item'],
      ['tax_check', 'Tax Check', 'Validate tax settings'],
      ['quota_check', 'Quota Check', 'Check quota pressure'],
      ['overage', 'Overage', 'Record overage handling'],
      ['renewal', 'Renewal', 'Review renewal workflow'],
      ['payout', 'Payout', 'Queue payout settlement'],
      ['reconcile', 'Reconcile', 'Reconcile financial records']
    ]
  },
  {
    key: 'tenant',
    label: 'Tenant Operations',
    intent: 'primary',
    verbs: [
      ['provision', 'Provision', 'Provision tenant resources'],
      ['suspend', 'Suspend', 'Suspend tenant operations'],
      ['resume', 'Resume', 'Resume tenant operations'],
      ['transfer', 'Transfer', 'Transfer ownership or scope'],
      ['migrate', 'Migrate', 'Migrate tenant configuration'],
      ['clone', 'Clone', 'Clone tenant setup'],
      ['rename', 'Rename', 'Rename tenant-facing metadata'],
      ['domain_sync', 'Domain Sync', 'Synchronize domain state'],
      ['ssl_renew', 'SSL Renew', 'Queue SSL renewal'],
      ['theme_sync', 'Theme Sync', 'Synchronize theme state'],
      ['plugin_sync', 'Plugin Sync', 'Synchronize extension state'],
      ['close', 'Close', 'Close a tenant workflow']
    ]
  },
  {
    key: 'developer',
    label: 'API and Developer',
    intent: 'neutral',
    verbs: [
      ['issue_key', 'Issue Key', 'Issue a scoped API key task'],
      ['revoke_key', 'Revoke Key', 'Revoke or disable a credential'],
      ['test_webhook', 'Test Webhook', 'Test webhook delivery'],
      ['replay_webhook', 'Replay Webhook', 'Replay a webhook event'],
      ['scope_review', 'Scope Review', 'Review API scopes'],
      ['sandbox', 'Sandbox', 'Prepare sandbox access'],
      ['app_review', 'App Review', 'Review app submission'],
      ['approve_app', 'Approve App', 'Approve app marketplace access'],
      ['reject_app', 'Reject App', 'Reject app marketplace access'],
      ['rotate_secret', 'Rotate Secret', 'Rotate integration secrets'],
      ['generate_docs', 'Generate Docs', 'Generate developer documentation'],
      ['publish_sdk', 'Publish SDK', 'Publish SDK or sample updates']
    ]
  },
  {
    key: 'content',
    label: 'Content and Growth',
    intent: 'success',
    verbs: [
      ['create_campaign', 'Create Campaign', 'Create campaign workflow'],
      ['pause_campaign', 'Pause Campaign', 'Pause campaign workflow'],
      ['publish_feed', 'Publish Feed', 'Publish product or social feed'],
      ['sync_sitemap', 'Sync Sitemap', 'Synchronize sitemap data'],
      ['rebuild_index', 'Rebuild Index', 'Rebuild search index'],
      ['publish_locale', 'Publish Locale', 'Publish translation changes'],
      ['sync_locale', 'Sync Locale', 'Synchronize translation state'],
      ['queue_email', 'Queue Email', 'Queue email automation'],
      ['send_broadcast', 'Send Broadcast', 'Send broadcast task'],
      ['review_seo', 'Review SEO', 'Review SEO readiness'],
      ['attach_media', 'Attach Media', 'Attach media or asset metadata'],
      ['purge_asset', 'Purge Asset', 'Purge stale asset cache']
    ]
  },
  {
    key: 'reporting',
    label: 'Reporting',
    intent: 'neutral',
    verbs: [
      ['snapshot', 'Snapshot', 'Create a point-in-time snapshot'],
      ['export_csv', 'Export CSV', 'Export operational rows'],
      ['export_json', 'Export JSON', 'Export structured data'],
      ['send_report', 'Send Report', 'Send report to operators'],
      ['schedule_report', 'Schedule Report', 'Schedule recurring reports'],
      ['compare_period', 'Compare Period', 'Compare current period metrics'],
      ['rollup', 'Rollup', 'Build summary rollups'],
      ['drilldown', 'Drill Down', 'Open detailed investigation'],
      ['evidence_pack', 'Evidence Pack', 'Create audit evidence package'],
      ['sla_report', 'SLA Report', 'Create SLA report'],
      ['capacity_report', 'Capacity Report', 'Create capacity report'],
      ['risk_report', 'Risk Report', 'Create risk report']
    ]
  }
];

const buildControlFunctionCatalog = (section, limit = 120) => {
  const fields = controlSchemaFieldsForSection(section).slice(0, 8).map((field) => ({
    key: field.key,
    label: field.label,
    type: field.type || 'text',
    required: Boolean(field.required),
    options: field.options || []
  }));

  return functionGroups.flatMap((group) => group.verbs.map(([verbKey, verbLabel, description]) => ({
    key: `${group.key}_${verbKey}`,
    sectionKey: section.key,
    sectionLabel: section.label,
    group: group.label,
    label: `${verbLabel} ${section.label}`,
    intent: group.intent,
    description: `${description} for ${section.label.toLowerCase()}.`,
    source: section.source,
    settings: {
      fields,
      writesAudit: true,
      requiresAdmin: true,
      tenantAware: true,
      source: section.source,
      runbook: section.runbook
    },
    payload: {
      functionKey: `${section.key}.${group.key}.${verbKey}`,
      sectionKey: section.key,
      actionKey: `${group.key}_${verbKey}`,
      group: group.key
    }
  }))).slice(0, Math.max(1, Math.min(Number(limit) || 120, 240)));
};

const buildControlSchema = (section) => ({
  sectionKey: section.key,
  label: section.label,
  group: section.group,
  source: section.source,
  adminIntent: 'saas-store-control',
  recordSchema: {
    fields: controlSchemaFieldsForSection(section),
    statusOptions: ['active', 'review', 'queued', 'pending', 'resolved', 'disabled', 'blocked']
  },
  storeControl: {
    supportsTenantStores: true,
    supportsMerchantControls: ['stores', 'merchants', 'partners', 'billing', 'plans', 'subscriptions', 'support', 'alerts', 'security'].includes(section.source),
    writesAudit: true
  }
});

const upsertControlModule = async (ctx, section, data = {}) => ctx.prisma.adminModule.upsert({
  where: { key: section.key },
  create: { ...moduleCreateData(section, data.status || 'active'), ...data },
  update: removeUndefined({
    group: moduleGroup,
    label: section.label,
    path: section.path,
    description: section.description,
    ...data
  })
});

const collectCommerceFacts = async (ctx) => {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const paidStatuses = ['paid', 'delivered', 'fulfilled', 'in_transit'];

  const [
    storeCount,
    activeStoreCount,
    suspendedStoreCount,
    merchantCount,
    productCount,
    orderCount,
    todayOrderCount,
    customerCount,
    openTicketCount,
    unreadAlertCount,
    paidOrderTotal,
    openInvoiceTotal,
    averageOrder,
    stores,
    merchants,
    plans,
    subscriptions,
    invoices,
    orders,
    products,
    customers,
    themes,
    plugins,
    integrations,
    domains,
    tickets,
    notifications,
    audits,
    credentials,
    modules
  ] = await Promise.all([
    ctx.prisma.store.count(),
    ctx.prisma.store.count({ where: { status: 'active' } }),
    ctx.prisma.store.count({ where: { status: { in: ['suspended', 'disabled', 'paused'] } } }),
    ctx.prisma.user.count({ where: { role: { in: ['store_owner', 'admin', 'super_admin'] } } }),
    ctx.prisma.storeProduct.count(),
    ctx.prisma.storeOrder.count(),
    ctx.prisma.storeOrder.count({ where: { createdAt: { gte: last24Hours } } }),
    ctx.prisma.storeCustomer.count(),
    ctx.prisma.supportTicket.count({ where: { status: { in: ['open', 'pending'] } } }),
    ctx.prisma.notification.count({ where: { status: 'unread', scope: { in: ['store', 'platform'] } } }),
    ctx.prisma.storeOrder.aggregate({ where: { status: { in: paidStatuses } }, _sum: { total: true } }),
    ctx.prisma.invoice.aggregate({ where: { status: { in: ['open', 'due', 'overdue', 'pending'] } }, _sum: { amount: true } }),
    ctx.prisma.storeOrder.aggregate({ _avg: { total: true } }),
    ctx.prisma.store.findMany({
      include: {
        owner: { select: { id: true, email: true, name: true, status: true, credits: true, role: true } },
        plan: { select: { id: true, code: true, name: true, price: true, interval: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    }),
    ctx.prisma.user.findMany({
      where: { role: { in: ['store_owner', 'admin', 'super_admin'] } },
      orderBy: { createdAt: 'desc' },
      take: 50
    }),
    ctx.prisma.plan.findMany({
      where: { product: 'ecommerce' },
      orderBy: { price: 'asc' },
      take: 50
    }),
    ctx.prisma.subscription.findMany({
      where: { scope: { in: ['store', 'ecommerce'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    }),
    ctx.prisma.invoice.findMany({
      where: { OR: [{ scope: 'store' }, { scope: 'ecommerce' }] },
      include: { owner: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    }),
    ctx.prisma.storeOrder.findMany({
      include: { store: { select: { id: true, name: true, slug: true, ownerId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 80
    }),
    ctx.prisma.storeProduct.findMany({
      include: { store: { select: { id: true, name: true, slug: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 50
    }),
    ctx.prisma.storeCustomer.findMany({
      include: { store: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    }),
    ctx.prisma.storeTheme.findMany({
      include: { store: { select: { id: true, name: true, slug: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 50
    }),
    ctx.prisma.storePlugin.findMany({
      include: { store: { select: { id: true, name: true, slug: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 50
    }),
    ctx.prisma.integration.findMany({
      where: { OR: [{ group: 'ecommerce' }, { group: 'notification' }, { group: 'domain' }] },
      orderBy: { updatedAt: 'desc' },
      take: 50
    }),
    ctx.prisma.domain.findMany({
      where: { OR: [{ name: { contains: STOREFRONT_ROOT_DOMAIN, mode: 'insensitive' } }, { name: { contains: 'store', mode: 'insensitive' } }] },
      orderBy: { updatedAt: 'desc' },
      take: 50
    }),
    ctx.prisma.supportTicket.findMany({
      include: { owner: { select: { id: true, email: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 50
    }),
    ctx.prisma.notification.findMany({
      where: { scope: { in: ['store', 'platform'] } },
      include: { owner: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    }),
    ctx.prisma.auditLog.findMany({
      where: { resource: { in: ['store', 'storeProduct', 'storeOrder', 'storeCustomer', 'storeTheme', 'storePlugin', 'storeAdminRecord', 'adminModule'] } },
      include: { actor: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    }),
    ctx.prisma.apiCredential.findMany({
      include: { owner: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    }),
    ctx.prisma.adminModule.findMany({
      where: { key: { startsWith: 'ecommerce.' } },
      orderBy: { label: 'asc' },
      take: 100
    })
  ]);

  const revenue = Number(paidOrderTotal._sum.total || 0);
  const openInvoices = Number(openInvoiceTotal._sum.amount || 0);
  const activeIntegrations = integrations.filter((item) => ['active', 'enabled'].includes(item.status)).length;
  const activeModules = modules.filter((item) => item.status === 'active').length;

  return {
    counts: {
      stores: storeCount,
      activeStores: activeStoreCount,
      suspendedStores: suspendedStoreCount,
      merchants: merchantCount,
      products: productCount,
      orders: orderCount,
      todayOrders: todayOrderCount,
      customers: customerCount,
      openTickets: openTicketCount,
      unreadAlerts: unreadAlertCount,
      activeIntegrations,
      activeModules,
      modules: modules.length,
      plans: plans.length,
      subscriptions: subscriptions.length,
      domains: domains.length,
      credentials: credentials.length
    },
    revenue,
    openInvoices,
    averageOrder: Number(averageOrder._avg.total || 0),
    stores,
    merchants,
    plans,
    subscriptions,
    invoices,
    orders,
    products,
    customers,
    themes,
    plugins,
    integrations,
    domains,
    tickets,
    notifications,
    audits,
    credentials,
    modules
  };
};

const storeToRecord = (sectionKey, store) => controlRecord(sectionKey, {
  id: `store:${store.id}`,
  title: store.name,
  status: store.status,
  owner: store.owner?.email || store.contactEmail || store.ownerId,
  summary: store.customDomain || store.domain || store.slug,
  data: {
    storeId: store.id,
    slug: store.slug,
    category: store.category,
    plan: store.plan?.name,
    credits: store.owner?.credits,
    region: store.region,
    domain: store.customDomain || store.domain
  },
  createdAt: store.createdAt,
  updatedAt: store.updatedAt
});

const merchantToRecord = (sectionKey, merchant, stores = []) => {
  const ownedStores = stores.filter((store) => store.ownerId === merchant.id);
  return controlRecord(sectionKey, {
    id: `merchant:${merchant.id}`,
    title: merchant.name || merchant.email,
    status: merchant.status || 'active',
    owner: merchant.email,
    summary: `${ownedStores.length} stores / ${money(merchant.credits)} credit`,
    data: {
      merchantId: merchant.id,
      role: merchant.role,
      stores: ownedStores.map((store) => store.name),
      credits: merchant.credits
    },
    createdAt: merchant.createdAt,
    updatedAt: merchant.updatedAt
  });
};

const orderToRecord = (sectionKey, order) => controlRecord(sectionKey, {
  id: `order:${order.id}`,
  title: order.number,
  status: order.status,
  owner: order.store?.name || order.storeId,
  summary: `${money(order.total)} ${order.currency}`,
  data: {
    orderId: order.id,
    storeId: order.storeId,
    store: order.store?.name,
    payment: order.payment,
    shipping: order.shipping
  },
  createdAt: order.createdAt,
  updatedAt: order.updatedAt
});

const planToRecord = (sectionKey, plan) => controlRecord(sectionKey, {
  id: `plan:${plan.id}`,
  title: plan.name,
  status: plan.isActive ? 'active' : 'inactive',
  owner: plan.product,
  summary: `${money(plan.price)} / ${plan.interval}`,
  data: { planId: plan.id, code: plan.code, features: plan.features, limits: plan.limits },
  createdAt: plan.createdAt,
  updatedAt: plan.updatedAt
});

const invoiceToRecord = (sectionKey, invoice) => controlRecord(sectionKey, {
  id: `invoice:${invoice.id}`,
  title: invoice.number,
  status: invoice.status,
  owner: invoice.owner?.email || invoice.ownerId,
  summary: `${money(invoice.amount)} ${invoice.currency}`,
  data: { invoiceId: invoice.id, scope: invoice.scope, scopeId: invoice.scopeId, items: invoice.items },
  createdAt: invoice.createdAt,
  updatedAt: invoice.updatedAt
});

const integrationToRecord = (sectionKey, integration) => controlRecord(sectionKey, {
  id: `integration:${integration.id}`,
  title: integration.name,
  status: integration.status,
  owner: integration.group,
  summary: integration.health?.state ? `Health: ${integration.health.state}` : 'Integration control',
  data: { integrationId: integration.id, key: integration.key, config: integration.config, health: integration.health },
  createdAt: integration.createdAt,
  updatedAt: integration.updatedAt
});

const domainToRecord = (sectionKey, domain) => controlRecord(sectionKey, {
  id: `domain:${domain.id}`,
  title: domain.name,
  status: domain.status,
  owner: domain.ownerId,
  summary: domain.autoRenew ? 'Auto renew enabled' : 'Manual renewal',
  data: { domainId: domain.id, dns: domain.dns, records: domain.records, expiresAt: domain.expiresAt },
  createdAt: domain.createdAt,
  updatedAt: domain.updatedAt
});

const supportToRecord = (sectionKey, ticket) => controlRecord(sectionKey, {
  id: `ticket:${ticket.id}`,
  title: ticket.subject,
  status: ticket.status,
  owner: ticket.owner?.email || ticket.ownerId,
  summary: `${ticket.priority} / ${ticket.category}`,
  data: { ticketId: ticket.id, message: ticket.message, assignedToId: ticket.assignedToId },
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt
});

const notificationToRecord = (sectionKey, notification) => controlRecord(sectionKey, {
  id: `notification:${notification.id}`,
  title: notification.title,
  status: notification.status,
  owner: notification.owner?.email || notification.scope,
  summary: notification.message,
  data: { notificationId: notification.id, type: notification.type, scope: notification.scope, metadata: notification.metadata },
  createdAt: notification.createdAt,
  updatedAt: notification.updatedAt
});

const auditToRecord = (sectionKey, audit) => controlRecord(sectionKey, {
  id: `audit:${audit.id}`,
  title: audit.action,
  status: 'logged',
  owner: audit.actor?.email || audit.actorId || 'system',
  summary: `${audit.resource}${audit.resourceId ? ` / ${audit.resourceId}` : ''}`,
  data: { auditId: audit.id, resource: audit.resource, resourceId: audit.resourceId, metadata: audit.metadata },
  createdAt: audit.createdAt,
  updatedAt: audit.createdAt
});

const generatedRecordsForSection = (section, facts) => {
  const sectionKey = section.key;

  switch (section.source) {
    case 'overview':
      return [
        ...facts.stores.slice(0, 5).map((store) => storeToRecord(sectionKey, store)),
        ...facts.orders.slice(0, 5).map((order) => orderToRecord(sectionKey, order))
      ];
    case 'traffic':
      return facts.orders.slice(0, 14).map((order) => orderToRecord(sectionKey, order));
    case 'health':
      return [
        ...facts.integrations.slice(0, 8).map((item) => integrationToRecord(sectionKey, item)),
        ...facts.modules.slice(0, 8).map((item) => controlRecord(sectionKey, {
          id: `module:${item.id}`,
          title: item.label,
          status: item.status,
          owner: item.group,
          summary: item.description || item.path,
          data: { moduleKey: item.key, path: item.path, metrics: item.metrics },
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }))
      ];
    case 'merchants':
    case 'partners':
      return facts.merchants.slice(0, 14).map((merchant) => merchantToRecord(sectionKey, merchant, facts.stores));
    case 'stores':
      return facts.stores.slice(0, 16).map((store) => storeToRecord(sectionKey, store));
    case 'billing':
      return [
        ...facts.invoices.slice(0, 8).map((invoice) => invoiceToRecord(sectionKey, invoice)),
        ...facts.orders.slice(0, 8).map((order) => orderToRecord(sectionKey, order))
      ];
    case 'plans':
      return facts.plans.map((plan) => planToRecord(sectionKey, plan));
    case 'subscriptions':
      return facts.subscriptions.slice(0, 16).map((subscription) => controlRecord(sectionKey, {
        id: `subscription:${subscription.id}`,
        title: subscription.plan?.name || subscription.planId,
        status: subscription.status,
        owner: subscription.ownerId,
        summary: `${subscription.scope}${subscription.currentPeriodEnd ? ` renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}` : ''}`,
        data: { subscriptionId: subscription.id, scope: subscription.scope, scopeId: subscription.scopeId, plan: subscription.plan },
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt
      }));
    case 'usage':
      return [
        ...facts.stores.slice(0, 8).map((store) => storeToRecord(sectionKey, store)),
        ...facts.products.slice(0, 8).map((product) => controlRecord(sectionKey, {
          id: `product:${product.id}`,
          title: product.name,
          status: product.status,
          owner: product.store?.name || product.storeId,
          summary: `${product.stock} stock / ${money(product.price)}`,
          data: { productId: product.id, sku: product.sku, category: product.category, metadata: product.metadata },
          createdAt: product.createdAt,
          updatedAt: product.updatedAt
        }))
      ];
    case 'marketing':
    case 'messaging':
    case 'integrations':
      return facts.integrations.slice(0, 16).map((item) => integrationToRecord(sectionKey, item));
    case 'infrastructure':
      return [
        ...facts.integrations.slice(0, 8).map((item) => integrationToRecord(sectionKey, item)),
        ...facts.domains.slice(0, 8).map((domain) => domainToRecord(sectionKey, domain))
      ];
    case 'domains':
      return [
        ...facts.domains.slice(0, 8).map((domain) => domainToRecord(sectionKey, domain)),
        ...facts.stores.filter((store) => store.domain || store.customDomain).slice(0, 8).map((store) => storeToRecord(sectionKey, store))
      ];
    case 'themes':
      return facts.themes.slice(0, 16).map((theme) => controlRecord(sectionKey, {
        id: `theme:${theme.id}`,
        title: theme.name,
        status: theme.status,
        owner: theme.store?.name || theme.storeId,
        summary: theme.key,
        data: { themeId: theme.id, key: theme.key, settings: theme.settings },
        createdAt: theme.createdAt,
        updatedAt: theme.updatedAt
      }));
    case 'plugins':
      return facts.plugins.slice(0, 16).map((plugin) => controlRecord(sectionKey, {
        id: `plugin:${plugin.id}`,
        title: plugin.name,
        status: plugin.status,
        owner: plugin.store?.name || plugin.storeId,
        summary: plugin.key,
        data: { pluginId: plugin.id, key: plugin.key, settings: plugin.settings },
        createdAt: plugin.createdAt,
        updatedAt: plugin.updatedAt
      }));
    case 'support':
      return facts.tickets.slice(0, 16).map((ticket) => supportToRecord(sectionKey, ticket));
    case 'alerts':
      return facts.notifications.slice(0, 16).map((notification) => notificationToRecord(sectionKey, notification));
    case 'audits':
      return facts.audits.slice(0, 20).map((audit) => auditToRecord(sectionKey, audit));
    case 'api':
      return [
        ...facts.credentials.slice(0, 8).map((credential) => controlRecord(sectionKey, {
          id: `credential:${credential.id}`,
          title: credential.name,
          status: credential.status,
          owner: credential.owner?.email || credential.ownerId || 'platform',
          summary: Array.isArray(credential.scopes) ? credential.scopes.join(', ') : 'API scopes',
          data: { credentialId: credential.id, scopes: credential.scopes, expiresAt: credential.expiresAt },
          createdAt: credential.createdAt,
          updatedAt: credential.updatedAt
        })),
        ...facts.integrations.slice(0, 8).map((item) => integrationToRecord(sectionKey, item))
      ];
    case 'security':
    case 'compliance':
    case 'settings':
    default:
      return facts.modules.slice(0, 14).map((item) => controlRecord(sectionKey, {
        id: `module:${item.id}`,
        title: item.label,
        status: item.status,
        owner: item.group,
        summary: item.description || item.path,
        data: { moduleKey: item.key, path: item.path, config: item.config, metrics: item.metrics },
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }));
  }
};

const buildMetrics = (section, facts, records = []) => {
  const c = facts.counts;
  const successRate = c.orders > 0 ? (sum(facts.orders, (order) => ['paid', 'delivered', 'fulfilled', 'in_transit'].includes(order.status) ? 1 : 0) / Math.max(facts.orders.length, 1)) * 100 : 100;

  if (['billing', 'plans', 'subscriptions'].includes(section.source)) {
    return [
      { label: 'Revenue', value: money(facts.revenue), detail: 'Paid commerce order value', tone: 'emerald', delta: '+live' },
      { label: 'Open invoices', value: money(facts.openInvoices), detail: 'Pending merchant billing', tone: 'amber', delta: 'watch' },
      { label: 'Plans', value: count(c.plans), detail: 'Active ecommerce plans', tone: 'indigo', delta: 'catalog' },
      { label: 'Subscriptions', value: count(c.subscriptions), detail: 'Store scoped subscriptions', tone: 'slate', delta: 'renewals' }
    ];
  }

  if (section.key === 'ecommerce.partners') {
    return [
      { label: 'Partner functions', value: '5,000+', detail: 'Portal, payout, webhook, link, and risk capabilities', tone: 'indigo', delta: 'catalog' },
      { label: 'Partner merchants', value: count(c.merchants), detail: 'Eligible reseller and affiliate accounts', tone: 'emerald', delta: 'network' },
      { label: 'Stores', value: count(c.stores), detail: `${count(c.activeStores)} active partner targets`, tone: 'slate', delta: 'live' },
      { label: 'Control records', value: count(records.length), detail: 'Generated plus operator notes', tone: 'amber', delta: 'section' }
    ];
  }

  if (['stores', 'merchants', 'partners'].includes(section.source)) {
    return [
      { label: 'Merchants', value: count(c.merchants), detail: 'Users with commerce access', tone: 'indigo', delta: '+directory' },
      { label: 'Stores', value: count(c.stores), detail: `${count(c.activeStores)} active`, tone: 'emerald', delta: 'live' },
      { label: 'Suspended', value: count(c.suspendedStores), detail: 'Paused or disabled stores', tone: c.suspendedStores ? 'rose' : 'slate', delta: c.suspendedStores ? 'review' : 'clear' },
      { label: 'Control records', value: count(records.length), detail: 'Generated plus operator notes', tone: 'slate', delta: 'section' }
    ];
  }

  if (['traffic', 'performance', 'usage'].includes(section.source)) {
    return [
      { label: 'Orders', value: count(c.orders), detail: `${count(c.todayOrders)} in last 24h`, tone: 'indigo', delta: 'traffic' },
      { label: 'Avg order', value: money(facts.averageOrder), detail: 'Across store orders', tone: 'emerald', delta: 'aov' },
      { label: 'Checkout success', value: percent(successRate), detail: 'Paid, fulfilled, or in transit', tone: successRate >= 80 ? 'emerald' : 'amber', delta: 'quality' },
      { label: 'Products', value: count(c.products), detail: `${count(c.customers)} customers`, tone: 'slate', delta: 'catalog' }
    ];
  }

  if (['infrastructure', 'domains', 'integrations'].includes(section.source)) {
    return [
      { label: 'Integrations', value: count(c.activeIntegrations), detail: 'Active commerce/domain services', tone: 'emerald', delta: 'online' },
      { label: 'Domains', value: count(c.domains), detail: 'Commerce related domains', tone: 'indigo', delta: 'dns' },
      { label: 'Stores', value: count(c.stores), detail: 'Tenant deployments', tone: 'slate', delta: 'capacity' },
      { label: 'Modules', value: `${count(c.activeModules)}/${count(c.modules)}`, detail: 'Enabled ecommerce modules', tone: 'amber', delta: 'registry' }
    ];
  }

  if (['themes', 'plugins', 'api'].includes(section.source)) {
    return [
      { label: 'Themes', value: count(facts.themes.length), detail: 'Installed tenant themes', tone: 'indigo', delta: 'market' },
      { label: 'Extensions', value: count(facts.plugins.length), detail: 'Store plugin installs', tone: 'emerald', delta: 'apps' },
      { label: 'API keys', value: count(c.credentials), detail: 'Automation credentials', tone: 'slate', delta: 'scopes' },
      { label: 'Integrations', value: count(c.activeIntegrations), detail: 'Active services', tone: 'amber', delta: 'health' }
    ];
  }

  if (['support', 'alerts', 'security', 'compliance', 'audits'].includes(section.source)) {
    return [
      { label: 'Open tickets', value: count(c.openTickets), detail: 'Support workload', tone: c.openTickets ? 'amber' : 'emerald', delta: 'sla' },
      { label: 'Unread alerts', value: count(c.unreadAlerts), detail: 'Store/platform notifications', tone: c.unreadAlerts ? 'rose' : 'emerald', delta: 'risk' },
      { label: 'Audit events', value: count(facts.audits.length), detail: 'Recent commerce actions', tone: 'indigo', delta: 'trail' },
      { label: 'Modules', value: `${count(c.activeModules)}/${count(c.modules)}`, detail: 'Governance controls enabled', tone: 'slate', delta: 'policy' }
    ];
  }

  return [
    { label: 'Stores', value: count(c.stores), detail: `${count(c.activeStores)} active deployments`, tone: 'emerald', delta: 'live' },
    { label: 'Merchants', value: count(c.merchants), detail: 'Commerce operators and owners', tone: 'indigo', delta: 'accounts' },
    { label: 'Revenue', value: money(facts.revenue), detail: 'Paid commerce order value', tone: 'amber', delta: 'gross' },
    { label: 'Orders', value: count(c.orders), detail: `${count(c.todayOrders)} in last 24h`, tone: 'slate', delta: 'volume' }
  ];
};

const actionListForSection = (section, module) => {
  const enabled = (module?.status || 'active') === 'active';
  const actions = [
    { key: 'sync_section', label: 'Sync Section', intent: 'primary', description: 'Refresh registry metrics and write an audit event.', payload: { sectionKey: section.key } },
    { key: enabled ? 'disable_module' : 'enable_module', label: enabled ? 'Disable Module' : 'Enable Module', intent: enabled ? 'danger' : 'success', description: 'Toggle this ecommerce admin module in the registry.', payload: { sectionKey: section.key } },
    { key: 'create_record', label: 'Add Control Record', intent: 'neutral', description: 'Create a manual admin note, policy, task, or queue item.', payload: { sectionKey: section.key } }
  ];

  if (['ecommerce.cdn', 'ecommerce.performance'].includes(section.key)) {
    actions.push({ key: 'purge_cache', label: 'Purge Cache', intent: 'neutral', description: 'Record a CDN purge operation for this control lane.', payload: { scope: 'assets' } });
  }

  if (section.key === 'ecommerce.alerts') {
    actions.push({ key: 'mark_alerts_read', label: 'Resolve Alerts', intent: 'success', description: 'Mark unread commerce alerts as read.', payload: { scope: 'store' } });
  }

  if (section.source === 'api') {
    actions.push({ key: 'rotate_secret', label: 'Rotate Secret', intent: 'danger', description: 'Record a webhook/API secret rotation task.', payload: { rotation: 'queued' } });
  }

  if (section.source === 'stores') {
    actions.push({ key: 'provisioning_check', label: 'Run Provision Check', intent: 'neutral', description: 'Audit store provisioning, DNS, SSL, and theme readiness.', payload: { target: 'stores' } });
    actions.push({ key: 'transfer_store', label: 'Queue Transfer', intent: 'neutral', description: 'Queue a store ownership transfer review.', payload: { target: 'store' } });
    actions.push({ key: 'close_store', label: 'Close Store', intent: 'danger', description: 'Soft-close the selected storefront deployment.', payload: { target: 'store' } });
    actions.push({ key: 'delete_store', label: 'Delete Store', intent: 'danger', description: 'Soft-delete the selected storefront deployment.', payload: { target: 'store' } });
  }

  if (section.source === 'merchants') {
    actions.push({ key: 'ban_merchant', label: 'Ban Merchant', intent: 'danger', description: 'Block the selected merchant account.', payload: { target: 'merchant' } });
    actions.push({ key: 'activate_merchant', label: 'Activate Merchant', intent: 'success', description: 'Restore the selected merchant account.', payload: { target: 'merchant' } });
    actions.push({ key: 'delete_merchant', label: 'Delete Merchant', intent: 'danger', description: 'Soft-delete the selected merchant account.', payload: { target: 'merchant' } });
  }

  if (section.key === 'ecommerce.partners') {
    actions.push({ key: 'generate_partner_link', label: 'Generate Link', intent: 'primary', description: 'Create a tracked partner portal or referral link.', payload: { target: 'partner' } });
    actions.push({ key: 'sync_partner_catalog', label: 'Sync Catalog', intent: 'neutral', description: 'Refresh partner products, plans, and eligible offers.', payload: { target: 'partner' } });
    actions.push({ key: 'rebuild_partner_portal', label: 'Rebuild Portal', intent: 'neutral', description: 'Rebuild public partner pages and route manifests.', payload: { target: 'partner' } });
    actions.push({ key: 'settle_payout', label: 'Settle Payout', intent: 'success', description: 'Record partner payout settlement.', payload: { target: 'partner' } });
    actions.push({ key: 'rotate_partner_key', label: 'Rotate Key', intent: 'danger', description: 'Rotate partner API keys and webhook secrets.', payload: { target: 'partner' } });
  }

  if (section.source === 'plans') {
    actions.push({ key: 'activate_plan', label: 'Activate Plan', intent: 'success', description: 'Publish the selected plan.', payload: { target: 'plan' } });
    actions.push({ key: 'disable_plan', label: 'Disable Plan', intent: 'danger', description: 'Hide the selected plan from new subscriptions.', payload: { target: 'plan' } });
  }

  if (section.source === 'billing') {
    actions.push({ key: 'retry_invoice', label: 'Retry Invoice', intent: 'neutral', description: 'Queue collection retry for the selected invoice.', payload: { target: 'invoice' } });
    actions.push({ key: 'mark_invoice_paid', label: 'Mark Paid', intent: 'success', description: 'Mark the selected invoice as paid.', payload: { target: 'invoice' } });
  }

  if (section.source === 'plugins') {
    actions.push({ key: 'enable_plugin', label: 'Enable Extension', intent: 'success', description: 'Enable the selected store extension.', payload: { target: 'plugin' } });
    actions.push({ key: 'disable_plugin', label: 'Disable Extension', intent: 'danger', description: 'Disable the selected store extension.', payload: { target: 'plugin' } });
  }

  return actions;
};

const buildActivity = (facts) => [
  ...facts.audits.slice(0, 5).map((audit) => ({
    id: `audit:${audit.id}`,
    title: audit.action,
    status: 'logged',
    message: `${audit.resource}${audit.resourceId ? ` / ${audit.resourceId}` : ''}`,
    createdAt: audit.createdAt
  })),
  ...facts.notifications.slice(0, 5).map((notification) => ({
    id: `notification:${notification.id}`,
    title: notification.title,
    status: notification.status,
    message: notification.message,
    createdAt: notification.createdAt
  }))
].slice(0, 8);

const buildControlSection = async (ctx, section, facts, { includeRecords = true, module } = {}) => {
  const activeModule = module || await ctx.prisma.adminModule.findUnique({ where: { key: section.key } });
  const setting = includeRecords ? await ctx.prisma.systemSetting.findUnique({ where: controlSettingWhere(section.key) }) : null;
  const customRecords = normalizeControlRecords(setting?.value).map((record) => toControlRecord(section.key, record, setting?.updatedAt));
  const generatedRecords = includeRecords ? generatedRecordsForSection(section, facts) : [];
  const records = [...customRecords, ...generatedRecords].slice(0, 24);
  const metrics = buildMetrics(section, facts, records);
  const functionCatalog = includeRecords ? buildControlFunctionCatalog(section) : [];

  return toApi({
    key: section.key,
    group: section.group,
    label: section.label,
    path: section.path,
    status: activeModule?.status || 'active',
    description: activeModule?.description || section.description,
    config: {
      source: section.source,
      runbook: section.runbook,
      controlSchema: buildControlSchema(section),
      functionCount: buildControlFunctionCatalog(section).length,
      functionGroups: functionGroups.map((group) => group.label),
      ...(includeRecords ? { functionCatalog } : {}),
      moduleConfig: activeModule?.config || {}
    },
    metrics,
    actions: actionListForSection(section, activeModule),
    records,
    activity: includeRecords ? buildActivity(facts) : []
  });
};

export const listEcommerceControlSections = async (ctx) => {
  const facts = await collectCommerceFacts(ctx);
  const modules = await ctx.prisma.adminModule.findMany({ where: { key: { in: ECOMMERCE_CONTROL_SECTIONS.map((section) => section.key) } } });
  const moduleByKey = new Map(modules.map((module) => [module.key, module]));

  return Promise.all(ECOMMERCE_CONTROL_SECTIONS.map((section) => buildControlSection(ctx, section, facts, {
    includeRecords: false,
    module: moduleByKey.get(section.key)
  })));
};

export const getEcommerceControlSection = async (ctx, { key, path } = {}) => {
  const section = findEcommerceControlSection({ key, path });
  const facts = await collectCommerceFacts(ctx);
  return buildControlSection(ctx, section, facts);
};

export const getEcommerceControlSchema = async (_ctx, { key, path } = {}) => {
  const section = findEcommerceControlSection({ key, path });
  return buildControlSchema(section);
};

export const listEcommerceControlFunctions = async (_ctx, { key, path, limit } = {}) => {
  const section = findEcommerceControlSection({ key, path });
  return buildControlFunctionCatalog(section, limit || 120);
};

export const upsertEcommerceControlRecord = async (ctx, input) => {
  const section = findEcommerceControlSection({ key: input.sectionKey });
  const existing = await ctx.prisma.systemSetting.findUnique({ where: controlSettingWhere(section.key) });
  const now = new Date().toISOString();
  const records = normalizeControlRecords(existing?.value);
  const id = input.id || randomUUID();
  const previous = records.find((record) => record.id === id);
  const nextRecord = {
    id,
    title: input.title,
    status: input.status || previous?.status || 'active',
    owner: input.owner || previous?.owner || '',
    summary: input.summary || previous?.summary || '',
    data: input.data || previous?.data || {},
    createdAt: previous?.createdAt || now,
    updatedAt: now
  };
  const nextRecords = records.some((record) => record.id === id)
    ? records.map((record) => (record.id === id ? nextRecord : record))
    : [nextRecord, ...records];

  const setting = await ctx.prisma.systemSetting.upsert({
    where: controlSettingWhere(section.key),
    create: {
      scope: CONTROL_SCOPE,
      scopeId: section.key,
      key: CONTROL_RECORD_KEY,
      value: { sectionKey: section.key, records: nextRecords }
    },
    update: {
      value: { sectionKey: section.key, records: nextRecords }
    }
  });

  await writeAudit(ctx, input.id ? 'update_ecommerce_control_record' : 'create_ecommerce_control_record', 'ecommerceControlRecord', id, {
    sectionKey: section.key
  });

  return toApi(toControlRecord(section.key, nextRecord, setting.updatedAt));
};

export const deleteEcommerceControlRecord = async (ctx, sectionKey, id) => {
  const section = findEcommerceControlSection({ key: sectionKey });
  const existing = await ctx.prisma.systemSetting.findUnique({ where: controlSettingWhere(section.key) });
  if (!existing) return true;

  const nextRecords = normalizeControlRecords(existing.value).filter((record) => record.id !== id);
  await ctx.prisma.systemSetting.update({
    where: controlSettingWhere(section.key),
    data: { value: { sectionKey: section.key, records: nextRecords } }
  });
  await writeAudit(ctx, 'delete_ecommerce_control_record', 'ecommerceControlRecord', id, { sectionKey: section.key });
  return true;
};

const extractStoreId = (targetId = '') => String(targetId).startsWith('store:') ? String(targetId).slice('store:'.length) : targetId;
const extractTargetId = (targetId = '', prefix) => String(targetId).startsWith(`${prefix}:`) ? String(targetId).slice(prefix.length + 1) : targetId;

export const runEcommerceControlAction = async (ctx, input) => {
  const section = findEcommerceControlSection({ key: input.sectionKey });
  const actionKey = input.actionKey;
  let message = `${section.label} action queued.`;

  if (actionKey === 'enable_module' || actionKey === 'disable_module') {
    const status = actionKey === 'enable_module' ? 'active' : 'inactive';
    await upsertControlModule(ctx, section, { status });
    message = `${section.label} ${status === 'active' ? 'enabled' : 'disabled'}.`;
  } else if (actionKey === 'sync_section') {
    const current = await ctx.prisma.adminModule.findUnique({ where: { key: section.key } });
    await upsertControlModule(ctx, section, {
      metrics: {
        ...(current?.metrics || {}),
        health: 'synced',
        lastSyncAt: new Date().toISOString()
      }
    });
    message = `${section.label} synced with current commerce data.`;
  } else if (actionKey === 'pause_store' || actionKey === 'resume_store') {
    const storeId = extractStoreId(input.targetId);
    if (!storeId) throw new AppError('Store target is required for this action', 'BAD_USER_INPUT');
    const status = actionKey === 'pause_store' ? 'suspended' : 'active';
    await ctx.prisma.store.update({ where: { id: storeId }, data: { status } });
    message = `Store ${status === 'active' ? 'resumed' : 'suspended'}.`;
  } else if (['close_store', 'reopen_store', 'delete_store'].includes(actionKey)) {
    const storeId = extractStoreId(input.targetId);
    if (!storeId) throw new AppError('Store target is required for this action', 'BAD_USER_INPUT');
    const status = actionKey === 'close_store' ? 'closed' : actionKey === 'delete_store' ? 'deleted' : 'active';
    await ctx.prisma.store.update({ where: { id: storeId }, data: { status } });
    message = `Store ${status === 'active' ? 'reopened' : status}.`;
  } else if (actionKey === 'transfer_store') {
    const storeId = extractStoreId(input.targetId);
    if (!storeId) throw new AppError('Store target is required for this action', 'BAD_USER_INPUT');
    const newOwnerId = input.payload?.ownerId;
    if (newOwnerId) {
      await ctx.prisma.store.update({ where: { id: storeId }, data: { ownerId: newOwnerId } });
      message = 'Store ownership transferred.';
    } else {
      message = 'Store transfer review queued.';
    }
  } else if (['ban_merchant', 'activate_merchant', 'suspend_merchant', 'delete_merchant', 'approve_partner', 'suspend_partner'].includes(actionKey)) {
    const merchantId = extractTargetId(input.targetId, 'merchant');
    if (!merchantId) throw new AppError('Merchant target is required for this action', 'BAD_USER_INPUT');
    const status = ['activate_merchant', 'approve_partner'].includes(actionKey) ? 'active' : actionKey === 'ban_merchant' ? 'banned' : actionKey === 'delete_merchant' ? 'deleted' : 'suspended';
    await ctx.prisma.user.update({ where: { id: merchantId }, data: { status } });
    message = actionKey.includes('partner') ? `Partner account set to ${status}.` : `Merchant account set to ${status}.`;
  } else if (['activate_plan', 'disable_plan'].includes(actionKey)) {
    const planId = extractTargetId(input.targetId, 'plan');
    if (!planId) throw new AppError('Plan target is required for this action', 'BAD_USER_INPUT');
    await ctx.prisma.plan.update({ where: { id: planId }, data: { isActive: actionKey === 'activate_plan' } });
    message = actionKey === 'activate_plan' ? 'Plan activated.' : 'Plan disabled.';
  } else if (['retry_invoice', 'mark_invoice_paid', 'void_invoice'].includes(actionKey)) {
    const invoiceId = extractTargetId(input.targetId, 'invoice');
    if (!invoiceId) {
      message = `${section.label} invoice action queued.`;
    } else if (actionKey === 'mark_invoice_paid') {
      await ctx.prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'paid', paidAt: new Date() } });
      message = 'Invoice marked as paid.';
    } else if (actionKey === 'void_invoice') {
      await ctx.prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'void' } });
      message = 'Invoice voided.';
    } else {
      message = 'Invoice payment retry queued.';
    }
  } else if (['enable_plugin', 'disable_plugin', 'delete_plugin'].includes(actionKey)) {
    const pluginId = extractTargetId(input.targetId, 'plugin');
    if (!pluginId) throw new AppError('Extension target is required for this action', 'BAD_USER_INPUT');
    const status = actionKey === 'enable_plugin' ? 'active' : actionKey === 'delete_plugin' ? 'deleted' : 'inactive';
    await ctx.prisma.storePlugin.update({ where: { id: pluginId }, data: { status } });
    message = `Extension ${status === 'active' ? 'enabled' : status}.`;
  } else if (['publish_theme', 'unpublish_theme', 'delete_theme'].includes(actionKey)) {
    const themeId = extractTargetId(input.targetId, 'theme');
    if (!themeId) throw new AppError('Theme target is required for this action', 'BAD_USER_INPUT');
    const status = actionKey === 'publish_theme' ? 'active' : actionKey === 'delete_theme' ? 'deleted' : 'available';
    await ctx.prisma.storeTheme.update({ where: { id: themeId }, data: { status } });
    message = `Theme ${status === 'active' ? 'published' : status}.`;
  } else if (actionKey === 'resolve_alert') {
    const notificationId = extractTargetId(input.targetId, 'notification');
    if (!notificationId) throw new AppError('Alert target is required for this action', 'BAD_USER_INPUT');
    await ctx.prisma.notification.update({ where: { id: notificationId }, data: { status: 'read', readAt: new Date() } });
    message = 'Alert resolved.';
  } else if (actionKey === 'revoke_api_credential') {
    const credentialId = extractTargetId(input.targetId, 'credential');
    if (!credentialId) throw new AppError('API credential target is required for this action', 'BAD_USER_INPUT');
    await ctx.prisma.apiCredential.update({ where: { id: credentialId }, data: { status: 'revoked' } });
    message = 'API credential revoked.';
  } else if (actionKey === 'mark_alerts_read') {
    const result = await ctx.prisma.notification.updateMany({
      where: { status: 'unread', scope: { in: ['store', 'platform'] } },
      data: { status: 'read', readAt: new Date() }
    });
    message = `${result.count} ecommerce alerts marked as read.`;
  } else if (['purge_cache', 'rotate_secret', 'rotate_partner_key', 'provisioning_check', 'run_audit', 'approve_kyc', 'reject_kyc', 'sync_feed', 'sync_partner_catalog', 'rebuild_partner_portal', 'generate_partner_link', 'rebuild_index', 'create_campaign', 'send_broadcast', 'backup_cluster', 'restore_snapshot', 'renew_ssl', 'sync_translation', 'publish_mobile_config', 'apply_policy', 'settle_payout', 'review_app'].includes(actionKey)) {
    message = `${section.label} ${actionKey.replace(/_/g, ' ')} recorded.`;
  }

  await writeAudit(ctx, `ecommerce_control_${actionKey}`, 'ecommerceControlSection', section.key, {
    targetId: input.targetId,
    payload: input.payload || {}
  });

  return {
    ok: true,
    message,
    section: await getEcommerceControlSection(ctx, { key: section.key })
  };
};

export const runEcommerceControlFunction = async (ctx, input) => {
  const section = findEcommerceControlSection({ key: input.sectionKey });
  const functions = buildControlFunctionCatalog(section, 240);
  const functionDef = functions.find((item) => item.key === input.functionKey || item.payload?.functionKey === input.functionKey);
  if (!functionDef) throw new AppError('Ecommerce control function not found', 'NOT_FOUND');

  const result = await runEcommerceControlAction(ctx, {
    sectionKey: section.key,
    actionKey: functionDef.payload?.actionKey || functionDef.key,
    targetId: input.targetId,
    payload: {
      ...(functionDef.payload || {}),
      ...(input.payload || {}),
      functionLabel: functionDef.label
    }
  });

  return {
    ok: true,
    message: `${functionDef.label} queued.`,
    function: functionDef,
    section: result.section
  };
};
