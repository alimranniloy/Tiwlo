import { AppError } from '../../core/errors.js';

const CREDIT_EXHAUSTED_REASON = 'credit_exhausted';
const TERMINAL_STATUSES = new Set(['deleted', 'destroyed', 'archived']);

const statusKey = (value) => String(value || '').toLowerCase();
const isTerminal = (status) => TERMINAL_STATUSES.has(statusKey(status));
const hasPositiveCredit = (owner) => Number(owner?.credits || 0) > 0;

const expireSignupPromoCredit = async (prisma, owner, now) => {
  if (owner?.promoCreditStatus !== 'active' || !owner.promoCreditExpiresAt) return owner;
  if (new Date(owner.promoCreditExpiresAt).getTime() > now.getTime()) return owner;

  const promoAmount = Math.max(0, Number(owner.promoCreditAmount || 0));
  const currentCredit = Math.max(0, Number(owner.credits || 0));
  const creditAfterExpiry = Math.max(0, currentCredit - Math.min(currentCredit, promoAmount));

  return prisma.user.update({
    where: { id: owner.id },
    data: {
      credits: creditAfterExpiry,
      promoCreditAmount: 0,
      promoCreditStatus: 'expired',
      promoCreditExpiresAt: null
    }
  });
};

const suspendedState = (previousStatus, now) => ({
  state: 'suspended',
  reason: CREDIT_EXHAUSTED_REASON,
  previousStatus: previousStatus || 'active',
  suspendedAt: now.toISOString(),
  resumeWhenCreditPositive: true
});

const resumedState = (automation, now) => ({
  ...(automation || {}),
  state: 'resumed',
  resumedAt: now.toISOString()
});

const wasCreditSuspended = (container = {}) => (
  container?.creditAutomation?.reason === CREDIT_EXHAUSTED_REASON
    && container?.creditAutomation?.state === 'suspended'
);

const resumableStatus = (previousStatus, fallback) => {
  const value = String(previousStatus || fallback || 'active');
  return isTerminal(value) || ['off', 'offline', 'suspended'].includes(statusKey(value)) ? fallback : value;
};

const sum = (result, fields) => fields.reduce((total, field) => total + Number(result[field] || 0), 0);

const zeroResult = (owner, action) => ({
  ownerId: owner.id,
  credits: Number(owner.credits || 0),
  action,
  resourcesSuspended: 0,
  resourcesResumed: 0,
  storesSuspended: 0,
  storesResumed: 0,
  ispSitesSuspended: 0,
  ispSitesResumed: 0,
  networkNodesSuspended: 0,
  networkNodesResumed: 0
});

const suspendCloudResources = async (prisma, ownerId, now) => {
  const resources = await prisma.cloudResource.findMany({ where: { ownerId } });
  const targets = resources.filter((resource) => (
    !isTerminal(resource.status)
      && statusKey(resource.status) !== 'off'
      && !wasCreditSuspended(resource.metadata || {})
  ));

  await Promise.all(targets.map((resource) => prisma.cloudResource.update({
    where: { id: resource.id },
    data: {
      status: 'off',
      metadata: {
        ...(resource.metadata || {}),
        billing: {
          ...(resource.metadata?.billing || {}),
          pausedAt: now.toISOString(),
          pauseReason: CREDIT_EXHAUSTED_REASON
        },
        creditAutomation: suspendedState(resource.status, now)
      }
    }
  })));

  return targets.length;
};

const resumeCloudResources = async (prisma, ownerId, now) => {
  const resources = await prisma.cloudResource.findMany({ where: { ownerId, status: 'off' } });
  const targets = resources.filter((resource) => wasCreditSuspended(resource.metadata || {}));

  await Promise.all(targets.map((resource) => {
    const automation = resource.metadata?.creditAutomation || {};
    return prisma.cloudResource.update({
      where: { id: resource.id },
      data: {
        status: resumableStatus(automation.previousStatus, 'active'),
        metadata: {
          ...(resource.metadata || {}),
          billing: {
            ...(resource.metadata?.billing || {}),
            lastBilledAt: now.toISOString(),
            resumedAt: now.toISOString(),
            pauseReason: null
          },
          creditAutomation: resumedState(automation, now)
        }
      }
    });
  }));

  return targets.length;
};

