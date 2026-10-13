# Development progress

Updated: 2026-10-13. The core single-terminal cash-trip milestone has passed local
verification on `feature/trip-validation`. This remains a portfolio application,
with the production/mobile limitations listed below.

## Implemented in this snapshot

- Session authentication, CSRF, BCrypt passwords and three backend-enforced roles.
- H2 signup regression fix and fare-policy migration with saved revision history.
- Quotes calculated on the server from OSRM road routes; policy/price snapshots expire after five minutes.
- One terminal, FIFO driver queue, vehicle eligibility and transactional driver reservation.
- Requested, offered, accepted, in-progress, completed and cancelled ride states.
- Offers expire after 60 seconds; unaccepted requests expire after 15 minutes.
  Expiry processing occurs when trip/queue state is queried or changed.
- App bookings add the platform fee to passenger cash fare. Completion records
  cash collected, driver net and platform fees due once; repeated completion is idempotent.
- Walk-ins use the first queued driver and charge no app service fee.
- Passenger/driver trip histories and an administrator trip-event history.
- Connected admin totals, fare settings, terminal settings and driver vehicles.
- Profile-name updates; mobile metadata and a public offline fallback.

## Verified results

- 22 backend tests passed and the application jar packaged successfully.
- Frontend lint, production build and five routing-helper tests passed.
- Actual V3 startup migration succeeded against the local file database, after backup.
- A server quote using explicitly approved demo coordinates returned a 1.956 km
  route, PHP 52 total and 41 route points through the frontend proxy.
- Isolated browser checks covered administrator driver creation, vehicle setup,
  terminal edits and fare revisions; passenger profile editing; FIFO assignment;
  driver acceptance/start/completion; new bookings after completion/cancellation;
  walk-ins, histories, earnings and admin audit events.
- A first-tap map selection issue was found and fixed: pin actions now open
  immediately rather than requiring another tap on the marker.
- In the isolated fixture route, policy base fare 45 yielded app cash 57/net 55/fee 2
  and walk-in cash 55/net 55/fee 0. Two completed trips produced cash 112/net 110/fee 2.
  Cancelled trips did not add ledger records.
- Restarting the isolated backend preserved the ledger, trip events, terminal,
  profile changes and fare policy; sign-in was required again.
- GPS-policy tests reject stale, imprecise, invalid and outside-terminal readings.
- Phone-width (390 × 844) and desktop browser checks were performed. The built
  preview showed the public offline fallback after the preview server was stopped.
  This does not verify physical-phone installation or native behavior.

## Remaining verification

1. Validate mobile installation, real GPS and connectivity changes on a physical phone.
2. Verify MySQL migrations and locking before switching from local H2.
3. Exercise actual interrupted-network retries on a device; automated tests cover
   repeated booking/completion idempotency, but not every transport failure.
4. Perform deployment/HTTPS and load checks after choosing hosting and distribution.

## Remaining product work

SMS/phone verification and password recovery, discount eligibility verification,
payment integration and platform-fee settlement, multiple-terminal service areas,
live driver tracking, production operations and a chosen native/mobile distribution
are not complete. Location thresholds, FIFO rules, discounts, timeouts and pricing
are demonstration policies requiring operator review for any real deployment.

The local profile disables physical-presence validation so the portfolio can be
tested at a desk. The normal configuration requires a fresh location reading.
Client-reported GPS alone is not proof against spoofing.

Local database backups and synthetic QA records are not published to GitHub.
Screenshots are stored locally under ignored `artifacts/ui-qa/`. See TESTING.md
for reproducible module checks and the isolated UI launcher.
