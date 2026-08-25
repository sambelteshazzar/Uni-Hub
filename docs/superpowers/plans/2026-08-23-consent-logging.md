# Consent Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record provable Terms/Privacy consent at account creation (email + Google paths), per `docs/superpowers/specs/2026-08-23-consent-logging-design.md`.

**Architecture:** New `consent_records` table; a shared `recordConsent(userId, method, ip)` helper writes rows with the current `POLICY_VERSION`. Email signup enforces `acceptedTerms: true` server-side before creating anything; Google first-time creation records consent alongside its existing signup log. No read endpoints this round.

**Tech Stack:** Express + better-sqlite3/libSQL wrapper, jest/supertest, vanilla JS SPA frontend.

## Global Constraints

- NO new npm dependencies.
- `POLICY_VERSION = '2026-08-1'` lives in new `backend/config/policies.js`; both auth paths import it from there (single source).
- Consent write failure logs a `[consent]` warning but MUST NOT fail the signup.
- Missing/false `acceptedTerms` → 400 BEFORE any user row is created.
- Backend gate: `cd backend && npm run lint:check && npx jest` — lint stays at the 84-problem baseline; all suites pass. Frontend gates: eslint on touched files (no NEW errors vs baseline) + `npm run build`.
- DB wrapper APIs available: `db('t').create(obj)`, `.rawAll/rawRun/rawGet(sql, params)`; tests use `getDb().prepare(...)`.
- Commit after every task.

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `backend/config/policies.js` | Create | `POLICY_VERSION` constant |
| `backend/config/database.js` | Modify | `consent_records` CREATE TABLE + index in SCHEMA_SQL |
| `backend/controllers/auth.controller.js` | Modify | `acceptedTerms` enforcement + `recordConsent` helper + both capture points |
| `backend/tests/consent.test.js` | Create | Backend behavior tests |
| `js/pages/auth-pages.js` | Modify | `acceptedTerms` in register payload; Google microcopy |
| `js/modules/auth.js` | None | `register()` already forwards the whole payload verbatim — verified |

---

### Task 1: Schema + policy version constant

**Files:**
- Create: `backend/config/policies.js`
- Modify: `backend/config/database.js`
- Create: `backend/tests/consent.test.js`

**Interfaces:**
- Produces: `consent_records` table (columns per spec); `POLICY_VERSION` export. Task 2 relies on both names verbatim.

- [ ] **Step 1: Write failing test** — create `backend/tests/consent.test.js`:

```js
/**
 * Consent logging tests (spec 2026-08-23): provable terms/privacy consent
 * captured at account creation on both signup paths.
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

const app = createTestApp();

async function registerViaApi (overrides = {}) {
  const suffix = Date.now() + Math.floor(Math.random() * 100000);
  const user = {
    fullName: `Consent User ${suffix}`,
    email: `consent_${suffix}@test.com`,
    phone: `+23320${String(1000000 + Math.floor(Math.random() * 8999999))}`,
    password: 'ConsentPass1!',
    university: 'University of Ghana',
    level: '200',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(user);
  return { res, user };
}

describe('consent schema', () => {
  test('consent_records table exists with expected columns', async () => {
    const { getDb } = require('../config/database');
    const cols = getDb().prepare('PRAGMA table_info(consent_records)').all().map(c => c.name);
    expect(cols).toEqual(expect.arrayContaining([
      'id', 'userId', 'documentType', 'policyVersion', 'method', 'ipAddress', 'createdAt',
    ]));
  });

  test('policies.js exports the current POLICY_VERSION', () => {
    const { POLICY_VERSION } = require('../config/policies');
    expect(POLICY_VERSION).toBe('2026-08-1');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && npx jest tests/consent.test.js`
Expected: FAIL — no such table / module not found.

- [ ] **Step 3: Implement**

Create `backend/config/policies.js`:

```js
// ============================================
// POLICIES - Versioned legal documents
// ============================================
// Bump POLICY_VERSION whenever the Terms of Service or Privacy Policy text
// changes materially. consent_records rows store the version each user
// agreed to; future re-consent flows key off this value.

const POLICY_VERSION = '2026-08-1';

module.exports = { POLICY_VERSION };
```

In `backend/config/database.js`, add inside `SCHEMA_SQL` (near student_verifications):

