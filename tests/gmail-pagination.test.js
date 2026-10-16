'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {listGmailMessages} = require('../gmail-pagination');

test('follows every Gmail result page and preserves request parameters', async () => {
  const calls = [];
  const pages = [
    {messages: [{id: 'newest'}], nextPageToken: 'page-2'},
    {messages: [{id: 'older-1'}, {id: 'older-2'}]}
  ];
  const fetchImpl = async (url, options) => {
    calls.push({url: new URL(url), options});
    return {ok: true, json: async () => pages[calls.length - 1]};
  };

  const result = await listGmailMessages({query: 'newer_than:2d delivery', token: 'test-token', fetchImpl});

  assert.deepEqual(result.map(message => message.id), ['newest', 'older-1', 'older-2']);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url.searchParams.get('maxResults'), '100');
  assert.equal(calls[0].url.searchParams.get('q'), 'newer_than:2d delivery');
  assert.equal(calls[0].url.searchParams.has('pageToken'), false);
  assert.equal(calls[1].url.searchParams.get('pageToken'), 'page-2');
  assert.equal(calls[1].options.headers.authorization, 'Bearer test-token');
});

test('returns an empty result after one empty page', async () => {
  let calls = 0;
  const result = await listGmailMessages({
    query: 'delivery',
    token: 'token',
    fetchImpl: async () => ({ok: true, json: async () => { calls++; return {}; }})
  });
  assert.deepEqual(result, []);
  assert.equal(calls, 1);
});

test('reports Gmail list HTTP failures', async () => {
  await assert.rejects(
    listGmailMessages({
      query: 'delivery',
      token: 'token',
      fetchImpl: async () => ({ok: false, status: 429})
    }),
    /Gmail message list failed: 429/
  );
});
