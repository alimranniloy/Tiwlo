import { requireAdmin, requireAuth } from '../../core/auth.js';
import * as service from './service.js';

export const powerDnsResolvers = {
  Query: {
    powerDnsConfig: async (_, _args, ctx) => {
      await requireAuth(ctx);
      return service.getPowerDnsConfig(ctx);
    },
    powerDnsHostnames: async (_, args, ctx) => {
      await requireAdmin(ctx);
      return service.listPowerDnsHostnames(ctx, args);
    },
    powerDnsStatus: async (_, _args, ctx) => {
      await requireAdmin(ctx);
      return service.powerDnsStatus(ctx);
    }
  },
  Mutation: {
    updatePowerDnsConfig: async (_, { input }, ctx) => service.updatePowerDnsConfig(ctx, await requireAdmin(ctx), input),
    upsertPowerDnsHostname: async (_, { input }, ctx) => service.upsertPowerDnsHostname(ctx, await requireAdmin(ctx), input),
    deletePowerDnsHostname: async (_, { id }, ctx) => service.deletePowerDnsHostname(ctx, id),
    syncPowerDns: async (_, _args, ctx) => service.syncAllPowerDns(ctx, await requireAdmin(ctx)),
    repairMailDeliveryDns: async (_, { input }, ctx) => service.repairMailDeliveryDns(ctx, await requireAdmin(ctx), input || {})
  }
};
