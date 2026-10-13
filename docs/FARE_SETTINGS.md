# Fare settings (first module)

The backend stores fare-policy revisions. These are demo placeholders, not an
approved LGU/TODA schedule. The highest policy ID is active immediately after a
successful admin update. Earlier rows are preserved; this is an application audit
history, not a tamper-proof approval process. Concurrent admin updates are not
currently guarded by a revision confirmation step.

Initial settings: PHP 40 base fare covering 1.5 km, PHP 10 additional fare per km,
and a separate PHP 1 app service fee per km. This began as a settings-only module;
the subsequent trip workflow now provides routing, quotes and cash-ledger integration.
Passenger and walk-in quotes now use these settings on the backend, with a saved
policy/price snapshot. The frontend displays the returned amounts. Additional
fare uses `ceil(max(0, distanceKm - baseDistanceKm))`; app fees use
`ceil(distanceKm) * appServiceFeePerKm`. Walk-ins have no app fee. The retained
20% category discount is explicitly a demo policy and is not verified eligibility.

## API

- `GET /api/fares/current`: signed-in passenger, driver or admin; returns settings
  and policy ID without audit identities.
- `GET /api/admin/fare-policies`: admin only; latest 50 revisions, newest first.
- `POST /api/admin/fare-policies`: admin only with session CSRF token; accepts
  `baseFare`, `baseDistanceKm`, `extraFarePerKm`, `appServiceFeePerKm`, and
  `changeReason`. Returns 201 and the saved revision. Actor is taken from the session.

Amounts allow 0–10000 and two decimal places. Base distance allows 0.001–1000 km
and three decimal places. Reason requires 10–500 characters after trimming.
These are technical input bounds, not official fare limits.

## Manual verification

Restart with `./scripts/start-backend.ps1` from the workspace root to run V2.
If no admin exists, use `./scripts/start-backend.ps1 -BootstrapAdmin` and its prompts.
On the frontend, sign in and open the developer console:

```javascript
var fareApi = (await import('/src/services/api.js')).api;
await fareApi('/fares/current');
```

As a passenger or driver, the following must fail with 403; as an admin it must
return a new revision with a timestamp and the signed-in admin's mobile:

```javascript
await fareApi('/admin/fare-policies', {
  method: 'POST',
  body: {
    baseFare: 45,
    baseDistanceKm: 1.5,
    extraFarePerKm: 10,
    appServiceFeePerKm: 1,
    changeReason: 'Testing administrator fare changes.'
  }
});
```

Check `/fares/current` and `/admin/fare-policies`, then restart and confirm that
the revision remains. Invalid amounts must return 400 without adding revisions.
To restore demo prices, create another revision using baseFare 40 with an
appropriate reason; retain the test revision in history.

Automated coverage is in AuthenticationTests: session roles, CSRF, invalid
inputs, actor attribution, latest settings and preservation of previous rows.
