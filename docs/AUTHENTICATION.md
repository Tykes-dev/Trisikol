# Authentication milestone

## Implemented

- Passenger registration backed by a database, with unique 11-digit Philippine mobile numbers starting with 09.
- BCrypt password hashing (cost 12); minimum 12 characters, maximum 72 UTF-8 bytes. Passwords are not returned by APIs.
- Spring Security login, HTTP-only session cookie, session ID rotation at login, CSRF protection on mutations, and logout invalidation. No authentication tokens are stored in browser localStorage.
- Passenger/Driver/Admin authorization on the backend and matching React route guards. Public signup never grants a privileged role.
- Admin-only driver account creation, saved fleet profiles in the roster screen.
- Local single-instance rate limit: 30 combined login/registration/recovery/redemption attempts per client IP per 15 minutes. Behind the development proxy, clients share its address. Production proxy identity and shared throttling need deployment-specific configuration.
- Local synthetic-account recovery: random one-use codes stored as SHA-256 hashes, 15-minute expiry, reissue invalidation and BCrypt replacement. Credential revisions revoke pre-reset sessions on their next authenticated request.
- Flyway migration and schema validation. Local H2 file storage allows development without installing MySQL; the default database configuration is MySQL.

## Run locally on Windows

From the workspace root, open two PowerShell terminals.

Terminal 1:

```powershell
.\scripts\start-backend.ps1
```

This uses the local profile, listens on 127.0.0.1:8080, and stores accounts under `trisikol-backend/data/` (ignored by Git). It uses JAVA_HOME, a JDK on PATH, or the installed VS Code Java extension's bundled JDK. Java 17+ is required. Maven dependencies need network access on the first run.

Terminal 2:

```powershell
cd trisikol-web
npm ci
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Open http://127.0.0.1:5174/login. Use Sign up, then sign in. The old `admin`/`driver` demo shortcuts no longer work. Vite proxies `/api` to the backend; keep VITE_API_BASE_URL set to `/api`. Use the same hostname consistently because cookies are host-specific.

Accounts survive backend restarts. Sessions are in memory and users must sign in again after a restart or after 30 minutes of inactivity.

## First administrator and drivers

Stop the backend with Ctrl+C, then run:

```powershell
.\scripts\start-backend.ps1 -BootstrapAdmin
```

Enter a mobile number and a strong password at the prompts. The script passes credentials through the process environment without writing or printing them. Bootstrap creates the first admin only if no admin exists; it does not reset an existing admin password. Restart normally afterward without bootstrap credentials. Do not commit secrets or paste them into commands or chat.

Sign in with that account, open the roster, and use **Create driver login**. Driver signup is admin-controlled. Local reset is implemented; real SMS invitations/recovery and forced first-login changes are future work. Use synthetic accounts for this portfolio stage.

## MySQL configuration

The root Compose file can start MySQL after copying `.env.example` to `.env` and setting distinct passwords. Docker Compose reads that file; Spring Boot does NOT automatically read it. Provide DB_URL (default jdbc:mysql://localhost:3306/trisikol), DB_USERNAME (default trisikol), and DB_PASSWORD in the backend process environment. Run `start-backend.ps1 -Profile mysql`. For local HTTP only, set SESSION_COOKIE_SECURE=false. For deployment, keep it true and serve frontend/API under the same HTTPS origin using a reverse proxy.

H2 data is not automatically transferred into MySQL. MySQL execution has not been validated on this machine. This milestone does not choose Flutter versus a packaged web/mobile client; a future native client will need an appropriate authentication integration.

## API

| Method | Path | Access |
| --- | --- | --- |
| GET | /api/auth/csrf | Public; returns token/header name |
| POST | /api/auth/register | Public + CSRF; JSON name/mobile/password |
| POST | /api/auth/login | Public + CSRF; form-encoded mobile/password |
| GET | /api/auth/recovery-info | Public; delivery availability only |
| POST | /api/auth/forgot-password | Public + CSRF + abuse limit; JSON mobile, generic 202 response |
| POST | /api/auth/reset-password | Public + CSRF + abuse limit; JSON token/password, 204 on success |
| GET | /api/auth/me | Signed-in user; safe account fields |
| POST | /api/auth/logout | CSRF; invalidates session |
| POST | /api/admin/drivers | Admin + CSRF; JSON name/mobile/password |
| GET | /api/passenger/profile | Passenger |
| GET | /api/driver/profile | Driver |
| GET | /api/admin/profile | Admin |

Get a fresh CSRF token before each mutation, especially after login/logout; send it in the returned header and retain session cookies. Anonymous protected requests return 401; wrong-role and invalid-CSRF requests return 403.

## Verification and remaining work

Backend: run `mvnw.cmd test` with JAVA_HOME configured. Integration tests cover hashing, registration validation/duplicates, forged roles, wrong credentials, CSRF, session rotation, logout, and admin-created drivers. Frontend: `npm run lint` and `npm run build`.

Manual flow: sign up -> log in -> refresh -> inspect personal profile -> attempt /admin -> log out -> reopen /passenger. Repeat using an admin-created driver. Test a stopped backend for connection errors.

Accounts, fare policies and the core cash-trip workflow are now connected and
locally tested. See PROGRESS.md and TESTING.md for evidence and remaining checks.
Phone ownership verification, production SMS recovery, payment settlement, production
monitoring and deployment hardening remain unfinished. A valid mobile format is
not proof of phone ownership.

The local profile enables `trisikol.recovery.local-outbox` and writes secret codes
under ignored `trisikol-backend/data/password-reset-outbox/`. Nothing in that
folder is served by HTTP or returned in a recovery response. Anyone with filesystem
access may read it: use synthetic accounts, protect local access and delete codes
after testing. Never deploy the outbox publicly. Non-local configuration defaults
to delivery unavailable. See PASSWORD-RECOVERY.md.

Backend packages intentionally live under the existing `com.trisikol.trisikol_backend` application root so Spring discovers them. The earlier empty sibling `com.trisikol.backend` folders are not used.
