import { randomUUID } from 'node:crypto';
import { getActor, isAdmin } from '../../core/auth.js';
import { AppError } from '../../core/errors.js';
import { slugify, toApi } from '../../core/format.js';
import { writeAudit } from '../../core/audit.js';
import { ensureOwnerHasCredit } from '../billing/creditAutomation.js';

const json = (value, fallback) => JSON.stringify(value ?? fallback);
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const integer = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.floor(Number(value)) : fallback;
const text = (value, fallback = '') => String(value ?? fallback).trim();
const remoteWhmPanels = new Set(['whm', 'hosting-panel', 'cpanel']);
const tpanelPanels = new Set(['tpanel', 'hosting-panel']);

const normalizeRows = (rows) => toApi(rows || []);
const first = (rows) => normalizeRows(rows)[0] || null;

const hasWhmCredentials = (node) => Boolean(node?.apiToken || node?.accessHash);

const buildWhmAuthHeader = (node) => {
  const username = text(node?.username || 'root');
  if (node?.apiToken) return `whm ${username}:${String(node.apiToken).trim()}`;
  if (node?.accessHash) return `WHM ${username}:${String(node.accessHash).replace(/\s+/g, '')}`;
  return '';
};

const whmUrl = (node, command, params = {}) => {
  const protocol = node?.metadata?.protocol || 'https';
  const host = node?.hostname || node?.ip;
  const url = new URL(`${protocol}://${host}:${node?.port || 2087}/json-api/${command}`);
  url.searchParams.set('api.version', '1');
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url;
};

const whmFailureReason = (payload) => {
  const metadata = payload?.metadata || payload?.cpanelresult?.event || payload?.result?.[0]?.metadata;
  if (!metadata || metadata.result === undefined || metadata.result === 1 || metadata.result === '1' || metadata.result === true) {
    return '';
  }
  return metadata.reason || metadata.message || 'WHM API request failed';
};

const callWhmApi = async (node, command, params = {}) => {
  const authorization = buildWhmAuthHeader(node);
  if (!authorization) {
    throw new AppError('WHM API token or access hash is required for remote provisioning', 'BAD_USER_INPUT');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(whmUrl(node, command, params), {
      headers: { Authorization: authorization, Accept: 'application/json' },
      signal: controller.signal
    });
    const raw = await response.text();
    let payload = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      payload = { raw };
    }

    const failure = whmFailureReason(payload);
    if (!response.ok || failure) {
      throw new AppError(failure || `WHM API returned HTTP ${response.status}`, 'UPSTREAM_ERROR', { status: response.status, payload });
    }
    return payload;
  } catch (err) {
    if (err instanceof AppError) throw err;
    const message = err?.name === 'AbortError' ? 'WHM API request timed out' : `Unable to reach WHM API: ${err.message || err}`;
    throw new AppError(message, 'UPSTREAM_ERROR');
  } finally {
    clearTimeout(timer);
  }
};

const whmCanProvision = (node, module) => remoteWhmPanels.has(text(module).toLowerCase()) && hasWhmCredentials(node);

