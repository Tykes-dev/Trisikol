import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsCsv, csvCell, csvDocument, defaultReportFilters, manilaDate, reportFilename, reportFilterKey, reportPath, reportView, readReport, tripRowsCsv } from './reportExport.js';
const totals = { completedTrips: 1, cashCollected: 57, driverNet: 55, platformFeesDue: 2, discountAmount: 0, distanceKm: 1.956, averageCashFare: 57 };
const report = { from: '2026-10-15', to: '2026-10-15', terminalId: null, terminalName: 'All TODAs', timezone: 'Asia/Manila', dateBasis: 'CASH_RECORDED_AT', generatedAt: '2026-10-15T10:00:00Z',
  totals, daily: [{ date: '2026-10-15', totals }], byTerminal: [{ terminalId: 1, terminalName: 'Test TODA', totals }], bySource: [{ source: 'APP', totals }],
  trips: [{ rideId: 97, terminalId: 1, terminalName: 'Test TODA', driverId: 3, source: 'APP', category: 'REGULAR', policyId: 1, cashRecordedAt: '2026-10-14T16:35:00Z', completedAt: '2026-10-14T16:35:00Z', distanceKm: 1.956, rawFare: 55, discountAmount: 0, cashCollected: 57, driverNet: 55, platformFeesDue: 2 }] };
test('report defaults use Manila calendar dates and inclusive seven-day range', () => {
  assert.equal(manilaDate(new Date('2026-10-14T16:00:00Z')), '2026-10-15');
  assert.equal(manilaDate(new Date('2026-10-14T15:59:59Z')), '2026-10-14');
  assert.deepEqual(defaultReportFilters(new Date('2026-10-14T16:00:00Z')), { from: '2026-10-09', to: '2026-10-15', terminalId: '' });
  assert.deepEqual(defaultReportFilters(new Date('2024-03-01T00:00:00Z')), { from: '2024-02-24', to: '2024-03-01', terminalId: '' });
});
test('CSV handles commas, quotes, embedded newlines, Unicode and explicit UTF-8 BOM', () => {
  assert.equal(csvCell('A,"B"\nC'), '"A,""B""\nC"');
  assert.equal(csvCell(null), '""'); assert.equal(csvCell('TODA ñ'), '"TODA ñ"');
  assert.equal(csvDocument([['one', 'two']]), '\uFEFF"one","two"\r\n');
});
test('CSV formula guard covers dangerous prefixes after whitespace and controls', () => {
  for (const text of ['=1+1', '+SUM(A1)', '-1+2', '@SUM(A1)', '  =HYPERLINK("x")', '\t=1', '\r=1', '\n=1', '\uFEFF=1', '\u00a0=1', '\u0000\u0001 =1', '\u007f+1']) {
    assert.ok(csvCell(text).startsWith('"\''), `Unsafe formula prefix: ${JSON.stringify(text)}`);
  }
  assert.equal(csvCell('52.00'), '"52.00"');
});
test('analytics export includes total, daily, TODA and source metrics from one snapshot', () => {
  const csv = analyticsCsv(report);
  for (const section of ['TOTAL', 'DAILY', 'TODA', 'SOURCE']) assert.ok(csv.includes(`"${section}"`));
  assert.ok(csv.includes('"Cash collected","57.00","PHP"'));
  assert.ok(csv.includes('"Driver net","55.00","PHP"'));
  assert.ok(csv.includes('"Platform fees due","2.00","PHP"'));
  assert.ok(csv.includes('"Asia/Manila","CASH_RECORDED_AT"'));
  assert.equal(csv.split('\r\n').filter(Boolean).length, 29); // header + 4 groups × 7 metrics
});
test('trip export uses Manila recorded dates, all returned rows and no phone or precise-location fields', () => {
  const csv = tripRowsCsv({ ...report, trips: Array.from({ length: 101 }, (_, i) => ({ ...report.trips[0], rideId: i + 1 })) });
  assert.equal(csv.split('\r\n').filter(Boolean).length, 102);
  assert.ok(csv.includes('"2026-10-15"'));
  assert.ok(!csv.includes('mobile')); assert.ok(!csv.includes('pickup_lat')); assert.ok(!csv.includes('passenger_name'));
  assert.ok(tripRowsCsv({ ...report, trips: [] }).split('\r\n').filter(Boolean).length === 1);
  assert.equal(reportFilename(report, 'analytics'), 'trisikol-analytics-2026-10-15-to-2026-10-15-all-todas.csv');
});
test('changing filters or refreshing hides old report/export state; failed loads do not become zero data', () => {
  const filters = { from: report.from, to: report.to, terminalId: '' }, key = reportFilterKey(filters);
  const request = { key, filters }, result = { request, report };
  assert.equal(reportView(key, request, result).status, 'ready');
  assert.equal(reportView('new dates', request, result).status, 'changed');
  assert.equal(reportView(key, { ...request }, result).status, 'loading');
  assert.equal(reportView(key, request, { request, error: 'No connection' }).status, 'error');
  assert.equal(reportPath({ ...filters, terminalId: '2' }), '/admin/reports?from=2026-10-15&to=2026-10-15&terminalId=2');
});
test('invalid or partial report responses cannot be shown as legitimate zero totals', () => {
  const filters = { from: report.from, to: report.to, terminalId: '' };
  assert.equal(readReport(report, filters), report);
  for (const invalid of [null, { ...report, from: '2026-10-14' }, { ...report, timezone: 'UTC' },
    { ...report, trips: [] }, { ...report, bySource: [] }, { ...report, totals: { ...totals, cashCollected: NaN } },
    { ...report, totals: { ...totals, driverNet: 0 } }]) assert.throws(() => readReport(invalid, filters), /could not be verified/);
});
