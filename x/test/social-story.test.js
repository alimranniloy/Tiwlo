import test from 'node:test';
import assert from 'node:assert/strict';
import { createStory, deleteStory, getStory, interactWithStory, viewStory } from '../src/modules/social/service.js';

const author = {
  id: 'author-1', role: 'user', status: 'active', signupSource: 'web',
  name: 'Story Author', avatar: null
};

test('story creation persists ordered editor data and a server-owned 24 hour expiry', async () => {
  let createData;
  const ctx = {
    user: author,
    prisma: {
      user: { update: async () => author },
      systemSetting: { findUnique: async () => null },
      socialProfile: { findUnique: async () => ({ id: 'profile-1', userId: author.id, username: 'storyauthor' }) },
      socialStory: {
        create: async ({ data }) => {
          createData = data;
          return {
            id: 'story-1', status: 'active', archivedAt: null, deletedAt: null,
            createdAt: new Date(), updatedAt: new Date(), author,
            audiences: [], views: [], _count: { views: 0, reactions: 0, replies: 0 },
            ...data,
            items: data.items.create.map((item, index) => ({
              id: `item-${index}`, storyId: 'story-1', status: 'active', createdAt: new Date(), updatedAt: new Date(),
              reactions: [], _count: { reactions: 0 }, ...item
            }))
          };
        }
      }
    }
  };

  const before = Date.now();
  const story = await createStory(ctx, {
    visibility: 'followers', allowReplies: true,
    metadata: { source: 'feed', editorVersion: 2 },
    items: [{
      type: 'image', sortOrder: 7, durationMs: 7000,
      media: { type: 'image', url: `/api/social/media/files/${author.id}/photo.jpg` },
      filter: { id: 'warm', amount: 0.4 }, overlays: [{ type: 'mention', userId: 'friend-1' }]
    }]
  });

  assert.equal(story.visibility, 'followers');
  assert.equal(createData.items.create[0].sortOrder, 0);
  assert.deepEqual(createData.items.create[0].filter, { id: 'warm', amount: 0.4 });
  assert.deepEqual(createData.items.create[0].overlays, [{ type: 'mention', userId: 'friend-1' }]);
  assert.ok(createData.expiresAt.getTime() >= before + 86_400_000 - 1000);
  assert.equal(story.seen, true);
});

test('viewing a story upserts a unique viewer and deduplicates seen item ids', async () => {
  const viewer = { id: 'viewer-1', role: 'user', status: 'active', signupSource: 'web', name: 'Viewer' };
  let viewState = { id: 'view-1', storyId: 'story-1', viewerId: viewer.id, lastItemSortOrder: 0, seenItemIds: ['item-0'] };
  let upsertData;
  const storyRow = () => ({
    id: 'story-1', authorId: author.id, author, visibility: 'public', allowReplies: true,
    status: 'active', caption: null, metadata: {}, expiresAt: new Date(Date.now() + 60_000),
    archivedAt: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date(), audiences: [],
    items: [
      { id: 'item-0', storyId: 'story-1', type: 'image', media: {}, filter: {}, transform: {}, overlays: [], music: {}, status: 'active', sortOrder: 0, durationMs: 5000, aiGenerated: false, reactions: [], _count: { reactions: 0 }, createdAt: new Date(), updatedAt: new Date() },
      { id: 'item-1', storyId: 'story-1', type: 'image', media: {}, filter: {}, transform: {}, overlays: [], music: {}, status: 'active', sortOrder: 1, durationMs: 5000, aiGenerated: false, reactions: [], _count: { reactions: 0 }, createdAt: new Date(), updatedAt: new Date() }
    ],
    views: viewState ? [viewState] : [], _count: { views: viewState ? 1 : 0, reactions: 0, replies: 0 }
  });
  const ctx = {
    user: viewer,
    prisma: {
      user: { update: async () => viewer },
      systemSetting: { findUnique: async () => null },
      socialStory: { updateMany: async () => ({ count: 0 }), findUnique: async () => storyRow() },
      socialBlock: { findFirst: async () => null },
      socialStoryView: {
        findUnique: async () => viewState,
        upsert: async ({ create, update }) => {
          upsertData = { create, update };
          viewState = { ...viewState, ...update };
          return viewState;
        }
      }
    }
  };

  const story = await viewStory(ctx, 'story-1', 1);
  assert.deepEqual(upsertData.update.seenItemIds, ['item-0', 'item-1']);
  assert.equal(upsertData.update.lastItemSortOrder, 1);
  assert.equal(story.viewerCount, 1);
  assert.equal(story.seen, true);
});

