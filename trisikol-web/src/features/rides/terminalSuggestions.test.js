import test from 'node:test';
import assert from 'node:assert/strict';
import { readTerminalSuggestions, terminalSuggestionKey, terminalSuggestionState } from './terminalSuggestionState.js';

const pickup = { lat: 15.22, lng: 120.56 };
const terminals = [{ id: 1, name: 'Test TODA', latitude: 15.2155, longitude: 120.5487 }];
const key = terminalSuggestionKey(pickup, terminals);

test('suggestions use the pickup and saved terminal catalog, preserving stable polling data', () => {
  assert.equal(key, terminalSuggestionKey({ ...pickup }, terminals.map((item) => ({ ...item }))));
  assert.notEqual(key, terminalSuggestionKey({ ...pickup, lat: 15.23 }, terminals));
  assert.notEqual(key, terminalSuggestionKey(pickup, [{ ...terminals[0], latitude: 15.3 }]));
  assert.notEqual(key, terminalSuggestionKey(pickup, [{ ...terminals[0], name: 'Renamed' }]));
});
test('invalid pickup coordinates cannot start a suggestion request; zero is valid', () => {
  for (const point of [null, { lat: NaN, lng: 0 }, { lat: 0, lng: Infinity }, { lat: 91, lng: 0 }, { lat: 0, lng: -181 }]) {
    assert.equal(terminalSuggestionKey(point, terminals), null);
  }
  assert.ok(terminalSuggestionKey({ lat: 0, lng: 0 }, []));
});
test('changed pickup, disabled controls and old requests cannot display stale suggestions', () => {
  const request = { key }, oldResult = { request, status: 'ready', items: terminals };
  assert.equal(terminalSuggestionState(key, request, oldResult).status, 'ready');
  assert.equal(terminalSuggestionState('new-pickup', request, oldResult).status, 'idle');
  assert.equal(terminalSuggestionState(null, request, oldResult).status, 'idle');
  assert.equal(terminalSuggestionState(key, { key }, oldResult).status, 'loading');
  assert.equal(terminalSuggestionState(key, null, oldResult).status, 'idle');
});
test('request failures stay retryable and are not converted into a recommendation', () => {
  const request = { key }, failure = { request, status: 'error', error: 'Offline' };
  assert.equal(terminalSuggestionState(key, request, failure).error, 'Offline');
  assert.equal(terminalSuggestionState(key, { key }, failure).status, 'loading');
});
test('only the explicitly unverified straight-line response contract is accepted', () => {
  const response = { distanceBasis: 'STRAIGHT_LINE', coverageVerified: false, terminals: [{ id: 1, name: 'Test TODA', straightLineDistanceKm: 0 }] };
  assert.equal(readTerminalSuggestions(response), response.terminals);
  assert.deepEqual(readTerminalSuggestions({ ...response, terminals: [] }), []);
  for (const invalid of [null, {}, { ...response, distanceBasis: 'ROAD' }, { ...response, coverageVerified: true },
    { ...response, terminals: [{ ...response.terminals[0], straightLineDistanceKm: -1 }] },
    { ...response, terminals: [{ ...response.terminals[0], straightLineDistanceKm: NaN }] }]) {
    assert.throws(() => readTerminalSuggestions(invalid), /unavailable/);
  }
});
