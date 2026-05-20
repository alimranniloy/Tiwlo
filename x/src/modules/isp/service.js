import { randomUUID } from 'crypto';
import { canManageOwnerResource, isAdmin, ownerWhere } from '../../core/auth.js';
import { removeUndefined, slugify, toApi } from '../../core/format.js';
import { writeAudit } from '../../core/audit.js';
import { AppError } from '../../core/errors.js';
import { pagination, searchWhere } from '../../core/validation.js';
import { ensureOwnerHasCredit } from '../billing/creditAutomation.js';
import { planByCode } from '../ecommerce/service.js';

const ISP_ROOT_DOMAIN = (process.env.ISP_ROOT_DOMAIN || 'tiwlo.com').toLowerCase();
const ISP_WILDCARD_TARGET = (process.env.ISP_WILDCARD_TARGET || `*.${ISP_ROOT_DOMAIN}`).toLowerCase();

export const listSites = async (ctx) => {
  const scoped = await ownerWhere(ctx);
  return toApi(await ctx.prisma.ispSite.findMany({ where: scoped, orderBy: { createdAt: 'desc' } }));
};

export const getSite = async (ctx, { id, code }) => {
  const site = await ctx.prisma.ispSite.findFirst({ where: id ? { id } : { code } });
  if (!site) return null;
  await canManageOwnerResource(ctx, site.ownerId);
  return toApi(site);
};

const requireSiteAccess = async (ctx, siteId) => {
  const site = await ctx.prisma.ispSite.findUnique({ where: { id: siteId } });
  if (!site) throw new AppError('ISP site not found', 'NOT_FOUND');
  await canManageOwnerResource(ctx, site.ownerId);
  return site;
};

const scopedSiteIds = async (ctx) => {
  const scoped = await ownerWhere(ctx);
  const sites = await ctx.prisma.ispSite.findMany({ where: scoped, select: { id: true } });
  return sites.map((site) => site.id);
};

const adminRecordKey = (section) => `ispAdmin:${slugify(section || 'general')}`;

const normalizeRecords = (value) => (
  Array.isArray(value?.records) ? value.records : []
);

const toIspAdminRecord = (siteId, section, setting, record) => ({
  id: record.id,
  siteId,
  section,
  title: record.title || record.data?.name || record.id,
  status: record.status || 'active',
  data: record.data || {},
  createdAt: record.createdAt || setting?.createdAt,
  updatedAt: record.updatedAt || setting?.updatedAt
});

export const listPackages = async (ctx) => toApi(await ctx.prisma.ispPackage.findMany({ orderBy: { price: 'asc' } }));

export const listClients = async (ctx, siteId, { status, search, page, limit } = {}) => {
  const whereSite = siteId ? { siteId: (await requireSiteAccess(ctx, siteId)).id } : { siteId: { in: await scopedSiteIds(ctx) } };
  return toApi(await ctx.prisma.ispClient.findMany({
    where: { ...whereSite, ...(status ? { status } : {}), ...searchWhere(search, ['name', 'username', 'email', 'phone']) },
    orderBy: { createdAt: 'desc' },
    ...pagination({ page, limit })
  }));
};

export const listRouters = async (ctx, siteId) => toApi(await ctx.prisma.ispRouter.findMany({
  where: { siteId: (await requireSiteAccess(ctx, siteId)).id },
  orderBy: { createdAt: 'desc' }
}));

export const listRadiusServers = async (ctx, siteId) => toApi(await ctx.prisma.radiusServer.findMany({
  where: { siteId: (await requireSiteAccess(ctx, siteId)).id },
  orderBy: { createdAt: 'desc' }
}));

export const listNetworkDevices = async (ctx, siteId, { type } = {}) => toApi(await ctx.prisma.networkDevice.findMany({
  where: { siteId: (await requireSiteAccess(ctx, siteId)).id, ...(type ? { type } : {}) },
  orderBy: { createdAt: 'desc' }
}));

