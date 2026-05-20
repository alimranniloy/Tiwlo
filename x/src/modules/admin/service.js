import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { getActor, isAdmin } from '../../core/auth.js';
import { forbidden } from '../../core/errors.js';
import { removeUndefined, toApi } from '../../core/format.js';
import { writeAudit } from '../../core/audit.js';
import { pagination } from '../../core/validation.js';

export const listAuditLogs = async (ctx, { resource, resourceId, action, page, limit } = {}) => toApi(await ctx.prisma.auditLog.findMany({
  where: removeUndefined({ resource, resourceId, action }),
  orderBy: { createdAt: 'desc' },
  ...pagination({ page, limit: limit || 200 })
}));

export const listAdminModules = async (ctx, { group, status, search, page, limit } = {}) => {
  const where = {
    ...removeUndefined({ group, status }),
    ...(search ? {
      OR: [
        { key: { contains: search, mode: 'insensitive' } },
        { label: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    } : {})
  };
  return toApi(await ctx.prisma.adminModule.findMany({
    where,
    orderBy: [{ group: 'asc' }, { label: 'asc' }],
    ...pagination({ page, limit })
  }));
};

export const upsertAdminModule = async (ctx, input) => {
  const module = await ctx.prisma.adminModule.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      group: input.group,
      label: input.label,
      path: input.path,
      status: input.status || 'active',
      description: input.description,
      config: input.config || {},
      metrics: input.metrics || {}
    },
    update: removeUndefined({
      group: input.group,
      label: input.label,
      path: input.path,
      status: input.status,
      description: input.description,
      config: input.config,
      metrics: input.metrics
    })
  });
  await writeAudit(ctx, 'upsert_admin_module', 'adminModule', module.id, { key: input.key });
  return toApi(module);
};

export const updateAdminModuleStatus = async (ctx, key, status) => {
  const module = await ctx.prisma.adminModule.update({ where: { key }, data: { status } });
  await writeAudit(ctx, 'update_admin_module_status', 'adminModule', module.id, { key, status });
  return toApi(module);
};

export const listApiCredentials = async (ctx, ownerId) => {
  const actor = await getActor(ctx);
  const scopedOwner = isAdmin(actor) ? ownerId : actor?.id;
  return toApi(await ctx.prisma.apiCredential.findMany({
    where: scopedOwner ? { ownerId: scopedOwner } : {},
    orderBy: { createdAt: 'desc' }
  }));
};

export const createApiCredential = async (ctx, input) => {
  const actor = await getActor(ctx);
  const rawKey = `tiwlo_${crypto.randomBytes(24).toString('hex')}`;
  const ownerId = isAdmin(actor) ? (input.ownerId || actor?.id) : actor?.id;
  const credential = await ctx.prisma.apiCredential.create({
    data: {
      ownerId,
      name: input.name,
      keyHash: await bcrypt.hash(rawKey, 10),
      scopes: input.scopes,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null
    }
  });
  await writeAudit(ctx, 'create_api_credential', 'apiCredential', credential.id, { scopes: input.scopes });
  return toApi({ ...credential, rawKey });
};

export const revokeApiCredential = async (ctx, id) => {
  const actor = await getActor(ctx);
  const current = await ctx.prisma.apiCredential.findUnique({ where: { id } });
  if (!isAdmin(actor) && current.ownerId !== actor?.id) {
    forbidden('You cannot revoke this API credential');
  }
  const credential = await ctx.prisma.apiCredential.update({ where: { id }, data: { status: 'revoked' } });
  await writeAudit(ctx, 'revoke_api_credential', 'apiCredential', id);
  return toApi(credential);
};
