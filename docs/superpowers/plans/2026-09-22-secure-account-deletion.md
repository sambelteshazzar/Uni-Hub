# Secure Account Deletion (Hardened) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden self-service and admin account deletion per `docs/superpowers/specs/2026-09-22-secure-account-deletion-design.md`: purpose-bound OTP re-auth for Google-linked accounts, obligations gate with structured actionable blockers, full PII scrub in one atomic batch, upgraded admin delete with reason + audit, plus the adjacent production MFA-email bug fix.

**Architecture:** Shared helper `backend/utils/accountDeletion.js` (blocker queries + statement builder + atomic `db.batchWrite` execute) is called by both `DELETE /users/me` (factor verify → gate → scrub → receipt) and `DELETE /users/:id` (reason guards → scrub → audit, gate bypassed). OTP reuses `admin_mfa_challenges` with purpose folded into the SHA-256 input — no schema change. New read/OTP routes plug into `user.routes.js` above the load-bearing `/:id` block. Frontend: rewrite the delete modal (tri-state preflight, password/OTP factor, single atomic request), add a buyer cancel button (the blocker escape hatch — `api.orders.cancel` is currently dead code), and wire the orphaned admin delete flow.

**Tech Stack:** Express + better-sqlite3/libSQL via `db.batchWrite`, `express-rate-limit@7.5.1`, `bcryptjs`, jest/supertest, vanilla JS SPA (`AdminUI.modalHtml`/`wireModal`, `_pageEsc`/`_pageSafeUrl`).

## Global Constraints

- NO new npm dependencies.
- All user-derived strings into `innerHTML` go through `_pageEsc` (pages.js) or `SecurityUtils.escapeHtml`; action hrefs through `_pageSafeUrl`. Errors set via `textContent` only.
- No new inline handlers (`onclick=` etc.). New buttons use `data-action`/`data-user-action`/`data-order-action` + `addEventListener`/delegation. When a task touches an existing inline handler row, refactor that row to delegation.
- Route order in `user.routes.js` is load-bearing: every `/me/*` route registers BEFORE `/:id*`.
- OTP: purpose-bound (`'login'` vs `'delete'`), 5-min TTL, max 3 attempts, single-use. API responses never include the raw `code` — `devCode` only under `NODE_ENV=test`.
- Structured error bodies the shared `errorHandler` would strip (`requiredFactor`, `blockers`, `retryAfterSeconds`, `attemptsLeft`) are sent via direct `res.status(...).json(...)` from the controller — do NOT route them through `throw new ApiError` (errorHandler only forwards `error` + `details`).
- Atomic scrub = one `db('users').batchWrite(statements)` call (true atomicity on local better-sqlite3 AND Turso). Never partial-write outside it.
- PII: no emails/phones/reasons in console logs, toasts, or Sentry payloads. Activity audit stores target id + admin-authored reason only.
- ESLint backend+frontend must stay at 0 errors; prettier clean; `npm run build` must succeed before any frontend task is called done.
- Backend gates per task: `cd backend && npx jest tests/<file>.test.js && npm run lint:check`. Full `npm test` before the final backend commit.
- Frontend gates per task: `npm run lint:check && npx prettier --check "js/**/*.js" && npm run build` (repo root). If prettier check fails, run `npm run format` then re-run all three.
- SQLite runs with `PRAGMA foreign_keys = 1` — test seeds that touch `wishlists.product`, `order_items.productId`, `messages.conversationId` etc. must insert the referenced parent row first or the INSERT itself fails.
- `errorHandler` maps SQLite `UNIQUE constraint failed` messages to **400** (errorHandler.js:112), not 500 — atomicity tests assert 400.
- Commit after every task (repo style: `fix:` / `feat:` / `docs:` prefixes — inspect `git log --oneline` first). Do NOT push — the developer pushes.

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `backend/utils/mfa.js` | Modify | Purpose-bound hash, `createChallenge(user, purpose)` returns `code`, `attemptsLeft` on wrong_code |
| `backend/controllers/auth.controller.js` | Modify | Login MFA email embeds `challenge.code` (prod bug fix) |
| `backend/utils/accountDeletion.js` | Create | `getDeletionBlockers`, `executeAccountDeletion` (statement builder + batchWrite + Cloudinary destroy) |
| `backend/controllers/user.controller.js` | Modify | Rewrite `deleteMyAccount`; new `getMyDeletionBlockers`, `requestDeletionOtp`, `getTargetDeletionBlockers`; rewrite `deleteUser` |
| `backend/routes/user.routes.js` | Modify | 3 new routes above `/:id` + `deletionOtpLimiter` |
| `backend/tests/mfa.test.js` | Modify | Purpose-binding unit tests (extend) |
| `backend/tests/mfaEmail.test.js` | Create | Login email contains real code (mocked `sendEmail`) |
| `backend/tests/deletionGate.test.js` | Create | Blockers, factors, OTP endpoints, purpose confusion, scrub completeness, atomicity, rate limit |
| `backend/tests/deletionAdmin.test.js` | Create | Admin guards, bypass, shared scrub, audit |
| `backend/tests/accountLifecycle.test.js` | Modify | Google-only test → OTP flow (old test now expects factor failure) |
| `backend/tests/setup.js` | Modify | Add `newsletter_subscribers` to afterEach cleanup |
| `js/utils/api.js` | Modify | `account.deletionBlockers/requestDeletionOtp/deleteMe(payload)`, `users.delete(id, reason)/deletionBlockers(id)`; `request()` 401-session fix for `/users/me*` |
| `js/pages/pages.js` | Modify | Delete modal rewrite; orders cancel button + delegation; admin Delete button/dispatcher/modal |
| `js/admin/admin-users.js` | Modify | `deleteUser(userId, reason)` — server-first, sends `{ reason }` |

## Spec decisions resolved in this plan (review these first)

1. **Gate atomicity (spec §2 escape clause used):** the db wrapper's `transaction()` is explicitly non-atomic on Turso (db.js:442-456); `batchWrite()` is atomic on both engines but cannot interleave SELECTs. Plan: final blocker re-check immediately before building statements, then one `batchWrite`. Residual TOCTOU window is the few ms between SELECT and batch, involving only the same user's parallel session — accepted and commented in code (`// TODO: security review`). Tests prove write atomicity (forced UNIQUE failure → nothing scrubbed).
2. **Buyer-cancel finding:** backend `cancelOrder` accepts buyer cancel for any status except `delivered`/`cancelled` — so `placed` stays in the blocker set (no 7-day rule needed). But **no SPA UI calls `api.orders.cancel`** — Task 8 adds the Cancel button; without it the blocker would be a dead end.
3. **Balance/payout actions:** the SPA has **no self-serve payout request UI** (`POST /api/ledger/payouts` has zero frontend callers). Spec's example `Request a payout → #/dashboard` has no destination, so those blockers link `Contact support → #/contact` (route exists, pages.js:647) and the message names the admin-delete escape. Spec §2's "if waiting on admin processing, say so and point to support" is the governing rule.
4. **Session survival on failed factor (spec §5):** `api.request()` clears the session on ANY 401 from a non-`/auth/` URL (api.js:365-377) — a typo'd password in the delete modal would log the user out. Fix: treat `url.startsWith('/users/me')` as a non-session-expiry path. Wrong password still returns 401 (Wave 1 test preserved); OTP errors return 400.
5. **Admin receipt email:** spec §3's receipt paragraph reads as applying to the anonymize operation generally — sent on both self and admin paths, best-effort, after commit.
6. **Attempts countdown:** `verifyChallenge` wrong_code now returns `attemptsLeft`; controllers surface it so the modal can show "N attempts remaining" (spec §5).
7. **Moderator targets:** backend guards are `403` for admin/moderator targets (spec §4), so the Delete button is hidden for moderator rows too — slightly stricter than spec §4's frontend "non-admin, non-self" wording, aligned with the guard.
8. **`setup.js` cleanup:** add `newsletter_subscribers` to the afterEach table list (deletion tests seed it; today it is never cleared).
9. **Out of scope:** Playwright `timeout: 30000 → 60000` follow-up (e2e flake hardening, separate change); `ACTIVITY_LOGS_ACTIONS` CHECK rebuild for `admin_user_deleted` (reuse `account_deleted` per spec); grace-period deletion; privacy-policy copy edits.

---

### Task 1: MFA purpose binding + production login-email code fix

**Files:**
- Modify: `backend/utils/mfa.js`
- Modify: `backend/controllers/auth.controller.js`
- Modify: `backend/tests/mfa.test.js`
- Create: `backend/tests/mfaEmail.test.js`

**Interfaces:**
- Produces: `createChallenge(user, purpose = 'login') → { id, code, devCode? }` (raw `code` to in-process callers; `devCode` still test-only); `verifyChallenge(challengeId, userId, code, purpose = 'login')`; hash input `userId:purpose:code:pepper`.
- Consumed by: Task 3/4 (`purpose: 'delete'`), existing auth.controller call sites unchanged except email HTML.

**Steps:**

- [ ] **Step 1: Write failing tests.** Extend `backend/tests/mfa.test.js` with a new `describe('MFA — purpose binding', ...)`:

```js
describe('MFA — purpose binding', () => {
  it('rejects a delete-purpose challenge redeemed as login and vice versa', async () => {
    const mfa = require('../utils/mfa');
    const { db } = require('../utils/db');
    const user = await db('users').create({
      fullName: 'Purpose User',
      email: `purpose_${Date.now()}@test.com`,
      phone: '+233240000001',
      password: 'x',
      university: 'atu',
      role: 'buyer',
    });

    const del = await mfa.createChallenge(user, 'delete');
    expect(del.code).toMatch(/^\d{6}$/);
    // Same code, wrong purpose at verify → mismatch.
    const wrong = await mfa.verifyChallenge(del.id, user.id, del.code, 'login');
    expect(wrong.ok).toBe(false);
    expect(wrong.reason).toBe('wrong_code');

    const right = await mfa.verifyChallenge(del.id, user.id, del.code, 'delete');
    expect(right.ok).toBe(true);

    const login = await mfa.createChallenge(user, 'login');
    const wrong2 = await mfa.verifyChallenge(login.id, user.id, login.code, 'delete');
    expect(wrong2.ok).toBe(false);
  });

  it('exposes attemptsLeft after a wrong code', async () => {
    const mfa = require('../utils/mfa');
    const { db } = require('../utils/db');
    const user = await db('users').create({
      fullName: 'Attempts User',
      email: `attempts_${Date.now()}@test.com`,
      phone: '+233240000002',
      password: 'x',
      university: 'atu',
      role: 'buyer',
    });
    const ch = await mfa.createChallenge(user, 'login');
    const miss = await mfa.verifyChallenge(ch.id, user.id, '999999', 'login');
    expect(miss.ok).toBe(false);
    expect(miss.attemptsLeft).toBe(2);
  });
});
```

Create `backend/tests/mfaEmail.test.js` (emailService mocked at file top, `docRetention.test.js:8` pattern):

```js
/**
 * Production MFA email bug fix (spec 2026-09-22): the login email must
 * contain the real 6-digit code — devCode exists only under NODE_ENV=test,
 * so the old `challenge.devCode || '••••••'` shipped bullets in prod.
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

jest.mock('../utils/emailService', () => {
  const actual = jest.requireActual('../utils/emailService');
  return {
    ...actual,
    sendEmail: jest.fn(async () => ({ success: true })),
  };
});

const { sendEmail } = require('../utils/emailService');
const app = createTestApp();

describe('login MFA email contains the real code', () => {
  test('admin login email html carries the code from createChallenge', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      ...global.testUtils.generateTestUser(),
      email: `mfaemail_${Date.now()}@test.com`,
    });
    const id = reg.body.data.user._id;
    const { getDb } = require('../config/database');
    getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', id);
    const email = reg.body.data.user.email;

    const step1 = await request(app).post('/api/auth/login').send({ email, password: 'TestPass123!' });
    expect(step1.status).toBe(200);
    expect(step1.body.data.mfaRequired).toBe(true);

    expect(sendEmail).toHaveBeenCalled();
    const [, subject, html] = sendEmail.mock.calls[sendEmail.mock.calls.length - 1];
    expect(subject).toMatch(/login code/i);
    expect(html).toContain(step1.body.data.devCode);
    expect(html).not.toContain('••••••');
    // Response still must NOT leak the raw `code` field (devCode only).
    expect(step1.body.data.code).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail for the right reason** — `cd backend && npx jest tests/mfa.test.js tests/mfaEmail.test.js` (purpose test fails: `createChallenge` takes no purpose yet; email test fails: html contains bullets / no devCode in html).

- [ ] **Step 3: Implement `backend/utils/mfa.js`.** Exact changes:

```js
// Header comment line 9-10 becomes:
// TODO: security review — consider TOTP (RFC-6238) as a follow-up; email
// OTP inherits the mailbox's security. Never log the code. The only
// sanctioned outbound channel is the email HTML the CALLER builds from the
// returned `code`; API responses expose it as `devCode` under NODE_ENV=test
// only.

