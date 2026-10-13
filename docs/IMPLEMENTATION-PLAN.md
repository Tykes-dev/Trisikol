# TrisiKol implementation plan

Original plan: 2026-10-09. Current snapshot: 2026-10-13.

This is the historical implementation plan. Authentication, fare settings and the
core trip workflow have since been implemented; see PROGRESS.md for verified
results, remaining checks and current policy assumptions.

## Basis and current state

The user supplied `gemini-code-1791544154841.md` as historical demonstration context. Its prices, regulatory assertions, infrastructure estimates, and deployment instructions are not verified production requirements.

The core product is terminal-based TODA dispatch, with passenger bookings, physical walk-ins, drivers, and administrators. The current React pages simulate queue changes, trips, balances, and authentication. The Spring Boot backend is a scaffold with JPA and MySQL dependencies, without implemented business endpoints or migrations. Git is not initialized in this workspace.

## Proposed first release

Start with one terminal and cash trips. Retain passenger, driver, and admin roles. Defer online payments, SMS recovery, multiple-terminal matching, and cloud infrastructure until the core flow works. These are scope proposals, not confirmed business rules.

1. An administrator registers the terminal, approved drivers, and vehicles.
2. An authenticated driver joins the terminal queue. The backend validates eligibility and location freshness/accuracy under an agreed location policy.
3. A passenger requests a ride for that terminal and receives a server-generated fare quote.
4. The backend reserves the first eligible queued driver and offers the ride. Acceptance, expiry, rejection, and cancellation must have explicit transitions.
5. The driver starts and completes the accepted trip. The passenger sees persisted status updates.
6. Completion records the fare and any platform charge once. Retried requests must not produce duplicate charges.
7. A completed driver is outside the queue until joining again at the terminal.
8. A walk-in creates a trip with a walk-in source and may omit a registered passenger. It must reserve the driver atomically, so an app booking cannot assign the same driver concurrently.

Proposed trip states: requested -> offered -> accepted -> in_progress -> completed. Cancellation and offer expiry are explicit branches. Final transitions and queue priority after rejection/expiry require agreement.

## Decisions to resolve

- Platform fee payer: passenger surcharge, driver expense, or a specified combination? PassengerHome adds the fee to the fare; DriverTerminal subtracts a fee from its wallet. Define cash collected, driver earnings, and wallet debit together to avoid unintended double charging.
- Walk-in priority: must it use the queue head, and what happens while that driver has an app offer?
- Offer timeout, rejection, offline-driver handling, cancellation, and rejoin priority.
- Terminal service area and whether pickup can be away from the terminal.
- Distance and fare policy: Haversine gives straight-line distance, not road routing. Select an agreed road-distance or fixed-zone policy before real fare collection.
- Confirm fare amounts, rounding, discount eligibility and verification with the relevant operator/authority; historical legal claims have not been validated.

## Data and ownership

Initial entities: users, driver profiles, vehicles, terminals, queue entries, rides, ride status events, fare policies, fare quotes, and wallet ledger entries if the fee model requires a wallet. Store the agreed price breakdown and fare-policy version on each ride.

The backend owns roles, queue ordering, assignment, pricing, ride transitions, and ledger writes. Browser state is a display/cache, not the authoritative record. Database transactions and constraints must prevent duplicate queue entries and overlapping active assignments. Store money with decimal or integer minor-unit arithmetic.

## Delivery order and acceptance checks

1. Establish a Git baseline and preserve the existing demo.
2. Settle dispatch and fare decisions; specify request/response contracts.
3. Consolidate backend configuration and package root, connect local MySQL, and introduce versioned migrations. The existing launcher is under `com.trisikol.trisikol_backend`; the new empty `com.trisikol.backend` tree is a sibling and is not automatically scanned by that launcher. Flyway is planned but not installed.
4. Implement authentication and backend authorization. Verify unauthenticated and wrong-role requests are denied.
5. Implement terminal queue, booking, acceptance, start, and completion as one persisted flow. Verify two simultaneous requests cannot acquire the same driver and refresh/restart preserves state.
6. Connect the passenger and driver pages; replace demo timers and hardcoded trip data for this flow.
7. Add walk-ins and transactional ledger recording under the agreed fee model. Verify retries cannot duplicate trip completion or charges.
8. Add admin management, recovery/error states, deployment configuration, and operational checks.

## Secrets and deployment

Use ignored local environment files for secrets and keep example files credential-free. Private API keys belong on the backend, never in frontend VITE variables. Reassess hosting estimates when deployment scope is known. PWA/offline behavior must be implemented and tested explicitly; never show an offline booking as confirmed before server acceptance.
