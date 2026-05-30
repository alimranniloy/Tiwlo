import { canManageOwnerResource, isAdmin, ownerWhere } from '../../core/auth.js';
import { randomIp, removeUndefined, toApi } from '../../core/format.js';
import { writeAudit } from '../../core/audit.js';
import { pagination, searchWhere } from '../../core/validation.js';
import { ensureOwnerHasCredit } from '../billing/creditAutomation.js';

const resourceTypesWithAutoIp = new Set(['droplet', 'system_server']);

export const listPlans = async (ctx, product) => toApi(await ctx.prisma.plan.findMany({
  where: product ? { product, isActive: true } : { isActive: true },
  orderBy: [{ product: 'asc' }, { price: 'asc' }]
}));

export const upsertPlan = async (ctx, input) => {
  const data = {
    code: input.code,
    product: input.product,
    name: input.name,
    price: input.price,
    interval: input.interval || 'month',
    features: input.features || [],
    limits: input.limits || {},
    isActive: input.isActive ?? true
  };
  const plan = input.id
    ? await ctx.prisma.plan.update({ where: { id: input.id }, data: removeUndefined(data) })
    : await ctx.prisma.plan.upsert({
      where: { product_code: { product: input.product, code: input.code } },
      create: data,
      update: removeUndefined(data)
    });

  await writeAudit(ctx, input.id ? 'update_plan' : 'upsert_plan', 'plan', plan.id, {
    product: plan.product,
    code: plan.code
  });
  return toApi(plan);
};

export const deletePlan = async (ctx, id) => {
  const plan = await ctx.prisma.plan.update({ where: { id }, data: { isActive: false } });
  await writeAudit(ctx, 'deactivate_plan', 'plan', id, { product: plan.product, code: plan.code });
  return true;
};

export const listResources = async (ctx, { type, status, search, page, limit } = {}) => {
  const scoped = await ownerWhere(ctx);
  return toApi(await ctx.prisma.cloudResource.findMany({
    where: { ...scoped, ...(type ? { type } : {}), ...(status ? { status } : {}), ...searchWhere(search, ['name', 'region', 'specs', 'ip']) },
    orderBy: { createdAt: 'desc' },
    ...pagination({ page, limit })
  }));
};

export const createResource = async (ctx, actor, input) => {
  if (!isAdmin(actor)) {
    await ensureOwnerHasCredit(ctx, actor.id, 'Credit balance is empty. Add credit now before creating resources.');
  }

  const resource = await ctx.prisma.cloudResource.create({
    data: {
      ownerId: actor.id,
      type: input.type,
      name: input.name,
      ip: input.ip || (resourceTypesWithAutoIp.has(input.type) ? randomIp() : null),
      status: 'active',
      region: input.region,
      specs: input.specs,
      image: input.image,
      plan: input.plan,
      cpu: input.cpu,
      ram: input.ram,
      disk: input.disk,
      monthlyCost: input.monthlyCost || 0,
      metadata: input.metadata || {}
    }
  });
  await writeAudit(ctx, 'create_resource', 'cloudResource', resource.id, { type: input.type });
  return toApi(resource);
};

export const updateResourceStatus = async (ctx, id, status) => {
  const current = await ctx.prisma.cloudResource.findUnique({ where: { id } });
  await canManageOwnerResource(ctx, current.ownerId);
  const resource = await ctx.prisma.cloudResource.update({ where: { id }, data: { status } });
  await writeAudit(ctx, 'update_resource_status', 'cloudResource', id, { status });
  return toApi(resource);
};

export const deleteResource = async (ctx, id) => {
  const current = await ctx.prisma.cloudResource.findUnique({ where: { id } });
  await canManageOwnerResource(ctx, current.ownerId);
  await ctx.prisma.cloudResource.delete({ where: { id } });
  await writeAudit(ctx, 'delete_resource', 'cloudResource', id);
  return true;
};
