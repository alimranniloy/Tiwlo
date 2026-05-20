import { requireAdmin } from '../../core/auth.js';
import { AppError } from '../../core/errors.js';
import { removeUndefined, toApi } from '../../core/format.js';
import { writeAudit } from '../../core/audit.js';
import { ensureHostingTables } from '../hosting/service.js';

const POLICY_ID = 'ddos_policy_default';
const ACTIVE_ATTACK_STATUSES = ['mitigating', 'blocked'];
const ACTIVE_RULE_STATUSES = ['active'];
const allowedModes = new Set(['monitor', 'challenge', 'mitigate']);
const allowedSensitivity = new Set(['relaxed', 'balanced', 'aggressive']);
const allowedAutomationModes = new Set(['audit', 'remote_agent', 'manual']);

const json = (value, fallback) => JSON.stringify(value ?? fallback);
const text = (value, fallback = '') => String(value ?? fallback).trim();
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const integer = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.floor(Number(value)) : fallback;

const defaultPolicy = {
  id: POLICY_ID,
  enabled: true,
  mode: 'mitigate',
  sensitivity: 'balanced',
  requestsPerSecondThreshold: 1200,
  packetsPerSecondThreshold: 20000,
  burstWindowSeconds: 60,
  blockDurationSeconds: 900,
  challengeThreshold: 600,
  syncToConnectedServers: true,
  protectHostingNodes: true,
  protectCloudResources: true,
  protectDomains: true,
  protectEcommerceDomains: true,
  automationMode: 'audit',
  metadata: {
    edgeSampling: true,
    managedRuleSets: ['layer7-rate-limit', 'syn-flood-shield', 'bad-bot-signature', 'geo-anomaly']
  }
};

const isActiveRule = (rule) => (
  ACTIVE_RULE_STATUSES.includes(rule.status)
    && (!rule.expiresAt || new Date(rule.expiresAt).getTime() > Date.now())
);

const normalizeIp = (value) => text(value);

const safeName = (value, fallback) => text(value, fallback) || fallback;

const actionPlanFor = (rule, asset, policy) => {
  const source = rule.sourceIp || rule.cidr;
  const panel = text(asset?.panel || '').toLowerCase();
  const commands = {
    linux: [
      `nft add rule inet filter input ip saddr ${source} drop`,
      `iptables -I INPUT -s ${source} -j DROP`
    ],
    nginx: [
      `deny ${source};`,
      'nginx -s reload'
    ],
    whm: [
      `csf -d ${source} "Tiwlo DDoS auto block: ${rule.reason}"`
    ],
    plesk: [
      `plesk bin ip_ban --create ${source} -comment "Tiwlo DDoS auto block"`
    ]
  };

  return {
    mode: policy.automationMode,
    state: policy.automationMode === 'remote_agent' ? 'queued_for_agent' : 'audit_only',
    target: asset ? {
      assetId: asset.id,
      kind: asset.kind,
      name: asset.name,
      ip: asset.ip,
      domain: asset.domain,
      panel: asset.panel
    } : { scope: rule.scope },
    commands: panel.includes('plesk') ? commands.plesk : panel.includes('whm') || panel.includes('cpanel') ? commands.whm : commands.linux,
    fallbacks: {
      nginx: commands.nginx,
      linux: commands.linux
    },
    expiresAt: rule.expiresAt ? new Date(rule.expiresAt).toISOString() : null,
    generatedAt: new Date().toISOString()
  };
};

export const getPolicy = async (ctx) => {
  const policy = await ctx.prisma.ddosProtectionPolicy.upsert({
    where: { id: POLICY_ID },
    create: defaultPolicy,
    update: {}
  });
  return policy;
};

