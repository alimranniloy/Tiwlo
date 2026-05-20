import { requireAdmin } from '../../core/auth.js';
import * as service from './service.js';

export const aiModelResolvers = {
  Query: {
    aiModelOverview: async (_, __, ctx) => {
      await requireAdmin(ctx);
      return service.aiModelOverview(ctx);
    }
  },
  Mutation: {
    updateAiModelSettings: async (_, { input }, ctx) => service.updateAiModelSettings(ctx, await requireAdmin(ctx), input),
    startAiModel: async (_, __, ctx) => service.startAiModel(ctx, await requireAdmin(ctx)),
    stopAiModel: async (_, __, ctx) => service.stopAiModel(ctx, await requireAdmin(ctx)),
    downloadAiModel: async (_, __, ctx) => service.downloadAiModel(ctx, await requireAdmin(ctx)),
    chatWithAiModel: async (_, { input }, ctx) => service.chatWithAiModel(ctx, await requireAdmin(ctx), input)
  }
};
