export function manilaDate(value = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function defaultReportFilters(value = new Date(), days = 7) {
  const to = manilaDate(value);
  const start = new Date(`${to}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { from: start.toISOString().slice(0, 10), to, terminalId: '' };
}
export const reportFilterKey = ({ from, to, terminalId }) => JSON.stringify([from, to, String(terminalId || '')]);
export function reportPath(filters) {
  const query = new URLSearchParams({ from: filters.from, to: filters.to });
  if (filters.terminalId) query.set('terminalId', filters.terminalId);
  return `/admin/reports?${query}`;
}
export function reportView(key, request, result) {
  if (key !== request.key) return { status: 'changed' };
  if (result?.request !== request) return { status: 'loading' };
  return result.error ? { status: 'error', error: result.error } : { status: 'ready', report: result.report };
}
export function csvCell(value) {
  let text = value == null ? '' : String(value);
  // Quoting alone does not stop spreadsheet formula execution. Inspect leading
  // whitespace/control characters too, including NBSP and BOM.
  let inspected = text.trimStart();
  while (inspected && (inspected.charCodeAt(0) < 32 || inspected.charCodeAt(0) === 127)) inspected = inspected.slice(1).trimStart();
  if ((inspected && '=+-@'.includes(inspected[0])) || ['\t', '\r', '\n'].some((prefix) => text.startsWith(prefix))) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}
export function csvDocument(rows) { return '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'; }
const metrics = [
  ['completedTrips', 'Completed cash trips', 'trips', 0], ['cashCollected', 'Cash collected', 'PHP', 2],
  ['driverNet', 'Driver net', 'PHP', 2], ['platformFeesDue', 'Platform fees due', 'PHP', 2],
  ['discountAmount', 'Demo discounts', 'PHP', 2], ['distanceKm', 'Saved road distance', 'km', 3],
  ['averageCashFare', 'Average cash fare', 'PHP', 2],
];
export function readReport(report, filters) {
  const validTotals = (totals) => totals && metrics.every(([key]) => typeof totals[key] === 'number' && Number.isFinite(totals[key]) && totals[key] >= 0)
    && Number.isSafeInteger(totals.completedTrips)
    && Math.round(totals.cashCollected * 100) === Math.round(totals.driverNet * 100) + Math.round(totals.platformFeesDue * 100);
  if (!report || report.from !== filters.from || report.to !== filters.to
    || String(report.terminalId || '') !== String(filters.terminalId || '')
    || report.timezone !== 'Asia/Manila' || report.dateBasis !== 'CASH_RECORDED_AT'
    || !Number.isFinite(Date.parse(report.generatedAt)) || !validTotals(report.totals)
    || !Array.isArray(report.trips) || report.trips.length !== report.totals.completedTrips
    || !['daily', 'byTerminal', 'bySource'].every((key) => Array.isArray(report[key])
      && report[key].every((item) => validTotals(item.totals))
      && report[key].reduce((sum, item) => sum + item.totals.completedTrips, 0) === report.totals.completedTrips)) {
    throw new Error('The report response could not be verified. Retry loading saved records.');
  }
  return report;
}
export function analyticsCsv(report) {
  const rows = [['section', 'group_id', 'group_label', 'metric', 'value', 'unit', 'from_date', 'to_date', 'time_zone', 'date_basis', 'toda_scope', 'snapshot_generated_at_utc']];
  function append(section, id, label, totals) {
    for (const [key, name, unit, decimals] of metrics) rows.push([section, id, label, name, Number(totals[key]).toFixed(decimals), unit,
      report.from, report.to, report.timezone, report.dateBasis, report.terminalId || 'ALL', report.generatedAt]);
  }
  append('TOTAL', report.terminalId || 'ALL', report.terminalName, report.totals);
  report.daily.forEach((day) => append('DAILY', day.date, day.date, day.totals));
  report.byTerminal.forEach((item) => append('TODA', item.terminalId, item.terminalName, item.totals));
  report.bySource.forEach((item) => append('SOURCE', item.source, item.source === 'WALK_IN' ? 'Walk-in' : 'App booking', item.totals));
  return csvDocument(rows);
}
export function tripRowsCsv(report) {
  const rows = [['trip_id', 'toda_id', 'toda_name_current', 'driver_id', 'source', 'category', 'policy_id',
    'cash_recorded_at_utc', 'cash_recorded_date_manila', 'completed_at_utc', 'road_distance_km',
    'matrix_fare_before_discount_php', 'demo_discount_php', 'cash_collected_php', 'driver_net_php', 'platform_fees_due_php', 'snapshot_generated_at_utc']];
  for (const trip of report.trips) rows.push([trip.rideId, trip.terminalId, trip.terminalName, trip.driverId, trip.source, trip.category, trip.policyId,
    trip.cashRecordedAt, manilaDate(new Date(trip.cashRecordedAt)), trip.completedAt, Number(trip.distanceKm).toFixed(3),
    Number(trip.rawFare).toFixed(2), Number(trip.discountAmount).toFixed(2), Number(trip.cashCollected).toFixed(2),
    Number(trip.driverNet).toFixed(2), Number(trip.platformFeesDue).toFixed(2), report.generatedAt]);
  return csvDocument(rows);
}
export function reportFilename(report, kind) {
  return `trisikol-${kind}-${report.from}-to-${report.to}-${report.terminalId ? `toda-${report.terminalId}` : 'all-todas'}.csv`;
}
