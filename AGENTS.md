# AGENTS.md — Rules for AI assistants editing Uni-Hub

Uni-Hub (a.k.a. JERTS CART) is a Ghana university student marketplace: a vanilla-JS
SPA frontend talking to an Express + SQLite/libSQL backend in this same repo.
This file is the high-signal context an agent would otherwise get wrong.

The developer remains in full control and is responsible for any harm caused by
merged code. AI output must be reviewed like code from a human colleague —
especially in `js/modules/auth.js`, `payment.js`, `checkout.js`, `js/admin/*`,
and `backend/`.

---

## Commands

Two npm packages live in this repo — install both:

```bash
npm install                              # frontend (root)
( cd backend && npm install )            # backend
```

If the root install fails on peer deps, `start-uni-hub.sh` falls back to
`npm install --legacy-peer-deps`.

Run both services at once (installs deps if missing, starts both, tails logs):

```bash
./start-uni-hub.sh        # frontend :8000, backend :5000
```

Frontend dev / build (root):

```bash
npm run dev               # Vite dev server on :3000 (auto-opens browser)
npm start                 # http-server on :8000 (production-style static serve)
npm run build             # Vite build -> dist/. MUST succeed before claiming done.
npm run lint              # eslint --fix
npm run lint:check        # eslint, non-fixing — use this for verification
npx prettier --check "js/**/*.js" "css/**/*.css"
npm run format            # prettier --write
```

Backend (`cd backend`):

```bash
npm run dev               # nodemon, auto-reload
npm start                 # production
npm run seed              # seed SQLite with sample data
npm run lint:check        # backend eslint (separate config from frontend)
npm test                  # jest (backend only; frontend has no unit tests)
```

E2E (Playwright, run from repo root):

```bash
npx playwright test                       # runs all e2e/*.spec.js, chromium only
npx playwright test e2e/browse.spec.js     # single file
```

Playwright's `webServer` config auto-starts the backend (`node backend/server.js`
on :5000) and `http-server` on :8000 with `reuseExistingServer: true`. If
services are already running they will not be restarted. `e2e/audit-full.js` is
a standalone audit script, not a Playwright test — do not run it via `playwright test`.

Verification order before declaring a frontend task done:
**`npm run lint:check` -> `npx prettier --check` -> `npm run build`**.
All three must pass. For backend changes add `cd backend && npm run lint:check && npm test`.

---

## Architecture

```
Browser :8000  ──HTTP/CORS──>  Backend :5000  ──>  SQLite (dev) / Turso libSQL (prod)
(vanilla JS SPA)               (Express + helmet + rate-limit + JWT + CSRF)
```

- **Frontend**: pure vanilla JS (ES2020), no framework, no TypeScript, no bundler
  at runtime. SPA with hash-based router (`js/router.js`). Templates are JS template
  literals rendered via `innerHTML` — this is the main XSS surface (see Security).
- **Backend is in this repo, not "out of scope".** `backend/server.js` is the
  entrypoint. Express + `better-sqlite3` (local dev) or `@libsql/client` (Turso,
  production). JWT auth, `bcryptjs` password hashing, `helmet`, `express-rate-limit`,
  `express-session`, CSRF via `/api/auth/csrf-token`, Paystack for payments,
  Cloudinary for image uploads, `nodemailer`, `socket.io` for messaging.
- **Build is non-obvious.** `vite.config.js` has a custom `static-app-build`
  plugin: `closeBundle` transpiles `js/` with **esbuild** (target
  chrome80/safari13/firefox72, ESM) into `dist/js/`, copies `css/` and rewrites
  `dist/index.html` to inject `/js/app-init.js?v=7`. The Vite-produced
  `/assets/main-*.js` bundle is stripped from the output. So the deployed app
  loads `dist/js/app-init.js` directly; do not rely on Rollup bundling or
  expect imports to be graph-resolved at runtime — they are ES modules served as-is.
- **Hybrid module system.** Modules use `import`/`export` **and** assign to
  `window.*` for backwards-compat. `js/setup/globals.js` runs after all modules
  and re-exports every constant/manager onto `window`. ESLint's `globals` block
  enumerates these (e.g. `router`, `authManager`, `productsManager`,
  `BrowsePage`, etc.) — `eslint:recommended` is the only ruleset, no plugin.
- **Frontend talks to backend via `js/utils/api.js`** (the `api` singleton). It
  resolves `baseURL` from `window.API_URL` -> `import.meta.env.VITE_API_URL` ->
  `https://uni-hub-bnxi.onrender.com/api`, fetches/attaches CSRF tokens on
  mutating requests, supports a static-deploy fallback when the backend is
  unreachable, and has a 30s timeout. All backend calls go through it — do not
  bypass with raw `fetch` to backend routes.