function hashCode (userId, purpose, code) {
  const pepper = process.env.JWT_SECRET || 'jertscart-dev-pepper';
  return crypto.createHash('sha256').update(`${userId}:${purpose}:${code}:${pepper}`).digest('hex');
}

/**
 * Create an MFA challenge bound to a purpose ('login' | 'delete').
 * @returns {{ id: string, code: string, devCode?: string }} `code` is the
 *   raw OTP for in-process callers (email HTML). It must never be placed in
 *   an API response — use `devCode` (test env) for that.
 */
async function createChallenge (user, purpose = 'login') {
  const code = generateCode();
  const id = generateId();
  await db('admin_mfa_challenges').rawRun(
    'INSERT INTO admin_mfa_challenges (id, userId, codeHash, expiresAt) VALUES (?, ?, ?, ?)',
    [id, user.id, hashCode(user.id, purpose, code), new Date(Date.now() + CODE_TTL_MS).toISOString()],
  );
  const result = { id, code };
  if (process.env.NODE_ENV === 'test') {
    result.devCode = code;
  }
  return result;
}

async function verifyChallenge (challengeId, userId, providedCode, purpose = 'login') {
  // ... existing guards unchanged ...
  const providedHash = Buffer.from(hashCode(userId, purpose, String(providedCode)), 'hex');
  // ... timingSafeEqual, attempt increment ...
  if (!matches) {
    const attempts = row.attempts + 1;
    await db('admin_mfa_challenges').rawRun(
      'UPDATE admin_mfa_challenges SET attempts = attempts + 1 WHERE id = ?',
      [row.id],
    );
    return {
      ok: false,
      reason: attempts >= MAX_ATTEMPTS ? 'too_many_attempts' : 'wrong_code',
      attemptsLeft: Math.max(0, MAX_ATTEMPTS - attempts),
    };
  }
  // ... consumedAt, ok:true unchanged ...
}
```

- [ ] **Step 4: Fix `backend/controllers/auth.controller.js:253`** — replace the email interpolation only (call sites keep default purpose):

```js
         <p style="font-size:28px;font-weight:700;letter-spacing:6px;">${challenge.code}</p>
