import { randomBytes } from 'node:crypto';
import { isAdmin, requireAdmin, requireAuth } from '../../core/auth.js';
import { AppError, forbidden, notFound } from '../../core/errors.js';
import { removeUndefined } from '../../core/format.js';
import { writeAudit } from '../../core/audit.js';

export const SOCIAL_SETTING_KEY = 'social';

const SOCIAL_DEFAULTS = Object.freeze({
  enabled: true,
  registrationsEnabled: true,
  postingEnabled: true,
  messagingEnabled: true,
  callsEnabled: true,
  liveEnabled: true,
  mediaMaxMb: 500,
  autoTranscode: true,
  moderation: { reportsEnabled: true, blockedWords: [] },
  stunServers: [{ urls: 'stun:stun.l.google.com:19302' }]
});

const POST_TYPES = new Set(['post', 'news', 'reel', 'video', 'live']);
const VISIBILITIES = new Set(['public', 'followers', 'private']);
const MESSAGE_TYPES = new Set(['text', 'image', 'video', 'audio', 'file', 'system']);
const CALL_TYPES = new Set(['audio', 'video']);

const bounded = (value, max = 5000) => {
  if (value === null || value === undefined) return value;
  return String(value).trim().slice(0, max);
};

const safeDate = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError('Invalid date', 'BAD_USER_INPUT');
  return date;
};

const boundedLimit = (value, fallback = 30, max = 100) => Math.max(1, Math.min(Number(value) || fallback, max));

const usernameFrom = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9._]/g, '')
  .replace(/^[._]+|[._]+$/g, '')
  .slice(0, 30);

