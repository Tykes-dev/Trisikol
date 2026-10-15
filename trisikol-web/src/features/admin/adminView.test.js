import test from 'node:test';
import assert from 'node:assert/strict';
import { filterDrivers, filterRides, terminalName } from './adminView.js';

const terminals = [{ id: 1, name: 'North TODA' }, { id: 2, name: 'South TODA' }];
const drivers = [
  { account: { name: 'Ana Driver', mobile: '09170000001' }, vehicle: { enabled: true, terminalId: 1, bodyNumber: 'A-101', plateNumber: 'ABC-123' } },
  { account: { name: 'Ben Driver', mobile: '09170000002' }, vehicle: { enabled: false, terminalId: 2, bodyNumber: '', plateNumber: '' } },
];
const rides = ['REQUESTED', 'OFFERED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((status, index) => ({
  id: index + 1, status, driver: index === 0 ? null : { name: 'Ana Driver' }, passenger: null,
  fare: { pickupLabel: 'Market', dropoffLabel: 'School', terminalName: 'North TODA', source: index === 5 ? 'WALK_IN' : 'APP' },
}));

test('driver search supports names, mobile numbers, body/plate numbers and TODA, ignoring case and outer spaces', () => {
  for (const search of [' ANA ', '00001', 'a-101', 'abc-123', 'north toda']) {
    assert.deepEqual(filterDrivers(drivers, terminals, search, 'all'), [drivers[0]]);
  }
});
test('driver eligibility filter combines with search and does not treat suspension as deletion', () => {
  assert.deepEqual(filterDrivers(drivers, terminals, '', 'enabled'), [drivers[0]]);
  assert.deepEqual(filterDrivers(drivers, terminals, 'south', 'suspended'), [drivers[1]]);
  assert.equal(filterDrivers(drivers, terminals, 'north', 'suspended').length, 0);
  assert.equal(drivers.length, 2);
  assert.equal(terminalName(terminals, 99), 'Unassigned TODA');
});
test('active trip filter includes all four active server states and excludes final states', () => {
  assert.equal(filterRides(rides, '', 'active').length, 4);
  assert.deepEqual(filterRides(rides, '', 'COMPLETED'), [rides[4]]);
  assert.deepEqual(filterRides(rides, '', 'CANCELLED'), [rides[5]]);
});
test('trip search handles unassigned drivers, walk-ins, trip numbers and combined status filtering', () => {
  assert.deepEqual(filterRides(rides, '#1', 'all'), [rides[0]]);
  assert.deepEqual(filterRides(rides, 'walk-in', 'CANCELLED'), [rides[5]]);
  assert.equal(filterRides(rides, 'school', 'active').length, 4);
  assert.equal(filterRides(rides, 'ana', 'all').length, 5);
  assert.equal(filterRides(rides, 'missing', 'all').length, 0);
});