export const updatePolicy = async (ctx, actor, input) => {
  if (input.mode && !allowedModes.has(input.mode)) {
    throw new AppError('mode must be one of: monitor, challenge, mitigate', 'BAD_USER_INPUT');
  }
  if (input.sensitivity && !allowedSensitivity.has(input.sensitivity)) {
    throw new AppError('sensitivity must be one of: relaxed, balanced, aggressive', 'BAD_USER_INPUT');
  }
  if (input.automationMode && !allowedAutomationModes.has(input.automationMode)) {
    throw new AppError('automationMode must be one of: audit, remote_agent, manual', 'BAD_USER_INPUT');
  }

  const data = removeUndefined({
    enabled: input.enabled,
    mode: input.mode,
    sensitivity: input.sensitivity,
    requestsPerSecondThreshold: input.requestsPerSecondThreshold === undefined ? undefined : Math.max(1, integer(input.requestsPerSecondThreshold, defaultPolicy.requestsPerSecondThreshold)),
    packetsPerSecondThreshold: input.packetsPerSecondThreshold === undefined ? undefined : Math.max(1, integer(input.packetsPerSecondThreshold, defaultPolicy.packetsPerSecondThreshold)),
    burstWindowSeconds: input.burstWindowSeconds === undefined ? undefined : Math.max(5, integer(input.burstWindowSeconds, defaultPolicy.burstWindowSeconds)),
    blockDurationSeconds: input.blockDurationSeconds === undefined ? undefined : Math.max(60, integer(input.blockDurationSeconds, defaultPolicy.blockDurationSeconds)),
    challengeThreshold: input.challengeThreshold === undefined ? undefined : Math.max(1, integer(input.challengeThreshold, defaultPolicy.challengeThreshold)),
    syncToConnectedServers: input.syncToConnectedServers,
    protectHostingNodes: input.protectHostingNodes,
    protectCloudResources: input.protectCloudResources,
    protectDomains: input.protectDomains,
    protectEcommerceDomains: input.protectEcommerceDomains,
    automationMode: input.automationMode,
    metadata: input.metadata
  });

  const policy = await ctx.prisma.ddosProtectionPolicy.upsert({
    where: { id: POLICY_ID },
    create: { ...defaultPolicy, ...data },
    update: data
  });
  await writeAudit(ctx, 'update_ddos_protection_policy', 'ddosProtectionPolicy', POLICY_ID, { actorRole: actor.role, fields: Object.keys(data) });
  return toApi(policy);
};

const discoverAssets = async (ctx, policy) => {
  const assets = [];
  const push = (asset) => {
    if (!asset.name || (!asset.ip && !asset.domain)) return;
    assets.push({
      resourceKey: asset.resourceKey,
      kind: asset.kind,
      resourceId: asset.resourceId || null,
      name: asset.name,
      ip: asset.ip || null,
      domain: asset.domain || null,
      provider: asset.provider || null,
      panel: asset.panel || null,
      metadata: asset.metadata || {}
    });
  };

  if (policy.protectHostingNodes) {
    await ensureHostingTables(ctx.prisma);
    const nodes = await ctx.prisma.$queryRawUnsafe('SELECT "id", "name", "hostname", "ip", "panel", "status", "metadata" FROM "HostingComputeNode" WHERE "status" <> $1', 'deleted');
    nodes.forEach((node) => push({
      resourceKey: `hosting-node:${node.id}`,
      kind: 'hosting_node',
      resourceId: node.id,
      name: safeName(node.name, node.hostname || node.ip),
      ip: node.ip,
      domain: node.hostname,
      provider: 'hosting',
      panel: node.panel,
      metadata: { source: 'HostingComputeNode', status: node.status, serverMetadata: node.metadata || {} }
    }));
  }

  if (policy.protectCloudResources) {
    const resources = await ctx.prisma.cloudResource.findMany({
      where: { ip: { not: null }, status: { not: 'deleted' } },
      orderBy: { createdAt: 'desc' }
    });
    resources.forEach((resource) => push({
      resourceKey: `cloud-resource:${resource.id}`,
      kind: resource.type === 'system_server' ? 'system_server' : 'cloud_resource',
      resourceId: resource.id,
      name: resource.name,
      ip: resource.ip,
      provider: 'tiwlo-cloud',
      panel: resource.metadata?.panel || resource.type,
      metadata: { source: 'CloudResource', region: resource.region, status: resource.status, type: resource.type }
    }));
  }

  if (policy.protectDomains) {
    const domains = await ctx.prisma.domain.findMany({ orderBy: { createdAt: 'desc' } });
    domains.forEach((domain) => push({
      resourceKey: `domain:${domain.id}`,
      kind: 'domain',
      resourceId: domain.id,
      name: domain.name,
      domain: domain.name,
      provider: 'dns',
      metadata: { source: 'Domain', status: domain.status, records: domain.records || [] }
    }));

    const records = await ctx.prisma.dnsRecord.findMany({
      where: { type: { in: ['A', 'AAAA', 'CNAME'] } },
      include: { domain: true },
      orderBy: { createdAt: 'desc' }
    });
    records.forEach((record) => {
      const host = record.name === '@' ? record.domain.name : `${record.name}.${record.domain.name}`;
      push({
        resourceKey: `dns-record:${record.id}`,
        kind: 'dns_record',
        resourceId: record.id,
        name: host,
        ip: ['A', 'AAAA'].includes(record.type) ? record.value : null,
        domain: host,
        provider: 'dns',
        metadata: { source: 'DnsRecord', type: record.type, value: record.value, domainId: record.domainId }
      });
    });
  }

  if (policy.protectEcommerceDomains) {
    const stores = await ctx.prisma.store.findMany({ orderBy: { createdAt: 'desc' } });
    stores.forEach((store) => {
      if (store.domain) {
        push({
          resourceKey: `store-domain:${store.id}:primary`,
          kind: 'ecommerce_domain',
          resourceId: store.id,
          name: `${store.name} storefront`,
          domain: store.domain,
          provider: 'ecommerce',
          metadata: { source: 'Store.domain', storeId: store.id, slug: store.slug, status: store.status }
        });
      }
      if (store.customDomain) {
        push({
          resourceKey: `store-domain:${store.id}:custom`,
          kind: 'ecommerce_custom_domain',
          resourceId: store.id,
          name: `${store.name} custom domain`,
          domain: store.customDomain,
          provider: 'ecommerce',
          metadata: { source: 'Store.customDomain', storeId: store.id, slug: store.slug, status: store.status }
        });
      }
    });
  }

  return assets;
};

