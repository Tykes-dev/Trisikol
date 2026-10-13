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

This commit saves a **work-in-progress development snapshot**:

- Passenger signup, session login/logout, role authorization and admin-created driver accounts.
- Database-backed fare revisions with administrator identity and change reasons.
- Server-side road-route quotes, a FIFO terminal queue, booking and trip transitions.
- Walk-in trips with no app service fee, and a cash ledger that records app fees separately from driver earnings.
- Connected passenger, driver and administrator screens; vehicle registration and profile-name editing.
- Mobile manifest and a public offline fallback, pending installation/device checks.

The last completed checks before development was paused were 15 backend tests,
frontend lint/build, a live OSRM quote using approved demo pins, and a passenger
screen check at a 390 × 844 viewport. Subsequent profile, rate-limit, quote-refresh
and mobile metadata changes still need their final verification. Do not treat this
snapshot as a finished release.

Prices, discount handling, dispatch timeouts and location thresholds are portfolio
placeholders, not an approved LGU/TODA operating policy. Electronic payments,
fee remittance, verified discounts, SMS recovery, multiple terminals and public
deployment remain unfinished. Local H2 development has been exercised; MySQL and
physical-device behavior still need validation.

See [authentication setup](docs/AUTHENTICATION.md) for startup commands,
first-admin setup and database options, and [progress](docs/PROGRESS.md) for the
current implementation and remaining checks.

Quick start from the workspace root:

```powershell
.\scripts\start-backend.ps1
```

In a second terminal:

```powershell
cd trisikol-web
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Open http://127.0.0.1:5174/login and create a passenger account. Local development uses an ignored H2 database file; MySQL is configured separately. There are no default admin passwords.

Local database files, environment secrets, backups, private keys, business
documents and local tool settings are excluded from version control. Supply your
own local configuration; never place private credentials in frontend `VITE_*` values.
