import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, receiptDate, receiptHtml, receiptRows } from './receiptFormat.js';
const receipt = { receiptNumber: 'TRI-00000001', rideId: 1, terminalName: 'Test TODA', driverName: 'Test Driver', passengerName: 'Test Passenger',
  source: 'APP', category: 'REGULAR', policyId: 1, pickupLabel: 'Market', dropoffLabel: 'School', distanceKm: 1.956,
  rawFare: 55, discountAmount: 0, driverNet: 55, platformFeesDue: 2, cashCollected: 57,
  bookedAt: '2026-10-14T16:30:00Z', completedAt: '2026-10-14T16:35:00Z', cashRecordedAt: '2026-10-14T16:35:00Z', generatedAt: '2026-10-14T16:40:00Z' };
test('receipt rows distinguish collected cash, driver earnings and fees due', () => {
  const rows = Object.fromEntries(receiptRows(receipt));
  assert.equal(rows['Cash collected'], 'PHP 57.00');
  assert.equal(rows['Driver net / discounted matrix fare'], 'PHP 55.00');
  assert.equal(rows['Passenger-paid app fee'], 'PHP 2.00');
  assert.equal(rows['Road distance'], '1.956 km');
});
test('receipt dates use Manila time across a UTC date boundary', () => {
  assert.match(receiptDate(receipt.bookedAt), /Oct 15, 2026/);
});
test('downloaded HTML escapes every untrusted text value and has no script or remote resources', () => {
  const html = receiptHtml({ ...receipt, passengerName: '<script>alert("x")</script>', pickupLabel: '<img src=x onerror=alert(1)>', terminalName: 'A & B' });
  assert.ok(html.includes('&lt;script&gt;')); assert.ok(html.includes('&lt;img'));
  assert.ok(html.includes('A &amp; B')); assert.ok(!html.includes('<script>')); assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('https://')); assert.ok(html.includes('not a tax invoice'));
  assert.equal(escapeHtml(`<&>"'`), '&lt;&amp;&gt;&quot;&#39;');
});
test('walk-in downloads show zero fees and a stable trip receipt number', () => {
  const html = receiptHtml({ ...receipt, source: 'WALK_IN', passengerName: 'Walk-in passenger', cashCollected: 55, platformFeesDue: 0 });
  assert.ok(html.includes('Walk-in')); assert.ok(html.includes('PHP 0.00'));
  assert.ok(html.includes('TRI-00000001')); assert.ok(html.includes('PHP 55.00'));
});
