# Design: Block admins from main-app login + Email verification on signup

**Date:** 2026-08-03
**Status:** Pending approval
**Scope:** Two related backend + frontend auth changes:
1. Prevent admin accounts from logging in through the main `/login` form.
2. Require new users to verify their email via a 24h JWT link before they can log in.

## Background

Findings from `auth.controller.js`, `auth.middleware.js`, `emailService.js`, `token.util.js`, `js/modules/auth.js`, `js/admin/admin-auth.js`, `js/pages/auth-pages.js`:

- The DB has only two roles: `'buyer'` and `'admin'` (`config/database.js:39`).
- `exports.login` (`auth.controller.js:99-147`) does **no role gating** — admin creds pass through `/auth/login` freely.
- The admin login form (`js/admin/admin-auth.js:30`) calls the **same** `/auth/login` endpoint via `api.admin.login`. Its only admin-enforcement is a *client-side* `role !== 'admin'` check (`admin-auth.js:36-38`).
- The DB `users.isVerified` column is **student-status** verification (admin approves your `.edu.gh` email), not email-ownership. There is **no** `emailVerified` column today.
- `nodemailer` is configured in `backend/utils/emailService.js`. `sendPasswordResetEmail` (`emailService.js:51`) is the closest existing template — it embeds a JWT link into `${FRONTEND_URL}#/reset-password?token=...`. If SMTP env vars are missing, sends are silently skipped (`getTransporter` returns `null`).
- `token.util.js` already has `generateResetToken(id)` → `jwt.sign({ id, type: 'reset' }, JWT_SECRET, { expiresIn: '1h' })`, verified in `auth.controller.js:289` with a `decoded.type !== 'reset'` discriminator. Mirror this for email verification.
- The login page handler (`auth-pages.js:797-847`) flattens every failure into a single `'Login failed: ' + result.error` toast. It does not branch on `code`. `authManager.login` (`auth.js:367-414`) does not propagate `code` either. Both need plumbing for the two features.
- Rate-limit patterns: `authLimiter` (20 / 15min) applies to all `/api/auth/*`. `verificationLimiter` (5 / hour) is the closest precedent for the resend endpoint. Limiters stack when mounted on progressively-specific paths (current `authLimiter` + a stricter resend limiter would both run).

## Feature A — Block admins from main-app login

**Decision:** Context-aware header approach (A1).

### Backend

`exports.login` in `backend/controllers/auth.controller.js:99`:

1. Read `const authContext = (req.get('X-Auth-Context') || 'app').toLowerCase();`
   Recognized values: `'app'` (main form, default) and `'admin'` (admin form).
2. After fetching + decrypting the user and before minting the token (after the existing `isSuspended` / password checks pass), reject role mismatches:
   - `if (authContext === 'app' && mappedUser.role === 'admin')` → `throw new ApiError(403, 'Please use the admin login page for admin accounts.', { code: 'ADMIN_MUST_USE_ADMIN_LOGIN' });`
   - `if (authContext === 'admin' && mappedUser.role !== 'admin')` → `throw new ApiError(403, 'Access denied. Admin credentials required.', { code: 'NOT_ADMIN' });`
3. `ApiError(statusCode, message, details)` (`backend/utils/errorHandler.js:11-18`) already accepts a `details` object, and the global `errorHandler` at `errorHandler.js:101-145` serializes `details` into the JSON response (line 143: `...(errorResponse.details && { details: errorResponse.details })`). **Reuse `details` to carry the `code`**, e.g. `throw new ApiError(403, 'Please use the admin login page for admin accounts.', { code: 'ADMIN_MUST_USE_ADMIN_LOGIN' });`. Response becomes `{ success: false, error: '...', details: { code: 'ADMIN_MUST_USE_ADMIN_LOGIN' } }`. No shared-class change needed.

Do **not** rate-limit-by-role or block at the network level. This is UX routing, not a security boundary — an attacker can still POST raw credentials to `/auth/login` and obtain a token if they know admin creds. Add a code comment stating this explicitly:

```
// NOTE: This is UX isolation, not a security boundary. Admin tokens minted
// elsewhere still work. Do NOT rely on this for access control.
```

### Frontend — main login form

