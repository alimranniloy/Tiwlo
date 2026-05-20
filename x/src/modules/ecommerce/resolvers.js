import { requireAdmin, requireAuth } from '../../core/auth.js';
import * as service from './service.js';

export const ecommerceResolvers = {
  Query: {
    stores: (_, args, ctx) => service.listStores(ctx, args),
    store: (_, args, ctx) => service.getStore(ctx, args),
    storeProducts: (_, { storeId, ...args }, ctx) => service.listProducts(ctx, storeId, args),
    storeOrders: (_, { storeId, ...args }, ctx) => service.listOrders(ctx, storeId, args),
    storeCustomers: (_, { storeId, ...args }, ctx) => service.listCustomers(ctx, storeId, args),
    storeCustomerDashboard: (_, args, ctx) => service.getStoreCustomerDashboard(ctx, args),
    storeCustomerGroups: (_, args, ctx) => service.listStoreCustomerGroups(ctx, args),
    storeSubdomainAvailability: (_, { subdomain }, ctx) => service.checkStoreSubdomainAvailability(ctx, subdomain),
    storeThemes: (_, { storeId }, ctx) => service.listThemes(ctx, storeId),
    storePlugins: (_, { storeId }, ctx) => service.listPlugins(ctx, storeId),
    storefrontThemeCatalog: (_, __, ctx) => service.storefrontThemeCatalog(ctx),
    storeThemeRuntime: (_, args, ctx) => service.getStoreThemeRuntime(ctx, args),
    storeAdminRecords: (_, { storeId, section }, ctx) => service.listAdminRecords(ctx, storeId, section),
    ecommerceControlSections: async (_, __, ctx) => {
      await requireAdmin(ctx);
      return service.listEcommerceControlSections(ctx);
    },
    ecommerceControlSection: async (_, args, ctx) => {
      await requireAdmin(ctx);
      return service.getEcommerceControlSection(ctx, args);
    },
    ecommerceControlSchema: async (_, args, ctx) => {
      await requireAdmin(ctx);
      return service.getEcommerceControlSchema(ctx, args);
    },
    ecommerceControlFunctions: async (_, args, ctx) => {
      await requireAdmin(ctx);
      return service.listEcommerceControlFunctions(ctx, args);
    }
  },
  Mutation: {
    createStore: async (_, { input }, ctx) => service.createStore(ctx, await requireAuth(ctx), input),
    updateStore: (_, { input }, ctx) => service.updateStore(ctx, input),
    deleteStore: (_, { id }, ctx) => service.deleteStore(ctx, id),
    createStoreProduct: (_, { input }, ctx) => service.createProduct(ctx, input),
    updateStoreProduct: (_, { input }, ctx) => service.updateProduct(ctx, input),
    deleteStoreProduct: (_, { id }, ctx) => service.deleteProduct(ctx, id),
    createStoreCustomer: (_, { input }, ctx) => service.createCustomer(ctx, input),
    registerStoreCustomer: (_, { input }, ctx) => service.registerStoreCustomer(ctx, input),
    loginStoreCustomer: (_, { input }, ctx) => service.loginStoreCustomer(ctx, input),
    updateStoreCustomerProfile: (_, { input }, ctx) => service.updateStoreCustomerProfile(ctx, input),
    updateStoreCustomer: (_, { input }, ctx) => service.updateStoreCustomer(ctx, input),
    deleteStoreCustomer: (_, { id }, ctx) => service.deleteStoreCustomer(ctx, id),
    createStoreOrder: (_, { input }, ctx) => service.createOrder(ctx, input),
    updateStoreOrderStatus: (_, { id, status }, ctx) => service.updateOrderStatus(ctx, id, status),
    selectStoreTheme: (_, { storeId, key }, ctx) => service.selectTheme(ctx, storeId, key),
    selectStoreHomepageTemplate: (_, { input }, ctx) => service.selectHomepageTemplate(ctx, input),
    updateStoreThemeSettings: (_, { input }, ctx) => service.updateThemeSettings(ctx, input),
    importStoreThemeDemoData: (_, { storeId, themeKey }, ctx) => service.importStoreThemeDemoData(ctx, storeId, themeKey),
    eraseStoreThemeDemoData: (_, { storeId, themeKey }, ctx) => service.eraseStoreThemeDemoData(ctx, storeId, themeKey),
    installStorePlugin: (_, { storeId, key, name }, ctx) => service.installPlugin(ctx, storeId, key, name),
    toggleStorePlugin: (_, { id, status }, ctx) => service.togglePlugin(ctx, id, status),
    upsertStoreAdminRecord: (_, { input }, ctx) => service.upsertAdminRecord(ctx, input),
    deleteStoreAdminRecord: (_, { storeId, section, id }, ctx) => service.deleteAdminRecord(ctx, storeId, section, id),
    upsertEcommerceControlRecord: async (_, { input }, ctx) => {
      await requireAdmin(ctx);
      return service.upsertEcommerceControlRecord(ctx, input);
    },
    deleteEcommerceControlRecord: async (_, { sectionKey, id }, ctx) => {
      await requireAdmin(ctx);
      return service.deleteEcommerceControlRecord(ctx, sectionKey, id);
    },
    runEcommerceControlAction: async (_, { input }, ctx) => {
      await requireAdmin(ctx);
      return service.runEcommerceControlAction(ctx, input);
    },
    runEcommerceControlFunction: async (_, { input }, ctx) => {
      await requireAdmin(ctx);
      return service.runEcommerceControlFunction(ctx, input);
    }
  }
};