const suspendStores = async (prisma, ownerId, now) => {
  const stores = await prisma.store.findMany({ where: { ownerId } });
  const targets = stores.filter((store) => (
    !isTerminal(store.status)
      && statusKey(store.status) !== 'suspended'
      && !wasCreditSuspended(store.settings || {})
  ));

  await Promise.all(targets.map((store) => prisma.store.update({
    where: { id: store.id },
    data: {
      status: 'suspended',
      settings: {
        ...(store.settings || {}),
        creditAutomation: suspendedState(store.status, now)
      }
    }
  })));

  return targets.length;
};

const resumeStores = async (prisma, ownerId, now) => {
  const stores = await prisma.store.findMany({ where: { ownerId, status: 'suspended' } });
  const targets = stores.filter((store) => wasCreditSuspended(store.settings || {}));

  await Promise.all(targets.map((store) => {
    const automation = store.settings?.creditAutomation || {};
    return prisma.store.update({
      where: { id: store.id },
      data: {
        status: resumableStatus(automation.previousStatus, 'active'),
        settings: {
          ...(store.settings || {}),
          creditAutomation: resumedState(automation, now)
        }
      }
    });
  }));

  return targets.length;
};

const updateIspNodes = async (prisma, siteIds, now, suspend) => {
  if (!siteIds.length) return 0;
  let changed = 0;

  const routers = await prisma.ispRouter.findMany({ where: { siteId: { in: siteIds } } });
  const routerTargets = routers.filter((router) => suspend
    ? statusKey(router.status) !== 'offline' && !wasCreditSuspended(router.config || {})
    : statusKey(router.status) === 'offline' && wasCreditSuspended(router.config || {}));
  await Promise.all(routerTargets.map((router) => {
    const automation = router.config?.creditAutomation || {};
    changed += 1;
    return prisma.ispRouter.update({
      where: { id: router.id },
      data: {
        status: suspend ? 'offline' : resumableStatus(automation.previousStatus, 'online'),
        config: {
          ...(router.config || {}),
          creditAutomation: suspend ? suspendedState(router.status, now) : resumedState(automation, now)
        }
      }
    });
  }));

  const radiusServers = await prisma.radiusServer.findMany({ where: { siteId: { in: siteIds } } });
  const radiusTargets = radiusServers.filter((server) => suspend
    ? statusKey(server.status) !== 'offline' && !wasCreditSuspended(server.metadata || {})
    : statusKey(server.status) === 'offline' && wasCreditSuspended(server.metadata || {}));
  await Promise.all(radiusTargets.map((server) => {
    const automation = server.metadata?.creditAutomation || {};
    changed += 1;
    return prisma.radiusServer.update({
      where: { id: server.id },
      data: {
        status: suspend ? 'offline' : resumableStatus(automation.previousStatus, 'online'),
        metadata: {
          ...(server.metadata || {}),
          creditAutomation: suspend ? suspendedState(server.status, now) : resumedState(automation, now)
        }
      }
    });
  }));

  const devices = await prisma.networkDevice.findMany({ where: { siteId: { in: siteIds } } });
  const deviceTargets = devices.filter((device) => suspend
    ? statusKey(device.status) !== 'offline' && !wasCreditSuspended(device.metadata || {})
    : statusKey(device.status) === 'offline' && wasCreditSuspended(device.metadata || {}));
  await Promise.all(deviceTargets.map((device) => {
    const automation = device.metadata?.creditAutomation || {};
    changed += 1;
    return prisma.networkDevice.update({
      where: { id: device.id },
      data: {
        status: suspend ? 'offline' : resumableStatus(automation.previousStatus, 'online'),
        metadata: {
          ...(device.metadata || {}),
          creditAutomation: suspend ? suspendedState(device.status, now) : resumedState(automation, now)
        }
      }
    });
  }));

  return changed;
};

