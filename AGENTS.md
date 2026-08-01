# AGENTS.md — Security & Engineering Rules for AI Assistants

This file gives AI code assistants (opencode, Copilot, etc.) the project-specific
security and engineering rules they must follow when editing Uni-Hub. It distills
the OpenSSF / AI-ML Working Groups "Security-Focused Guide for AI Code
Assistants" (2025-08-01) into rules tuned to this codebase.

The developer remains in full control and is responsible for any harm caused by
merged code. AI output must be reviewed like code from a human colleague —
especially before merging into auth, payment, checkout, or admin code paths.

---

## 1. Refer to these files first

Uni-Hub already has security infrastructure. Reuse it instead of reinventing:

- `js/utils/security.js` — `SecurityUtils.escapeHtml`, `sanitizeInput`,
  `sanitizeObject`, `sanitizeUrl`, `sanitizeHtml`, `validateEmail`,
  `containsXssPatterns`, `safeTruncate`, `generateSecureToken`, `hashData`.
- `js/utils/crypto.js` — `CryptoUtil.generateSalt`, `generateSecureToken`.
  Password hashing is bcrypt on the backend; **never** hash passwords client-side.
- `js/utils/validation.js` — input validators. Prefer/extending these over custom regex.
- `js/utils/api.js` — backend client. Handles `baseURL` resolution, CSRF token
  fetch/attach, static-deploy fallback, timeout. All backend calls go through it.
- `js/modules/auth.js` — bearer-token session; **no passwords in localStorage**.
- `js/modules/payment.js`, `js/modules/checkout.js` — payment/PII surfaces.
- `js/utils/sentry.js` — error reporting; do not log PII/secrets to it.

Stack: vanilla JS (ES modules + some globals), Vite for build, no TS. Backend is
a separate service at `VITE_API_URL` / `window.API_URL` (default
`https://uni-hub-bnxi.onrender.com/api`). Static-deploy fallback when backend
is unreachable.

---

## 2. Secure coding — always

- **Treat all external input as untrusted.** Validate format and length at the
  boundary. External input includes: URL hash params (router), search queries,
  `localStorage`/`sessionStorage` reads, `import.meta.env`, `window.*` globals,
  backend responses, user-generated product/messaging/review content.
- **Output encoding for XSS.** Uni-Hub renders templates via `innerHTML`. Any
  user- or seller-generated text inserted into HTML MUST go through
  `SecurityUtils.escapeHtml` (or `sanitizeHtml` if a small tag allowlist is
  needed). Never interpolate raw `${userText}` into `innerHTML` strings.
  This is the single highest-risk surface in the app.
- **URLs**: pass through `SecurityUtils.sanitizeUrl` before placing in `href` /
  `src`. Blocks `javascript:`, `data:`, `vbscript:`, etc.
- **No secrets in code.** No API keys, tokens, passwords, or PII in committed
  JS. Use `import.meta.env.VITE_*` (Vite) or backend-injected `window.*` config.
  Never log tokens, session objects, emails, phone numbers, or payment info to
  console, Sentry, or toast messages.
- **Auth / sessions** (see `js/modules/auth.js`):
  - Sessions are a bearer token + user object in `localStorage` only — never passwords.
  - Validate token expiry client-side (`expiresAt > Date.now()`) and revalidate
    with `/auth/me` server-side; treat server response as authoritative.
  - Use constant-time comparison where the browser exposes timing-sensitive
    equality on secrets (rare in browser JS — prefer deferred-to-backend checks).
  - Enforce role checks (`isAuthenticated`, admin role) before rendering admin
    routes (`js/admin/*`); never rely on hiding UI alone.
- **Payments / PII** (`js/modules/payment.js`, `checkout.js`):
  - Never store card numbers, CVV, or full PAN in the browser. Use the upstream
    payment provider's hosted fields / redirect flow.
  - Tokenize on the provider side; only store provider tokens + last4.
  - Apply PCI-DSS data-minimization: don't log or transmit more than needed.
- **Error handling**: catch and log internally with context; show the user a
  generic message. No stack traces, file paths, or secrets surfaced to UI/toast.
  Use `js/utils/sentry.js` for reporting but scrub PII before sending.
- **Safe defaults / least privilege**: HTTPS by default, secure_COOKIE flags
  belong on the backend; on the client prefer `credentials: 'include'` only
  where the backend expects cookies (CSRF flow). Don't request permissions,
  storage, or scopes the feature doesn't need.
- **No `eval` / `new Function` / `setTimeout(string)` on any input.**
- **Dependencies**: prefer the standard library and existing deps. New npm
  packages must be real (avoid hallucinated names), pinned to an exact version,
  and added via `npm install` (writes `package.json` + `package-lock.json`) —
  never copy-pasted source. Note any new dep for human review.
