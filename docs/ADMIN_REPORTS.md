# Admin cash-trip analytics and exports

Open Analytics & reports from the administrator sidebar, or More on a phone.
Choose inclusive From/To dates and either one TODA or all TODAs, then Generate
report. Defaults cover the latest seven Manila calendar days.

## What the numbers mean

Reports use `cash_ledger.recorded_at`, interpreted in `Asia/Manila`, rather than
the booking date. Only completed trips with consistent saved quotes and cash
entries are included. Money comes from saved records, not today's fare policy.

- Cash collected = driver net + platform fees due.
- Platform fees due are not remitted revenue or profit.
- App fees remain passenger-paid; walk-ins have no app fee.
- Counts, cash, driver net, fees due, demo discounts, saved routed kilometres
  and average cash fare are available in totals and daily/TODA/source groups.
- Empty dates remain zero. Cancelled/uncompleted trips are not collected cash.
- TODA names reflect current records; amounts and policy IDs are saved snapshots.

The chart shows up to the latest 14 days of a selection; the analytics CSV
includes every day. The trip preview shows up to 20 rows; the trip CSV includes
all selected entries, not the latest-100 history endpoint.

## Export and privacy

Both buttons export the exact loaded report snapshot. Editing filters hides the
old report and exports until another report is generated. Refreshing or a failed
load never presents old results as the new selection or substitutes false zeros.

- **Export analytics CSV:** totals plus all daily, TODA and booking-source
  metrics, with units, scope, date basis, timezone and snapshot timestamp.
- **Export trip rows CSV:** trip/TODA/driver identifiers, source, category,
  saved fare-policy ID, cash/completion timestamps, distance and monetary values.
- CSV is quoted UTF-8 with a BOM and CRLF rows. Formula-like cells are prefixed
  with an apostrophe, including dangerous prefixes after whitespace/control
  characters. No passenger names, phone numbers or precise coordinates are
  exported. Local exports still contain business data; do not commit them.
- Receipt buttons in Included trips use the same authorized receipt API as
  the trip-history screens. Receipts are cash-trip summaries, not tax invoices.

`GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD&terminalId=optional`
is admin-only, no-store, read-only and uses one repeatable-read transaction.
There is no new report-writing permission or extra role. Existing administrators
can view all TODAs; tenant-scoped administration is still future work.

Selections are limited to 1–93 days and 10,000 cash entries. Excess rows return
422 with a narrower-selection instruction, never silently truncated totals.
Bad/missing filters return 400, unknown TODAs 404, and inconsistent cash data
503 with no partial report. Migration V7 only adds a cash-date index.

## Verification on 2026-10-15

- Six new backend tests: Manila midnight boundaries, inclusive dates,
  cash-recorded rather than booking date, TODA filters, discounted app fares,
  fee-free walk-ins, consistent grouped totals, genuine empty periods, 101 rows,
  role/guest rejection, invalid filters, inconsistent data, 93-day and 10,000-row
  limits. Full backend suite: 52 tests, zero failures/errors/skips; package passed.
- Seven report helper tests: Manila defaults/leap dates, CSV quoting and formula
  protection, all metric groups, 101 exported trip rows, privacy, changed/loading/
  failed selections and response validation. Full frontend suite: 27 tests;
  lint and production build pass. Existing bundle-size warning remains.
- Isolated browser: date edits by native keyboard, TODA scope changes, stale
  exports hidden, generation of a new snapshot, empty TODA zeros, admin receipt
  opening and actual analytics CSV download/read-back.
- Fixture totals: three completed trips, PHP 174 collected, PHP 170 driver net,
  PHP 4 fees due. TODA Two: one trip, PHP 62 / PHP 60 / PHP 2. The downloaded
  TODA Two analytics CSV matched the displayed snapshot.
- Phone-width 320/390 and desktop 1280 layouts were checked. Screenshots use
  synthetic isolated data, not normal user records. Browser resizing is not a
  physical-device test. The detailed trip CSV has automated content tests;
  downloading that second file and opening either CSV in Excel remain manual.

## Your manual checks

Use the isolated launcher in `TESTING.md` before creating test cash records.

1. Finish one app booking and one walk-in. Note their cash, net, fee and TODA.
2. Admin → Analytics & reports: select their Manila cash-recorded dates and all
   TODAs. Expect both trips, cash = net + fees, and zero walk-in fees.
3. Select just one TODA. The old exports disappear before Generate report.
   Generate it; expect only that TODA's entries and matching totals.
4. Export both CSVs and open them in a spreadsheet. Compare total/grouped cash
   and the sum of trip rows. Both exports must have the same snapshot timestamp.
5. Select a period/TODA without entries. Expect zeros and a header-only trip CSV.
6. Under Included trips, open a receipt; its saved cash/policy must match the row.
7. Try a period over 93 days. Expect an error and no old report export. Retry
   with valid dates. A passenger/driver must not access the admin report API.

Production payments, reconciliation, remittance, approved discounts, operator
coverage, MySQL runtime and public deployment are not implemented by this module.
