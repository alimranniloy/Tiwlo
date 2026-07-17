import test from 'node:test';
import assert from 'node:assert/strict';
import { appOrigin } from '../src/core/email.js';
import { adminResolveReport, markConversationRead, reportContent } from '../src/modules/social/service.js';

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
