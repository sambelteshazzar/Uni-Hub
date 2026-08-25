# Account Deletion & Data Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Self-service account anonymization and single-JSON data export per `docs/superpowers/specs/2026-08-23-account-delete-export-design.md`.

**Architecture:** Two new routes in `backend/routes/user.routes.js` registered BEFORE the parametric `/:id` routes (otherwise `GET /me/export` is captured by `GET /:id`). Deletion anonymizes the users row in one UPDATE — financial tables keep referencing the anonymous shell; `isActive: 0` kills all existing JWTs via the existing check at auth.middleware.js:52. Export streams a JSON attachment assembled from 12 entity queries.

**Tech Stack:** Express, bcryptjs (already used by auth controller), jest/supertest, vanilla JS SPA.

## Global Constraints

- NO new npm dependencies.
- Password hash NEVER appears in export output or logs.
- Deletion requires typed `confirmText === 'DELETE'`; password also required UNLESS account is Google-only (`googleId` set). Wrong password → 401 generic message.
- Anonymized values must satisfy existing UNIQUE constraints on email/phone (use id-derived synthetic values per spec).
- Export includes every entity key even when empty.
- Backend gate: `cd backend && npm run lint:check && npx jest` — lint stays at 84-problem baseline; all suites pass. Frontend gates: eslint file baseline comparison + `npm run build`.
- DB wrapper: `db('t').find(where, {sort})`, `.findById(id)`, `.updateById(id, patch)`, `.rawRun/rawGet/rawAll(sql, params)`; tests use `getDb().prepare(...)`.
- Test-role quirk: registration honors role 'admin' only in NODE_ENV=test; `acceptedTerms: true` already flows via setup.js generateTestUser().
- Commit after every task.

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `backend/controllers/user.controller.js` | Modify | `exportMyData`, `deleteMyAccount` |
| `backend/routes/user.routes.js` | Modify | Two routes ABOVE the `/:id` block |
| `backend/tests/accountLifecycle.test.js` | Create | All backend behaviors |
| `js/utils/api.js` | Modify | `account.exportData()`, `account.deleteMe()` |
| `js/pages/pages.js` | Modify | Settings tab "Your data" card + delegated handlers |

Entity/table map for export queries (verified against database.js): orders(103),
order_items(139), products→seller column(76), reviews(161), messages sender OR
receiver(220), wishlists plural(274), notifications(283), ledger_entries(379),
payouts(391), student_verifications(userId), consent_records(userId).

---

### Task 1: Backend endpoints + tests

**Files:**
- Modify: `backend/controllers/user.controller.js`
- Modify: `backend/routes/user.routes.js`
- Create: `backend/tests/accountLifecycle.test.js`

**Interfaces:**
- Produces:
  - `GET /api/users/me/export` → JSON attachment `{ exportedAt, policyVersion, profile, orders, orderItems, listings, reviews, messages, ledgerEntries, payouts, verifications, consents, notifications, wishlist }`
  - `DELETE /api/users/me` body `{ confirmText, password? }` → anonymizes + deactivates

- [ ] **Step 1: Write failing tests** — create `backend/tests/accountLifecycle.test.js`:

```js
/**
 * Account lifecycle tests (spec 2026-08-23): self-service data export and
 * immediate anonymizing deletion.
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

const app = createTestApp();

async function registerUser (overrides = {}, prefix = 'alc') {
  const suffix = Date.now() + Math.floor(Math.random() * 100000);
  const user = {
    fullName: `Lifecycle User ${suffix}`,
    email: `${prefix}_${suffix}@test.com`,
    phone: `+23324${String(1000000 + Math.floor(Math.random() * 8999999))}`,
    password: 'LifecyclePass1!',
    university: 'University of Ghana',
    level: '200',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(user);
  return { token: res.body.data.token, id: res.body.data.user._id, password: user.password, email: user.email };
}

describe('data export', () => {
  test('returns every entity key, excludes password hash', async () => {
    const u = await registerUser();
    const res = await request(app)
      .get('/api/users/me/export')
      .set('Authorization', `Bearer ${u.token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');
    const body = res.body;
    ['exportedAt', 'policyVersion', 'profile', 'orders', 'orderItems', 'listings',
      'reviews', 'messages', 'ledgerEntries', 'payouts', 'verifications',
      'consents', 'notifications', 'wishlist'].forEach(k => {
      expect(body).toHaveProperty(k);
    });
    expect(JSON.stringify(body)).not.toMatch(/LifecyclePass1!/);
    // Account is live at export time: profile carries the REAL email.
    expect(body.profile.email).toBe(u.email || undefined);
    expect(body.profile.password).toBeUndefined();
  });

  test('requires authentication', async () => {
    const res = await request(app).get('/api/users/me/export');
    expect(res.status).toBe(401);
  });
});

describe('account deletion', () => {
  test('rejects missing confirmText without changing anything', async () => {
    const u = await registerUser();
    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({});
    expect(res.status).toBe(400);

    const { getDb } = require('../config/database');
    const row = getDb().prepare('SELECT fullName, isActive FROM users WHERE id = ?').get(u.id);
    expect(row.isActive).toBe(1);
    expect(row.fullName).not.toBe('Deleted User');
  });

  test('wrong password -> 401, unchanged', async () => {
    const u = await registerUser();
    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', password: 'WrongPass1!' });
    expect(res.status).toBe(401);
  });

  test('happy path anonymizes, deactivates, kills token, keeps money rows', async () => {
    const u = await registerUser();

    // Seed one order so we can prove financial rows survive.
    const productRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${u.token}`)
      .send(global.testUtils.generateTestProduct(u.id));
    expect(productRes.status).toBeLessThan(500);

    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', password: u.password });
    expect(res.status).toBe(200);

    const { getDb } = require('../config/database');
    const dbh = getDb();
    const row = dbh.prepare(
      'SELECT fullName, email, phone, googleId, isActive FROM users WHERE id = ?'
    ).get(u.id);
    expect(row.fullName).toBe('Deleted User');
    expect(row.email).toBe(`deleted_${u.id}@anonymized.invalid`);
    expect(row.googleId).toBeNull();
    expect(row.isActive).toBe(0);

    // Old token now rejected by an authenticated endpoint.
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${u.token}`);
    expect([401, 403]).toContain(me.status);

    // Product row still references the shell seller id.
    const prod = dbh.prepare('SELECT seller FROM products WHERE seller = ?').get(u.id);
    expect(prod).toBeTruthy();
  });

  test('google-only account deletes without password', async () => {
    const u = await registerUser();
    const { getDb } = require('../config/database');
    getDb().prepare('UPDATE users SET googleId = ? WHERE id = ?')
      .run(`g-${Date.now()}`, u.id);

    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE' });
    expect(res.status).toBe(200);
  });
});
```

If `GET /api/auth/me` responds differently in this codebase, inspect auth.routes/auth.controller first and assert against its actual inactive-account behavior (401 expected).

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && npx jest tests/accountLifecycle.test.js`
Expected: FAIL — 404 on both routes.

- [ ] **Step 3: Implement controllers**

In `backend/controllers/user.controller.js`, add imports at top:

```js
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { POLICY_VERSION } = require('../config/policies');
const logActivity = require('../utils/logActivity');
```

