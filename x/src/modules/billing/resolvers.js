import { requireAdmin, requireAuth } from '../../core/auth.js';
import * as service from './service.js';

export const billingResolvers = {
  Query: {
    invoices: async (_, args, ctx) => {
      await requireAuth(ctx);
      return service.listInvoices(ctx, args);
    },
    paymentGateways: async (_, { status }, ctx) => {
      await requireAdmin(ctx);
      return service.listPaymentGateways(ctx, status);
    },
    availablePaymentGateways: async (_, __, ctx) => {
      await requireAuth(ctx);
      return service.listAvailablePaymentGateways(ctx);
    },
    signupPaymentGateways: async (_, __, ctx) => service.listAvailablePaymentGateways(ctx),
    billingOverview: async (_, __, ctx) => {
      await requireAuth(ctx);
      return service.billingOverview(ctx);
    }
  },
  Mutation: {
    upsertPaymentGateway: async (_, { input }, ctx) => {
      await requireAdmin(ctx);
      return service.upsertPaymentGateway(ctx, input);
    },
    testPaymentGateway: async (_, { key }, ctx) => {
      await requireAdmin(ctx);
      return service.testPaymentGateway(ctx, key);
    },
    createInvoice: async (_, { input }, ctx) => {
      if (input.scope === 'isp' || input.ownerId) {
        await requireAdmin(ctx);
      } else {
        await requireAuth(ctx);
      }
      return service.createInvoice(ctx, input);
    },
    markInvoicePaid: async (_, { id }, ctx) => {
      await requireAdmin(ctx);
      return service.markInvoicePaid(ctx, id);
    },
    startInvoicePayment: async (_, { input }, ctx) => {
      await requireAuth(ctx);
      return service.startInvoicePayment(ctx, input);
    },
    startCreditTopUp: async (_, { input }, ctx) => {
      await requireAuth(ctx);
      return service.startCreditTopUp(ctx, input);
    },
    startSignupPromoVerification: async (_, { input }, ctx) => {
      await requireAuth(ctx);
      return service.startSignupPromoVerification(ctx, input);
    },
    skipSignupPromoCredit: async (_, __, ctx) => {
      await requireAuth(ctx);
      return service.skipSignupPromoCredit(ctx);
    },
    createCloudResourceOrder: async (_, { input }, ctx) => {
      await requireAuth(ctx);
      return service.createCloudResourceOrder(ctx, input);
    },
    settleUsageBilling: async (_, __, ctx) => {
      await requireAuth(ctx);
      return service.settleUsageBilling(ctx);
    },
    runCreditAutomation: async (_, { input }, ctx) => {
      await requireAuth(ctx);
      return service.syncCreditAutomation(ctx, input || {});
    }
  }
};
