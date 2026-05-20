import { requireAdmin } from '../../core/auth.js';
import * as service from './service.js';

export const userResolvers = {
  Query: {
    users: async (_, args, ctx) => {
      await requireAdmin(ctx);
      return service.listUsers(ctx, args);
    }
  },
  Mutation: {
    updateUserRole: async (_, { id, role }, ctx) => service.updateUserRole(ctx, await requireAdmin(ctx), id, role),
    updateUser: async (_, { input }, ctx) => service.updateUser(ctx, await requireAdmin(ctx), input),
    deleteUser: async (_, { id }, ctx) => service.deleteUser(ctx, await requireAdmin(ctx), id)
  }
};