- `js/modules/auth.js:367` `login(email, password)`: add an optional second options argument `{ authContext = 'app' }`. Attach `X-Auth-Context: authContext` to the fetch headers. When the response is a 403 with `details.code`, propagate it back to the caller by augmenting the returned object: `return { success: false, error: data.error, code: data.details?.code };` (currently `code` is dropped).
- `js/pages/auth-pages.js:797-847` `handleLogin`: if `result.code === 'ADMIN_MUST_USE_ADMIN_LOGIN'`, show a toast `'Admin account — redirecting to admin login.'` and `navigateTo('/admin')` (which renders `Pages.renderAdminLogin` via `_requireAdmin()`). Do not keep the user on the main login overlay.

### Frontend — admin login form

- `js/admin/admin-auth.js:30` `login(email, password)`: when calling `api.admin.login`, attach `X-Auth-Context: 'admin'`. The existing client-side `role !== 'admin'` check at `admin-auth.js:36` is now redundant but should be left as defense-in-depth (with a comment noting the backend now also enforces it).
- `js/utils/api.js:360` `admin.login`: `api.post` (`api.js:234-239`) currently takes only `(url, data)` and does not forward a headers/options argument; `request` (`api.js:120`) **does** accept `{ headers }` (line 138, destructured `_optHeaders`). Extend `api.post(url, data, { headers } = {})` to merge `headers` into the call, then have `admin.login(email, password, { authContext })` pass `{ headers: { 'X-Auth-Context': authContext } }`. Default `authContext: 'admin'` for the admin auth manager.

### What stays the same

- The admin route guard `_requireAdmin()` (`js/pages/pages.js:27-51`) is unchanged. The two storage paths (`unihub_session` and `admin_session`) are unchanged — an admin can still log in through the admin form and `adminAuthManager` reads its own slot.
- `authLimiter` is unchanged.

### Edge cases

- Header spoofing: covered above; documented as non-security.
- Missing header on old mobile clients: defaults to `'app'`, so a normal buyer is unaffected and an admin with an old client gets the friendly redirect.
- `/_tryOfflineLogin` (`auth.js:200`): untouched. It is dev-only (`_isDevMode()` gate).

## Feature B — Email verification on signup

**Decision:** Stateful JWT link (B1).

### Database migrations

Add three columns to `users` in `backend/config/database.js`. The existing local + Turso migration plumbing (`database.js:474-785`) supports `ALTER TABLE users ADD COLUMN ...` for already-existing DBs.

