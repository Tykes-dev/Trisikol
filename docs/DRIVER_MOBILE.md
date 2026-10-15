# Driver mobile interface

This branch replaces the horizontally scrolling driver tabs with fixed Terminal,
Trips, Earnings, Vehicle and More navigation. It keeps the current server-backed
queue, vehicle eligibility, offers, trip transitions, fare quotes and cash ledger.
No simulated wallet, fake bonuses or online-payment controls are restored.

On phones, queue and trip actions appear before the map. Active trips show cash
to collect and the allowed actions, with full saved fare details in an expandable
section. Cancellation and cash completion use keyboard-contained, scrollable
in-app confirmation dialogs. More contains profile, notifications and logout.

History has status/search filters over the latest 100 saved trips. Earnings
clearly separates all-time cash, driver net and fees due; the recent-entry list
is capped at 50 by the existing API. Fees due are not remitted funds.

## Checks performed

- Frontend lint/build and two driver action/filter tests pass.
- Isolated browser: queue join, offer acceptance, start, cash confirmation,
  completion, saved history, search/status filters, earnings, vehicle information,
  More, dialog keyboard wrapping and Escape.
- A synthetic app trip recorded PHP 62 cash, PHP 60 driver net, PHP 2 fees due;
  after completion, the driver was outside the queue and the trip was in history.
- 320px and 390px phone layouts were checked for horizontal page overflow.
- The existing backend tests cover fee-free walk-ins, queue-head reservation,
  suspension, competing assignments and idempotent cash completion. No backend
  trip rules or normal database records were changed by this UI module.

## Manual checks

Use the isolated launcher in `TESTING.md` for writes. Sign in as the synthetic
driver and check:

1. Terminal: Join queue, then Leave queue. Expect saved position changes, no
   duplicate entry, and no walk-in form when outside the queue.
2. First in queue: Record a walk-in, tap a map destination and inspect the quote.
   Expect terminal pickup and a zero app fee. Confirm, start and complete only a
   synthetic trip; expect one ledger entry and no automatic rejoin.
3. App offer: Accept, start, then open Confirm cash & complete. Go back should
   leave the trip in progress. Confirming should complete once, update earnings
   and make the completed trip available in Trips.
4. Trips: filter Completed and search a trip number. Expect only matching records.
5. Earnings: expect cash = driver net + platform fees due. Vehicle, profile and
   notifications remain reachable without horizontally scrolling navigation.
6. At 320px width, scroll to every action. Tab/Shift+Tab stay within a confirmation
   dialog; Escape closes it unless a save is in progress.

Physical-device GPS, virtual keyboard, installation and background behavior still
need phone testing. Local demo mode does not verify physical terminal presence.
