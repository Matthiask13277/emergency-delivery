'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(__dirname, '..', 'service-worker.js'), 'utf8');

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing source marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

test('all-staff push sender targets every active employee with a registered subscription', () => {
  const sender = section(server, 'async function v81SendPushAllUsers(', '// V82 driver day view');
  assert.match(sender, /join users u on u\.id=ps\.user_id where u\.active=true/);
  assert.doesNotMatch(sender, /role in\s*\(/);
  assert.match(sender, /webpush\.sendNotification/);
  assert.match(sender, /statusCode===404\|\|e\.statusCode===410/);
});

test('new trip inserts through the shared query helper trigger a push', () => {
  const helper = section(server, 'const q=async(s,p=[])=>{', 'async function ensureDelayCommunicationSchema()');
  assert.match(helper, /v81SendPushAllUsers/);
  assert.match(helper, /v81SendPushAllUsers/);
  assert.match(server, /Push neue Fahrt/);
});

test('calendar event creation sends an all-staff push after saving the event', () => {
  const calendar = section(server, "app.post('/api/calendar/events'", "app.patch('/api/calendar/events/:id'");
  assert.match(calendar, /insert into calendar_events/);
  assert.match(calendar, /v81SendPushAllUsers\("Neuer Kalendereintrag"/);
  assert.ok(calendar.indexOf('insert into calendar_events') < calendar.indexOf('v81SendPushAllUsers'));
});

test('login offers an opt-in push setup and stores the browser subscription', () => {
  assert.match(html, /function offerPushSetup\(\)/);
  assert.match(html, /Notification\.requestPermission\(\)/);
  assert.match(html, /pushManager\.subscribe/);
  assert.match(html, /\/api\/notifications\/push-subscription/);
  assert.match(html, /Push aktivieren/);
  assert.match(html, /Später/);
});

test('service worker displays pushes and opens the app when clicked', () => {
  assert.match(serviceWorker, /addEventListener\("push"/);
  assert.match(serviceWorker, /showNotification\(title, options\)/);
  assert.match(serviceWorker, /addEventListener\("notificationclick"/);
});
