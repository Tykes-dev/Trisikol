# Nearby TODA suggestions

## Implemented

Passengers can open the booking sheet's TODA section and choose **Find nearby TODAs**. The server ranks saved terminal coordinates by approximate straight-line (Haversine) proximity to the selected pickup pin. The UI shows the closest three, while the manual selector still offers every loaded terminal.

Choosing a suggestion is explicit: it never automatically changes the selected TODA. Both manual and suggested selection keep the pickup and drop-off pins. A TODA change invalidates the displayed old quote and disables booking until a fresh server quote is ready. The selected TODA's policy, road routing, FIFO dispatch, ownership checks, cash flow, and fee-free walk-in behavior are unchanged.

## Deliberate limits

- This is terminal proximity, not nearest-driver dispatch, a road-distance comparison, an ETA, a guarantee of waiting drivers, or confirmation of approved service coverage.
- The initial pickup remains the existing demo pin until the passenger changes it. The feature does not request GPS or claim to know the device's current location.
- Suggestions use only saved terminal coordinates. No routing/geocoding provider is called for this calculation; actual fare quotes continue to use the existing road-routing service.
- Pickup coordinates go to this app's backend in a POST body, not a query string. This endpoint does not persist them, create fare quotes, modify the queue, or log request bodies. Deployment logging must retain the same privacy precautions.
- Requests and responses are invalidated when pickup or the loaded terminal catalog changes. A manual refresh is required to display a new ranking. Failed suggestion requests show a retryable error rather than inventing distances.
- Location data can be wrong or outdated. An approved service-area/operating policy remains separate work. Operators must confirm whether a TODA can serve a pickup before real use.

## API

`POST /api/passenger/terminal-suggestions`

Requires a passenger session and the existing CSRF token. Driver/admin sessions are not allowed to use the passenger endpoint. Existing authenticated terminal-directory access is unchanged.

```json
{"pickup":{"lat":15.22,"lng":120.56}}
```

Response:

```json
{
  "distanceBasis": "STRAIGHT_LINE",
  "coverageVerified": false,
  "terminals": [
    {
      "id": 1,
      "name": "Example TODA",
      "latitude": 15.22,
      "longitude": 120.56,
      "straightLineDistanceKm": 0.0
    }
  ]
}
```

Missing, non-finite, malformed, and out-of-range coordinates are rejected. A latitude of zero or longitude of zero is valid. Full-precision distances are sorted before the UI rounds them for display; exact ties are ordered by terminal ID. An empty directory returns an empty list.

No schema migration, private API key, provider signup, or new permission is needed.

## Verification (2026-10-15)

- 41 backend tests pass: the existing 34 plus five proximity/validation unit tests and two HTTP integration tests.
- 14 frontend helper tests pass: the existing nine plus five suggestion-contract, invalid-coordinate, stale-state and retry-state tests.
- Frontend lint and production build pass. The existing large-bundle warning remains.
- Isolated browser checks: ranking, explicit selection, unchanged pins, disabled booking during quote replacement, manual selection, pickup/catalog invalidation, and scrollable phone layouts at 390×844 and 320×568.
- In the isolated fixture, selecting TODA 2 replaced a PHP 57 quote with PHP 62 while preserving both pins. It used the fixture's 1.956 km route, not a real provider call.
- The ordinary local database was backed up before the backend restart; no new migrations were needed. Ordinary fare settings, credentials, vehicles and trip records were not changed by feature verification.

These are browser and isolated-server checks, not physical-device, approved-area, or real-world dispatch validation.

## Try it

1. Sign in as a passenger at the regular preview, `http://127.0.0.1:5174/passenger`. For write tests, use the isolated UI launcher described in `TESTING.md`.
2. Open **TODA** in the booking sheet, then **Find nearby TODAs**. Expect sorted approximate distances and an explicit coverage warning. With only one saved TODA, only one suggestion is expected.
3. Set a destination, note both pins and the quoted fare, then choose another TODA. Expect unchanged pins, a temporarily unavailable old fare, and then a fresh quote under the selected TODA's policy. The amount may stay the same if policies are equal.
4. Try the manual selector: pins should still remain unchanged.
5. Change the pickup pin. Expect old suggestions to disappear; use Find nearby TODAs again to rank against the new pin. Selecting a TODA must not move that pickup pin to a terminal.
6. At phone width, scroll the sheet through the entire list and down to the booking controls. Expect no horizontal page or sheet overflow.

From `trisikol-web`:

```powershell
npm run lint
node --test src/features/rides/terminalSuggestions.test.js src/features/admin/adminView.test.js src/services/routing.test.js
npm run build
```

From `trisikol-backend`, with JDK 17+ configured:

```powershell
.\mvnw.cmd test
```

## Local branch order

`codex/admin-mobile-ui` contains the admin restoration commit. `codex/nearby-toda-suggestions` builds on it. Merge/review the admin branch first, then the nearby-TODA branch, or target the second PR at the first branch while they are stacked. Neither branch has been pushed by this implementation.
