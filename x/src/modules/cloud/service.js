import { randomBytes, randomUUID } from 'node:crypto';
import { canManageOwnerResource, isAdmin, ownerWhere } from '../../core/auth.js';
import { randomIp, removeUndefined, toApi } from '../../core/format.js';
import { writeAudit } from '../../core/audit.js';
import { pagination, searchWhere } from '../../core/validation.js';
import { ensureOwnerHasCredit } from '../billing/creditAutomation.js';
import { chargeProvisioningCredit, requireProvisioningCredit } from '../billing/service.js';
import { AppError } from '../../core/errors.js';
import { ensureHostingTables } from '../hosting/service.js';
import { ensureTPanelTables } from '../tpanel/service.js';
import {
  changeTPanelNodeAccountPassword,
  createTPanelNodeAccount,
  createTPanelNodeSsoUrl,
  findTPanelNodeAccount,
  updateTPanelNodeAccountStatus
} from '../tpanel/nodeApi.js';

const resourceTypesWithAutoIp = new Set(['droplet', 'system_server']);
const firstHourCharge = (monthlyCost) => Math.max(Math.round((Number(monthlyCost || 0) / 730) * 100) / 100, 0.01);
const tpanelPanels = new Set(['tpanel', 'hosting-panel']);

const findDeploymentNodeForResource = async (prisma, resource) => {
  const nodeId = String(resource?.metadata?.deploymentNode?.id || resource?.metadata?.tpanelAccount?.nodeId || '').trim();
  if (!nodeId) return null;
  const rows = await prisma.$queryRawUnsafe('SELECT * FROM "HostingComputeNode" WHERE "id" = $1 LIMIT 1', nodeId);
  const node = rows?.[0] || null;
  if (!node || !tpanelPanels.has(String(node.panel || '').toLowerCase())) return null;
  return node;
};