export const ensureHostingTables = async (prisma) => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HostingComputeNode" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "hostname" TEXT NOT NULL,
      "ip" TEXT NOT NULL,
      "panel" TEXT NOT NULL DEFAULT 'whm',
      "port" INTEGER NOT NULL DEFAULT 2087,
      "username" TEXT NOT NULL,
      "passwordSecret" TEXT,
      "apiToken" TEXT,
      "accessHash" TEXT,
      "nameservers" JSONB DEFAULT '[]'::jsonb,
      "maxAccounts" INTEGER NOT NULL DEFAULT 0,
      "activeAccounts" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'active',
      "monthlyCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "location" TEXT,
      "metadata" JSONB DEFAULT '{}'::jsonb,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe('ALTER TABLE "HostingComputeNode" ADD COLUMN IF NOT EXISTS "passwordSecret" TEXT');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "HostingComputeNode_panel_status_idx" ON "HostingComputeNode" ("panel", "status")');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HostingProductGroup" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL UNIQUE,
      "description" TEXT,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'active',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HostingProduct" (
      "id" TEXT PRIMARY KEY,
      "groupId" TEXT,
      "nodeId" TEXT,
      "code" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "module" TEXT NOT NULL DEFAULT 'whm',
      "accountType" TEXT NOT NULL DEFAULT 'shared',
      "status" TEXT NOT NULL DEFAULT 'active',
      "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "setupFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "interval" TEXT NOT NULL DEFAULT 'month',
      "limits" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "serverConfig" JSONB DEFAULT '{}'::jsonb,
      "welcomeEmail" JSONB DEFAULT '{}'::jsonb,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "HostingProduct_group_module_status_idx" ON "HostingProduct" ("groupId", "module", "status")');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HostingPackage" (
      "id" TEXT PRIMARY KEY,
      "productId" TEXT,
      "nodeId" TEXT,
      "name" TEXT NOT NULL,
      "whmPackageName" TEXT NOT NULL,
      "accountType" TEXT NOT NULL DEFAULT 'shared',
      "status" TEXT NOT NULL DEFAULT 'active',
      "limits" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "pricing" JSONB DEFAULT '{}'::jsonb,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "HostingPackage_product_status_idx" ON "HostingPackage" ("productId", "status")');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HostingProvisioningOrder" (
      "id" TEXT PRIMARY KEY,
      "ownerId" TEXT,
      "productId" TEXT,
      "packageId" TEXT,
      "nodeId" TEXT,
      "domain" TEXT NOT NULL,
      "hostname" TEXT,
      "username" TEXT NOT NULL,
      "passwordSecret" TEXT,
      "module" TEXT NOT NULL DEFAULT 'whm',
      "accountType" TEXT NOT NULL DEFAULT 'shared',
      "status" TEXT NOT NULL DEFAULT 'queued',
      "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "currency" TEXT NOT NULL DEFAULT 'USD',
      "provisioning" JSONB DEFAULT '{}'::jsonb,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "HostingProvisioningOrder_owner_status_idx" ON "HostingProvisioningOrder" ("ownerId", "status")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "HostingProvisioningOrder_node_status_idx" ON "HostingProvisioningOrder" ("nodeId", "status")');
};

const filterSearch = (items, search, fields) => {
  const needle = text(search).toLowerCase();
  if (!needle) return items;
  return items.filter((item) => fields.some((field) => String(item[field] || '').toLowerCase().includes(needle)));
};

export const listComputeNodes = async (ctx, { status, panel, search } = {}) => {
  await ensureHostingTables(ctx.prisma);
  const rows = await ctx.prisma.$queryRawUnsafe('SELECT * FROM "HostingComputeNode" ORDER BY "createdAt" DESC');
  return filterSearch(normalizeRows(rows), search, ['name', 'hostname', 'ip', 'panel'])
    .filter((node) => !status || node.status === status)
    .filter((node) => !panel || node.panel === panel);
};

