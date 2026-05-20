import { canManageOwnerResource, isAdmin, ownerWhere } from '../../core/auth.js';
import { toApi } from '../../core/format.js';
import { writeAudit } from '../../core/audit.js';
import { pagination, searchWhere } from '../../core/validation.js';
import { ensureOwnerHasCredit } from '../billing/creditAutomation.js';

const serializeRecords = (records) => records.map((record) => ({
  id: record.id,
  type: record.type,
  name: record.name,
  value: record.value,
  ttl: record.ttl,
  priority: record.priority,
  status: record.status
}));

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
      dns: input.dns || ['ns1.tiwlo.com', 'ns2.tiwlo.com', 'ns3.tiwlo.com'],
      records: input.records || [],
      expiresAt
    }
  });
  await writeAudit(ctx, 'register_domain', 'domain', domain.id, { name: input.name });
  return toApi(domain);
};

export const addDnsRecord = async (ctx, input) => {
  const domain = await ctx.prisma.domain.findUnique({ where: { id: input.domainId } });
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
  await writeAudit(ctx, 'add_dns_record', 'domain', input.domainId, { type: input.type, name: input.name });
  return toApi(updated);
};

export const deleteDnsRecord = async (ctx, id) => {
  const record = await ctx.prisma.dnsRecord.findUnique({ where: { id }, include: { domain: true } });
  await canManageOwnerResource(ctx, record.domain.ownerId);
  await ctx.prisma.dnsRecord.delete({ where: { id } });
  const records = await ctx.prisma.dnsRecord.findMany({ where: { domainId: record.domainId } });
  await ctx.prisma.domain.update({
    where: { id: record.domainId },
    data: { records: serializeRecords(records) }
  });
  await writeAudit(ctx, 'delete_dns_record', 'dnsRecord', id);
  return true;
};

export const deleteDomain = async (ctx, id) => {
  const domain = await ctx.prisma.domain.findUnique({ where: { id } });
  await canManageOwnerResource(ctx, domain.ownerId);
  await ctx.prisma.domain.delete({ where: { id } });
  await writeAudit(ctx, 'delete_domain', 'domain', id);
  return true;
};
