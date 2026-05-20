import { requireAdmin } from '../../core/auth.js';
import * as service from './service.js';

export const ddosResolvers = {
  Query: {
    ddosProtectionOverview: async (_, __, ctx) => {
      await requireAdmin(ctx);
      return service.overview(ctx);
    },
    ddosProtectedAssets: async (_, args, ctx) => {
      await requireAdmin(ctx);
      return service.listAssets(ctx, args);
    },
    ddosAttackEvents: async (_, args, ctx) => {
      await requireAdmin(ctx);
      return service.listEvents(ctx, args);
    },
    ddosBlockRules: async (_, args, ctx) => {
      await requireAdmin(ctx);
      return service.listBlockRules(ctx, args);
    }
  },
  Mutation: {
    updateDdosProtectionPolicy: async (_, { input }, ctx) => service.updatePolicy(ctx, await requireAdmin(ctx), input),
    syncDdosProtectionAssets: async (_, __, ctx) => service.syncAssets(ctx, await requireAdmin(ctx)),
    ingestDdosTelemetry: async (_, { input }, ctx) => service.ingestTelemetry(ctx, await requireAdmin(ctx), input),
    createDdosBlockRule: async (_, { input }, ctx) => service.createBlockRule(ctx, await requireAdmin(ctx), input),
    releaseDdosBlockRule: async (_, { id }, ctx) => service.releaseBlockRule(ctx, await requireAdmin(ctx), id)
  }
};
