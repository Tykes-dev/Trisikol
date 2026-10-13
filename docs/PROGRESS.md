# Development progress

Snapshot date: 2026-10-13. Development was paused to establish GitHub version control.

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

## Last completed verification before pause

- 15 backend tests passed: authentication/fare authorization and six trip-workflow tests.
- Frontend lint and production build passed before the subsequent small additions.
- Actual V3 startup migration succeeded against the local file database, after backup.
- A server quote using explicitly approved demo coordinates returned a 1.956 km
  route, PHP 52 total and 41 route points through the frontend proxy.
- A synthetic passenger signed in and its empty history was observed in the
  browser at 390 × 844. Other roles were tested through backend APIs, not all
  visually checked on physical devices.

## Resume checks

1. Rerun backend tests, frontend lint/build and routing unit tests after the latest changes.
2. Test profile-name authorization and the quote request limiter.
3. Check fresh quotes after completion/cancellation and retries after ambiguous network failures.
4. Verify admin vehicle/settings forms and driver actions in independent browser sessions.
5. Verify saved trip/ledger state after backend restart; check GPS validation in non-demo mode.
6. Validate mobile installation/offline fallback using a production build and a real phone.
7. Verify MySQL migrations and locking before switching from local H2.

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
