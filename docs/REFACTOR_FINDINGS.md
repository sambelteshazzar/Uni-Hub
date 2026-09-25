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