const uniqueUsername = async (ctx, actor, requested) => {
  const base = usernameFrom(requested || actor.email?.split('@')[0] || actor.name) || `user${actor.id.slice(-6)}`;
  if (base.length < 3) throw new AppError('Username must contain at least 3 letters or numbers', 'BAD_USER_INPUT');
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base.slice(0, 25)}${attempt}`;
    const existing = await ctx.prisma.socialProfile.findUnique({ where: { username: candidate } });
    if (!existing || existing.userId === actor.id) return candidate;
  }
  throw new AppError('Unable to reserve this username', 'CONFLICT');
};

export const getSettings = async (ctx) => {
  const setting = await ctx.prisma.systemSetting.findUnique({
    where: { scope_scopeId_key: { scope: 'platform', scopeId: '', key: SOCIAL_SETTING_KEY } }
  });
  const stored = setting?.value && typeof setting.value === 'object' && !Array.isArray(setting.value) ? setting.value : {};
  return {
    ...SOCIAL_DEFAULTS,
    ...stored,
    moderation: { ...SOCIAL_DEFAULTS.moderation, ...(stored.moderation || {}) },
    stunServers: Array.isArray(stored.stunServers) ? stored.stunServers : SOCIAL_DEFAULTS.stunServers
  };
};

const requireSocialFeature = async (ctx, key) => {
  const settings = await getSettings(ctx);
  if (!settings.enabled) throw new AppError('Tiwlo Social is currently disabled', 'SERVICE_UNAVAILABLE');
  if (key && settings[key] === false) throw new AppError('This Social feature is currently disabled', 'FORBIDDEN');
  return settings;
};

const profileInclude = {
  user: {
    include: {
      _count: { select: { socialFollowers: true, socialFollowing: true, socialPosts: true } }
    }
  }
};

const mapProfile = async (ctx, profile, viewerId) => {
  if (!profile) return null;
  const isFollowing = viewerId && viewerId !== profile.userId
    ? Boolean(await ctx.prisma.socialFollow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: profile.userId } }
    }))
    : false;
  return {
    ...profile,
    followerCount: profile.user?._count?.socialFollowers || 0,
    followingCount: profile.user?._count?.socialFollowing || 0,
    postCount: profile.user?._count?.socialPosts || 0,
    isFollowing
  };
};

export const ensureProfile = async (ctx, actor) => {
  const found = await ctx.prisma.socialProfile.findUnique({ where: { userId: actor.id }, include: profileInclude });
  if (found) return found;
  await requireSocialFeature(ctx, 'registrationsEnabled');
  const username = await uniqueUsername(ctx, actor);
  return ctx.prisma.socialProfile.create({
    data: { userId: actor.id, username },
    include: profileInclude
  });
};

export const profileForUser = async (ctx, userId) => {
  const actor = await requireAuth(ctx);
  const user = await ctx.prisma.user.findUnique({ where: { id: userId } });
  if (!user) notFound('User');
  return mapProfile(ctx, await ensureProfile(ctx, user), actor.id);
};

export const getProfile = async (ctx, { userId, username }) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx);
  let profile = null;
  if (userId) profile = await ctx.prisma.socialProfile.findUnique({ where: { userId }, include: profileInclude });
  if (!profile && username) profile = await ctx.prisma.socialProfile.findUnique({ where: { username: usernameFrom(username) }, include: profileInclude });
  if (!profile && (!userId && !username)) profile = await ensureProfile(ctx, actor);
  if (!profile) return null;
  const visibility = profile.privacy?.profileVisibility || 'public';
  if (visibility === 'private' && profile.userId !== actor.id && !isAdmin(actor)) forbidden('This profile is private');
  return mapProfile(ctx, profile, actor.id);
};

export const upsertProfile = async (ctx, input) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'registrationsEnabled');
  const existing = await ensureProfile(ctx, actor);
  const username = input.username === undefined ? undefined : await uniqueUsername(ctx, actor, input.username);
  const profile = await ctx.prisma.$transaction(async (tx) => {
    if (input.avatar !== undefined) {
      await tx.user.update({ where: { id: actor.id }, data: { avatar: bounded(input.avatar, 2000) || null } });
    }
    return tx.socialProfile.update({
      where: { id: existing.id },
      data: removeUndefined({
        username,
        bio: input.bio === undefined ? undefined : bounded(input.bio, 240),
        about: input.about === undefined ? undefined : bounded(input.about, 3000),
        category: input.category === undefined ? undefined : bounded(input.category, 80),
        website: input.website === undefined ? undefined : bounded(input.website, 500),
        location: input.location === undefined ? undefined : bounded(input.location, 160),
        coverUrl: input.coverUrl === undefined ? undefined : bounded(input.coverUrl, 2000),
        privacy: input.privacy,
        preferences: input.preferences
      }),
      include: profileInclude
    });
  });
  return mapProfile(ctx, profile, actor.id);
};

export const searchProfiles = async (ctx, query, limit) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx);
  const search = bounded(query, 120);
  const rows = await ctx.prisma.socialProfile.findMany({
    where: {
      userId: { not: actor.id },
      user: { status: 'active' },
      ...(search ? {
        OR: [
          { username: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { bio: { contains: search, mode: 'insensitive' } }
        ]
      } : {}),
      NOT: { privacy: { path: ['profileVisibility'], equals: 'private' } }
    },
    include: profileInclude,
    orderBy: [{ verified: 'desc' }, { updatedAt: 'desc' }],
    take: boundedLimit(limit, 30, 100)
  });
  return Promise.all(rows.map((row) => mapProfile(ctx, row, actor.id)));
};

export const followUser = async (ctx, userId, follow) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx);
  if (actor.id === userId) throw new AppError('You cannot follow yourself', 'BAD_USER_INPUT');
  const target = await ctx.prisma.user.findUnique({ where: { id: userId } });
  if (!target) notFound('User');
  await ensureProfile(ctx, actor);
  await ensureProfile(ctx, target);
  if (follow) {
    await ctx.prisma.socialFollow.upsert({
      where: { followerId_followingId: { followerId: actor.id, followingId: userId } },
      create: { followerId: actor.id, followingId: userId },
      update: {}
    });
  } else {
    await ctx.prisma.socialFollow.deleteMany({ where: { followerId: actor.id, followingId: userId } });
  }
  return profileForUser(ctx, userId);
};

const postInclude = (viewerId) => ({
  author: { include: {
    socialProfile: true,
    _count: { select: { socialFollowers: true, socialFollowing: true, socialPosts: true } },
    socialFollowers: viewerId ? { where: { followerId: viewerId }, take: 1 } : false
  } },
  _count: { select: { reactions: true, comments: true } },
  reactions: viewerId ? { where: { userId: viewerId }, take: 1 } : false
});

const mapPost = (post) => ({
  ...post,
  authorProfile: post.author?.socialProfile ? {
    ...post.author.socialProfile,
    followerCount: post.author?._count?.socialFollowers || 0,
    followingCount: post.author?._count?.socialFollowing || 0,
    postCount: post.author?._count?.socialPosts || 0,
    isFollowing: Boolean(post.author?.socialFollowers?.length)
  } : null,
  reactionCount: post._count?.reactions || 0,
  commentCount: post._count?.comments || 0,
  viewerReaction: post.reactions?.[0]?.kind || null
});

const feedVisibility = async (ctx, actor) => {
  const following = await ctx.prisma.socialFollow.findMany({ where: { followerId: actor.id }, select: { followingId: true } });
  return [
    { visibility: 'public' },
    { authorId: actor.id },
    { visibility: 'followers', authorId: { in: following.map((row) => row.followingId) } }
  ];
};

export const listFeed = async (ctx, args = {}) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx);
  const where = {
    status: 'published',
    deletedAt: null,
    OR: await feedVisibility(ctx, actor),
    ...(args.type ? { type: String(args.type).toLowerCase() } : {}),
    ...(args.authorId ? { authorId: args.authorId } : {}),
    ...(args.before ? { publishedAt: { lt: safeDate(args.before) } } : {})
  };
  const rows = await ctx.prisma.socialPost.findMany({
    where,
    include: postInclude(actor.id),
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    take: boundedLimit(args.limit)
  });
  return rows.map(mapPost);
};

export const getPost = async (ctx, id) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx);
  const post = await ctx.prisma.socialPost.findUnique({ where: { id }, include: postInclude(actor.id) });
  if (!post || post.deletedAt || (post.status !== 'published' && post.authorId !== actor.id && !isAdmin(actor))) return null;
  if (post.visibility === 'private' && post.authorId !== actor.id && !isAdmin(actor)) forbidden();
  return mapPost(post);
};

export const createPost = async (ctx, input) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'postingEnabled');
  await ensureProfile(ctx, actor);
  const type = String(input.type || 'post').toLowerCase();
  const visibility = String(input.visibility || 'public').toLowerCase();
  if (!POST_TYPES.has(type)) throw new AppError('Invalid post type', 'BAD_USER_INPUT');
  if (!VISIBILITIES.has(visibility)) throw new AppError('Invalid visibility', 'BAD_USER_INPUT');
  const body = bounded(input.body, 10000);
  const media = Array.isArray(input.media) ? input.media.slice(0, 20) : [];
  if (!body && media.length === 0) throw new AppError('A post needs text or media', 'BAD_USER_INPUT');
  const post = await ctx.prisma.socialPost.create({
    data: {
      authorId: actor.id,
      type,
      body,
      media,
      thumbnailUrl: bounded(input.thumbnailUrl, 2000),
      hlsUrl: bounded(input.hlsUrl, 2000),
      processingStatus: bounded(input.processingStatus, 40) || 'ready',
      visibility,
      location: bounded(input.location, 160),
      durationSeconds: input.durationSeconds,
      aspectRatio: input.aspectRatio
    },
    include: postInclude(actor.id)
  });
  return mapPost(post);
};

export const updatePost = async (ctx, input) => {
  const actor = await requireAuth(ctx);
  const existing = await ctx.prisma.socialPost.findUnique({ where: { id: input.id } });
  if (!existing) notFound('Post');
  if (existing.authorId !== actor.id && !isAdmin(actor)) forbidden();
  if (input.visibility && !VISIBILITIES.has(String(input.visibility).toLowerCase())) throw new AppError('Invalid visibility', 'BAD_USER_INPUT');
  const post = await ctx.prisma.socialPost.update({
    where: { id: input.id },
    data: removeUndefined({
      body: input.body === undefined ? undefined : bounded(input.body, 10000),
      media: input.media === undefined ? undefined : Array.isArray(input.media) ? input.media.slice(0, 20) : [],
      thumbnailUrl: input.thumbnailUrl === undefined ? undefined : bounded(input.thumbnailUrl, 2000),
      hlsUrl: input.hlsUrl === undefined ? undefined : bounded(input.hlsUrl, 2000),
      processingStatus: input.processingStatus === undefined ? undefined : bounded(input.processingStatus, 40),
      visibility: input.visibility?.toLowerCase(),
      location: input.location === undefined ? undefined : bounded(input.location, 160)
    }),
    include: postInclude(actor.id)
  });
  return mapPost(post);
};

export const deletePost = async (ctx, id, adminOnly = false) => {
  const actor = adminOnly ? await requireAdmin(ctx) : await requireAuth(ctx);
  const post = await ctx.prisma.socialPost.findUnique({ where: { id } });
  if (!post) notFound('Post');
  if (!adminOnly && post.authorId !== actor.id && !isAdmin(actor)) forbidden();
  await ctx.prisma.socialPost.update({ where: { id }, data: { status: 'deleted', deletedAt: new Date() } });
  await writeAudit(ctx, adminOnly ? 'admin_delete_social_post' : 'delete_social_post', 'socialPost', id, { authorId: post.authorId });
  return true;
};

export const viewPost = async (ctx, id) => {
  const actor = await requireAuth(ctx);
  await getPost(ctx, id);
  const updated = await ctx.prisma.socialPost.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
    include: postInclude(actor.id)
  });
  return mapPost(updated);
};

export const reactToPost = async (ctx, id, kind) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx);
  const post = await getPost(ctx, id);
  if (!post) notFound('Post');
  const normalized = bounded(kind || 'like', 30).toLowerCase();
  const existing = await ctx.prisma.socialPostReaction.findUnique({ where: { postId_userId: { postId: id, userId: actor.id } } });
  if (existing?.kind === normalized) {
    await ctx.prisma.socialPostReaction.delete({ where: { id: existing.id } });
  } else {
    await ctx.prisma.socialPostReaction.upsert({
      where: { postId_userId: { postId: id, userId: actor.id } },
      create: { postId: id, userId: actor.id, kind: normalized },
      update: { kind: normalized }
    });
  }
  return getPost(ctx, id);
};

export const repostPost = async (ctx, id) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'postingEnabled');
  if (!await getPost(ctx, id)) notFound('Post');
  const updated = await ctx.prisma.socialPost.update({
    where: { id },
    data: { shareCount: { increment: 1 } },
    include: postInclude(actor.id)
  });
  return mapPost(updated);
};

const commentInclude = (viewerId) => ({
  author: { include: { socialProfile: true } },
  _count: { select: { reactions: true } },
  reactions: viewerId ? { where: { userId: viewerId }, take: 1 } : false
});

const mapComment = (row) => ({
  ...row,
  authorProfile: row.author?.socialProfile || null,
  reactionCount: row._count?.reactions || 0,
  viewerLiked: Boolean(row.reactions?.length)
});

export const listComments = async (ctx, { postId, before, limit }) => {
  const actor = await requireAuth(ctx);
  if (!await getPost(ctx, postId)) notFound('Post');
  const rows = await ctx.prisma.socialComment.findMany({
    where: { postId, status: 'published', ...(before ? { createdAt: { lt: safeDate(before) } } : {}) },
    include: commentInclude(actor.id),
    orderBy: { createdAt: 'desc' },
    take: boundedLimit(limit, 50, 100)
  });
  return rows.map(mapComment);
};

export const addComment = async (ctx, postId, body, replyToId) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'postingEnabled');
  if (!await getPost(ctx, postId)) notFound('Post');
  const text = bounded(body, 2000);
  if (!text) throw new AppError('Comment cannot be empty', 'BAD_USER_INPUT');
  if (replyToId) {
    const parent = await ctx.prisma.socialComment.findUnique({ where: { id: replyToId } });
    if (!parent || parent.postId !== postId) throw new AppError('Reply target is not part of this post', 'BAD_USER_INPUT');
  }
  const row = await ctx.prisma.socialComment.create({
    data: { postId, authorId: actor.id, body: text, replyToId },
    include: commentInclude(actor.id)
  });
  return mapComment(row);
};

export const reactToComment = async (ctx, id) => {
  const actor = await requireAuth(ctx);
  const comment = await ctx.prisma.socialComment.findUnique({ where: { id } });
  if (!comment || comment.status !== 'published') notFound('Comment');
  if (!await getPost(ctx, comment.postId)) notFound('Post');
  const existing = await ctx.prisma.socialCommentReaction.findUnique({
    where: { commentId_userId: { commentId: id, userId: actor.id } }
  });
  if (existing) await ctx.prisma.socialCommentReaction.delete({ where: { id: existing.id } });
  else await ctx.prisma.socialCommentReaction.create({ data: { commentId: id, userId: actor.id } });
  return mapComment(await ctx.prisma.socialComment.findUnique({ where: { id }, include: commentInclude(actor.id) }));
};

export const deleteComment = async (ctx, id) => {
  const actor = await requireAuth(ctx);
  const comment = await ctx.prisma.socialComment.findUnique({ where: { id } });
  if (!comment) notFound('Comment');
  if (comment.authorId !== actor.id && !isAdmin(actor)) forbidden();
  await ctx.prisma.socialComment.update({ where: { id }, data: { status: 'deleted', body: '' } });
  return true;
};

const requireConversationMember = async (ctx, conversationId, actorId) => {
  const member = await ctx.prisma.socialConversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: actorId } }
  });
  if (!member) forbidden('You are not a member of this conversation');
  return member;
};

const messageInclude = {
  sender: { include: { socialProfile: true } },
  reactions: true
};

const mapMessage = (message) => ({ ...message, senderProfile: message.sender?.socialProfile || null });

const mapConversation = async (ctx, conversation, actorId) => {
  const member = conversation.members?.find((row) => row.userId === actorId);
  const unreadCount = await ctx.prisma.socialMessage.count({
    where: {
      conversationId: conversation.id,
      senderId: { not: actorId },
      unsentAt: null,
      sentAt: { gt: member?.lastReadAt || new Date(0) },
      NOT: { hiddenFor: { some: { userId: actorId } } }
    }
  });
  return {
    ...conversation,
    members: (conversation.members || []).map((row) => ({ ...row, profile: row.user?.socialProfile || null })),
    lastMessage: conversation.messages?.[0] ? mapMessage(conversation.messages[0]) : null,
    unreadCount
  };
};

const conversationInclude = (actorId) => ({
  members: { include: { user: { include: { socialProfile: true } } } },
  messages: {
    where: { deletedAt: null, NOT: { hiddenFor: { some: { userId: actorId } } } },
    include: messageInclude,
    orderBy: { sentAt: 'desc' },
    take: 1
  }
});

export const listConversations = async (ctx) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'messagingEnabled');
  const rows = await ctx.prisma.socialConversation.findMany({
    where: { members: { some: { userId: actor.id, archived: false } } },
    include: conversationInclude(actor.id),
    orderBy: { updatedAt: 'desc' },
    take: 100
  });
  return Promise.all(rows.map((row) => mapConversation(ctx, row, actor.id)));
};

export const createConversation = async (ctx, input) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'messagingEnabled');
  const memberIds = [...new Set([actor.id, ...(input.memberIds || [])])];
  if (memberIds.length < 2) throw new AppError('Select at least one other user', 'BAD_USER_INPUT');
  const users = await ctx.prisma.user.findMany({ where: { id: { in: memberIds }, status: 'active' }, select: { id: true } });
  if (users.length !== memberIds.length) throw new AppError('One or more users cannot receive messages', 'BAD_USER_INPUT');
  const type = input.type || (memberIds.length === 2 ? 'direct' : 'group');
  if (type === 'direct' && memberIds.length === 2) {
    const existing = await ctx.prisma.socialConversation.findFirst({
      where: {
        type: 'direct',
        AND: memberIds.map((userId) => ({ members: { some: { userId } } })),
        members: { every: { userId: { in: memberIds } } }
      },
      include: conversationInclude(actor.id)
    });
    if (existing) return mapConversation(ctx, existing, actor.id);
  }
  const recipientId = type === 'direct' ? memberIds.find((id) => id !== actor.id) : null;
  const recipientFollowsActor = recipientId ? await ctx.prisma.socialFollow.findUnique({
    where: { followerId_followingId: { followerId: recipientId, followingId: actor.id } }
  }) : true;
  const conversation = await ctx.prisma.socialConversation.create({
    data: {
      type,
      title: bounded(input.title, 120),
      avatarUrl: bounded(input.avatarUrl, 2000),
      requestStatus: recipientFollowsActor ? 'accepted' : 'pending',
      requestedById: recipientFollowsActor ? null : actor.id,
      members: { create: memberIds.map((userId) => ({ userId, role: userId === actor.id ? 'owner' : 'member' })) }
    },
    include: conversationInclude(actor.id)
  });
  return mapConversation(ctx, conversation, actor.id);
};

export const respondToMessageRequest = async (ctx, id, accept) => {
  const actor = await requireAuth(ctx);
  const conversation = await ctx.prisma.socialConversation.findUnique({ where: { id }, include: conversationInclude(actor.id) });
  if (!conversation) notFound('Conversation');
  await requireConversationMember(ctx, id, actor.id);
  if (conversation.requestStatus !== 'pending' || conversation.requestedById === actor.id) forbidden('This message request cannot be changed');
  const updated = await ctx.prisma.socialConversation.update({
    where: { id },
    data: { requestStatus: accept ? 'accepted' : 'declined' },
    include: conversationInclude(actor.id)
  });
  return mapConversation(ctx, updated, actor.id);
};

export const listMessages = async (ctx, { conversationId, before, limit }) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'messagingEnabled');
  await requireConversationMember(ctx, conversationId, actor.id);
  const now = new Date();
  await ctx.prisma.socialMessage.updateMany({
    where: { conversationId, senderId: { not: actor.id }, deliveredAt: null, unsentAt: null },
    data: { deliveryStatus: 'delivered', deliveredAt: now }
  });
  const rows = await ctx.prisma.socialMessage.findMany({
    where: {
      conversationId,
      deletedAt: null,
      NOT: { hiddenFor: { some: { userId: actor.id } } },
      ...(before ? { sentAt: { lt: safeDate(before) } } : {})
    },
    include: messageInclude,
    orderBy: { sentAt: 'desc' },
    take: boundedLimit(limit, 50, 100)
  });
  return rows.reverse().map(mapMessage);
};

export const sendMessage = async (ctx, input) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'messagingEnabled');
  await requireConversationMember(ctx, input.conversationId, actor.id);
  const type = String(input.type || 'text').toLowerCase();
  if (!MESSAGE_TYPES.has(type)) throw new AppError('Invalid message type', 'BAD_USER_INPUT');
  const body = bounded(input.body, 8000);
  const media = Array.isArray(input.media) ? input.media.slice(0, 10) : [];
  if (!body && media.length === 0) throw new AppError('Message cannot be empty', 'BAD_USER_INPUT');
  if (input.replyToId) {
    const reply = await ctx.prisma.socialMessage.findUnique({ where: { id: input.replyToId } });
    if (!reply || reply.conversationId !== input.conversationId) throw new AppError('Reply target is not in this conversation', 'BAD_USER_INPUT');
  }
  const message = await ctx.prisma.$transaction(async (tx) => {
    const created = await tx.socialMessage.create({
      data: {
        conversationId: input.conversationId,
        senderId: actor.id,
        type,
        body,
        media,
        replyToId: input.replyToId
      },
      include: messageInclude
    });
    await tx.socialConversation.update({ where: { id: input.conversationId }, data: { updatedAt: new Date() } });
    return created;
  });
  return mapMessage(message);
};

export const editMessage = async (ctx, id, body) => {
  const actor = await requireAuth(ctx);
  const message = await ctx.prisma.socialMessage.findUnique({ where: { id } });
  if (!message) notFound('Message');
  if (message.senderId !== actor.id) forbidden();
  if (message.unsentAt) throw new AppError('An unsent message cannot be edited', 'BAD_USER_INPUT');
  const text = bounded(body, 8000);
  if (!text) throw new AppError('Message cannot be empty', 'BAD_USER_INPUT');
  return mapMessage(await ctx.prisma.socialMessage.update({ where: { id }, data: { body: text, editedAt: new Date() }, include: messageInclude }));
};

export const markConversationRead = async (ctx, id) => {
  const actor = await requireAuth(ctx);
  await requireConversationMember(ctx, id, actor.id);
  const now = new Date();
  await ctx.prisma.$transaction([
    ctx.prisma.socialConversationMember.update({
      where: { conversationId_userId: { conversationId: id, userId: actor.id } },
      data: { lastReadAt: now }
    }),
    ctx.prisma.socialMessage.updateMany({
      where: { conversationId: id, senderId: { not: actor.id }, unsentAt: null, readAt: null },
      data: { deliveryStatus: 'read', deliveredAt: now, readAt: now }
    })
  ]);
  const conversation = await ctx.prisma.socialConversation.findUnique({ where: { id }, include: conversationInclude(actor.id) });
  return mapConversation(ctx, conversation, actor.id);
};

export const reactToMessage = async (ctx, id, emoji) => {
  const actor = await requireAuth(ctx);
  const message = await ctx.prisma.socialMessage.findUnique({ where: { id } });
  if (!message) notFound('Message');
  await requireConversationMember(ctx, message.conversationId, actor.id);
  const value = bounded(emoji, 16);
  if (!value) throw new AppError('Reaction cannot be empty', 'BAD_USER_INPUT');
  const existing = await ctx.prisma.socialMessageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId: id, userId: actor.id, emoji: value } }
  });
  if (existing) await ctx.prisma.socialMessageReaction.delete({ where: { id: existing.id } });
  else await ctx.prisma.socialMessageReaction.create({ data: { messageId: id, userId: actor.id, emoji: value } });
  return mapMessage(await ctx.prisma.socialMessage.findUnique({ where: { id }, include: messageInclude }));
};

export const unsendMessage = async (ctx, id) => {
  const actor = await requireAuth(ctx);
  const message = await ctx.prisma.socialMessage.findUnique({ where: { id } });
  if (!message) notFound('Message');
  if (message.senderId !== actor.id && !isAdmin(actor)) forbidden();
  return mapMessage(await ctx.prisma.socialMessage.update({
    where: { id },
    data: { body: null, media: [], deliveryStatus: 'unsent', unsentAt: new Date() },
    include: messageInclude
  }));
};

export const deleteMessageForMe = async (ctx, id) => {
  const actor = await requireAuth(ctx);
  const message = await ctx.prisma.socialMessage.findUnique({ where: { id } });
  if (!message) notFound('Message');
  await requireConversationMember(ctx, message.conversationId, actor.id);
  await ctx.prisma.socialMessageDeletion.upsert({
    where: { messageId_userId: { messageId: id, userId: actor.id } },
    create: { messageId: id, userId: actor.id },
    update: {}
  });
  return true;
};

const callInclude = { caller: true, callee: true };

export const startCall = async (ctx, input) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'callsEnabled');
  const type = String(input.type || 'video').toLowerCase();
  if (!CALL_TYPES.has(type)) throw new AppError('Invalid call type', 'BAD_USER_INPUT');
  if (input.calleeId === actor.id) throw new AppError('You cannot call yourself', 'BAD_USER_INPUT');
  const callee = await ctx.prisma.user.findUnique({ where: { id: input.calleeId }, include: { socialProfile: true } });
  if (!callee || callee.status !== 'active') throw new AppError('This user is unavailable', 'BAD_USER_INPUT');
  if (callee.socialProfile?.privacy?.allowCalls === false) throw new AppError('This user is not accepting calls', 'FORBIDDEN');
  if (input.conversationId) await requireConversationMember(ctx, input.conversationId, actor.id);
  return ctx.prisma.socialCallSession.create({
    data: {
      conversationId: input.conversationId,
      callerId: actor.id,
      calleeId: input.calleeId,
      type,
      offer: input.offer || undefined
    },
    include: callInclude
  });
};

const requireCallParty = (actor, call) => {
  if (actor.id !== call.callerId && actor.id !== call.calleeId && !isAdmin(actor)) forbidden();
};

export const getCall = async (ctx, id) => {
  const actor = await requireAuth(ctx);
  const call = await ctx.prisma.socialCallSession.findUnique({ where: { id }, include: callInclude });
  if (!call) return null;
  requireCallParty(actor, call);
  return call;
};

export const incomingCalls = async (ctx) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'callsEnabled');
  return ctx.prisma.socialCallSession.findMany({
    where: { calleeId: actor.id, status: { in: ['ringing', 'connecting'] } },
    include: callInclude,
    orderBy: { createdAt: 'desc' },
    take: 10
  });
};

export const signalCall = async (ctx, input) => {
  const actor = await requireAuth(ctx);
  const call = await ctx.prisma.socialCallSession.findUnique({ where: { id: input.id } });
  if (!call) notFound('Call');
  requireCallParty(actor, call);
  const candidates = Array.isArray(call.iceCandidates) ? call.iceCandidates : [];
  if (input.iceCandidate) candidates.push({ ...input.iceCandidate, from: actor.id, at: new Date().toISOString() });
  const status = input.status || call.status;
  return ctx.prisma.socialCallSession.update({
    where: { id: input.id },
    data: removeUndefined({
      status,
      offer: input.offer,
      answer: input.answer,
      iceCandidates: input.iceCandidate ? candidates.slice(-200) : undefined,
      startedAt: status === 'connecting' && !call.startedAt ? new Date() : undefined,
      answeredAt: status === 'active' && !call.answeredAt ? new Date() : undefined,
      endedAt: ['ended', 'declined', 'missed', 'failed'].includes(status) ? new Date() : undefined
    }),
    include: callInclude
  });
};

export const endCall = async (ctx, id, status = 'ended') => signalCall(ctx, { id, status: status || 'ended' });

const streamInclude = { host: { include: { socialProfile: true } } };
const mapStream = (stream, actor) => ({
  ...stream,
  hostProfile: stream.host?.socialProfile || null,
  streamKey: actor && (actor.id === stream.hostId || isAdmin(actor)) ? stream.streamKey : null,
  ingestUrl: actor && (actor.id === stream.hostId || isAdmin(actor)) ? stream.ingestUrl : null
});

export const listLiveStreams = async (ctx, args = {}) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'liveEnabled');
  const rows = await ctx.prisma.socialLiveStream.findMany({
    where: args.status ? { status: args.status } : { status: { in: ['scheduled', 'live'] } },
    include: streamInclude,
    orderBy: { createdAt: 'desc' },
    take: boundedLimit(args.limit, 30, 100)
  });
  return rows.map((row) => mapStream(row, actor));
};

export const startLiveStream = async (ctx, input) => {
  const actor = await requireAuth(ctx);
  await requireSocialFeature(ctx, 'liveEnabled');
  await ensureProfile(ctx, actor);
  const streamKey = randomBytes(24).toString('hex');
  const ingestBase = String(process.env.SOCIAL_RTMP_URL || 'rtmp://localhost:1935/live').replace(/\/$/, '');
  const playbackBase = String(process.env.SOCIAL_LIVE_PLAYBACK_URL || '/live').replace(/\/$/, '');
  const stream = await ctx.prisma.socialLiveStream.create({
    data: {
      hostId: actor.id,
      title: bounded(input.title, 160),
      description: bounded(input.description, 3000),
      visibility: VISIBILITIES.has(input.visibility) ? input.visibility : 'public',
      streamKey,
      ingestUrl: `${ingestBase}/${streamKey}`,
      playbackUrl: `${playbackBase}/${streamKey}/master.m3u8`,
      qualities: ['auto', '720p', '480p', '360p'],
      scheduledAt: safeDate(input.scheduledAt)
    },
    include: streamInclude
  });
  return mapStream(stream, actor);
};

export const updateLiveStream = async (ctx, id, status, viewerCount) => {
  const actor = await requireAuth(ctx);
  const stream = await ctx.prisma.socialLiveStream.findUnique({ where: { id } });
  if (!stream) notFound('Live stream');
  if (stream.hostId !== actor.id && !isAdmin(actor)) forbidden();
  const normalized = String(status).toLowerCase();
  const updated = await ctx.prisma.socialLiveStream.update({
    where: { id },
    data: removeUndefined({
      status: normalized,
      viewerCount: viewerCount === undefined ? undefined : Math.max(0, viewerCount),
      startedAt: normalized === 'live' && !stream.startedAt ? new Date() : undefined,
      endedAt: normalized === 'ended' ? new Date() : undefined
    }),
    include: streamInclude
  });
  return mapStream(updated, actor);
};

export const reportContent = async (ctx, targetType, targetId, reason, details) => {
  const actor = await requireAuth(ctx);
  const settings = await requireSocialFeature(ctx);
  if (settings.moderation?.reportsEnabled === false) throw new AppError('Reports are disabled', 'FORBIDDEN');
  const type = bounded(targetType, 40).toLowerCase();
  return ctx.prisma.socialReport.create({
    data: {
      reporterId: actor.id,
      postId: type === 'post' ? targetId : undefined,
      targetType: type,
      targetId,
      reason: bounded(reason, 120),
      details: bounded(details, 3000)
    }
  });
};

export const adminOverview = async (ctx) => {
  await requireAdmin(ctx);
  const [profiles, verifiedProfiles, posts, reels, messages, activeLiveStreams, openReports] = await Promise.all([
    ctx.prisma.socialProfile.count(),
    ctx.prisma.socialProfile.count({ where: { verified: true } }),
    ctx.prisma.socialPost.count({ where: { deletedAt: null } }),
    ctx.prisma.socialPost.count({ where: { type: 'reel', deletedAt: null } }),
    ctx.prisma.socialMessage.count({ where: { deletedAt: null } }),
    ctx.prisma.socialLiveStream.count({ where: { status: 'live' } }),
    ctx.prisma.socialReport.count({ where: { status: 'open' } })
  ]);
  return { profiles, verifiedProfiles, posts, reels, messages, activeLiveStreams, openReports };
};

export const adminUsers = async (ctx, args = {}) => {
  const actor = await requireAdmin(ctx);
  const search = bounded(args.search, 160);
  const rows = await ctx.prisma.socialProfile.findMany({
    where: {
      ...(args.verified === undefined || args.verified === null ? {} : { verified: args.verified }),
      ...(args.status ? { user: { status: args.status } } : {}),
      ...(search ? { OR: [
        { username: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ] } : {})
    },
    include: profileInclude,
    orderBy: { createdAt: 'desc' },
    take: 200
  });
  return Promise.all(rows.map((row) => mapProfile(ctx, row, actor.id)));
};

export const adminPosts = async (ctx, args = {}) => {
  const actor = await requireAdmin(ctx);
  const search = bounded(args.search, 300);
  const rows = await ctx.prisma.socialPost.findMany({
    where: {
      ...(args.type ? { type: args.type } : {}),
      ...(args.status ? { status: args.status } : {}),
      ...(search ? { OR: [
        { body: { contains: search, mode: 'insensitive' } },
        { author: { name: { contains: search, mode: 'insensitive' } } },
        { author: { email: { contains: search, mode: 'insensitive' } } }
      ] } : {})
    },
    include: postInclude(actor.id),
    orderBy: { createdAt: 'desc' },
    take: boundedLimit(args.limit, 100, 300)
  });
  return rows.map(mapPost);
};

export const adminReports = async (ctx, status) => {
  await requireAdmin(ctx);
  return ctx.prisma.socialReport.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    take: 300
  });
};

export const adminVerifyProfile = async (ctx, userId, verified) => {
  const actor = await requireAdmin(ctx);
  const user = await ctx.prisma.user.findUnique({ where: { id: userId } });
  if (!user) notFound('User');
  await ensureProfile(ctx, user);
  const profile = await ctx.prisma.socialProfile.update({ where: { userId }, data: { verified }, include: profileInclude });
  await writeAudit(ctx, 'admin_verify_social_profile', 'socialProfile', profile.id, { userId, verified });
  return mapProfile(ctx, profile, actor.id);
};

export const adminUpdateUserStatus = async (ctx, userId, status) => {
  const actor = await requireAdmin(ctx);
  if (actor.id === userId && status !== 'active') throw new AppError('You cannot restrict your own account', 'BAD_USER_INPUT');
  const user = await ctx.prisma.user.findUnique({ where: { id: userId } });
  if (!user) notFound('User');
  await ctx.prisma.user.update({ where: { id: userId }, data: { status: bounded(status, 30).toLowerCase() } });
  await ensureProfile(ctx, user);
  await writeAudit(ctx, 'admin_update_social_user_status', 'user', userId, { status });
  return profileForUser(ctx, userId);
};

export const adminResolveReport = async (ctx, id, status, resolution) => {
  await requireAdmin(ctx);
  const report = await ctx.prisma.socialReport.findUnique({ where: { id } });
  if (!report) notFound('Report');
  const updated = await ctx.prisma.socialReport.update({
    where: { id },
    data: { status: bounded(status, 30).toLowerCase(), resolution: bounded(resolution, 2000) }
  });
  await writeAudit(ctx, 'admin_resolve_social_report', 'socialReport', id, { status });
  return updated;
};

export const adminUpdateSettings = async (ctx, input) => {
  await requireAdmin(ctx);
  const current = await getSettings(ctx);
  const value = {
    ...current,
    ...removeUndefined(input),
    moderation: input.moderation === undefined ? current.moderation : { ...current.moderation, ...input.moderation },
    mediaMaxMb: input.mediaMaxMb === undefined ? current.mediaMaxMb : Math.max(1, Math.min(input.mediaMaxMb, 2048))
  };
  await ctx.prisma.systemSetting.upsert({
    where: { scope_scopeId_key: { scope: 'platform', scopeId: '', key: SOCIAL_SETTING_KEY } },
    create: { scope: 'platform', scopeId: '', key: SOCIAL_SETTING_KEY, value },
    update: { value }
  });
  await writeAudit(ctx, 'admin_update_social_settings', 'systemSetting', SOCIAL_SETTING_KEY, { fields: Object.keys(input) });
  return value;
};
