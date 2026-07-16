import test from 'node:test';
import assert from 'node:assert/strict';
import { decisionFromNsfwPredictions, moderateText, recordModerationDecision } from '../src/modules/social/moderation.js';

test('local NSFW predictions block high-confidence pornographic media', () => {
  const result = decisionFromNsfwPredictions([
    { className: 'Porn', probability: .91 },
    { className: 'Neutral', probability: .05 },
    { className: 'Hentai', probability: .02 }
  ]);
  assert.equal(result.decision, 'block');
  assert.equal(result.provider, 'nsfwjs-mobilenet-v2-mid');
});

test('local NSFW predictions hold uncertain sexual media for review', () => {
  const result = decisionFromNsfwPredictions([
    { className: 'Sexy', probability: .78 },
    { className: 'Neutral', probability: .2 }
  ]);
  assert.equal(result.decision, 'review');
});

test('local NSFW predictions allow a strongly neutral image', () => {
  const result = decisionFromNsfwPredictions([
    { className: 'Neutral', probability: .96 },
    { className: 'Porn', probability: .01 },
    { className: 'Sexy', probability: .01 }
  ]);
  assert.equal(result.decision, 'allow');
});

test('explicit solicitation text still blocks without a remote provider', () => {
  assert.equal(moderateText('full nude sex video').decision, 'block');
  assert.equal(moderateText('xxx boobs upload').decision, 'block');
  assert.equal(moderateText('\u09aa\u09b0\u09cd\u09a8 \u09ad\u09bf\u09a1\u09bf\u0993').decision, 'block');
});

test('high-confidence visible nudity is blocked even when porn score is low', () => {
  const result = decisionFromNsfwPredictions([
    { className: 'Sexy', probability: .92 },
    { className: 'Porn', probability: .03 }
  ]);
  assert.equal(result.decision, 'block');
});

test('a blocked media decision disables the account and rejects the post', async () => {
  const updates = [];
  const prisma = {
    socialModerationEvent: { create: async () => ({ id: 'event-1' }) },
    user: { update: async (args) => { updates.push(['user', args]); return args; } },
    socialPost: { update: async (args) => { updates.push(['post', args]); return args; } },
    auditLog: { create: async (args) => args.data },
    systemSetting: { findUnique: async () => null }
  };
  await recordModerationDecision(
    { prisma, user: { id: 'user-1' } },
    {
      userId: 'user-1', postId: 'post-1', targetType: 'post', targetId: 'media-1',
      result: { decision: 'block', category: 'sexual/explicit', score: .97, reason: 'Explicit media' }
    }
  );
  assert.equal(updates.find(([type]) => type === 'user')[1].data.status, 'disabled');
  assert.equal(updates.find(([type]) => type === 'post')[1].data.moderationStatus, 'blocked');
});
