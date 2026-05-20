import { requireAuth } from '../../core/auth.js';
import * as service from './service.js';

export const supportResolvers = {
  Query: {
    supportTickets: async (_, args, ctx) => service.listTickets(ctx, await requireAuth(ctx), args),
    supportTicket: async (_, { id }, ctx) => service.getTicket(ctx, await requireAuth(ctx), id),
    liveChatSessions: async (_, args, ctx) => service.listLiveChatSessions(ctx, await requireAuth(ctx), args),
    liveChatSession: async (_, { id }, ctx) => service.getLiveChatSession(ctx, await requireAuth(ctx), id)
  },
  Mutation: {
    createSupportTicket: async (_, { input }, ctx) => service.createTicket(ctx, await requireAuth(ctx), input),
    replySupportTicket: async (_, { id, input }, ctx) => service.replyTicket(ctx, await requireAuth(ctx), id, input),
    assignSupportTicket: async (_, { id, assigneeId }, ctx) => service.assignTicket(ctx, await requireAuth(ctx), id, assigneeId),
    updateSupportTicketStatus: async (_, { id, status }, ctx) => service.updateStatus(ctx, await requireAuth(ctx), id, status),
    startLiveChat: async (_, { input }, ctx) => service.startLiveChat(ctx, await requireAuth(ctx), input || {}),
    sendLiveChatMessage: async (_, { sessionId, input }, ctx) => service.sendLiveChatMessage(ctx, await requireAuth(ctx), sessionId, input),
    assignLiveChatSession: async (_, { id, assigneeId }, ctx) => service.assignLiveChatSession(ctx, await requireAuth(ctx), id, assigneeId),
    updateLiveChatSessionStatus: async (_, { id, status }, ctx) => service.updateLiveChatSessionStatus(ctx, await requireAuth(ctx), id, status),
    createTicketFromLiveChat: async (_, { sessionId, subject }, ctx) => service.createTicketFromLiveChat(ctx, await requireAuth(ctx), sessionId, subject)
  }
};
