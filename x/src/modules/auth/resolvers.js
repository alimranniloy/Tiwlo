import { requireAuth } from '../../core/auth.js';
import { toApi } from '../../core/format.js';
import * as service from './service.js';

export const authResolvers = {
  Query: {
    me: (_, __, ctx) => toApi(ctx.user)
  },
  Mutation: {
    login: (_, { input }, ctx) => service.login(ctx, input),
    signup: (_, { input }, ctx) => service.signup(ctx, input),
    socialAppSignup: (_, { input }, ctx) => service.socialAppSignup(ctx, input),
    verifySignupWhatsAppOtp: (_, { challengeId, code }, ctx) => service.verifySignupWhatsAppOtp(ctx, challengeId, code),
    updateProfile: async (_, { input }, ctx) => service.updateProfile(ctx, await requireAuth(ctx), input),
    startPasswordResetOtp: (_, args, ctx) => service.startPasswordResetOtp(ctx, args),
    resendPasswordResetOtp: (_, { challengeId }, ctx) => service.resendPasswordResetOtp(ctx, challengeId),
    verifyPasswordResetOtp: (_, { challengeId, code }, ctx) => service.verifyPasswordResetOtp(ctx, challengeId, code),
    resetPassword: (_, { token, password }, ctx) => service.resetPassword(ctx, token, password),
    resendEmailVerification: async (_, __, ctx) => service.resendEmailVerification(ctx, await requireAuth(ctx)),
    verifyEmail: (_, { token }, ctx) => service.verifyEmail(ctx, token),
    verifyPassword: async (_, { password }, ctx) => service.verifyPassword(ctx, await requireAuth(ctx), password)
  }
};