- **External scripts / CDNs**: use locally hosted assets under `public/` or a
  CDN `<script>` with an `integrity` SRI hash and `crossorigin="anonymous"`.
  No inline `<script>` from untrusted hosts.

---

## 3. CSP / inline handlers — proactive refactor

Inline event handlers (`onclick="..."`, `onchange="..."`, `onkeyup="..."`)
appear throughout rendered templates (e.g. `js/pages/browse-pages.js`,
landing-page methods). They block a strict Content-Security-Policy and are an
XSS amplifier if any user data ever leaks into the attribute string.

Rule for new and edited code:
- **Do not add new inline handlers.** Use `addEventListener` or event
  delegation (a single listener on a stable parent that dispatches on
  `data-action` attributes).
- When editing a file that already has inline handlers, **flag and refactor**
  the ones you touch:
  1. Add a `// TODO: security review / CSP — migrate to addEventListener`
     comment if a full refactor is out of scope for the current change.
  2. Otherwise, replace with delegation: e.g.
     `gridEl.addEventListener('click', e => { const btn = e.target.closest('[data-action]'); ... })`
  3. Ensure any dynamic data placed into attributes is HTML-escaped via
     `SecurityUtils.escapeHtml`.
- Never interpolate user-derived strings into `onclick`/`onchange`/`onkeyup`
  attribute values even when keeping inline handlers temporarily.

---

## 4. Supply chain

- Use `npm` (vite/http-server/eslint/prettier/playwright already present).
- Pin exact versions in `package.json`; prefer latest stable at time of add and
  note that deps should be updated regularly via `npm audit` / `npm update`.
- Don't introduce a new dependency when `js/utils/*` or the platform (Web Crypto,
  `fetch`, `URL`, `crypto.subtle`) already does the job.
- For any new dependency, mention it in the PR/commit and flag for security
  review. Prefer packages with >1k stars, recent commits, and a LICENSE.
- Keep `package-lock.json` committed; don't hand-edit it.
- (Server-side SBOM/in-toto signing is out of scope for this repo; raised with
  the backend team when backend code is touched.)

---

## 5. Verification before claiming done

Before declaring a task complete, run (and read the output of):

```bash
npm run lint:check        # eslint, non-fixing
npx prettier --check "js/**/*.js" "css/**/*.css"
npm run build             # vite build — must succeed
```

For non-trivial JS/changes to security-sensitive modules
(`js/utils/security.js`, `crypto.js`, `api.js`, `modules/auth.js`,
`modules/payment.js`, `modules/checkout.js`, `admin/*`):

```bash
npx eslint js/<path>          # targeted check
# If available: npx semgrep --config p/owasp-top-ten js/
# If available: npx @microsoft/sarif-tools ... (CodeQL via GitHub Advanced Security)
```

Cite the command output in the completion message. If a check fails, fix it and
re-run — don't claim success on intent.

---

## 6. Self-review process (RCI)

After producing a code change, before reporting done, perform Recursive
Criticism and Improvement:

1. **Review your previous answer and find problems with it** — look for XSS,
   missing validation, secret leakage, broken auth checks, CSP regressions,
   new vulnerabilities introduced by the change, and accessibility/UX fallout.
2. **Based on the problems you found, improve your answer** — patch the code,
   re-run lint/format/build, and iterate until clean.
3. If a specific area is suspect, e.g. "Analyze `modules/checkout.js` for
   whether card data is persisted client-side. Consider localStorage keys,
   form state, and Sentry payloads. Justify with specific evidence."

---

## 7. Standards hooks

- Adhere to **OWASP Top 10** (injection, broken auth, XSS, broken access
  control, etc.) and **OWASP ASVS** where applicable.
- Follow **SAFECode Fundamental Practices** for validation, auth, crypto, error
  handling, and supply chain.
- For checkout / medical / personal data flows: apply **PCI-DSS** data
  minimization (no PAN/CVV in client) and avoid logging PII.
- Add `// TODO: security review — <reason>` on any complex or sensitive logic
  that should get human eyes before merge, and on any third-party component
  that may need a future update/audit.

---

## 8. Things not to do

- Don't disable security features (XML entity security, type checking during
  deserialization, CSRF checks, CSP, `SameSite` cookies) — even "temporarily".
- Don't roll your own crypto. Use `crypto.subtle` / `crypto.getRandomValues`
  via `SecurityUtils` / `CryptoUtil`, and bcrypt on the backend for passwords.
- Don't store passwords, full card numbers, CVVs, or raw PII in `localStorage`
  / `sessionStorage` / IndexedDB / cookies.
- Don't add `<script src="https://...">` without `integrity` + `crossorigin`.
- Don't merge AI-generated code into `js/admin/*`, `auth.js`, `payment.js`, or
  `checkout.js` without a human review pass — these are high-risk paths.
- Don't log error objects wholesale to Sentry/Toast if they may contain PII;
  scrub first.