New columns (all nullable / with defaults so existing rows don't break):

```sql
emailVerified INTEGER DEFAULT 0,
emailVerificationJti TEXT,          -- SHA-256 of the JWT jti (do not store raw JWT)
emailVerificationTokenExpiry INTEGER  -- ms epoch, mirrors resetTokenExpiry pattern
```

- `emailVerified` is **distinct** from `isVerified` (student verification). Do not reuse `isVerified`.
- The jti is stored as a SHA-256 hash so a DB leak doesn't expose valid JWTs. Use `crypto.createHash('sha256').update(jti).digest('hex')`.
- Default `emailVerified: 0` for all new rows, including Google OAuth users (currently Google users get `isVerified: googleUser.email_verified ? 1 : 0` at `auth.controller.js:377` — we'll set `emailVerified` the same way for Google users since Google vouches for the email).

Migration order:
1. Add to inline `CREATE TABLE users (...)` (`database.js:19-53`).
2. Append to `runTursoMigrations` migration runner (`database.js:474-733`) — three small `ALTER TABLE` statements wrapped in the existing `try { ... } catch (e) { if (!e.message.includes('duplicate column')) throw e; }` pattern.
3. Append to the local dev migration path (`database.js:749-785`) similarly.

### Token util

Add to `backend/utils/token.util.js`:

```js
const generateEmailVerificationToken = (id) => {
  const jti = crypto.randomBytes(16).toString('hex');
  const token = jwt.sign({ id, type: 'email', jti }, process.env.JWT_SECRET, {
    expiresIn: '24h',
  });
  return { token, jti };
};
```

- 24h expiry (chosen).
- `crypto` is already a Node built-in; ensure `const crypto = require('crypto')` is imported.
- Export alongside `generateToken`, `decodeToken`, `generateResetToken`.

### Email service

Add `sendEmailVerificationEmail(email, verifyUrl)` to `backend/utils/emailService.js`, exported alongside the other senders. Copy the HTML template style from `sendPasswordResetEmail` (`emailService.js:51-70`):

- Subject: `"Uni-Hub — Verify your email"`.
- Body contains the verify link and a line "This link expires in 24 hours. If you didn't create an account, you can ignore this email."
- `from`: `"Uni-Hub" <${process.env.EMAIL_USER}>` (same as existing convention; do **not** switch to `EMAIL_FROM` — it's currently unused).
- Falls through to `sendEmail`, which silently returns `{ success: false }` if SMTP isn't configured.

### Register endpoint

`exports.register` in `auth.controller.js:20-92` changes:

1. On user creation, set `emailVerified: process.env.NODE_ENV === 'production' ? 0 : (googleUser? ... )` — for non-Google signup, always `0`.
2. Call `const { token, jti } = generateEmailVerificationToken(newUser.id);`
3. Persist `emailVerificationJti = sha256(jti)` and `emailVerificationTokenExpiry = Date.now() + 24*60*60*1000`.
4. Build `verifyUrl = ${FRONTEND_URL}/verify-email.html?token=${token}`. (Need to add a small static `verify-email.html` or add a hash route — see Frontend below.)
5. `await sendEmailVerificationEmail(user.email, verifyUrl);`
6. **Do not** mint a session token. The response is now:
   ```json
   { "success": true, "message": "Account created. Check your email to verify your account.", "code": "EMAIL_VERIFICATION_REQUIRED" }
   ```
   (No `data.user`, no `data.token`.)
7. **Dev affordance:** if `process.env.NODE_ENV !== 'production'` AND `sendEmail` returned `{ success: false }` (SMTP unconfigured), include the raw `verifyUrl` in the response under `data.verifyUrl`. Never in production. This replaces the existing "instant login on signup" UX with a clickable dev link — keeps local dev ergonomic.
8. Mark with `// TODO: security review — verify-email flow touches token minting and sends link via email.` per AGENTS.md.

### Verify endpoint (new)

`GET /api/auth/verify-email?token=...` — public, no CSRF.

Controller `exports.verifyEmail` (`auth.controller.js`, append):

1. `const decoded = jwt.verify(token, JWT_SECRET);` — on error, redirect to `${FRONTEND_URL}#/verify-email?status=invalid`.
2. If `decoded.type !== 'email'` → same redirect with `status=invalid`.
3. Fetch user by `decoded.id`. If not found → `status=invalid`.
4. If `user.emailVerified === 1` → redirect with `status=already-verified`.
5. Compute `sha256(decoded.jti)` and compare to `user.emailVerificationJti`. If mismatch → `status=invalid` (token was superseded by a resend).
6. If `Date.now() > user.emailVerificationTokenExpiry` → redirect with `status=expired`.
7. Otherwise: `db('users').updateById(id, { emailVerified: 1, emailVerificationJti: null, emailVerificationTokenExpiry: null })`. Redirect with `status=success`.

Use `res.redirect(302, ...)` so a clicked email link needs no JS on the intermediate page.

Registry: `backend/routes/auth.routes.js` — add `router.get('/verify-email', verifyEmail);` in the public section.

### Resend endpoint (new)

`POST /api/auth/resend-verification { email }` — public, requires CSRF (existing `authLimiter` and the new dedicated limiter both apply).

Controller `exports.resendVerification`:

1. Validate email format; 400 on invalid.
2. Find user. If none found: return `200` with generic `"If an account exists, a verification email has been sent."` (do not leak which emails exist).
3. If `user.emailVerified === 1`: return `400"Email already verified."` (this one IS safe to leak — they're verifying their own email).
4. Mint new `{ token, jti }`, persist jti-hash + expiry (this supersedes any prior link), send email.
5. If `NODE_ENV !== 'production'` and SMTP returns `{ success: false }`, return the raw `verifyUrl` in `data.verifyUrl` (mirrors the register dev affordance).
6. Return `200 { success: true, message: '...generic...' }`.

**Rate limiter**: add to `backend/server.js` near line 192:

```js
const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many resend requests. Try again later.' },
});
app.use('/api/auth/resend-verification', resendVerificationLimiter);
```

Keys off IP (matches other limiters). Stacks with `authLimiter` (20/15min) — accepted. Environment-overridable: no — hardcoded like `verificationLimiter`.

### Login-side check

`exports.login` gains, after the existing `isSuspended` / password-validity checks and **before** the admin-context check (so an unverified admin is told to verify, not redirected):

```js
if (!mappedUser.emailVerified) {
  throw new ApiError(401, 'Please verify your email before logging in.', {
    code: 'EMAIL_NOT_VERIFIED',
    email: maskedEmail, // masked, e.g. j***@example.com — never store/log raw
  });
}
```

Use `details.code` per the chosen approach. Mask the email before putting it in the response so we don't echo raw PII back. Frontend reads `result.code === 'EMAIL_NOT_VERIFIED'` (after the manager's `details?.code` unwrap).

If `ApiError` is extended with `code` support (Feature A), use that mechanism here too. Note: per the chosen approach, `ApiError` is **not** extended — `code` travels via `details: { code }`, and the frontend reads `result.details?.code` (typical plumb-through). For backward simplicity in the frontend, the auth manager unwraps `details.code` into the top-level `result.code` so the page handler doesn't have to know about `details`.

### `requireVerified` middleware

Leave **unchanged**. It gates *student* verification (`users.isVerified`) on checkout-like routes. It already short-circuits admins. The two flags are independent: an admin is `emailVerified: 1` by default (seed/boot), `isVerified: 1` by default; a buyer must `emailVerified: 1` (our new flow) to log in, then still needs `isVerified: 1` (the existing student-verification admin approval) to checkout.

### Frontend

#### Static verification landing page

Add `public/verify-email.html` (or use a hash route — TBD per implementation). The frontend router is hash-based, but `res.redirect()` to a hash route works fine because the browser handles the fragment. Simplest: the backend redirects to `${FRONTEND_URL}#/verify-email?status=...`, and a new router handler in `js/router.js` + a small render method on `Pages` shows a success/expired/invalid card with a "Go to login" button.

This avoids needing a new static HTML page and keeps everything in the SPA.

Router additions:
- `js/router.js` and `Pages.registerRoutes()` (`js/pages/pages.js:197-207`): add `router.register('/verify-email', (params) => Pages.renderEmailVerifyResult(params));`
- New `renderEmailVerifyResult({ status })` renders the appropriate card. All strings are static (no user input) — no XSS surface, but still escape the `status` param via `SecurityUtils.escapeHtml` out of caution.

#### Register page

`handleRegister` (`auth-pages.js:1114-1148`): currently calls `authManager.register(...)` and on `success` logs the user in and navigates to `#/browse`. Update:

1. If `result.code === 'EMAIL_VERIFICATION_REQUIRED'`:
   - Show toast `'Account created — check your email to verify.'`
   - If `result.data?.verifyUrl` (dev affordance), show it as a clickable link in a small banner so the dev can click through.
   - Close the auth overlay and navigate to `#/login` (or render a small "check your email" panel — TBD; simplest is navigate to `#/login` with a pre-populated toast).
   - Do **not** save a session.
2. Otherwise (e.g. network error): unchanged.

`authManager.register` (`auth.js:264-318`): currently on success unconditionally calls `saveSession`. Update:
- Inspect parsed response. If `data.code === 'EMAIL_VERIFICATION_REQUIRED'`, do **not** call `saveSession`. Return `{ success: true, code: 'EMAIL_VERIFICATION_REQUIRED', message, data: data.data }`.
- Otherwise behave as today (this branch only fires in tests / when SMTP misconfigured in prod — defensive).

#### Login page

`handleLogin` (`auth-pages.js:797-847`) already needs a `code` branch for Feature A. Add an `EMAIL_NOT_VERIFIED` branch:

- Show a toast `'Please verify your email before logging in.'`
- Render a small inline banner above the login form with a "Resend verification email" button. Clicking it calls `api.auth.resendVerification(email)` (new `js/utils/api.js` method).
- On resend success: toast `'Verification email sent. Check your inbox.'`. On rate-limit (429): toast `'Too many resend attempts. Try again later.'`. On generic success: `'If an account exists, a verification email has been sent.'`

#### `js/utils/api.js`

- Add `api.auth.resendVerification(email)` → `this.post('/auth/resend-verification', { email })`.
- Extend `api.post(url, data, { headers } = {})` (currently `api.js:234-239`) to forward the optional `headers` into `this.request` (which already supports them at `api.js:138-146`).
- Extend `api.admin.login(email, password, { authContext })` to pass `{ headers: { 'X-Auth-Context': authContext || 'admin' } }`.

The `js/modules/auth.js:367` `login()` does its own raw `fetch` (does NOT go through `api.post`). For the main login form, add the `X-Auth-Context: 'app'` header there directly alongside the existing `X-CSRF-Token` header.

## Tests

Backend (`backend/tests/`):

- New `auth.emailVerification.test.js`:
  - Register a user → assert no session, assert `emailVerified: 0`, assert jti stored.
  - Verify with bad token → 302 to `?status=invalid`.
  - Verify with valid token → 302 to `?status=success`, `emailVerified: 1`, jti cleared.
  - Resend → supersedes old token (old token now `?status=invalid`).
  - Resend a verified user → 400.
  - Resend 4× in hour → 429.
  - Login as unverified → 401 `EMAIL_NOT_VERIFIED`.
  - Login as verified → 200, session returned.
- New cases in `auth.test.js` (or new file) for admin-block:
  - `X-Auth-Context: app` + admin creds → 403 `ADMIN_MUST_USE_ADMIN_LOGIN`.
  - `X-Auth-Context: admin` + non-admin creds → 403 `NOT_ADMIN`.
  - `X-Auth-Context: admin` + admin creds → 200 (admin login still works).
  - Default header + non-admin → 200 (regular buyer login unaffected).

Frontend: no unit-test harness (per AGENTS.md). Add a Playwright e2e under `e2e/`:
- `e2e/email-verification.spec.js`: load homepage → register → see toast → trigger dev `verifyUrl` (run backend in `NODE_ENV !== 'production'` so the link is returned in the response) → click → land on `#/verify-email?status=success` → navigate to `#/login` → now login succeeds.
- `e2e/admin-block.spec.js`: log in as admin from main login form → toast → land on `#/admin` (admin login).

Backend lint + Jest must pass: `cd backend && npm run lint:check && npm test`.
Frontend verification: `npm run lint:check && npx prettier --check "js/**/*.js" "css/**/*.css" && npm run build`.

## Security review checklist (for the human review pass)

- The `emailVerificationTokenExpiry` *is* redundant with the JWT's own `exp`. Kept explicitly because the DB pattern (`resetTokenExpiry`) is what the codebase uses and because a future admin "force-clear pending verifications" admin-page query is easier with it than parsing JWTs in SQL. Document this.
- `emailVerificationJti` is stored as a SHA-256 hash so a DB read-only leak doesn't hand an attacker a usable JWT.
- Resend endpoint does not leak which emails are registered (200 generic otherwise) except the one case where the user proves ownership by clicking ("already verified" — acceptable).
- The `X-Auth-Context` header is **explicitly** documented as UX routing, not access control.
- No PII logged. No raw JWT in console. Sentry payloads scrubbed of email/token.
- All new strings rendered into `innerHTML` go through `SecurityUtils.escapeHtml`.

## Out of scope

- Consolidating `authManager` + `adminAuthManager` into a single auth surface. (Separate refactor — flag for later.)
- Migrating existing buyer rows to `emailVerified: 1`. (Decision: existing users keep default `0` — but since they're already logged in with 7-day tokens, they keep their sessions. New logins of existing users will be forced to verify. If this is undesired, run a one-time `UPDATE users SET emailVerified = 1 WHERE role = 'buyer'` as part of the migration — open question for user.)
- Admin password rotation, OAuth-only verification, or magic-link login.
- Migrating inline handlers in `auth-pages.js` (`onsubmit="..."`) to `addEventListener` (separate CSP work; flagged in AGENTS.md). When we edit `handleLogin`, we will leave the inline `onsubmit` in place but ensure any interpolated data is escaped (there isn't any currently).

## Open questions for user

1. Should existing buyer rows be auto-marked `emailVerified: 1` in the migration, or should existing users also be forced through the email-verification flow on their next login?
2. Confirm: Google OAuth users should be auto-`emailVerified: 1` (Google vouches for the email) — yes/no?
