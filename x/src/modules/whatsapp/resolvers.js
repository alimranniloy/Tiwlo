import { requireAuth } from '../../core/auth.js';
import { createToken } from '../../core/auth.js';
import * as service from './service.js';

export const whatsAppResolvers = {
  User: {
    whatsappVerifiedAt: async (parent, _, ctx) => (await service.attachWhatsAppState(ctx.prisma, parent))?.whatsappVerifiedAt || null,
    whatsappVerifiedPhone: async (parent, _, ctx) => (await service.attachWhatsAppState(ctx.prisma, parent))?.whatsappVerifiedPhone || null,
    whatsappVerificationRequired: async (parent, _, ctx) => service.whatsAppVerificationRequiredFor(ctx.prisma, parent)
  },
  Query: {
    signupAvailability: (_, args, ctx) => service.signupAvailability(ctx, args),
    whatsAppVerificationStatus: async (_, __, ctx) => {
      const actor = await requireAuth(ctx);
      const user = await service.attachWhatsAppState(ctx.prisma, actor);
      return {
        enabled: Boolean((await service.publicWhatsAppStatus(ctx.prisma)).enabled),
        required: await service.whatsAppVerificationRequiredFor(ctx.prisma, user),
        verified: Boolean(user?.whatsappVerifiedAt),
        phone: user?.phone || '',
        mobileCountryCode: user?.mobileCountryCode || '',
        country: user?.country || '',
        whatsappVerifiedPhone: user?.whatsappVerifiedPhone || '',
        whatsappVerifiedAt: user?.whatsappVerifiedAt || null
      };
    }
  },
  Mutation: {
    resendSignupWhatsAppOtp: (_, { challengeId }, ctx) => service.resendOtpChallenge(ctx, challengeId, 'signup'),
    changeSignupWhatsAppPhone: (_, { challengeId, input }, ctx) => service.changeSignupOtpPhone(ctx, challengeId, input),
    startWhatsAppVerification: async (_, { input }, ctx) => service.startUserWhatsAppVerification(ctx, await requireAuth(ctx), input),
    verifyWhatsAppOtp: async (_, { challengeId, code }, ctx) => {
      const actor = await requireAuth(ctx);
      const user = await service.verifyUserWhatsAppOtp(ctx, actor, challengeId, code);
      return { token: createToken(user), user };
    }
  }
};
