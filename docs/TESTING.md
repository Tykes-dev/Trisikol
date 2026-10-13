# Testing TrisiKol

Use synthetic accounts and cash amounts for this portfolio version. Regular
development runs at http://127.0.0.1:5174 and uses the ignored local file database.
The optional isolated UI setup below uses different ports and a separate database.

## Regular startup

From the workspace root:

```powershell
.\scripts\start-backend.ps1
```

In another terminal:

```powershell
cd trisikol-web
npm ci
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

For a first administrator, stop the backend and start it with
`./scripts/start-backend.ps1 -BootstrapAdmin`; follow the private prompts.
This creates only the first admin and does not reset existing credentials.

## Module checklist

| Module | What to do | Expected result |
| --- | --- | --- |
| Accounts | Register a passenger, sign in, refresh, then sign out | Saved account, retained session before logout, protected page denied afterward |
| Profile | Open Profile, change the name, save and refresh | New name persists; mobile and role are unchanged |
| Vehicles | Admin: Drivers → create login → Edit vehicle & eligibility | Driver appears in real roster; complete vehicle details allow queue entry |
| Suspension | Suspend a waiting driver | They leave the queue and cannot rejoin; active trips must be handled before suspension |
| Fare settings | Admin: Settings → edit amounts and supply a reason | New revision appears; older policies remain in history |
| Terminal | Change name/location with no active trips or queued drivers | Change persists; editing is rejected while operational state is active |
| Road quote | Passenger: tap map, set pickup/drop-off | Popup opens on first tap; server returns road route, price breakdown and policy ID |
| Queue | Driver: Join terminal queue | A persisted FIFO position appears; repeated join does not duplicate the entry |
| Booking | Passenger books while a driver waits | Driver receives an offer; passenger sees assigned driver and status |
| Trip actions | Driver accepts, starts and confirms cash received/completion | Both roles see completed trip; exactly one cash-ledger record appears |
| New booking | Book again after completion or cancellation | A fresh quote and distinct trip are created, not the previous trip |
| Walk-in | First queued driver: Record a walk-in → select drop-off → confirm | Accepted trip; app fee is zero; it shares driver reservation rules with app bookings |
| Earnings | Open driver Earnings after completion | Cash collected equals net earnings plus platform fees due |
| History/audit | Open passenger/driver History and admin Trips → events | Saved trips and ordered status events are shown |
| Restart | Stop/restart backend and sign in again | Trips, policies, profiles and ledger persist; sessions require new sign-in |
| Offline | In a built preview, load and reload once, stop preview server, reload | Public offline message; no booking is confirmed and API data are not cached |

Use separate browser sessions for passenger and driver (for example, a normal
window and a private window). Two tabs in the same browser session share a login.
Offers last 60 seconds. Declining or missing an offer requires the driver to join
again; requests without acceptance are cancelled after 15 minutes when state is
next processed. These are demo dispatch rules, not verified TODA policy.

Additional matrix fare uses started kilometres beyond the base distance; the
app fee uses started kilometres over the entire route. Money is kept to two
decimal places. Discount categories use a placeholder 20% off the matrix fare.
No walk-in app fee is charged. Platform fees are recorded as due, not remitted.

## Automated checks

With JAVA_HOME pointing to JDK 17 or newer:

```powershell
cd trisikol-backend
.\mvnw.cmd package
```

In the frontend directory:

```powershell
npm run lint
node --test src/services/routing.test.js
npm run build
```

The backend includes registration/security, fare revisions, ownership checks,
competing reservations, offer expiry, idempotent completion, profile CSRF,
per-account quote limits, suspension, stale quotes and GPS validation. The
frontend routing-helper tests use mock responses; current fare quotes are
authoritative backend responses.

## Isolated UI tests (no real accounts or external route calls)

From the workspace root:

```powershell
.\scripts\start-ui-tests.ps1
```

In another terminal:

```powershell
cd trisikol-web
$env:TRISIKOL_DEV_API_TARGET='http://127.0.0.1:8081'
npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

The explicit test launcher uses only `data/ui-tests/trisikol`, on loopback port
8081, and test-classpath code that is excluded from the production jar. It seeds
admin `09170009001` and passenger `09170009002`, with test-only password
`UI-test-only-password-2026!`. Do not use these credentials for the normal app.
Create driver `09170009003` in the admin UI if it does not already exist.
An existing test database is retained, so repeated tests add history rather than
resetting it. Test routing always returns 1.956 km and a simplified fixture line;
it is not a real road route. Normal startup uses OSRM.

For this test setup, 127.0.0.1 and localhost can be used as separate cookie hosts
for simultaneous passenger/driver sessions. Keep the chosen hostname consistent
within each session. On the 2026-10-13 test run, base fare 45 and extra fare 10
produced an app total of 57 (net 55, fee 2) and a walk-in total of 55 (net 55, fee 0).
After both completed, totals were cash 112, net 110 and platform due 2; cancelled
trips added no ledger entries. Those values survived restart.

## Passenger UI restoration checks (2026-10-13)

The passenger screen now uses the original full-screen map, floating menu/profile
controls, draggable booking sheet and slide-in secondary screens. Backend APIs,
fare calculations, quote expiry, booking/cancellation and authentication are unchanged.

1. Drag the sheet handle down/up, or click it: the map remains visible and the
   collapsed form cannot receive keyboard focus.
2. Tap the map and set a destination. Expand the sheet to see the server total;
   open Passenger category and Fare details & routing for the existing controls.
3. Book and cancel a synthetic trip, then open Menu → Ride History. The cancelled
   trip must appear from the backend, not mock history.
4. Open Profile, save the name, and return to the map. Menu → Payments shows Cash
   only; it does not re-enable the old simulated e-wallet controls.
5. Check a small phone viewport: the sheet content scrolls, with no horizontal
   overflow. Escape closes a secondary screen; Tab stays inside its dialog.

Browser checks passed at 390 × 844, 320 × 568 and 1280 × 800. In the isolated
fixture setup, Regular quoted 57 and Student quoted 46; a new booking was created
and cancelled through the restored UI, saved history displayed it, and profile
saving worked. Dragging both directions, tap expansion/collapse, keyboard focus
and cash-only display were checked. These are browser checks, not physical-phone tests.

## Physical presence and mobile limits

Local mode skips presence checks for desk demonstrations. To test the location
validator locally, set `DISPATCH_REQUIRE_LOCATION=true` before backend startup.
The demo requires a reading no older than 30 seconds, accuracy within 50 metres,
and location within 100 metres of the terminal. Client GPS can be spoofed.

The UI was checked at 390 × 844 and desktop size. Physical-phone installation,
native app packaging, real GPS behavior, push notifications and MySQL runtime
remain unverified. The built app contains a manifest and service worker but does
not support offline trips or electronic payments.