(Mirror logActivity's exact call shape from auth.controller.js.)

Append:

```js
/**
 * @desc Export every entity owned by the requesting user as a JSON download
 * @route GET /api/users/me/export
 * @access private
 */
exports.exportMyData = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const profile = await db('users').findById(userId);
  if (!profile) {
    throw new ApiError(404, 'Account not found');
  }
  const safeProfile = { ...profile };
  delete safeProfile.password; // never export credential material

  const [orders, orderItems, listings, reviews, sent, received, ledgerEntries,
    payouts, verifications, consents, notifications, wishlist] = await Promise.all([
    db('orders').find({ userId }),
    db('order_items').rawAll('SELECT oi.* FROM order_items oi JOIN orders o ON o.id = oi.orderId WHERE o.userId = ?', [userId]),
    db('products').find({ seller: userId }),
    db('reviews').find({ userId }),
    db('messages').find({ sender: userId }),
    db('messages').find({ receiver: userId }),
    db('ledger_entries').find({ sellerId: userId }),
    db('payouts').find({ sellerId: userId }),
    db('student_verifications').find({ userId }),
    db('consent_records').find({ userId }),
    db('notifications').find({ userId }),
    db('wishlists').find({ userId }),
  ]);

  const messages = [...sent, ...received];

  res.set({
    'Content-Type': 'application/json',
    'Content-Disposition': 'attachment; filename="unihub-my-data.json"',
    'Cache-Control': 'no-store',
  });
  res.json({
    exportedAt: new Date().toISOString(),
    policyVersion: POLICY_VERSION,
    profile: safeProfile,
    orders,
    orderItems,
    listings,
    reviews,
    messages,
    ledgerEntries,
    payouts,
    verifications,
    consents,
    notifications,
    wishlist,
  });
});

/**
 * @desc Self-service account deletion = immediate PII anonymization (Act 843).
 *   Financial rows keep referencing the anonymous shell; isActive=0 kills
 *   all sessions via the protect middleware's inactive-user check.
 * @route DELETE /api/users/me
 * @access private
 */
exports.deleteMyAccount = asyncHandler(async (req, res) => {
  const user = await db('users').findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'Account not found');
  }

  const { confirmText, password } = req.body;
  if (confirmText !== 'DELETE') {
    throw new ApiError(400, 'Type DELETE to confirm account deletion');
  }

  const isGoogleOnly = !!user.googleId;
  if (!isGoogleOnly) {
    if (!password || typeof password !== 'string') {
      throw new ApiError(400, 'Password confirmation required');
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      throw new ApiError(401, 'Invalid password');
    }
  }

  await db('users').updateById(user.id, {
    fullName: 'Deleted User',
    email: `deleted_${user.id}@anonymized.invalid`,
    phone: `deleted-${String(user.id).slice(0, 8)}`,
    avatar: '',
    bio: null,
    googleId: null,
    password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
    isActive: 0,
    banReason: 'account deleted by user',
  });

  await logActivity('account_deleted',
    { id: user.id, email: '[redacted]' },
    { method: isGoogleOnly ? 'google' : 'password' },
    'warning', req);

  res.json({ success: true, message: 'Your account has been deleted and your personal data removed.' });
});
```

CAVEAT for the implementer: verify each table/column name against database.js before finalizing (e.g., reviews author column might be `reviewer` not `userId`; wishlist table is `wishlists` but its FK column may differ; notifications may key on `userId`). Adjust ONLY the where-clauses to reality; keep the response keys EXACTLY as specified.

- [ ] **Step 4: Implement routes**

In `backend/routes/user.routes.js`, insert these TWO lines immediately after `router.get('/', ...)` and BEFORE `router.get('/:id', ...)`:

```js
const { getUsers, getUser, updateUser, deleteUser, exportMyData, deleteMyAccount } = require('../controllers/user.controller');

router.get('/me/export', protect, asyncHandler(exportMyData));
router.delete('/me', protect, asyncHandler(deleteMyAccount));
```

Add `asyncHandler` to the errorHandler import. ORDERING IS LOAD-BEARING: `/me/*` must precede `/:id`.

- [ ] **Step 5: Run tests to verify pass**

Run: `cd backend && npx jest tests/accountLifecycle.test.js`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/controllers/user.controller.js backend/routes/user.routes.js backend/tests/accountLifecycle.test.js
git commit -m "Add self-service data export and anonymizing account deletion"
```

### Task 2: Frontend — api methods + Settings "Your data" card

**Files:**
- Modify: `js/utils/api.js`, `js/pages/pages.js`

**Interfaces:**
- Consumes: Task 1 endpoints.
- Produces: `api.account.exportData()`, `api.account.deleteMe(confirmText, password)`; Settings tab card with working Download + Delete flows.

- [ ] **Step 1: api.js — new account block**

Add near the other API groups (e.g., after `users = {...}`):

```js
  /**
   * Self-service account lifecycle (spec 2026-08-23).
   */
  account = {
    exportData: () => this.request('/users/me/export', { method: 'GET' }),
    deleteMe: (confirmText, password) =>
      this.delete('/users/me', { confirmText, password }),
  };
```

CHECK FIRST: the existing `this.delete(url)` signature takes no body (js/utils/api.js ~line 287). Extend it to accept an optional body: `async delete (url, body) { return this.request(url, { method: 'DELETE', ...(body ? { body: JSON.stringify(body) } : {}) }); }` — existing zero-arg callers are unaffected.

For exportData: `request()` returns parsed JSON, which is all we need since we re-serialize client-side for download.

- [ ] **Step 2: Settings tab "Your data" card**

In the settings panel (`dv-panel-settings`, pages.js ~3556), after the Role form-group and BEFORE the logout button container, insert:

```html
                <div class="dv-form-group" style="margin-top:1.5rem;">
                  <label class="dv-form-label">Your data</label>
                  <div style="display:flex;flex-direction:column;gap:0.5rem;">
                    <button type="button" class="dv-btn dv-btn-outline" data-action="export-my-data">⬇ Download my data</button>
                    <button type="button" class="dv-btn dv-btn-outline" data-action="show-delete-modal" style="color:#ef4444;border-color:rgba(239,68,68,0.5);">🗑 Delete account…</button>
                  </div>
                </div>
```

Wire by delegation at the end of the function that renders this panel (find where the panel HTML is assigned; attach listeners to the panel element right after innerHTML assignment):

```js
    const panel = document.getElementById('dv-panel-settings');
    if (panel) {
      panel.addEventListener('click', async e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) { return; }
        if (btn.dataset.action === 'export-my-data') {
          btn.disabled = true;
          try {
            const resp = await api.account.exportData();
            if (!resp || !resp.exportedAt) {
              showToast('Could not export your data right now.', 'error');
              return;
            }
            const blob = new Blob([JSON.stringify(resp, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'unihub-my-data.json';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          } catch (_err) {
            showToast('Export failed. Please try again.', 'error');
          } finally {
            btn.disabled = false;
          }
        }
      });
      const deleteBtn = panel.querySelector('[data-action="show-delete-modal"]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => Pages._openDeleteAccountModal());
      }
    }
```

- [ ] **Step 3: Delete modal**

New Pages static method:

```js
  static _openDeleteAccountModal () {
    const overlay = document.createElement('div');
    overlay.id = 'delete-account-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:2000;padding:2rem;';
    overlay.innerHTML = `
      <div role="dialog" aria-modal="true" aria-labelledby="del-acct-title" style="background:#111827;border:1px solid rgba(239,68,68,0.4);border-radius:0.75rem;max-width:420px;width:100%;padding:1.5rem;">
        <h3 id="del-acct-title" style="margin:0 0 0.5rem;color:#f9fafb;">Delete your account?</h3>
        <p style="margin:0 0 1rem;color:#9ca3af;font-size:0.85rem;">This permanently removes your personal information. Your past orders remain as anonymous records for accounting. This cannot be undone.</p>
        <input id="del-acct-confirm" maxlength="10" placeholder="Type DELETE to confirm" autocomplete="off"
          style="width:100%;background:#1f2937;border:1px solid rgba(255,255,255,0.15);border-radius:0.5rem;color:#e5e7eb;padding:0.6rem;font-size:0.9rem;margin-bottom:0.6rem;" />
        <input id="del-acct-password" type="password" placeholder="Current password" autocomplete="current-password"
          style="width:100%;background:#1f2937;border:1px solid rgba(255,255,255,0.15);border-radius:0.5rem;color:#e5e7eb;padding:0.6rem;font-size:0.9rem;" />
        <p id="del-acct-error" role="alert" style="display:none;color:#f87171;font-size:0.78rem;margin:0.5rem 0 0;"></p>
        <div style="display:flex;justify-content:flex-end;gap:0.5rem;margin-top:1rem;">
          <button type="button" data-del-cancel class="btn btn-ghost btn-sm">Cancel</button>
          <button type="button" id="del-acct-go" class="btn btn-sm" style="background:#dc2626;color:#fff;border:none;">Delete forever</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => {
      document.removeEventListener('keydown', esc);
      overlay.remove();
    };
    const esc = ev => {
      if (ev.key === 'Escape') {close();}
    };
    document.addEventListener('keydown', esc);
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {close();}
    });
    overlay.querySelector('[data-del-cancel]').addEventListener('click', close);

    overlay.querySelector('#del-acct-go').addEventListener('click', async () => {
      const confirmText = overlay.querySelector('#del-acct-confirm').value.trim();
      const password = overlay.querySelector('#del-acct-password').value;
      const errEl = overlay.querySelector('#del-acct-error');
      if (confirmText !== 'DELETE') {
        errEl.textContent = 'Please type DELETE exactly.';
        errEl.style.display = 'block';
        return;
      }
      const goBtn = overlay.querySelector('#del-acct-go');
      goBtn.disabled = true;
      try {
        // Google-only accounts may leave the password blank; backend decides.
        const resp = await api.account.deleteMe(confirmText, password);
        if (resp.success) {
          close();
          authManager.clearSession();
          StorageManager.remove(STORAGE_KEYS.STUDENT_VERIFICATION);
          showToast('Your account has been deleted.', 'success');
          window.location.hash = '#/';
          Pages.renderLanding();
        } else {
          errEl.textContent = resp.error || 'Could not delete your account.';
          errEl.style.display = 'block';
          goBtn.disabled = false;
        }
      } catch (err2) {
        errEl.textContent = err2.message || 'Could not delete your account.';
        errEl.style.display = 'block';
        goBtn.disabled = false;
      }
    });

    overlay.querySelector('#del-acct-confirm').focus();
  }
```

Verify helper availability in pages.js scope before finalizing: `authManager` and `STORAGE_KEYS` are used elsewhere in this file (they are globals via js/setup/globals.js); `Pages.renderLanding()` exists.

- [ ] **Step 4: Verify frontend gates**

Run: `npx eslint js/utils/api.js js/pages/pages.js && npm run build`
Expected: no NEW errors vs per-file baselines (record them BEFORE editing); build succeeds.

- [ ] **Step 5: Commit**

```bash
git add js/utils/api.js js/pages/pages.js
git commit -m "Add settings data-export download and anonymizing delete-account flow"
```

---

### Task 3: Full verification chain

**Files:** none created.

- [ ] **Step 1: Backend gate** — `cd backend && npm run lint:check && npx jest`
  Expected: lint at 84-problem baseline; every suite passes (accountLifecycle 6 tests included).

- [ ] **Step 2: Frontend + e2e gates** — from repo root:
  `npm run lint:check && npm run build && npx playwright test e2e/admin.spec.js`
  Expected: root lint at its baseline (1427±1), build succeeds, admin specs green.

- [ ] **Step 3: Commit any straggler fixes** (only if steps above required edits):
```bash
git add -A && git commit -m "Fix issues found during account-lifecycle verification"
```

---

## Manual acceptance checklist

1. Local services running. Log in as sarah@student.upsa.edu.gh / Student123!
2. Dashboard → Settings → "Download my data" → JSON file downloads, opens cleanly, contains profile/orders/consents keys, NO password hash anywhere.
3. "Delete account…" → type DELETE + password → success toast, landed on home, session cleared. Logging back in with old credentials fails.
4. Admin panel → Users: user now shows "Deleted User"; their orders/ledger entries still render with the anonymous shell.