```

No other auth.controller change: the response still spreads only `devCode` (line 262); `verifyMfa` keeps default `'login'`.

- [ ] **Step 5: Verify** — `cd backend && npx jest tests/mfa.test.js tests/mfaEmail.test.js && npm run lint:check`. All green (existing mfa suite is regression-covered).

- [ ] **Step 6: Commit** — `fix: purpose-bind MFA challenges + embed real code in login email (prod admin login was broken)`.

---

### Task 2: `accountDeletion.js` — blocker queries

**Files:**
- Create: `backend/utils/accountDeletion.js`
- Modify: `backend/tests/setup.js` (newsletter cleanup — needed from Task 3 on, added here with its first test)
- Create: `backend/tests/deletionGate.test.js` (blocker section only in this task)

**Interfaces:**
- Produces: `getDeletionBlockers(userId) → Promise<Array<{ type, message, action: { label, href } }>>`
- Consumed by: Task 3 (`deleteMyAccount`), Task 4 (`GET /me/deletion-blockers`), Task 5 (admin preflight).

**Steps:**

- [ ] **Step 1: Failing tests.** Add `newsletter_subscribers` to the table list in `backend/tests/setup.js` afterEach (after `'student_verifications', 'users'` line — anywhere in the array is fine; it has no FK).

Create `backend/tests/deletionGate.test.js` with helpers + blocker suite (raw SQL seeding; `getDb().prepare`):

```js
/**
 * Hardened deletion (spec 2026-09-22): obligations gate, OTP re-auth,
 * full scrub, atomicity.
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createTestApp } = require('./test-server');

const app = createTestApp();

const { getDb } = require('../config/database');
const { getDeletionBlockers } = require('../utils/accountDeletion');

async function registerUser (prefix = 'dgate') {
  const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const password = 'DeletionPass1!';
  const res = await request(app).post('/api/auth/register').send({
    fullName: `Deletion User ${suffix}`,
    email: `${prefix}_${suffix}@test.com`,
    phone: `+23324${String(1000000 + Math.floor(Math.random() * 8999999))}`,
    password,
    university: 'atu',
    level: '200',
    acceptedTerms: true,
  });
  return { token: res.body.data.token, id: res.body.data.user._id, email: res.body.data.user.email, password };
}

const seedLedger = (sellerId, amount, status) => {
  getDb().prepare(
    'INSERT INTO ledger_entries (id, sellerId, type, amount, status) VALUES (?, ?, ?, ?, ?)',
  ).run(`led_${Date.now()}_${Math.random().toString(36).slice(2)}`, sellerId, 'sale', amount, status);
};

const seedPayout = (sellerId, status) => {
  getDb().prepare(
    'INSERT INTO payouts (id, sellerId, amount, method, destination, status) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(`pay_${Date.now()}_${Math.random().toString(36).slice(2)}`, sellerId, 20, 'momo', '0240000000', status);
};

const seedOrder = ({ buyerId, status = 'placed', paymentStatus = 'pending', orderNumber }) => {
  const id = `ord_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  getDb().prepare(
    `INSERT INTO orders (id, orderNumber, userId, customer_name, customer_email, customer_phone,
       customer_university, pricing_subtotal, pricing_grandTotal, delivery_mode, delivery_address,
       payment_mode, payment_status, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id, orderNumber || `T${String(Math.floor(Math.random() * 900000) + 100000)}`, buyerId,
    'Test Buyer', 'buyer@test.com', '+233241111111', 'atu',
    50, 50, 'inperson', 'Hall A', 'cash', paymentStatus, status,
  );
  return id;
};

// FK enforcement is ON (PRAGMA foreign_keys=1): order_items.productId must
// reference a real product row.
const seedProduct = (sellerId, suffix) => {
  const id = `prod_${suffix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  getDb().prepare(
    `INSERT INTO products (id, title, description, price, category, condition, seller, sellerName, university, status)
     VALUES (?, 'Seeded', 'Seeded for deletion tests', 10, 'electronics', 'good', ?, 'Seeded Seller', 'atu', 'active')`,
  ).run(id, sellerId);
  return id;
};

const seedSoldItem = (sellerId, orderId) => {
  const productId = seedProduct(sellerId, 'sold');
  getDb().prepare(
    'INSERT INTO order_items (id, orderId, productId, title, price, quantity, seller) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(`oi_${Date.now()}_${Math.random().toString(36).slice(2)}`, orderId, productId, 'Item', 50, 1, sellerId);
};

describe('getDeletionBlockers', () => {
  test('clear account → empty list', async () => {
    const u = await registerUser();
    const blockers = await getDeletionBlockers(u.id);
    expect(blockers).toEqual([]);
  });

  test('escrowed or available balance blocks with amount + support action', async () => {
    const u = await registerUser();
    seedLedger(u.id, 45, 'escrowed');
    const blockers = await getDeletionBlockers(u.id);
    const balance = blockers.find(b => b.type === 'balance');
    expect(balance).toBeTruthy();
    expect(balance.message).toContain('GHS 45.00');
    expect(balance.action.href).toBe('#/contact');
  });

  test('available-only balance also blocks', async () => {
    const u = await registerUser();
    seedLedger(u.id, 12.5, 'released');
    const blockers = await getDeletionBlockers(u.id);
    expect(blockers.some(b => b.type === 'balance')).toBe(true);
  });

  test('in-flight payout blocks; paid/failed payouts do not', async () => {
    const a = await registerUser();
    seedPayout(a.id, 'requested');
    expect((await getDeletionBlockers(a.id)).some(b => b.type === 'payout')).toBe(true);

    const b = await registerUser();
    seedPayout(b.id, 'paid');
    seedPayout(b.id, 'failed');
    expect((await getDeletionBlockers(b.id)).some(x => x.type === 'payout')).toBe(false);
  });

  test('buyer open order blocks with #/orders action; failed payment does not; terminal states do not', async () => {
    const u = await registerUser();
    seedOrder({ buyerId: u.id, status: 'placed', paymentStatus: 'pending' });
    const blockers = await getDeletionBlockers(u.id);
    const open = blockers.find(b => b.type === 'open_order');
    expect(open).toBeTruthy();
    expect(open.action.href).toBe('#/orders');

    const v = await registerUser();
    seedOrder({ buyerId: v.id, status: 'placed', paymentStatus: 'failed' });
    seedOrder({ buyerId: v.id, status: 'delivered', paymentStatus: 'completed' });
    seedOrder({ buyerId: v.id, status: 'cancelled', paymentStatus: 'completed' });
    expect(await getDeletionBlockers(v.id)).toEqual([]);
  });

  test('seller-side open order blocks via order_items join even when buyer is someone else', async () => {
    const seller = await registerUser();
    const buyer = await registerUser();
    const orderId = seedOrder({ buyerId: buyer.id, status: 'confirmed', paymentStatus: 'completed' });
    seedSoldItem(seller.id, orderId);
    const blockers = await getDeletionBlockers(seller.id);
    expect(blockers.some(b => b.type === 'open_order')).toBe(true);
    // Buyer's own gate sees it too.
    expect((await getDeletionBlockers(buyer.id)).some(b => b.type === 'open_order')).toBe(true);
  });
});
```

- [ ] **Step 2: Run — fails** (`backend/utils/accountDeletion.js` does not exist): `cd backend && npx jest tests/deletionGate.test.js`.

- [ ] **Step 3: Implement `backend/utils/accountDeletion.js`** — blocker section:

```js
// ============================================
// ACCOUNT DELETION — shared helpers (spec 2026-09-22)
// Obligations gate + atomic anonymize statements, shared by
// self-service DELETE /users/me and admin DELETE /users/:id.
// ============================================
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('../utils/db');
const { getSellerBalance } = require('./ledger');
const { destroyDocument } = require('./cloudinary.util');

const OPEN_ORDER_STATUSES = ['placed', 'confirmed', 'in-transit'];
const MAX_ORDERS_LISTED = 10;

async function getDeletionBlockers (userId) {
  const blockers = [];

  const bal = await getSellerBalance(userId);
  const total = bal.pending + bal.available;
  if (total > 0) {
    blockers.push({
      type: 'balance',
      message: `GHS ${total.toFixed(2)} is in your seller balance. Contact support to arrange a payout — or ask an administrator to delete this account for you.`,
      action: { label: 'Contact support', href: '#/contact' },
    });
  }

  const payout = await db('payouts').rawGet(
    `SELECT id FROM payouts WHERE sellerId = ? AND status IN ('requested','approved','processing') LIMIT 1`,
    [userId],
  );
  if (payout) {
    blockers.push({
      type: 'payout',
      message: 'A payout request is being processed. Wait for it to finish — or ask an administrator to delete this account for you.',
      action: { label: 'Contact support', href: '#/contact' },
    });
  }

  const placeholders = OPEN_ORDER_STATUSES.map(() => '?').join(',');
  const buyerOrders = await db('orders').rawAll(
    `SELECT id, orderNumber FROM orders
     WHERE userId = ? AND status IN (${placeholders}) AND payment_status != 'failed'
     ORDER BY createdAt DESC LIMIT ${MAX_ORDERS_LISTED}`,
    [userId, ...OPEN_ORDER_STATUSES],
  );
  const sellerOrders = await db('orders').rawAll(
    `SELECT DISTINCT o.id, o.orderNumber FROM order_items oi
     JOIN orders o ON o.id = oi.orderId
     WHERE oi.seller = ? AND o.status IN (${placeholders}) AND o.payment_status != 'failed'
     ORDER BY o.createdAt DESC LIMIT ${MAX_ORDERS_LISTED}`,
    [userId, ...OPEN_ORDER_STATUSES],
  );
  const seen = new Set();
  for (const o of [...buyerOrders, ...sellerOrders]) {
    if (seen.has(o.id)) { continue; }
    seen.add(o.id);
    blockers.push({
      type: 'open_order',
      message: `Order #${o.orderNumber || String(o.id).slice(0, 8)} is still in progress`,
      action: { label: 'View orders', href: '#/orders' },
    });
  }

  return blockers;
}
```

(Note: `rawAll` accepts `sql, paramsArray` — the spread form works because `rawAll` unwraps a single array or varargs; here params are passed as one array via `[userId, ...]` — call as `rawAll(sql, [userId, ...OPEN_ORDER_STATUSES])` to match the wrapper: `const params = Array.isArray(paramsOrArray[0]) ? paramsOrArray[0] : paramsOrArray`. Use the array form consistently.)

- [ ] **Step 4: Verify** — `cd backend && npx jest tests/deletionGate.test.js && npm run lint:check`.

- [ ] **Step 5: Commit** — `feat: deletion obligations-gate blocker queries + newsletter cleanup in test setup`.

---

### Task 3: Atomic execute + `deleteMyAccount` rewrite (factor, gate, scrub, receipt)

**Files:**
- Modify: `backend/utils/accountDeletion.js` (add `executeAccountDeletion`)
- Modify: `backend/controllers/user.controller.js` (rewrite `deleteMyAccount`)
- Modify: `backend/tests/deletionGate.test.js` (factor, 409, scrub, atomicity suites)
- Modify: `backend/tests/accountLifecycle.test.js` (google-only → OTP flow)

**Interfaces:**
- Produces: `executeAccountDeletion(user, { marker }) → { oldEmail }` — builds statements, one `batchWrite`, post-commit Cloudinary destroy loop. `DELETE /api/users/me` body `{ confirmText, password? | challengeId, code? }`.
- Consumed by: Task 5 (admin delete), Task 7 (modal payload).

**Steps:**

- [ ] **Step 0: Add mocks + shared reset at the TOP of `deletionGate.test.js`** (jest hoists `jest.mock` above the requires — docRetention pattern; add once when the file is created in Task 2, or in this task if Task 2 landed without them):

```js
jest.mock('../utils/cloudinary.util', () => {
  const actual = jest.requireActual('../utils/cloudinary.util');
  return {
    ...actual,
    destroyDocument: jest.fn(async () => ({ result: 'ok' })),
  };
});
jest.mock('../utils/emailService', () => {
  const actual = jest.requireActual('../utils/emailService');
  return {
    ...actual,
    sendEmail: jest.fn(async () => ({ success: true })),
  };
});
const { destroyDocument } = require('../utils/cloudinary.util');
const { sendEmail } = require('../utils/emailService');
const mfa = require('../utils/mfa');
```

After the `app` const, add a per-test reset so `mockResolvedValueOnce` /
`mockRejectedValueOnce` queues from one test can never poison the next:

```js
beforeEach(() => {
  sendEmail.mockReset();
  sendEmail.mockResolvedValue({ success: true });
  destroyDocument.mockReset();
  destroyDocument.mockResolvedValue({ result: 'ok' });
});
```

- [ ] **Step 1: Failing tests.** Append to `deletionGate.test.js`:

Suites to append:

```js
const setGoogleId = id =>
  getDb().prepare('UPDATE users SET googleId = ? WHERE id = ?').run(`g_${Date.now()}`, id);

const requestOtp = async token => {
  const res = await request(app).post('/api/users/me/deletion-otp')
    .set('Authorization', `Bearer ${token}`).send({});
  return res;
};
// NOTE (Task 3 only): /me/deletion-otp does not exist yet — create OTPs
// directly via mfa.createChallenge(user, 'delete') for THIS task's factor
// tests; Task 4 switches/extends to the HTTP endpoint.
const makeDeleteChallenge = async userId => {
  const user = await require('../utils/db').db('users').findById(userId);
  return mfa.createChallenge(user, 'delete');
};

describe('DELETE /users/me — factors', () => {
  test('pure-email account requires password; wrong password → 401 structured', async () => {
    const u = await registerUser();
    const bad = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', password: 'Nope1!' });
    expect(bad.status).toBe(401);
    expect(bad.body.success).toBe(false);

    // challengeId instead of password → requiredFactor password
    const ch = await makeDeleteChallenge(u.id);
    const wrongFactor = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', challengeId: ch.id, code: ch.code });
    expect(wrongFactor.status).toBe(400);
    expect(wrongFactor.body.requiredFactor).toBe('password');
  });

  test('google-linked account requires OTP; password-only → 400 requiredFactor otp', async () => {
    const u = await registerUser();
    setGoogleId(u.id);
    const pw = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', password: u.password });
    expect(pw.status).toBe(400);
    expect(pw.body.requiredFactor).toBe('otp');
  });

  test('google-linked deletes with OTP; purpose-confused login challenge rejected', async () => {
    const u = await registerUser();
    setGoogleId(u.id);

    // Purpose confusion: a LOGIN-bound challenge must not redeem here.
    const loginCh = await mfa.createChallenge(
      await require('../utils/db').db('users').findById(u.id), 'login');
    const confused = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', challengeId: loginCh.id, code: loginCh.code });
    expect(confused.status).not.toBe(200);
    const still = getDb().prepare('SELECT isActive FROM users WHERE id = ?').get(u.id);
    expect(still.isActive).toBe(1);

    const delCh = await makeDeleteChallenge(u.id);
    const ok = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', challengeId: delCh.id, code: delCh.code });
    expect(ok.status).toBe(200);
  });

  test('wrong OTP code → 400 with attemptsLeft; lock after 3', async () => {
    const u = await registerUser();
    setGoogleId(u.id);
    const ch = await makeDeleteChallenge(u.id);
    const miss = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', challengeId: ch.id, code: '000001' });
    expect(miss.status).toBe(400);
    expect(miss.body.attemptsLeft).toBe(2);

    for (let i = 0; i < 2; i++) {
      await request(app).delete('/api/users/me')
        .set('Authorization', `Bearer ${u.token}`)
        .send({ confirmText: 'DELETE', challengeId: ch.id, code: `00000${i + 2}` });
    }
    const locked = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', challengeId: ch.id, code: ch.code });
    expect(locked.status).toBe(400);
    expect(locked.body.error).toMatch(/too many/i);
    expect(getDb().prepare('SELECT isActive FROM users WHERE id = ?').get(u.id).isActive).toBe(1);
  });
});

describe('DELETE /users/me — obligations gate', () => {
  test('balance blocker → 409 DELETION_BLOCKED with structured list, account untouched', async () => {
    const u = await registerUser();
    setGoogleId(u.id);
    seedLedger(u.id, 45, 'escrowed');
    const ch = await makeDeleteChallenge(u.id);
    const res = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', challengeId: ch.id, code: ch.code });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DELETION_BLOCKED');
    expect(res.body.blockers.map(b => b.type)).toContain('balance');
    expect(getDb().prepare('SELECT isActive, email FROM users WHERE id = ?').get(u.id))
      .toMatchObject({ isActive: 1 });
    // OTP was consumed-or-not — irrelevant; account must be intact either way.
  });

  test('open buyer order → 409; after cancelling it, delete succeeds', async () => {
    const u = await registerUser();
    setGoogleId(u.id);
    const orderId = seedOrder({ buyerId: u.id });
    const ch1 = await makeDeleteChallenge(u.id);
    const blocked = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', challengeId: ch1.id, code: ch1.code });
    expect(blocked.status).toBe(409);
    expect(blocked.body.blockers[0].action.href).toBe('#/orders');

    // Clear the obligation (what the UI cancel button does).
    getDb().prepare('UPDATE orders SET status = ? WHERE id = ?').run('cancelled', orderId);
    const ch2 = await makeDeleteChallenge(u.id);
    const ok = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', challengeId: ch2.id, code: ch2.code });
    expect(ok.status).toBe(200);
  });
});

describe('DELETE /users/me — scrub completeness', () => {
  test('PII dies, transactions/consent/messages survive, receipt best-effort', async () => {
    const u = await registerUser();
    setGoogleId(u.id);
    const dbh = getDb();
    // FK-safe seeds (PRAGMA foreign_keys=1): real product + real conversation
    // before the rows that reference them.
    const wlProduct = seedProduct(u.id, 'wl');
    dbh.prepare('INSERT INTO wishlists (id, user, product) VALUES (?, ?, ?)').run(`wl_${u.id}`, u.id, wlProduct);
    dbh.prepare(
      'INSERT INTO student_verifications (id, userId, studentId, fullName, email, phone, university, level, verificationMethod, verificationCode, status, universityEmail, hall) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(`sv_${u.id}`, u.id, 'UG123456', 'Real Name', u.email, '+233249999999', 'atu', '200', 'email', '123456', 'pending', 'real@student.ug.edu.gh', 'Hall B');
    dbh.prepare(
      'INSERT INTO verification_documents (id, verificationId, fileName, cloudinaryPublicId, mimeType) VALUES (?, ?, ?, ?, ?)',
    ).run(`vd_${u.id}`, `sv_${u.id}`, 'id.png', 'jertscart/verifications/id.png', 'image/png');
    dbh.prepare('INSERT INTO newsletter_subscribers (id, email) VALUES (?, ?)').run(`nl_${u.id}`, u.email);
    dbh.prepare('INSERT INTO search_history (id, user, query) VALUES (?, ?, ?)').run(`sh_${u.id}`, u.id, 'shoes');
    dbh.prepare('INSERT INTO notifications (id, user, title, message) VALUES (?, ?, ?, ?)').run(`nt_${u.id}`, u.id, 'Hi', 'There');
    dbh.prepare('INSERT INTO conversations (id, createdBy) VALUES (?, ?)').run(`cv_${u.id}`, u.id);
    dbh.prepare('INSERT INTO messages (id, conversationId, sender, receiver, content) VALUES (?, ?, ?, ?, ?)').run(`msg_${u.id}`, `cv_${u.id}`, u.id, u.id, 'keep me');

    const ch = await makeDeleteChallenge(u.id);
    sendEmail.mockClear();
    destroyDocument.mockClear();

    const res = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', challengeId: ch.id, code: ch.code });
    expect(res.status).toBe(200);

    const user = dbh.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
    expect(user.isActive).toBe(0);
    expect(user.resetToken).toBeNull();
    expect(user.email).toBe(`deleted_${u.id}@anonymized.invalid`);

    // activity_logs PII scrubbed — target the signup row: the NEW
    // account_deleted audit row (inserted after the batch, details=
    // {by:'user'}) must NOT be picked by a bare LIMIT 1.
    const log = dbh.prepare(
      `SELECT userEmail, userName, ipAddress, userAgent, details FROM activity_logs
       WHERE user = ? AND action = 'signup' LIMIT 1`,
    ).get(u.id);
    expect(log).toBeTruthy();
    expect(log.userEmail).toBeNull();
    expect(log.ipAddress).toBeNull();
    expect(log.details).toBe('[redacted]');

    const ver = dbh.prepare('SELECT * FROM student_verifications WHERE userId = ?').get(u.id);
    expect(ver.studentId).toBe('redacted');
    expect(ver.email).toBe(`deleted_${u.id}@anonymized.invalid`);
    expect(ver.verificationCode).toBeNull();
    expect(ver.universityEmail).toBeNull();
    expect(ver.documentsPurgedAt).toBeTruthy();
    expect(dbh.prepare('SELECT COUNT(*) c FROM verification_documents').get().c).toBe(0);
    expect(destroyDocument).toHaveBeenCalledWith('jertscart/verifications/id.png', 'image/png');

    expect(dbh.prepare('SELECT COUNT(*) c FROM newsletter_subscribers').get().c).toBe(0);
    expect(dbh.prepare('SELECT COUNT(*) c FROM wishlists').get().c).toBe(0);
    expect(dbh.prepare('SELECT COUNT(*) c FROM search_history').get().c).toBe(0);
    expect(dbh.prepare('SELECT COUNT(*) c FROM notifications').get().c).toBe(0);

    // Survivors
    expect(dbh.prepare('SELECT COUNT(*) c FROM messages').get().c).toBe(1);
    expect(dbh.prepare('SELECT COUNT(*) c FROM consent_records WHERE userId = ?').get(u.id).c).toBeGreaterThanOrEqual(1);

    // Receipt to the OLD address, success irrelevant.
    expect(sendEmail).toHaveBeenCalled();
    expect(sendEmail.mock.calls[0][0]).toBe(u.email);
  });

  test('products flip to inactive (except sold)', async () => {
    const u = await registerUser();
    const dbh = getDb();
    const mk = (id, status) => dbh.prepare(
      `INSERT INTO products (id, title, description, price, category, condition, seller, sellerName, university, status)
       VALUES (?, 'P', 'D', 10, 'electronics', 'good', ?, 'S', 'atu', ?)`,
    ).run(id, u.id, status);
    mk('pr_active', 'active');
    mk('pr_sold', 'sold');

    // Password factor (this user is NOT google-linked — a challengeId would
    // bounce with requiredFactor:password).
    const res = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', password: u.password });
    expect(res.status).toBe(200);
    expect(dbh.prepare('SELECT status FROM products WHERE id = ?').get('pr_active').status).toBe('inactive');
    expect(dbh.prepare('SELECT status FROM products WHERE id = ?').get('pr_sold').status).toBe('sold');
  });

  test('atomicity: forced UNIQUE failure rolls back the whole scrub', async () => {
    const u = await registerUser();
    setGoogleId(u.id);
    const dbh = getDb();
    const wlProduct = seedProduct(u.id, 'atom');
    dbh.prepare('INSERT INTO wishlists (id, user, product) VALUES (?, ?, ?)').run(`wl_a_${u.id}`, u.id, wlProduct);
    // Plant the row the shell email would collide with (users.email UNIQUE).
    dbh.prepare(
      'INSERT INTO users (id, fullName, email, phone, university, password) VALUES (?, ?, ?, ?, ?, ?)',
    ).run('planter', 'Planter', `deleted_${u.id}@anonymized.invalid`, '+233240000009', 'atu', 'x');

    const ch = await makeDeleteChallenge(u.id);
    const res = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', challengeId: ch.id, code: ch.code });
    // errorHandler.js:112 maps 'UNIQUE constraint failed' → 400 (not 500).
    expect(res.status).toBe(400);

    const user = dbh.prepare('SELECT fullName, isActive FROM users WHERE id = ?').get(u.id);
    expect(user.isActive).toBe(1);
    expect(user.fullName).not.toBe('Deleted User');
    expect(dbh.prepare('SELECT COUNT(*) c FROM wishlists WHERE user = ?').get(u.id).c).toBe(1);
  });

  test('receipt email failure never fails the delete', async () => {
    const u = await registerUser();
    setGoogleId(u.id);
    sendEmail.mockRejectedValueOnce(new Error('smtp down'));
    const ch = await makeDeleteChallenge(u.id);
    const res = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', challengeId: ch.id, code: ch.code });
    expect(res.status).toBe(200);
    expect(getDb().prepare('SELECT isActive FROM users WHERE id = ?').get(u.id).isActive).toBe(0);
  });
});
```

Also update `backend/tests/accountLifecycle.test.js` google-only test — the old "deletes without password" now expects the factor gate. **In Task 3** paste this block (challenge created directly via `mfa`, because the OTP endpoint does not exist yet):

```js
test('google-linked account deletes with an emailed OTP, not a free pass', async () => {
  const u = await registerUser();
  const { getDb } = require('../config/database');
  getDb().prepare('UPDATE users SET googleId = ? WHERE id = ?').run(`g-${Date.now()}`, u.id);

  // Password-only (the Wave 1 behavior) must now fail closed.
  const pwOnly = await request(app)
    .delete('/api/users/me')
    .set('Authorization', `Bearer ${u.token}`)
    .send({ confirmText: 'DELETE', password: u.password });
  expect(pwOnly.status).toBe(400);
  expect(pwOnly.body.requiredFactor).toBe('otp');

  // Task 3 only: endpoint arrives in Task 4.
  const user = require('../utils/db').db('users');
  const ch = await require('../utils/mfa').createChallenge(await user.findById(u.id), 'delete');

  const res = await request(app)
    .delete('/api/users/me')
    .set('Authorization', `Bearer ${u.token}`)
    .send({ confirmText: 'DELETE', challengeId: ch.id, code: ch.code });
  expect(res.status).toBe(200);
});
```

**In Task 4**, replace the direct-`mfa` challenge lines with the HTTP path — the final form is fully specified in Task 4's step for this same test. Do not leave the direct-`mfa` branch behind.

- [ ] **Step 2: Run — fails** (gate/scrub/factor behaviors absent): `cd backend && npx jest tests/deletionGate.test.js tests/accountLifecycle.test.js`.

- [ ] **Step 3: Implement `executeAccountDeletion` in `backend/utils/accountDeletion.js`:**

```js
/**
 * Atomic anonymize + scrub. Writes go through ONE batchWrite (atomic on
 * local SQLite and Turso). The caller re-checks blockers immediately
 * before invoking this; the residual SELECT→batch gap is a documented
 * TOCTOU (same-user, milliseconds) — see spec §2 escape clause.
 * Cloudinary destroys run post-commit, best-effort.
 * @returns {Promise<{ oldEmail: string }>}
 */