- **Admin routes** (`js/admin/*`) must enforce `authManager.isAuthenticated`
  plus admin-role checks before rendering; never rely on hiding UI alone.

---

## Environment / setup gotchas

- **CSRF secret must be set in production.** `backend/.env.example` warns: if
  `CSRF_SECRET` is empty, every server restart invalidates all CSRF tokens and
  users see 403s on every POST/PUT/DELETE until they hard-refresh. Generate with
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- **`backend/.env` is not committed** — copy from `backend/.env.example` and fill
  in `JWT_SECRET`, `ADMIN_PASSWORD`, Cloudinary, Paystack, nodemailer, Google
  OAuth as needed. **Never commit real secrets.**
- **SQLite is zero-setup**: `backend/data/unihub.db` is auto-created on first
  run. For production, set `TURSO_URL` + `TURSO_AUTH_TOKEN` to use shared libSQL.
- **`npm install --legacy-peer-deps`** is used by `start-uni-hub.sh` as a
  fallback — if a clean `npm install` errors on peer deps, use the flag.
- **Test credentials** (from `start-uni-hub.sh`): admin `admin@unihub.local` /
  `Admin123!`; seller `john@student.ug.edu.gh` / `Student123!`; buyer
  `sarah@student.upsa.edu.gh` / `Student123!`. Seed data (`npm run seed` in
  `backend/`) populates these. Useful when wiring e2e/tests but never commit
  them to a production-controlled env.
- **Vite dev server is on :3000** but the backend CORS (`FRONTEND_URL`) is
  configured for `:8000`. When developing with `npm run dev`, either add
  `http://localhost:3000` to `FRONTEND_URL` in `backend/.env` or use
  `npm start` (:8000) for backend-integrated work.

---

## Code style

Enforced by ESLint (`.eslintrc.json`) + Prettier (`.prettierrc`), both
non-default in places:

- 2-space indent, single quotes, semicolons required, LF line endings, Unix.
- `prefer-const`, `no-var`, `eqeqeq` (always), `curly` (all), `no-console`
  warn (only `console.warn/error/info` allowed).
- Prettier: `printWidth: 100`, `arrowParens: avoid`, `trailingComma: es5`,
  `bracketSpacing: true`.
- ESLint `argsIgnorePattern`/`varsIgnorePattern` is `^_` — prefix intentionally
  unused names with `_` (e.g. `_cartManager`, `_authManager` — these exist).
- Max 1 consecutive blank line; `eol-last` enforced; no trailing spaces.

---

## Security — reuse existing utilities, do not reinvent

Uni-Hub already has security infrastructure. Reuse it:

- `js/utils/security.js` — `SecurityUtils.escapeHtml`, `sanitizeInput`,
  `sanitizeObject`, `sanitizeUrl` (blocks `javascript:`/`data:`/`vbscript:`),
  `sanitizeHtml` (small tag allowlist), `validateEmail`, `containsXssPatterns`,
  `safeTruncate`, `generateSecureToken`, `hashData` (SHA-256 via `crypto.subtle`).
- `js/utils/crypto.js` — `CryptoUtil.generateSalt`, `generateSecureToken`.
  Password hashing is `bcryptjs` **on the backend** — never hash passwords
  client-side, never store passwords in `localStorage`/`sessionStorage`/cookies.
- `js/utils/validation.js` — input validators. Extend these over new regex.
- `js/utils/sentry.js` — `sentryManager`/`Sentry` for error reporting. Scrub PII
  and secrets before sending; do not log tokens, session objects, emails, phone
  numbers, or payment info to console, Sentry, or toasts.
- `js/modules/auth.js` — bearer-token session in `localStorage` (token + user +
  `expiresAt`). Validate `expiresAt > Date.now()` client-side and revalidate
  with `/auth/me` server-side; treat server as authoritative.

Secure-coding rules:

- **All external input is untrusted.** Includes URL hash params (router), search
  queries, `localStorage`/`sessionStorage` reads, `import.meta.env`, `window.*`,
  backend responses, and user-generated product/messaging/review content.
  Validate format and length at the boundary.
- **No raw user text in `innerHTML`.** Always `SecurityUtils.escapeHtml` (or
  `sanitizeHtml` if a small allowlist is needed). Highest-risk surface in the app.
- **URLs** go through `SecurityUtils.sanitizeUrl` before `href`/`src`.
- **No secrets in committed JS.** Use `import.meta.env.VITE_*` or backend-injected
  `window.*`. Same for backend — use `backend/.env` + `dotenv`, never literal keys.
