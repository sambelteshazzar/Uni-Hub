# Refactor Findings Log

Strict-refactor rule: entries here are NEVER fixed inside refactor commits.
Developer triages and fixes separately. Format: `### F<n> <category> — <where>`

### F1 tooling — lint gate blind spot (fixed during refactor task 1)
`lint:check` used `eslint js/**/*.js`, which in POSIX sh only expands to
`js/*/*.js`; top-level files were never linted. Fixed to `eslint js`.
Note for CI/reviewers: any historical "lint passed" claim covered one level only.

### F2 debt — 11 eslint warnings (run `npx eslint js` for current list)
Files: `js/app-init.js`, `js/app.js`. Non-blocking; fix separately.

### F3 test — e2e deep-link tests require an SPA-fallback server on :8000
`e2e/admin.spec.js:18` (history-mode deep link `/admin/dashboard`) fails with a
blank page when the only :8000 server is Playwright's own webServer command
(`npx http-server . -p 8000 -c-1 --cors`), which has NO SPA fallback — unknown
paths return a plain 404 instead of `index.html`. It passes only when a
fallback-capable server (`node tools/dev-server.mjs`, which mirrors the
vercel.json/render.yaml rewrites) is already running so `reuseExistingServer`
picks it up. Verified 5/5 green at 44f1ddcd AND 7dd32029 with the dev server
up — not a code regression. Triage options: document the precondition (done —
see plan global constraints) or add a proxy/fallback flag to playwright.config.js.

### F4 debt — js/pages/auth-pages.js:314 legacy shim switchVerificationTab still called from js/pages/bestbuy-auth-dashboard.js:760
Kept under the task-3 decision rule because the only caller is a real JS call
site (`AuthPageMethods.switchVerificationTab(tab)` inside the
`Pages.switchVerificationTab = function (tab) {...}` wrapper), not an inline
attribute string. Nuance for the tasks 14/15 handler migration: that wrapper
itself has ZERO callers anywhere in `js/`, `e2e/`, or `index.html` — no
`onclick="Pages.switchVerificationTab(...)"` remains in current source (only in
the git-ignored `.vercel/output` build artifact) — so the shim is reachable
only through dead code. `bestbuy-auth-dashboard.js` is out of scope for task 3;
re-check both sites when inline handlers are migrated and delete the wrapper +
shim together then.

### F5 debt — bestbuy-* filenames carry template naming
`js/pages/bestbuy-landing.js` and `js/pages/bestbuy-auth-dashboard.js` are live
(they provide Pages.renderLogin/register/ForgotPassword/ResetPassword/
StudentVerification and the landing renderer) but the "BestBuy" names are
vestigial from a template. Rename only in a future phase with load-order checks
(app-init.js module manifest + window-patch timing).

### F6 bug/product — Google signup marks emails pre-verified at account creation
backend: when Google reports a verified email, the account is created with
isVerified=1 — opposite of the manual-flow guarantee (which requires the
confirmation link). Google login does not touch isVerified for existing users,
and nothing in the app zeroes it afterwards. Product/security decision needed;
do not change silently. (Surfaced during the verification-gate support work.)

### F7 debt — unguarded SecurityUtils.escapeHtml call left inline at js/modules/modals.js:499 (not a guard site; out of scope for extraction)
Task 6 extracted every `typeof SecurityUtils !== 'undefined'` guard that tests
`escapeHtml`/`sanitizeUrl` into `js/utils/escape.js` (verified: those greps now
return only `escape.js`). There were ZERO non-escape SecurityUtils guards
(`hashData`, `containsXssPatterns`, …) in `js/`, so no such entry applies.
`js/modules/modals.js:499` (image lightbox template) calls
`SecurityUtils.escapeHtml` directly with no guard — nothing to extract, and the
file has no guard site, so it was outside task 6's enumeration. If
SecurityUtils were ever undefined at that point it would throw; fold it into
`escapeValue` during the next modals pass.

## Security-review TODOs (pre-existing, need human review)

- js/admin/admin-support.js:5 — ticket subjects/bodies are user-generated
- js/modules/checkout.js:776 — checkout verification gate (payment path)
- js/pages/static-pages.js:210 — event delegation on a stable parent (CSP)
- js/pages/auth-pages.js:506 — surface API error text without leaking internals
- js/pages/pages.js:1031 — admin routes render forms (CSP)
- js/pages/pages.js:3106 — checkout verification gate reconciliation
- js/pages/pages.js:4833 — destructive account action
- js/pages/pages.js:6651 — delegation on the stable host
- js/pages/pages.js:6722 — money-moving action
- js/utils/api.js:327 — GET cache keyed by URL only
- js/content/policies.js:9 — legal drafts (Ghana DPA alignment)
