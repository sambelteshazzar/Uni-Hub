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

### F4 debt — js/pages/auth-pages.js:314 legacy shim switchVerificationTab still called from js/pages/bestbuy-auth-dashboard.js:760 (resolved during refactor task 15)
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

Task-14 re-check (inline handlers migrated in `auth-pages.js`): nothing
changed — no inline caller of `switchVerificationTab` existed then and none
exists now, so the shim stays. Reachability is unchanged: zero callers of the
`Pages.switchVerificationTab` wrapper, whose only body line is
`AuthPageMethods.switchVerificationTab(tab)` (`bestbuy-auth-dashboard.js:758-760`
→ `auth-pages.js:315`). Deleting the wrapper still needs
`bestbuy-auth-dashboard.js` (out of scope for task 14), so wrapper + shim are
kept as a pair; delete both together when that file is migrated. The other two
task-3 shims (`handleStudentVerification`, `handleDocumentVerification`) remain
absent — verified.

Task-15 resolution (inline handlers migrated in `bestbuy-auth-dashboard.js`):
the pair is DELETED. Its only trigger was ever the inline attribute string,
and `grep -rn "switchVerificationTab" js/ e2e/ index.html public/` returns
zero matches after the migration, so both sides were dead:
`Pages.switchVerificationTab` (was `bestbuy-auth-dashboard.js:758-762`, a
forwarder whose sole body line called the shim) and `AuthPageMethods.
switchVerificationTab` (was `auth-pages.js:312-317`, an intentional no-op
whose own comment said it existed only so "a stale inline onclick attribute
left in the DOM doesn't throw"). No inline attribute referencing either name
exists in `index.html` or `public/` either (the static-HTML audit for F12/F13
covers every `on*=` in those files; none is `switchVerificationTab`), so no
live caller was left behind. The sibling `Pages.handleFileSelect` forwarder was
KEPT: it is called for real by `auth-pages.js` `auth-file-select`
(`Pages.handleFileSelect(e)`) and by nothing else.

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

### F8 bug/product — cold deep-link to #/checkout intermittently renders the 500 error page (late-bound `renderStudentVerification`)

`Pages.renderStudentVerification` is not a static method on the `Pages` class.
It is attached ONLY by the `setInterval` poll at
`js/pages/bestbuy-auth-dashboard.js:7`/`735`, which waits for `window.Pages`
(exposed by `js/setup/globals.js:209`). The IIFE at
`js/pages/auth-pages.js:2209`-`2230` binds a list of `AuthPageMethods` onto
`Pages` that does NOT include `renderStudentVerification` — so line 735 is the
sole source.

Boot order: `globals.js` sets `window.Pages` → `app-init.js:246` calls
`Pages.registerRoutes()` → router dispatches the initial hash →
`renderCheckout` runs. Console timestamps show globals→registerRoutes 27ms and
registerRoutes→`Navigation error` 11ms. `renderCheckout` then calls
`this.renderStudentVerification()`
(`js/pages/pages.js:3210`; same pattern at 3163, 3570) and throws
`TypeError: this.renderStudentVerification is not a function`.
`Router.navigate` catches it (`js/router.js:269`) and `showError` paints the
"Something's off" / 500 page instead of the verification gate.

Measured (Playwright, cold load of `/#/checkout` with a seeded cart + signed-in
unverified buyer): a 10ms sampler showed `window.Pages` defined at t=771ms with
`renderStudentVerification === undefined`, and bound only at t=866ms. The
error log falls at ~t=809ms (console deltas above, offset by the t=771 sample)
— inside that 95ms window, i.e. the dispatch beat the poll. Reproduced 4/4 runs
failing, with an earlier full run passing — it is a coin-flip on where the 50ms
tick lands relative to
`await this._reconcileVerification(...)` (`js/pages/pages.js:3204`), whose
network round-trip sometimes gives the poll enough time to win.

The same shape applies to `this.renderLogin()` (`js/pages/pages.js:3198`,
bound at `js/pages/bestbuy-auth-dashboard.js:228`) for a logged-out
`#/checkout` deep link.

`safeCall` (`js/pages/pages.js:927`) already retries late-bound methods, but
only for the route's top-level dispatch — the calls *inside* `renderCheckout`
bypass it. Fix direction: await a bind-ready check (or move
`renderStudentVerification`/`renderLogin` onto the class) before the gate
calls. Product decision; do not change silently. Surfaced by
`e2e/characterization.spec.js`, which pins the post-boot behaviour.

### F9 debt — `pillGroup` local `const data` shadows the `import * as data` namespace

After task 10's extraction, `js/pages/pages.js` has `import * as data from
'../ui/data.js'` at module scope while `pillGroup` declares a function-local
`const data = dataAttr || 'data-adm-pill'`. The local binding shadows the
namespace for the whole function body (declared before first use, so no TDZ
today) and `no-shadow` is not in `eslint:recommended` — currently safe, but a
future bare `data` reference anywhere else in pages.js would silently resolve
to the namespace. Rename the local in a later pass.

### F10 process — plan template for delegation infra was unsafe as written

The plan's step-2 template dispatched click/change/keyup/submit against ONE
flat `PAGE_ACTIONS` map, which would cross-fire (a hover action executing on
click, click actions on keyup). As implemented in task 13 (`js/pages/pages.js`
~10107+): per-event registries (`PAGE_ACTIONS`, `PAGE_CHANGE_ACTIONS`,
`PAGE_SUBMIT_ACTIONS`, `PAGE_MOUSEOVER_ACTIONS`, `PAGE_MOUSEOUT_ACTIONS`),
keyup listener dropped (no inventory sites), `composedPath()` walk honoring
`e.cancelBubble` for nested-card semantics, and per-action try/catch with
rethrow so one throwing handler doesn't silence the rest. Later handler tasks
(14–15) must copy the implemented pattern, not the plan template.

### F11 debt — auth-pages.js renderLogin / renderForgotPassword / renderResetPassword are unreachable duplicates

Task 14's inline-handler inventory surfaced this: every call site in `js/`,
`e2e/`, and `index.html` goes through `Pages.renderLogin()` /
`Pages.renderForgotPassword()` / `Pages.renderResetPassword()`, and
`js/pages/bestbuy-auth-dashboard.js` overwrites all three on `Pages` from its
boot IIFE (`:228`, `:539`, `:624` — its own header calls these the "Canonical
login, register, forgot/reset password, verification pages"). The auth-pages
attach list (`attachAuthPageMethods`, `js/pages/auth-pages.js:2358`) binds only
the `handle*` / `closeAuthOverlay` / `switchAuthModal` / `renderVerify*` /
`openChangeUniversityOverlay` names — NOT the renderers — so
`AuthPageMethods.renderLogin` (`auth-pages.js:639`), `renderForgotPassword`
(`:1473`) and `renderResetPassword` (`:1544`) have zero callers, and those
templates (plus the handlers task 14 migrated inside them) are dead code.
`renderRegister` (`:1073`) is the exception: still reachable via
`handleRegister` → `_showRegisterUniversityStep` → `this.renderRegister()`
(`:1386` → `:1431`), so its migrated handlers are live. Decide separately:
delete the dead renderers, or re-point the attach list / router at them — never
inside a refactor commit.

### F12 debt — inline handler in static HTML at index.html:100 (29 lines, 32 occurrences)

Task 15's static-HTML audit (`grep -rnE '\son[a-z]+=' index.html public/`)
found 42 occurrences; none of them is in scope for this refactor (only `js/**`
was to be migrated, and the rule is findings-only for HTML). This entry is the
`index.html` share: 29 lines carrying 32 handlers — 27 `onclick`, 2
`onkeypress`, 1 `onfocus`, 1 `oninput`, 1 `onblur` — at lines 100, 101, 108,
116, 124, 132, 139, 140, 145, 146, 147, 151, 156, 168, 177, 185, 186, 191, 192,
194, 195, 196, 197, 198, 199, 203, 204, 207, 208. All of them are the app
shell's own chrome (navbar search / cart / wishlist / notifications / dark
toggle / auth buttons, mobile drawer, mobile search), all calling the same
`Pages.*` / `searchManager.*` API the migrated registries now call, so they
would convert to the same `data-action` + document-delegation style as task 15
— but `index.html` was out of scope and was NOT edited. Until they do, a strict
Content-Security-Policy (`script-src`/`style-src` without `'unsafe-inline'`,
`script-src-attr 'none'`) cannot be enabled: these are live inline event
handlers in the served shell, plus `index.html:100` mixes four of them on one
input. Line 151 and 186 additionally embed multi-statement JS (variable
declarations + `setTimeout`) inside the attribute string, the pattern that
task 13's F10 write-up calls out as the reason flat string dispatch is unsafe.

### F13 debt — inline handler in static HTML at public/html/components/bestbuy-landing.html:22 (10 lines, 10 occurrences)

The other share of the task-15 static-HTML audit: 10 lines, every one an
`onclick="Pages.renderBrowse(); return false;"` /
`onclick="Pages.renderRegister(); return false;"` pair — lines 22, 55, 116,
164, 169, 174, 179, 184, 227, 230. Same CSP debt as F12, but with an extra
wrinkle: no code fetches this file (nothing in `js/`, `index.html`, or the
build references `html/components/`), so it is a stale static copy of the
landing page that predates `js/pages/bestbuy-landing.js` — the landing markup
actually served is the JS template that task 15 just migrated. Decide
separately: delete the file, or migrate its handlers to `data-action` and
let it be consumed again. NOT edited in task 15 (findings-only for HTML).

### F14 bug/critical — `js/utils/security.js` is never loaded; all `SecurityUtils` guards fall back to unescaped `String()`

Discovered during task 15's review. `js/utils/security.js:289` assigns
`window.SecurityUtils = SecurityUtils`, but **nothing in the repo imports that
module**:
- `grep -rn "from.*security\.js\|import.*security\.js"` across `*.js`/`*.html`
  (excluding node_modules/dist/.vercel) → zero hits;
- the full `app-init.js` module manifest (levels 1–6, through
  `setup: [globals]`) does not list `js/utils/security.js`;
- `index.html` has no script tag for it; `main.js`/`app.js`/`setup/globals.js`
  reference it only in comments.

Consequence: every `typeof SecurityUtils !== 'undefined' && SecurityUtils.*`
guard evaluates false at runtime. That includes `js/utils/escape.js`
(`escapeValue` → `String(v)` = **no HTML escaping**; `safeUrlValue` →
`String(url)` = **no URL sanitization**) and the direct call at
`js/modules/modals.js:499`. All template-built `innerHTML` interpolation
through `_pageEsc`/`escapeValue` therefore emits backend data raw.

This is **pre-existing** (the guards date from before the refactor; the
refactor only centralized the identical fallback) and is likely mitigated in
part by backend `sanitize.middleware.js` input sanitization — but frontend
defense-in-depth is absent and reflected/stored content reaching `innerHTML`
unescaped is an XSS risk.

Fix direction (human decision — activating escaping is a BEHAVIOR change and
must not land inside a refactor commit): add `js/utils/security.js` to the
early utils level of the app-init manifest (before any consumer), then smoke
all templates for double-escaping fallout. Do not enable silently.

### F15 debt — inline `<script>` in generated receipt markup

`js/pages/pages.js` (~:2144 in the pre-task-13 numbering; grep
`window.print` to locate) emits `<script>window.onload=function(){window.print();}</script>`
inside the order-receipt template string. Property-assignment form (not an
element attribute), so it is invisible to the `\son[a-z]+=` inventory, but it
is still an inline script that blocks a strict CSP (`script-src` without
`'unsafe-inline'`) whenever a receipt renders. Convert to a `load` listener
attached after render in a later CSP pass.

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

## Phase status — 1c complete: pages.js 10107 lines (was 11082 at plan baseline, -975), kit in js/ui/* (768 lines: layout 226 / overlays 215 / data 237 / feedback 90) + js/utils/escape.js (18), compat object pure spreads (9/5/8/4 = 26). Full e2e 45/45. Cache stamps 42/43/v43.

## Phase 1 complete — status
- js/pages/pages.js: 10,336 lines (was 11,082; 1c extraction ended at 10,107, 1d delegation registries added ~229 net)
- js/ui/*: 26 kit methods across 4 files (layout 226 / overlays 215 / data 237 / feedback 90 = 768) + js/utils/escape.js (18)
- inline handlers in js/**: 0 (grep -oE '\son[a-z]+=' → no output; index.html/public findings F12/F13 remain, HTML out of scope)
- findings open: 14 of 15 (F4 resolved in task 15; all others unfixed by design — triage next, F14 critical first)
- verification: frontend gates green (0 errors / 11 pre-existing warnings), backend 35 suites / 313 tests, full e2e 45/45, build exit 0, cache stamps 43/44/v44
