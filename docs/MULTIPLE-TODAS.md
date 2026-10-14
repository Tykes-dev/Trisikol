# Multiple TODAs and terminal queues

Branch: `codex/multiple-todas`. Based on GitHub main at `6795dc2`.

## Multiple TODAs / terminals

Admin → Settings → Add another TODA creates a named terminal with coordinates.
Its initial fare policy is explicitly a placeholder copied from terminal 1.
Choose a TODA in the admin selector to edit its fare and see its queue/history.
Driver roster → Edit vehicle & eligibility assigns a driver to a terminal.
Changing assignment is rejected while queued or on an active trip.

Passengers choose a terminal inside the TODA section of the original booking
sheet. Switching clears the destination and stale quote and moves the initial
pickup to the terminal; users can still choose pickup/drop-off pins. The driver
screen uses its assigned terminal for queue joins and walk-in quotes.

FIFO positions and fare policies are terminal-specific. Quotes and rides keep
their terminal ID and price snapshot. Legacy records migrate to terminal 1.
Walk-ins still have zero platform fee and require first position in their own
terminal's queue. Quotes from a driver's previous assignment cannot be booked.
Terminal edits require only that terminal's queue/trips to be empty.

Test manually with two test drivers and separate browser sessions:

1. Create a second TODA and set a visibly different base fare with a reason.
2. Assign one driver to each TODA and join both queues. Each sees position 1.
3. Select TODA 2 as a passenger, select pins and book. Only its driver receives
   the offer. TODA 1's driver remains queued; TODA 1's fare is unchanged.
4. Try moving a queued/active driver. Expected: rejection; leave/finish first.
5. Create a walk-in as the queue head. Expected: that TODA's fare, app fee zero.

This is manual selection, not nearest-TODA matching or approved territory checks.
An Admin manages all terminals; this is not tenant isolation between independent
operators. Pricing/discount rules remain placeholders, not LGU/TODA approval.
Dispatch uses one global database mutex for cross-terminal safety; it is not a
high-volume distributed design. No terminal deletion is exposed.

Endpoints: authenticated `GET /api/terminals`; admin `POST /api/admin/terminals`,
`PUT /api/admin/terminals/{id}` and `PUT /api/admin/drivers/{id}/vehicle` (terminalId).
Queue, current-fare and fare-history GET requests accept `?terminalId=...`;
omitted IDs default to terminal 1. Fare revision and passenger quote POST accept
terminalId. Driver walk-in quotes use the driver's assigned terminal.

## Branch checks

This branch now contains 26 backend tests after incorporating main's notifications.
The original standalone TODA snapshot contained 25. Run `mvnw.cmd package` in the backend,
and frontend lint/build plus `node --test src/services/routing.test.js`.
Main's notification feature is retained; password recovery is deliberately excluded.
The shared TestApi helper,
where present, is test-only infrastructure, not a production feature.

Use an isolated checkout/database for branch testing. Do not run this feature-only
schema against the regular database already migrated with all three features.
Do not delete/reset the regular database to switch branches. Keep the local
integration branch for the combined preview. Physical-phone and MySQL checks remain pending.
