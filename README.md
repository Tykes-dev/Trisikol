# TrisiKol

TrisiKol is a portfolio project for tricycle bookings and TODA terminal management,
using a React/Vite client and a Spring Boot API. It is under active development.
The current client is a responsive web application; it is not a Flutter or native
mobile build.

## Workspace layout

- `trisikol-web/` — React client application
- `trisikol-backend/` — Spring Boot API
- `docs/` — architecture and API documentation
- `docker-compose.yml` — local service dependencies

## Current milestone

The current milestone is a tested **single-terminal cash-trip portfolio flow**:

- Passenger signup, session login/logout, role authorization and admin-created driver accounts.
- Database-backed fare revisions with administrator identity and change reasons.
- Server-side road-route quotes, a FIFO terminal queue, booking and trip transitions.
- Walk-in trips with no app service fee, and a cash ledger that records app fees separately from driver earnings.
- Connected passenger, driver and administrator screens; vehicle registration and profile-name editing.
- Mobile manifest and a tested public offline fallback; physical-device installation still needs verification.

Verification: 23 backend tests, five frontend routing-helper tests, frontend
lint/build and backend packaging passed. Browser checks covered admin setup,
passenger booking, driver acceptance/start/completion, fee-free walk-ins, history,
profile editing, repeat bookings, persisted cash records after restart, and the
production offline fallback. UI checks used an isolated test database and fixture
routes. A separate OSRM check using approved demo pins returned a real road quote.
This is a portfolio milestone, not a production transport release.

Prices, discount handling, dispatch timeouts and location thresholds are portfolio
placeholders, not an approved LGU/TODA operating policy. Electronic payments,
fee remittance, verified discounts, SMS recovery, multiple terminals and public
deployment remain unfinished. Local H2 development has been exercised; MySQL and
physical-device behavior still need validation.

See [authentication setup](docs/AUTHENTICATION.md) for startup commands,
first-admin setup and database options, [testing](docs/TESTING.md) for module
checks, and [progress](docs/PROGRESS.md) for the remaining work.

Quick start from the workspace root:

```powershell
.\scripts\start-backend.ps1
```

In a second terminal:

```powershell
cd trisikol-web
npm ci
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Open http://127.0.0.1:5174/login and create a passenger account. Local development uses an ignored H2 database file; MySQL is configured separately. There are no default admin passwords.

Local database files, environment secrets, backups, private keys, business
documents and local tool settings are excluded from version control. Supply your
own local configuration; never place private credentials in frontend `VITE_*` values.

## Feature branch: Saved ride notifications

This branch contains only this new feature, on top of the existing main application.
See [implementation, tests and limitations](docs/RIDE-NOTIFICATIONS.md). Other new features live in separate branches.