async function executeAccountDeletion (user, { marker }) {
  const oldEmail = user.email;
  const shellEmail = `deleted_${user.id}@anonymized.invalid`;
  const newHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);

  // Collect document assets BEFORE their rows vanish.
  const verifications = await db('student_verifications').find({ userId: user.id });
  const docs = [];
  for (const v of verifications) {
    const rows = await db('verification_documents').find({ verificationId: v.id });
    docs.push(...rows);
  }

  // TODO: security review — gate SELECT happens in the controller right
  // before this call; batchWrite is all-or-nothing but cannot interleave
  // reads (Turso has no cross-request transactions).
  const statements = [
    {
      sql: `UPDATE users SET fullName = 'Deleted User', email = ?, phone = ?,
            avatar = '', bio = NULL, googleId = NULL, password = ?, isActive = 0,
            banReason = ?, resetToken = NULL, resetTokenExpiry = NULL,
            updatedAt = datetime('now') WHERE id = ?`,
      args: [shellEmail, `deleted-${String(user.id).slice(0, 8)}`, newHash, marker, user.id],
    },
    {
      sql: `UPDATE activity_logs SET userEmail = NULL, userName = NULL,
            ipAddress = NULL, userAgent = NULL, details = '[redacted]' WHERE user = ?`,
      args: [user.id],
    },
    {
      sql: `UPDATE student_verifications SET fullName = 'Deleted User', email = ?,
            phone = 'deleted', studentId = 'redacted', universityEmail = NULL,
            hall = NULL, verificationCode = NULL,
            documentsPurgedAt = datetime('now'), updatedAt = datetime('now')
            WHERE userId = ?`,
      args: [shellEmail, user.id],
    },
    { sql: `DELETE FROM verification_documents WHERE verificationId IN (SELECT id FROM student_verifications WHERE userId = ?)`, args: [user.id] },
    { sql: `DELETE FROM newsletter_subscribers WHERE email = ?`, args: [oldEmail] },
    { sql: `DELETE FROM wishlists WHERE user = ?`, args: [user.id] },
    { sql: `DELETE FROM search_history WHERE user = ?`, args: [user.id] },
    { sql: `DELETE FROM notifications WHERE user = ?`, args: [user.id] },
    { sql: `DELETE FROM idempotency_keys WHERE userId = ?`, args: [user.id] },
    { sql: `DELETE FROM admin_mfa_challenges WHERE userId = ?`, args: [user.id] },
    { sql: `UPDATE products SET status = 'inactive', updatedAt = datetime('now') WHERE seller = ? AND status != 'sold'`, args: [user.id] },
  ];

  await db('users').batchWrite(statements);

  for (const d of docs) {
    if (!d.cloudinaryPublicId) { continue; }
    try {
      await destroyDocument(d.cloudinaryPublicId, d.mimeType || d.fileType);
    } catch (_e) { /* best-effort: never resurrect a committed deletion */ }
  }

  return { oldEmail };
}

module.exports = { getDeletionBlockers, executeAccountDeletion };
```

- [ ] **Step 4: Rewrite `deleteMyAccount` in `backend/controllers/user.controller.js`** (replace lines 190-237):

```js
const { sendEmail } = require('../utils/emailService');
const mfa = require('../utils/mfa');
const { getDeletionBlockers, executeAccountDeletion } = require('../utils/accountDeletion');
// add these requires at the top with the existing ones

/**
 * @desc Self-service account deletion: re-auth factor (password OR
 *   purpose-bound email OTP) → obligations gate → one atomic scrub →
 *   best-effort receipt. Structured bodies (409/requiredFactor/attempts)
 *   bypass ApiError because errorHandler only forwards error+details.
 * @route DELETE /api/users/me
 * @access private
 */
