import { requireAuth } from '../../core/auth.js';
import * as service from './service.js';

export const settingResolvers = {
  Query: {
    settings: async (_, args, ctx) => {
      await requireAuth(ctx);
      return service.listSettings(ctx, args);
    }
  },
  Mutation: {
    upsertSetting: (_, { input }, ctx) => service.upsertSetting(ctx, input)
  }
};