test('interactive poll stickers persist a real per-user response', async () => {
  const viewer = { id: 'viewer-2', role: 'user', status: 'active', signupSource: 'web', name: 'Poll Viewer', avatar: null };
  let saved;
  const story = {
    id: 'story-poll', authorId: author.id, author, visibility: 'public', allowReplies: true,
    status: 'active', expiresAt: new Date(Date.now() + 60_000), deletedAt: null, audiences: [], views: [],
    items: [{
      id: 'item-poll', storyId: 'story-poll', type: 'image', sortOrder: 0,
      overlays: [{ id: 'poll-1', type: 'poll', options: [{ id: 'yes', text: 'Yes' }, { id: 'no', text: 'No' }] }]
    }]
  };
  const ctx = {
    user: viewer,
    prisma: {
      user: { update: async () => viewer },
      systemSetting: { findUnique: async () => null },
      socialStory: { updateMany: async () => ({ count: 0 }), findUnique: async () => story },
      socialBlock: { findFirst: async () => null },
      socialStoryInteraction: {
        upsert: async ({ create }) => {
          saved = create;
          return { id: 'interaction-1', createdAt: new Date(), updatedAt: new Date(), user: viewer, ...create };
        }
      },
      notification: { create: async ({ data }) => ({ id: 'notification-1', ...data }) }
    }
  };

  const interaction = await interactWithStory(ctx, {
    storyId: story.id, itemId: 'item-poll', kind: 'poll_vote', key: 'poll-1', value: { optionId: 'yes' }
  });
  assert.equal(saved.kind, 'poll_vote');
  assert.deepEqual(saved.value, { optionId: 'yes' });
  assert.equal(interaction.userProfile, null);
});

test('followers and custom stories deny a viewer outside the audience', async () => {
  const viewer = { id: 'outsider-1', role: 'user', status: 'active', signupSource: 'web', name: 'Outsider' };
  const base = {
    id: 'private-story', authorId: author.id, author, allowReplies: true, status: 'active',
    expiresAt: new Date(Date.now() + 60_000), deletedAt: null, audiences: [], items: [], views: [],
    _count: { views: 0, reactions: 0, replies: 0 }, createdAt: new Date(), updatedAt: new Date()
  };
  let visibility = 'followers';
  const ctx = {
    user: viewer,
    prisma: {
      user: { update: async () => viewer }, systemSetting: { findUnique: async () => null },
      socialStory: { updateMany: async () => ({ count: 0 }), findUnique: async () => ({ ...base, visibility }) },
      socialBlock: { findFirst: async () => null }, socialFollow: { findUnique: async () => null }
    }
  };
  assert.equal(await getStory(ctx, base.id), null);
  visibility = 'custom';
  assert.equal(await getStory(ctx, base.id), null);
  visibility = 'unexpected_database_value';
  assert.equal(await getStory(ctx, base.id), null);
});

test('expired stories are archived before a non-owner can read them', async () => {
  const viewer = { id: 'viewer-expired', role: 'user', status: 'active', signupSource: 'web', name: 'Viewer' };
  let status = 'active';
  const ctx = {
    user: viewer,
    prisma: {
      user: { update: async () => viewer }, systemSetting: { findUnique: async () => null },
      socialStory: {
        updateMany: async () => { status = 'archived'; return { count: 1 }; },
        findUnique: async () => ({
          id: 'expired-story', authorId: author.id, author, visibility: 'public', allowReplies: true,
          status, expiresAt: new Date(Date.now() - 1000), deletedAt: null, audiences: [], items: [], views: [],
          _count: { views: 0, reactions: 0, replies: 0 }, createdAt: new Date(), updatedAt: new Date()
        })
      }
    }
  };
  assert.equal(await getStory(ctx, 'expired-story'), null);
});

test('story deletion remains available when posting is disabled and hides its legacy post', async () => {
  const calls = [];
  const story = { id: 'story-delete', authorId: author.id, legacyPostId: 'legacy-post-1', status: 'active' };
  const ctx = {
    user: author,
    prisma: {
      socialStory: {
        findUnique: async () => story,
        update: async ({ data }) => { calls.push(['story', data]); return { ...story, ...data }; }
      },
      socialStoryItem: { updateMany: async ({ data }) => { calls.push(['items', data]); return { count: 1 }; } },
      socialPost: { updateMany: async ({ data }) => { calls.push(['legacy', data]); return { count: 1 }; } },
      auditLog: { create: async () => ({ id: 'audit-1' }) },
      $transaction: async (operations) => Promise.all(operations)
    }
  };
  assert.equal(await deleteStory(ctx, story.id), true);
  assert.equal(calls.find(([target]) => target === 'legacy')[1].status, 'deleted');
  assert.ok(calls.find(([target]) => target === 'legacy')[1].deletedAt instanceof Date);
});
