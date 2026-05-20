import { requireAdmin, requireAuth } from '../../core/auth.js';
import * as service from './service.js';

export const notificationResolvers = {
  Query: {
    notifications: async (_, args, ctx) => service.listNotifications(ctx, await requireAuth(ctx), args)
  },
  Mutation: {
    createNotification: async (_, { input }, ctx) => {
      await requireAdmin(ctx);
      return service.createNotification(ctx, input);
    },
    markNotificationRead: async (_, { id }, ctx) => {
      await requireAuth(ctx);
      return service.markRead(ctx, id);
    }
  }
};
