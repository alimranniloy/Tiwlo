import { removeUndefined, toApi } from '../../core/format.js';
import { writeAudit } from '../../core/audit.js';

export const listRoles = async (ctx) => toApi(await ctx.prisma.role.findMany({
  orderBy: [{ isSystem: 'desc' }, { name: 'asc' }]
}));

export const listPermissionGroups = async (ctx) => toApi(await ctx.prisma.permissionGroup.findMany({
  orderBy: { name: 'asc' }
}));

export const upsertRole = async (ctx, input) => {
  const role = await ctx.prisma.role.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      name: input.name,
      description: input.description,
      permissions: input.permissions || [],
      isSystem: input.isSystem || false
    },
    update: removeUndefined({
      name: input.name,
      description: input.description,
      permissions: input.permissions,
      isSystem: input.isSystem
    })
  });
  await writeAudit(ctx, 'upsert_role', 'role', role.id, { key: role.key });
  return toApi(role);
};

export const assignUserRole = async (ctx, input) => {
  const userRole = await ctx.prisma.userRole.upsert({
    where: {
      userId_roleId_scope_scopeId: {
        userId: input.userId,
        roleId: input.roleId,
        scope: input.scope || 'global',
        scopeId: input.scopeId || ''
      }
    },
    create: {
      userId: input.userId,
      roleId: input.roleId,
      scope: input.scope || 'global',
      scopeId: input.scopeId || ''
    },
    update: {
      scope: input.scope || 'global',
      scopeId: input.scopeId || ''
    }
  });
  await writeAudit(ctx, 'assign_user_role', 'userRole', userRole.id, { userId: input.userId, roleId: input.roleId });
  return toApi(userRole);
};

export const revokeUserRole = async (ctx, id) => {
  await ctx.prisma.userRole.delete({ where: { id } });
  await writeAudit(ctx, 'revoke_user_role', 'userRole', id);
  return true;
};