exports.deleteMyAccount = asyncHandler(async (req, res) => {
  const user = await db('users').findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'Account not found');
  }

  const { confirmText, password, challengeId, code } = req.body;
  if (confirmText !== 'DELETE') {
    throw new ApiError(400, 'Type DELETE to confirm account deletion');
  }

  const requiresOtp = !!user.googleId;
  if (requiresOtp) {
    if (password && !challengeId) {
      return res.status(400).json({
        success: false,
        error: 'This account deletes with a code we email you.',
        requiredFactor: 'otp',
      });
    }
    if (!challengeId || !code) {
      return res.status(400).json({
        success: false,
        error: 'Enter the 6-digit code we emailed you.',
        requiredFactor: 'otp',
      });
    }
    const result = await mfa.verifyChallenge(challengeId, user.id, code, 'delete');
    if (!result.ok) {
      const messages = {
        wrong_code: 'Invalid code',
        expired: 'Code expired — request a new one',
        already_used: 'Code already used — request a new one',
        too_many_attempts: 'Too many attempts — request a new code',
        invalid_format: 'Code must be 6 digits',
        not_found: 'Code session not found — request a new one',
      };
      return res.status(400).json({
        success: false,
        error: messages[result.reason] || 'Verification failed',
        ...(result.attemptsLeft !== undefined ? { attemptsLeft: result.attemptsLeft } : {}),
      });
    }
  } else {
    if (challengeId) {
      return res.status(400).json({
        success: false,
        error: 'Enter your password to delete this account.',
        requiredFactor: 'password',
      });
    }
    if (!password || typeof password !== 'string') {
      throw new ApiError(400, 'Password confirmation required');
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      // 401 preserved for Wave 1 regression; frontend treats /users/me*
      // 401s as inline errors (no session clear).
      return res.status(401).json({ success: false, error: 'Invalid password' });
    }
  }

  // Gate re-check, immediately before the atomic write (spec §2).
  const blockers = await getDeletionBlockers(user.id);
  if (blockers.length > 0) {
    return res.status(409).json({ success: false, code: 'DELETION_BLOCKED', blockers });
  }

  const { oldEmail } = await executeAccountDeletion(user, {
    marker: 'account deleted by user',
  });

  await logActivity('account_deleted',
    { id: user.id, email: '[redacted]' },
    { by: 'user', method: requiresOtp ? 'otp' : 'password' },
    'warning', req);

  // Receipt: best-effort to the pre-scrub address; never fails the delete.
  try {
    await sendEmail(oldEmail, 'Your JERTS CART account has been deleted',
      `<p>Your JERTS CART account was deleted and your personal data anonymized today.</p>
       <p>Anonymized transaction records we must keep for accounting remain linked to an anonymous profile.</p>`);
  } catch (_e) { /* log-only */ }

  res.json({ success: true, message: 'Your account has been deleted and your personal data removed.' });
});
```

- [ ] **Step 5: Verify** — `cd backend && npx jest tests/deletionGate.test.js tests/accountLifecycle.test.js tests/mfa.test.js` then `npm test` (full — catches collateral) then `npm run lint:check`. All green. If any other suite seeds orders/newsletter rows that now trip the new gate, fix the TEST setup (not the gate) — the gate only fires for the deleting user.

- [ ] **Step 6: Commit** — `feat: hardened self-delete — OTP/password factor, obligations gate, atomic full PII scrub, receipt email`.

---

### Task 4: OTP + preflight endpoints, rate limiter, route order

**Files:**
- Modify: `backend/controllers/user.controller.js` (add `getMyDeletionBlockers`, `requestDeletionOtp`)
- Modify: `backend/routes/user.routes.js`
- Modify: `backend/tests/deletionGate.test.js` (endpoint suite; collapse accountLifecycle's direct-`mfa` challenge to HTTP)

**Interfaces:**
- Produces:
  - `GET /api/users/me/deletion-blockers` (protect) → `{ success: true, blockers }` — 200 always (advisory).
  - `POST /api/users/me/deletion-otp` (protect, limiter3/15min keyed userId+IP) → 200 `{ success, challengeId, expiresInSeconds: 300, devCode? }` | 400 `{ requiredFactor: 'password' }` (pure-email) | 429 `{ retryAfterSeconds }` | 502 send failure (non-test, unconfigured).
- Consumed by: Task 7 modal.

**Steps:**

- [ ] **Step 1: Failing tests** — append to `deletionGate.test.js`:

```js
describe('deletion preflight + OTP endpoints', () => {
  // Shared require-cache instance of the mounted router — its otpStore is
  // the live limiter store. resetAll between tests or the 3/15min counter
  // accumulates (rate-limit test would poison the OTP tests that follow).
  const { otpStore } = require('../routes/user.routes');
  // Guarded: at Step 1 (routes not yet written) otpStore is undefined and
  // tests must fail with 404, not a TypeError.
  beforeEach(async () => { if (otpStore) await otpStore.resetAll(); });

  test('GET /users/me/deletion-blockers → 200 clear / 200 with list when blocked', async () => {
    const u = await registerUser();
    const clear = await request(app).get('/api/users/me/deletion-blockers')
      .set('Authorization', `Bearer ${u.token}`);
    expect(clear.status).toBe(200);
    expect(clear.body.blockers).toEqual([]);

    seedLedger(u.id, 10, 'released');
    const blocked = await request(app).get('/api/users/me/deletion-blockers')
      .set('Authorization', `Bearer ${u.token}`);
    expect(blocked.status).toBe(200);
    expect(blocked.body.blockers[0].type).toBe('balance');
  });

  test('requires authentication', async () => {
    expect((await request(app).get('/api/users/me/deletion-blockers')).status).toBe(401);
  });

  test('google-linked POST deletion-otp → challengeId + devCode(test); pure-email → requiredFactor password', async () => {
    const g = await registerUser();
    setGoogleId(g.id);
    const otp = await requestOtp(g.token);
    expect(otp.status).toBe(200);
    expect(otp.body.challengeId).toBeDefined();
    expect(otp.body.expiresInSeconds).toBe(300);
    expect(otp.body.devCode).toMatch(/^\d{6}$/);
    expect(otp.body.code).toBeUndefined(); // raw code never in responses

    const p = await registerUser();
    const res = await requestOtp(p.token);
    expect(res.status).toBe(400);
    expect(res.body.requiredFactor).toBe('password');
  });

  test('devCode absent when NODE_ENV is not test; 502 when send fails outside test', async () => {
    const g = await registerUser();
    setGoogleId(g.id);
    const prev = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      sendEmail.mockResolvedValueOnce({ success: true });
      const ok = await requestOtp(g.token);
      expect(ok.status).toBe(200);
      expect(ok.body.devCode).toBeUndefined();

      sendEmail.mockResolvedValueOnce({ success: false, error: 'no transport' });
      const fail = await requestOtp(g.token);
      expect(fail.status).toBe(502);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  test('rate limit: 4th send in window → 429 with retryAfterSeconds', async () => {
    const g = await registerUser();
    setGoogleId(g.id);
    for (let i = 0; i < 3; i++) {
      const r = await requestOtp(g.token);
      expect(r.status).toBe(200);
    }
    const limited = await requestOtp(g.token);
    expect(limited.status).toBe(429);
    expect(limited.body.retryAfterSeconds).toBeGreaterThan(0);
  });

  test('purpose confusion across endpoints: deletion challenge rejected at /auth/mfa/verify', async () => {
    const g = await registerUser();
    setGoogleId(g.id);
    const otp = await requestOtp(g.token);
    const verify = await request(app).post('/api/auth/mfa/verify')
      .send({ challengeId: otp.body.challengeId, code: otp.body.devCode });
    expect(verify.status).toBe(401);
    expect(verify.body.token).toBeUndefined();
  });
});
```

Update `accountLifecycle.test.js` google test: replace the direct-`mfa` challenge block (the `const user = ...` / `mfa.createChallenge(...)` lines Task 3 pasted) with this HTTP form — keep the `pwOnly` assertions above it unchanged:

```js
const otp = await request(app)
  .post('/api/users/me/deletion-otp')
  .set('Authorization', `Bearer ${u.token}`)
  .send({});
expect(otp.status).toBe(200);
const res = await request(app)
  .delete('/api/users/me')
  .set('Authorization', `Bearer ${u.token}`)
  .send({ confirmText: 'DELETE', challengeId: otp.body.challengeId, code: otp.body.devCode });
expect(res.status).toBe(200);
```

- [ ] **Step 2: Run — fails** (404 on new routes): `cd backend && npx jest tests/deletionGate.test.js tests/accountLifecycle.test.js`.

- [ ] **Step 3: Controllers** — add to `user.controller.js`:

```js
/**
 * @desc Advisory preflight: structured blockers for the requesting user
 * @route GET /api/users/me/deletion-blockers
 */
exports.getMyDeletionBlockers = asyncHandler(async (req, res) => {
  const blockers = await getDeletionBlockers(req.user.id);
  res.json({ success: true, blockers });
});

/**
 * @desc Send a purpose-bound OTP for account deletion (Google-linked only)
 * @route POST /api/users/me/deletion-otp
 */
exports.requestDeletionOtp = asyncHandler(async (req, res) => {
  const user = await db('users').findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'Account not found');
  }
  if (!user.googleId) {
    return res.status(400).json({
      success: false,
      error: 'This account deletes with your password.',
      requiredFactor: 'password',
    });
  }

  const challenge = await mfa.createChallenge(user, 'delete');
  const sent = await sendEmail(
    user.email,
    'Your JERTS CART account deletion code',
    `<p>Your JERTS CART account deletion code is:</p>
     <p style="font-size:28px;font-weight:700;letter-spacing:6px;">${challenge.code}</p>
     <p>This code expires in 5 minutes and can be used once. If you did not request account deletion, you can ignore this email.</p>`,
  );
  // In test env we still return devCode (suites complete the flow without
  // a mailbox). Outside test, an unconfigured/failed transport is fatal:
  // deletion intent cannot be verified without the emailed factor.
  if (process.env.NODE_ENV !== 'test' && !sent.success) {
    throw new ApiError(502, 'We could not email your code — please try again shortly.');
  }

  res.json({
    success: true,
    challengeId: challenge.id,
    expiresInSeconds: 300,
    ...(challenge.devCode ? { devCode: challenge.devCode } : {}),
  });
});
```

Export the two new functions from the destructured require in `user.routes.js`.

- [ ] **Step 4: Routes + limiter** — rewrite `backend/routes/user.routes.js`:

```js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect, authorize } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../utils/errorHandler');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  exportMyData,
  deleteMyAccount,
  getMyDeletionBlockers,
  requestDeletionOtp,
} = require('../controllers/user.controller');

// OTP-send throttle: 3 / 15 min keyed userId+IP. custom handler returns
// retryAfterSeconds for the modal countdown (spec §5). Placed here (not
// server.js) so it sits AFTER protect and can key on req.user.
// Explicit MemoryStore so tests can resetAll() between cases — without
// this the in-process counter accumulates suite-wide and later tests 429.
// TODO: security review — confirm 3/15min is not lockout-prone for shared-NAT dorm users.
const otpStore = new rateLimit.MemoryStore();
const deletionOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  store: otpStore,
  keyGenerator: req => `${(req.user && req.user.id) || 'anon'}:${req.ip}`,
  handler: (req, res, _next, options) => {
    const info = req.rateLimit || {};
    const resetMs = info.resetTime instanceof Date
      ? info.resetTime.getTime() - Date.now()
      : (options && options.windowMs) || 15 * 60 * 1000;
    res.status(429).json({
      success: false,
      error: 'Too many code requests — please wait before trying again.',
      retryAfterSeconds: Math.max(1, Math.ceil(resetMs / 1000)),
    });
  },
});

router.get('/', protect, authorize('admin'), getUsers);
// Self-service account lifecycle (specs 2026-08-23, 2026-09-22). ORDERING
// IS LOAD-BEARING: every /me/* route MUST stay above the parametric /:id
// block — GET '/me/deletion-blockers' would otherwise be captured by
// GET '/:id/deletion-blockers', and DELETE /:id (admin) by DELETE /me.
router.get('/me/export', protect, asyncHandler(exportMyData));
router.get('/me/deletion-blockers', protect, asyncHandler(getMyDeletionBlockers));
router.post('/me/deletion-otp', protect, deletionOtpLimiter, asyncHandler(requestDeletionOtp));
router.delete('/me', protect, asyncHandler(deleteMyAccount));
router.get('/:id/deletion-blockers', protect, authorize('admin'), asyncHandler(getTargetDeletionBlockers)); // Task 5 adds the handler; add this line in Task 5
router.get('/:id', protect, getUser);
router.put('/:id', protect, authorize('admin'), updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);

// Test hook: deletionGate.test.js resets the throttle between cases so
// counts never leak across tests (same module instance via require cache).
router.otpStore = otpStore;

