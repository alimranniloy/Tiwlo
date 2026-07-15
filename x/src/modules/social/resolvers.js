import { requireAdmin, requireAuth } from '../../core/auth.js';
import { toApi } from '../../core/format.js';
import * as service from './service.js';

const api = async (promise) => toApi(await promise);

export const socialResolvers = {
  User: {
    socialProfile: (parent, _, ctx) => ctx.prisma.socialProfile.findUnique({ where: { userId: parent.id } })
  },
  SocialProfile: {
    user: (parent, _, ctx) => parent.user || ctx.prisma.user.findUnique({ where: { id: parent.userId } }),
    verified: (parent) => Boolean(parent.verified && (!parent.badgeExpiresAt || new Date(parent.badgeExpiresAt) > new Date())),
    badgeType: (parent) => {
      const active = parent.verified && (!parent.badgeExpiresAt || new Date(parent.badgeExpiresAt) > new Date());
      if (!active) return 'none';
      return parent.badgeType && parent.badgeType !== 'none' ? parent.badgeType : 'blue';
    },
    adminUser: async (parent, _, ctx) => {
      await requireAdmin(ctx);
      return parent.user || ctx.prisma.user.findUnique({ where: { id: parent.userId } });
    }
  },
  SocialPost: {
    author: (parent, _, ctx) => parent.author || ctx.prisma.user.findUnique({ where: { id: parent.authorId } }),
    adminAuthor: async (parent, _, ctx) => {
      await requireAdmin(ctx);
      return parent.author || ctx.prisma.user.findUnique({ where: { id: parent.authorId } });
    },
    authorProfile: (parent, _, ctx) => parent.authorProfile || parent.author?.socialProfile || ctx.prisma.socialProfile.findUnique({ where: { userId: parent.authorId } })
  },
  SocialComment: {
    author: (parent, _, ctx) => parent.author || ctx.prisma.user.findUnique({ where: { id: parent.authorId } }),
    authorProfile: (parent, _, ctx) => parent.authorProfile || parent.author?.socialProfile || ctx.prisma.socialProfile.findUnique({ where: { userId: parent.authorId } })
  },
  SocialGroup: {
    owner: (parent, _, ctx) => parent.owner || ctx.prisma.user.findUnique({ where: { id: parent.ownerId } })
  },
  SocialGroupMember: {
    user: (parent, _, ctx) => parent.user || ctx.prisma.user.findUnique({ where: { id: parent.userId } }),
    profile: (parent, _, ctx) => parent.profile || parent.user?.socialProfile || ctx.prisma.socialProfile.findUnique({ where: { userId: parent.userId } })
  },
  SocialConversationMember: {
    user: (parent, _, ctx) => parent.user || ctx.prisma.user.findUnique({ where: { id: parent.userId } }),
    profile: (parent, _, ctx) => parent.profile || parent.user?.socialProfile || ctx.prisma.socialProfile.findUnique({ where: { userId: parent.userId } })
  },
  SocialMessage: {
    sender: (parent, _, ctx) => parent.sender || ctx.prisma.user.findUnique({ where: { id: parent.senderId } }),
    senderProfile: (parent, _, ctx) => parent.senderProfile || parent.sender?.socialProfile || ctx.prisma.socialProfile.findUnique({ where: { userId: parent.senderId } })
  },
  SocialCallSession: {
    caller: (parent, _, ctx) => parent.caller || ctx.prisma.user.findUnique({ where: { id: parent.callerId } }),
    callee: (parent, _, ctx) => parent.callee || ctx.prisma.user.findUnique({ where: { id: parent.calleeId } })
  },
  SocialLiveStream: {
    host: (parent, _, ctx) => parent.host || ctx.prisma.user.findUnique({ where: { id: parent.hostId } }),
    hostProfile: (parent, _, ctx) => parent.hostProfile || parent.host?.socialProfile || ctx.prisma.socialProfile.findUnique({ where: { userId: parent.hostId } })
  },
  Query: {
    socialProfile: (_, args, ctx) => api(service.getProfile(ctx, args)),
    socialSearch: (_, { query, limit }, ctx) => api(service.searchProfiles(ctx, query, limit)),
    socialFeed: (_, args, ctx) => api(service.listFeed(ctx, args)),
    socialPost: (_, { id }, ctx) => api(service.getPost(ctx, id)),
    socialComments: (_, args, ctx) => api(service.listComments(ctx, args)),
    socialSavedPosts: (_, { limit }, ctx) => api(service.listSavedPosts(ctx, limit)),
    socialMemories: (_, { limit }, ctx) => api(service.listMemories(ctx, limit)),
    socialGroups: (_, args, ctx) => api(service.listGroups(ctx, args)),
    socialGroup: (_, { id }, ctx) => api(service.getGroup(ctx, id)),
    socialGroupMembers: (_, { groupId, limit }, ctx) => api(service.listGroupMembers(ctx, groupId, limit)),
    socialConversations: (_, __, ctx) => api(service.listConversations(ctx)),
    socialMessages: (_, args, ctx) => api(service.listMessages(ctx, args)),
    socialCall: (_, { id }, ctx) => api(service.getCall(ctx, id)),
    socialIncomingCalls: (_, __, ctx) => api(service.incomingCalls(ctx)),
    socialLiveStreams: (_, args, ctx) => api(service.listLiveStreams(ctx, args)),
    socialSettings: async (_, __, ctx) => {
      await requireAuth(ctx);
      return service.getSettings(ctx);
    },
    adminSocialOverview: (_, __, ctx) => api(service.adminOverview(ctx)),
    adminSocialUsers: (_, args, ctx) => api(service.adminUsers(ctx, args)),
    adminSocialPosts: (_, args, ctx) => api(service.adminPosts(ctx, args)),
    adminSocialReports: (_, { status }, ctx) => api(service.adminReports(ctx, status))
  },
  Mutation: {
    upsertSocialProfile: (_, { input }, ctx) => api(service.upsertProfile(ctx, input)),
    followSocialUser: (_, { userId }, ctx) => api(service.followUser(ctx, userId, true)),
    unfollowSocialUser: (_, { userId }, ctx) => api(service.followUser(ctx, userId, false)),
    createSocialPost: (_, { input }, ctx) => api(service.createPost(ctx, input)),
    updateSocialPost: (_, { input }, ctx) => api(service.updatePost(ctx, input)),
    deleteSocialPost: (_, { id }, ctx) => service.deletePost(ctx, id),
    viewSocialPost: (_, { id }, ctx) => api(service.viewPost(ctx, id)),
    reactToSocialPost: (_, { id, kind }, ctx) => api(service.reactToPost(ctx, id, kind)),
    repostSocialPost: (_, { id }, ctx) => api(service.repostPost(ctx, id)),
    saveSocialPost: (_, { id, save }, ctx) => api(service.savePost(ctx, id, save)),
    favoriteSocialUser: (_, { userId, favorite }, ctx) => service.favoriteUser(ctx, userId, favorite),
    snoozeSocialUser: (_, { userId, days }, ctx) => service.snoozeUser(ctx, userId, days),
    addSocialComment: (_, { postId, body, replyToId }, ctx) => api(service.addComment(ctx, postId, body, replyToId)),
    reactToSocialComment: (_, { id }, ctx) => api(service.reactToComment(ctx, id)),
    deleteSocialComment: (_, { id }, ctx) => service.deleteComment(ctx, id),
    createSocialGroup: (_, { input }, ctx) => api(service.createGroup(ctx, input)),
    updateSocialGroup: (_, { input }, ctx) => api(service.updateGroup(ctx, input)),
    joinSocialGroup: (_, { id }, ctx) => api(service.joinGroup(ctx, id)),
    leaveSocialGroup: (_, { id }, ctx) => service.leaveGroup(ctx, id),
    updateSocialGroupMember: (_, { groupId, userId, role, remove }, ctx) => api(service.updateGroupMember(ctx, groupId, userId, role, remove)),
    createSocialConversation: (_, { input }, ctx) => api(service.createConversation(ctx, input)),
    respondToSocialMessageRequest: (_, { id, accept }, ctx) => api(service.respondToMessageRequest(ctx, id, accept)),
    sendSocialMessage: (_, { input }, ctx) => api(service.sendMessage(ctx, input)),
    editSocialMessage: (_, { id, body }, ctx) => api(service.editMessage(ctx, id, body)),
    markSocialConversationRead: (_, { id }, ctx) => api(service.markConversationRead(ctx, id)),
    reactToSocialMessage: (_, { id, emoji }, ctx) => api(service.reactToMessage(ctx, id, emoji)),
    unsendSocialMessage: (_, { id }, ctx) => api(service.unsendMessage(ctx, id)),
    deleteSocialMessageForMe: (_, { id }, ctx) => service.deleteMessageForMe(ctx, id),
    startSocialCall: (_, { input }, ctx) => api(service.startCall(ctx, input)),
    signalSocialCall: (_, { input }, ctx) => api(service.signalCall(ctx, input)),
    endSocialCall: (_, { id, status }, ctx) => api(service.endCall(ctx, id, status)),
    startSocialLiveStream: (_, { input }, ctx) => api(service.startLiveStream(ctx, input)),
    updateSocialLiveStream: (_, { id, status, viewerCount }, ctx) => api(service.updateLiveStream(ctx, id, status, viewerCount)),
    reportSocialContent: (_, { targetType, targetId, reason, details }, ctx) => api(service.reportContent(ctx, targetType, targetId, reason, details)),
    startSocialVerificationCheckout: (_, { packageId, provider, currency }, ctx) => api(service.startVerificationCheckout(ctx, packageId, provider, currency)),
    adminVerifySocialProfile: (_, { userId, verified }, ctx) => api(service.adminVerifyProfile(ctx, userId, verified)),
    adminSetSocialBadge: (_, { userId, badgeType, badgePlan }, ctx) => api(service.adminSetSocialBadge(ctx, userId, badgeType, badgePlan)),
    adminUpdateSocialUserStatus: (_, { userId, status }, ctx) => api(service.adminUpdateUserStatus(ctx, userId, status)),
    adminDeleteSocialPost: (_, { id }, ctx) => service.deletePost(ctx, id, true),
    adminResolveSocialReport: (_, { id, status, resolution }, ctx) => api(service.adminResolveReport(ctx, id, status, resolution)),
    adminUpdateSocialSettings: (_, { input }, ctx) => service.adminUpdateSettings(ctx, input)
  }
};
