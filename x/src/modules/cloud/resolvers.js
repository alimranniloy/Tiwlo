import { requireAdmin, requireAuth } from '../../core/auth.js';
import * as service from './service.js';

export const cloudResolvers = {
  Query: {
    plans: (_, { product }, ctx) => service.listPlans(ctx, product),
    cloudResources: (_, args, ctx) => service.listResources(ctx, args),
    droplets: (_, args, ctx) => service.listResources(ctx, { ...args, type: 'droplet' }),
    systemServers: (_, __, ctx) => service.listResources(ctx, { type: 'system_server' })
  },
  Mutation: {
    createCloudResource: async (_, { input }, ctx) => service.createResource(ctx, await requireAuth(ctx), input),
    updateResourceStatus: (_, { id, status }, ctx) => service.updateResourceStatus(ctx, id, status),
    deleteCloudResource: (_, { id }, ctx) => service.deleteResource(ctx, id),
    createTPanelResourceLogin: async (_, { id }, ctx) => {
      await requireAuth(ctx);
      return service.createTPanelResourceLogin(ctx, id);
    },
    changeTPanelResourcePassword: async (_, { id, password }, ctx) => {
      await requireAuth(ctx);
      return service.changeTPanelResourcePassword(ctx, id, password);
    },
    upsertPlan: async (_, { input }, ctx) => {
      await requireAdmin(ctx);
      return service.upsertPlan(ctx, input);
    },
    deletePlan: async (_, { id }, ctx) => {
      await requireAdmin(ctx);
      return service.deletePlan(ctx, id);
    }
  }
};
