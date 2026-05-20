import * as service from './service.js';

export const tiwloPayResolvers = {
  Query: {
    tiwloPayOverview: async (_, __, ctx) => service.tiwloPayOverview(ctx),
    adminTiwloPayOverview: async (_, __, ctx) => service.adminTiwloPayOverview(ctx),
    publicTiwloPayLink: async (_, { slug }, ctx) => service.publicTiwloPayLink(ctx, slug)
  },
  Mutation: {
    upsertTiwloPayProfile: async (_, { input }, ctx) => service.upsertTiwloPayProfile(ctx, input),
    rotateTiwloPayKeys: async (_, __, ctx) => service.rotateTiwloPayKeys(ctx),
    requestTiwloPayVerification: async (_, { input }, ctx) => service.requestTiwloPayVerification(ctx, input),
    createTiwloPayLink: async (_, { input }, ctx) => service.createTiwloPayLink(ctx, input),
    payTiwloPayLink: async (_, { input }, ctx) => service.payTiwloPayLink(ctx, input),
    requestTiwloPayWithdrawal: async (_, { input }, ctx) => service.requestTiwloPayWithdrawal(ctx, input),
    adminUpdateTiwloPayProfileStatus: async (_, { id, status }, ctx) => service.adminUpdateTiwloPayProfileStatus(ctx, id, status),
    adminUpdateTiwloPayWithdrawalStatus: async (_, { id, status }, ctx) => service.adminUpdateTiwloPayWithdrawalStatus(ctx, id, status)
  }
};
