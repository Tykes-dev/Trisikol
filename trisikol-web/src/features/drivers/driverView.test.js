import test from 'node:test';
import assert from 'node:assert/strict';
import { driverActions, filterDriverTrips } from './driverView.js';
const rides = [{ id: 1, status: 'COMPLETED', passenger: null, fare: { source: 'WALK_IN', pickupLabel: 'Terminal', dropoffLabel: 'Market' } },
  { id: 2, status: 'CANCELLED', passenger: { name: 'Test Passenger' }, fare: { source: 'APP', pickupLabel: 'School', dropoffLabel: 'Market' } }];
test('driver controls expose only actions appropriate to the current server state', () => {
  assert.deepEqual(driverActions('OFFERED'), ['accept', 'decline']);
  assert.deepEqual(driverActions('ACCEPTED'), ['start', 'cancel']);
  assert.deepEqual(driverActions('IN_PROGRESS'), ['complete']);
  for (const status of ['COMPLETED', 'CANCELLED', 'REQUESTED', undefined]) assert.deepEqual(driverActions(status), []);
});
test('driver history filters combine status with trip, route, passenger and walk-in search', () => {
  assert.deepEqual(filterDriverTrips(rides, ' WALK-IN ', 'COMPLETED'), [rides[0]]);
  assert.deepEqual(filterDriverTrips(rides, '#2', 'ALL'), [rides[1]]);
  assert.deepEqual(filterDriverTrips(rides, 'passenger', 'CANCELLED'), [rides[1]]);
  assert.equal(filterDriverTrips(rides, 'market', 'ALL').length, 2);
  assert.equal(filterDriverTrips(rides, 'school', 'COMPLETED').length, 0);
});
