# Frontend Refactor Phase 1 (Surgical → Characterization → UI Kit → Handlers) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute phase 1 of the approved refactor spec — surgical cleanup, characterization tests, extraction of the 26-method UI kit from `pages.js` into `js/ui/*`, and migration of every inline handler in `js/**` to delegation — with zero behavior changes.

**Architecture:** Strict-refactor, findings-log workflow (bugs are logged, never fixed inline). The kit lives on `class AdminUI` (pages.js:72–821) and moves out through a module-level compat object `const AdminUI = { ...extracted, ...inlineRemainders }` that shrinks task by task until it is pure spreads, so `AdminUI.x()` (router.js) and `window.AdminUI` keep working at every commit. Phase 2 (feature-split of renderers) is a separate later plan.

**Tech Stack:** Vanilla ES2020 modules (no framework), esbuild via Vite build, ESLint + Prettier, Playwright e2e, Express/SQLite backend (untouched).

## Global Constraints

- Frontend gates after every commit-sized unit, verbatim: `npm run lint:check` → `npx prettier --check "js/**/*.js" "css/**/*.css"` → `npm run build`. Full e2e `npx playwright test --workers=1` at phase milestones and after every event-wiring batch (tasks 7, 12, 13, 14, 15, 16).
- Backend sanity at phase end only (task 16): `cd backend && npm run lint:check && npm test` (baseline: 35 suites / 313 tests — must be unchanged).
- Strict refactor-only: **no behavior changes**. Bugs/UX issues found → `docs/REFACTOR_FINDINGS.md`, never fixed in these commits (spec decision A).
- No new dependencies. Zero new inline handlers (all existing ones leave). `window.*` and `globals.js` export surface unchanged. Escaping preserved at identical semantic points.
- Never push; the developer pushes. Commit prefix `refactor:` (or `chore:` for tooling), one kind of change per commit.
- Push/deploy only at milestone tasks 6, 11, 16 — each includes the cache bump. If deploying earlier, first apply the bump snippet shown in task 6 (three files: `MODULE_VERSION` in `js/app-init.js`, `APP_INIT_VERSION` in `vite.config.js`, `?v=N` in `index.html` — all three must match).
- Shell cwd does not persist between commands; run each with an explicit path or workdir.
- If a gate is red twice in a row, or a diff starts mixing two kinds of change, stop and re-plan (spec stop rules).

---

### Task 1: Fix the lint gate blind spot + bootstrap findings log

**Files:**
- Modify: `package.json` (both `lint` and `lint:check` scripts)
- Modify: `.eslintrc.json` (globals)
- Create: `docs/REFACTOR_FINDINGS.md`

**Interfaces:**
- Consumes: nothing.
- Produces: `docs/REFACTOR_FINDINGS.md` format (every later task appends); lint gate that covers the whole `js/` tree.

- [ ] **Step 1: Reproduce the blind spot**

Run: `npx eslint js 2>&1 | tail -5`
Expected: `22 problems (11 errors, 11 warnings)` — while `npm run lint:check` passes, because `eslint js/**/*.js` in POSIX sh expands to `js/*/*.js` only (top-level `js/router.js`, `js/app-init.js`, `js/app.js` are never linted).

- [ ] **Step 2: Fix the script glob**

In `package.json` change both scripts to lint the directory recursively:

```json
"lint": "eslint js --fix",
"lint:check": "eslint js"
```

- [ ] **Step 3: Auto-fix the 7 curly errors**

Run: `npx eslint js --fix`
Expected: 7 errors fixed (6 in `js/router.js` lines 68–75, 1 in `js/app-init.js` line 220); 4 `no-undef AdminUI` errors remain in `js/router.js` (381, 382, 411, 412).

- [ ] **Step 4: Add `AdminUI` to ESLint globals**

`AdminUI` is assigned to `window` at `js/pages/pages.js:821`; `router.js` legitimately reads it. In `.eslintrc.json`, inside the existing `globals` block, add:

```json
"AdminUI": "readonly"
```

(match the existing quoting/style of that block).

- [ ] **Step 5: Verify the gate**

Run: `npm run lint:check`
Expected: exits 0; remaining output is 11 warnings only (in `js/app-init.js`, `js/app.js`) — warnings do not fail the gate.

- [ ] **Step 6: Create the findings log**

Create `docs/REFACTOR_FINDINGS.md` with this exact content (task 2+ append to it):

```markdown
# Refactor Findings Log

Strict-refactor rule: entries here are NEVER fixed inside refactor commits.
Developer triages and fixes separately. Format: `### F<n> <category> — <where>`

### F1 tooling — lint gate blind spot (fixed during refactor task 1)
`lint:check` used `eslint js/**/*.js`, which in POSIX sh only expands to
`js/*/*.js`; top-level files were never linted. Fixed to `eslint js`.
Note for CI/reviewers: any historical "lint passed" claim covered one level only.