const queueLegacyTPanelTask = async (tx, { account, action, requestedById, payload = {}, priority = 15 }) => {
  if (!account?.id || !account?.licenseId) return false;
  await tx.$executeRawUnsafe(`
    INSERT INTO "TPanelRemoteTask"
      ("id", "licenseId", "accountId", "action", "status", "priority", "payload", "requestedById", "queuedAt", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, 'queued', $5, CAST($6 AS jsonb), $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, randomUUID(), account.licenseId, account.id, action, priority, JSON.stringify(payload), requestedById || null);
  return true;
};

const terminateLocalTPanelReferences = async (tx, account) => {
  const accountId = String(account?.id || '').trim();
  const licenseId = String(account?.licenseId || '').trim();
  const username = String(account?.username || '').trim().toLowerCase();
  const domain = String(account?.domain || '').trim().toLowerCase();

  if (accountId) {
    await tx.$executeRawUnsafe(`
      DELETE FROM "TPanelRemoteTask"
      WHERE "accountId" = $1
    `, accountId);
    await tx.$executeRawUnsafe(`
      DELETE FROM "TPanelDnsZone"
      WHERE "accountId" = $1
         OR ("licenseId" = $2 AND LOWER("domain") = $3)
    `, accountId, licenseId, domain);
    await tx.$executeRawUnsafe(`
      DELETE FROM "TPanelManagedAccount"
      WHERE "id" = $1
    `, accountId);
  } else if (licenseId && (username || domain)) {
    await tx.$executeRawUnsafe(`
      DELETE FROM "TPanelRemoteTask"
      WHERE "accountId" IN (
        SELECT "id" FROM "TPanelManagedAccount"
        WHERE "licenseId" = $1
          AND (LOWER("username") = $2 OR LOWER("domain") = $3)
      )
    `, licenseId, username, domain);
    await tx.$executeRawUnsafe(`
      DELETE FROM "TPanelDnsZone"
      WHERE "licenseId" = $1
        AND (LOWER("domain") = $2 OR "accountId" IN (
          SELECT "id" FROM "TPanelManagedAccount"
          WHERE "licenseId" = $1 AND LOWER("username") = $3
        ))
    `, licenseId, domain, username);
    await tx.$executeRawUnsafe(`
      DELETE FROM "TPanelManagedAccount"
      WHERE "licenseId" = $1
        AND (LOWER("username") = $2 OR LOWER("domain") = $3)
    `, licenseId, username, domain);
  }

  if (username || domain) {
    await tx.$executeRawUnsafe(`
      DELETE FROM "HostingProvisioningOrder"
      WHERE LOWER("username") = $1 OR LOWER("domain") = $2
    `, username, domain);
  }
};

const ensureTPanelLoginAccountReady = async (node, resource, account) => {
  if (resource.status !== 'active') {
    throw new AppError('Turn on this droplet before opening tPanel login.', 'BAD_USER_INPUT');
  }
  let remoteAccount = await findTPanelNodeAccount(node, account);
  if (!remoteAccount) {
    remoteAccount = await createTPanelNodeAccount(node, {
      username: account.username,
      password: randomBytes(18).toString('base64url'),
      domain: account.domain,
      limits: account.limits || {},
      packageCode: account.packageCode || resource.plan || '',
      packageName: account.packageName || resource.plan || '',
      displayName: resource.name || account.domain || account.username,
      permissionProfile: account.permissionProfile || 'developer',
      shellAccess: account.shellAccess !== false
    });
  }
  if (String(remoteAccount.status || '').toLowerCase() !== 'active') {
    await updateTPanelNodeAccountStatus(node, remoteAccount, 'active');
    return { ...remoteAccount, status: 'active' };
  }
  return remoteAccount;
};

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
    await requireProvisioningCredit(ctx, actor.id, hourlyRate, 'Add enough Tiwlo credit before creating this resource.');
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
      currency: 'USD',
      displayCurrency: input.currency || 'USD',
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
  if (!current) throw new AppError('Cloud resource was not found', 'NOT_FOUND');
  await canManageOwnerResource(ctx, current.ownerId);
  const nextStatus = String(status || '').toLowerCase();
  const tpanelAccount = current?.metadata?.tpanelAccount || null;
  const shouldSyncTPanel = current?.type === 'droplet' && tpanelAccount?.username && ['active', 'off'].includes(nextStatus);
  const node = shouldSyncTPanel ? await findDeploymentNodeForResource(ctx.prisma, current) : null;
  if (shouldSyncTPanel && node) {
    await updateTPanelNodeAccountStatus(node, tpanelAccount, nextStatus === 'active' ? 'active' : 'suspended');
  } else if (shouldSyncTPanel && !tpanelAccount?.licenseId) {
    throw new AppError('This resource is not linked with an active tPanel server anymore.', 'BAD_USER_INPUT');
  }
  const resource = await ctx.prisma.$transaction(async (tx) => {
    const updated = await tx.cloudResource.update({ where: { id }, data: { status: nextStatus } });
    if (current?.type === 'droplet' && tpanelAccount?.id && tpanelAccount?.licenseId && ['active', 'off'].includes(nextStatus)) {
      const accountStatus = nextStatus === 'active' ? 'active' : 'suspended';
      const action = nextStatus === 'active' ? 'unsuspend_account' : 'suspend_account';
      await tx.$executeRawUnsafe(`
        UPDATE "TPanelManagedAccount"
        SET "status" = $2,
            "metadata" = CAST($3 AS jsonb),
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
      `, tpanelAccount.id, accountStatus, JSON.stringify({ ...(tpanelAccount.metadata || {}), cloudResourceId: id, statusChangedFromCloudAt: new Date().toISOString() }));
      if (!node) {
        await queueLegacyTPanelTask(tx, {
          account: tpanelAccount,
          action,
          requestedById: current.ownerId,
          payload: {
            account: {
              id: tpanelAccount.id,
              licenseId: tpanelAccount.licenseId,
              username: tpanelAccount.username,
              domain: tpanelAccount.domain,
              homeDirectory: `/home/${tpanelAccount.username}`
            },
            note: `Cloud resource ${nextStatus}`
          }
        });
      }
    }
    return updated;
  });
  await writeAudit(ctx, 'update_resource_status', 'cloudResource', id, { status });
  return toApi(resource);
};

export const deleteResource = async (ctx, id) => {
  const current = await ctx.prisma.cloudResource.findUnique({ where: { id } });
  if (!current) throw new AppError('Cloud resource was not found', 'NOT_FOUND');
  await canManageOwnerResource(ctx, current.ownerId);
  const deploymentNodeId = String(current?.metadata?.deploymentNode?.id || current?.metadata?.tpanelAccount?.nodeId || '').trim();
  const tpanelAccount = current?.metadata?.tpanelAccount || null;
  if (current?.type === 'droplet') {
    await ensureHostingTables(ctx.prisma);
    if (tpanelAccount?.id || tpanelAccount?.licenseId || tpanelAccount?.username) {
      await ensureTPanelTables(ctx.prisma);
    }
  }
  const node = current?.type === 'droplet' && tpanelAccount?.username
    ? await findDeploymentNodeForResource(ctx.prisma, current)
    : null;
  let remoteCleanupError = '';
  if (node && tpanelAccount?.username) {
    try {
      await updateTPanelNodeAccountStatus(node, tpanelAccount, 'terminated');
    } catch (err) {
      remoteCleanupError = err?.message || 'Unable to reach tPanel server for remote cleanup.';
    }
  }
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
    if (current?.type === 'droplet' && tpanelAccount?.username) {
      await terminateLocalTPanelReferences(tx, tpanelAccount);
    }
  });
  await writeAudit(ctx, 'delete_resource', 'cloudResource', id, removeUndefined({
    remoteCleanupError,
    tpanelUsername: tpanelAccount?.username || null,
    tpanelNodeId: deploymentNodeId || null
  }));
  return true;
};

export const createTPanelResourceLogin = async (ctx, id) => {
  const current = await ctx.prisma.cloudResource.findUnique({ where: { id } });
  if (!current) throw new AppError('Cloud resource was not found', 'NOT_FOUND');
  await canManageOwnerResource(ctx, current.ownerId);
  const account = current.metadata?.tpanelAccount || {};
  const metadataNode = current.metadata?.deploymentNode || {};
  const username = String(account.username || '').trim();
  const node = await findDeploymentNodeForResource(ctx.prisma, current);
  if (!username) {
    throw new AppError('This resource is not linked with a tPanel login yet', 'BAD_USER_INPUT');
  }
  const fallbackHost = String(metadataNode.ip || current.ip || '').trim();
  const fallbackPort = Number(metadataNode.port || 2086);
  const url = node
    ? createTPanelNodeSsoUrl(node, await ensureTPanelLoginAccountReady(node, current, account), { allowActivate: true })
    : (account.panelUrl || (fallbackHost ? `http://${fallbackHost}:${fallbackPort}/login?username=${encodeURIComponent(username)}` : ''));
  if (!url) {
    throw new AppError('This resource is not linked with an active tPanel server anymore.', 'BAD_USER_INPUT');
  }
  await writeAudit(ctx, 'open_tpanel_resource_login', 'cloudResource', id, { username });
  return toApi({
    url,
    username,
    accountId: account.id || null,
    message: node ? 'Opening passwordless tPanel login.' : 'Open tPanel and sign in with the selected account username.'
  });
};

export const changeTPanelResourcePassword = async (ctx, id, password) => {
  const current = await ctx.prisma.cloudResource.findUnique({ where: { id } });
  if (!current) throw new AppError('Cloud resource was not found', 'NOT_FOUND');
  await canManageOwnerResource(ctx, current.ownerId);
  if (String(password || '').length < 8) {
    throw new AppError('Password must be at least 8 characters', 'BAD_USER_INPUT');
  }
  const account = current.metadata?.tpanelAccount || {};
  if (!account.username) {
    throw new AppError('This resource is not linked with a tPanel account yet', 'BAD_USER_INPUT');
  }
  const node = await findDeploymentNodeForResource(ctx.prisma, current);
  if (node) {
    await changeTPanelNodeAccountPassword(node, account, password);
  } else if (!account.id || !account.licenseId) {
    throw new AppError('This resource is not linked with an active tPanel server anymore.', 'BAD_USER_INPUT');
  }
  const updated = await ctx.prisma.$transaction(async (tx) => {
    if (!node) {
      await queueLegacyTPanelTask(tx, {
        account,
        action: 'change_account_password',
        priority: 12,
        requestedById: current.ownerId,
        payload: {
          account: {
            id: account.id,
            licenseId: account.licenseId,
            username: account.username,
            domain: account.domain,
            homeDirectory: `/home/${account.username}`
          },
          password
        }
      });
    }
    return tx.cloudResource.update({
      where: { id },
      data: {
        metadata: {
          ...(current.metadata || {}),
          tpanelAccount: {
            ...account,
            passwordChangedAt: new Date().toISOString()
          }
        }
      }
    });
  });
  await writeAudit(ctx, 'change_tpanel_resource_password', 'cloudResource', id, { username: account.username });
  return toApi(updated);
};
