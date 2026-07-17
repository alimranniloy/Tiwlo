import test from 'node:test';
import assert from 'node:assert/strict';
import { appOrigin } from '../src/core/email.js';
import { adminResolveReport, feedModulePositions, markConversationRead, reportContent, startCall, updateConversationMember } from '../src/modules/social/service.js';

test('feed modules start early then use varied stable gaps', () => {
  const first = feedModulePositions('user-1', 60, '2026-07-17');
  const second = feedModulePositions('user-1', 60, '2026-07-17');
  assert.deepEqual(first, second);
  assert.equal(first[0], 2);
  assert.ok(first.length >= 4);
  const gaps = first.slice(1).map((position, index) => position - first[index]);
  assert.ok(gaps.every((gap) => gap >= 5));
  assert.ok(new Set(gaps).size > 1);
});

test('customer email links never use a localhost origin', { concurrency: false }, () => {
  const previous = {
    PUBLIC_APP_URL: process.env.PUBLIC_APP_URL,
    FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN,
    APP_ORIGIN: process.env.APP_ORIGIN,
    FRONTEND_URL: process.env.FRONTEND_URL,
    CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
    APP_URL: process.env.APP_URL
  };
  try {
    process.env.PUBLIC_APP_URL = '';
    process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
    process.env.APP_ORIGIN = '';
    process.env.FRONTEND_URL = '';
    process.env.CLIENT_ORIGIN = '';
    process.env.APP_URL = 'http://127.0.0.1:4000';
    assert.equal(appOrigin(), 'https://tiwlo.com');
    process.env.PUBLIC_APP_URL = 'https://tiwlo.com/';
    assert.equal(appOrigin(), 'https://tiwlo.com');
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('a social report creates a confidential Support Center notification', async () => {
  const notifications = [];
  const ctx = {
    user: { id: 'reporter-1', role: 'user', status: 'active', name: 'Reporter' },
    prisma: {
      user: { update: async () => ({ id: 'reporter-1' }) },
      systemSetting: { findUnique: async () => null },
      socialReport: {
        create: async ({ data }) => ({ id: 'report-1', status: 'open', ...data })
      },
      notification: {
        create: async ({ data }) => { notifications.push(data); return { id: 'notification-1', ...data }; }
      }
    }
  };
  const report = await reportContent(ctx, 'post', 'post-1', 'spam', 'Repeated spam');
  assert.equal(report.id, 'report-1');
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].ownerId, 'reporter-1');
  assert.equal(notifications[0].metadata.destination, 'support_center');
  assert.equal(notifications[0].metadata.noReply, true);
  assert.match(notifications[0].message, /will not know who sent it/i);
});

test('resolving a report creates an anonymous guideline decision', async () => {
  const notifications = [];
  const report = {
    id: 'report-2', reporterId: 'reporter-2', targetType: 'post', targetId: 'post-2', status: 'open'
  };
  const ctx = {
    user: { id: 'admin-1', role: 'admin', status: 'active' },
    prisma: {
      socialReport: {
        findUnique: async () => report,
        update: async ({ data }) => ({ ...report, ...data })
      },
      notification: {
        create: async ({ data }) => { notifications.push(data); return { id: 'notification-2', ...data }; }
      },
      auditLog: { create: async ({ data }) => ({ id: 'audit-1', ...data }) }
    }
  };
  await adminResolveReport(ctx, report.id, 'resolved', 'Removed after review');
  assert.equal(notifications[0].type, 'report_reviewed');
  assert.match(notifications[0].message, /does not follow our Community Guidelines/i);
  assert.match(notifications[0].message, /will not know who submitted/i);
});

test('reading a conversation clears its server message notifications', async () => {
  const notificationUpdates = [];
  const member = { conversationId: 'chat-1', userId: 'user-1', lastReadAt: null, user: { id: 'user-1' } };
  const ctx = {
    user: { id: 'user-1', role: 'user', status: 'active' },
    prisma: {
      socialConversationMember: {
        findUnique: async () => member,
        update: async ({ data }) => ({ ...member, ...data })
      },
      socialMessage: {
        updateMany: async () => ({ count: 2 }),
        count: async () => 0
      },
      notification: {
        updateMany: async (args) => { notificationUpdates.push(args); return { count: 1 }; }
      },
      socialConversation: {
        findUnique: async () => ({ id: 'chat-1', members: [member], messages: [] })
      },
      socialBlock: { findMany: async () => [] },
      $transaction: async (operations) => Promise.all(operations)
    }
  };
  const conversation = await markConversationRead(ctx, 'chat-1');
  assert.equal(conversation.unreadCount, 0);
  assert.equal(notificationUpdates.length, 1);
  assert.deepEqual(notificationUpdates[0].where.type.in, ['message', 'message_request']);
  assert.equal(notificationUpdates[0].data.status, 'read');
});

test('deleting a conversation hides its messages only for the requesting user', async () => {
  const deletionBatches = [];
  const memberUpdates = [];
  const membership = { id: 'member-1', conversationId: 'chat-1', userId: 'user-1', lastReadAt: null };
  const ctx = {
    user: { id: 'user-1', role: 'user', status: 'active', signupSource: 'web' },
    prisma: {
      user: { update: async () => ({ id: 'user-1' }) },
      systemSetting: { findUnique: async () => null },
      socialConversationMember: {
        findUnique: async () => membership,
        update: async ({ data }) => { memberUpdates.push(data); return { ...membership, ...data }; }
      },
      socialConversation: {
        findUnique: async () => ({ id: 'chat-1', type: 'direct', members: [membership], messages: [] })
      },
      socialMessage: { findMany: async () => [{ id: 'message-1' }, { id: 'message-2' }] },
      socialMessageDeletion: {
        createMany: async ({ data }) => { deletionBatches.push(data); return { count: data.length }; }
      },
      notification: { updateMany: async () => ({ count: 1 }) },
      $transaction: async (operations) => Promise.all(operations)
    }
  };
  const result = await updateConversationMember(ctx, { id: 'chat-1', deleteForMe: true });
  assert.equal(result, null);
  assert.deepEqual(deletionBatches[0], [
    { messageId: 'message-1', userId: 'user-1' },
    { messageId: 'message-2', userId: 'user-1' }
  ]);
  assert.equal(memberUpdates[0].archived, false);
  assert.ok(memberUpdates[0].lastReadAt instanceof Date);
});

test('calls report busy and use calling until an offline callee reaches the API', async () => {
  const created = [];
  let busy = false;
  let calleeLastActiveAt = new Date(Date.now() - 5 * 60_000);
  const ctx = {
    user: { id: 'caller-1', role: 'user', status: 'active', signupSource: 'web', name: 'Caller' },
    prisma: {
      user: {
        update: async () => ({ id: 'caller-1' }),
        findUnique: async () => ({
          id: 'callee-1', status: 'active', name: 'Callee', avatar: null,
          socialLastActiveAt: calleeLastActiveAt,
          socialProfile: { privacy: { allowCalls: true } }
        })
      },
      systemSetting: { findUnique: async () => null },
      socialBlock: { findFirst: async () => null },
      socialCallSession: {
        updateMany: async () => ({ count: 0 }),
        findFirst: async () => busy ? { id: 'busy-call' } : null,
        create: async ({ data }) => {
          const value = { id: `call-${created.length + 1}`, caller: ctx.user, callee: { id: 'callee-1', name: 'Callee' }, ...data };
          created.push(value);
          return value;
        }
      },
      notification: { create: async ({ data }) => ({ id: 'notice-1', ...data }) }
    }
  };
  const offlineCall = await startCall(ctx, { calleeId: 'callee-1', type: 'audio' });
  assert.equal(offlineCall.status, 'calling');

  calleeLastActiveAt = new Date();
  const onlineCall = await startCall(ctx, { calleeId: 'callee-1', type: 'video' });
  assert.equal(onlineCall.status, 'ringing');

  busy = true;
  await assert.rejects(
    () => startCall(ctx, { calleeId: 'callee-1', type: 'audio' }),
    /Line busy/i
  );
});
