# Completed cash-trip receipts

Passenger and driver trip-history cards now expose View receipt for completed
trips. Admins can open it from a completed trip's Details & history dialog.
The receipt includes a stable trip-based number, saved fare-policy ID, category,
road distance, raw fare, demo discount, driver net, app fee, collected cash and
Manila timestamps. Walk-ins have no passenger account and zero app fee.

The amounts come from the completed trip's saved quote and cash-ledger entry,
not the current fare policy or a browser recomputation. Names are current account
and terminal names, not historical name snapshots. No mobile numbers, passwords,
precise coordinates or payment credentials are included.

## Access and integrity

`GET /api/{passenger|driver|admin}/rides/{id}/receipt` uses the existing role guards.
Only the owning passenger, assigned driver, or administrator can read it. A
different account gets 404 before learning trip status. An authorized active or
cancelled trip gets 409; missing or inconsistent cash data gets 503. Responses
have `Cache-Control: no-store`. Read/retry/export does not write ledger entries.

## Export

- Download receipt (.html) saves a self-contained, escaped HTML summary with no
  scripts or remote assets. User-controlled labels/names are not executable HTML.
- Print / Save PDF uses the browser's print interface. Actual printing, PDF
  destination selection and phone-platform behavior require a manual check.
- These are portfolio cash-trip summaries, not tax invoices, payment-provider
  verification, or proof of platform-fee remittance.

## Verified

- Five isolated backend tests cover owner/admin access, wrong-role/anonymous
  denial, non-completed trips, fee-free walk-ins, idempotent completion, saved
  discount/policy snapshots and corrupt/missing cash data.
- Four frontend tests cover amounts, Manila date boundaries, safe HTML escaping
  and walk-in output. Frontend lint and production build pass.
- A completed synthetic trip remained available after the isolated backend
  restart. Its driver opened the PHP 62 receipt in the mobile dialog and
  downloaded `TRI-00000097.html` through the actual browser download action.
- Phone dialog content fits within the viewport and scrolls to export controls.
  This does not verify the native print destination or physical-device behavior.

## Manual test

1. In the isolated UI setup from `TESTING.md`, finish a synthetic trip.
2. Passenger/driver: Trips or Ride History → View receipt. Expect the same total
   and policy as the saved trip. Admin: Logs → Details & history → View receipt.
3. Download HTML, open it, and compare the breakdown. Use Print / Save PDF to
   check your browser's output; only the receipt should print.
4. Check a completed walk-in as its driver: app fee must be zero. A cancelled
   trip should have no receipt button.
5. In API tests, request another user's receipt: expect 404, not its data. Changing
   the current fare policy must not change an old trip's monetary breakdown.

Local downloaded receipts can contain names and trip descriptions. Handle them
as private files and do not commit them to the repository.
