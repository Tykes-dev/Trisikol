export const receiptMoney = (value) => `PHP ${Number(value).toFixed(2)}`;
export const receiptDate = (value) => new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(value));
export function receiptRows(receipt) {
  return [
    ['Receipt number', receipt.receiptNumber], ['Trip', `#${receipt.rideId}`], ['TODA / terminal', receipt.terminalName],
    ['Driver', receipt.driverName], ['Passenger', receipt.passengerName],
    ['Booking type', receipt.source === 'WALK_IN' ? 'Walk-in' : 'App booking'], ['Passenger category', receipt.category],
    ['Pickup', receipt.pickupLabel], ['Drop-off', receipt.dropoffLabel], ['Road distance', `${Number(receipt.distanceKm).toFixed(3)} km`],
    ['Matrix fare before discount', receiptMoney(receipt.rawFare)], ['Demo discount', receiptMoney(receipt.discountAmount)],
    ['Driver net / discounted matrix fare', receiptMoney(receipt.driverNet)],
    ['Passenger-paid app fee', receiptMoney(receipt.platformFeesDue)], ['Cash collected', receiptMoney(receipt.cashCollected)],
    ['Fare policy', `#${receipt.policyId}`], ['Booked · Manila time', receiptDate(receipt.bookedAt)],
    ['Completed · Manila time', receiptDate(receipt.completedAt)], ['Cash recorded · Manila time', receiptDate(receipt.cashRecordedAt)],
  ];
}
export const receiptNotice = 'Portfolio cash-trip summary, not a tax invoice. Cash completion is recorded by the driver, not independently verified by a payment provider. Platform fees due are not proof of remittance. Names reflect current records; fare and cash amounts are saved trip snapshots.';
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
export function receiptHtml(receipt) {
  const rows = receiptRows(receipt).map(([label, value]) => `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(receipt.receiptNumber)} · TrisiKol receipt</title><style>body{font:15px/1.6 system-ui,sans-serif;color:#381414;max-width:720px;margin:32px auto;padding:0 20px}h1{font-size:24px}table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{text-align:left;vertical-align:top;padding:10px 6px;border-bottom:1px solid #ddd;overflow-wrap:anywhere}th{width:44%;font-size:13px}p{color:#655549;font-size:12px}@media print{body{margin:0;color:#000}tr{break-inside:avoid}}</style></head><body><h1>TrisiKol · cash trip receipt</h1><table><caption>Completed cash trip · PHP · Asia/Manila</caption><tbody>${rows}</tbody></table><p>${escapeHtml(receiptNotice)}</p><p>Generated ${escapeHtml(receiptDate(receipt.generatedAt))} · Manila time</p></body></html>`;
}