export const syncAssets = async (ctx, actor, options = {}) => {
  const policy = await getPolicy(ctx);
  const discovered = policy.syncToConnectedServers ? await discoverAssets(ctx, policy) : [];
  const now = new Date();

  for (const asset of discovered) {
    await ctx.prisma.ddosProtectedAsset.upsert({
      where: { resourceKey: asset.resourceKey },
      create: {
        ...asset,
        status: 'active',
        lastSyncAt: now,
        riskScore: 0
      },
      update: {
        kind: asset.kind,
        resourceId: asset.resourceId,
        name: asset.name,
        ip: asset.ip,
        domain: asset.domain,
        provider: asset.provider,
        panel: asset.panel,
        status: 'active',
        lastSyncAt: now,
        metadata: asset.metadata
      }
    });
  }

  const keys = discovered.map((asset) => asset.resourceKey);
  if (keys.length) {
    await ctx.prisma.ddosProtectedAsset.updateMany({
      where: { resourceKey: { notIn: keys }, status: 'active' },
      data: { status: 'stale' }
    });
  }

  await ctx.prisma.adminModule.upsert({
    where: { key: 'core.ddos-protection' },
    create: {
      key: 'core.ddos-protection',
      group: 'main-admin',
      label: 'DDoS Protection',
      path: '/management/core',
      status: policy.enabled ? 'active' : 'disabled',
      description: 'Real-time attack tracking, automated block rules, and connected-server coverage.',
      config: { source: 'ddosProtectionPolicy', policyId: policy.id },
      metrics: { protectedAssets: discovered.length, syncedAt: now.toISOString() }
    },
    update: {
      status: policy.enabled ? 'active' : 'disabled',
      metrics: { protectedAssets: discovered.length, syncedAt: now.toISOString() }
    }
  });

  if (!options.silent) {
    await writeAudit(ctx, 'sync_ddos_protection_assets', 'ddosProtectionPolicy', POLICY_ID, { actorRole: actor.role, assets: discovered.length });
  }
  return overview(ctx, { skipSync: true });
};

const riskMultiplier = (policy) => (
  policy.sensitivity === 'aggressive' ? 0.75 : policy.sensitivity === 'relaxed' ? 1.35 : 1
);

const classifyTraffic = (policy, input) => {
  const rps = Math.max(0, integer(input.requestsPerSecond, 0));
  const pps = Math.max(0, integer(input.packetsPerSecond, 0));
  const rpsLimit = Math.max(1, Math.floor(policy.requestsPerSecondThreshold * riskMultiplier(policy)));
  const ppsLimit = Math.max(1, Math.floor(policy.packetsPerSecondThreshold * riskMultiplier(policy)));
  const ratio = Math.max(rps / rpsLimit, pps / ppsLimit);
  const confidence = Math.min(0.99, Math.max(0.15, ratio * 0.55));
  const severity = ratio >= 3 ? 'critical' : ratio >= 1.75 ? 'high' : ratio >= 1 ? 'medium' : 'low';
  const shouldBlock = policy.enabled && policy.mode === 'mitigate' && ratio >= 1;
  const shouldChallenge = policy.enabled && ['challenge', 'mitigate'].includes(policy.mode) && rps >= policy.challengeThreshold;
  const status = shouldBlock ? 'blocked' : shouldChallenge ? 'mitigating' : 'observed';
  return { rps, pps, ratio, confidence, severity, shouldBlock, status };
};

