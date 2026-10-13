import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getRoadRoute } from './routing.js';

const from = [15.2155, 120.5487];
const to = [15.22, 120.55];
const payload = () => ({ code: 'Ok', routes: [{ distance: 2345.6, geometry: {
  type: 'LineString', coordinates: [[120.5487, 15.2155], [120.55, 15.22]],
} }] });
const mock = (body, ok = true) => async () => ({ ok, json: async () => body });

test('uses routed meters and converts GeoJSON longitude/latitude for Leaflet', async () => {
  const controller = new AbortController();
  const result = await getRoadRoute(from, to, { signal: controller.signal, fetchImpl: async (url, options) => {
    assert.ok(url.includes('120.5487,15.2155;120.55,15.22'));
    assert.ok(url.includes('geometries=geojson'));
    assert.ok(url.includes('radiuses=100;100'));
    assert.equal(options.signal, controller.signal);
    return { ok: true, json: async () => payload() };
  } });
  assert.equal(result.distanceKm, 2.3456);
  assert.deepEqual(result.positions, [from, to]);
});

test('rejects missing routes and unsnappable pins without an estimated fallback', async () => {
  for (const code of ['NoRoute', 'NoSegment']) {
    await assert.rejects(getRoadRoute(from, to, { fetchImpl: mock({ code }, false) }), /No road route/);
  }
});

test('rejects zero-length and malformed route responses', async () => {
  for (const distance of [0, -1, null, '2000']) {
    const data = payload();
    data.routes[0].distance = distance;
    await assert.rejects(getRoadRoute(from, to, { fetchImpl: mock(data) }), /No usable/);
  }
  const data = payload();
  data.routes[0].geometry.coordinates = [[null, 15], [120, 15]];
  await assert.rejects(getRoadRoute(from, to, { fetchImpl: mock(data) }), /No usable/);
});

test('rejects identical/invalid coordinates before requesting a route', async () => {
  const fetchImpl = () => { throw new Error('must not fetch'); };
  await assert.rejects(getRoadRoute(from, from, { fetchImpl }), /different/);
  await assert.rejects(getRoadRoute([100, 0], to, { fetchImpl }), /valid/);
});

test('propagates network failure and abort instead of returning a fare distance', async () => {
  for (const error of [new TypeError('offline'), new DOMException('cancelled', 'AbortError')]) {
    await assert.rejects(getRoadRoute(from, to, { fetchImpl: async () => { throw error; } }), (actual) => actual === error);
  }
  await assert.rejects(getRoadRoute(from, to, { fetchImpl: mock({ code: 'Error' }, false) }), /unavailable/);
});