export const listInvoices = async (ctx, siteId, { status, page, limit } = {}) => {
  const whereSite = siteId ? { siteId: (await requireSiteAccess(ctx, siteId)).id } : { siteId: { in: await scopedSiteIds(ctx) } };
  return toApi(await ctx.prisma.ispInvoice.findMany({
    where: { ...whereSite, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
    ...pagination({ page, limit })
  }));
};

export const createSite = async (ctx, actor, input) => {
  if (!isAdmin(actor)) {
    await ensureOwnerHasCredit(ctx, actor.id, 'Credit balance is empty. Add credit now before opening an ISP billing site.');
  }

  const cleanCode = slugify(input.code || input.name);
  if (!cleanCode) throw new AppError('ISP site code is required', 'BAD_USER_INPUT');

  const plan = await planByCode(ctx, 'isp', input.planCode || 'enterprise');
  const site = await ctx.prisma.ispSite.create({
    data: {
      ownerId: actor.id,
      planId: plan?.id,
      name: input.name,
      code: cleanCode,
      region: input.region,
      node: input.node,
      bandwidth: input.bandwidth,
      subscribers: input.subscribers || 0,
      settings: input.settings || {}
    }
  });

  const siteDomainName = `isp-${cleanCode}.${ISP_ROOT_DOMAIN}`;
  const domain = await ctx.prisma.domain.upsert({
    where: { name: siteDomainName },
    create: {
      ownerId: actor.id,
      name: siteDomainName,
      dns: ['cloudflare-managed'],
      status: 'active',
      records: [{ type: 'CNAME', name: `isp-${cleanCode}`, value: ISP_WILDCARD_TARGET, ttl: 300, proxied: true, ssl: 'edge', routeMode: 'cloudflare_tunnel_wildcard' }]
    },
    update: {
      ownerId: actor.id,
      status: 'active',
      dns: ['cloudflare-managed'],
      records: [{ type: 'CNAME', name: `isp-${cleanCode}`, value: ISP_WILDCARD_TARGET, ttl: 300, proxied: true, ssl: 'edge', routeMode: 'cloudflare_tunnel_wildcard' }]
    }
  });

  await ctx.prisma.dnsRecord.upsert({
    where: { id: `isp_${site.id}_root_cname` },
    create: {
      id: `isp_${site.id}_root_cname`,
      domainId: domain.id,
      type: 'CNAME',
      name: `isp-${cleanCode}`,
      value: ISP_WILDCARD_TARGET,
      ttl: 300,
      metadata: { siteId: site.id, autoProvisioned: true, routeMode: 'cloudflare_tunnel_wildcard', ssl: 'edge' }
    },
    update: { name: `isp-${cleanCode}`, value: ISP_WILDCARD_TARGET, status: 'active', metadata: { siteId: site.id, autoProvisioned: true, routeMode: 'cloudflare_tunnel_wildcard', ssl: 'edge' } }
  });

  await ctx.prisma.systemSetting.upsert({
    where: { scope_scopeId_key: { scope: 'isp', scopeId: site.id, key: 'provisioning' } },
    create: {
      scope: 'isp',
      scopeId: site.id,
      key: 'provisioning',
      value: {
        publicUrl: `https://${siteDomainName}`,
        radius: 'queued',
        ssl: 'active',
        domainId: domain.id,
        journey: ['plan_selected', 'site_identity_created', 'radius_cluster_queued', 'domain_mapped', 'router_ready']
      }
    },
    update: {
      value: {
        publicUrl: `https://${siteDomainName}`,
        radius: 'queued',
        ssl: 'active',
        domainId: domain.id,
        journey: ['plan_selected', 'site_identity_created', 'radius_cluster_queued', 'domain_mapped', 'router_ready']
      }
    }
  });

  await writeAudit(ctx, 'create_isp_site', 'ispSite', site.id, { code: cleanCode });
  return toApi(site);
};

export const updateSite = async (ctx, input) => {
  const { id, ...data } = input;
  const existing = await ctx.prisma.ispSite.findUnique({ where: { id } });
  if (!existing) throw new AppError('ISP site not found', 'NOT_FOUND');
  await canManageOwnerResource(ctx, existing.ownerId);
  const site = await ctx.prisma.ispSite.update({ where: { id }, data: removeUndefined(data) });
  await writeAudit(ctx, 'update_isp_site', 'ispSite', id);
  return toApi(site);
};

export const createClient = async (ctx, input) => {
  const site = await requireSiteAccess(ctx, input.siteId);
  await ensureOwnerHasCredit(ctx, site.ownerId, 'This ISP site is paused because its owner has no credit. Add credit now before adding subscribers.');
  const client = await ctx.prisma.ispClient.create({
    data: { ...input, status: input.status || 'active', balance: input.balance || 0 }
  });
  await writeAudit(ctx, 'create_isp_client', 'ispClient', client.id, { siteId: input.siteId });
  return toApi(client);
};

export const updateClient = async (ctx, input) => {
  const { id, ...data } = input;
  const current = await ctx.prisma.ispClient.findUnique({ where: { id }, include: { site: true } });
  if (!current) throw new AppError('ISP client not found', 'NOT_FOUND');
  await canManageOwnerResource(ctx, current.site.ownerId);
  const client = await ctx.prisma.ispClient.update({ where: { id }, data: removeUndefined(data) });
  await writeAudit(ctx, 'update_isp_client', 'ispClient', id);
  return toApi(client);
};

export const deleteClient = async (ctx, id) => {
  const current = await ctx.prisma.ispClient.findUnique({ where: { id }, include: { site: true } });
  if (!current) throw new AppError('ISP client not found', 'NOT_FOUND');
  await canManageOwnerResource(ctx, current.site.ownerId);
  await ctx.prisma.ispClient.delete({ where: { id } });
  await writeAudit(ctx, 'delete_isp_client', 'ispClient', id);
  return true;
};

export const createPackage = async (ctx, input) => {
  const pkg = await ctx.prisma.ispPackage.create({ data: { ...input, billingCycle: input.billingCycle || 'month' } });
  await writeAudit(ctx, 'create_isp_package', 'ispPackage', pkg.id);
  return toApi(pkg);
};

export const createRouter = async (ctx, input) => {
  const site = await requireSiteAccess(ctx, input.siteId);
  await ensureOwnerHasCredit(ctx, site.ownerId, 'This ISP site is paused because its owner has no credit. Add credit now before adding routers.');
  const router = await ctx.prisma.ispRouter.create({
    data: { ...input, vendor: input.vendor || 'MikroTik', config: input.config || {} }
  });
  await writeAudit(ctx, 'create_isp_router', 'ispRouter', router.id, { siteId: input.siteId });
  return toApi(router);
};

export const updateRouter = async (ctx, input) => {
  const { id, ...data } = input;
  const current = await ctx.prisma.ispRouter.findUnique({ where: { id }, include: { site: true } });
  if (!current) throw new AppError('ISP router not found', 'NOT_FOUND');
  await canManageOwnerResource(ctx, current.site.ownerId);
  const router = await ctx.prisma.ispRouter.update({ where: { id }, data: removeUndefined(data) });
  await writeAudit(ctx, 'update_isp_router', 'ispRouter', id);
  return toApi(router);
};

export const deleteRouter = async (ctx, id) => {
  const current = await ctx.prisma.ispRouter.findUnique({ where: { id }, include: { site: true } });
  if (!current) throw new AppError('ISP router not found', 'NOT_FOUND');
  await canManageOwnerResource(ctx, current.site.ownerId);
  await ctx.prisma.ispRouter.delete({ where: { id } });
  await writeAudit(ctx, 'delete_isp_router', 'ispRouter', id);
  return true;
};

export const syncRouter = async (ctx, id) => {
  const current = await ctx.prisma.ispRouter.findUnique({ where: { id }, include: { site: true } });
  if (!current) throw new AppError('ISP router not found', 'NOT_FOUND');
  await canManageOwnerResource(ctx, current.site.ownerId);
  const router = await ctx.prisma.ispRouter.update({
    where: { id },
    data: {
      status: 'online',
      config: {
        ...(current.config || {}),
        lastSyncAt: new Date().toISOString(),
        syncState: 'queued',
        scope: 'site',
        siteId: current.siteId
      }
    }
  });
  await writeAudit(ctx, 'sync_isp_router', 'ispRouter', id, { siteId: current.siteId });
  return toApi(router);
};

export const createRadiusServer = async (ctx, input) => {
  const site = await requireSiteAccess(ctx, input.siteId);
  await ensureOwnerHasCredit(ctx, site.ownerId, 'This ISP site is paused because its owner has no credit. Add credit now before adding RADIUS servers.');
  const server = await ctx.prisma.radiusServer.create({ data: { ...input, metadata: input.metadata || {} } });
  await writeAudit(ctx, 'create_radius_server', 'radiusServer', server.id, { siteId: input.siteId });
  return toApi(server);
};

export const updateRadiusServer = async (ctx, input) => {
  const { id, ...data } = input;
  const current = await ctx.prisma.radiusServer.findUnique({ where: { id }, include: { site: true } });
  if (!current) throw new AppError('RADIUS server not found', 'NOT_FOUND');
  await canManageOwnerResource(ctx, current.site.ownerId);
  const server = await ctx.prisma.radiusServer.update({ where: { id }, data: removeUndefined(data) });
  await writeAudit(ctx, 'update_radius_server', 'radiusServer', id);
  return toApi(server);
};

export const deleteRadiusServer = async (ctx, id) => {
  const current = await ctx.prisma.radiusServer.findUnique({ where: { id }, include: { site: true } });
  if (!current) throw new AppError('RADIUS server not found', 'NOT_FOUND');
  await canManageOwnerResource(ctx, current.site.ownerId);
  await ctx.prisma.radiusServer.delete({ where: { id } });
  await writeAudit(ctx, 'delete_radius_server', 'radiusServer', id);
  return true;
};

export const upsertNetworkDevice = async (ctx, input) => {
  const site = await requireSiteAccess(ctx, input.siteId);
  await ensureOwnerHasCredit(ctx, site.ownerId, 'This ISP site is paused because its owner has no credit. Add credit now before changing network devices.');
  if (input.id) {
    const current = await ctx.prisma.networkDevice.findUnique({ where: { id: input.id }, include: { site: true } });
    if (!current) throw new AppError('Network device not found', 'NOT_FOUND');
    await canManageOwnerResource(ctx, current.site.ownerId);
    if (current.siteId !== input.siteId) throw new AppError('Network device does not belong to this ISP site', 'FORBIDDEN');
  }
  const data = {
    siteId: input.siteId,
    type: input.type,
    name: input.name,
    serial: input.serial,
    status: input.status || 'online',
    metadata: input.metadata || {}
  };
  const device = input.id
    ? await ctx.prisma.networkDevice.update({ where: { id: input.id }, data: removeUndefined(data) })
    : await ctx.prisma.networkDevice.create({ data });
  await writeAudit(ctx, input.id ? 'update_network_device' : 'create_network_device', 'networkDevice', device.id, { siteId: input.siteId, type: input.type });
  return toApi(device);
};

export const deleteNetworkDevice = async (ctx, id) => {
  const current = await ctx.prisma.networkDevice.findUnique({ where: { id }, include: { site: true } });
  if (!current) throw new AppError('Network device not found', 'NOT_FOUND');
  await canManageOwnerResource(ctx, current.site.ownerId);
  await ctx.prisma.networkDevice.delete({ where: { id } });
  await writeAudit(ctx, 'delete_network_device', 'networkDevice', id);
  return true;
};

export const listAdminRecords = async (ctx, siteId, section) => {
  await requireSiteAccess(ctx, siteId);
  const setting = await ctx.prisma.systemSetting.findUnique({
    where: { scope_scopeId_key: { scope: 'isp', scopeId: siteId, key: adminRecordKey(section) } }
  });
  return normalizeRecords(setting?.value).map((record) => toIspAdminRecord(siteId, section, setting, record));
};

export const upsertAdminRecord = async (ctx, input) => {
  await requireSiteAccess(ctx, input.siteId);
  const key = adminRecordKey(input.section);
  const existing = await ctx.prisma.systemSetting.findUnique({
    where: { scope_scopeId_key: { scope: 'isp', scopeId: input.siteId, key } }
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
    where: { scope_scopeId_key: { scope: 'isp', scopeId: input.siteId, key } },
    create: { scope: 'isp', scopeId: input.siteId, key, value: { section: input.section, records: nextRecords } },
    update: { value: { section: input.section, records: nextRecords } }
  });
  await writeAudit(ctx, input.id ? 'update_isp_admin_record' : 'create_isp_admin_record', 'ispAdminRecord', id, {
    siteId: input.siteId,
    section: input.section
  });
  return toIspAdminRecord(input.siteId, input.section, setting, nextRecord);
};

export const deleteAdminRecord = async (ctx, siteId, section, id) => {
  await requireSiteAccess(ctx, siteId);
  const key = adminRecordKey(section);
  const existing = await ctx.prisma.systemSetting.findUnique({
    where: { scope_scopeId_key: { scope: 'isp', scopeId: siteId, key } }
  });
  if (!existing) return true;
  const nextRecords = normalizeRecords(existing.value).filter((record) => record.id !== id);
  await ctx.prisma.systemSetting.update({
    where: { scope_scopeId_key: { scope: 'isp', scopeId: siteId, key } },
    data: { value: { section, records: nextRecords } }
  });
  await writeAudit(ctx, 'delete_isp_admin_record', 'ispAdminRecord', id, { siteId, section });
  return true;
};
