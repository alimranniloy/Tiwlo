import { requireAdmin, requireAuth } from '../../core/auth.js';
import * as service from './service.js';

export const ispResolvers = {
  Query: {
    ispSites: (_, __, ctx) => service.listSites(ctx),
    ispSite: (_, args, ctx) => service.getSite(ctx, args),
    ispPackages: (_, __, ctx) => service.listPackages(ctx),
    ispClients: (_, { siteId, ...args }, ctx) => service.listClients(ctx, siteId, args),
    ispRouters: (_, { siteId }, ctx) => service.listRouters(ctx, siteId),
    radiusServers: (_, { siteId }, ctx) => service.listRadiusServers(ctx, siteId),
    networkDevices: (_, { siteId, type }, ctx) => service.listNetworkDevices(ctx, siteId, { type }),
    ispInvoices: (_, { siteId, ...args }, ctx) => service.listInvoices(ctx, siteId, args),
    ispAdminRecords: (_, { siteId, section }, ctx) => service.listAdminRecords(ctx, siteId, section)
  },
  Mutation: {
    createIspSite: async (_, { input }, ctx) => service.createSite(ctx, await requireAuth(ctx), input),
    updateIspSite: (_, { input }, ctx) => service.updateSite(ctx, input),
    createIspClient: (_, { input }, ctx) => service.createClient(ctx, input),
    updateIspClient: (_, { input }, ctx) => service.updateClient(ctx, input),
    deleteIspClient: (_, { id }, ctx) => service.deleteClient(ctx, id),
    createIspPackage: async (_, { input }, ctx) => {
      await requireAdmin(ctx);
      return service.createPackage(ctx, input);
    },
    createIspRouter: (_, { input }, ctx) => service.createRouter(ctx, input),
    updateIspRouter: (_, { input }, ctx) => service.updateRouter(ctx, input),
    deleteIspRouter: (_, { id }, ctx) => service.deleteRouter(ctx, id),
    syncIspRouter: (_, { id }, ctx) => service.syncRouter(ctx, id),
    createRadiusServer: (_, { input }, ctx) => service.createRadiusServer(ctx, input),
    updateRadiusServer: (_, { input }, ctx) => service.updateRadiusServer(ctx, input),
    deleteRadiusServer: (_, { id }, ctx) => service.deleteRadiusServer(ctx, id),
    upsertNetworkDevice: (_, { input }, ctx) => service.upsertNetworkDevice(ctx, input),
    deleteNetworkDevice: (_, { id }, ctx) => service.deleteNetworkDevice(ctx, id),
    upsertIspAdminRecord: (_, { input }, ctx) => service.upsertAdminRecord(ctx, input),
    deleteIspAdminRecord: (_, { siteId, section, id }, ctx) => service.deleteAdminRecord(ctx, siteId, section, id)
  }
};