module.exports = router;
```

Do NOT add the `getTargetDeletionBlockers` line until Task 5 (it would break the require). Keep it out of this task's edit.

- [ ] **Step 5: Verify** — `cd backend && npx jest tests/deletionGate.test.js tests/accountLifecycle.test.js tests/mfa.test.js && npm test && npm run lint:check`.

- [ ] **Step 6: Commit** — `feat: deletion OTP + preflight endpoints with3/15min userId+IP rate limit`.

---

### Task 5: Admin delete upgrade + admin preflight

**Files:**
- Modify: `backend/controllers/user.controller.js` (rewrite `deleteUser`, add `getTargetDeletionBlockers`)
- Modify: `backend/routes/user.routes.js` (one route line)
- Create: `backend/tests/deletionAdmin.test.js`

**Interfaces:**
- Produces:
  - `GET /api/users/:id/deletion-blockers` (protect, admin) → `{ success, blockers }` | 404 unknown/already-deleted
  - `DELETE /api/users/:id` (protect, admin) body `{ reason }` (min 5) → anonymize via shared helper, **gate bypassed**, audit `account_deleted` with `{ by: 'admin', actorId, reason }`, receipt email; guards: 400 reason, 403 self, 403 admin/moderator target, 404 unknown/already-deleted.
- Consumed by: Task 9 (`api.users.delete/deletionBlockers`).

**Steps:**

- [ ] **Step 1: Failing tests** — create `backend/tests/deletionAdmin.test.js`:

```js
/**
 * Admin-side deletion (spec 2026-09-22 §4): reason guards, gate bypass,
 * shared scrub, audit — Ban remains the reversible moderation tool.
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

jest.mock('../utils/emailService', () => {
  const actual = jest.requireActual('../utils/emailService');
  return { ...actual, sendEmail: jest.fn(async () => ({ success: true })) };
});

const app = createTestApp();
const { getDb } = require('../config/database');

async function registerUser (prefix = 'adm') {
  const res = await request(app).post('/api/auth/register').send({
    ...global.testUtils.generateTestUser(),
    email: `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
  });
  return { token: res.body.data.token, id: res.body.data.user._id, email: res.body.data.user.email };
}

const promote = (id, role) =>
  getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);

describe('admin DELETE /users/:id', () => {
  test('missing/short reason → 400; unknown id → 404; non-admin → 403', async () => {
    const admin = await registerUser(); promote(admin.id, 'admin');
    const victim = await registerUser();

    const noReason = await request(app).delete(`/api/users/${victim.id}`)
      .set('Authorization', `Bearer ${admin.token}`).send({});
    expect(noReason.status).toBe(400);

    const short = await request(app).delete(`/api/users/${victim.id}`)
      .set('Authorization', `Bearer ${admin.token}`).send({ reason: 'ab' });
    expect(short.status).toBe(400);

    const unknown = await request(app).delete('/api/users/nope-id')
      .set('Authorization', `Bearer ${admin.token}`).send({ reason: 'valid reason' });
    expect(unknown.status).toBe(404);

    const buyer = await registerUser();
    const forbidden = await request(app).delete(`/api/users/${victim.id}`)
      .set('Authorization', `Bearer ${buyer.token}`).send({ reason: 'valid reason' });
    expect(forbidden.status).toBe(403);
  });

  test('cannot delete self, an admin, or a moderator', async () => {
    const admin = await registerUser(); promote(admin.id, 'admin');
    const otherAdmin = await registerUser(); promote(otherAdmin.id, 'admin');
    const mod = await registerUser(); promote(mod.id, 'moderator');

    const self = await request(app).delete(`/api/users/${admin.id}`)
      .set('Authorization', `Bearer ${admin.token}`).send({ reason: 'valid reason' });
    expect(self.status).toBe(403);

    const peer = await request(app).delete(`/api/users/${otherAdmin.id}`)
      .set('Authorization', `Bearer ${admin.token}`).send({ reason: 'valid reason' });
    expect(peer.status).toBe(403);

    const targetMod = await request(app).delete(`/api/users/${mod.id}`)
      .set('Authorization', `Bearer ${admin.token}`).send({ reason: 'valid reason' });
    expect(targetMod.status).toBe(403);
  });

  test('bypasses obligations gate, runs shared scrub, writes audit with reason', async () => {
    const admin = await registerUser(); promote(admin.id, 'admin');
    const seller = await registerUser();
    // Escrowed money — would409 on the self path.
    getDb().prepare(
      'INSERT INTO ledger_entries (id, sellerId, type, amount, status) VALUES (?, ?, ?, ?, ?)',
    ).run(`led_${Date.now()}`, seller.id, 'sale', 99, 'escrowed');

    const res = await request(app).delete(`/api/users/${seller.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ reason: 'spam account harassment' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);

    const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(seller.id);
    expect(row.isActive).toBe(0);
    expect(row.email).toBe(`deleted_${seller.id}@anonymized.invalid`);
    expect(row.banReason).toBe('deleted by admin: spam account harassment');

    const audit = getDb().prepare(
      `SELECT details FROM activity_logs WHERE action = 'account_deleted' AND user = ? ORDER BY createdAt DESC LIMIT 1`,
    ).get(seller.id);
    expect(audit).toBeTruthy();
    const details = JSON.parse(audit.details);
    expect(details.by).toBe('admin');
    expect(details.actorId).toBe(admin.id);
    expect(details.reason).toBe('spam account harassment');
    // logActivity(action, user, details, severity, req) — the ADMIN's req
    // fills ipAddress; userEmail/userName are explicitly '[redacted]' for
    // account_deleted (see logActivity.js). Assert redaction, not nulls.
    const full = getDb().prepare(
      'SELECT userEmail, userName, ipAddress FROM activity_logs WHERE action = ? AND user = ?',
    ).get('account_deleted', seller.id);
    expect(full.userEmail).toBe('[redacted]');
    expect(full.userName).toBe('[redacted]');
    expect(full.userEmail).not.toBe(seller.email);
    expect(full.ipAddress).not.toBe(seller.email);
  });

  test('already-deleted shell → 404; banned-but-live user remains deletable', async () => {
    const admin = await registerUser(); promote(admin.id, 'admin');
    const shell = await registerUser();
    await request(app).delete(`/api/users/${shell.id}`)
      .set('Authorization', `Bearer ${admin.token}`).send({ reason: 'first delete reason' });
    const again = await request(app).delete(`/api/users/${shell.id}`)
      .set('Authorization', `Bearer ${admin.token}`).send({ reason: 'second delete reason' });
    expect(again.status).toBe(404);

    const banned = await registerUser();
    getDb().prepare('UPDATE users SET isSuspended = 1, banReason = ? WHERE id = ?')
      .run('abuse', banned.id);
    const del = await request(app).delete(`/api/users/${banned.id}`)
      .set('Authorization', `Bearer ${admin.token}`).send({ reason: 'abuse plus delete' });
    expect(del.status).toBe(200);
  });
});

describe('admin GET /users/:id/deletion-blockers', () => {
  test('returns target blockers for admin; 404 unknown; 403 non-admin', async () => {
    const admin = await registerUser(); promote(admin.id, 'admin');
    const seller = await registerUser();
    getDb().prepare(
      'INSERT INTO payouts (id, sellerId, amount, method, destination, status) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(`p_${Date.now()}`, seller.id, 30, 'momo', '024', 'requested');

    const ok = await request(app).get(`/api/users/${seller.id}/deletion-blockers`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(ok.status).toBe(200);
    expect(ok.body.blockers.map(b => b.type)).toContain('payout');

    expect((await request(app).get('/api/users/ghost/deletion-blockers')
      .set('Authorization', `Bearer ${admin.token}`)).status).toBe(404);

    const buyer = await registerUser();
    expect((await request(app).get(`/api/users/${seller.id}/deletion-blockers`)
      .set('Authorization', `Bearer ${buyer.token}`)).status).toBe(403);
  });
});
```

- [ ] **Step 2: Run — fails:** `cd backend && npx jest tests/deletionAdmin.test.js`.

- [ ] **Step 3: Implement.** In `user.controller.js` replace `deleteUser` (lines 108-121) and add the preflight handler:

```js
const SHELL_EMAIL_RE = /^deleted_[^@]+@anonymized\.invalid$/;

const isAlreadyDeleted = user =>
  SHELL_EMAIL_RE.test(user.email) ||
  user.banReason === 'account deleted by user' ||
  String(user.banReason || '').startsWith('deleted by admin:');

/**
 * @desc Admin preflight warnings for deleting a target account
 * @route GET /api/users/:id/deletion-blockers
 */
exports.getTargetDeletionBlockers = asyncHandler(async (req, res) => {
  const user = await db('users').findById(req.params.id);
  if (!user || isAlreadyDeleted(user)) {
    throw new ApiError(404, 'User not found');
  }
  const blockers = await getDeletionBlockers(user.id);
  res.json({ success: true, blockers });
});

/**
 * @desc Admin deletion: anonymize + scrub (shared with self path).
 *   Obligations gate is BYPASSED by design — admin delete is the
 *   guaranteed exit valve when money/order blockers would deadlock a
 *   self-service deletion (spec 2026-09-22 §4).
 * @route DELETE /api/users/:id
 */
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await db('users').findById(req.params.id);
  if (!user || isAlreadyDeleted(user)) {
    throw new ApiError(404, 'User not found');
  }

  const { reason } = req.body;
  if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
    throw new ApiError(400, 'A deletion reason of at least 5 characters is required');
  }
  if (user.id === req.user.id) {
    throw new ApiError(403, 'You cannot delete your own account from here — use Settings');
  }
  if (['admin', 'moderator'].includes(user.role)) {
    throw new ApiError(403, 'Administrators and moderators cannot be deleted');
  }

  const trimmed = reason.trim();
  const { oldEmail } = await executeAccountDeletion(user, {
    marker: `deleted by admin: ${trimmed}`,
  });

  // Actor-side audit: target-linked row, redacted identity columns, admin
  // context in details (schema has no admin_user_deleted action yet —
  // reuse account_deleted per spec §4 follow-up note).
  await logActivity('account_deleted',
    { id: user.id, email: '[redacted]' },
    { by: 'admin', actorId: req.user.id, reason: trimmed },
    'warning', req);

  try {
    await sendEmail(oldEmail, 'Your JERTS CART account has been deleted',
      `<p>An administrator deleted your JERTS CART account. Your personal data has been anonymized.</p>
       <p>Anonymized transaction records we must keep for accounting remain.</p>`);
  } catch (_e) { /* best-effort */ }

  res.json({ success: true, message: 'User deleted and anonymized' });
});
```

Route line (after `/me` block, before `/:id`):

```js
router.get('/:id/deletion-blockers', protect, authorize('admin'), asyncHandler(getTargetDeletionBlockers));
```

Add `getTargetDeletionBlockers` to the route file's destructured require.

- [ ] **Step 4: Verify** — `cd backend && npx jest tests/deletionAdmin.test.js && npm test && npm run lint:check`.

- [ ] **Step 5: Commit** — `feat: admin account deletion — reason guards, gate bypass, shared scrub, audit`.

---

### Task 6: Frontend API helpers + 401 session-preservation fix

**Files:**
- Modify: `js/utils/api.js`

**Interfaces:**
- Produces: payload/object signatures the modal (Task 7) and admin UI (Task 9) call.

**Steps:**

- [ ] **Step 1:** In `js/utils/api.js` `request()` (~line 365) replace the session-expiry guard:

```js
          // Don't trigger session-expired flow for auth endpoints OR the
          // self-deletion surface: a wrong password / bad OTP on
          // DELETE /users/me returns 401 while the token is perfectly
          // valid — clearing the session there would log the user out for
          // a typo (spec 2026-09-22 §5: session kept unless deleted).
          // Any other endpoint still clears on 401 as before.
          const isAuthEndpoint = url.startsWith('/auth/') || url.startsWith('/users/me');
```

- [ ] **Step 2:** Replace the `users` and `account` helper blocks (api.js:725-738):

```js
  users = {
    getById: id => this.get(`/users/${encodeURIComponent(id)}`),
    getAll: params => this.get('/users', params), // Admin only
    update: (id, data) => this.put(`/users/${encodeURIComponent(id)}`, data), // Admin only
    // Admin delete (spec 2026-09-22): body carries the audit reason.
    delete: (id, reason) => this.delete(`/users/${encodeURIComponent(id)}`, { reason }),
    // Admin preflight warnings (same shape as the self-service list).
    deletionBlockers: id => this.get(`/users/${encodeURIComponent(id)}/deletion-blockers`),
  };

  /**
   * Self-service account lifecycle (specs 2026-08-23, 2026-09-22).
   */
  account = {
    exportData: () => this.request('/users/me/export', { method: 'GET' }),
    deletionBlockers: () => this.request('/users/me/deletion-blockers', { method: 'GET' }),
    requestDeletionOtp: () => this.post('/users/me/deletion-otp', {}),
    // payload: { confirmText, password? } or { confirmText, challengeId, code }
    deleteMe: payload => this.delete('/users/me', payload),
  };
```

- [ ] **Step 3:** Update the single call site `js/pages/pages.js:4474` (old positional signature) — Task 7 rewrites this modal anyway; if Task 6 commits before Task 7, adapt the existing line to `api.account.deleteMe({ confirmText, password })` so the tree stays green.

- [ ] **Step 4: Verify (frontend gates):** `npm run lint:check && npx prettier --check "js/**/*.js" && npm run build`.

- [ ] **Step 5: Commit** — `feat: api helpers for hardened deletion + keep session on /users/me credential 401s`.

---

### Task 7: User delete modal rewrite (tri-state preflight, factor UI, single request)

**Files:**
- Modify: `js/pages/pages.js` (`_openDeleteAccountModal`, lines ~4416-4495)

**Interfaces:**
- Consumes: `api.account.deletionBlockers/requestDeletionOtp/deleteMe` (Task 6).
- UX per spec §5: `checking… → blocked(list) | clear | couldn't verify` (fail-closed); factor step guesses from `authManager.getCurrentUser()?.googleId`, switches on `requiredFactor`; ONE `DELETE` request; errors via `textContent`/`_pageEsc`.

**Steps:**

- [ ] **Step 1:** Replace `_openDeleteAccountModal` wholesale (keep the method name so the Settings wiring at line 4396 stays valid). Implementation requirements — the code must contain all of:

```js
static _openDeleteAccountModal() {
  const overlay = document.createElement('div');
  overlay.id = 'delete-account-overlay';
  overlay.className = 'admin-modal-light-backdrop';
  overlay.innerHTML = `
    <div role="dialog" aria-modal="true" aria-labelledby="del-acct-title" class="admin-modal-light" style="position:relative;">
      <button type="button" data-del-cancel class="admin-modal-light-close" aria-label="Close">&times;</button>
      <h3 id="del-acct-title" class="admin-modal-light-title">Delete your account?</h3>
      <p class="admin-modal-light-text admin-modal-light-text--muted">This permanently removes your personal information. Your past orders remain as anonymous records for accounting. This cannot be undone.</p>

      <!-- tri-state preflight -->
      <div id="del-acct-blockers" class="admin-modal-light-text" style="display:none;"></div>

      <!-- factor step: password -->
      <div id="del-acct-factor-pw" style="display:none;">
        <input id="del-acct-password" type="password" class="admin-modal-light-field" placeholder="Current password" autocomplete="current-password" />
      </div>

      <!-- factor step: OTP -->
      <div id="del-acct-factor-otp" style="display:none;">
        <div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;">
          <button type="button" id="del-acct-send" class="btn btn-outline btn-sm">Send code</button>
          <span id="del-acct-send-state" class="admin-modal-light-text admin-modal-light-text--muted" aria-live="polite"></span>
        </div>
        <input id="del-acct-code" class="admin-modal-light-field" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" autocomplete="one-time-code" placeholder="6-digit code" />
        <p class="admin-modal-light-text admin-modal-light-text--muted" style="font-size:0.8rem;">Code expires in 5 minutes.</p>
      </div>

      <input id="del-acct-confirm" class="admin-modal-light-field" maxlength="10" placeholder="Type DELETE to confirm" autocomplete="off" style="margin-bottom:var(--space-sm);" />
      <p id="del-acct-error" class="admin-modal-light-error" role="alert" style="display:none;"></p>
      <div class="admin-modal-light-actions">
        <button type="button" data-del-cancel class="btn btn-ghost btn-sm">Cancel</button>
        <button type="button" id="del-acct-go" class="btn btn-sm" style="background:var(--color-danger);color:#fff;border:none;font-weight:var(--font-medium);" disabled>Delete forever</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const errEl = overlay.querySelector('#del-acct-error');
  const blockersEl = overlay.querySelector('#del-acct-blockers');
  const goBtn = overlay.querySelector('#del-acct-go');
  const pwWrap = overlay.querySelector('#del-acct-factor-pw');
  const otpWrap = overlay.querySelector('#del-acct-factor-otp');
  const sendBtn = overlay.querySelector('#del-acct-send');
  const sendState = overlay.querySelector('#del-acct-send-state');
  const codeInput = overlay.querySelector('#del-acct-code');

  let factor = 'password';                       // server authoritative via requiredFactor
  let otpChallengeId = null;
  let lastSentAt = 0;
  let cooldownUntil = 0;
  let cooldownTimer = null;

  const showError = msg => { errEl.textContent = msg || ''; errEl.style.display = msg ? 'block' : 'none'; };
  const setFactor = next => {
    factor = next;
    pwWrap.style.display = next === 'password' ? 'block' : 'none';
    otpWrap.style.display = next === 'otp' ? 'block' : 'none';
  };

  // Guess from cached session (spec §5 nicety); server still decides.
  const sessionUser = (typeof authManager !== 'undefined' && authManager.getCurrentUser)
    ? authManager.getCurrentUser() : null;
  setFactor(sessionUser && sessionUser.googleId ? 'otp' : 'password');

  const close = () => {
    if (cooldownTimer) { clearInterval(cooldownTimer); }
    document.removeEventListener('keydown', esc);
    overlay.remove();
  };
  const esc = ev => { if (ev.key === 'Escape') { close(); } };
  document.addEventListener('keydown', esc);
  overlay.addEventListener('click', e => { if (e.target === overlay) { close(); } });
  overlay.querySelectorAll('[data-del-cancel]').forEach(btn => btn.addEventListener('click', close));

  const renderBlockers = list => {
    blockersEl.style.display = 'block';
    // Server-authored static strings; still escape per AGENTS.md.
    blockersEl.innerHTML = `<strong>Resolve these before deleting:</strong><ul style="margin:0.4rem 0 0.4rem 1.1rem;">${
      list.map(b => `<li>${_pageEsc(b.message)}${
        b.action && b.action.href
          ? ` — <a href="${_pageSafeUrl(b.action.href)}">${_pageEsc(b.action.label)}</a>`
          : ''
      }</li>`).join('')
    }</ul>`;
    goBtn.disabled = true;
    pwWrap.style.display = 'none';
    otpWrap.style.display = 'none';
  };

  const preflight = async () => {
    blockersEl.style.display = 'block';
    blockersEl.textContent = 'Checking whether your account is ready to delete…';
    goBtn.disabled = true;
    pwWrap.style.display = 'none';
    otpWrap.style.display = 'none';
    try {
      const resp = await api.account.deletionBlockers();
      if (resp && Array.isArray(resp.blockers)) {
        if (resp.blockers.length === 0) {
          blockersEl.style.display = 'none';
          setFactor(sessionUser && sessionUser.googleId ? 'otp' : 'password');
          goBtn.disabled = false;
        } else {
          renderBlockers(resp.blockers);
        }
      } else {
        blockersEl.innerHTML =
          'Couldn\'t verify whether your account is ready. ' +
          '<button type="button" class="btn btn-link btn-sm" data-action="retry-blockers">Try again</button>';
        blockersEl.style.display = 'block';
        // Spec: fail-closed with a retry affordance — Cancel remains the
        // only other way out.
      }
    } catch (_e) {
      blockersEl.innerHTML =
        'Couldn\'t verify whether your account is ready. ' +
        '<button type="button" class="btn btn-link btn-sm" data-action="retry-blockers">Try again</button>';
      blockersEl.style.display = 'block';
    }
  };

  blockersEl.addEventListener('click', e => {
    if (e.target.closest('[data-action="retry-blockers"]')) checkBlockers();
  });

  const tickCooldown = () => {
    const left = Math.ceil((cooldownUntil - Date.now()) / 1000);
    if (left > 0) {
      sendBtn.disabled = true;
      sendState.textContent = `Resend in 0:${String(left).padStart(2, '0')}`;
    } else {
      sendBtn.disabled = false;
      sendState.textContent = '';
      if (cooldownTimer) { clearInterval(cooldownTimer); cooldownTimer = null; }
    }
  };

  const startCooldown = seconds => {
    cooldownUntil = Date.now() + Math.max(seconds, 0) * 1000;
    lastSentAt = Date.now();
    if (cooldownTimer) { clearInterval(cooldownTimer); }
    tickCooldown();
    cooldownTimer = setInterval(tickCooldown, 1000);
  };

  sendBtn.addEventListener('click', async () => {
    showError('');
    sendBtn.disabled = true;
    try {
      const resp = await api.account.requestDeletionOtp();
      if (resp && resp.success && resp.challengeId) {
        otpChallengeId = resp.challengeId;
        sendState.textContent = 'Code sent.';
        // Client-enforced60s floor; server 429 retryAfterSeconds overrides upward.
        startCooldown(60);
      } else {
        showError((resp && resp.error) || 'We couldn\'t email your code — try again shortly.');
        sendBtn.disabled = false;
      }
    } catch (err) {
      if (err.status === 429) {
        const retry = (err.data && err.data.retryAfterSeconds) || 60;
        startCooldown(retry);
        showError(`Too many code requests — try again in ${Math.ceil(retry / 60)} min.`);
      } else if (err.data && err.data.requiredFactor === 'password') {
        setFactor('password');
        showError(err.message || 'Use your password to delete this account.');
      } else {
        showError(err.message || 'We couldn\'t email your code — try again shortly.');
        sendBtn.disabled = false;
      }
    }
  });

  goBtn.addEventListener('click', async () => {
    showError('');
    const confirmText = overlay.querySelector('#del-acct-confirm').value.trim();
    if (confirmText !== 'DELETE') {
      showError('Please type DELETE exactly.');
      return;
    }
    const payload = { confirmText };
    if (factor === 'password') {
      payload.password = overlay.querySelector('#del-acct-password').value;
    } else {
      payload.challengeId = otpChallengeId;
      payload.code = codeInput.value.trim();
      if (!payload.challengeId || !payload.code) {
        showError('Request a code and enter the 6 digits.');
        return;
      }
    }

    goBtn.disabled = true;
    try {
      const resp = await api.account.deleteMe(payload);
      if (resp && resp.success) {
        close();
        authManager.clearSession();
        StorageManager.remove(STORAGE_KEYS.STUDENT_VERIFICATION);
        showToast('Your account has been deleted.', 'success');
        window.location.hash = '#/';
        Pages.renderLanding();
        return;
      }
      showError((resp && resp.error) || 'Could not delete your account.');
      goBtn.disabled = false;
    } catch (err) {
      if (err.status === 409 && err.data && Array.isArray(err.data.blockers)) {
        renderBlockers(err.data.blockers);           // server newer than preflight
      } else if (err.data && err.data.requiredFactor) {
        setFactor(err.data.requiredFactor === 'otp' ? 'otp' : 'password');
        showError(err.message || 'Please use the other verification method.');
      } else if (err.status === 400 && err.data && typeof err.data.attemptsLeft === 'number') {
        showError(`${err.message} (${err.data.attemptsLeft} attempt${err.data.attemptsLeft === 1 ? '' : 's'} left)`);
        if (err.data.attemptsLeft <= 0 || /expired|already used/i.test(err.message || '')) {
          cooldownUntil = 0; lastSentAt = 0; tickCooldown();  // force re-send path
          otpChallengeId = null;
        }
      } else if (err.status === 401) {
        showError(err.message || 'Invalid password.');   // session preserved (Task 6)
      } else if (err.status === 429 && err.data && err.data.retryAfterSeconds) {
        showError(`Too many attempts — try again in ${Math.ceil(err.data.retryAfterSeconds / 60)} min.`);
      } else {
        showError(err.message || 'Could not delete your account.');
      }
      goBtn.disabled = false;
    }
  });

  preflight();
  overlay.querySelector('#del-acct-confirm').focus();
}
```

Notes for the implementer:
- Keep the existing `TODO: security review — destructive account action` comment above the method.
- No inline handlers; all `addEventListener`.
- `_pageEsc` / `_pageSafeUrl` are file-level helpers (pages.js:14-25) — do not redefine.
- If `authManager.getCurrentUser` is absent (legacy globals), fall back to password and let `requiredFactor` flip the UI.
- All user-visible error text goes through `showError` (textContent), blocker messages through `_pageEsc`.

- [ ] **Step 2: Verify (frontend gates):** `npm run lint:check && npx prettier --check "js/**/*.js" && npm run build`.

- [ ] **Step 3: Manual smoke (optional but recommended):** `./start-jertscart.sh`, log in as buyer, Settings → Delete account → confirm preflight/clear path renders; as a google-linked user (or by flipping `googleId` in SQLite) confirm OTP UI. Do not complete a real delete on a shared account.

- [ ] **Step 4: Commit** — `feat: delete-account modal — tri-state preflight, password/OTP factor, structured 409/requiredFactor handling`.

---

### Task 8: Buyer Cancel button (blocker escape hatch)

**Files:**
- Modify: `js/pages/pages.js` (`renderOrders` card actions ~3470-3476; delegation)

**Why:** `open_order` blockers link to `#/orders`, but `api.orders.cancel` has zero callers — without this button `placed`/`confirmed` orders would deadlock self-deletion (backend already permits buyer cancel of any status except delivered/cancelled — order.controller.js:642-691).

**Steps:**