const suspendIspSites = async (prisma, ownerId, now) => {
  const sites = await prisma.ispSite.findMany({ where: { ownerId } });
  const targets = sites.filter((site) => (
    !isTerminal(site.status)
      && statusKey(site.status) !== 'suspended'
      && !wasCreditSuspended(site.settings || {})
  ));

  await Promise.all(targets.map((site) => prisma.ispSite.update({
    where: { id: site.id },
    data: {
      status: 'suspended',
      settings: {
        ...(site.settings || {}),
        creditAutomation: suspendedState(site.status, now)
      }
    }
  })));

  const networkNodesSuspended = await updateIspNodes(prisma, sites.map((site) => site.id), now, true);
  return { ispSitesSuspended: targets.length, networkNodesSuspended };
};

const resumeIspSites = async (prisma, ownerId, now) => {
  const sites = await prisma.ispSite.findMany({ where: { ownerId } });
  const targets = sites.filter((site) => statusKey(site.status) === 'suspended' && wasCreditSuspended(site.settings || {}));

  await Promise.all(targets.map((site) => {
    const automation = site.settings?.creditAutomation || {};
    return prisma.ispSite.update({
      where: { id: site.id },
      data: {
        status: resumableStatus(automation.previousStatus, 'healthy'),
        settings: {
          ...(site.settings || {}),
          creditAutomation: resumedState(automation, now)
        }
      }
    });
  }));

  const networkNodesResumed = await updateIspNodes(prisma, sites.map((site) => site.id), now, false);
  return { ispSitesResumed: targets.length, networkNodesResumed };
};

export const runCreditAutomationForOwner = async (ctx, ownerId, now = new Date()) => {
  let owner = await ctx.prisma.user.findUnique({ where: { id: ownerId } });
  if (!owner) throw new AppError('Account was not found', 'NOT_FOUND');
  owner = await expireSignupPromoCredit(ctx.prisma, owner, now);

  if (!hasPositiveCredit(owner)) {
    const result = zeroResult(owner, 'checked');
    result.resourcesSuspended = await suspendCloudResources(ctx.prisma, owner.id, now);
    result.storesSuspended = await suspendStores(ctx.prisma, owner.id, now);
    Object.assign(result, await suspendIspSites(ctx.prisma, owner.id, now));
    result.action = sum(result, ['resourcesSuspended', 'storesSuspended', 'ispSitesSuspended', 'networkNodesSuspended']) > 0
      ? 'suspended'
      : 'already_suspended';
    return result;
  }

  const result = zeroResult(owner, 'checked');
  result.resourcesResumed = await resumeCloudResources(ctx.prisma, owner.id, now);
  result.storesResumed = await resumeStores(ctx.prisma, owner.id, now);
  Object.assign(result, await resumeIspSites(ctx.prisma, owner.id, now));
  result.action = sum(result, ['resourcesResumed', 'storesResumed', 'ispSitesResumed', 'networkNodesResumed']) > 0
    ? 'resumed'
    : 'running';
  return result;
};

export const runCreditAutomationJob = async (ctx, { ownerId } = {}) => {
  const checkedAt = new Date();
  const owners = ownerId
    ? await ctx.prisma.user.findMany({ where: { id: ownerId } })
    : await ctx.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });

  const results = [];
  for (const owner of owners) {
    results.push(await runCreditAutomationForOwner(ctx, owner.id, checkedAt));
  }

  return {
    checkedAt: checkedAt.toISOString(),
    mode: ownerId ? 'owner' : 'all',
    owners: results.length,
    suspended: results.reduce((total, result) => total + sum(result, ['resourcesSuspended', 'storesSuspended', 'ispSitesSuspended', 'networkNodesSuspended']), 0),
    resumed: results.reduce((total, result) => total + sum(result, ['resourcesResumed', 'storesResumed', 'ispSitesResumed', 'networkNodesResumed']), 0),
    results
  };
};

export const ensureOwnerHasCredit = async (ctx, ownerId, message) => {
  let owner = await ctx.prisma.user.findUnique({ where: { id: ownerId } });
  if (!owner) throw new AppError('Account was not found', 'NOT_FOUND');
  await runCreditAutomationForOwner(ctx, ownerId);
  owner = await ctx.prisma.user.findUnique({ where: { id: ownerId } });

  if (!hasPositiveCredit(owner)) {
    throw new AppError(
      message || 'Credit balance is empty. Add credit now before placing orders or provisioning services.',
      'CREDIT_REQUIRED'
    );
  }

  return owner;
};
