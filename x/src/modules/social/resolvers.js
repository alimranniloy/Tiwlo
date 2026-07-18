import { requireAdmin, requireAuth } from '../../core/auth.js';
import { toApi } from '../../core/format.js';
import * as service from './service.js';
import * as socialAi from './ai.js';

const api = async (promise) => toApi(await promise);

export const socialResolvers = {
  SocialProfileDecoration: {
    owned: (parent) => typeof parent.owned === 'boolean' ? parent.owned : Number(parent.priceUsd || 0) <= 0,
    applied: (parent) => Boolean(parent.applied),
    ownershipCount: (parent) => Number(parent.ownershipCount ?? parent._count?.ownerships ?? 0),
    appliedCount: (parent) => parent.appliedCount === undefined ? null : Number(parent.appliedCount)
  },
  User: {
    socialProfile: (parent, _, ctx) => ctx.prisma.socialProfile.findUnique({ where: { userId: parent.id } })
  },
  SocialProfile: {
    user: (parent, _, ctx) => parent.user || ctx.prisma.user.findUnique({ where: { id: parent.userId } }),
    // A profile is returned from several nested relations (live, messages and
    // notifications) where the service does not attach the aggregate counts.
    // These fields are non-null in GraphQL, so always resolve a numeric value
    // instead of letting Prisma's missing scalar become `null` at runtime.
    followerCount: async (parent, _, ctx) => Number(parent.followerCount ?? parent.user?._count?.socialFollowers ?? await ctx.prisma.socialFollow.count({ where: { followingId: parent.userId } })),
    followingCount: async (parent, _, ctx) => Number(parent.followingCount ?? parent.user?._count?.socialFollowing ?? await ctx.prisma.socialFollow.count({ where: { followerId: parent.userId } })),
    postCount: async (parent, _, ctx) => Number(parent.postCount ?? parent.user?._count?.socialPosts ?? await ctx.prisma.socialPost.count({ where: { authorId: parent.userId, status: 'active' } })),
    isFollowing: (parent) => Boolean(parent.isFollowing),
    avatarDecoration: (parent, _, ctx) => parent.avatarDecoration || (parent.avatarDecorationId ? ctx.prisma.socialProfileDecoration.findUnique({ where: { id: parent.avatarDecorationId } }) : null),
    profileEffect: (parent, _, ctx) => parent.profileEffect || (parent.profileEffectId ? ctx.prisma.socialProfileDecoration.findUnique({ where: { id: parent.profileEffectId } }) : null),
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
    authorProfile: (parent, _, ctx) => parent.authorProfile || parent.author?.socialProfile || ctx.prisma.socialProfile.findUnique({ where: { userId: parent.authorId } }),
    collaborators: async (parent, _, ctx) => {
      const rawIds = Array.isArray(parent.metadata?.collaboratorIds) ? parent.metadata.collaboratorIds : [];
      const ids = [...new Set(rawIds.map((id) => String(id || '').trim()).filter((id) => id && id !== parent.authorId))].slice(0, 20);
      if (!ids.length) return [];
      const profiles = await ctx.prisma.socialProfile.findMany({ where: { userId: { in: ids } }, include: { user: true } });
      const byUserId = new Map(profiles.map((profile) => [profile.userId, profile]));
      return ids.map((id) => byUserId.get(id)).filter(Boolean);
    },
    saveCount: (parent) => Number(parent.saveCount ?? parent._count?.savedBy ?? 0)
  },
  SocialStory: {
    author: (parent, _, ctx) => parent.author || ctx.prisma.user.findUnique({ where: { id: parent.authorId } }),
    authorProfile: (parent, _, ctx) => parent.authorProfile || parent.author?.socialProfile || ctx.prisma.socialProfile.findUnique({ where: { userId: parent.authorId } })
  },
  SocialStoryGroup: {
    author: (parent, _, ctx) => parent.author || ctx.prisma.user.findUnique({ where: { id: parent.authorId } }),
    authorProfile: (parent, _, ctx) => parent.authorProfile || parent.author?.socialProfile || ctx.prisma.socialProfile.findUnique({ where: { userId: parent.authorId } })
  },
  SocialStoryView: {
    viewer: (parent, _, ctx) => parent.viewer || ctx.prisma.user.findUnique({ where: { id: parent.viewerId } }),
    viewerProfile: (parent, _, ctx) => parent.viewerProfile || parent.viewer?.socialProfile || ctx.prisma.socialProfile.findUnique({ where: { userId: parent.viewerId } })
  },
  SocialStoryReply: {
    sender: (parent, _, ctx) => parent.sender || ctx.prisma.user.findUnique({ where: { id: parent.senderId } }),
    senderProfile: (parent, _, ctx) => parent.senderProfile || parent.sender?.socialProfile || ctx.prisma.socialProfile.findUnique({ where: { userId: parent.senderId } })
  },
  SocialStoryInteraction: {
    user: (parent, _, ctx) => parent.user || ctx.prisma.user.findUnique({ where: { id: parent.userId } }),
    userProfile: (parent, _, ctx) => parent.userProfile || parent.user?.socialProfile || ctx.prisma.socialProfile.findUnique({ where: { userId: parent.userId } })
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
    profile: (parent, _, ctx) => parent.profile || parent.user?.socialProfile || ctx.prisma.socialProfile.findUnique({ where: { userId: parent.userId } }),
    blocked: (parent) => Boolean(parent.blocked)
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
  SocialLiveParticipant: {
    viewer: (parent, _, ctx) => parent.viewer || ctx.prisma.user.findUnique({ where: { id: parent.viewerId } }),
    viewerProfile: (parent, _, ctx) => parent.viewerProfile || parent.viewer?.socialProfile || ctx.prisma.socialProfile.findUnique({ where: { userId: parent.viewerId } })
  },
  SocialLiveComment: {
    author: (parent, _, ctx) => parent.author || ctx.prisma.user.findUnique({ where: { id: parent.authorId } }),
    authorProfile: (parent, _, ctx) => parent.authorProfile || parent.author?.socialProfile || ctx.prisma.socialProfile.findUnique({ where: { userId: parent.authorId } })
  },
  Query: {
    socialProfile: (_, args, ctx) => api(service.getProfile(ctx, args)),
    socialSearch: (_, { query, limit }, ctx) => api(service.searchProfiles(ctx, query, limit)),
    socialConnections: (_, { userId, limit }, ctx) => api(service.listConnections(ctx, userId, limit)),
    socialFollowers: (_, { userId, limit }, ctx) => api(service.listFollowers(ctx, userId, limit)),
    socialFollowing: (_, { userId, limit }, ctx) => api(service.listFollowing(ctx, userId, limit)),
    socialBlockedUsers: (_, { limit }, ctx) => api(service.listBlockedUsers(ctx, limit)),
    socialFeed: (_, args, ctx) => api(service.listFeed(ctx, args)),
    socialFeedModules: (_, { feedSize }, ctx) => api(service.listFeedModules(ctx, feedSize)),
    socialLinkPreview: (_, { url }, ctx) => api(service.getLinkPreview(ctx, url)),
    socialStories: (_, args, ctx) => api(service.listStories(ctx, args)),
    socialStoryTray: (_, { limit }, ctx) => api(service.listStoryTray(ctx, limit)),
    socialStory: (_, { id }, ctx) => api(service.getStory(ctx, id)),
    socialStoryMemories: (_, args, ctx) => api(service.listStoryMemories(ctx, args)),
    socialStoryViewers: (_, { id, limit }, ctx) => api(service.listStoryViewers(ctx, id, limit)),
    socialStoryInteractions: (_, { id, itemId, limit }, ctx) => api(service.listStoryInteractions(ctx, id, itemId, limit)),
    socialStoryMusic: (_, { search, limit }, ctx) => api(service.searchStoryMusic(ctx, search, limit)),
    socialProfileDecorations: (_, __, ctx) => api(service.listProfileDecorations(ctx)),
    socialProfileEffects: (_, __, ctx) => api(service.listProfileEffects(ctx)),
    socialPost: (_, { id }, ctx) => api(service.getPost(ctx, id)),
    socialComments: (_, args, ctx) => api(service.listComments(ctx, args)),
    socialPostReactions: (_, { postId, limit }, ctx) => api(service.listPostReactions(ctx, postId, limit)),
    socialSavedPosts: (_, { limit }, ctx) => api(service.listSavedPosts(ctx, limit)),
    socialMemories: (_, { limit }, ctx) => api(service.listMemories(ctx, limit)),
    socialGroups: (_, args, ctx) => api(service.listGroups(ctx, args)),
    socialGroup: (_, { id }, ctx) => api(service.getGroup(ctx, id)),
    socialGroupMembers: (_, { groupId, limit }, ctx) => api(service.listGroupMembers(ctx, groupId, limit)),
    socialConversations: (_, { archived }, ctx) => api(service.listConversations(ctx, archived)),
    socialMessages: (_, args, ctx) => api(service.listMessages(ctx, args)),
    socialCall: (_, { id }, ctx) => api(service.getCall(ctx, id)),
    socialIncomingCalls: (_, __, ctx) => api(service.incomingCalls(ctx)),
    socialLiveStreams: (_, args, ctx) => api(service.listLiveStreams(ctx, args)),
    socialLiveStream: (_, { id }, ctx) => api(service.getLiveStream(ctx, id)),
    socialLiveParticipants: (_, { streamId }, ctx) => api(service.listLiveParticipants(ctx, streamId)),
    socialLiveComments: (_, { streamId, limit }, ctx) => api(service.listLiveComments(ctx, streamId, limit)),
    socialCopyrightStudio: (_, __, ctx) => api(service.getCopyrightStudio(ctx)),
    socialSettings: async (_, __, ctx) => {
      await requireAuth(ctx);
      return service.getSettings(ctx);
    },
    adminSocialOverview: (_, __, ctx) => api(service.adminOverview(ctx)),
    adminSocialUsers: (_, args, ctx) => api(service.adminUsers(ctx, args)),
    adminSocialPosts: (_, args, ctx) => api(service.adminPosts(ctx, args)),
    adminSocialReports: (_, { status }, ctx) => api(service.adminReports(ctx, status)),
    adminSocialModerationEvents: (_, args, ctx) => api(service.adminModerationEvents(ctx, args)),
    adminSocialProfileDecorations: (_, __, ctx) => api(service.adminProfileDecorations(ctx)),
    adminSocialProfileEffects: (_, __, ctx) => api(service.adminProfileEffects(ctx)),
    adminSocialAiOverview: (_, __, ctx) => api(socialAi.socialAiOverview(ctx)),
    adminSocialAiJobs: (_, { status, limit }, ctx) => api(socialAi.listAdminSocialAiJobs(ctx, status, limit)),
    adminSocialAiCases: (_, { status, limit }, ctx) => api(socialAi.listAdminSocialAiCases(ctx, status, limit)),
    socialAiMyCases: (_, __, ctx) => api(socialAi.getMySocialAiCases(ctx))
  },
  Mutation: {
    upsertSocialProfile: (_, { input }, ctx) => api(service.upsertProfile(ctx, input)),
    followSocialUser: (_, { userId }, ctx) => api(service.followUser(ctx, userId, true)),
    unfollowSocialUser: (_, { userId }, ctx) => api(service.followUser(ctx, userId, false)),
    blockSocialUser: (_, { userId, block, reason }, ctx) => service.blockUser(ctx, userId, block, reason),
    createSocialPost: (_, { input }, ctx) => api(service.createPost(ctx, input)),
    createSocialStory: (_, { input }, ctx) => api(service.createStory(ctx, input)),
    updateSocialStory: (_, { id, ...input }, ctx) => api(service.updateStory(ctx, id, input)),
    viewSocialStory: (_, { id, itemSortOrder }, ctx) => api(service.viewStory(ctx, id, itemSortOrder)),
    reactToSocialStory: (_, { id, itemId, emoji }, ctx) => api(service.reactToStory(ctx, id, itemId, emoji)),
    replyToSocialStory: (_, { id, itemId, body }, ctx) => api(service.replyToStory(ctx, id, itemId, body)),
    interactWithSocialStory: (_, { input }, ctx) => api(service.interactWithStory(ctx, input)),
    deleteSocialStoryInteraction: (_, { id }, ctx) => service.deleteStoryInteraction(ctx, id),
    archiveSocialStory: (_, { id }, ctx) => api(service.archiveStory(ctx, id)),
    deleteSocialStory: (_, { id }, ctx) => service.deleteStory(ctx, id),
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
    updateSocialConversationMember: (_, args, ctx) => api(service.updateConversationMember(ctx, args)),
    addSocialConversationMembers: (_, { id, userIds }, ctx) => api(service.addConversationMembers(ctx, id, userIds)),
    setSocialConversationTyping: (_, { id, typing }, ctx) => api(service.setConversationTyping(ctx, id, typing)),
    reactToSocialMessage: (_, { id, emoji }, ctx) => api(service.reactToMessage(ctx, id, emoji)),
    unsendSocialMessage: (_, { id }, ctx) => api(service.unsendMessage(ctx, id)),
    deleteSocialMessageForMe: (_, { id }, ctx) => service.deleteMessageForMe(ctx, id),
    startSocialCall: (_, { input }, ctx) => api(service.startCall(ctx, input)),
    signalSocialCall: (_, { input }, ctx) => api(service.signalCall(ctx, input)),
    endSocialCall: (_, { id, status }, ctx) => api(service.endCall(ctx, id, status)),
    startSocialLiveStream: (_, { input }, ctx) => api(service.startLiveStream(ctx, input)),
    updateSocialLiveStream: (_, { id, status, viewerCount }, ctx) => api(service.updateLiveStream(ctx, id, status, viewerCount)),
    joinSocialLiveStream: (_, { id, asCohost }, ctx) => api(service.joinLiveStream(ctx, id, Boolean(asCohost))),
    inviteSocialLiveCohost: (_, { streamId, userId }, ctx) => api(service.inviteLiveCohost(ctx, streamId, userId)),
    signalSocialLiveStream: (_, { input }, ctx) => api(service.signalLiveStream(ctx, input)),
    heartbeatSocialLiveStream: (_, { id, paused }, ctx) => api(service.heartbeatLiveStream(ctx, id, paused)),
    leaveSocialLiveStream: (_, { id }, ctx) => service.leaveLiveStream(ctx, id),
    addSocialLiveComment: (_, { streamId, body, replyToId }, ctx) => api(service.addLiveComment(ctx, streamId, body, replyToId)),
    deleteSocialLiveComment: (_, { id }, ctx) => service.deleteLiveComment(ctx, id),
    registerSocialCopyrightReference: (_, { input }, ctx) => api(service.registerCopyrightReference(ctx, input)),
    updateSocialCopyrightReference: (_, { input }, ctx) => api(service.updateCopyrightReference(ctx, input)),
    scanSocialCopyrightLibrary: (_, __, ctx) => api(service.scanCopyrightLibrary(ctx)),
    actOnSocialCopyrightClaim: (_, { id, action }, ctx) => api(service.actOnCopyrightClaim(ctx, id, action)),
    requestSocialCopyrightReview: (_, { id, reason }, ctx) => api(service.requestCopyrightClaimReview(ctx, id, reason)),
    reportSocialContent: (_, { targetType, targetId, reason, details }, ctx) => api(service.reportContent(ctx, targetType, targetId, reason, details)),
    startSocialVerificationCheckout: (_, { packageId, provider, currency }, ctx) => api(service.startVerificationCheckout(ctx, packageId, provider, currency)),
    applySocialProfileDecoration: (_, { id }, ctx) => api(service.applyProfileDecoration(ctx, id)),
    startSocialProfileDecorationCheckout: (_, { id, provider, currency }, ctx) => api(service.startProfileDecorationCheckout(ctx, id, provider, currency)),
    applySocialProfileEffect: (_, { id }, ctx) => api(service.applyProfileEffect(ctx, id)),
    startSocialProfileEffectCheckout: (_, { id, provider, currency }, ctx) => api(service.startProfileEffectCheckout(ctx, id, provider, currency)),
    adminVerifySocialProfile: (_, { userId, verified }, ctx) => api(service.adminVerifyProfile(ctx, userId, verified)),
    adminSetSocialBadge: (_, { userId, badgeType, badgePlan }, ctx) => api(service.adminSetSocialBadge(ctx, userId, badgeType, badgePlan)),
    adminUpdateSocialUserStatus: (_, { userId, status, reason }, ctx) => api(service.adminUpdateUserStatus(ctx, userId, status, reason)),
    adminDeleteSocialPost: (_, { id }, ctx) => service.deletePost(ctx, id, true),
    adminResolveSocialReport: (_, { id, status, resolution }, ctx) => api(service.adminResolveReport(ctx, id, status, resolution)),
    adminUpdateSocialSettings: (_, { input }, ctx) => service.adminUpdateSettings(ctx, input),
    adminUpsertSocialProfileDecoration: (_, { input }, ctx) => api(service.adminUpsertProfileDecoration(ctx, input)),
    adminArchiveSocialProfileDecoration: (_, { id }, ctx) => service.adminArchiveProfileDecoration(ctx, id),
    adminUpsertSocialProfileEffect: (_, { input }, ctx) => api(service.adminUpsertProfileEffect(ctx, input)),
    adminArchiveSocialProfileEffect: (_, { id }, ctx) => service.adminArchiveProfileEffect(ctx, id),
    adminUpdateSocialAiSettings: (_, { input }, ctx) => api(socialAi.updateSocialAiSettings(ctx, input)),
    adminOperateSocialAi: (_, { input }, ctx) => api(socialAi.operateSocialAi(ctx, input)),
    adminResolveSocialAiCase: (_, { id, input }, ctx) => api(socialAi.resolveSocialAiCase(ctx, id, input)),
    requestSocialAiAppeal: (_, { id, text }, ctx) => api(socialAi.requestSocialAiAppeal(ctx, id, text))
  }
};
