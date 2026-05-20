import { requireAdmin } from '../../core/auth.js';
import * as service from './service.js';

export const rbacResolvers = {
  Query: {
    roles: async (_, __, ctx) => {
      await requireAdmin(ctx);
      return service.listRoles(ctx);
    },
    permissionGroups: async (_, __, ctx) => {
      await requireAdmin(ctx);
      return service.listPermissionGroups(ctx);
    }
  },
  Mutation: {
    upsertRole: async (_, { input }, ctx) => {
      await requireAdmin(ctx);
      return service.upsertRole(ctx, input);
    },
    assignUserRole: async (_, { input }, ctx) => {
      await requireAdmin(ctx);
      return service.assignUserRole(ctx, input);
    },
    revokeUserRole: async (_, { id }, ctx) => {
      await requireAdmin(ctx);
      return service.revokeUserRole(ctx, id);
    }
  }
};
