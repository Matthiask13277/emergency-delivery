'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing source marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

test('DDT PDF defines and consistently uses its stop list and row list', () => {
  const ddt = section(
    'async function v87BuildDdtPdf(t,stops,ddt){',
    '// V181 – direkte PDF-Downloads für DDT und Rechnungen'
  );

  assert.match(ddt, /const stopList = Array\.isArray\(stops\) \? stops : \[\]/);
  assert.match(ddt, /const rows = stopList\.map/);
  assert.match(ddt, /rows\.forEach\(/);
  assert.doesNotMatch(ddt, /\bHaltestellen\b|\bReihen\b/);
});

test('DDT PDF keeps the signature optional until one is captured', () => {
  const ddt = section(
    'async function v87BuildDdtPdf(t,stops,ddt){',
    '// V181 – direkte PDF-Downloads für DDT und Rechnungen'
  );

  assert.match(ddt, /if\(signatureData\)\s*\{/);
  assert.match(ddt, /Keine digitale Unterschrift erfasst\./);
  assert.doesNotMatch(ddt, /throw new Error\([^)]*Unterschrift/);
});

test('sweep finalization reuses the canonical DDT completion chain', () => {
  const finalize = section(
    'async function v131FinalizeDeliveredTrip(tripId){',
    'app.post("/api/workflow-v131/finalize/:tripId"'
  );

  const deliveredGuard = finalize.indexOf('stops.rows.some(x=>!x.delivered_at)');
  const canonicalCompletion = finalize.indexOf('await v15TripComplete(tripId)');
  const statusUpdate = finalize.indexOf("update trips set status='Delivered'");

  assert.notEqual(deliveredGuard, -1, 'Must refuse completion while a stop is undelivered');
  assert.ok(canonicalCompletion > deliveredGuard, 'Canonical completion must run after the stop guard');
  assert.ok(statusUpdate > canonicalCompletion, 'Trip status must only be set after the canonical completion chain');
});

test('finance report supports schemas where trips.planning_date is absent', () => {
  const economics = section(
    'app.get("/api/reports/economics"',
    '// V46: customer pricing'
  );

  assert.match(economics, /to_jsonb\(t\)->>'planning_date'/);
  assert.match(economics, /as planning_date/);
  assert.doesNotMatch(economics, /t\.planning_date/);
});

test('finance dashboard initializes its cost tables before querying them', () => {
  const schema = section(
    'async function ensureEconomicsSchema(){',
    'let economicsSchemaReady=null;'
  );
  for (const table of ['trip_costs', 'fuel_entries', 'vehicle_costs']) {
    assert.match(schema, new RegExp('CREATE TABLE IF NOT EXISTS ' + table));
  }

  const economics = section(
    'app.get("/api/reports/economics"',
    '// V46: customer pricing'
  );
  assert.match(economics, /await getEconomicsSchemaReady\(\)/);
});