```sql
CREATE TABLE IF NOT EXISTS consent_records (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  documentType TEXT NOT NULL DEFAULT 'terms_and_privacy'
    CHECK(documentType IN ('terms_and_privacy')),
  policyVersion TEXT NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('email_signup','google')),
  ipAddress TEXT,
  createdAt TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_consent_userId ON consent_records(userId, createdAt);
```

- [ ] **Step 4: Run to verify pass**

Run: `cd backend && npx jest tests/consent.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/config/policies.js backend/config/database.js backend/tests/consent.test.js
git commit -m "Add consent_records schema and policy version constant"
```

---

### Task 2: Capture consent on both signup paths

**Files:**
- Modify: `backend/controllers/auth.controller.js`
- Modify: `backend/tests/consent.test.js`

**Interfaces:**
- Consumes: Task 1's table + `POLICY_VERSION`.
- Produces: `recordConsent(userId, method, ip)` helper; `POST /api/auth/register` requires `acceptedTerms === true`; googleTokenLogin new-user branch records `method:'google'`.

- [ ] **Step 1: Write failing tests** — append to `backend/tests/consent.test.js`:

```js
describe('email signup consent', () => {
  test('rejects registration without acceptedTerms and creates nothing', async () => {
    const { res } = await registerViaApi();
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/accept/i);

    const { getDb } = require('../config/database');
    const dbh = getDb();
    const users = dbh.prepare(
      'SELECT COUNT(*) AS n FROM users WHERE email LIKE ?'
    ).get('consent_%');
    expect(users.n).toBe(0);
  });

  test('records versioned consent on successful signup', async () => {
    const { res } = await registerViaApi({ acceptedTerms: true });
    expect(res.status).toBe(201);

    const { getDb } = require('../config/database');
    const dbh = getDb();
    const userId = res.body.data.user._id;
    const row = dbh.prepare(
      'SELECT policyVersion, method, ipAddress FROM consent_records WHERE userId = ?'
    ).get(userId);
    expect(row).toBeTruthy();
    expect(row.policyVersion).toBe('2026-08-1');
    expect(row.method).toBe('email_signup');
  });
});

describe('google path consent helper', () => {
  test('recordConsent writes a google-method row', async () => {
    // The Google OAuth flow cannot be driven end-to-end in jest without a
    // live token endpoint; exercise the shared helper directly instead.
    const controller = require('../controllers/auth.controller');
    expect(typeof controller.recordConsentForTesting).toBe('function');

    const { res } = await registerViaApi({ acceptedTerms: true });
    const userId = res.body.data.user._id;

    await controller.recordConsentForTesting(userId, 'google', '10.0.0.1');

    const { getDb } = require('../config/database');
    const rows = getDb().prepare(
      "SELECT policyVersion, method FROM consent_records WHERE userId = ? AND method = 'google'"
    ).all(userId);
    expect(rows).toHaveLength(1);
    expect(rows[0].policyVersion).toBe('2026-08-1');
  });
});
```

Note on `recordConsentForTesting`: the plan exposes the module-private helper under this name ONLY for tests (exported alongside the other controller exports). If that feels dirty, alternative: make the google-branch assertion indirect by checking an existing-user google login does NOT create a second consent row — but that requires mocking fetch to Google; the direct-helper route is simpler and still validates the write shape. Keep `recordConsentForTesting` thin: `recordConsentForTesting = recordConsent`.

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && npx jest tests/consent.test.js -t "signup consent"`
Expected: FAIL — 400 missing (currently 201) / no rows.

- [ ] **Step 3: Implement**

In `backend/controllers/auth.controller.js`:

(a) Import at top: `const { POLICY_VERSION } = require('../config/policies');`

(b) Add module-level helper (above `exports.register`):

```js
/**
 * Record a consent artifact for an account. Never throws: signup proceeds
 * even if the write fails (warning flags the gap; spec trade-off).
 */
