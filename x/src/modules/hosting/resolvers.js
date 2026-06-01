import { requireAdmin, requireAuth } from '../../core/auth.js';
import * as service from './service.js';

export const hostingResolvers = {
  Query: {
    hostingComputeNodes: async (_, args, ctx) => {
      await requireAdmin(ctx);
      return service.listComputeNodes(ctx, args);
    },
    cloudDeploymentNodes: async (_, args, ctx) => {
      await requireAuth(ctx);
      return service.listCloudDeploymentNodes(ctx, args);
    },
    hostingProductGroups: async (_, args, ctx) => {
      await requireAdmin(ctx);
      return service.listProductGroups(ctx, args);
    },
    hostingProducts: async (_, args, ctx) => {
      await requireAdmin(ctx);
      return service.listHostingProducts(ctx, args);
    },
    hostingPackages: async (_, args, ctx) => {
      await requireAdmin(ctx);
      return service.listHostingPackages(ctx, args);
    },
    hostingProvisioningOrders: async (_, args, ctx) => {
      await requireAuth(ctx);
      return service.listProvisioningOrders(ctx, args);
    }
  },
  Mutation: {
    upsertHostingComputeNode: async (_, { input }, ctx) => {
      await requireAdmin(ctx);
      return service.upsertComputeNode(ctx, input);
    },
    deleteHostingComputeNode: async (_, { id }, ctx) => {
      await requireAdmin(ctx);
      return service.deleteComputeNode(ctx, id);
    },
    testHostingComputeNode: async (_, { id }, ctx) => {
      await requireAdmin(ctx);
      return service.testComputeNode(ctx, id);
    },
    upsertHostingProductGroup: async (_, { input }, ctx) => {
      await requireAdmin(ctx);
      return service.upsertProductGroup(ctx, input);
    },
    upsertHostingProduct: async (_, { input }, ctx) => {
      await requireAdmin(ctx);
      return service.upsertHostingProduct(ctx, input);
    },
    upsertHostingPackage: async (_, { input }, ctx) => {
      await requireAdmin(ctx);
      return service.upsertHostingPackage(ctx, input);
    },
    createHostingProvisioningOrder: async (_, { input }, ctx) => {
      await requireAuth(ctx);
      return service.createProvisioningOrder(ctx, input);
    }
  }
};