### F2 debt — 11 eslint warnings (run `npx eslint js` for current list)
Files: `js/app-init.js`, `js/app.js`. Non-blocking; fix separately.
```

- [ ] **Step 7: Commit**

```bash
git add package.json .eslintrc.json docs/REFACTOR_FINDINGS.md js/app-init.js js/router.js
git commit -m "chore: lint the whole js/ tree and fix surfaced errors"
```

---

### Task 2: Dead-code scan of `pages.js` statics + the `handleSearch` shadow

**Files:**
- Modify: `js/pages/pages.js` (only confirmed-unreachable methods deleted)
- Modify: `docs/REFACTOR_FINDINGS.md`

**Interfaces:**
- Consumes: findings log format (task 1).
- Produces: `pages.js` with only referenced statics; findings appended for anything ambiguous.

- [ ] **Step 1: Run the reachability scan**

Run from repo root (single rule: a method with **zero word occurrences anywhere besides its own definition** is unreachable — word-grep catches `this.x(`, `Pages.x(`, `window.x =`, and `safeCall('x')`):

```bash
for m in $(grep -oP '(?<=^  static )(async )?\K\w+' js/pages/pages.js); do
  n=$(grep -rE "\b$m\b" js e2e index.html --include='*.js' --include='*.html' | grep -v "static $m" | wc -l)
  [ "$n" -eq 0 ] && echo "CANDIDATE: $m"
done
```

Expected: a short candidate list (if empty, skip to Step 3). Caveat to respect: dynamic construction like `Pages['x'+y]` would evade this grep — before deleting, eyeball each candidate's name for string concatenation usage (`grep -rn "Pages\['" js` must not mention it).

- [ ] **Step 2: Delete confirmed-unreachable candidates**

For each `CANDIDATE: name`:
1. `grep -rn "name" js e2e index.html` — confirm the only hit is its definition in `pages.js`.
2. Delete the whole `static name(...) { ... }` block.
3. Do NOT touch anything reachable via `window.*` contracts (a reachable method would have shown `word count > 0`).

- [ ] **Step 3: Investigate the `handleSearch` shadow**

`Pages.handleSearch` is defined twice: class static at `js/pages/pages.js:1152` and re-assigned by `bestbuy-auth-dashboard.js:788` (its IIFE runs ~50 ms after `pages.js` loads, so the patch wins for any call after that).

1. Run: `grep -rn "handleSearch" js index.html`
2. If every caller is user-interaction-driven (nav input handlers — impossible before module load+50 ms), delete the class static at `js/pages/pages.js:1152` and note it in the commit body.
- If any caller can fire before the patch (or you cannot prove it cannot), leave the static and append a findings entry instead:
  `### F3 debt — pages.js:1152 handleSearch static shadowed by bestbuy-auth-dashboard.js:788 patch`

- [ ] **Step 4: Gate + smoke**

Run: `npm run lint:check && npx prettier --check "js/**/*.js" && npm run build && npx playwright test e2e/browse.spec.js e2e/admin.spec.js --workers=1`
Expected: all green (browse exercises search, admin exercises sidebar/table).

- [ ] **Step 5: Commit**

```bash
git add js/pages/pages.js docs/REFACTOR_FINDINGS.md
git commit -m "refactor: delete unreachable pages.js statics"
```

(Append a findings line first if Step 3 chose the log branch.)

---

### Task 3: Legacy shim triage (three known sites)

**Files:**
- Modify: `js/pages/auth-pages.js` (~lines 305–320, ~lines 530–560)
- Modify: `js/pages/pages.js` (~line 10005)
- Modify: `docs/REFACTOR_FINDINGS.md`

**Interfaces:**
- Consumes: findings log format.
- Produces: fewer no-op shims, or findings entries where shims are still referenced.

- [ ] **Step 1: Read each shim**

Run:
```bash
sed -n '305,320p' js/pages/auth-pages.js
sed -n '530,560p' js/pages/auth-pages.js
sed -n '9998,10020p' js/pages/pages.js
```
Record each shim's function name (comments say: a no-op tab switcher, thin onsubmit shims, a "legacy entry point kept so older callers keep working").

- [ ] **Step 2: Apply the decision rule to each**

For each name: `grep -rn "<name>" js e2e index.html --include='*.js'`.
- **Callers = none / only comments / only stale inline-handler strings in other code slated for task 13–15:** delete the shim, record in the commit body.
- **Any real caller:** keep, append findings entry `### F4 debt — <file>:<line> legacy shim <name> still called from <where>`.
- Shims kept here get deleted in tasks 13/14 if their only callers were inline handlers being migrated — re-check then.

- [ ] **Step 3: Gate + commit**

Run: `npm run lint:check && npx prettier --check "js/**/*.js" && npm run build`
Expected: green.

```bash
git add js/pages/auth-pages.js js/pages/pages.js docs/REFACTOR_FINDINGS.md
git commit -m "refactor: remove unused legacy shims"
```

---

### Task 4: Triage the 42 marker matches into findings

**Files:**
- Modify: `docs/REFACTOR_FINDINGS.md` (append only; no code changes)

**Interfaces:**
- Consumes: marker inventory (step 1 reproduces it).
- Produces: complete triage record; zero code changes.

- [ ] **Step 1: Re-enumerate**

Run: `grep -rn "TODO\|FIXME\|HACK\|deprecated\|legacy\|workaround" js --include="*.js" -i`
Expected: ~42 lines.

- [ ] **Step 2: Classify each line**

- **`TODO: security review ...` lines → append as findings** under a `## Security-review TODOs (pre-existing, need human review)` heading, one entry each with `file:line — text`. Known seed (verify against the live grep, add any missed):

```
js/admin/admin-support.js:5 — ticket subjects/bodies are user-generated
js/modules/checkout.js:776 — checkout verification gate (payment path)
js/pages/static-pages.js:210 — event delegation on a stable parent (CSP)
js/pages/auth-pages.js:506 — surface API error text without leaking internals
js/pages/pages.js:1031 — admin routes render forms (CSP)
js/pages/pages.js:3134 — checkout verification gate reconciliation
js/pages/pages.js:4861 — destructive account action
js/pages/pages.js:6816 — delegation on the stable host
js/pages/pages.js:6887 — money-moving action
js/utils/api.js:327 — GET cache keyed by URL only
js/content/policies.js:9 — legal drafts (Ghana DPA alignment)
```

- **Explanatory "legacy" comments** (router hash-mode docs, etc.) → leave in code, no log entry (they document live behavior).
- **Naming debt → one entry:** `### F5 debt — bestbuy-* filenames (bestbuy-landing.js, bestbuy-auth-dashboard.js) carry template naming; both are live (they patch Pages.renderLogin/register/StudentVerification and the landing renderer). Rename only in a future phase with load-order checks.`
- **Google auto-verify → one entry:** `### F6 bug/product — Google signup marks emails pre-verified (backend/controllers/auth.controller.js:596 area, backend/routes/auth.routes.js:52 area): isVerified=1 at creation when Google reports a verified email — opposite of the manual-flow guarantee. Product/security decision needed.`

- [ ] **Step 3: Commit (log only)**

```bash
git add docs/REFACTOR_FINDINGS.md
git commit -m "docs: triage refactor markers into findings log"
```

---

### Task 5: Create `js/utils/escape.js` (escape/sanitize helpers, pure move)

**Files:**
- Create: `js/utils/escape.js`
- Modify: `js/pages/pages.js` (lines 14–26 replaced by an import)

**Interfaces:**
- Consumes: nothing.
- Produces: `export { escapeValue, safeUrlValue }` — consumed by tasks 6, 8–11 (ui files alias them as `_pageEsc`/`_pageSafeUrl`).

- [ ] **Step 1: Create the module with byte-identical bodies**

```js
// Shared escape helpers — pure move of pages.js module-level wrappers.
// Behavior is intentionally identical to the original: guard first, coerce to
// String, fall back to the raw value if SecurityUtils is unavailable.
const escapeValue = v => {
  if (typeof SecurityUtils !== 'undefined' && SecurityUtils.escapeHtml) {
    return SecurityUtils.escapeHtml(String(v === null || v === undefined ? '' : v));
  }
  return String(v === null || v === undefined ? '' : v);
};

const safeUrlValue = url => {
  if (typeof SecurityUtils !== 'undefined' && SecurityUtils.sanitizeUrl) {
    return SecurityUtils.sanitizeUrl(url) || '';
  }
  return String(url === null || url === undefined ? '' : url);
};

export { escapeValue, safeUrlValue };
```

- [ ] **Step 2: Wire pages.js**

In `js/pages/pages.js`, delete the two `const _pageEsc = ...` / `const _pageSafeUrl = ...` declarations (lines 14–26) and add at the top of the file (pages.js lives in `js/pages/`, so the utils path is `../utils/`):

```js
import { escapeValue as _pageEsc, safeUrlValue as _pageSafeUrl } from '../utils/escape.js';
```

- [ ] **Step 3: Verify no remaining local definitions**

Run: `grep -n "const _pageEsc\|const _pageSafeUrl" js/pages/pages.js`
Expected: no output.

- [ ] **Step 4: Gate + smoke**

Run: `npm run lint:check && npx prettier --check "js/**/*.js" && npm run build && npx playwright test e2e/browse.spec.js e2e/admin-approve-single-sync.spec.js --workers=1`
Expected: green (both specs render escaping-dependent tables/templates).

- [ ] **Step 5: Commit**

```bash
git add js/utils/escape.js js/pages/pages.js
git commit -m "refactor: extract shared escape helpers from pages.js"
```

---

### Task 6: Migrate other `SecurityUtils` escape/sanitize guards (duplicate extraction, rule of three)

**Files:**
- Modify: files listed by step 1 (known set: `js/admin/admin-dashboard.js`, `js/modules/notifications.js`, `js/modules/search.js`, `js/pages/messages.js`, `js/pages/universities-page.js`, `js/pages/browse-pages.js`, `js/pages/static-pages.js`, `js/pages/auth-pages.js`, `js/router.js`)
- Modify: `docs/REFACTOR_FINDINGS.md` (only if ambiguous sites are found)
- Modify: `js/app-init.js`, `vite.config.js`, `index.html` (cache bump)

**Interfaces:**
- Consumes: `escapeValue` / `safeUrlValue` from task 5.
- Produces: no remaining hand-rolled escape/sanitize guards outside `js/utils/escape.js`.

- [ ] **Step 1: Enumerate guard sites**

Run: `grep -rn "typeof SecurityUtils !== 'undefined'" js --include="*.js"`
Expected: ~17 hits across 10 files (3 in pages.js are now gone after task 5).

- [ ] **Step 2: Convert escape/sanitize sites, one kind of change only**

For each site whose guard tests `SecurityUtils.escapeHtml` or `SecurityUtils.sanitizeUrl`: replace the whole `typeof ... ? ... : ...` expression with `escapeValue(<same argument>)` / `safeUrlValue(<same argument>)` — argument expression copied verbatim, add `import { escapeValue } from '<relative path>/utils/escape.js';` at the file top.
Sites guarding **any other** method (`hashData`, `containsXssPatterns`, …): leave untouched, append findings entry `### F7 debt — non-escape SecurityUtils guard left inline at <file:line> (out of scope for extraction)`.

- [ ] **Step 3: Verify extraction complete**

Run: `grep -rn "typeof SecurityUtils !== 'undefined' && SecurityUtils.escapeHtml" js --include="*.js"`
Expected: only `js/utils/escape.js` (and none for sanitizeUrl: `grep -rn "typeof SecurityUtils !== 'undefined' && SecurityUtils.sanitizeUrl" js --include="*.js"` → only `js/utils/escape.js`).

- [ ] **Step 4: Gate + cache bump**

Run: `npm run lint:check && npx prettier --check "js/**/*.js" && npm run build && npx playwright test --workers=1` (full suite — first milestone; expected all green).
Bump (deploy milestone): `MODULE_VERSION '40' → '41'` in `js/app-init.js`; `APP_INIT_VERSION '41' → '42'` in `vite.config.js`; `app-init.js?v=41` → `?v=42` in `index.html`.
Re-run: `npm run build` (must stay green).

- [ ] **Step 5: Commit**

```bash
git add js/ docs/REFACTOR_FINDINGS.md vite.config.js index.html
git commit -m "refactor: consolidate escape/sanitize guards into shared helpers"
```

---

### Task 7: Characterization specs (the 1b safety gate)

**Files:**
- Create: `e2e/characterization.spec.js`
- Modify: `docs/REFACTOR_FINDINGS.md` if any pinned behavior looks like a bug

**Interfaces:**
- Consumes: Playwright webServer config (auto-starts backend :5000 + http-server :8000); `e2e/helpers/admin-auth.js` → `injectAdminSession(page)`.
- Produces: pinned behavior for checkout gate, dashboard/orders, messages, static pages, admin pages — the net tasks 8–15 run against.

- [ ] **Step 1: Confirm storage/session constants**

Run: `grep -n "STORAGE_KEY_PREFIX\|CURRENT_USER:" js/utils/constants.js`
Expected: prefix used to build `unihub_session`-style keys (confirm exact strings; the helper `e2e/helpers/admin-auth.js` shows the session object shape: `{...user, token, expiresAt}` written to the user-session key).

- [ ] **Step 2: Write the spec file**

```js
const { test, expect } = require('@playwright/test');
const { injectAdminSession } = require('./helpers/admin-auth');

const API = process.env.API_URL || 'http://localhost:5000/api';

// Characterization specs: pin CURRENT behavior before the refactor moves code.
// If an expectation fails: re-read the implementation. If actual behavior is
// intentional, update the expectation (the spec documents reality). If it
// looks like a bug, add it to docs/REFACTOR_FINDINGS.md — do NOT change
// product code in this task (spec rule A: strict refactor-only).

async function registerBuyer(request, stamp) {
  const csrf = await request.get(`${API}/auth/csrf-token`);
  const token = (await csrf.json()).csrfToken;
  const headers = { 'X-CSRF-Token': token };
  const email = `char-${stamp}@test.local`;
  const phone = `055${String(stamp).slice(-8)}`;
  const reg = await request.post(`${API}/auth/register`, {
    headers,
    data: { name: 'Characterization Buyer', email, password: 'Student123!', phone, university: 'atu' },
  });
  expect(reg.status(), await reg.text()).toBeLessThan(300);
  const login = await request.post(`${API}/auth/login`, { headers, data: { email, password: 'Student123!' } });
  expect(login.status(), await login.text()).toBe(200);
  const body = await login.json();
  return body.data; // { user, token, ... }
}

async function injectBuyerSession(page, data) {
  await page.addInitScript(() => { window.API_URL = 'http://localhost:5000/api'; });
  await page.addInitScript(
    ({ value }) => window.localStorage.setItem('unihub_session', JSON.stringify(value)),
    { value: { ...data.user, token: data.token, expiresAt: Date.now() + 3600_000 } }
  );
}

test.describe('Characterization: checkout gate', () => {
  test('unverified signed-in buyer on #/checkout is routed to verification', async ({ page, request }) => {
    const stamp = Date.now();
    const data = await registerBuyer(request, stamp);
    await injectBuyerSession(page, data);
    await page.goto('/');
    await page.waitForTimeout(2500);
    const addBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Add")').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(800);
    }
    await page.goto('/#/checkout');
    await page.waitForFunction(() => location.hash.includes('verification'), null, { timeout: 8000 });
    const appText = await page.locator('#app').innerText();
    expect(appText.length).toBeGreaterThan(20);
  });

  test('logged-out #/checkout never reaches payment fields', async ({ page }) => {
    await page.goto('/#/checkout');
    await page.waitForTimeout(2500);
    const paymentish = page.locator('input[name*="card"], #card-number, [data-payment-option]');
    // Pin the actual redirect: if this fails, read renderCheckout +
    // Pages._reconcileVerification and update THIS expectation to reality.
    expect(await paymentish.count()).toBe(0);
  });
});

test.describe('Characterization: signed-in pages', () => {
  test('buyer dashboard and orders render content', async ({ page, request }) => {
    const data = await registerBuyer(request, Date.now());
    await injectBuyerSession(page, data);
    for (const hash of ['/dashboard', '/orders']) {
      await page.goto(`/#${hash}`);
      await page.waitForTimeout(2000);
      const text = await page.locator('#app').innerText();
      expect(text.length, `empty render for ${hash}`).toBeGreaterThan(20);
    }
  });

  test('buyer messages page renders (empty state acceptable)', async ({ page, request }) => {
    const data = await registerBuyer(request, Date.now());
    await injectBuyerSession(page, data);
    await page.goto('/#/messages');
    await page.waitForTimeout(2000);
    expect((await page.locator('#app').innerText()).length).toBeGreaterThan(10);
  });
});

