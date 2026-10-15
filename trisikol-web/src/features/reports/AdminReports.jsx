import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { downloadText } from '../../services/download';
import { money } from '../rides/format';
import { AdminButton, AdminMetric } from '../admin/AdminUi';
import TripReceipt from '../receipts/TripReceipt';
import { defaultReportFilters, reportFilterKey, reportPath, reportView, readReport, analyticsCsv, tripRowsCsv, reportFilename } from './reportExport';
import './reports.css';

function Breakdown({ label, totals }) {
  return <article className="report-breakdown"><h3>{label}</h3><p>{totals.completedTrips} completed cash trips</p><dl><div><dt>Cash collected</dt><dd>{money(totals.cashCollected)}</dd></div><div><dt>Driver net</dt><dd>{money(totals.driverNet)}</dd></div><div><dt>Platform fees due</dt><dd>{money(totals.platformFeesDue)}</dd></div></dl></article>;
}
export default function AdminReports({ terminals }) {
  const [draft, setDraft] = useState(defaultReportFilters);
  const [request, setRequest] = useState(() => ({ key: reportFilterKey(draft), filters: { ...draft } }));
  const [result, setResult] = useState(null);
  const [exportMessage, setExportMessage] = useState('');
  useEffect(() => {
    let active = true;
    api(reportPath(request.filters)).then((report) => {
      readReport(report, request.filters);
      if (active) setResult({ request, report });
    }).catch((error) => { if (active) setResult({ request, error: error.message }); });
    return () => { active = false; };
  }, [request]);
  const view = reportView(reportFilterKey(draft), request, result);
  const report = view.report;
  const days = report?.daily.slice(-14) || [];
  const maxCash = Math.max(0, ...days.map((day) => Number(day.totals.cashCollected)));
  function apply(event) {
    event.preventDefault(); setExportMessage(''); setRequest({ key: reportFilterKey(draft), filters: { ...draft } });
  }
  function exportCsv(kind) {
    if (!report || view.status !== 'ready') return;
    try {
      downloadText(kind === 'analytics' ? analyticsCsv(report) : tripRowsCsv(report), reportFilename(report, kind), 'text/csv;charset=utf-8');
      setExportMessage('Download requested for the displayed snapshot. Check your browser’s downloads.');
    } catch { setExportMessage('The export could not start. Retry or check your browser’s download permissions.'); }
  }
  return <section className="admin-reports" aria-label="Cash trip analytics and reports">
    <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Report filters</h2><p>Completed cash trips, by cash-recorded date · Manila time</p></div><span className="admin-badge">PHP · cash only</span></div>
      <form onSubmit={apply} className="report-filters"><label>From date<input required type="date" min="2000-01-01" max="2100-12-31" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} /></label><label>To date<input required type="date" min={draft.from || '2000-01-01'} max="2100-12-31" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} /></label>
        <label>Report TODA<select value={draft.terminalId} onChange={(event) => setDraft({ ...draft, terminalId: event.target.value })}><option value="">All TODAs</option>{terminals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <AdminButton type="submit" disabled={view.status === 'loading'}>{view.status === 'loading' ? 'Loading report…' : 'Generate report'}</AdminButton>
      </form><p className="admin-muted">Inclusive dates, up to 93 days and 10,000 entries. No silent truncation. Cancelled or unfinished trips are not collected cash.</p>
    </section>
    {view.status === 'changed' && <p className="admin-notice" role="status">Filters changed. Generate a report to view and export the new selection.</p>}
    {view.status === 'loading' && <p role="status">Loading saved cash records…</p>}
    {view.status === 'error' && <div className="admin-notice admin-notice--error" role="alert">{view.error}<AdminButton variant="secondary" onClick={() => setRequest({ ...request })}>Retry report</AdminButton></div>}
    {report && <>
      <section className="admin-panel report-snapshot"><div><h2>{report.terminalName}</h2><p>{report.from} to {report.to} · Asia/Manila</p><p className="admin-muted">Snapshot: {new Date(report.generatedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} Manila time</p></div><div className="report-export-actions"><AdminButton variant="secondary" onClick={() => exportCsv('analytics')}>Export analytics CSV</AdminButton><AdminButton onClick={() => exportCsv('trips')}>Export trip rows CSV</AdminButton></div>
        <p className="admin-muted">Exports use this exact loaded snapshot: totals, daily values, TODA/source breakdowns, and all included trip rows—not only the recent-trip list.</p>{exportMessage && <p role="status">{exportMessage}</p>}
      </section>
      {!report.totals.completedTrips && <p className="admin-notice" role="status">No completed cash trips were recorded in this selection. Zero totals and empty trip exports are expected.</p>}
      <div className="admin-stats">{[['Completed cash trips', report.totals.completedTrips, 'trips'], ['Cash collected', money(report.totals.cashCollected), 'cash'], ['Driver net', money(report.totals.driverNet), 'drivers'], ['Platform fees due', money(report.totals.platformFeesDue), 'cash'], ['Demo discounts', money(report.totals.discountAmount), 'settings'], ['Average cash fare', money(report.totals.averageCashFare), 'overview']].map(([label, value, icon]) => <AdminMetric key={label} label={label} value={value} icon={icon} />)}</div>
      <p className="admin-notice">Fees due are not remitted revenue, and driver net is not platform profit. No payments, refunds, or settlements are processed here. Discounts remain demo categories. Saved routed distance: {Number(report.totals.distanceKm).toFixed(3)} km.</p>
      <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Daily cash collected</h2><p>{days.length < report.daily.length ? `Chart shows the latest ${days.length} days; all ${report.daily.length} days are included in the analytics CSV.` : 'Cash-recorded dates in Manila time. Days with no entries remain zero.'}</p></div></div><div className="report-chart">{days.map((day) => <div className="report-chart-row" key={day.date}><span>{day.date}</span><div className="report-bar-track" aria-hidden="true"><span style={{ width: `${maxCash ? Number(day.totals.cashCollected) / maxCash * 100 : 0}%` }} /></div><strong>{money(day.totals.cashCollected)}</strong><small>{day.totals.completedTrips} trips</small></div>)}</div></section>
      <div className="report-breakdowns"><section className="admin-panel"><h2>Booking source</h2>{report.bySource.map((item) => <Breakdown key={item.source} label={item.source === 'WALK_IN' ? 'Walk-ins' : 'App bookings'} totals={item.totals} />)}</section><section className="admin-panel"><h2>TODA breakdown</h2>{!report.byTerminal.length && <p>No cash entries for this period.</p>}{report.byTerminal.map((item) => <Breakdown key={item.terminalId} label={item.terminalName} totals={item.totals} />)}</section></div>
      <section className="admin-panel"><details className="report-trip-preview"><summary>Included trips ({report.trips.length})</summary><p className="admin-muted">Showing the first {Math.min(20, report.trips.length)} entries in cash-recorded order. Export trip rows includes all {report.trips.length}. Names of TODAs reflect current records; monetary values are saved snapshots.</p>{report.trips.slice(0, 20).map((trip) => <article className="report-trip-row" key={trip.rideId}><div><h3>Trip #{trip.rideId} · {money(trip.cashCollected)}</h3><p>{trip.terminalName} · {trip.source === 'WALK_IN' ? 'Walk-in' : 'App booking'}</p><small>{new Date(trip.cashRecordedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} Manila time</small></div><TripReceipt rideId={trip.rideId} /></article>)}</details></section>
    </>}
  </section>;
}
