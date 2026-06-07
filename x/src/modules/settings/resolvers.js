import { requireAdmin, requireAuth } from '../../core/auth.js';
import { getPublicSignupCreditPolicy } from '../../core/settings.js';
import * as service from './service.js';

export const settingResolvers = {
  Query: {
    settings: async (_, args, ctx) => {
      await requireAuth(ctx);
      return service.listSettings(ctx, args);
    },
    signupCreditPolicy: (_, __, ctx) => getPublicSignupCreditPolicy(ctx.prisma)
  },
  Mutation: {
    upsertSetting: (_, { input }, ctx) => service.upsertSetting(ctx, input),
    testSystemEmail: async (_, { input }, ctx) => {
      await requireAdmin(ctx);
      return service.testSystemEmail(ctx, input);
    }
  }
};
