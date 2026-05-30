import { requireAdmin } from '../../core/auth.js';
import * as service from './service.js';
import { ensureDeviceSessionTable, securitySummaryForUser } from '../auth/deviceSecurity.js';

export const userResolvers = {
  User: {
    deviceSessions: async (parent, _, ctx) => {
      await requireAdmin(ctx);
      await ensureDeviceSessionTable(ctx.prisma);
      return ctx.prisma.userDeviceSession.findMany({
        where: { userId: parent.id },
        orderBy: { lastSeenAt: 'desc' },
        take: 20
      });
    },
    securitySummary: async (parent, _, ctx) => {
      await requireAdmin(ctx);
      return securitySummaryForUser(ctx.prisma, parent.id);
    }
  },
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
