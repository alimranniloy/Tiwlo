import * as service from './service.js';

export const emailResolvers = {
  Query: {
    mailboxOverview: (_, { token }, ctx) => service.mailboxOverview(ctx, token)
  },
  Mutation: {
    requestMailboxRecoveryOtp: (_, { input }, ctx) => service.requestMailboxRecoveryOtp(ctx, input),
    mailboxRegister: (_, { input }, ctx) => service.registerMailbox(ctx, input),
    mailboxLogin: (_, { input }, ctx) => service.loginMailbox(ctx, input),
    sendMailboxEmail: (_, { input }, ctx) => service.sendMailboxMessage(ctx, input),
    updateMailboxMessage: (_, { input }, ctx) => service.updateMailboxMessage(ctx, input)
  }
};