export const upsertComputeNode = async (ctx, input) => {
  await ensureHostingTables(ctx.prisma);
  const id = input.id || randomUUID();
  const payload = {
    name: text(input.name),
    hostname: text(input.hostname || input.ip),
    ip: text(input.ip || input.hostname),
    panel: text(input.panel || 'whm').toLowerCase(),
    port: integer(input.port || 2087, 2087),
    username: text(input.username || 'root'),
    passwordSecret: input.password || input.rootPassword ? String(input.password || input.rootPassword) : null,
    apiToken: input.apiToken ? String(input.apiToken) : null,
    accessHash: input.accessHash ? String(input.accessHash) : null,
    nameservers: input.nameservers || [],
    maxAccounts: integer(input.maxAccounts, 0),
    activeAccounts: integer(input.activeAccounts, 0),
    status: text(input.status || 'active'),
    monthlyCost: number(input.monthlyCost, 0),
    location: input.location ? String(input.location) : null,
    metadata: {
      ...(input.metadata || {}),
      sshPort: integer(input.sshPort || input.metadata?.sshPort || 22, 22),
      licenseKey: text(input.licenseKey || input.metadata?.licenseKey || ''),
      agentToken: text(input.agentToken || input.metadata?.agentToken || '')
    }
  };

  if (!payload.name || !payload.hostname || !payload.ip) {
    throw new AppError('Server name, hostname, and IP are required', 'BAD_USER_INPUT');
  }

  const exists = input.id
    ? await ctx.prisma.$queryRawUnsafe('SELECT "id" FROM "HostingComputeNode" WHERE "id" = $1', id)
    : [];
  const rows = exists.length
    ? await ctx.prisma.$queryRawUnsafe(`
        UPDATE "HostingComputeNode"
        SET "name" = $2, "hostname" = $3, "ip" = $4, "panel" = $5, "port" = $6,
            "username" = $7, "passwordSecret" = COALESCE($8, "passwordSecret"), "apiToken" = $9, "accessHash" = $10,
            "nameservers" = CAST($11 AS jsonb), "maxAccounts" = $12, "activeAccounts" = $13,
            "status" = $14, "monthlyCost" = $15, "location" = $16,
            "metadata" = CAST($17 AS jsonb), "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
        RETURNING *
      `, id, payload.name, payload.hostname, payload.ip, payload.panel, payload.port, payload.username,
      payload.passwordSecret, payload.apiToken, payload.accessHash, json(payload.nameservers, []), payload.maxAccounts, payload.activeAccounts,
      payload.status, payload.monthlyCost, payload.location, json(payload.metadata, {}))
    : await ctx.prisma.$queryRawUnsafe(`
        INSERT INTO "HostingComputeNode"
          ("id", "name", "hostname", "ip", "panel", "port", "username", "passwordSecret", "apiToken", "accessHash",
           "nameservers", "maxAccounts", "activeAccounts", "status", "monthlyCost", "location", "metadata")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CAST($11 AS jsonb), $12, $13, $14, $15, $16, CAST($17 AS jsonb))
        RETURNING *
      `, id, payload.name, payload.hostname, payload.ip, payload.panel, payload.port, payload.username,
      payload.passwordSecret, payload.apiToken, payload.accessHash, json(payload.nameservers, []), payload.maxAccounts, payload.activeAccounts,
      payload.status, payload.monthlyCost, payload.location, json(payload.metadata, {}));

  await writeAudit(ctx, input.id ? 'update_hosting_compute_node' : 'create_hosting_compute_node', 'hostingComputeNode', id, { panel: payload.panel, hostname: payload.hostname });
  return first(rows);
};

export const deleteComputeNode = async (ctx, id) => {
  await ensureHostingTables(ctx.prisma);
  await ctx.prisma.$executeRawUnsafe('UPDATE "HostingComputeNode" SET "status" = $2, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1', id, 'deleted');
  await writeAudit(ctx, 'delete_hosting_compute_node', 'hostingComputeNode', id);
  return true;
};

export const testComputeNode = async (ctx, id) => {
  await ensureHostingTables(ctx.prisma);
  const node = first(await ctx.prisma.$queryRawUnsafe('SELECT * FROM "HostingComputeNode" WHERE "id" = $1', id));
  if (!node) throw new AppError('Compute node was not found', 'NOT_FOUND');
  const health = {
    ok: true,
    checkedAt: new Date().toISOString(),
    endpoint: `${node.hostname}:${node.port}`,
    panel: node.panel,
    mode: hasWhmCredentials(node) ? 'remote' : 'profile',
    message: `${node.panel.toUpperCase()} API profile is ready for provisioning`
  };

  try {
    if (remoteWhmPanels.has(text(node.panel).toLowerCase()) && hasWhmCredentials(node)) {
      const version = await callWhmApi(node, 'version');
      health.message = 'WHM API connection successful';
      health.remote = { metadata: version.metadata || null, version: version.version || version.data?.version || null };
    }
    const rows = await ctx.prisma.$queryRawUnsafe(
      'UPDATE "HostingComputeNode" SET "status" = $2, "metadata" = CAST($3 AS jsonb), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1 RETURNING *',
      id,
      'active',
      json({ ...(node.metadata || {}), health }, {})
    );
    await writeAudit(ctx, 'test_hosting_compute_node', 'hostingComputeNode', id, health);
    return first(rows);
  } catch (err) {
    const failedHealth = { ...health, ok: false, message: err.message || 'WHM API connection failed' };
    await ctx.prisma.$executeRawUnsafe(
      'UPDATE "HostingComputeNode" SET "status" = $2, "metadata" = CAST($3 AS jsonb), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1',
      id,
      'error',
      json({ ...(node.metadata || {}), health: failedHealth }, {})
    );
    await writeAudit(ctx, 'test_hosting_compute_node_failed', 'hostingComputeNode', id, failedHealth);
    throw err;
  }
};

