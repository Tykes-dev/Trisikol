# Local-demo password recovery

Branch: `codex/password-recovery`. Based on GitHub main at `6795dc2`.

## Local-demo password recovery

The local profile enables a local delivery adapter; default non-local config
does not. Recovery responses never include the reset code or confirm account
existence. Random 256-bit codes are stored in the database only as SHA-256 hashes.
They expire after 15 minutes and are one-use. Requesting a new code invalidates
older codes. Redemption is serialized by account so concurrent attempts cannot
both succeed. Existing sessions become invalid on their next request through a
saved credential-revision check, including concurrent logins.

To test yourself with a synthetic account:

1. Open Login → Forgot password? and enter its mobile number.
2. Request Reset Code. Expected: generic instructions and an explicit no-SMS
   local-demo notice, followed by the code/new-password form.
3. Open the newest matching file in `trisikol-backend/data/password-reset-outbox/`.
   In the isolated UI setup use `data/ui-tests/password-reset-outbox/` instead.
   Codes are never published in Git, logs, browser URLs or HTTP responses.
4. Paste the code and enter/confirm a new password yourself (12+ characters,
   maximum 72 UTF-8 bytes). Submit. Expected: return to sign-in, old password
   rejected and new password accepted; a previously signed-in session is revoked.
5. Reuse the code or request another code and retry the previous one. Expected:
   invalid/expired response; no password change. Delete your outbox files after use.

Files contain credentials and mobile numbers. Keep filesystem access private,
use synthetic accounts only and never deploy or serve this folder. Unknown-number
demo files contain deliberately unusable codes. This adapter is NOT phone ownership
verification or production recovery. A real side-channel provider, monitoring,
timing-enumeration review, retention cleanup and shared deployment throttling
remain required before a public release. Do not enable the local profile/outbox
on a public server.

The security design uses relevant principles from the
[OWASP recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html);
local-demo delivery is not claimed production-ready.

## Branch checks

This branch contains 30 backend tests. Run `mvnw.cmd package` in the backend,
and frontend lint/build plus `node --test src/services/routing.test.js`.
The other two new features are deliberately excluded. The shared TestApi helper,
where present, is test-only infrastructure, not a production feature.

Use an isolated checkout/database for branch testing. Do not run this feature-only
schema against the regular database already migrated with all three features.
Do not delete/reset the regular database to switch branches. Keep the local
integration branch for the combined preview. Physical-phone and MySQL checks remain pending.
