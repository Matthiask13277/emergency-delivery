'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const syncSource = fs.readFileSync(path.join(__dirname, '..', 'sync.js'), 'utf8');

function createHarness(fetchImpl) {
  const values = new Map();
  let nextId = 0;
  const localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
  Object.defineProperty(localStorage, 'edv10', {
    get() { return values.get('edv10') || ''; },
    set(value) { values.set('edv10', String(value)); }
  });
  localStorage.edv10 = 'test-token';

  const sandbox = {
    localStorage,
    navigator: { onLine: true },
    fetch: (...args) => fetchImpl(...args),
    window: { addEventListener() {} },
    setInterval() {},
    crypto: { randomUUID: () => 'action-' + (++nextId) },
    console,
    Promise,
    Set,
    JSON,
    Date,
    Math,
    String
  };
  vm.runInNewContext(syncSource, sandbox, { filename: 'sync.js' });
  return {
    sandbox,
    queue() { return JSON.parse(values.get('ed_v11_queue') || '[]'); }
  };
}

test('removes only actions confirmed successful by the server', async () => {
  const h = createHarness(async () => ({
    ok: true,
    json: async () => ({ results: [{ id: 'action-1', ok: true }] })
  }));
  h.sandbox.edEnqueue({ type: 'signature', stopId: 'stop-1' });
  h.sandbox.edEnqueue({ type: 'photo', stopId: 'stop-2' });

  await h.sandbox.edSync();

  assert.deepEqual(h.queue().map(action => action.id), ['action-2']);
});

test('keeps unacknowledged or failed actions queued', async () => {
  const h = createHarness(async () => ({
    ok: true,
    json: async () => ({ results: [{ id: 'action-1', ok: false }] })
  }));
  h.sandbox.edEnqueue({ type: 'signature', stopId: 'stop-1' });

  await h.sandbox.edSync();

  assert.deepEqual(h.queue().map(action => action.id), ['action-1']);
});

test('preserves actions enqueued while a sync request is in flight', async () => {
  let resolveFetch;
  const h = createHarness(() => new Promise(resolve => { resolveFetch = resolve; }));
  const first = h.sandbox.edEnqueue({ type: 'signature', stopId: 'stop-1' });
  const syncing = h.sandbox.edSync();

  // Simulate a second offline action arriving after the request snapshot was sent.
  const second = h.sandbox.edEnqueue({ type: 'photo', stopId: 'stop-2' });
  resolveFetch({
    ok: true,
    json: async () => ({ results: [{ id: first.id, ok: true }] })
  });
  await syncing;

  assert.deepEqual(h.queue().map(action => action.id), [second.id]);
});
