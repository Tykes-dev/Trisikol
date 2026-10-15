# Development progress

Updated: 2026-10-15. Current local branch: `codex/admin-analytics-reports`, built
on `codex/trip-receipts`, `codex/driver-mobile-ui`, `codex/nearby-toda-suggestions`
and `codex/admin-mobile-ui`, in that dependency order. These five local feature
branches are not pushed yet. Main already contains the notifications, multiple-TODA, and
local-demo recovery features. This remains a cash-trip portfolio project, not a
production transport service or native mobile build.

## Implemented

- Passenger registration, session login/logout, CSRF, BCrypt passwords and three backend-enforced roles.
- Admin-created driver accounts, vehicle registration, eligibility/suspension, and TODA assignments.
- Profile-name editing and local-demo password recovery with expiring single-use codes and old-session revocation. Local outbox delivery is not SMS.
- Multiple saved TODAs with separate FIFO queues and fare policies; no overlapping active driver assignments.
- Server road-route fare quotes with five-minute expiry and persisted price/policy snapshots.
- Requested, offered, accepted, in-progress, completed and cancelled trip states; offers expire after 60 seconds and unaccepted requests after 15 minutes when state is processed.
- App passengers pay matrix fare plus the service fee. Cash completion records driver net and platform fees due once; repeated completion is idempotent.
- Walk-ins use the queue head and charge no app service fee.
- Saved passenger/driver histories, admin trip-event history, operational totals and cash ledger.
- Account-private saved notifications, unread counts and read actions; foreground polling rather than background push.
- Original-style passenger map and booking sheet; original-style responsive admin roster, sidebar/bottom navigation and dialogs.
- Driver phone navigation, action-first terminal/trip cards, confirmation dialogs, history filters and separate earnings/vehicle screens.
- Authorized completed-trip receipts with saved cash/fare amounts, HTML download and browser print controls. These are not tax invoices.
- Admin Manila-date/TODA cash analytics, daily/source/TODA breakdowns, snapshot-consistent analytics and detailed trip CSV exports.
- Nearby TODA suggestions from the pickup pin. They use approximate straight-line proximity, not fare distance or verified service coverage. Selecting a TODA keeps both pins and requests a fresh road-route quote.
- Mobile manifest and public offline fallback. Offline bookings are not supported or confirmed.

## Current verification

- 52 backend tests: no failures, errors, or skips; backend packaging passes.
- 27 frontend helper tests, frontend lint, and production build pass. The large JavaScript bundle and existing large logo still need performance work.
- Previous isolated browser checks covered the cash-trip lifecycle, walk-ins, history, profile edits, notifications, TODA separation, recovery, persisted cash records after restart, and the production offline fallback. See module docs for the exact scope and dates.
- Admin UI checks covered 320×568, 390×844, 768×1024 and 1280×800 viewports, actual isolated saves, backend rejection messages and keyboard/dialog behavior. See `ADMIN_UI.md`.
- Nearby-TODA checks covered ranking, explicit/manual choice, both pins staying unchanged, quote replacement with booking disabled while loading, clearing old suggestions after pickup/catalog changes, and scrollable 320px/390px layouts. See `NEARBY-TODAS.md`.
- Driver/receipt/report browser checks cover synthetic cash completion, history/earnings, receipt persistence after restart, an actual HTML receipt download, date/TODA report filters, empty results, an actual analytics CSV download/read-back and 320/390px layouts. See `DRIVER_MOBILE.md`, `TRIP_RECEIPTS.md` and `ADMIN_REPORTS.md` for the exact scope and manual checks.
- Migration V7 adds only a cash-reporting index. UI saves use an isolated database and synthetic accounts, not normal user records.
- The regular local backend was restarted after an offline, hash-verified database backup. All seven migrations validated, V7 applied, and frontend/backend HTTP checks passed. No normal trip records were created or reset. Existing browser sessions require signing in again after the restart.

Browser resizing does not prove physical-phone GPS, installation, Safari/virtual
keyboard behavior, or native/background operation. MySQL runtime and public
hosting have not been validated. Historical fare examples and test instructions
remain in `TESTING.md`; they are not approved transport prices.

## Next portfolio priorities

These improve a realistic resume demonstration without pretending to run a real
transport/payment service:

1. **Physical-phone and export checks:** test all roles, GPS/virtual keyboard, native browser printing/PDF and opening both CSVs in a spreadsheet. Responsive browser checks are not physical-device certification.
2. **Broader admin audit trail:** trace vehicle/eligibility/TODA changes as well as the existing fare revisions and trip events. Do not add extra roles unless an actual workflow needs them.
3. **Deployment readiness:** exercise MySQL migrations and locking, add automated CI checks, choose hosting, verify HTTPS/session cookies, backups/restore, error monitoring and mobile load performance. Public deployment needs an explicit provider/cost decision.

## Real-operation features still unfinished

| Area | Current limitation / needed decision |
| --- | --- |
| Service-area matching | Suggestions compare terminal proximity only. Actual approved boundaries, pickup eligibility, operating rules and operator ownership must be specified. |
| Live driver tracking | No background/foreground GPS sharing or passenger tracking map. Requires consent, freshness/accuracy handling and trip-scoped privacy rules. |
| Phone and identity checks | No SMS verification, verified driver documents, or passenger discount eligibility workflow. The current 20% category discount is a placeholder. |
| Production recovery and push | Local recovery and foreground notifications work, but real SMS delivery and background push providers are not connected. |
| Fee remittance / settlement | Cash ledger records fees due, not proof of collection, payment, or remittance. Reconciliation rules and approval responsibilities are still needed. |
| Electronic payments (optional) | Cash only. A real provider, fees, refunds and payment/webhook lifecycle would need a separate agreed scope. Not required for an honest cash-only portfolio. |
| Mobile distribution | Responsive web/PWA metadata exists; physical-device verification and a decision between PWA distribution and native packaging are still needed. |

Do not treat proximity, client GPS, demo discount categories or an administrator's
editable price as regulatory approval. Prices, fee handling, location thresholds,
timeouts and dispatch rules require operator review before real use. Local mode
disables physical-presence checks for desk testing; client GPS is not proof
against spoofing.

Local databases, backups, outbox files and screenshots stay ignored and are not
published to GitHub. None of the remaining provider-dependent work should be
presented as implemented until it is connected and tested.