test.describe('Characterization: static pages', () => {
  for (const hash of ['/faq', '/terms', '/privacy', '/about', '/track']) {
    test(`${hash} renders content`, async ({ page }) => {
      await page.goto(`/#${hash}`);
      await page.waitForTimeout(1500);
      expect((await page.locator('#app').innerText()).length).toBeGreaterThan(20);
    });
  }
});

test.describe('Characterization: admin pages smoke', () => {
  test('admin core pages render with a live session', async ({ page }) => {
    await injectAdminSession(page);
    for (const hash of [
      '/admin',
      '/admin/users',
      '/admin/products',
      '/admin/orders',
      '/admin/coupons',
      '/admin/reports',
      '/admin/verifications',
    ]) {
      await page.goto(`/#${hash}`);
      await page.waitForTimeout(2000);
      const text = await page.locator('#app').innerText();
      expect(text.length, `empty render for ${hash}`).toBeGreaterThan(50);
    }
  });
});
```

Note on phone uniqueness: `registerBuyer` uses a timestamp-derived phone because `users.phone` is globally unique locally — never reuse a fixed phone.

- [ ] **Step 3: Run; pin reality; never change product code**

Run: `npx playwright test e2e/characterization.spec.js --workers=1`
- Failures caused by wrong expectations → adjust the **spec** to the actual behavior after reading the implementation (state what you pinned in the commit body).
- Failures that look like product bugs → `docs/REFACTOR_FINDINGS.md` entry, then make the spec pin current behavior anyway.
- `unihub_session` key wrong → fix from step 1's constant lookup.

- [ ] **Step 4: Full suite green + commit**

Run: `npx playwright test --workers=1` → expected all green (existing + new).

```bash
git add e2e/characterization.spec.js docs/REFACTOR_FINDINGS.md
git commit -m "test: characterization specs for checkout gate, dashboards, admin smoke"
```

---

### Task 8: Extract `js/ui/layout.js` + convert `class AdminUI` to compat object

**Files:**
- Create: `js/ui/layout.js`
- Modify: `js/pages/pages.js` (remove 9 methods from the kit class; class → object literal)

**Interfaces:**
- Consumes: `escapeValue`/`safeUrlValue` (task 5).
- Produces: `js/ui/layout.js` exports `{ brand, profile, navItem, navSection, sidebar, topbar, pageHeader, wireSidebar, wireSearch }`; `pages.js` has `import * as layout from '../ui/layout.js';` and `const AdminUI = { ...layout, <17 inline remainders> };` with `window.AdminUI = AdminUI;` intact. Later tasks spread `...overlays`, `...data`, `...feedback` into this object.

- [ ] **Step 1: Create `js/ui/layout.js`**

Cut these 9 methods out of `class AdminUI` (anchor lines in current pages.js: `brand` 74, `profile` 87, `navItem` 107, `navSection` 122, `sidebar` 127, `topbar` 200, `pageHeader` 216, `wireSidebar` 365, `wireSearch` 416) and paste them into the new file with these mechanical transforms (bodies otherwise byte-identical):

1. File header + helpers:

```js
// UI kit — layout primitives (extracted from pages.js class AdminUI).
import { escapeValue, safeUrlValue } from '../utils/escape.js';

