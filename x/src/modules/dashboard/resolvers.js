import { requireAdmin } from '../../core/auth.js';
import * as service from './service.js';

export const dashboardResolvers = {
  Query: {
    health: () => 'ok',
    dashboardSummary: async (_, __, ctx) => {
      await requireAdmin(ctx);
      return service.dashboardSummary(ctx);
    },
    ecommerceAdminSummary: async (_, __, ctx) => {
      await requireAdmin(ctx);
      return service.ecommerceAdminSummary(ctx);
    },
    ispDashboardSummary: async (_, __, ctx) => {
      await requireAdmin(ctx);
      return service.ispDashboardSummary(ctx);
    }
  }
};