export const listProductGroups = async (ctx, { status, search } = {}) => {
  await ensureHostingTables(ctx.prisma);
  const rows = await ctx.prisma.$queryRawUnsafe('SELECT * FROM "HostingProductGroup" ORDER BY "sortOrder" ASC, "name" ASC');
  return filterSearch(normalizeRows(rows), search, ['name', 'slug', 'description'])
    .filter((group) => !status || group.status === status);
};

export const upsertProductGroup = async (ctx, input) => {
  await ensureHostingTables(ctx.prisma);
  const id = input.id || randomUUID();
  const name = text(input.name);
  const slug = slugify(input.slug || name);
  if (!name || !slug) throw new AppError('Product group name is required', 'BAD_USER_INPUT');
  const exists = input.id ? await ctx.prisma.$queryRawUnsafe('SELECT "id" FROM "HostingProductGroup" WHERE "id" = $1', id) : [];
  const rows = exists.length
    ? await ctx.prisma.$queryRawUnsafe(`
        UPDATE "HostingProductGroup"
        SET "name" = $2, "slug" = $3, "description" = $4, "sortOrder" = $5, "status" = $6, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
        RETURNING *
      `, id, name, slug, input.description || null, integer(input.sortOrder, 0), text(input.status || 'active'))
    : await ctx.prisma.$queryRawUnsafe(`
        INSERT INTO "HostingProductGroup" ("id", "name", "slug", "description", "sortOrder", "status")
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, id, name, slug, input.description || null, integer(input.sortOrder, 0), text(input.status || 'active'));
  await writeAudit(ctx, input.id ? 'update_hosting_product_group' : 'create_hosting_product_group', 'hostingProductGroup', id, { slug });
  return first(rows);
};

export const listHostingProducts = async (ctx, { groupId, status, module, search } = {}) => {
  await ensureHostingTables(ctx.prisma);
  const rows = await ctx.prisma.$queryRawUnsafe(`
    SELECT p.*, g."name" AS "groupName", n."name" AS "nodeName", n."ip" AS "nodeIp"
    FROM "HostingProduct" p
    LEFT JOIN "HostingProductGroup" g ON g."id" = p."groupId"
    LEFT JOIN "HostingComputeNode" n ON n."id" = p."nodeId"
    ORDER BY p."createdAt" DESC
  `);
  return filterSearch(normalizeRows(rows), search, ['name', 'code', 'module', 'accountType', 'groupName'])
    .filter((product) => !groupId || product.groupId === groupId)
    .filter((product) => !status || product.status === status)
    .filter((product) => !module || product.module === module);
};

export const upsertHostingProduct = async (ctx, input) => {
  await ensureHostingTables(ctx.prisma);
  const id = input.id || randomUUID();
  const name = text(input.name);
  const code = text(input.code || slugify(name));
  if (!name || !code) throw new AppError('Product name and code are required', 'BAD_USER_INPUT');
  const exists = input.id ? await ctx.prisma.$queryRawUnsafe('SELECT "id" FROM "HostingProduct" WHERE "id" = $1', id) : [];
  const values = [
    id,
    input.groupId || null,
    input.nodeId || null,
    code,
    name,
    text(input.module || 'whm').toLowerCase(),
    text(input.accountType || 'shared').toLowerCase(),
    text(input.status || 'active'),
    number(input.price, 0),
    number(input.setupFee, 0),
    text(input.interval || 'month'),
    json(input.limits, {}),
    json(input.serverConfig, {}),
    json(input.welcomeEmail, {})
  ];
  const rows = exists.length
    ? await ctx.prisma.$queryRawUnsafe(`
        UPDATE "HostingProduct"
        SET "groupId" = $2, "nodeId" = $3, "code" = $4, "name" = $5, "module" = $6,
            "accountType" = $7, "status" = $8, "price" = $9, "setupFee" = $10,
            "interval" = $11, "limits" = CAST($12 AS jsonb), "serverConfig" = CAST($13 AS jsonb),
            "welcomeEmail" = CAST($14 AS jsonb), "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
        RETURNING *
      `, ...values)
    : await ctx.prisma.$queryRawUnsafe(`
        INSERT INTO "HostingProduct"
          ("id", "groupId", "nodeId", "code", "name", "module", "accountType", "status", "price", "setupFee", "interval", "limits", "serverConfig", "welcomeEmail")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CAST($12 AS jsonb), CAST($13 AS jsonb), CAST($14 AS jsonb))
        RETURNING *
      `, ...values);
  await writeAudit(ctx, input.id ? 'update_hosting_product' : 'create_hosting_product', 'hostingProduct', id, { code, module: values[5] });
  return first(rows);
};

export const listHostingPackages = async (ctx, { productId, status, search } = {}) => {
  await ensureHostingTables(ctx.prisma);
  const rows = await ctx.prisma.$queryRawUnsafe(`
    SELECT pkg.*, p."name" AS "productName", n."name" AS "nodeName"
    FROM "HostingPackage" pkg
    LEFT JOIN "HostingProduct" p ON p."id" = pkg."productId"
    LEFT JOIN "HostingComputeNode" n ON n."id" = pkg."nodeId"
    ORDER BY pkg."createdAt" DESC
  `);
  return filterSearch(normalizeRows(rows), search, ['name', 'whmPackageName', 'accountType', 'productName'])
    .filter((pkg) => !productId || pkg.productId === productId)
    .filter((pkg) => !status || pkg.status === status);
};

export const upsertHostingPackage = async (ctx, input) => {
  await ensureHostingTables(ctx.prisma);
  const id = input.id || randomUUID();
  const name = text(input.name);
  const whmPackageName = text(input.whmPackageName || name);
  if (!name || !whmPackageName) throw new AppError('Package name is required', 'BAD_USER_INPUT');
  const exists = input.id ? await ctx.prisma.$queryRawUnsafe('SELECT "id" FROM "HostingPackage" WHERE "id" = $1', id) : [];
  const values = [
    id,
    input.productId || null,
    input.nodeId || null,
    name,
    whmPackageName,
    text(input.accountType || 'shared').toLowerCase(),
    text(input.status || 'active'),
    json(input.limits, {}),
    json(input.pricing, {})
  ];
  const rows = exists.length
    ? await ctx.prisma.$queryRawUnsafe(`
        UPDATE "HostingPackage"
        SET "productId" = $2, "nodeId" = $3, "name" = $4, "whmPackageName" = $5,
            "accountType" = $6, "status" = $7, "limits" = CAST($8 AS jsonb), "pricing" = CAST($9 AS jsonb),
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
        RETURNING *
      `, ...values)
    : await ctx.prisma.$queryRawUnsafe(`
        INSERT INTO "HostingPackage" ("id", "productId", "nodeId", "name", "whmPackageName", "accountType", "status", "limits", "pricing")
        VALUES ($1, $2, $3, $4, $5, $6, $7, CAST($8 AS jsonb), CAST($9 AS jsonb))
        RETURNING *
      `, ...values);
  await writeAudit(ctx, input.id ? 'update_hosting_package' : 'create_hosting_package', 'hostingPackage', id, { whmPackageName });
  return first(rows);
};

export const listProvisioningOrders = async (ctx, { ownerId, status, search } = {}) => {
  await ensureHostingTables(ctx.prisma);
  const actor = await getActor(ctx);
  const scopedOwnerId = isAdmin(actor) ? ownerId : actor?.id;
  const rows = await ctx.prisma.$queryRawUnsafe(`
    SELECT o.*, p."name" AS "productName", pkg."name" AS "packageName", n."name" AS "nodeName", n."ip" AS "nodeIp"
    FROM "HostingProvisioningOrder" o
    LEFT JOIN "HostingProduct" p ON p."id" = o."productId"
    LEFT JOIN "HostingPackage" pkg ON pkg."id" = o."packageId"
    LEFT JOIN "HostingComputeNode" n ON n."id" = o."nodeId"
    ORDER BY o."createdAt" DESC
  `);
  return filterSearch(normalizeRows(rows), search, ['domain', 'hostname', 'username', 'module', 'productName', 'packageName', 'nodeName'])
    .filter((order) => !scopedOwnerId || order.ownerId === scopedOwnerId)
    .filter((order) => !status || order.status === status);
};

const findRecord = async (prisma, table, id) => {
  if (!id) return null;
  return first(await prisma.$queryRawUnsafe(`SELECT * FROM "${table}" WHERE "id" = $1`, id));
};

const nodeHasCapacity = (node) => node && node.status === 'active' && (!node.maxAccounts || node.activeAccounts < node.maxAccounts);

const panelCandidatesFor = (module) => {
  const value = text(module).toLowerCase();
  if (value === 'tpanel') return ['tpanel', 'hosting-panel'];
  if (value === 'cpanel' || value === 'whm') return ['cpanel', 'whm', 'hosting-panel'];
  if (value) return [value];
  return [];
};

const findAvailableNode = async (prisma, { preferredNodeId, module }) => {
  const preferred = await findRecord(prisma, 'HostingComputeNode', preferredNodeId);
  if (nodeHasCapacity(preferred)) return preferred;

  const panels = panelCandidatesFor(module);
  const rows = await prisma.$queryRawUnsafe(`
    SELECT *
    FROM "HostingComputeNode"
    WHERE "status" = 'active'
      AND ("maxAccounts" = 0 OR "activeAccounts" < "maxAccounts")
    ORDER BY "activeAccounts" ASC, "createdAt" ASC
  `);
  const nodes = normalizeRows(rows);
  return nodes.find((node) => panels.length === 0 || panels.includes(text(node.panel).toLowerCase())) || nodes[0] || null;
};

const updateProvisioningOrder = async (ctx, id, status, provisioning) => (
  first(await ctx.prisma.$queryRawUnsafe(`
    UPDATE "HostingProvisioningOrder"
    SET "status" = $2, "provisioning" = CAST($3 AS jsonb), "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = $1
    RETURNING *
  `, id, status, json(provisioning, {})))
);

export const createProvisioningOrder = async (ctx, input) => {
  await ensureHostingTables(ctx.prisma);
  const actor = await getActor(ctx);
  const ownerId = input.ownerId || (isAdmin(actor) ? null : actor?.id || null);
  if (input.ownerId && !isAdmin(actor) && input.ownerId !== actor?.id) {
    throw new AppError('You cannot provision hosting for this owner', 'FORBIDDEN');
  }
  if (ownerId) {
    await ensureOwnerHasCredit(ctx, ownerId, 'Credit balance is empty. Add credit now before provisioning hosting accounts.');
  }

  const product = await findRecord(ctx.prisma, 'HostingProduct', input.productId);
  const pkg = await findRecord(ctx.prisma, 'HostingPackage', input.packageId);
  const id = randomUUID();
  const module = text(input.module || product?.module || 'tpanel').toLowerCase();
  const preferredNodeId = input.nodeId || pkg?.nodeId || product?.nodeId;
  const node = await findAvailableNode(ctx.prisma, { preferredNodeId, module });
  if (!node) throw new AppError('No active tPanel/hosting node has free account capacity', 'RESOURCE_EXHAUSTED');
  const accountType = text(input.accountType || pkg?.accountType || product?.accountType || 'shared').toLowerCase();
  const amount = number(input.amount ?? product?.price ?? pkg?.pricing?.monthly ?? 0, 0);
  const domain = text(input.domain);
  const username = text(input.username);
  const password = text(input.password);
  const whmPackageName = text(input.whmPackageName || pkg?.whmPackageName || product?.serverConfig?.whmPackageName || product?.code || 'default');
  const shouldAttemptRemote = whmCanProvision(node, module);

  if (!domain || !username) {
    throw new AppError('Domain and username are required for hosting provisioning', 'BAD_USER_INPUT');
  }
  if (shouldAttemptRemote && !password) {
    throw new AppError('Password is required for WHM account creation', 'BAD_USER_INPUT');
  }

  const provisioning = {
    action: module === 'whm' || module === 'hosting-panel' || module === 'cpanel' ? 'createacct' : 'provision',
    panel: module,
    accountType,
    automation: shouldAttemptRemote ? 'remote_whm_api' : tpanelPanels.has(text(node.panel).toLowerCase()) || module === 'tpanel' ? 'tpanel_agent_queue' : 'queued',
    targetServer: {
      id: node.id,
      name: node.name,
      hostname: node.hostname,
      ip: node.ip,
      port: node.port
    },
    whmPackageName,
    domain,
    username,
    hostname: text(input.hostname || domain),
    limits: {
      ...(product?.limits || {}),
      ...(pkg?.limits || {}),
      ...(input.limits || {})
    },
    requestedAt: new Date().toISOString(),
    state: shouldAttemptRemote ? 'pending_remote_api' : 'queued_for_tpanel_agent'
  };
  const initialStatus = shouldAttemptRemote ? 'pending' : 'queued';

  const rows = await ctx.prisma.$queryRawUnsafe(`
    INSERT INTO "HostingProvisioningOrder"
      ("id", "ownerId", "productId", "packageId", "nodeId", "domain", "hostname", "username",
       "passwordSecret", "module", "accountType", "status", "amount", "currency", "provisioning")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CAST($15 AS jsonb))
    RETURNING *
  `, id, ownerId, product?.id || null, pkg?.id || null, node.id, domain, provisioning.hostname || null,
    username, password || null, module, accountType, initialStatus, amount, input.currency || 'USD', json(provisioning, {}));

  let order = first(rows);
  if (shouldAttemptRemote) {
    try {
      const remote = await callWhmApi(node, 'createacct', {
        username,
        domain,
        password,
        plan: whmPackageName,
        reseller: accountType === 'reseller' ? 1 : undefined
      });
      provisioning.state = 'remote_provisioned';
      provisioning.completedAt = new Date().toISOString();
      provisioning.remote = {
        metadata: remote.metadata || null,
        data: remote.data || null
      };
      order = await updateProvisioningOrder(ctx, id, 'provisioned', provisioning);
      await ctx.prisma.$executeRawUnsafe(
        'UPDATE "HostingComputeNode" SET "activeAccounts" = "activeAccounts" + 1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1',
        node.id
      );
    } catch (err) {
      provisioning.state = 'remote_failed';
      provisioning.failedAt = new Date().toISOString();
      provisioning.error = err.message || 'WHM account creation failed';
      await updateProvisioningOrder(ctx, id, 'failed', provisioning);
      await writeAudit(ctx, 'create_hosting_provisioning_order_failed', 'hostingProvisioningOrder', id, { nodeId: node.id, module, domain, error: provisioning.error });
      throw err;
    }
  } else {
    await ctx.prisma.$executeRawUnsafe(
      'UPDATE "HostingComputeNode" SET "activeAccounts" = "activeAccounts" + 1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1',
      node.id
    );
  }

  await writeAudit(ctx, 'create_hosting_provisioning_order', 'hostingProvisioningOrder', id, { nodeId: node.id, module, domain, status: order?.status });
  return order;
};
