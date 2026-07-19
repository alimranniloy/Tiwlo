import assert from 'node:assert/strict';
import test from 'node:test';
import { policySignals } from '../src/modules/social/ai.js';

test('Social AI deterministic policy catches Romanized Bengali threats before a model call', () => {
  const result = policySignals('toke khun korbo');
  assert.equal(result?.decision, 'violation');
  assert.equal(result?.category, 'threat');
  assert.equal(result?.severity, 'critical');
  assert.equal(result?.recommendation, 'remove_content');
});

test('Social AI deterministic policy catches Bangla and English threat variants', () => {
  assert.equal(policySignals('তোমাকে খুন করবো')?.category, 'threat');
  assert.equal(policySignals('I will kill you')?.category, 'threat');
  assert.equal(policySignals('tui ekta bokachoda')?.category, 'harassment');
});

test('Social AI retains ordinary messages as unclassified for model/manual review', () => {
  assert.equal(policySignals('Looking forward to our normal community discussion.'), null);
});
