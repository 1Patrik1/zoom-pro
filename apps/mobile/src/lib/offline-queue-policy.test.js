import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canSyncQueuedItem,
  queueOwnerId,
  queueOwnershipError,
  stripQueuedCredentials
} from './offline-queue-policy.js';

test('queue owner IDs are normalized and missing identities are rejected', () => {
  assert.equal(queueOwnerId({ id: 123 }), '123');
  assert.equal(queueOwnerId({ id: ' user-a ' }), ' user-a ');
  assert.equal(queueOwnerId(null), null);
  assert.equal(queueOwnerId({}), null);
  assert.equal(queueOwnerId({ id: '' }), null);
});

test('queued options never retain bearer tokens', () => {
  assert.deepEqual(stripQueuedCredentials({
    method: 'POST',
    token: 'sensitive-bearer-token',
    body: { title: 'offline' }
  }), {
    method: 'POST',
    body: { title: 'offline' }
  });
});

test('only the same authenticated user can sync a queued request', () => {
  const item = { ownerUserId: 'user-a', path: '/api/logs', opts: { method: 'POST' } };
  assert.equal(canSyncQueuedItem(item, 'user-a'), true);
  assert.equal(canSyncQueuedItem(item, 'user-b'), false);
  assert.equal(canSyncQueuedItem(item, null), false);
  assert.match(queueOwnershipError(item, 'user-b'), /jinému uživateli/);
});

test('legacy queue items without an owner and previously blocked items are never sent', () => {
  const legacy = { path: '/api/logs', opts: {} };
  assert.equal(canSyncQueuedItem(legacy, 'user-a'), false);
  assert.match(queueOwnershipError(legacy, 'user-a'), /nemá uloženého vlastníka/);

  const blocked = { ownerUserId: 'user-a', blocked: true, lastError: 'manual review required' };
  assert.equal(canSyncQueuedItem(blocked, 'user-a'), false);
  assert.equal(queueOwnershipError(blocked, 'user-a'), 'manual review required');
});
