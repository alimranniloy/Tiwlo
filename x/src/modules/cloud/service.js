import { canManageOwnerResource, isAdmin, ownerWhere } from '../../core/auth.js';
import { randomIp, removeUndefined, toApi } from '../../core/format.js';
import { writeAudit } from '../../core/audit.js';
import { pagination, searchWhere } from '../../core/validation.js';
import { ensureOwnerHasCredit } from '../billing/creditAutomation.js';
import { chargeProvisioningCredit, requireProvisioningCredit } from '../billing/service.js';

const resourceTypesWithAutoIp = new Set(['droplet', 'system_server']);
const firstHourCharge = (monthlyCost) => Math.max(Math.round((Number(monthlyCost || 0) / 730) * 100) / 100, 0.01);

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
  const monthlyCost = Number(input.monthlyCost || 0);
  const hourlyRate = monthlyCost > 0 ? firstHourCharge(monthlyCost) : 0;
  if (!isAdmin(actor) && hourlyRate > 0) {
    await requireProvisioningCredit(ctx, actor.id, hourlyRate, `Add at least USD ${hourlyRate.toFixed(2)} credit before creating this resource.`);
  }
  const provisionedAt = new Date().toISOString();
  const metadata = {
    ...(input.metadata || {}),
    ...(monthlyCost > 0 ? {
      billing: {
        ...(input.metadata?.billing || {}),
        monthlyCost,
        hourlyRate,
        billingCycle: 'hourly_monthly_cap',
        startedAt: provisionedAt,
        lastBilledAt: provisionedAt,
        monthlyCap: monthlyCost
      }
    } : {})
  };

  let resource = await ctx.prisma.cloudResource.create({
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
      monthlyCost,
      metadata
    }
  });
  await writeAudit(ctx, 'create_resource', 'cloudResource', resource.id, { type: input.type });
  if (!isAdmin(actor) && hourlyRate > 0) {
    const invoice = await chargeProvisioningCredit(ctx, {
      ownerId: actor.id,
      amount: hourlyRate,
      scope: 'cloud_resource',
      scopeId: resource.id,
      label: `${resource.name} first hour`,
      monthlyCost,
      hourlyRate,
      metadata: { resourceId: resource.id, type: resource.type }
    });
    const billedAt = new Date().toISOString();
    resource = await ctx.prisma.cloudResource.update({
      where: { id: resource.id },
      data: {
        metadata: {
          ...(resource.metadata || {}),
          billing: {
            ...(resource.metadata?.billing || {}),
            monthlyCost,
            hourlyRate,
            billingCycle: 'hourly_monthly_cap',
            startedAt: billedAt,
            lastBilledAt: billedAt,
            monthlyCap: monthlyCost,
            initialInvoiceId: invoice?.id,
            initialCharge: hourlyRate
          }
        }
      }
    });
  }
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
  const deploymentNodeId = String(current?.metadata?.deploymentNode?.id || '').trim();
  await ctx.prisma.$transaction(async (tx) => {
    await tx.cloudResource.delete({ where: { id } });
    if (current?.type === 'droplet' && deploymentNodeId) {
      await tx.$executeRawUnsafe(`
        UPDATE "HostingComputeNode"
        SET "activeAccounts" = GREATEST("activeAccounts" - 1, 0),
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
      `, deploymentNodeId);
    }
  });
  await writeAudit(ctx, 'delete_resource', 'cloudResource', id);
  return true;
};
