import { requireAdmin, requireAuth } from '../../core/auth.js';
import * as service from './service.js';

export const integrationResolvers = {
  Query: {
    integrations: async (_, args, ctx) => {
      await requireAdmin(ctx);
      return service.listIntegrations(ctx, args);
    }
  },
  Mutation: {
    upsertIntegration: async (_, { input }, ctx) => {
      await requireAdmin(ctx);
      return service.upsertIntegration(ctx, input);
    }
  }
};
