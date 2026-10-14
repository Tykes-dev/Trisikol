# Saved ride notifications

Branch: `codex/ride-notifications`. Based on GitHub main at `6795dc2`.

## Saved in-app notifications

Trip creation, offers, acceptance, start, completion, cancellation and expired/
declined offers create notifications in the same transaction as their trip event.
Recipients are the passenger, assigned driver and administrators; a former offered
driver receives an offer-ended notice. Historical events are not backfilled.

The inbox polls every five seconds while mounted. It lists the latest 50 notices,
with a total unread count and individual/all-read actions. Users cannot request
another account's inbox or mark another recipient's notice read. This is not
background push, SMS or real-time driver GPS tracking.

Test manually: book a synthetic trip, open Menu → Notifications, read a notice,
refresh and reopen. Expected: the notice remains saved and read; each involved
role receives relevant status updates. Unrelated passengers see no notification.

Endpoints: authenticated `GET /api/notifications`, CSRF-protected
`POST /api/notifications/{id}/read` and `POST /api/notifications/read-all`.

## Branch checks

This branch contains 23 backend tests. Run `mvnw.cmd package` in the backend,
and frontend lint/build plus `node --test src/services/routing.test.js`.
The other two new features are deliberately excluded. The shared TestApi helper,
where present, is test-only infrastructure, not a production feature.

Use an isolated checkout/database for branch testing. Do not run this feature-only
schema against the regular database already migrated with all three features.
Do not delete/reset the regular database to switch branches. Keep the local
integration branch for the combined preview. Physical-phone and MySQL checks remain pending.
