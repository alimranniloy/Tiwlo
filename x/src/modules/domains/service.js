import { canManageOwnerResource, isAdmin, ownerWhere } from '../../core/auth.js';
import { toApi } from '../../core/format.js';
import { writeAudit } from '../../core/audit.js';
import { pagination, searchWhere } from '../../core/validation.js';
import { ensureOwnerHasCredit } from '../billing/creditAutomation.js';
import { defaultNameserversFor, getPowerDnsConfig, syncPowerDnsDomain, requireZoneAccess } from '../powerdns/service.js';
import { queueSslInstallForDomains } from '../system-tools/service.js';

const serializeRecords = (records) => records.map((record) => ({
  id: record.id,
  type: record.type,
  name: record.name,
  value: record.value,
  ttl: record.ttl,
  priority: record.priority,
  status: record.status
}));

const hostnameForRecord = (recordName, domainName) => {
  const name = String(recordName || '@').trim().toLowerCase();
  if (!name || name === '@') return domainName;
  if (name.endsWith(`.${domainName}`) || name === domainName) return name;
  return `${name}.${domainName}`;
};

const addressTypeFor = (ipAddress = '') => String(ipAddress).includes(':') ? 'AAAA' : 'A';
const cleanDkimValue = () => String(process.env.TIWLO_DKIM_PUBLIC_KEY || process.env.DKIM_PUBLIC_KEY || '').trim().replace(/^"|"$/g, '').replace(/\s+/g, '');
const cleanDkimSelector = () => String(process.env.TIWLO_DKIM_SELECTOR || process.env.DKIM_SELECTOR || 'tiwlo').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'tiwlo';
const bimiRecordValue = () => {
  const logo = String(process.env.TIWLO_BIMI_LOGO_URL || process.env.BIMI_LOGO_URL || '').trim();
  const authority = String(process.env.TIWLO_BIMI_CERT_URL || process.env.BIMI_CERT_URL || '').trim();
  if (!logo) return '';
  return `v=BIMI1; l=${logo}${authority ? `; a=${authority}` : ''}`;
};

const defaultDnsRecordsForDomain = (domainName, config) => {
  const serverIp = String(config.serverIp || '').trim();
  if (!serverIp || serverIp === 'SERVER_IP') return [];
  const addressType = addressTypeFor(serverIp);
  const spfIp = addressType === 'AAAA' ? `ip6:${serverIp}` : `ip4:${serverIp}`;
  return [
    { type: addressType, name: '@', value: serverIp },
    { type: addressType, name: 'www', value: serverIp },
    { type: addressType, name: 'mail', value: serverIp },
    { type: addressType, name: 'tmail', value: serverIp },
    { type: addressType, name: 'email', value: serverIp },
    { type: addressType, name: 'smtp', value: serverIp },
    { type: addressType, name: 'imap', value: serverIp },
    { type: addressType, name: 'pop', value: serverIp },
    { type: addressType, name: 'webmail', value: serverIp },
    { type: 'MX', name: '@', value: `mail.${domainName}`, priority: 10 },
    { type: 'TXT', name: '@', value: `v=spf1 mx a ${spfIp} ~all` },
    { type: 'TXT', name: '_dmarc', value: `v=DMARC1; p=quarantine; pct=100; rua=mailto:postmaster@${domainName}; ruf=mailto:postmaster@${domainName}; fo=1` },
    { type: 'TXT', name: `${cleanDkimSelector()}._domainkey`, value: cleanDkimValue() ? `v=DKIM1; h=sha256; k=rsa; p=${cleanDkimValue()}` : '' },
    { type: 'TXT', name: 'default._bimi', value: bimiRecordValue() },
    { type: 'CNAME', name: 'autodiscover', value: `mail.${domainName}` },
    { type: 'CNAME', name: 'autoconfig', value: `mail.${domainName}` },
    { type: 'CAA', name: '@', value: '0 issue "letsencrypt.org"' }
  ].filter((record) => record.value);
};

const ensureDefaultDnsRecords = async (ctx, domain) => {
  const config = await getPowerDnsConfig(ctx);
  const defaults = defaultDnsRecordsForDomain(domain.name, config);
  if (!defaults.length) return;
  const existing = await ctx.prisma.dnsRecord.findMany({ where: { domainId: domain.id } });
  const existingKeys = new Set(existing.map((record) => `${record.type}:${record.name}`.toLowerCase()));
  for (const record of defaults) {
    if (existingKeys.has(`${record.type}:${record.name}`.toLowerCase())) continue;
    await ctx.prisma.dnsRecord.create({
      data: {
        domainId: domain.id,
        type: record.type,
        name: record.name,
        value: record.value,
        ttl: 300,
        priority: record.priority,
        metadata: { provider: 'powerdns', source: 'auto_dns_defaults' }
      }
    });
  }
};

export const listDomains = async (ctx, { status, search, page, limit } = {}) => {
  const scoped = await ownerWhere(ctx);
  return toApi(await ctx.prisma.domain.findMany({
    where: { ...scoped, ...(status ? { status } : {}), ...searchWhere(search, ['name']) },
    orderBy: { createdAt: 'desc' },
    ...pagination({ page, limit })
  }));
};

export const listDnsRecords = async (ctx, domainId) => toApi(await ctx.prisma.dnsRecord.findMany({
  where: { domainId },
  orderBy: [{ type: 'asc' }, { name: 'asc' }]
}));

