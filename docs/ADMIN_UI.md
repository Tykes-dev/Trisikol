# Admin UI restoration and mobile checks

## Scope

The visual reference is the original demo in `bakap/trisikol-web/src/pages/AdminDashboard.jsx` (ignored backup). Its maroon sidebar, cream background, compact summary cards, roster-first landing screen, and mobile navigation are restored around the current server-backed features.

This is a responsive React web interface, not a native mobile build. Passenger and driver screens are not redesigned in this change.

## Navigation

- Desktop: sidebar with Driver roster, Live queue, Ride logs, TODA settings, Overview, Notifications, and My profile.
- Phone: fixed Roster, Queue, Logs, Settings, and More navigation. More contains Overview, Notifications, My profile, and Log out. The header also provides notification and profile shortcuts.
- The TODA selector appears only on Queue and Settings, where it actually scopes the records. Roster, logs, and operational totals remain global across TODAs.
- Smaller screens use driver/trip cards instead of wide tables. Admin buttons are at least 44px high, phone form inputs use 16px text, and bottom padding accounts for the fixed navigation and device safe area.
- Forms open as bottom sheets on phones and centered dialogs on larger screens. Keyboard focus wraps within the dialog; Escape closes it and returns focus to its trigger. Save-in-progress prevents dialog dismissal.

## Functionality retained

- Create real driver logins; edit vehicles, eligibility, and TODA assignment.
- Read the selected terminal's FIFO queue.
- Search/filter the returned driver roster and latest 100 trips, with full fare details and server-backed trip-event history.
- Append fare revisions with a reason and view the latest 50 revisions for the selected TODA.
- Create and update TODAs, retaining backend validation and queue/active-trip restrictions.
- View global operational totals, manage the administrator's name, and read saved notifications.

The old demo's fake SMS/PIN delivery, local-only records, driver deletion, operating hours, and queue-capacity settings are not restored. Prices remain placeholders, not an approved local fare schedule. Walk-ins still have no app service fee. Cash fees due are not recorded remittances or electronic payments.

## Verification performed (2026-10-15)

- Frontend lint and production build pass. The build still warns about the existing large JavaScript bundle; the existing logo is also large. Performance optimization remains separate work.
- Nine Node tests pass: four admin search/status-filter tests and five existing routing tests.
- All 34 backend regression tests pass, with no failures, errors, or skips.
- Browser layout checks use 320×568, 390×844, 768×1024, and 1280×800 viewports. The checked admin views do not cause horizontal page overflow.
- In the isolated UI-test database: saved a driver vehicle change, appended a fare revision without changing its numeric prices, verified revision history and different TODA prices, created a long-name terminal and renamed it, checked empty/populated queues, opened completed-trip details/events, and marked a notification read.
- Backend rejection of a 101-character terminal name and reassignment of a queued driver was displayed in the redesigned forms.
- Verified dialog keyboard wrapping, Escape, and return of focus. The add-driver dialog was inspected; a new login was not submitted through the browser during this pass.

Normal database records, account credentials, and fare settings were not changed by these save tests. The isolated fixture has synthetic verification records; it is not the regular preview database.

## Test it yourself

Use the regular local preview at `http://127.0.0.1:5174/admin` and your existing administrator account. For writes that should not touch your regular data, start `scripts/start-ui-tests.ps1` and a second frontend configured with `TRISIKOL_DEV_API_TARGET=http://127.0.0.1:8081` on port 5175. Use `http://localhost:5175`, not the same hostname as the regular preview, to keep session cookies separate. The test accounts are defined in `trisikol-backend/src/test/java/com/trisikol/ui/UiTestServer.java`.

1. Open the admin screen at phone width. Expect bottom navigation and driver cards, with no sideways page scrolling. Scroll to the final action; it should remain reachable above the navigation.
2. Search for a body number or TODA name, then change the eligibility filter. Expect matching drivers only and a clear empty state for no matches.
3. Open Add driver. Expect a scrollable sheet, required name/mobile/password fields, a 12-character password minimum, and a working close button. To fully test account creation, use a new synthetic mobile number in the isolated environment, submit it yourself, and verify that the new driver appears after refresh. Register its vehicle before testing queue access.
4. Edit a test driver's vehicle and save. Expect a success message and the updated server-backed details. Reassignment while queued should show an error without silently moving the driver.
5. Choose Queue, then switch TODAs. Expect only that terminal's waiting drivers. No manual queue-reordering action is offered.
6. Choose Logs, filter Completed, then open Details & history. Expect the saved fare breakdown and trip events; a walk-in's app fee should remain zero.
7. In Settings, switch TODAs and check the current fare. Save a test-only revision with a meaningful reason. Expect a new revision and retained previous history. Review any newly created TODA's copied placeholder prices before use.
8. Open More → Notifications or use the bell. Mark an alert read; expect the unread count to decrease. Open Profile from the header to check the name form, and use More → Log out to end the session.

Physical Android/iPhone testing, Safari behavior, virtual-keyboard interactions, installed-app packaging, background push, SMS delivery, and real-operator validation are not verified by browser resizing.

## Automated checks

From `trisikol-web`:

```powershell
npm run lint
node --test src/features/admin/adminView.test.js src/services/routing.test.js
npm run build
```

From `trisikol-backend`, with a JDK 17+ configured:

```powershell
.\mvnw.cmd test
```