- [ ] **Step 1:** In `renderOrders`, replace the card action row (currently inline `onclick="Pages.viewOrderDetails(...)"` / `Pages.downloadReceipt(...)` — the handlers we're touching, per AGENTS.md refactor-on-touch):

```js
<div style="display:flex;gap:0.5rem;">
  <button class="btn btn-outline btn-sm" data-order-action="view" data-order-id="${_pageEsc(order.id)}">View Details</button>
  <button class="btn btn-ghost btn-sm" data-order-action="receipt" data-order-id="${_pageEsc(order.id)}">Receipt</button>
  ${['placed', 'confirmed', 'in-transit'].includes(order.status)
    ? `<button class="btn btn-ghost btn-sm" data-order-action="cancel" data-order-id="${_pageEsc(order.id)}" style="color:var(--color-danger,#ef4444);">Cancel</button>`
    : ''}
</div>
```

- [ ] **Step 2:** At the end of `renderOrders` (after the `innerHTML` assignment), install delegation once:

```js
if (!Pages._ordersActionsBound) {
  document.getElementById('main-content').addEventListener('click', async e => {
    const btn = e.target.closest('[data-order-action]');
    if (!btn) { return; }
    const id = btn.dataset.orderId || '';
    const action = btn.dataset.orderAction;
    if (action === 'view') {
      Pages.viewOrderDetails(id);
    } else if (action === 'receipt') {
      Pages.downloadReceipt(id);
    } else if (action === 'cancel') {
      if (!confirm('Cancel this order?')) { return; }
      btn.disabled = true;
      try {
        await api.orders.cancel(id);
        showToast('Order cancelled', 'success');
        await Pages.renderOrders();
      } catch (err) {
        showToast(err.message || 'Could not cancel this order.', 'error');
        btn.disabled = false;
      }
    }
  });
  Pages._ordersActionsBound = true;
}
```

(`main-content` persists across renders; the flag prevents duplicate listeners on re-navigation.)

- [ ] **Step 3: Verify (frontend gates):** `npm run lint:check && npx prettier --check "js/**/*.js" && npm run build`.

- [ ] **Step 4: Commit** — `feat: buyer cancel button on orders — escape hatch for open_order deletion blocker`.

---

### Task 9: Admin delete UI + `adminUsersManager.deleteUser(reason)`

**Files:**
- Modify: `js/pages/pages.js` (Actions column ~6354-6367, dispatcher ~6417-6421, new `adminDeleteUser`)
- Modify: `js/admin/admin-users.js` (`deleteUser`)

**Steps:**

- [ ] **Step 1: Actions column** — replace the `render` fn of the Actions column (pages.js:6356-6366). Keep Ban/Unban behavior byte-identical; add Delete only for non-admin, non-moderator, non-self rows (mirrors backend 403 guards):

```js
render: u => {
  const viewerId = (typeof adminAuthManager !== 'undefined' && adminAuthManager.adminUser)
    ? adminAuthManager.adminUser.id : null;
  if (u.role === 'admin' || u.role === 'moderator' || u.id === viewerId) {
    return '<span class="adm-text-muted">—</span>';
  }
  const suspended =
    u.isSuspended === true || u.status === 'suspended' || u.status === 'banned';
  const deleteBtn =
    `<button type="button" class="adm-btn adm-btn--sm adm-btn--danger" data-user-action="delete" data-user-id="${_pageEsc(u.id)}" style="margin-left:0.35rem;">Delete</button>`;
  if (suspended) {
    return `<button type="button" class="adm-btn adm-btn--sm" data-user-action="unban" data-user-id="${_pageEsc(u.id)}">Unban</button>${deleteBtn}`;
  }
  return `<button type="button" class="adm-btn adm-btn--sm adm-btn--danger" data-user-action="ban" data-user-id="${_pageEsc(u.id)}">Ban</button>${deleteBtn}`;
},
```

CAUTION: the current code shows actions for moderators (Ban only hidden for `role === 'admin'`). Spec §4 guards make moderator targets undeletable, so the combined hide above also removes Ban from moderator rows — that matches the backend (moderator-target bans403 too) and the "—" treatment. If a moderator row previously showed Unban (for a banned moderator), that capability is lost — verify admin.controller ban guards confirm moderators are protected targets (spec says mirrors ban guards); if Unban-for-moderator must survive, split the conditions: hide only the DELETE button for moderator rows, keep Ban/Unban exactly as today. **Default to the split** (less behavior change):

```js
render: u => {
  const viewerId = (typeof adminAuthManager !== 'undefined' && adminAuthManager.adminUser)
    ? adminAuthManager.adminUser.id : null;
  const eligibleToDelete = u.role !== 'admin' && u.role !== 'moderator' && u.id !== viewerId;
  const deleteBtn = eligibleToDelete
    ? `<button type="button" class="adm-btn adm-btn--sm adm-btn--danger" data-user-action="delete" data-user-id="${_pageEsc(u.id)}" style="margin-left:0.35rem;">Delete</button>`
    : '';
  if (u.role === 'admin') {
    return '<span class="adm-text-muted">—</span>';
  }
  const suspended =
    u.isSuspended === true || u.status === 'suspended' || u.status === 'banned';
  if (suspended) {
    return `<button type="button" class="adm-btn adm-btn--sm" data-user-action="unban" data-user-id="${_pageEsc(u.id)}">Unban</button>${deleteBtn}`;
  }
  return `<button type="button" class="adm-btn adm-btn--sm adm-btn--danger" data-user-action="ban" data-user-id="${_pageEsc(u.id)}">Ban</button>${deleteBtn}`;
},
```

Use the SPLIT version.

- [ ] **Step 2: Dispatcher** — extend the delegated branch (pages.js:6417-6421):

```js
if (action === 'ban') {
  Pages.adminBanUser(userId);
} else if (action === 'unban') {
  Pages.adminUnbanUser(userId);
} else if (action === 'delete') {
  Pages.adminDeleteUser(userId);
}
```

- [ ] **Step 3: `Pages.adminDeleteUser`** — add next to `adminBanUser` (~line 7451), payout-reject modal pattern:

```js
/**
 * Permanently delete (anonymize) a user — spec 2026-09-22 §4.
 * Preflight blockers render as WARNINGS only (admin delete bypasses the
 * gate); the reason (min 5) is required and kept in the audit trail.
 */
static adminDeleteUser(userId) {
  if (!_requireAdmin()) { return; }

  const overlay = document.createElement('div');
  overlay.id = 'user-delete-overlay';
  overlay.innerHTML = AdminUI.modalHtml({
    id: 'user-delete-overlay',
    title: 'Delete this account permanently?',
    sub: 'Personal data is anonymized immediately and cannot be recovered. Transaction records stay linked to the anonymized profile for accounting. Ban is the reversible option — use it instead when unsure.',
    body: `
      <div id="user-delete-warnings" style="display:none;margin-bottom:0.75rem;padding:0.6rem;border-radius:6px;background:rgba(245,158,11,0.12);color:var(--text-primary,#111);font-size:0.875rem;"></div>
      <textarea id="user-delete-reason" class="adm-modal-field" maxlength="300" rows="3" placeholder="Reason for deletion (min 5 characters) — kept in the audit trail"></textarea>
      <p id="user-delete-error" class="adm-modal-error" role="alert"></p>`,
    footer:
      '<button type="button" data-adm-modal-cancel data-adm-modal-close class="adm-btn">Cancel</button>' +
      '<button type="button" data-adm-modal-action="confirm" class="adm-btn adm-btn--danger" disabled>Delete forever</button>',
  });
  document.body.appendChild(overlay);

  const errorEl = overlay.querySelector('#user-delete-error');
  const warnEl = overlay.querySelector('#user-delete-warnings');
  const reasonEl = overlay.querySelector('#user-delete-reason');
  const confirmBtn = overlay.querySelector('[data-adm-modal-action="confirm"]');

  const validate = () => {
    confirmBtn.disabled = reasonEl.value.trim().length < 5;
  };
  reasonEl.addEventListener('input', validate);

  // Advisory preflight — failures never block the admin escape valve.
  api.users.deletionBlockers(userId).then(resp => {
    if (resp && Array.isArray(resp.blockers) && resp.blockers.length) {
      warnEl.style.display = 'block';
      warnEl.textContent =
        `Warnings (admin delete proceeds anyway): ${resp.blockers.map(b => b.message).join(' · ')}`;
    }
  }).catch(() => {
    warnEl.style.display = 'block';
    warnEl.textContent = "Couldn't check obligations — admin delete proceeds anyway.";
  });

  AdminUI.wireModal(overlay, {
    onClose: () => overlay.remove(),
    onAction: async key => {
      if (key !== 'confirm') { return; }
      const reason = reasonEl.value.trim();
      if (reason.length < 5) {
        errorEl.textContent = 'Please enter a reason of at least 5 characters.';
        return;
      }
      confirmBtn.disabled = true;
      try {
        const result = await adminUsersManager.deleteUser(userId, reason);
        if (result && result.success) {
          showToast('Account deleted and anonymized', 'success');
          overlay.remove();
          await Pages.renderAdminUsers();
        } else {
          errorEl.textContent = (result && result.error) || 'Failed to delete this account.';
          confirmBtn.disabled = false;
        }
      } catch (err) {
        errorEl.textContent = err.message || 'Failed to delete this account.';
        confirmBtn.disabled = false;
      }
    },
  });

  validate();
  reasonEl.focus();
}
```

- [ ] **Step 4: `admin-users.js` `deleteUser`** — replace lines 262-297 (server-first; today it splices locally and swallows backend errors, which would hide the400-reason/403-guard failures):

```js
/**
 * Delete user (spec 2026-09-22): server-first — the backend validates the
 * reason and runs the shared anonymize; local cache only updates on success.
 * @param {string} userId
 * @param {string} reason - min 5 chars, stored in the audit trail
 * @returns {Promise<{success: boolean, error?: string, message?: string}>}
 */
async deleteUser(userId, reason) {
  if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
    return { success: false, error: 'A reason of at least 5 characters is required.' };
  }
  if (typeof api === 'undefined' || !api.users || !api.users.delete || api.isStaticDeploy) {
    return { success: false, error: 'Backend unavailable — deletion needs a live server.' };
  }
  try {
    const resp = await api.users.delete(userId, reason.trim());
    if (!resp || resp.success === false) {
      return { success: false, error: (resp && resp.error) || 'Delete failed.' };
    }
  } catch (err) {
    return { success: false, error: err.message || 'Delete failed.' };
  }

  const index = this.users.findIndex(u => u.id === userId);
  if (index !== -1) {
    this.users.splice(index, 1);
    this._persistUsersList();
  }
  // Audit locally without PII: id + reason only (email lives on the
  // server-side activity row, redacted).
  adminAuthManager.logActivity('User deleted', { userId, reason: reason.trim() });
  return { success: true, message: 'User deleted' };
}
```

- [ ] **Step 5: Verify (frontend gates):** `npm run lint:check && npx prettier --check "js/**/*.js" && npm run build`.

- [ ] **Step 6: Commit** — `feat: admin users Delete action — reason modal with obligation warnings, server-first deleteUser`.

---

### Task 10: Full verification + final backend/frontend commits

**Steps:**

- [ ] **Step 1: Backend full gate** — `cd backend && npm run lint:check && npm test`. Expect: jest all suites green (229+ baseline plus new files), lint 0 errors (warnings may grow slightly with new files — keep them ≤ baseline+new-file noise; no new errors).

- [ ] **Step 2: Frontend full gate** — repo root: `npm run lint:check && npx prettier --check "js/**/*.js" && npm run build`. All three must pass (build ≈1s, custom static-app-build plugin must still emit `dist/js/` + `/js/app-init.js?v=7`).

- [ ] **Step 3: E2E** — `npx playwright test` (webServer reuses running :5000/:8000). Expect the19-test suite green. NO new deletion e2e (spec amendment). If a lone spec flakes from machine load, re-run that file once; systemic failure → investigate before claiming done.

- [ ] **Step 4: Spec-traceability self-review** — walk spec's Testing section and confirm each bullet maps to an executed assertion (blockers×3 + failed-payment, atomicity, purpose confusion ×2 directions,3-attempt lock,5-min expiry, single-use — expiry/single-use inherit mfa.test.js coverage via shared mfa.js (purpose-only delta), raw code in email html, devCode-absent, factors both directions + requiredFactor, scrub completeness, receipt failure, admin guards+bypass+scrub, MFA-email fix, Wave1 regression).

- [ ] **Step 5: Commit any gate-fix fallout** (lint nits, prettier wraps) — `chore: lint/prettier pass for deletion hardening`.

- [ ] **Step 6: Report** — summarize commits (hashes), gate outputs (paste actual pass counts), deviations actually taken vs this plan, and remind: human security review required for `auth.js`-adjacent, `payment/checkout` untouched but `user.controller`/`admin` UI changed (AGENTS.md RCI + review flags already in code comments). Developer pushes.

---

## Out of scope (tracked, not in this change set)

- Playwright `timeout: 60000` (e2e cold-boot flake hardening) — separate commit.
- `admin_user_deleted` activity action (CHECK rebuild across5 schema defs in database.js).
- Grace-period deletion with undo (Approach 2).
- Self-serve payout-request UI (would upgrade balance blockers from Contact-support to Request-payout).
- Privacy-policy copy updates (current scrub list matches §6-§7 promises).
