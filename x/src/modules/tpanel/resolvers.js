import { requireAdmin, requireAuth } from '../../core/auth.js';
import * as service from './service.js';

export const tPanelResolvers = {
  Query: {
    tPanelPackages: async (_, args, ctx) => {
      await requireAuth(ctx);
      return service.listTPanelPackages(ctx, args);
    },
    myTPanelLicenses: async (_, _args, ctx) => {
      await requireAuth(ctx);
      return service.getMyTPanelLicenses(ctx);
    },
    tPanelLicense: async (_, { id }, ctx) => {
      await requireAuth(ctx);
      return service.getTPanelLicense(ctx, id);
    },
    adminTPanelOverview: async (_, _args, ctx) => {
      await requireAdmin(ctx);
      return service.adminTPanelOverview(ctx);
    },
    tPanelControlOverview: async (_, args, ctx) => {
      await requireAuth(ctx);
      return service.tPanelControlOverview(ctx, args);
    }
  },
  Mutation: {
    createTPanelLicenseOrder: async (_, { input }, ctx) => {
      await requireAuth(ctx);
      return service.createTPanelLicenseOrder(ctx, input);
    },
    payTPanelLicenseOrder: async (_, { input }, ctx) => {
      await requireAuth(ctx);
      return service.payTPanelLicenseOrder(ctx, input);
    },
    renewTPanelLicenseOrder: async (_, { input }, ctx) => {
      await requireAuth(ctx);
      return service.renewTPanelLicenseOrder(ctx, input);
    },
    adminUpdateTPanelLicenseStatus: async (_, { input }, ctx) => {
      await requireAdmin(ctx);
      return service.adminUpdateTPanelLicenseStatus(ctx, input);
    },
    adminPublishTPanelUpdate: async (_, { input }, ctx) => {
      await requireAdmin(ctx);
      return service.adminPublishTPanelUpdate(ctx, input);
    },
    upsertTPanelAccountPackage: async (_, { input }, ctx) => {
      await requireAuth(ctx);
      return service.upsertTPanelAccountPackage(ctx, input);
    },
    createTPanelManagedAccount: async (_, { input }, ctx) => {
      await requireAuth(ctx);
      return service.createTPanelManagedAccount(ctx, input);
    },
    updateTPanelManagedAccountStatus: async (_, { input }, ctx) => {
      await requireAuth(ctx);
      return service.updateTPanelManagedAccountStatus(ctx, input);
    },
    upsertTPanelDnsZone: async (_, { input }, ctx) => {
      await requireAuth(ctx);
      return service.upsertTPanelDnsZone(ctx, input);
    },
    upsertTPanelServiceState: async (_, { input }, ctx) => {
      await requireAuth(ctx);
      return service.upsertTPanelServiceState(ctx, input);
    },
    upsertTPanelSecurityRule: async (_, { input }, ctx) => {
      await requireAuth(ctx);
      return service.upsertTPanelSecurityRule(ctx, input);
    },
    queueTPanelRemoteTask: async (_, { input }, ctx) => {
      await requireAuth(ctx);
      return service.queueTPanelRemoteTask(ctx, input);
    },
    tPanelLicenseCheck: async (_, { input }, ctx) => {
      return service.verifyTPanelLicense(ctx, input);
    },
    tPanelNodeHeartbeat: async (_, { input }, ctx) => {
      return service.heartbeatTPanelNode(ctx, input);
    }
  }
};