const _pageEsc = escapeValue;
const _pageSafeUrl = safeUrlValue;
```

2. `static brand() {` → `export function brand() {` (same for all 9; none are async).
3. Inside moved bodies, references to sibling methods that moved WITH this file (`navSection`, `navItem`, `brand`, `profile`, …) become plain calls: `AdminUI.navSection(x)` → `navSection(x)`.
4. References to methods still inline in pages.js or on `Pages` stay exactly as written (`AdminUI.table(...)`, `Pages.something(...)` — eslint + runtime rule below decides).
5. Undefined identifiers after the move must resolve to: this file's siblings, `escape.js` imports, or window globals in `.eslintrc.json` (`Icons`, `Formatter`, `SecurityUtils`, …). Anything else → STOP and re-plan.

- [ ] **Step 2: Convert the class to the compat object**

In pages.js, replace `class AdminUI {` … `}` (now 17 remaining methods) with an object literal:

```js
import * as layout from '../ui/layout.js';

const AdminUI = {
  ...layout,
  statCard( ... ) { ... },   // remaining 17, `static ` keyword dropped, bodies unchanged
  ...
};
window.AdminUI = AdminUI;
```

Transform per remaining method: `static statCard(` → `statCard(` (keep the body verbatim). Object-literal method shorthand stays synchronous/same semantics. Keep `window.AdminUI = AdminUI;` (was line 821).

- [ ] **Step 3: Verify shape**

Run: `grep -n "class AdminUI" js/pages/pages.js` → no output.
Run: `grep -c "export function" js/ui/layout.js` → `9`.
Run: `grep -rn "new AdminUI\|getOwnPropertyNames(AdminUI\|for (.* in AdminUI" js` → no output (enumerability verify-item from the spec).

- [ ] **Step 4: Gate + targeted e2e**

Run: `npm run lint:check && npx prettier --check "js/**/*.js" && npm run build && npx playwright test e2e/admin.spec.js e2e/browse.spec.js e2e/auth.spec.js --workers=1`
Expected: green (layout primitives are exercised by admin sidebar/topbar/cards and browse search).

- [ ] **Step 5: Commit**

```bash
git add js/ui/layout.js js/pages/pages.js
git commit -m "refactor: extract UI kit layout primitives to js/ui/layout.js"
```

---

### Task 9: Extract `js/ui/overlays.js`

**Files:**
- Create: `js/ui/overlays.js`
- Modify: `js/pages/pages.js`

**Interfaces:**
- Consumes: task 8's compat object shape.
- Produces: `js/ui/overlays.js` exports `{ modalHtml, wireModal, confirmDialog, promptDialog, toast }`; compat object gains `...overlays`, drops 5 inline methods (12 remain).

- [ ] **Step 1: Cut and transform**

Methods (anchors: `modalHtml` 312, `wireModal` 337, `confirmDialog` 627, `promptDialog` 685, `toast` 764 — relative order may shift after task 8; locate by name). Same transforms as task 8 (header/imports/alias, `static` → `export function`, sibling refs become plain calls — `confirmDialog`/`promptDialog` use `modalHtml` in the same file ✓).

- [ ] **Step 2: Update compat object**

```js
import * as overlays from '../ui/overlays.js';
const AdminUI = { ...layout, ...overlays, /* 12 inline remainders */ };
```

- [ ] **Step 3: Verify**

Run: `grep -c "export function" js/ui/overlays.js` → `5`.
Run: `grep -n "modalHtml\|wireModal\|confirmDialog\|promptDialog\|static toast" js/pages/pages.js | head` → only compat/import lines, no `static` definitions.

- [ ] **Step 4: Gate + targeted e2e**

Run: `npm run lint:check && npx prettier --check "js/**/*.js" && npm run build && npx playwright test e2e/admin.spec.js e2e/cart.spec.js --workers=1`
Expected: green (dialogs/toasts used by cart & admin flows).

- [ ] **Step 5: Commit**

```bash
git add js/ui/overlays.js js/pages/pages.js
git commit -m "refactor: extract UI kit overlay primitives to js/ui/overlays.js"
```

---

### Task 10: Extract `js/ui/data.js`

**Files:**
- Create: `js/ui/data.js`
- Modify: `js/pages/pages.js`

**Interfaces:**
- Consumes: task 8/9 compat object shape.
- Produces: `js/ui/data.js` exports `{ statCard, statGrid, card, table, tableSkeleton, paginationFooter, rowMenu, _bindRowMenus }`; compat object gains `...data`, drops 8 inline methods (4 remain).

- [ ] **Step 1: Cut and transform**

Methods (anchors: `statCard` 229, `statGrid` 241, `card` 261, `table` 282, `tableSkeleton` 452, `paginationFooter` 472, `rowMenu` 540, `_bindRowMenus` 565). Special handling:

- `_rowMenusBound` is an undeclared dynamic property today (`AdminUI._rowMenusBound` at 566/569). In `data.js` declare module state `let _rowMenusBound = false;` and rewrite those references to the bare variable (same semantics: first call binds, later calls no-op).
- `rowMenu`'s call `AdminUI._bindRowMenus()` → `_bindRowMenus()`.
- Before cutting, run `grep -n "AdminUI\.\|Pages\." <method body ranges>`: refs to methods that remain in pages.js → keep as `AdminUI.x(...)` ONLY if that method is exported by another ui file you import; `Pages.x(...)` refs are fine (window global, call-time only). A ref to a method still inline in the pages.js object literal from inside `data.js` = STOP → move that dependency in this task too or re-plan.

- [ ] **Step 2: Update compat object**

```js
import * as data from '../ui/data.js';
const AdminUI = { ...layout, ...overlays, ...data, /* 4 inline remainders */ };
```

- [ ] **Step 3: Verify**

Run: `grep -c "export function" js/ui/data.js` → `8`.
Run: `grep -n "_rowMenusBound" js/ui/data.js js/pages/pages.js` → only `data.js` hits.

- [ ] **Step 4: Gate + targeted e2e**

Run: `npm run lint:check && npx prettier --check "js/**/*.js" && npm run build && npx playwright test e2e/admin.spec.js e2e/admin-add-product-renders.spec.js --workers=1`
Expected: green (tables/cards/skeletons/row menus everywhere in admin).

- [ ] **Step 5: Commit**

```bash
git add js/ui/data.js js/pages/pages.js
git commit -m "refactor: extract UI kit data-display primitives to js/ui/data.js"
```

---

### Task 11: Extract `js/ui/feedback.js`

**Files:**
- Create: `js/ui/feedback.js`
- Modify: `js/pages/pages.js`

**Interfaces:**
- Consumes: tasks 8–10 compat shape.
- Produces: `js/ui/feedback.js` exports `{ pillGroup, wirePillGroup, emptyState, renderErrorPage }`; compat object is now pure spreads (0 inline remainders).

- [ ] **Step 1: Cut and transform**

Methods (anchors: `pillGroup` 249, `emptyState` 298, `wirePillGroup` 433, `renderErrorPage` 787). Same transforms; `renderErrorPage` is consumed by `router.js` via `AdminUI.renderErrorPage` — compat spread keeps that call working (verify with the router smoke in step 4).

- [ ] **Step 2: Finalize the compat object**

```js
import * as layout from '../ui/layout.js';
import * as overlays from '../ui/overlays.js';
import * as data from '../ui/data.js';
import * as feedback from '../ui/feedback.js';

const AdminUI = { ...layout, ...overlays, ...data, ...feedback };
window.AdminUI = AdminUI;
```

- [ ] **Step 3: Verify**

Run: `grep -c "export function" js/ui/feedback.js` → `4`.
Run: `awk '/^const AdminUI = /,/^};/' js/pages/pages.js` → exactly the 4 spreads + `window.AdminUI` line, no method bodies.
Run: `for f in layout overlays data feedback; do grep -c "export function" js/ui/$f.js; done` → `9 5 8 4` (sums to the original 26).

- [ ] **Step 4: Gate + full e2e (1c milestone)**

Run: `npm run lint:check && npx prettier --check "js/**/*.js" "css/**/*.css" && npm run build && npx playwright test --workers=1`
Expected: all green.
Cache bump: `MODULE_VERSION '41' → '42'`, `APP_INIT_VERSION '42' → '43'`, `index.html ?v=42 → ?v=43`; re-run `npm run build`.

- [ ] **Step 5: Commit**

```bash
git add js/ui/ js/pages/pages.js vite.config.js index.html
git commit -m "refactor: finish UI kit extraction — AdminUI compat is pure spreads"
```

---

### Task 12: 1c exit — line-count checkpoint

**Files:**
- Modify: `docs/REFACTOR_FINDINGS.md` (one status line only, if desired)

- [ ] **Step 1: Measure**

Run: `wc -l js/pages/pages.js js/ui/*.js`
Expected: `pages.js` down by ~750 lines (kit + escape move); ui files ≈ kit size total.

- [ ] **Step 2: Record status**

Append to findings log: `## Phase status — 1c complete: pages.js <N> lines, kit in js/ui/*, compat object pure spreads.`

- [ ] **Step 3: Commit**

```bash
git add docs/REFACTOR_FINDINGS.md
git commit -m "docs: record 1c extraction checkpoint"
```

---

### Task 13: Migrate every inline handler in `js/pages/pages.js`

**Files:**
- Modify: `js/pages/pages.js` (~103 handler attributes: 80 `onclick`, 15 `onerror`, 3 `onsubmit`, 2 `onchange`, 1 each `onload`/`onmouseover`/`onmouseout`)

**Interfaces:**
- Consumes: escaping rules (`_pageEsc` at template build time — unchanged).
- Produces: `PAGE_ACTIONS` registry + one guarded document-level delegate set in pages.js; `grep` count of inline handler attributes = 0 in this file.

- [ ] **Step 1: Inventory**

Run:
```bash
grep -oE '\son(click|dblclick|change|submit|keyup|keydown|input|focus|blur|mouseover|mouseout|mouseenter|mouseleave|load|error)="' js/pages/pages.js | sort | uniq -c
```
Expected ballpark: the counts above (80/15/3/2/1/1/1). `onerror` needs the capture-phase pattern (error events don't bubble).

- [ ] **Step 2: Install the delegation infrastructure (one kind of change: plumbing)**

Add at module scope in pages.js (near the bottom, before `window.Pages = Pages;`):

```js
let _pageDelegatesInstalled = false;
const PAGE_ACTIONS = {
  // filled in step 3, one entry per migrated handler
};
const _installPageDelegates = () => {
  if (_pageDelegatesInstalled) {
    return;
  }
  _pageDelegatesInstalled = true;
  const run = (el, e) => {
    const action = PAGE_ACTIONS[el.dataset.action];
    if (action) {
      action(el, e);
    }
  };
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (el) {
      run(el, e);
    }
  });
  document.addEventListener('change', e => {
    const el = e.target.closest('[data-action]');
    if (el) {
      run(el, e);
    }
  });
  document.addEventListener('keyup', e => {
    const el = e.target.closest('[data-action]');
    if (el) {
      run(el, e);
    }
  });
  document.addEventListener('submit', e => {
    const form = e.target.closest('form[data-action]');
    if (form && PAGE_ACTIONS[form.dataset.action]) {
      e.preventDefault();
      run(form, e);
    }
  }, true);
  document.addEventListener('error', e => {
    const img = e.target;
    if (img instanceof HTMLImageElement && img.dataset.fallback && !img.dataset.fallbackApplied) {
      img.dataset.fallbackApplied = '1';
      img.src = img.dataset.fallback;
    }
  }, true);
};
_installPageDelegates();
```

No behavior here — it only listens.

- [ ] **Step 3: Migrate handlers, batch by page area**

For each inline handler, three edits (one kind of change per commit-batch, but all inside this task):

**Pattern A — `onclick` calling a `Pages.method(args)`:**

Before:
```js
`<button class="btn-remove" onclick="Pages.removeFromCart('${esc(p.id)}')">Remove</button>`
```
After:
```js
`<button class="btn-remove" data-action="remove-from-cart" data-id="${esc(p.id)}">Remove</button>`
```
plus registry entry:
```js
'remove-from-cart': el => Pages.removeFromCart(el.dataset.id),
```
Rules: action names kebab-case; unique across the whole document listener (prefix with page area if two would collide, e.g. `checkout-remove-coupon`); arguments travel via `data-*` (already-escaped template values; numbers converted with `Number(...)` / booleans via presence checks); never interpolate user text into the `data-action` name itself.

**Pattern B — `onsubmit`:** `<form onsubmit="return Pages.handleCheckout(event)">` → `<form data-action="handle-checkout">` + registry entry `'handle-checkout': (el, e) => Pages.handleCheckout(e)` (the infrastructure already `preventDefault`s; if the original relied on `return false` vs `return true` semantics, preserve it inside the action function).

**Pattern C — `onerror` image fallbacks:** `<img src="..." onerror="this.onerror=null;this.src='...'">` → `<img src="..." data-fallback="${esc(FALLBACK)}">` (the capture-phase listener above applies the fallback exactly once).

**Pattern D — inline JS expressions** (e.g. `onclick="event.stopPropagation(); Pages.x()"`): put the full sequence in the action function in order.

- [ ] **Step 4: Verify zero + gates + full e2e**

Run: `grep -cE '\son[a-z]+="' js/pages/pages.js` → must account for the explicit-attribute inventory returning 0 (watch out: do not count `action=` attributes — the explicit regex from Step 1 must return empty).
Run: `npm run lint:check && npx prettier --check "js/**/*.js" && npm run build && npx playwright test --workers=1` → all green (full suite after an event-wiring batch is mandatory).

- [ ] **Step 5: Commit**

```bash
git add js/pages/pages.js
git commit -m "refactor: migrate pages.js inline handlers to data-action delegation"
```

---

### Task 14: Migrate inline handlers in `js/pages/auth-pages.js` + `js/pages/browse-pages.js`

**Files:**
- Modify: `js/pages/auth-pages.js` (~27 attributes + any `onsubmit` shims)
- Modify: `js/pages/browse-pages.js` (~31 attributes)

**Interfaces:**
- Consumes: the delegation pattern from task 13 (do not import `PAGE_ACTIONS` — each file owns its registry).
- Produces: 0 inline handler attributes in both files; re-checks task 3's kept shims.

- [ ] **Step 1: Inventory both files**

Run the task-13 Step 1 regex against each file; expected ~27 / ~31.

- [ ] **Step 2: Add per-file delegate installers**

Same infrastructure as task 13 Step 2, but local: `BROWSE_ACTIONS` / `AUTH_ACTIONS` registries, guard flags `_browseDelegatesInstalled` / `_authDelegatesInstalled`, installed at module scope of each file. Prefix rule: action names that could collide with `PAGE_ACTIONS` get a file prefix (`browse-clear-filters`, `auth-switch-tab`).

- [ ] **Step 3: Migrate every handler** using patterns A–D from task 13.

- [ ] **Step 4: Re-check task 3 shims**

Any legacy shim whose only callers were these inline handlers (e.g. the no-op tab switcher at auth-pages ~311, the thin onsubmit shims ~537): delete now, update findings/commit body.

- [ ] **Step 5: Verify + gates + full e2e**

Run: the explicit inventory regex on both files → 0.
Run: `npm run lint:check && npx prettier --check "js/**/*.js" && npm run build && npx playwright test --workers=1` → green.

- [ ] **Step 6: Commit**

```bash
git add js/pages/auth-pages.js js/pages/browse-pages.js docs/REFACTOR_FINDINGS.md
git commit -m "refactor: migrate auth and browse inline handlers to delegation"
```

---

### Task 15: Migrate remaining inline handlers in `js/**` to zero + audit static HTML

**Files:**
- Modify (known set): `js/pages/bestbuy-auth-dashboard.js` (14), `js/admin/admin-dashboard.js` (5), `js/pages/messages.js` (4), `js/pages/bestbuy-landing.js` (4), `js/modules/notifications.js` (3), `js/modules/checkout.js` (2), `js/utils/toast.js` (1)
- Modify: any file the inventory turns up
- Modify: `docs/REFACTOR_FINDINGS.md` (index.html/public audit results)

**Interfaces:**
- Consumes: patterns A–D (task 13).
- Produces: 0 inline handler attributes under `js/**`; audit record for `index.html`/`public/`.

- [ ] **Step 1: Full-tree inventory**

Run:
```bash
grep -roE '\son(click|dblclick|change|submit|keyup|keydown|input|focus|blur|mouseover|mouseout|mouseenter|mouseleave|load|error)="' js --include='*.js' | cut -d: -f1 | sort | uniq -c
```
Expected: exactly the known set above (if new files appear, migrate them too — same rules).

- [ ] **Step 2: Migrate each file** (per-file registry + guard flag, patterns A–D). Note `bestbuy-auth-dashboard.js` already has a delegated pattern for `.bb-google-btn` (its `document.addEventListener('click', ...)` with `Pages._googleBtnHandlerInstalled` guard) — inline handlers in its templates convert to that same in-file registry style.

- [ ] **Step 3: Verify zero under `js/**`**

Run: the Step 1 grep → no output.

- [ ] **Step 4: Audit static HTML (findings only)**

Run: `grep -rnE '\son[a-z]+=' index.html public/ 2>/dev/null`
- Any hits → findings entries (`### F8 debt — inline handler in static HTML at <file:line>`), do not edit HTML in this task.
- No hits → note "static HTML clean" in the commit body.

- [ ] **Step 5: Gates + full e2e**

Run: `npm run lint:check && npx prettier --check "js/**/*.js" "css/**/*.css" && npm run build && npx playwright test --workers=1` → green.

- [ ] **Step 6: Commit**

```bash
git add js/ docs/REFACTOR_FINDINGS.md
git commit -m "refactor: migrate all remaining inline handlers — js/** now CSP-delegation clean"
```

---

### Task 16: Phase 1 exit — full verification + final cache bump

**Files:**
- Modify: `js/app-init.js`, `vite.config.js`, `index.html` (final bump)
- Modify: `docs/REFACTOR_FINDINGS.md` (final status)

- [ ] **Step 1: Frontend gates (verbatim order)**

Run: `npm run lint:check && npx prettier --check "js/**/*.js" "css/**/*.css" && npm run build`
Expected: all pass.

- [ ] **Step 2: Full e2e**

Run: `npx playwright test --workers=1`
Expected: all green (existing 35+ specs + characterization file; count must be ≥ the pre-phase baseline).

- [ ] **Step 3: Backend sanity (untouched — must be unchanged)**

Run: `cd backend && npm run lint:check && npm test`
Expected: 35 suites / 313 tests pass (identical to baseline).

- [ ] **Step 4: Final cache bump**

`MODULE_VERSION '42' → '43'`, `APP_INIT_VERSION '43' → '44'`, `index.html ?v=43 → ?v=44`; re-run `npm run build`.

- [ ] **Step 5: Final findings status + commit**

Append to the log:
```markdown
## Phase 1 complete — status
- js/pages/pages.js: <N> lines (was 11,082)
- js/ui/*: 26 kit methods across 4 files
- inline handlers in js/**: 0
- findings open: <count> (all unfixed by design — triage next)
```

```bash
git add js/app-init.js vite.config.js index.html docs/REFACTOR_FINDINGS.md
git commit -m "chore: phase 1 refactor exit — final cache bump and status"
```

---

## Self-review notes (plan author)

- Spec coverage: 1a = tasks 1–6, 1b = task 7, 1c = tasks 8–12, 1d = tasks 13–15, phase exit = task 16; findings log, stop rules, security invariants, cache-bump milestones, and DoD measures each map to explicit steps.
- Known carry-over: phase 2 (feature split) is intentionally unplanned here — it needs the inventory this phase produces.
- `pages.js` target ≤2,000 lines is a **phase-2** DoD number; phase 1 only removes ~900 (kit + escapes + shims) — expected, not a gap.
