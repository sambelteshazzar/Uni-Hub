# Refactor Findings Log

Strict-refactor rule: entries here are NEVER fixed inside refactor commits.
Developer triages and fixes separately. Format: `### F<n> <category> — <where>`

### F1 tooling — lint gate blind spot (fixed during refactor task 1)
`lint:check` used `eslint js/**/*.js`, which in POSIX sh only expands to
`js/*/*.js`; top-level files were never linted. Fixed to `eslint js`.
Note for CI/reviewers: any historical "lint passed" claim covered one level only.

### F2 debt — 11 eslint warnings (run `npx eslint js` for current list)
Files: `js/app-init.js`, `js/app.js`. Non-blocking; fix separately.

### F3 test — e2e/admin.spec.js:18 deep-link /admin/dashboard fails on clean HEAD
`npx playwright test e2e/admin.spec.js` fails at "deep link /admin/dashboard
renders the dashboard, not a 404 route error": the page renders blank and the
topbar "Add product" button never appears within the 10s expect timeout.
Reproduced with task-2 changes stashed (i.e. at task-1 HEAD 160cc770), so it
pre-dates the dead-code deletion and is unrelated to it. Triage separately.