export const ingestTelemetry = async (ctx, actor, input) => {
  const policy = await getPolicy(ctx);
  const sourceIp = normalizeIp(input.sourceIp);
  if (!sourceIp) throw new AppError('sourceIp is required', 'BAD_USER_INPUT');

  let asset = null;
  if (input.assetId) {
    asset = await ctx.prisma.ddosProtectedAsset.findUnique({ where: { id: input.assetId } });
  } else if (input.assetKey) {
    asset = await ctx.prisma.ddosProtectedAsset.findUnique({ where: { resourceKey: input.assetKey } });
  }

  const classification = classifyTraffic(policy, input);
  const blockedUntil = classification.shouldBlock
    ? new Date(Date.now() + policy.blockDurationSeconds * 1000)
    : null;
  const metadata = {
    ...(input.metadata || {}),
    path: input.path || null,
    userAgent: input.userAgent || null,
    country: input.country || null,
    threshold: {
      requestsPerSecond: policy.requestsPerSecondThreshold,
      packetsPerSecond: policy.packetsPerSecondThreshold,
      burstWindowSeconds: policy.burstWindowSeconds
    },
    ratio: Number(classification.ratio.toFixed(2))
  };

  const event = await ctx.prisma.ddosAttackEvent.create({
    data: {
      assetId: asset?.id || null,
      assetKey: asset?.resourceKey || input.assetKey || null,
      assetName: asset?.name || null,
      sourceIp,
      vector: text(input.vector, 'http-flood') || 'http-flood',
      severity: classification.severity,
      requestsPerSecond: classification.rps,
      packetsPerSecond: classification.pps,
      confidence: Number(classification.confidence.toFixed(2)),
      status: classification.status,
      blockedUntil,
      metadata
    }
  });

  if (asset) {
    await ctx.prisma.ddosProtectedAsset.update({
      where: { id: asset.id },
      data: { riskScore: Math.min(100, Math.round(classification.ratio * 35)), status: classification.shouldBlock ? 'mitigating' : 'active' }
    });
  }

  if (classification.shouldBlock) {
    const existingRule = await ctx.prisma.ddosBlockRule.findFirst({
      where: {
        sourceIp,
        status: 'active',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!existingRule) {
      await createBlockRule(ctx, actor, {
        sourceIp,
        assetId: asset?.id,
        assetKey: asset?.resourceKey || input.assetKey,
        reason: `${classification.severity} ${text(input.vector, 'http-flood')} detected at ${classification.rps} rps`,
        durationSeconds: policy.blockDurationSeconds,
        scope: asset ? 'asset' : 'global',
        metadata: { eventId: event.id, autoCreated: true }
      }, { skipAudit: true });
    }
  }

  await writeAudit(ctx, 'ingest_ddos_telemetry', 'ddosAttackEvent', event.id, { actorRole: actor.role, status: event.status, sourceIp });
  return toApi(event);
};

export const createBlockRule = async (ctx, actor, input, options = {}) => {
  const policy = await getPolicy(ctx);
  const sourceIp = normalizeIp(input.sourceIp);
  if (!sourceIp && !input.cidr) throw new AppError('sourceIp or cidr is required', 'BAD_USER_INPUT');
  const reason = text(input.reason);
  if (!reason) throw new AppError('reason is required', 'BAD_USER_INPUT');

  let asset = null;
  if (input.assetId) {
    asset = await ctx.prisma.ddosProtectedAsset.findUnique({ where: { id: input.assetId } });
  } else if (input.assetKey) {
    asset = await ctx.prisma.ddosProtectedAsset.findUnique({ where: { resourceKey: input.assetKey } });
  }

  const expiresAt = input.durationSeconds === 0
    ? null
    : new Date(Date.now() + Math.max(60, integer(input.durationSeconds, policy.blockDurationSeconds)) * 1000);
  const base = {
    sourceIp: sourceIp || input.cidr,
    cidr: input.cidr || null,
    scope: input.scope || (asset ? 'asset' : 'global'),
    assetId: asset?.id || input.assetId || null,
    assetKey: asset?.resourceKey || input.assetKey || null,
    reason,
    status: 'active',
    expiresAt,
    enforcementState: policy.automationMode === 'remote_agent' ? 'queued' : 'planned',
    metadata: input.metadata || {}
  };
  const rule = await ctx.prisma.ddosBlockRule.create({
    data: {
      ...base,
      actionPlan: actionPlanFor(base, asset, policy)
    }
  });

  if (!options.skipAudit) {
    await writeAudit(ctx, 'create_ddos_block_rule', 'ddosBlockRule', rule.id, { actorRole: actor.role, sourceIp: rule.sourceIp });
  }
  return toApi(rule);
};

export const releaseBlockRule = async (ctx, actor, id) => {
  const current = await ctx.prisma.ddosBlockRule.findUnique({ where: { id } });
  if (!current) throw new AppError('DDoS block rule was not found', 'NOT_FOUND');
  const rule = await ctx.prisma.ddosBlockRule.update({
    where: { id },
    data: {
      status: 'released',
      expiresAt: new Date(),
      enforcementState: 'release_planned',
      metadata: { ...(current.metadata || {}), releasedBy: actor.id, releasedAt: new Date().toISOString() }
    }
  });
  await writeAudit(ctx, 'release_ddos_block_rule', 'ddosBlockRule', id, { actorRole: actor.role, sourceIp: rule.sourceIp });
  return toApi(rule);
};

export const listAssets = async (ctx, { status, kind, search } = {}) => {
  const where = {
    ...removeUndefined({ status, kind }),
    ...(search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { ip: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } },
        { provider: { contains: search, mode: 'insensitive' } },
        { panel: { contains: search, mode: 'insensitive' } }
      ]
    } : {})
  };
  return toApi(await ctx.prisma.ddosProtectedAsset.findMany({ where, orderBy: [{ riskScore: 'desc' }, { updatedAt: 'desc' }] }));
};