export const registerDomain = async (ctx, actor, input) => {
  if (!isAdmin(actor)) {
    await ensureOwnerHasCredit(ctx, actor.id, 'Credit balance is empty. Add credit now before registering domains.');
  }

  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + (input.years || 1));
  const domain = await ctx.prisma.domain.create({
    data: {
      ownerId: actor.id,
      name: input.name,
      dns: input.dns || await defaultNameserversFor(ctx),
      records: input.records || [],
      expiresAt
    }
  });
  await ensureDefaultDnsRecords(ctx, domain).catch(() => {});
  await syncPowerDnsDomain(ctx, domain.id).catch(() => {});
  await queueSslInstallForDomains({ prisma: ctx.prisma, domains: [domain.name], actor }).catch(() => {});
  await writeAudit(ctx, 'register_domain', 'domain', domain.id, { name: input.name });
  return toApi(domain);
};

export const updateDomain = async (ctx, input) => {
  const domain = await ctx.prisma.domain.findUnique({ where: { id: input.id } });
  await requireZoneAccess(ctx, domain);
  const updated = await ctx.prisma.domain.update({
    where: { id: input.id },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.dns ? { dns: input.dns } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.records ? { records: input.records } : {}),
      ...(typeof input.autoRenew === 'boolean' ? { autoRenew: input.autoRenew } : {})
    }
  });
  await syncPowerDnsDomain(ctx, updated.id).catch(() => {});
  await queueSslInstallForDomains({ prisma: ctx.prisma, domains: [updated.name] }).catch(() => {});
  await writeAudit(ctx, 'update_domain', 'domain', updated.id, { name: updated.name });
  return toApi(updated);
};

export const addDnsRecord = async (ctx, input) => {
  const domain = await ctx.prisma.domain.findUnique({ where: { id: input.domainId } });
  if (!domain) throw new Error('Domain not found');
  await canManageOwnerResource(ctx, domain.ownerId);
  await ctx.prisma.dnsRecord.create({
    data: {
      domainId: input.domainId,
      type: input.type,
      name: input.name,
      value: input.value,
      ttl: input.ttl || 300,
      priority: input.priority,
      metadata: input.metadata || {}
    }
  });
  const records = await ctx.prisma.dnsRecord.findMany({ where: { domainId: input.domainId } });
  const updated = await ctx.prisma.domain.update({
    where: { id: input.domainId },
    data: { records: serializeRecords(records) }
  });
  await syncPowerDnsDomain(ctx, input.domainId).catch(() => {});
  await queueSslInstallForDomains({ prisma: ctx.prisma, domains: [hostnameForRecord(input.name, domain.name)] }).catch(() => {});
  await writeAudit(ctx, 'add_dns_record', 'domain', input.domainId, { type: input.type, name: input.name });
  return toApi(updated);
};

export const updateDnsRecord = async (ctx, input) => {
  const record = await ctx.prisma.dnsRecord.findUnique({ where: { id: input.id }, include: { domain: true } });
  if (!record) throw new Error('DNS record not found');
  await canManageOwnerResource(ctx, record.domain.ownerId);
  const updatedRecord = await ctx.prisma.dnsRecord.update({
    where: { id: input.id },
    data: {
      ...(input.type ? { type: input.type } : {}),
      ...(input.name ? { name: input.name } : {}),
      ...(input.value ? { value: input.value } : {}),
      ...(input.ttl ? { ttl: input.ttl } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {})
    }
  });
  const records = await ctx.prisma.dnsRecord.findMany({ where: { domainId: record.domainId } });
  await ctx.prisma.domain.update({
    where: { id: record.domainId },
    data: { records: serializeRecords(records) }
  });
  await syncPowerDnsDomain(ctx, record.domainId).catch(() => {});
  await queueSslInstallForDomains({ prisma: ctx.prisma, domains: [hostnameForRecord(updatedRecord.name, record.domain.name)] }).catch(() => {});
  await writeAudit(ctx, 'update_dns_record', 'dnsRecord', input.id, { type: updatedRecord.type, name: updatedRecord.name });
  return toApi(updatedRecord);
};

export const deleteDnsRecord = async (ctx, id) => {
  const record = await ctx.prisma.dnsRecord.findUnique({ where: { id }, include: { domain: true } });
  if (!record) return true;
  await canManageOwnerResource(ctx, record.domain.ownerId);
  await ctx.prisma.dnsRecord.delete({ where: { id } });
  const records = await ctx.prisma.dnsRecord.findMany({ where: { domainId: record.domainId } });
  await ctx.prisma.domain.update({
    where: { id: record.domainId },
    data: { records: serializeRecords(records) }
  });
  await syncPowerDnsDomain(ctx, record.domainId).catch(() => {});
  await writeAudit(ctx, 'delete_dns_record', 'dnsRecord', id);
  return true;
};

export const deleteDomain = async (ctx, id) => {
  const domain = await ctx.prisma.domain.findUnique({ where: { id } });
  if (!domain) return true;
  await canManageOwnerResource(ctx, domain.ownerId);
  await ctx.prisma.domain.delete({ where: { id } });
  const pdnsRows = await ctx.prisma.$queryRaw`SELECT id FROM domains WHERE name = ${domain.name} LIMIT 1`.catch(() => []);
  if (pdnsRows?.[0]?.id) {
    await ctx.prisma.$executeRaw`DELETE FROM records WHERE domain_id = ${Number(pdnsRows[0].id)}`.catch(() => {});
  }
  await ctx.prisma.$executeRaw`DELETE FROM domains WHERE name = ${domain.name}`.catch(() => {});
  await writeAudit(ctx, 'delete_domain', 'domain', id);
  return true;
};