- **Payments / PII** (`js/modules/payment.js`, `checkout.js`, backend Paystack):
  never store card numbers, CVV, or full PAN in the browser. Tokenize on the
  provider side; only store provider tokens + last4. Apply PCI-DSS minimization;
  do not log or transmit more than needed. AI changes here require human review.
- **Error handling** catches and logs internally with context; user-facing toast
  shows a generic message. No stack traces, file paths, or secrets surfaced to
  UI. Scrub Sentry payloads of PII before send.
- **No `eval` / `new Function` / `setTimeout(string)` on any input.**
- **Admin routes** (`js/admin/*`), `auth.js`, `payment.js`, `checkout.js`:
  AI-generated code in these requires a human review pass before merge.

---

## CSP / inline handlers — proactive refactor

Templates contain inline handlers (`onclick="..."`, `onchange="..."`,
`onkeyup="..."` — e.g. `js/pages/browse-pages.js`, landing-page methods). They
block a strict Content-Security-Policy and amplify XSS if user data leaks into
the attribute string.

- **Do not add new inline handlers.** Use `addEventListener` or event delegation
  on a stable parent dispatching on `data-action` attributes.
- When editing a file that already has inline handlers, **flag/refactor the ones
  you touch**: add `// TODO: security review / CSP — migrate to addEventListener`
  if a full refactor is out of scope, otherwise replace with delegation. Ensure
  any dynamic data in attributes is HTML-escaped.
- Never interpolate user-derived strings into `onclick`/`onchange`/`onkeyup`.

---

## Supply chain

- Frontend uses `npm` (vite, http-server, eslint, prettier, @playwright/test).
  Backend uses `npm` with its own `package.json` + `package-lock.json`.
- Pin exact versions; prefer latest stable at add-time. Note any new dep in the
  PR/commit and flag for security review. Prefer packages with >1k stars, recent
  commits, and a LICENSE. Avoid hallucinated package names.
- Don't add a dependency when `js/utils/*`, the platform (Web Crypto, `fetch`,
  `URL`, `crypto.subtle`), or an existing dep already does the job.
- Add deps via `npm install` (writes `package.json` + `package-lock.json`) —
  never copy-paste source. Keep `package-lock.json` committed; don't hand-edit.
- **External scripts/CDNs**: use locally hosted assets under `public/`, or a CDN
  `<script>` with an `integrity` SRI hash and `crossorigin="anonymous"`. No inline
  `<script>` from untrusted hosts, no unverified third-party CDNs.

---

## Standards hooks

- Adhere to **OWASP Top 10** (injection, broken auth, XSS, broken access
  control) and **OWASP ASVS** where applicable.
- Follow **SAFECode Fundamental Practices** for validation, auth, crypto, error
  handling, supply chain.
- For checkout / personal data flows apply **PCI-DSS** data minimization (no
  PAN/CVV in client) and avoid logging PII.
- Add `// TODO: security review — <reason>` on complex/sensitive logic that
  should get human eyes before merge, and on any third-party component that may
  need a future update or audit.

---

## Self-review before reporting done (RCI)

1. **Review your previous answer and find problems with it** — look for XSS,
   missing validation, secret leakage, broken auth checks, CSRF regressions,
   CSP regressions, new vulnerabilities, and a11y/ UX fallout.
2. **Based on the problems you found, improve your answer** — patch, re-run
   `npm run lint:check`, `prettier --check`, `npm run build` (and backend
   `lint:check`/`test` if touched), iterate until clean. Cite command output in
   the completion message — don't claim success on intent.
3. For a suspect area ask e.g. "Analyze `modules/checkout.js` for whether card
   data is persisted client-side. Consider localStorage keys, form state, and
   Sentry payloads. Justify with specific evidence."

---

## Things not to do

- Don't disable security features (XML entity security, deserialization type
  checks, CSRF, CSP, `SameSite` cookies, helmet, rate-limiting) — even
  "temporarily".
- Don't roll your own crypto. Use `crypto.subtle` / `crypto.getRandomValues`
  via `SecurityUtils` / `CryptoUtil`; `bcryptjs` on the backend for passwords.
- Don't store passwords, full card numbers, CVVs, or raw PII in `localStorage` /
  `sessionStorage` / IndexedDB / cookies.
- Don't add `<script src="https://...">` without `integrity` + `crossorigin`.
- Don't bypass `js/utils/api.js` with raw `fetch` to backend routes.
- Don't assume the Rollup/Vite bundle is the deployed artifact — the build
  strips it and ships transpiled `dist/js/` directly (see Architecture).
- Don't log error objects wholesale to Sentry/Toast if they may contain PII;
  scrub first.
- Don't commit `backend/.env`, `cookie.txt`, `backend/data/*.db`,
  `backend/uploads/`, or any `*.log` file.