async function recordConsent (userId, method, ip) {
  try {
    await db('consent_records').create({
      userId,
      documentType: 'terms_and_privacy',
      policyVersion: POLICY_VERSION,
      method,
      ipAddress: ip || null,
    });
  } catch (err) {
    console.warn('[consent] failed to record consent:', err.message);
  }
}
exports.recordConsentForTesting = recordConsent;
```

(c) In `exports.register`, add AFTER the phone-uniqueness check (`existingPhone` block, ~line 68) and BEFORE `bcrypt.hash`:

```js
  // Consent gate (spec 2026-08-23): server-side enforcement — the checkbox
  // alone is UX. Rejected BEFORE any user record exists.
  if (req.body.acceptedTerms !== true) {
    throw new ApiError(400, 'You must accept the Terms of Service and Privacy Policy to create an account');
  }
```

(d) In the same function, right after `await logActivity('signup', ...)` (~line 90):

```js
  await recordConsent(mappedUser.id, 'email_signup', req.ip);
```

(e) In `googleTokenLogin`'s new-user branch, immediately after its existing `logActivity('signup', ...)` call (~line 479):

```js
    await recordConsent(user.id, 'google', req.ip);
```

Returning-Google-user branch gets NO consent record (they see no fresh terms this round).

- [ ] **Step 4: Run tests to verify pass**

Run: `cd backend && npx jest tests/consent.test.js`
Expected: PASS (5 tests)

IMPORTANT regression check: many existing suites register users WITHOUT acceptedTerms — they will now 400. Fix by adding `acceptedTerms: true` to the canonical helpers ONLY (do not touch individual test payloads): `backend/tests/setup.js` `generateTestUser()` and any per-file register helper that builds the payload directly (grep `-rn "post('/api/auth/register'" backend/tests/` and patch each helper object once). Re-run the FULL suite and confirm green.

- [ ] **Step 5: Full backend gate**

Run: `cd backend && npm run lint:check && npx jest`
Expected: lint at 84-problem baseline; all suites pass.

- [ ] **Step 6: Commit**

```bash
git add backend/controllers/auth.controller.js backend/tests/consent.test.js backend/tests/setup.js
git commit -m "Record versioned terms consent at account creation on both signup paths"
```

---

### Task 3: Frontend passthrough + Google microcopy

**Files:**
- Modify: `js/pages/auth-pages.js`

**Interfaces:**
- Consumes: Task 2's `acceptedTerms` requirement. `authManager.register(userData)` forwards the payload verbatim (verified — js/modules/auth.js JSON-stringifies the whole object).

- [ ] **Step 1: Add `acceptedTerms` to the register payload**

In `handleRegister` (js/pages/auth-pages.js:1111), extend `userData`:

```js
  const userData = {
    fullName: form.fullName.value,
    email: form.email.value,
    phone: form.phone.value,
    password: form.password.value,
    confirmPassword: form.confirmPassword.value,
    university: selectedUniversity,
    // Server-enforced consent (spec 2026-08-23). Checkbox is required
    // client-side; this makes the agreement explicit in the API contract.
    acceptedTerms: form.terms.checked === true,
  };
```

(The checkbox has `name="terms"` at auth-pages.js:1070 — verify the selector matches when editing.)

- [ ] **Step 2: Google microcopy under BOTH social grids**

There are two `.social-buttons-grid` blocks (~line 698 on one card, ~line 1079 on the other). Directly after each grid's closing `</div>`, add:

```html
<p class="social-consent-note" style="font-size:0.72rem;color:#9ca3af;text-align:center;margin-top:0.5rem;">By continuing with Google, you agree to our Terms of Service and Privacy Policy.</p>
```

Check both contexts first — if one of them is login-only with no signup semantics, still add it there: Google login CREATES accounts for first-timers, so consent language is correct in both places.

- [ ] **Step 3: Verify frontend gates**

Run: `npx eslint js/pages/auth-pages.js && npm run build`
Expected: eslint count at or below file baseline (93 pre-existing errors); build succeeds.

- [ ] **Step 4: Commit**

```bash
git add js/pages/auth-pages.js
git commit -m "Send explicit terms consent on signup and disclose Google-path agreement"
```

---

## Manual acceptance checklist

1. Local dev with services running: sign up a fresh account WITHOUT ticking the checkbox → client blocks it (required attr); bypassing via devtools/network shows the 400 toast.
2. Sign up properly with checkbox → row appears: `SELECT * FROM consent_records ORDER BY createdAt DESC LIMIT 1` shows policyVersion `2026-08-1`, method `email_signup`.
3. Existing-user Google login creates NO new consent row.

