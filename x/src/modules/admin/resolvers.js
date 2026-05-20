import { requireAdmin, requireAuth } from '../../core/auth.js';
import * as service from './service.js';

export const adminResolvers = {
  Query: {
    auditLogs: async (_, args, ctx) => {
      await requireAdmin(ctx);
      return service.listAuditLogs(ctx, args);
    },
    adminModules: async (_, args, ctx) => {
      await requireAuth(ctx);
      return service.listAdminModules(ctx, args);
    },
    apiCredentials: async (_, { ownerId }, ctx) => {
      await requireAuth(ctx);
      return service.listApiCredentials(ctx, ownerId);
    }
  },
  Mutation: {
    upsertAdminModule: async (_, { input }, ctx) => {
      await requireAdmin(ctx);
      return service.upsertAdminModule(ctx, input);
    },
    updateAdminModuleStatus: async (_, { key, status }, ctx) => {
      await requireAdmin(ctx);
      return service.updateAdminModuleStatus(ctx, key, status);
    },
    createApiCredential: async (_, { input }, ctx) => {
      await requireAuth(ctx);
      return service.createApiCredential(ctx, input);
    },
    revokeApiCredential: async (_, { id }, ctx) => {
      await requireAuth(ctx);
      return service.revokeApiCredential(ctx, id);
    }
  }
};