export const listEvents = async (ctx, { status, assetId, sourceIp, limit } = {}) => toApi(await ctx.prisma.ddosAttackEvent.findMany({
  where: removeUndefined({ status, assetId, sourceIp }),
  orderBy: { createdAt: 'desc' },
  take: Math.min(Math.max(integer(limit, 50), 1), 200)
}));

export const listBlockRules = async (ctx, { status, assetId, sourceIp } = {}) => toApi(await ctx.prisma.ddosBlockRule.findMany({
  where: removeUndefined({ status, assetId, sourceIp }),
  orderBy: { createdAt: 'desc' },
  take: 200
}));

const telemetry = (events) => {
  const now = Date.now();
  const buckets = Array.from({ length: 24 }, (_, index) => {
    const start = now - (23 - index) * 5 * 60 * 1000;
    return {
      start,
      bucket: new Date(start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      requests: 0,
      packets: 0,
      attacks: 0,
      blocked: 0
    };
  });

  events.forEach((event) => {
    const time = new Date(event.createdAt).getTime();
    const bucket = buckets.find((item, index) => {
      const next = buckets[index + 1]?.start || now + 1;
      return time >= item.start && time < next;
    });
    if (!bucket) return;
    bucket.requests += event.requestsPerSecond || 0;
    bucket.packets += event.packetsPerSecond || 0;
    bucket.attacks += 1;
    if (event.status === 'blocked') bucket.blocked += 1;
  });

  return buckets.map(({ start, ...bucket }) => bucket);
};

export const overview = async (ctx, options = {}) => {
  const policy = await getPolicy(ctx);
  if (!options.skipSync && policy.syncToConnectedServers) {
    const actor = await requireAdmin(ctx);
    const latest = await ctx.prisma.ddosProtectedAsset.findFirst({ orderBy: { lastSyncAt: 'desc' } });
    const isStale = !latest?.lastSyncAt || (Date.now() - new Date(latest.lastSyncAt).getTime()) > 60 * 1000;
    if (isStale) {
      await syncAssets(ctx, actor, { silent: true });
      return overview(ctx, { skipSync: true });
    }
  }

  const [assets, events, blockRules] = await Promise.all([
    ctx.prisma.ddosProtectedAsset.findMany({ orderBy: [{ riskScore: 'desc' }, { updatedAt: 'desc' }], take: 200 }),
    ctx.prisma.ddosAttackEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    ctx.prisma.ddosBlockRule.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })
  ]);

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const activeBlocks = blockRules.filter(isActiveRule).length;
  const activeAttacks = events.filter((event) => ACTIVE_ATTACK_STATUSES.includes(event.status) && (!event.blockedUntil || new Date(event.blockedUntil).getTime() > Date.now())).length;
  const recentEvents = events.filter((event) => new Date(event.createdAt).getTime() >= dayAgo);
  const metrics = {
    protectedAssets: assets.filter((asset) => asset.status === 'active').length,
    activeBlocks,
    activeAttacks,
    mitigatedToday: recentEvents.filter((event) => event.status === 'blocked').length,
    peakRps: recentEvents.reduce((max, event) => Math.max(max, event.requestsPerSecond || 0), 0),
    averageRiskScore: assets.length ? Number((assets.reduce((sum, asset) => sum + (asset.riskScore || 0), 0) / assets.length).toFixed(1)) : 0
  };

  return toApi({
    policy,
    metrics,
    assets,
    events,
    blockRules,
    telemetry: telemetry(events)
  });
};
