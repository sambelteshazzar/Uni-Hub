# Refactor Findings Log

Strict-refactor rule: entries here are NEVER fixed inside refactor commits.
Developer triages and fixes separately. Format: `### F<n> <category> — <where>`

### F1 tooling — lint gate blind spot (fixed during refactor task 1)
`lint:check` used `eslint js/**/*.js`, which in POSIX sh only expands to
`js/*/*.js`; top-level files were never linted. Fixed to `eslint js`.
Note for CI/reviewers: any historical "lint passed" claim covered one level only.

### F2 debt — 11 eslint warnings (run `npx eslint js` for current list)
Files: `js/app-init.js`, `js/app.js`. Non-blocking; fix separately.
