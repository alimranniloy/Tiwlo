import * as service from './service.js';

export const identityVerificationResolvers = {
  Query: {
    identityVerificationChallenge: async (_, args, ctx) => service.identityVerificationChallenge(ctx, args),
    identityVerifications: async (_, args, ctx) => service.listIdentityVerifications(ctx, args)
  },
  Mutation: {
    startIdentityVerification: async (_, { input }, ctx) => service.startIdentityVerification(ctx, input || {}),
    submitIdentityVerification: async (_, { input }, ctx) => service.submitIdentityVerification(ctx, input || {}),
    reviewIdentityVerification: async (_, { id, status, reason }, ctx) => service.reviewIdentityVerification(ctx, id, status, reason || '')
  }
};
