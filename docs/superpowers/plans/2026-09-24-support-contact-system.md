# Support Contact System (Tickets) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the support contact/ticket system per `docs/superpowers/specs/2026-09-24-support-contact-design.md` (committed `44972820`): logged-in users open and reply to tickets from a real `#/contact` portal; admins get a Support sidebar page with an open-count badge, a server-paginated queue, and a thread detail view whose replies are stored and emailed to the customer; account deletion scrubs tickets; both admin mutations are audit-logged.

**Architecture:** Two new SQLite tables (`support_tickets`, `support_replies`) are added to `SCHEMA_SQL` plus a defensive `connectLocal` re-create guard (newsletter pattern) and an `activity_logs` CHECK-enum extension (`support_reply`, `support_status_change`) with both rebuild conditions (Turso + local). One feature controller `backend/controllers/support.controller.js` owns BOTH surfaces (coupon.controller precedent): user handlers consumed by new `backend/routes/support.routes.js` mounted at `/api/support/tickets` (routes are `/`, `/:id`, `/:id/replies` — the mount MUST include the `tickets` segment; behind `protect` + per-route rate limiters), admin handlers wired into the existing `backend/routes/admin.routes.js` (router-level `protect` + `auditMutation()` already apply there). `deriveAction` in `audit.middleware.js` gains a support branch at the TOP of the function (its generic trailing-segment normalization would otherwise mangle `/:id/replies`). Frontend: `api.support` + `api.admin` helpers in `js/utils/api.js` with a `/support/tickets` GET-cache exclusion; `renderContact` in `static-pages.js` rewritten into the real portal (signed-out panel / signed-in form + thread + reply via delegation); `js/admin/admin-support.js` manager (self-exposing, no localStorage persistence — ticket bodies are PII); `pages.js` gains the sidebar badge item + `Pages.refreshSupportBadge()` hook at the end of `AdminUI.wireSidebar`, `/admin/support` and `/admin/support/:id` routes, and the two admin renderers modeled on `renderAdminPayouts`. E2E: one hermetic user spec, one hermetic admin spec (`injectAdminSession` first, then mocks).

**Tech Stack:** Express + better-sqlite3/libSQL via `db.batchWrite`/`rawAll`/`rawGet`, `express-rate-limit@7.5.1` (`MemoryStore`), `jest`/`supertest`, `nodemailer`/Brevo via existing `backend/utils/emailService.sendEmail`, Playwright, vanilla JS SPA (`AdminUI.*`, `_pageEsc`, `SecurityUtils.escapeHtml`, `showToast`).

## Global Constraints

- NO new npm dependencies.
- ALL backend calls go through `js/utils/api.js` (the `api` singleton) — no raw `fetch` to backend routes.
- All user-derived strings into `innerHTML` go through `_pageEsc` (pages.js) or `SecurityUtils.escapeHtml` (static-pages). Spec §3 governs: escape AT RENDER TIME even though `sanitizeXss` already escaped at ingress (double-escaped display of a literal `<b>` is accepted; the decode+`textContent` approach is a flagged follow-up).
- No new inline handlers. FAQ's `onclick="Pages.navigate('/messages')"` button is replaced with a plain `<a href="#/contact">` (zero JS — the router's hash-click interceptor handles it). Delegation everywhere else (`click`/`submit` on stable parents), with `// TODO: security review / CSP` comments where touched.
- Logged-in users only; tickets are private. `404` (not 403) for missing AND not-owned tickets so ids cannot be probed. `validateObjectId` (400) on every `:id` route.
- Validation is server-authoritative: category enum `order|payment|verification|product|account|other`; subject trim/non-empty/≤200; body/message trim/non-empty/≤5000; status enum `open|pending|resolved`.
- Rate limits (co-located in `support.routes.js`, keyed `userId:ip`): ticket create 5/hour, replies 20/hour. 429 body includes `retryAfterSeconds`. Explicit `MemoryStore` exported on the router so tests can `resetAll()`.
- Email is best-effort: an unconfigured/failed transport never fails an API call (try/catch; admin reply response carries `emailSent: boolean`). Email subjects get CR/LF stripped (`escapeHtml` does not touch newlines → header-injection guard).
- Email is sent ONLY to the ticket owner's address. Ticket bodies/subjects are never logged to console/Sentry.
- ESLint backend+frontend must stay at 0 errors; prettier clean (`npx prettier --check "js/**/*.js" "css/**/*.css"`); `npm run build` must succeed before any frontend task is called done.
- Backend gates per task: `cd backend && npx jest tests/<file>.test.js && npm run lint:check`. Full `npm test` before the final backend commit (baseline: 30 suites / 281 tests → expect 34 suites after +4 files).
- Frontend gates per task (repo root): `npm run lint:check && npx prettier --check "js/**/*.js" "css/**/*.css" && npm run build`. If prettier flags a file this plan authored, run `npm run format` then re-run all three.
- E2E: `npx playwright test --workers=1` (webServer reuses running :5000/:8000; the backend must run `NODE_ENV=test` for `injectAdminSession`'s devCode).
- Final cache triple bump (Task 10): `js/app-init.js` `MODULE_VERSION '37' → '38'`, `vite.config.js` `APP_INIT_VERSION '38' → '39'`, `index.html:318` `?v=38 → ?v=39`.
- Register returns **201** with `data.user._id` + `data.token` — tests must not assert 200. `protect` reloads the user from DB on every request, so `updateById(id, { role: ... })` after registration applies to the existing token (the JWT carries only `{ id }`).
- Commit after every task (repo style: `fix:` / `feat:` / `docs:` / `test:` / `chore:` — inspect `git log --oneline` first). Do NOT push — the developer pushes.

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `backend/config/database.js` | Modify | `support_tickets`/`support_replies` + 3 indexes in `SCHEMA_SQL`; `connectLocal` re-create guard; `'support_reply'`,`'support_status_change'` in `ACTIVITY_LOGS_ACTIONS_SQL` + both rebuild conditions (Turso ~:1004, local ~:1351) |
| `backend/tests/setup.js` | Modify | afterEach cleanup adds `support_replies`, `support_tickets` (before `users`) |
| `backend/tests/supportSchema.test.js` | Create | Tables/indexes exist, CHECK constraints, cascade deletes, audit enum accepts/rejects |
| `backend/utils/accountDeletion.js` | Modify | Two explicit DELETE statements (replies-by-subquery, then tickets) in the atomic `statements` array |
| `backend/tests/supportDeletion.test.js` | Create | Register → seed ticket+2 replies → `DELETE /users/me` → rows gone (emailService mocked) |
| `backend/controllers/support.controller.js` | Create | User: `createTicket`, `listTickets`, `getTicket`, `replyToTicket`. Admin: `adminListTickets`, `adminGetTicket`, `adminReplyTicket`, `adminUpdateTicketStatus`. Shared: `validateNewTicket`, `validateReplyBody`, `findOwnedTicket`, `escapeLike` |
| `backend/routes/support.routes.js` | Create | `protect` → route-level limiters → user routes; exports `ticketStore`, `replyStore`, `replyLimiter` |
| `backend/server.js` | Modify | require + `app.use('/api/support/tickets', supportRoutes)` |
| `backend/tests/test-server.js` | Modify | same require + mount |
| `backend/routes/admin.routes.js` | Modify | `supportController`/`supportRoutes` requires + 4 admin support routes (`authorize('admin')`, `validateObjectId`) |
| `backend/middleware/audit.middleware.js` | Modify | `deriveAction` support branch at top of function |
| `backend/tests/supportUser.test.js` | Create | Create/validation/401/isolation/IDOR/detail/reopen/rate-limit (emailService mocked) |
| `backend/tests/supportAdmin.test.js` | Create | RBAC 403, list filter/q/pagination/openCount, detail, reply+email+CR/LF, status PUT, audit rows (emailService mocked) |
| `js/utils/api.js` | Modify | `support` namespace (4 methods), 4 `admin.*` support methods, `cacheable` `/support/tickets` exclusion + TODO |
| `js/pages/static-pages.js` | Modify | Real `async renderContact` (signed-out panel, signed-in form + thread + reply), `_esc` helper; remove `_handleContactForm` |
| `js/pages/pages.js` | Modify | Remove `_handleContactForm` wrapper; FAQ button `renderFAQ` :10331 → plain `<a href="#/contact">`; sidebar Support item; `Pages.refreshSupportBadge()` + `AdminUI.wireSidebar` hook; 2 routes; `renderAdminSupport` + `renderAdminSupportDetail` |
| `index.html` | Modify | Footer Contact links `#/faq` → `#/contact` (:269, :279); `?v=38` → `?v=39` (:318, Task 10) |
| `js/utils/footer.js` | Modify | Remove dead `a[href="#contact"]` block (:208-218) |
| `js/admin/admin-support.js` | Create | `AdminSupportManager` (list/getThread/reply/setStatus/getOpenCount 30s TTL), `window` + `module-loaded` |
| `js/app-init.js` | Modify | admin module entry; `MODULE_VERSION '37' → '38'` (Task 10) |
| `.eslintrc.json` | Modify | globals `adminSupportManager`, `_adminSupportManager` |
| `vite.config.js` | Modify | `APP_INIT_VERSION '38' → '39'` (Task 10) |
| `e2e/support-contact.spec.js` | Create | Signed-out panel, signed-in form+list, create flow, thread reply (all mocks) |
| `e2e/admin-support.spec.js` | Create | Queue renders + badge, row → detail, reply stores + toast (stateful mocks) |

## Spec decisions resolved in this plan (review these first)

1. **One controller for both surfaces.** `support.controller.js` exports user AND admin handlers — same convention as `coupon.controller.js` (the feature controller owns its admin endpoints). Justified with a comment in the file header.
2. **Audit via `deriveAction` only.** A support branch at the TOP of `deriveAction` (before the generic trailing-segment normalization, which would corrupt `/support/tickets/:id/replies` → `/:id/:id`): normalize `p.replace(/^(\/support\/tickets\/)[^/]+\/replies$/, '$1:id/replies').replace(/^(\/support\/tickets\/)[^/]+$/, '$1:id')`, cases `POST /support/tickets/:id/replies → support_reply`, `PUT /support/tickets/:id → support_status_change`, default `null` (loud gap warning). **NO per-route `auditMutation('...')` overrides** on the support routes: the router-level `router.use(auditMutation())` (admin.routes.js:22) plus a route-level override would attach two `finish` listeners → two rows (the coupon/payout route overrides predate the global `router.use` and today produce 1 warn + 1 row).
3. **Admin support routes are admin-only** (`authorize('admin')`), not moderator — the spec's test decision is "moderator 403" on all four.
4. **PUT, not PATCH** for status updates. The spec text (§2 table, §6) says PATCH, but the repo has zero PATCH endpoints (products approve/reject, ban, coupons, payouts are all PUT) and `api.js` exposes no `patch()` helper — PUT matches house style with identical semantics (status-only update + validation + audit). Flagged here as a deliberate wording deviation from the spec; flip to `router.patch` + `this.request(..., { method: 'PATCH' })` if you want literal spec compliance (CSRF treats PATCH exactly like PUT, so either works).
5. **Rate limiters live in `support.routes.js`** (same shape and rationale as `deletionOtpLimiter`, user.routes.js:24-43): create 5/hour, reply 20/hour; handler mirrors deletionOtpLimiter's defensive `resetTime`-with-windowMs-fallback and returns 429 + `retryAfterSeconds`. Stores exported as `router.ticketStore` / `router.replyStore`; the reply limiter is exported as `router.replyLimiter` and reused by the admin reply route in `admin.routes.js` (`supportRoutes.replyLimiter`) — same module instance, same counter.
6. **Login has no returnTo.** The signed-out contact panel shows a plain `#/login` link + "Sign in to contact support" copy (`auth-pages.js` always navigates to `/dashboard` after login; a returnTo mechanism is out of scope).
7. **Escape-at-render (spec §3).** Every string rendered in the portal goes through `SecurityUtils.escapeHtml` even though ingress `sanitizeXss` already escaped it — worst case is a visibly double-escaped entity (`&amp;lt;` for a literal `<b>` in a message). `messages.js:13-18` sets the precedent. Decoding + `textContent` is a flagged follow-up, not v1.
8. **Admin list = server-side pagination.** `?status=&q=&page=&pageSize=` (default 20, max 100), response `{ tickets, total, openCount, page, pageSize }`, rendered with `AdminUI.paginationFooter`. Search `q` is LIKE-escaped (`ESCAPE '\'`) over subject + requester email + fullName.
9. **GET cache exclusion.** `cacheable` gains `!url.includes('/support/tickets')` (covers BOTH `/support/tickets…` and `/admin/support/tickets…`) with a `// TODO: security review` comment: the cache is keyed by URL without the auth token and `_cache` is never cleared on logout — a cached ticket list would replay across sessions. Wishlist/notifications reads share this pre-existing flaw (flagged in the comment, out of scope).
10. **URL state follows the established admin pattern (verified against router.js).** Pill change → `router.updateUrl('/admin/support', { filter: key })` (push, same as payouts :6335); debounced search → `updateUrl(..., true)` (replace, same as users :7126); page clicks → refetch only, no URL sync (users doesn't sync page either). Initial `filter`/`q` read once via `router.getParams()`. Verified: default router mode is **history** (`window.ROUTER_MODE` is never set → router.js:31) and pushState fires no re-dispatch, so pill/search changes do NOT double-fetch; only the hash-rollback flag would re-dispatch once — identical to what payouts/users already accept today.
11. **Badge refresh hook = end of `AdminUI.wireSidebar`.** Single "admin layout rendered" hook (14 call sites) instead of patching 14 renderers: calls `Pages.refreshSupportBadge()` (30s TTL inside `adminSupportManager.getOpenCount`; DOM patch of `[data-adm-nav="support"] .adm-nav-badge`; the badge element is only rendered when the count is truthy).
12. **Manager self-exposes.** `admin-support.js` sets `window.adminSupportManager` + fires `module-loaded` (admin-verifications.js:334-339 pattern); it is NOT added to `js/setup/globals.js` (verifications isn't either) and IS added to `.eslintrc.json` globals. `no-unused-vars` is warn-level; keep new warnings at zero anyway.
13. **Schema.** TEXT PK UUID via `generateId()`, camelCase columns (`userId`, `ticketId`, `authorId`, `authorRole`), `ON DELETE CASCADE` on both FKs, DB-default `createdAt`/`updatedAt`, 3 indexes. `db.exec(SCHEMA_SQL)` (IF NOT EXISTS) already materializes the tables on existing local DBs; the defensive `connectLocal` re-create guard mirrors the newsletter guard (:1553-1581) for parity. Turso receives the statements via `SCHEMA_SQL.split(';')` automatically.
14. **`setup.js` cleanup.** `'support_replies', 'support_tickets'` added to the afterEach list immediately before `'users'` (FK order; explicit clear keeps counts deterministic even though cascade would cover it).
15. **Deletion scrub.** Two explicit statements inserted after the `admin_mfa_challenges` line in `accountDeletion.js`: replies-by-subquery first, then tickets. Explicit (not cascade-dependent) so scrub completeness is provable in tests.
16. **Email content.** Ingress-escaped subject/body interpolate RAW into email HTML (already safe); `fullName` goes through `escapeHtml` (sanitize.middleware export) because Google-OAuth ingest bypasses `sanitizeXss`. Admin reply subject: `[JERTS CART] Re: <stored subject>`; create-ticket confirmation subject: `[JERTS CART] We received your request: <subject>` — both with `subject.replace(/[\r\n]+/g, ' ')` header-injection guards (spec §2: best-effort confirmation to the creator).
17. **Status transitions.** User reply → `open` (reopens resolved/pending threads) + `updatedAt` refresh. Admin reply → `pending`. Status PUT sets exactly what was passed (+ `updatedAt` via `updateById`). The first message of a ticket is stored as a reply (`authorRole 'user'`) in the same `batchWrite` as the ticket insert — atomic on both engines.
18. **TDD red states are acceptable at Step 1:** `Cannot find module '../routes/support.routes'` (test-server require), 404s from unmounted routes, `no such table: support_tickets`. Implement in Step 2, green in Step 3.
19. **Test email mocking.** Each backend test file mocks `../utils/emailService` with a `jest.requireActual` factory whose `sendEmail` defaults to `async () => ({ success: true })`, and `beforeEach` clears call history with `sendEmail.mockClear()` (keeps the default impl) — `backend/.env` may hold real Brevo/SMTP credentials (deletionGate.test.js:12-34 is the reference pattern; `mockClear` vs `mockReset` both work because the factory supplies the default resolution).
20. **Contact page.** Fake phone card dropped; `support@jertscart.com` kept; FAQ's inline-handler button replaced with a plain `<a href="#/contact">` (no JS needed — hash links already route); footer dead block removed; toggle/reply/create listeners delegated on stable containers (`#contact-portal`, the forms) so innerHTML re-renders never detach them.

---

### Task 1: Support schema — tables, indexes, audit enum

**Files:**
- Create: `backend/tests/supportSchema.test.js`
- Modify: `backend/config/database.js`
- Modify: `backend/tests/setup.js`

**Interfaces:**
- Produces: `support_tickets(id, userId, category, subject, status, createdAt, updatedAt)`, `support_replies(id, ticketId, authorId, authorRole, body, createdAt)`, indexes `idx_support_tickets_user`, `idx_support_tickets_status`, `idx_support_replies_ticket`; `activity_logs.action` CHECK accepts `support_reply`, `support_status_change`.
- Consumed by: Tasks 2-4 (all support SQL), Tasks 8-9 (badge `openCount`, e2e mocks).

**Steps:**

- [ ] **Step 1: Write the failing test.** Create `backend/tests/supportSchema.test.js`:

```js
/**
 * Support schema tests (spec 2026-09-24).
 * Verifies the support tables + indexes exist, the category/status CHECK
 * constraints hold, FKs cascade, and activity_logs accepts the two new
 * audit enum values.
 */
const { getDb } = require('../config/database');

describe('Support ticket schema', () => {
  let sql;

  beforeAll(() => {
    sql = getDb();
  });

  test('support tables and indexes exist', () => {
    const tables = sql
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map(r => r.name);
    expect(tables).toEqual(expect.arrayContaining(['support_tickets', 'support_replies']));

    const indexes = sql
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
      .all()
      .map(r => r.name);
    expect(indexes).toEqual(
      expect.arrayContaining([
        'idx_support_tickets_user',
        'idx_support_tickets_status',
        'idx_support_replies_ticket',
      ])
    );
  });

  test('category CHECK rejects unknown categories', () => {
    sql
      .prepare(
        'INSERT INTO users (id, fullName, email, phone, university, password) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run('schema-user-1', 'Schema User', 'schema_user_1@example.com', '+233000000001', 'atu', 'x');
    const insert = sql.prepare(
      'INSERT INTO support_tickets (id, userId, category, subject) VALUES (?, ?, ?, ?)'
    );
    expect(() => insert.run('schema-t-bad', 'schema-user-1', 'not-a-category', 'Hi')).toThrow(
      /CHECK constraint failed/i
    );
    expect(() =>
      insert.run('schema-t-ok', 'schema-user-1', 'payment', 'Payment failed')
    ).not.toThrow();
  });

  test('status CHECK rejects unknown statuses', () => {
    expect(() =>
      sql.prepare("UPDATE support_tickets SET status = 'nope' WHERE id = 'schema-t-ok'").run()
    ).toThrow(/CHECK constraint failed/i);
    expect(() =>
      sql.prepare("UPDATE support_tickets SET status = 'resolved' WHERE id = 'schema-t-ok'").run()
    ).not.toThrow();
  });

  test('support_replies cascade-deletes with the ticket', () => {
    sql
      .prepare(
        "INSERT INTO support_tickets (id, userId, category, subject) VALUES ('ct-1', 'schema-user-1', 'other', 'Cascade')"
      )
      .run();
    sql
      .prepare(
        "INSERT INTO support_replies (id, ticketId, authorId, authorRole, body) VALUES ('cr-1', 'ct-1', 'schema-user-1', 'user', 'hello')"
      )
      .run();
    sql.prepare("DELETE FROM support_tickets WHERE id = 'ct-1'").run();
    const rows = sql.prepare("SELECT * FROM support_replies WHERE ticketId = 'ct-1'").all();
    expect(rows).toHaveLength(0);
  });

  test('support_tickets cascade-deletes when the author is deleted', () => {
    sql
      .prepare(
        "INSERT INTO support_tickets (id, userId, category, subject) VALUES ('ct-2', 'schema-user-1', 'other', 'User gone')"
      )
      .run();
    sql.prepare("DELETE FROM users WHERE id = 'schema-user-1'").run();
    const rows = sql.prepare("SELECT * FROM support_tickets WHERE id = 'ct-2'").all();
    expect(rows).toHaveLength(0);
  });

  test('activity_logs accepts the new audit actions and rejects unknown ones', () => {
    const insertLog = sql.prepare(
      "INSERT INTO activity_logs (id, user, action, severity) VALUES (?, NULL, ?, 'info')"
    );
    expect(() => insertLog.run('log-ok-1', 'support_reply')).not.toThrow();
    expect(() => insertLog.run('log-ok-2', 'support_status_change')).not.toThrow();
    expect(() => insertLog.run('log-bad', 'not_a_support_action')).toThrow(
      /CHECK constraint failed/i
    );
  });
});
```

Expected red: `no such table: support_tickets` (plus a caught afterEach cleanup warning for the two not-yet-existing tables — the cleanup loop aborts before clearing `users`, which Step 3 fixes).

- [ ] **Step 2: Add the schema.** In `backend/config/database.js`, THREE edits:

  (a) In `ACTIVITY_LOGS_ACTIONS_SQL` (the array ends `'newsletter_campaign',` then `].map(a => ...)` around :44-46), insert after the newsletter line:

```js
  // Support tickets (spec 2026-09-24):
  'support_reply', 'support_status_change',
```

  (b) In `SCHEMA_SQL`, after `CREATE INDEX IF NOT EXISTS idx_newsletter_token ...` and BEFORE the closing backtick (~:551):

```sql
-- Support tickets (spec 2026-09-24): user-authored contact portal.
-- authorRole is denormalized on replies so thread history survives a
-- future role change and renders correctly for both surfaces.
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK(category IN ('order','payment','verification','product','account','other')),
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','pending','resolved')),
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS support_replies (
  id TEXT PRIMARY KEY,
  ticketId TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  authorId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  authorRole TEXT NOT NULL CHECK(authorRole IN ('user','admin')),
  body TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(userId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, updatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_support_replies_ticket ON support_replies(ticketId, createdAt);
```

  (c) BOTH activity_logs rebuild conditions — the Turso one (`activitySchemaSql`, ~:1004-1011) and the local one (`activityTbl.sql`, ~:1351-1358) — get two more `||` clauses after the `verification_link_resent` clause. Local copy (Turso copy uses `activitySchemaSql` instead of `activityTbl.sql`):

```js
      !activityTbl.sql.includes('\'verification_link_resent\'') ||
      !activityTbl.sql.includes('\'support_reply\'') ||
      !activityTbl.sql.includes('\'support_status_change\'')) {
```

  (d) In `connectLocal`, after the newsletter re-create block (`}` closing `if (newsletterCols.length === 0)`) and BEFORE `} catch (migrationErr)` (~:1581):

```js
    // Support ticket tables (spec 2026-09-24). SCHEMA_SQL above already
    // creates them with IF NOT EXISTS on every boot; this guard mirrors
    // the newsletter block for parity and keeps partial/older migration
    // files from leaving the portal dead on first run.
    const supportTicketsCols = db.prepare('PRAGMA table_info(support_tickets)').all();
    if (supportTicketsCols.length === 0) {
      db.exec(`
        CREATE TABLE support_tickets (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          category TEXT NOT NULL CHECK(category IN ('order','payment','verification','product','account','other')),
          subject TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','pending','resolved')),
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE support_replies (
          id TEXT PRIMARY KEY,
          ticketId TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
          authorId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          authorRole TEXT NOT NULL CHECK(authorRole IN ('user','admin')),
          body TEXT NOT NULL,
          createdAt TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(userId, createdAt DESC);
        CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, updatedAt DESC);
        CREATE INDEX IF NOT EXISTS idx_support_replies_ticket ON support_replies(ticketId, createdAt);
      `);
    }
```

- [ ] **Step 3: Test cleanup.** In `backend/tests/setup.js`, add `'support_replies', 'support_tickets',` to the afterEach `tables` array immediately before `'users',`:

```js
      'orders', 'products', 'student_verifications', 'newsletter_subscribers',
      'support_replies', 'support_tickets',
      'users',
```

- [ ] **Step 4: Verify** — `cd backend && npx jest tests/supportSchema.test.js && npm run lint:check`. All 6 tests green, lint 0 errors.

- [ ] **Step 5: Commit** — `feat: support ticket schema — tables, indexes, audit enum values`.

---

### Task 2: Account-deletion scrub for tickets + replies

**Files:**
- Modify: `backend/utils/accountDeletion.js`
- Create: `backend/tests/supportDeletion.test.js`

**Interfaces:**
- Produces: `executeAccountDeletion` also deletes the user's `support_replies` (by subquery) and `support_tickets` inside the same atomic `batchWrite`.
- Consumed by: nothing new — the existing deletion paths (`DELETE /users/me`, admin delete) pick it up automatically.

**Steps:**

- [ ] **Step 1: Write the failing test.** Create `backend/tests/supportDeletion.test.js`:

```js
/**
 * Support scrub on account deletion (spec 2026-09-24 §Data).
 * Deleting an account removes their tickets AND the reply threads on
 * them — no orphaned ticket bodies left in support_replies.
 */
jest.mock('../utils/emailService', () => {
  const actual = jest.requireActual('../utils/emailService');
  return { ...actual, sendEmail: jest.fn(async () => ({ success: true })) };
});

const request = require('supertest');
const { createTestApp } = require('./test-server');
const { db } = require('../utils/db');
const { getDb } = require('../config/database');

const app = createTestApp();

async function registerUser () {
  const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const password = 'SupportDel1!';
  const res = await request(app).post('/api/auth/register').send({
    fullName: `Support Del ${suffix}`,
    email: `support_del_${suffix}@test.com`,
    phone: `+23324${String(1000000 + Math.floor(Math.random() * 8999999))}`,
    password,
    university: 'atu',
    level: '200',
    acceptedTerms: true,
  });
  expect(res.status).toBe(201);
  return { token: res.body.data.token, id: res.body.data.user._id, password };
}

describe('Account deletion scrubs support tickets', () => {
  test('removes tickets and replies owned by the deleted user', async () => {
    const user = await registerUser();

    await db('support_tickets').create({
      id: 'del-tkt-1',
      userId: user.id,
      category: 'payment',
      subject: 'Payment not received',
      status: 'pending',
    });
    await db('support_replies').create({
      id: 'del-rep-1',
      ticketId: 'del-tkt-1',
      authorId: user.id,
      authorRole: 'user',
      body: 'Please help with my MoMo payment.',
    });
    await db('support_replies').create({
      id: 'del-rep-2',
      ticketId: 'del-tkt-1',
      authorId: user.id,
      authorRole: 'admin',
      body: 'We are checking with the provider.',
    });

    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ confirmText: 'DELETE', password: user.password });
    expect(res.status).toBe(200);

    const sql = getDb();
    expect(sql.prepare('SELECT * FROM support_tickets WHERE id = ?').get('del-tkt-1')).toBeUndefined();
    expect(
      sql.prepare('SELECT * FROM support_replies WHERE ticketId = ?').all('del-tkt-1')
    ).toHaveLength(0);
  });
});
```

Expected red: the final two expects fail — deletion succeeds but leaves the seeded rows (the scrub statements do not exist yet).

- [ ] **Step 2: Add the scrub statements.** In `backend/utils/accountDeletion.js`, inside the `statements` array, after the `admin_mfa_challenges` line and BEFORE the `products` line:

```js
    { sql: `DELETE FROM support_replies WHERE ticketId IN (SELECT id FROM support_tickets WHERE userId = ?)`, args: [user.id] },
    { sql: `DELETE FROM support_tickets WHERE userId = ?`, args: [user.id] },
```

- [ ] **Step 3: Verify** — `cd backend && npx jest tests/supportDeletion.test.js && npm run lint:check`. Green.

- [ ] **Step 4: Commit** — `feat: scrub support tickets and replies on account deletion`.

---

### Task 3: User support API — controller, routes, mounts

**Files:**
- Create: `backend/controllers/support.controller.js`
- Create: `backend/routes/support.routes.js`
- Modify: `backend/server.js`
- Modify: `backend/tests/test-server.js`
- Create: `backend/tests/supportUser.test.js`

**Interfaces:**
- Produces: `POST /api/support/tickets` 201 `{data:{ticket}}`; `GET /api/support/tickets` `{data:{tickets}}` (updatedAt DESC); `GET /api/support/tickets/:id` `{data:{ticket,replies}}` (404 missing AND not-owned); `POST /api/support/tickets/:id/replies` 201 `{data:{reply,ticket}}` (ticket → `open`). Router exports `router.ticketStore`, `router.replyStore`, `router.replyLimiter`.
- Consumed by: Task 4 (admin reuses `replyLimiter`), frontend Task 5 (`api.support`), tests.

**Steps:**

- [ ] **Step 1: Write the failing test.** Create `backend/tests/supportUser.test.js`:

```js
/**
 * User-facing support endpoints (spec 2026-09-24 §API).
 * Logged-in users only; tickets are private; IDOR returns 404 (not 403);
 * rate limits are enforced per user with an exported MemoryStore so
 * tests can reset them deterministically.
 */
jest.mock('../utils/emailService', () => {
  const actual = jest.requireActual('../utils/emailService');
  return { ...actual, sendEmail: jest.fn(async () => ({ success: true })) };
});

const request = require('supertest');
const { createTestApp } = require('./test-server');
const { db } = require('../utils/db');
const supportRoutes = require('../routes/support.routes');
const { getDb } = require('../config/database');
const { sendEmail } = require('../utils/emailService');

const app = createTestApp();

async function registerUser (role) {
  const suffix = `${role}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const res = await request(app).post('/api/auth/register').send({
    fullName: `Support ${role} ${suffix}`,
    email: `${suffix}@test.com`,
    phone: `+23324${String(1000000 + Math.floor(Math.random() * 8999999))}`,
    password: 'Student123!',
    university: 'atu',
    level: '200',
    acceptedTerms: true,
  });
  expect(res.status).toBe(201);
  if (role && role !== 'buyer') {
    getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run(role, res.body.data.user._id);
  }
  return { token: res.body.data.token, id: res.body.data.user._id, email: res.body.data.user.email };
}

function validTicket (overrides = {}) {
  return {
    category: 'payment',
    subject: 'Payment failed but money left my wallet',
    message: 'I paid with MoMo and the order is still pending.',
    ...overrides,
  };
}

describe('User support tickets API', () => {
  beforeEach(async () => {
    await supportRoutes.ticketStore.resetAll();
    await supportRoutes.replyStore.resetAll();
    sendEmail.mockClear();
  });

  test('POST /api/support/tickets requires authentication', async () => {
    const res = await request(app).post('/api/support/tickets').send(validTicket());
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/unauthorized/i);
  });

  test('POST /api/support/tickets creates a ticket with a first reply', async () => {
    const user = await registerUser('buyer');
    const res = await request(app)
      .post('/api/support/tickets')
      .set('Authorization', `Bearer ${user.token}`)
      .send(validTicket());

    expect(res.status).toBe(201);
    expect(res.body.data.ticket.status).toBe('open');
    expect(res.body.data.ticket.category).toBe('payment');
    expect(res.body.data.ticket.userId).toBe(user.id);
    // Best-effort confirmation email to the creator (spec §2).
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0]).toBe(user.email);

    const detail = await request(app)
      .get(`/api/support/tickets/${res.body.data.ticket._id}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.replies).toHaveLength(1);
    expect(detail.body.data.replies[0].authorRole).toBe('user');
    expect(detail.body.data.replies[0].body).toContain('MoMo');
  });

  test('POST /api/support/tickets validates input', async () => {
    const user = await registerUser('buyer');
    const cases = [
      { ...validTicket(), category: 'invalid' },
      { ...validTicket(), subject: '' },
      { ...validTicket(), subject: 'x'.repeat(201) },
      { ...validTicket(), message: '' },
      { ...validTicket(), message: 'x'.repeat(5001) },
    ];
    for (const body of cases) {
      const res = await request(app)
        .post('/api/support/tickets')
        .set('Authorization', `Bearer ${user.token}`)
        .send(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required|characters|valid/i);
    }
  });

  test('GET /api/support/tickets returns only the caller tickets', async () => {
    const alice = await registerUser('buyer');
    const bob = await registerUser('buyer');

    await request(app)
      .post('/api/support/tickets')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(validTicket({ subject: 'Alice ticket' }));
    await request(app)
      .post('/api/support/tickets')
      .set('Authorization', `Bearer ${bob.token}`)
      .send(validTicket({ subject: 'Bob ticket' }));

    const res = await request(app)
      .get('/api/support/tickets')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.tickets).toHaveLength(1);
    expect(res.body.data.tickets[0].subject).toBe('Alice ticket');
  });

  test('GET /api/support/tickets/:id hides tickets from other users (404, not 403)', async () => {
    const alice = await registerUser('buyer');
    const bob = await registerUser('buyer');
    const created = await request(app)
      .post('/api/support/tickets')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(validTicket());

    const res = await request(app)
      .get(`/api/support/tickets/${created.body.data.ticket._id}`)
      .set('Authorization', `Bearer ${bob.token}`);
    expect(res.status).toBe(404);
  });

  test('GET /api/support/tickets/:id rejects malformed ids with 400', async () => {
    const user = await registerUser('buyer');
    const res = await request(app)
      .get('/api/support/tickets/not-a-real-objectid')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(400);
  });

  test('GET /api/support/tickets/:id returns 404 for unknown id', async () => {
    const user = await registerUser('buyer');
    const res = await request(app)
      .get('/api/support/tickets/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(404);
  });

  test('POST /api/support/tickets/:id/replies reopens a resolved ticket', async () => {
    const user = await registerUser('buyer');
    const created = await request(app)
      .post('/api/support/tickets')
      .set('Authorization', `Bearer ${user.token}`)
      .send(validTicket());
    const ticketId = created.body.data.ticket._id;

    await db('support_tickets').updateById(ticketId, { status: 'resolved' });

    const res = await request(app)
      .post(`/api/support/tickets/${ticketId}/replies`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ message: 'Any update on this please?' });

    expect(res.status).toBe(201);
    expect(res.body.data.ticket.status).toBe('open');
    expect(res.body.data.reply.authorRole).toBe('user');

    const detail = await request(app)
      .get(`/api/support/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(detail.body.data.replies).toHaveLength(2);
  });

  test('reply endpoint validates body length and rejects IDOR with 404', async () => {
    const alice = await registerUser('buyer');
    const bob = await registerUser('buyer');
    const created = await request(app)
      .post('/api/support/tickets')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(validTicket());
    const ticketId = created.body.data.ticket._id;

    const bad = await request(app)
      .post(`/api/support/tickets/${ticketId}/replies`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ message: '' });
    expect(bad.status).toBe(400);

    const tooLong = await request(app)
      .post(`/api/support/tickets/${ticketId}/replies`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ message: 'x'.repeat(5001) });
    expect(tooLong.status).toBe(400);

    const idor = await request(app)
      .post(`/api/support/tickets/${ticketId}/replies`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ message: 'let me in' });
    expect(idor.status).toBe(404);
  });

  test('creating tickets is rate limited to 5/hour per user', async () => {
    const user = await registerUser('buyer');
    for (let i = 0; i < 5; i++) {
      const ok = await request(app)
        .post('/api/support/tickets')
        .set('Authorization', `Bearer ${user.token}`)
        .send(validTicket({ subject: `Ticket ${i}` }));
      expect(ok.status).toBe(201);
    }
    const limited = await request(app)
      .post('/api/support/tickets')
      .set('Authorization', `Bearer ${user.token}`)
      .send(validTicket({ subject: 'One too many' }));
    expect(limited.status).toBe(429);
    expect(limited.body.error).toMatch(/too many requests/i);
    expect(typeof limited.body.retryAfterSeconds).toBe('number');
  });
});
```

Expected red: `Cannot find module '../routes/support.routes'`.

- [ ] **Step 2: Write the controller.** Create `backend/controllers/support.controller.js`:

```js
/**
 * Support ticket controllers (spec 2026-09-24).
 *
 * ONE feature controller owns BOTH surfaces — the same convention as
 * coupon.controller.js, which serves /api/coupons (user) and
 * /api/admin/coupons (admin) from a single file. User handlers are
 * mounted behind `protect` on /api/support; admin handlers are wired
 * into admin.routes.js (router-level protect + auditMutation already
 * apply there).
 *
 * TODO: security review — ticket bodies are user-generated content:
 * always escape at render time (frontend) and never interpolate raw
 * into email HTML without escapeHtml.
 */
const { db, generateId } = require('../utils/db');
const { escapeHtml } = require('../middleware/sanitize.middleware');
const { sendEmail } = require('../utils/emailService');

const CATEGORY_ENUM = ['order', 'payment', 'verification', 'product', 'account', 'other'];
const STATUS_ENUM = ['open', 'pending', 'resolved'];
const SUBJECT_MAX = 200;
const MESSAGE_MAX = 5000;

function trimOrNull (value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateNewTicket (body) {
  const category = trimOrNull(body && body.category);
  const subject = trimOrNull(body && body.subject);
  const message = trimOrNull(body && body.message);
  if (!category || !CATEGORY_ENUM.includes(category)) {
    return { error: 'Category is required and must be a valid support category.' };
  }
  if (!subject) return { error: 'Subject is required.' };
  if (subject.length > SUBJECT_MAX) {
    return { error: `Subject must be ${SUBJECT_MAX} characters or fewer.` };
  }
  if (!message) return { error: 'Message is required.' };
  if (message.length > MESSAGE_MAX) {
    return { error: `Message must be ${MESSAGE_MAX} characters or fewer.` };
  }
  return { category, subject, message };
}

function validateReplyBody (body) {
  const message = trimOrNull(body && body.message);
  if (!message) return { error: 'Message is required.' };
  if (message.length > MESSAGE_MAX) {
    return { error: `Message must be ${MESSAGE_MAX} characters or fewer.` };
  }
  return { message };
}

async function findOwnedTicket (id, userId) {
  const ticket = await db('support_tickets').findById(id);
  if (!ticket || ticket.userId !== userId) return null;
  return ticket;
}

// LIKE wildcards are data, not syntax — escape before building patterns.
function escapeLike (value) {
  return value.replace(/[\\%_]/g, ch => `\\${ch}`);
}

module.exports = {
  CATEGORY_ENUM,
  STATUS_ENUM,
  escapeLike,

  validateNewTicket,
  validateReplyBody,
  findOwnedTicket,

  async createTicket (req, res, next) {
    try {
      const valid = validateNewTicket(req.body);
      if (valid.error) return res.status(400).json({ success: false, error: valid.error });
      const ticketId = generateId();
      const replyId = generateId();
      // Atomic on both engines: insert ticket + first message together.
      await db.batchWrite([
        {
          sql: `INSERT INTO support_tickets (id, userId, category, subject, status) VALUES (?, ?, ?, ?, 'open')`,
          args: [ticketId, req.user.id, valid.category, valid.subject],
        },
        {
          sql: `INSERT INTO support_replies (id, ticketId, authorId, authorRole, body) VALUES (?, ?, ?, 'user', ?)`,
          args: [replyId, ticketId, req.user.id, valid.message],
        },
      ]);
      const ticket = await db('support_tickets').findById(ticketId);

      // Best-effort confirmation to the ticket creator (spec §2). A failed
      // transport must never fail the API call; subject gets CR/LF stripped.
      try {
        const subject = `[JERTS CART] We received your request: ${ticket.subject.replace(/[\r\n]+/g, ' ')}`;
        const html = [
          `<p>Hi ${escapeHtml(req.user.fullName || 'there')},</p>`,
          '<p>Thanks for contacting JERTS CART support — we received your request:</p>',
          `<blockquote>${escapeHtml(ticket.subject)}</blockquote>`,
          '<p>We usually reply within 24 hours.</p>',
          '<p><a href="https://jertscart.com/#/contact">View the conversation</a></p>',
        ].join('\n');
        await sendEmail(req.user.email, subject, html);
      } catch (err) {
        // TODO: security review — do not log the error wholesale (may carry PII).
        console.warn('Support ticket confirmation email failed:', err && err.message);
      }

      res.status(201).json({ success: true, data: { ticket } });
    } catch (err) {
      next(err);
    }
  },

  async listTickets (req, res, next) {
    try {
      const rows = await db.rawAll(
        `SELECT * FROM support_tickets WHERE userId = ? ORDER BY updatedAt DESC`,
        [req.user.id]
      );
      res.json({ success: true, data: { tickets: rows } });
    } catch (err) {
      next(err);
    }
  },

  async getTicket (req, res, next) {
    try {
      const ticket = await findOwnedTicket(req.params.id, req.user.id);
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found.' });
      const replies = await db.rawAll(
        `SELECT * FROM support_replies WHERE ticketId = ? ORDER BY createdAt ASC`,
        [ticket.id]
      );
      res.json({ success: true, data: { ticket, replies } });
    } catch (err) {
      next(err);
    }
  },

  async replyToTicket (req, res, next) {
    try {
      const valid = validateReplyBody(req.body);
      if (valid.error) return res.status(400).json({ success: false, error: valid.error });
      const ticket = await findOwnedTicket(req.params.id, req.user.id);
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found.' });
      const replyId = generateId();
      await db.batchWrite([
        {
          sql: `INSERT INTO support_replies (id, ticketId, authorId, authorRole, body) VALUES (?, ?, ?, 'user', ?)`,
          args: [replyId, ticket.id, req.user.id, valid.message],
        },
        {
          sql: `UPDATE support_tickets SET status = 'open', updatedAt = datetime('now') WHERE id = ?`,
          args: [ticket.id],
        },
      ]);
      const reply = await db('support_replies').findById(replyId);
      const updated = await db('support_tickets').findById(ticket.id);
      res.status(201).json({ success: true, data: { reply, ticket: updated } });
    } catch (err) {
      next(err);
    }
  },

  async adminListTickets (req, res, next) {
    try {
      const allowedStatus = ['all', ...STATUS_ENUM];
      const status = allowedStatus.includes(req.query.status) ? req.query.status : 'all';
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));

      const where = [];
      const params = [];
      if (status !== 'all') {
        where.push('t.status = ?');
        params.push(status);
      }
      if (q) {
        const like = `%${escapeLike(q)}%`;
        where.push(
          `(t.subject LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\' OR u.fullName LIKE ? ESCAPE '\\')`
        );
        params.push(like, like, like);
      }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const totalRow = await db.rawGet(
        `SELECT COUNT(*) AS total FROM support_tickets t LEFT JOIN users u ON u.id = t.userId ${whereSql}`,
        params
      );
      const openRow = await db.rawGet(
        `SELECT COUNT(*) AS openCount FROM support_tickets WHERE status = 'open'`
      );
      const offset = (page - 1) * pageSize;
      const tickets = await db.rawAll(
        `SELECT t.*, u.email AS userEmail, u.fullName AS userName
           FROM support_tickets t LEFT JOIN users u ON u.id = t.userId
           ${whereSql}
          ORDER BY t.updatedAt DESC
          LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      res.json({
        success: true,
        data: {
          tickets,
          total: (totalRow && totalRow.total) || 0,
          openCount: (openRow && openRow.openCount) || 0,
          page,
          pageSize,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async adminGetTicket (req, res, next) {
    try {
      const ticket = await db('support_tickets').findById(req.params.id);
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found.' });
      const replies = await db.rawAll(
        `SELECT * FROM support_replies WHERE ticketId = ? ORDER BY createdAt ASC`,
        [ticket.id]
      );
      const user = await db('users').findById(ticket.userId);
      res.json({
        success: true,
        data: { ticket, replies, userEmail: user ? user.email : null },
      });
    } catch (err) {
      next(err);
    }
  },

  async adminReplyTicket (req, res, next) {
    try {
      const valid = validateReplyBody(req.body);
      if (valid.error) return res.status(400).json({ success: false, error: valid.error });
      const ticket = await db('support_tickets').findById(req.params.id);
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found.' });

      const replyId = generateId();
      await db.batchWrite([
        {
          sql: `INSERT INTO support_replies (id, ticketId, authorId, authorRole, body) VALUES (?, ?, ?, 'admin', ?)`,
          args: [replyId, ticket.id, req.user.id, valid.message],
        },
        {
          sql: `UPDATE support_tickets SET status = 'pending', updatedAt = datetime('now') WHERE id = ?`,
          args: [ticket.id],
        },
      ]);
      const reply = await db('support_replies').findById(replyId);
      const updated = await db('support_tickets').findById(ticket.id);

      // Email is best-effort: an unconfigured transport must not fail the
      // API call. Only the ticket owner is notified.
      let emailSent = false;
      try {
        const owner = await db('users').findById(ticket.userId);
        if (owner && owner.email) {
          // CRLF in the subject would allow header injection; escapeHtml
          // does not touch newlines, so strip them explicitly.
          const subject = `[JERTS CART] Re: ${ticket.subject.replace(/[\r\n]+/g, ' ')}`;
          const html = [
            `<p>Hi ${escapeHtml(owner.fullName || 'there')},</p>`,
            `<p><strong>${escapeHtml(ticket.subject)}</strong> has a new reply from our support team:</p>`,
            `<blockquote>${escapeHtml(valid.message)}</blockquote>`,
            `<p><a href="https://jertscart.com/#/contact">View the conversation</a></p>`,
          ].join('\n');
          const result = await sendEmail(owner.email, subject, html);
          emailSent = Boolean(result && result.success);
        }
      } catch (err) {
        // TODO: security review — never log the error wholesale if it may
        // carry PII; a transport failure is non-fatal here.
        console.warn('Support reply email failed:', err && err.message);
      }

      res.status(201).json({ success: true, data: { reply, ticket: updated, emailSent } });
    } catch (err) {
      next(err);
    }
  },

  async adminUpdateTicketStatus (req, res, next) {
    try {
      const status = req.body && req.body.status;
      if (!STATUS_ENUM.includes(status)) {
        return res
          .status(400)
          .json({ success: false, error: 'Status must be open, pending, or resolved.' });
      }
      const ticket = await db('support_tickets').findById(req.params.id);
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found.' });
      const updated = await db('support_tickets').updateById(ticket.id, { status });
      res.json({ success: true, data: { ticket: updated } });
    } catch (err) {
      next(err);
    }
  },
};
```

- [ ] **Step 3: Write the user routes.** Create `backend/routes/support.routes.js`:

```js
/**
 * User-facing support routes (spec 2026-09-24).
 * Mounted at /api/support/tickets behind `protect`. Rate limiters live
 * here — the same rationale as deletionOtpLimiter (user.routes.js):
 * feature-scoped, user+IP keyed, explicit MemoryStore so tests can
 * resetAll(). Admin routes reuse `replyLimiter` from this module (same
 * instance, same counter).
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth.middleware');
const { validateObjectId } = require('../middleware/sanitize.middleware');
const supportController = require('../controllers/support.controller');

const router = express.Router();

const ticketStore = new rateLimit.MemoryStore();
const replyStore = new rateLimit.MemoryStore();

// Handler mirrors deletionOtpLimiter: resetTime may be missing on some
// store responses, so fall back to the window size (defense in depth).
function limitHandler (req, res, _next, options) {
  const info = req.rateLimit || {};
  const resetMs =
    info.resetTime instanceof Date
      ? info.resetTime.getTime() - Date.now()
      : (options && options.windowMs) || 60 * 60 * 1000;
  res.status(429).json({
    success: false,
    error: 'Too many requests — please try again later.',
    retryAfterSeconds: Math.max(1, Math.ceil(resetMs / 1000)),
  });
}

const ticketLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: ticketStore,
  keyGenerator: req => `${(req.user && req.user.id) || 'anon'}:${req.ip}`,
  handler: limitHandler,
});

const replyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: replyStore,
  keyGenerator: req => `${(req.user && req.user.id) || 'anon'}:${req.ip}`,
  handler: limitHandler,
});

router.use(protect);

router.post('/', ticketLimiter, supportController.createTicket);
router.get('/', supportController.listTickets);
router.get('/:id', validateObjectId, supportController.getTicket);
router.post('/:id/replies', validateObjectId, replyLimiter, supportController.replyToTicket);

router.ticketStore = ticketStore;
router.replyStore = replyStore;
router.replyLimiter = replyLimiter;

module.exports = router;
```

- [ ] **Step 4: Mount it.** The mount MUST be `/api/support/tickets` — the router's own paths are `/`, `/:id`, `/:id/replies`, and the frontend/tests call `/api/support/tickets[...]`. Two edits:

  - `backend/server.js` — add the require after the searchRoutes require (:54): `const supportRoutes = require('./routes/support.routes');` and mount after the coupon mount (`app.use('/api/coupons', couponRoutes);`, :494) and before the docRetention comment block:

```js
// Support tickets (spec 2026-09-24) — user portal CRUD behind protect.
app.use('/api/support/tickets', supportRoutes);
```

  - `backend/tests/test-server.js` — same require after the coupon require (:30) and the same mount after `app.use('/api/coupons', couponRoutes);` (~:92), before `// 404 handler`.

- [ ] **Step 5: Verify** — `cd backend && npx jest tests/supportUser.test.js tests/supportSchema.test.js tests/supportDeletion.test.js && npm run lint:check`. All green.

- [ ] **Step 6: Commit** — `feat: user support ticket API — create, list, detail, replies`.

---

### Task 4: Admin support API + audit integration

**Files:**
- Modify: `backend/routes/admin.routes.js`
- Modify: `backend/middleware/audit.middleware.js`
- Create: `backend/tests/supportAdmin.test.js`

**Interfaces:**
- Produces: `GET /api/admin/support/tickets?status=&q=&page=&pageSize=` → `{data:{tickets,total,openCount,page,pageSize}}` (LEFT JOIN `userEmail`/`userName`); `GET /api/admin/support/tickets/:id` → `{data:{ticket,replies,userEmail}}`; `POST /api/admin/support/tickets/:id/replies` 201 → `{data:{reply,ticket,emailSent}}` (status → `pending`, replies rate-limited); `PUT /api/admin/support/tickets/:id` → `{data:{ticket}}`; audit rows with `action = 'support_reply'` / `'support_status_change'`.
- Consumed by: frontend Task 5 (`api.admin`), badge Task 7, e2e Task 9.

**Steps:**

- [ ] **Step 1: Write the failing test.** Create `backend/tests/supportAdmin.test.js`:

```js
/**
 * Admin support endpoints + audit trail (spec 2026-09-24 §API/§Audit).
 * Moderator is denied on ALL four routes (spec test decision).
 * Audit rows are asserted via the audit.test.js helpers: mutations are
 * logged asynchronously on `res.finish`, so tests flush ~100ms.
 */
jest.mock('../utils/emailService', () => {
  const actual = jest.requireActual('../utils/emailService');
  return { ...actual, sendEmail: jest.fn(async () => ({ success: true })) };
});

const request = require('supertest');
const { createTestApp } = require('./test-server');
const { db } = require('../utils/db');
const { getDb } = require('../config/database');
const supportRoutes = require('../routes/support.routes');
const { sendEmail } = require('../utils/emailService');

const app = createTestApp();

async function registerUser (role) {
  const suffix = `${role}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const res = await request(app).post('/api/auth/register').send({
    fullName: `Support ${role} ${suffix}`,
    email: `${suffix}@test.com`,
    phone: `+23324${String(1000000 + Math.floor(Math.random() * 8999999))}`,
    password: 'Student123!',
    university: 'atu',
    level: '200',
    acceptedTerms: true,
  });
  expect(res.status).toBe(201);
  if (role && role !== 'buyer') {
    getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run(role, res.body.data.user._id);
  }
  return {
    token: res.body.data.token,
    id: res.body.data.user._id,
    email: res.body.data.user.email,
  };
}

// Seed ids MUST be UUID-shaped: every /:id admin route runs
// validateObjectId (400 on anything that is not a dashed UUID or 24-hex).
function newUuid () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function seedTicket (overrides = {}) {
  const id = overrides.id || newUuid();
  await db('support_tickets').create({
    id,
    userId: overrides.userId,
    category: overrides.category || 'payment',
    subject: overrides.subject || 'Payment not received',
    status: overrides.status || 'open',
  });
  return id;
}

const flush = () => new Promise(resolve => setTimeout(resolve, 100));

function getAuditRows () {
  return getDb()
    .prepare(`SELECT * FROM activity_logs WHERE action LIKE 'support%'`)
    .all();
}

describe('Admin support endpoints', () => {
  beforeEach(async () => {
    await supportRoutes.replyStore.resetAll();
    sendEmail.mockClear();
  });

  test('all four support routes deny moderator with 403', async () => {
    const mod = await registerUser('moderator');
    const buyer = await registerUser('buyer');
    const ticketId = await seedTicket({ userId: buyer.id });

    const list = await request(app)
      .get('/api/admin/support/tickets')
      .set('Authorization', `Bearer ${mod.token}`);
    expect(list.status).toBe(403);

    const detail = await request(app)
      .get(`/api/admin/support/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${mod.token}`);
    expect(detail.status).toBe(403);

    const reply = await request(app)
      .post(`/api/admin/support/tickets/${ticketId}/replies`)
      .set('Authorization', `Bearer ${mod.token}`)
      .send({ message: 'nope' });
    expect(reply.status).toBe(403);

    const update = await request(app)
      .put(`/api/admin/support/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${mod.token}`)
      .send({ status: 'resolved' });
    expect(update.status).toBe(403);
  });

  test('all four support routes require authentication', async () => {
    const list = await request(app).get('/api/admin/support/tickets');
    expect(list.status).toBe(401);
  });

  test('list supports status filter, LIKE-escaped search, and pagination', async () => {
    const admin = await registerUser('admin');
    const buyer = await registerUser('buyer');
    await seedTicket({ userId: buyer.id, subject: 'Alpha save 50% refund', status: 'open' });
    await seedTicket({ userId: buyer.id, subject: 'Beta save 50 invoice', status: 'pending' });
    await seedTicket({ userId: buyer.id, subject: 'Gamma verification issue', status: 'resolved' });

    const page1 = await request(app)
      .get('/api/admin/support/tickets?pageSize=2&page=1')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(page1.status).toBe(200);
    expect(page1.body.data.total).toBe(3);
    expect(page1.body.data.openCount).toBe(1);
    expect(page1.body.data.tickets).toHaveLength(2);
    expect(page1.body.data.tickets[0].userEmail).toBe(buyer.email);

    const openOnly = await request(app)
      .get('/api/admin/support/tickets?status=open')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(openOnly.body.data.tickets.every(t => t.status === 'open')).toBe(true);

    // '50%' must match only the subject containing the literal '50%' —
    // an unescaped '%' would also match 'Beta save 50 invoice'.
    const search = await request(app)
      .get(`/api/admin/support/tickets?q=${encodeURIComponent('50%')}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(search.status).toBe(200);
    expect(search.body.data.tickets).toHaveLength(1);
    expect(search.body.data.tickets[0].subject).toContain('Alpha');
  });

  test('detail returns thread with requester email; malformed id 400; unknown 404', async () => {
    const admin = await registerUser('admin');
    const buyer = await registerUser('buyer');
    const ticketId = await seedTicket({ userId: buyer.id, subject: 'Detail me' });
    await db('support_replies').create({
      ticketId,
      authorId: buyer.id,
      authorRole: 'user',
      body: 'First message from the customer.',
    });

    const res = await request(app)
      .get(`/api/admin/support/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.replies).toHaveLength(1);
    expect(res.body.data.userEmail).toBe(buyer.email);

    const malformed = await request(app)
      .get('/api/admin/support/tickets/nope')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(malformed.status).toBe(400);

    const missing = await request(app)
      .get('/api/admin/support/tickets/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(missing.status).toBe(404);
  });

  test('admin reply stores a reply, sets pending, and emails the owner', async () => {
    const admin = await registerUser('admin');
    const buyer = await registerUser('buyer');
    const ticketId = await seedTicket({ userId: buyer.id, subject: 'Order stuck' });

    const res = await request(app)
      .post(`/api/admin/support/tickets/${ticketId}/replies`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ message: 'We are escalating this to the provider.' });

    expect(res.status).toBe(201);
    expect(res.body.data.reply.authorRole).toBe('admin');
    expect(res.body.data.ticket.status).toBe('pending');
    expect(res.body.data.emailSent).toBe(true);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0]).toBe(buyer.email);

    const detail = await request(app)
      .get(`/api/admin/support/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(detail.body.data.replies).toHaveLength(1);
  });

  test('admin reply strips CRLF from the email subject (header injection guard)', async () => {
    const admin = await registerUser('admin');
    const buyer = await registerUser('buyer');
    const ticketId = await seedTicket({ userId: buyer.id, subject: 'Line\nBreak: subject' });

    const res = await request(app)
      .post(`/api/admin/support/tickets/${ticketId}/replies`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ message: 'Reply body' });

    expect(res.status).toBe(201);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const subject = sendEmail.mock.calls[0][1];
    expect(subject).not.toMatch(/[\r\n]/);
    expect(subject).toContain('[JERTS CART] Re:');
  });

  test('admin reply still succeeds when the email transport throws (best-effort)', async () => {
    const admin = await registerUser('admin');
    const buyer = await registerUser('buyer');
    const ticketId = await seedTicket({ userId: buyer.id, subject: 'Email down' });
    sendEmail.mockRejectedValueOnce(new Error('SMTP unavailable'));

    const res = await request(app)
      .post(`/api/admin/support/tickets/${ticketId}/replies`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ message: 'Persisted even when email fails.' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.emailSent).toBe(false);

    const detail = await request(app)
      .get(`/api/admin/support/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(detail.body.data.replies).toHaveLength(1);
    expect(detail.body.data.ticket.status).toBe('pending');
  });

  test('admin reply validates body and 404s unknown tickets', async () => {
    const admin = await registerUser('admin');
    const empty = await request(app)
      .post('/api/admin/support/tickets/00000000-0000-0000-0000-000000000000/replies')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ message: '' });
    expect(empty.status).toBe(400);

    const missing = await request(app)
      .post('/api/admin/support/tickets/00000000-0000-0000-0000-000000000000/replies')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ message: 'hello' });
    expect(missing.status).toBe(404);
  });

  test('PUT status updates the ticket and validates the enum', async () => {
    const admin = await registerUser('admin');
    const buyer = await registerUser('buyer');
    const ticketId = await seedTicket({ userId: buyer.id, status: 'open' });

    const ok = await request(app)
      .put(`/api/admin/support/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'resolved' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.ticket.status).toBe('resolved');

    const reopen = await request(app)
      .put(`/api/admin/support/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'open' });
    expect(reopen.body.data.ticket.status).toBe('open');

    const bad = await request(app)
      .put(`/api/admin/support/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'archived' });
    expect(bad.status).toBe(400);
  });

  test('admin mutations write audit rows (support_reply, support_status_change)', async () => {
    const admin = await registerUser('admin');
    const buyer = await registerUser('buyer');
    const ticketId = await seedTicket({ userId: buyer.id });

    await request(app)
      .post(`/api/admin/support/tickets/${ticketId}/replies`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ message: 'Audit this reply' });
    await flush();

    await request(app)
      .put(`/api/admin/support/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'resolved' });
    await flush();

    const rows = getAuditRows();
    const actions = rows.map(r => r.action);
    expect(actions).toEqual(expect.arrayContaining(['support_reply', 'support_status_change']));

    const replyRow = rows.find(r => r.action === 'support_reply');
    expect(replyRow.user).toBe(admin.id);
    expect(replyRow.userRole).toBe('admin');
    expect(replyRow.severity).toBe('info');
    // Middleware details are sanitizeDetails(req.body) — the route/method
    // are captured by the action itself, not the body (verified against
    // audit.middleware.js: details = sanitizeDetails(req.body)).
    expect(JSON.parse(replyRow.details)).toEqual({ message: 'Audit this reply' });

    const statusRow = rows.find(r => r.action === 'support_status_change');
    expect(JSON.parse(statusRow.details)).toEqual({ status: 'resolved' });

    // Exactly one row per mutation — no double logging from a route-level
    // override stacked on the router-level auditMutation().
    expect(actions.filter(a => a === 'support_reply')).toHaveLength(1);
    expect(actions.filter(a => a === 'support_status_change')).toHaveLength(1);
  });

  test('admin reply route is rate limited via the shared reply limiter', async () => {
    const admin = await registerUser('admin');
    const buyer = await registerUser('buyer');
    const ticketId = await seedTicket({ userId: buyer.id });

    for (let i = 0; i < 20; i++) {
      const ok = await request(app)
        .post(`/api/admin/support/tickets/${ticketId}/replies`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ message: `Reply ${i}` });
      expect(ok.status).toBe(201);
    }
    const limited = await request(app)
      .post(`/api/admin/support/tickets/${ticketId}/replies`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ message: 'One too many' });
    expect(limited.status).toBe(429);
  });
});
```

Expected red: 404s — the four admin support routes do not exist yet (`replyStore`/`replyLimiter` already exist from Task 3).

- [ ] **Step 2: Wire admin routes.** In `backend/routes/admin.routes.js`:

  (a) Requires — add after the coupon requires (both paths are relative to `backend/routes/`):

```js
const supportController = require('../controllers/support.controller');
const supportRoutes = require('./support.routes');
```

  (b) Mount AFTER the existing coupon override routes and BEFORE `module.exports`, inside the existing `router.use(protect)` / `router.use(auditMutation())` scope. Do NOT add route-level `auditMutation` overrides (Decision 2 — the global `router.use` would produce a second row):

```js
// Support tickets (spec 2026-09-24). Admin-only per spec; audit comes
// from the router-level auditMutation() + deriveAction support branch.
router.get('/support/tickets', authorize('admin'), supportController.adminListTickets);
router.get(
  '/support/tickets/:id',
  authorize('admin'),
  validateObjectId,
  supportController.adminGetTicket
);
router.post(
  '/support/tickets/:id/replies',
  authorize('admin'),
  validateObjectId,
  supportRoutes.replyLimiter,
  supportController.adminReplyTicket
);
router.put(
  '/support/tickets/:id',
  authorize('admin'),
  validateObjectId,
  supportController.adminUpdateTicketStatus
);
```

- [ ] **Step 3: `deriveAction` support branch.** In `backend/middleware/audit.middleware.js`, `deriveAction(req)` currently does `const p = req.path;` then a generic trailing-segment normalization (`p.replace(/\/[^/]+$/u, '/:id')` — which would turn `/<uuid>/replies` into `/:id/:id`) then the `switch`. Insert the support branch BETWEEN the `const p = req.path;` line and the `const normalized = …` statement (i.e. at the top of the body), so support paths never reach the generic normalizer:

```js
function deriveAction (req) {
  const p = req.path;
  // Support tickets (spec 2026-09-24): handled BEFORE the generic
  // trailing-segment normalization below, which would mangle /:id/replies
  // into /:id/:id. Paths here are router-relative (admin router mount).
  if (p.startsWith('/support/tickets')) {
    const normalized = p
      .replace(/^(\/support\/tickets\/)[^/]+\/replies$/, '$1:id/replies')
      .replace(/^(\/support\/tickets\/)[^/]+$/, '$1:id');
    if (req.method === 'POST' && normalized === '/support/tickets/:id/replies') {
      return 'support_reply';
    }
    if (req.method === 'PUT' && normalized === '/support/tickets/:id') {
      return 'support_status_change';
    }
    // Loud gap: GET/DELETE or a future sub-route needs an explicit case.
    console.warn('audit: unmapped support action', req.method, normalized);
    return null;
  }
  // …rest of the existing function (generic normalization + switch) unchanged…
```

  No JS-side action enum exists (`logActivity` just inserts); the DB CHECK added in Task 1 is the enforcement point — Task 1 already added both values to `ACTIVITY_LOGS_ACTIONS_SQL`.

- [ ] **Step 4: Verify** — `cd backend && npx jest tests/supportAdmin.test.js tests/supportUser.test.js && npm run lint:check`. All green (11 tests in the admin file).

- [ ] **Step 5: Commit** — `feat: admin support API with audit actions`.

---

### Task 5: Frontend API layer — `api.support` + `api.admin` helpers

**Files:**
- Modify: `js/utils/api.js`
- Modify: `js/setup/globals.js` (only if a helper must be re-exported — check `window` exposure; `api` is already global)

**Interfaces:**
- Produces: `api.support.createTicket(data)`, `api.support.listTickets()`, `api.support.getTicket(id)`, `api.support.reply(id, message)`; `api.admin.supportTickets(params)`, `api.admin.supportTicket(id)`, `api.admin.replySupport(id, message)`, `api.admin.updateSupportStatus(id, status)`. All resolve to the FULL response body (`{success, data}`) — callers read `resp.data.*`.
- Consumed by: Tasks 6, 7, 9.

**Steps:**

- [ ] **Step 1: Request/cache behavior.** In `js/utils/api.js`:

  (a) Add the cache exclusion (Decision 9) as an extra `&&` clause in the `cacheable` expression (~:321-328, after the `/csrf/` test). Note `url` is the relative path — the substring `/support/tickets` matches BOTH `/support/tickets…` and `/admin/support/tickets…`, so one clause covers user + admin reads:

```js
      const cacheable =
        !isMutating &&
        !/\/auth\//.test(url) &&
        !/\/(me|confirm)\b/.test(url) &&
        !/\/(my-|mine\b)/.test(url) &&
        !/csrf/.test(url) &&
        // TODO: security review — the GET cache is keyed by URL only (no
        // auth token) and is never cleared on logout; a cached ticket list
        // would replay across sessions. Wishlist/notifications share this
        // pre-existing flaw (out of scope, flagged); support tickets are
        // excluded here because they carry customer PII (spec 2026-09-24).
        !url.includes('/support/tickets');
```

  (b) Add the `support` namespace as a class field AFTER the `notifications` class field. NOTE the class uses `this.get/post/put` helpers (NOT raw `request()`), and `this.get(url, params)` serializes params for you:

```js
  // Support tickets (spec 2026-09-24) — logged-in users only. Reads are
  // excluded from the GET cache inside request() (PII + cross-session).
  support = {
    createTicket: data => this.post('/support/tickets', data),
    listTickets: () => this.get('/support/tickets'),
    getTicket: id => this.get(`/support/tickets/${encodeURIComponent(id)}`),
    reply: (id, message) =>
      this.post(`/support/tickets/${encodeURIComponent(id)}/replies`, { message }),
  };
```

  (c) Add the four admin helpers INSIDE the existing `admin = { … }` class field, after `deleteCoupon`:

```js
    // Support tickets (admin, spec 2026-09-24).
    supportTickets: params => this.get('/admin/support/tickets', params),
    supportTicket: id => this.get(`/admin/support/tickets/${encodeURIComponent(id)}`),
    replySupport: (id, message) =>
      this.post(`/admin/support/tickets/${encodeURIComponent(id)}/replies`, { message }),
    updateSupportStatus: (id, status) =>
      this.put(`/admin/support/tickets/${encodeURIComponent(id)}`, { status }),
```

  Backend accepts `status=all` (controller allows it), empty `q` is ignored server-side, and mutation invalidation (`_invalidateCacheFor`) clears the ticket detail on replies even though support reads never enter the cache.

- [ ] **Step 2: Verify** — root: `npm run lint:check && npx prettier --check "js/**/*.js" "css/**/*.css" && npm run build`. All three pass. (No runtime behavior changes yet — no e2e impact.)

- [ ] **Step 3: Commit** — `feat: api.support and admin support client methods with GET-cache exclusion`.

---

### Task 6: Contact portal — rewrite `renderContact` + FAQ/footer links

**Files:**
- Modify: `js/pages/static-pages.js`
- Modify: `js/pages/pages.js` (remove `_handleContactForm` wrapper :10467-10471)
- Modify: `js/pages/pages.js` (FAQ button `renderFAQ` :10331 → plain `<a href="#/contact">`)
- Modify: `index.html` (:269, :279 footer Contact links `#/faq` → `#/contact`)
- Modify: `js/utils/footer.js` (:208-218 dead block removal)

**Interfaces:**
- Produces: `#/contact` renders (a) signed-out panel with `#/login` link, or (b) signed-in view: `#support-new-form` (select `#support-category`, input `#support-subject`, textarea `#support-body`), `#contact-tickets` list of `.sup-ticket[data-ticket-id]` with `data-action="toggle-thread"`, thread `.sup-thread` with `.sup-msg`/`.sup-msg--admin` rows + `.sup-reply-row[data-reply-form]`. All strings via `SecurityUtils.escapeHtml`.
- Consumed by: Task 9 e2e; users directly.

**Steps:**

- [ ] **Step 1: Rewrite the contact portal in `static-pages.js`.** Context verified: the file has NO imports (everything is an ESLint/`window` global: `api`, `authManager`, `SecurityUtils`, `Formatter`, `showToast`, `Pages`); `renderContact()` takes no container and uses `document.getElementById('main-content')`; `Pages.showOriginalNavFooter()` is called first; templates use inline styles + `<style>` blocks (renderFAQ precedent); `static renderContact()` in pages.js is a pass-through wrapper, so making the implementation `async` is safe (`safeCall` ignores the returned promise; all paths below catch internally so it never rejects).

  (a) DELETE `_handleContactForm` (`static-pages.js:143-148`) and the old fake form (the `<form onsubmit="...">` block at `:111-140`) along with the fake Phone/Location/Hours cards. Add these top-level helpers immediately above `const StaticPageMethods = {`:

```js
// ---- Contact / support portal (spec 2026-09-24) ----

const SUPPORT_CATEGORIES = [
  ['order', 'Order & delivery'],
  ['payment', 'Payment issue'],
  ['verification', 'Student verification'],
  ['product', 'Product listing'],
  ['account', 'Account problem'],
  ['other', 'Something else'],
];

const SUPPORT_STATUS_LABEL = { open: 'Open', pending: 'Pending', resolved: 'Resolved' };

const escSupport = value => SecurityUtils.escapeHtml(String(value == null ? '' : value));

function supportWhen(iso) {
  if (!iso) return '';
  try {
    if (typeof Formatter !== 'undefined' && Formatter.formatTimeAgo) {
      return Formatter.formatTimeAgo(iso);
    }
  } catch (err) {
    console.warn('support: time formatting failed');
  }
  return String(iso);
}
```

  (b) REPLACE `renderContact()` with the code below and ADD the helper methods to `StaticPageMethods` (`_refreshContactTickets`, `_supportTicketRow`, `_supportBadgesHtml`, `_supportRowBadges`, `_supportClick`, `_supportThreadHtml`, `_supportReplyForm`, `_supportSubmit`). Decision 7: every user/admin string goes through `escSupport` at render time (double-escape accepted).

```js
  async renderContact() {
    const mainContent = document.getElementById('main-content');
    Pages.showOriginalNavFooter();
    const signedIn =
      typeof authManager !== 'undefined' && authManager.isLoggedIn && authManager.isLoggedIn();

    mainContent.innerHTML = `
      <div class="container" style="padding: 3rem 1rem; max-width: 800px; margin: 0 auto;">
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">Contact support</h1>
        <p style="color: var(--text-secondary); margin-bottom: 2rem;">Questions about an order, payment or your student verification — we usually reply within 24 hours.</p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2.5rem;">
          <div style="padding: 1.5rem; border: 1px solid var(--border, #e5e7eb); border-radius: 0.75rem;">
            <h3 style="font-weight: 600; margin-bottom: 0.5rem;">Email</h3>
            <p style="color: var(--text-secondary);"><a href="mailto:support@jertscart.com">support@jertscart.com</a></p>
          </div>
          <div style="padding: 1.5rem; border: 1px solid var(--border, #e5e7eb); border-radius: 0.75rem;">
            <h3 style="font-weight: 600; margin-bottom: 0.5rem;">Quick answers</h3>
            <p style="color: var(--text-secondary);"><a href="#/faq">Browse the FAQ</a> — most order and payment questions are answered there.</p>
          </div>
        </div>

        <div id="contact-portal"></div>
      </div>
      <style>
        .sup-ticket { border: 1px solid var(--border, #e5e7eb); border-radius: 0.75rem; margin-bottom: 0.75rem; background: var(--bg-primary, #fff); }
        .sup-ticket-head { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; width: 100%; padding: 1rem; background: none; border: 0; cursor: pointer; text-align: left; font: inherit; }
        .sup-ticket-subject { font-weight: 600; flex: 1 1 auto; }
        .sup-ticket-time { color: var(--text-secondary, #6b7280); font-size: 0.85rem; }
        .sup-badges { display: inline-flex; gap: 0.4rem; }
        .sup-badge { font-size: 0.75rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 999px; }
        .sup-badge--open { background: rgba(0, 70, 190, 0.1); color: #0046be; }
        .sup-badge--pending { background: rgba(217, 119, 6, 0.12); color: #b45309; }
        .sup-badge--resolved { background: rgba(5, 150, 105, 0.12); color: #047857; }
        .sup-badge--order, .sup-badge--payment, .sup-badge--verification,
        .sup-badge--product, .sup-badge--account, .sup-badge--other {
          background: var(--bg-secondary, #f3f4f6); color: var(--text-secondary, #374151);
        }
        .sup-thread { padding: 0 1rem; border-top: 1px solid var(--border, #e5e7eb); }
        .sup-msg { padding: 0.75rem 0; border-bottom: 1px dashed var(--border, #e5e7eb); }
        .sup-msg--admin .sup-msg-meta { color: #0046be; font-weight: 600; }
        .sup-msg-meta { font-size: 0.8rem; color: var(--text-secondary, #6b7280); margin-bottom: 0.25rem; }
        .sup-msg-body { white-space: pre-wrap; color: var(--text-primary, #111827); }
        .sup-reply-row { display: flex; gap: 0.75rem; margin: 0.75rem 0 1rem; align-items: flex-start; }
        .sup-reply-row textarea { flex: 1; }
        .sup-empty { color: var(--text-secondary, #6b7280); padding: 1rem 0; }
        .support-new-form { border: 1px solid var(--border, #e5e7eb); border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 2rem; }
        .contact-signin { border: 1px solid var(--border, #e5e7eb); border-radius: 0.75rem; padding: 2rem; text-align: center; }
      </style>
    `;

    const portal = document.getElementById('contact-portal');
    if (!signedIn) {
      portal.innerHTML = `
        <div class="contact-signin">
          <h2 style="margin-bottom: 0.5rem;">Need a hand?</h2>
          <p style="color: var(--text-secondary); margin-bottom: 1.25rem;">Sign in to contact support — open tickets, track replies and get help with your orders.</p>
          <a class="btn btn-primary" href="#/login">Sign in to contact support</a>
        </div>`;
      window.scrollTo(0, 0);
      return;
    }

    portal.innerHTML = `
      <form id="support-new-form" class="support-new-form" novalidate>
        <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1.25rem;">Open a new ticket</h2>
        <div class="form-group">
          <label for="support-category">Category</label>
          <select id="support-category" required>
            ${SUPPORT_CATEGORIES.map(
              ([value, label]) => `<option value="${value}">${escSupport(label)}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="support-subject">Subject</label>
          <input type="text" id="support-subject" maxlength="200" required placeholder="Brief summary" />
        </div>
        <div class="form-group">
          <label for="support-body">Message</label>
          <textarea id="support-body" rows="5" maxlength="5000" required placeholder="Tell us what happened..."></textarea>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Send ticket</button>
      </form>
      <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">Your tickets</h2>
      <div id="contact-tickets"><p class="sup-empty">Loading…</p></div>
    `;

    // TODO: security review / CSP — event delegation on a stable parent;
    // no inline handlers, no user data interpolated into attributes.
    portal.addEventListener('submit', event => StaticPageMethods._supportSubmit(event, portal));
    portal.addEventListener('click', event => StaticPageMethods._supportClick(event));

    StaticPageMethods._refreshContactTickets(portal);
    window.scrollTo(0, 0);
  },

  async _refreshContactTickets(portal) {
    const list = portal.querySelector('#contact-tickets');
    if (!list) return;
    try {
      const resp = await api.support.listTickets();
      const tickets = (resp && resp.data && resp.data.tickets) || [];
      if (!tickets.length) {
        list.innerHTML = '<p class="sup-empty">No tickets yet — open one above.</p>';
        return;
      }
      list.innerHTML = tickets
        .map(ticket => StaticPageMethods._supportTicketRow(ticket))
        .join('');
    } catch (err) {
      console.warn('support: ticket list failed');
      list.innerHTML = '<p class="sup-empty">Could not load your tickets. Please try again.</p>';
    }
  },

  _supportTicketRow(ticket) {
    const id = ticket._id || ticket.id;
    return `
      <div class="sup-ticket" data-ticket-id="${escSupport(id)}">
        <button type="button" class="sup-ticket-head" data-action="toggle-thread" aria-expanded="false">
          <span class="sup-ticket-subject">${escSupport(ticket.subject)}</span>
          <span class="sup-badges">${StaticPageMethods._supportBadgesHtml(ticket)}</span>
          <span class="sup-ticket-time">${escSupport(supportWhen(ticket.updatedAt))}</span>
        </button>
        <div class="sup-thread" hidden></div>
      </div>`;
  },

  _supportBadgesHtml(ticket) {
    const cat = SUPPORT_CATEGORIES.find(([value]) => value === ticket.category);
    const status = SUPPORT_STATUS_LABEL[ticket.status] ? ticket.status : 'open';
    return `
      <span class="sup-badge sup-badge--${escSupport(ticket.category)}">${escSupport(cat ? cat[1] : ticket.category)}</span>
      <span class="sup-badge sup-badge--${status}">${escSupport(SUPPORT_STATUS_LABEL[status] || status)}</span>`;
  },

  _supportRowBadges(row, ticket) {
    const badges = row.querySelector('.sup-badges');
    if (badges) badges.innerHTML = StaticPageMethods._supportBadgesHtml(ticket);
  },

  async _supportClick(event) {
    const toggle = event.target.closest('[data-action="toggle-thread"]');
    if (!toggle) return;
    const row = toggle.closest('.sup-ticket');
    const thread = row && row.querySelector('.sup-thread');
    if (!row || !thread) return;
    const opening = thread.hasAttribute('hidden');
    if (!opening) {
      thread.setAttribute('hidden', '');
      toggle.setAttribute('aria-expanded', 'false');
      return;
    }
    thread.removeAttribute('hidden');
    toggle.setAttribute('aria-expanded', 'true');
    if (thread.dataset.loaded === 'true') return;
    thread.innerHTML = '<p class="sup-empty">Loading replies…</p>';
    const id = row.getAttribute('data-ticket-id');
    try {
      const resp = await api.support.getTicket(id);
      const data = (resp && resp.data) || {};
      thread.innerHTML =
        StaticPageMethods._supportThreadHtml(data.replies || []) +
        StaticPageMethods._supportReplyForm(id);
      thread.dataset.loaded = 'true';
    } catch (err) {
      console.warn('support: thread load failed');
      thread.innerHTML = '<p class="sup-empty">Could not load replies.</p>';
    }
  },

  _supportThreadHtml(replies) {
    if (!replies.length) return '<p class="sup-empty">No replies yet.</p>';
    return replies
      .map(reply => {
        const admin = reply.authorRole === 'admin';
        return `
        <div class="sup-msg${admin ? ' sup-msg--admin' : ''}">
          <div class="sup-msg-meta">${admin ? 'Support team' : 'You'} · ${escSupport(supportWhen(reply.createdAt))}</div>
          <div class="sup-msg-body">${escSupport(reply.body)}</div>
        </div>`;
      })
      .join('');
  },

  _supportReplyForm(ticketId) {
    return `
      <form class="sup-reply-row" data-reply-form="${escSupport(ticketId)}">
        <textarea rows="2" maxlength="5000" required placeholder="Write a reply..." aria-label="Reply message"></textarea>
        <button type="submit" class="btn btn-primary">Send reply</button>
      </form>`;
  },

  async _supportSubmit(event, portal) {
    const form = event.target;
    if (form.matches('#support-new-form')) {
      event.preventDefault();
      const category = form.querySelector('#support-category').value;
      const subject = form.querySelector('#support-subject').value.trim();
      const message = form.querySelector('#support-body').value.trim();
      if (!subject || !message) {
        showToast('Please add a subject and a message.', 'warning');
        return;
      }
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      try {
        await api.support.createTicket({ category, subject, message });
        showToast('Ticket sent — our team will reply here.', 'success');
        form.reset();
        await StaticPageMethods._refreshContactTickets(portal);
      } catch (err) {
        // api.request already surfaced a generic error toast.
        console.warn('support: create ticket failed');
      } finally {
        if (button) button.disabled = false;
      }
      return;
    }

    if (form.matches('[data-reply-form]')) {
      event.preventDefault();
      const ticketId = form.getAttribute('data-reply-form');
      const textarea = form.querySelector('textarea');
      const message = textarea ? textarea.value.trim() : '';
      if (!message) {
        showToast('Write a message first.', 'warning');
        return;
      }
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      try {
        await api.support.reply(ticketId, message);
        showToast('Reply sent.', 'success');
        const detail = await api.support.getTicket(ticketId);
        const data = (detail && detail.data) || {};
        const row = form.closest('.sup-ticket');
        const thread = row && row.querySelector('.sup-thread');
        if (thread) {
          thread.innerHTML =
            StaticPageMethods._supportThreadHtml(data.replies || []) +
            StaticPageMethods._supportReplyForm(ticketId);
          thread.dataset.loaded = 'true';
        }
        // A user reply reopens resolved/pending threads — refresh the badge.
        if (row && data.ticket) StaticPageMethods._supportRowBadges(row, data.ticket);
      } catch (err) {
        console.warn('support: reply failed');
      } finally {
        if (button) button.disabled = false;
      }
    }
  },
```

- [ ] **Step 2: FAQ + footer.** (a) `pages.js:10331` — replace the inline-handler button with a plain hash link (zero JS, no delegation needed):

```html
<a class="btn btn-primary" href="#/contact">Contact Support</a>
```

  (b) `pages.js` :10467-10471 — delete the `_handleContactForm` wrapper (static-pages no longer defines it).
  (c) `index.html` :269 and :279 — footer "Contact" links `href="#/faq"` → `href="#/contact"`.
  (d) `js/utils/footer.js` :208-218 — delete the dead `a[href="#contact"]` block (hash route never matches a bare `#contact`).

- [ ] **Step 3: Verify** — root: `npm run lint:check && npx prettier --check "js/**/*.js" "css/**/*.css" && npm run build`. If prettier fails on files this task authored: `npm run format`, then re-run all three.

- [ ] **Step 4: Commit** — `feat: contact portal — signed-in ticket list, create form, thread replies`.

---

### Task 7: Admin support manager module + registration

**Files:**
- Create: `js/admin/admin-support.js`
- Modify: `js/app-init.js` (admin module list, after `admin-verifications`)
- Modify: `.eslintrc.json` (globals)

**Interfaces:**
- Produces: `window.adminSupportManager` with `list(params)`, `getThread(id)`, `reply(id, message)`, `setStatus(id, status)`, `getOpenCount(force?)` (30s TTL, fail-soft). Fires `module-loaded`.
- Consumed by: Task 8 (`Pages.renderAdminSupport`/`renderAdminSupportDetail`/`refreshSupportBadge`), Task 9 (e2e badge).

**Steps:**

- [ ] **Step 1: Create the manager.** New file `js/admin/admin-support.js` (pattern: admin-verifications.js — class + self-expose; NO localStorage persistence, ticket bodies are PII):

```js
/* exported adminSupportManager */
// ============================================
// ADMIN SUPPORT MODULE - Ticket queue & threads
// ============================================
// TODO: security review — ticket subjects/bodies are user-generated
// content (PII): never persist them client-side, always escape at
// render time (the Pages renderers own escaping).

class AdminSupportManager {
  constructor() {
    this._initialized = false;
    this._openCount = null;
    this._openCountAt = 0;
  }

  async init() {
    if (this._initialized) {
      return;
    }
    this._initialized = true;
  }

  // GET /admin/support/tickets — server-side filter/search/pagination.
  // Resolves to the FULL body: { data: { tickets, total, openCount, page, pageSize } }.
  list(params = {}) {
    return api.admin.supportTickets(params);
  }

  // GET /admin/support/tickets/:id — { data: { ticket, replies, userEmail } }.
  getThread(id) {
    return api.admin.supportTicket(id);
  }

  // POST /admin/support/tickets/:id/replies — { data: { reply, ticket, emailSent } }.
  reply(id, message) {
    return api.admin.replySupport(id, message);
  }

  // PUT /admin/support/tickets/:id — { data: { ticket } }.
  setStatus(id, status) {
    return api.admin.updateSupportStatus(id, status);
  }

  // Sidebar badge count with a 30s TTL. Fails soft — the badge is
  // decorative and must never break an admin page render.
  async getOpenCount(force = false) {
    const TTL_MS = 30000;
    if (!force && this._openCount !== null && Date.now() - this._openCountAt < TTL_MS) {
      return this._openCount;
    }
    try {
      const resp = await api.admin.supportTickets({ status: 'all', pageSize: 1 });
      const data = (resp && resp.data) || {};
      this._openCount = typeof data.openCount === 'number' ? data.openCount : 0;
      this._openCountAt = Date.now();
    } catch (err) {
      console.warn('support: open-count fetch failed');
    }
    return this._openCount || 0;
  }
}

const adminSupportManager = new AdminSupportManager();

window.adminSupportManager = adminSupportManager;
if (typeof dispatchEvent !== 'undefined') {
  dispatchEvent(new Event('module-loaded', { detail: 'AdminSupportManager' }));
}
```

- [ ] **Step 2: Register the module.** In `js/app-init.js`, inside the `admin: [ … ]` array, add after the `admin-verifications` entry:

```js
    { name: 'admin-support', file: 'js/admin/admin-support.js', exposes: ['adminSupportManager'] },
```

- [ ] **Step 3: ESLint global.** In `.eslintrc.json` globals (next to `adminVerificationsManager` :105), add:

```json
    "adminSupportManager": "readonly",
```

- [ ] **Step 4: Verify** — root: `npm run lint:check && npx prettier --check "js/**/*.js" "css/**/*.css" && npm run build`. All three pass (module is registered but not yet called by pages — no runtime impact).

- [ ] **Step 5: Commit** — `feat: admin support manager module with open-count TTL cache`.

---

### Task 8: Admin Support page — sidebar badge, routes, list + detail renderers

**Files:**
- Modify: `js/pages/pages.js`

**Interfaces:**
- Produces: sidebar item `{ key: 'support', label: 'Support', icon: Icons.help }` (nav keys auto-route via `router.navigate('/admin/' + key)`); `AdminUI.wireSidebar` end-hook calling `Pages.refreshSupportBadge()`; `Pages.refreshSupportBadge()` (DOM patch of `[data-adm-nav="support"] .adm-nav-badge`); routes `/admin/support` + `/admin/support/:id`; `Pages.renderAdminSupport(filter)`; `Pages.renderAdminSupportDetail(id)` — host IDs `#admin-support-card-host`, `#admin-support-search`, `tr[data-ticket-id]`, `#admin-support-detail-host`, `#admin-support-reply-form`, `data-adm-support-action="back|resolve|reopen"`.
- Consumed by: Task 9 e2e; admin users.

**Steps:**

- [ ] **Step 1: Sidebar item + badge hook.**

  (a) In `AdminUI.sidebar` Operations items (after `{ key: 'payouts', … }`, pages.js:145), add:

```js
          { key: 'support', label: 'Support', icon: Icons.help },
```

  (b) At the END of `AdminUI.wireSidebar(onNavigate)` (after the logout `else if` block closes and the `if (sidebar) { … }` block closes, before the closing `}` of the method, pages.js ~:403), add:

```js
    // Support badge (spec 2026-09-24): single "layout rendered" hook —
    // wireSidebar runs on every admin page, so the badge stays fresh
    // without patching 14 renderers.
    if (typeof Pages !== 'undefined' && typeof Pages.refreshSupportBadge === 'function') {
      Pages.refreshSupportBadge();
    }
```

  (c) Add the static method to the `Pages` class (next to the other static admin helpers, e.g. right before `renderAdminPayouts`):

```js
  // Support badge (spec 2026-09-24): patch the sidebar badge in place.
  // Count + 30s TTL live in adminSupportManager; fail soft.
  static async refreshSupportBadge() {
    if (typeof adminSupportManager === 'undefined') {
      return;
    }
    try {
      const count = await adminSupportManager.getOpenCount();
      const item = document.querySelector('[data-adm-nav="support"]');
      if (!item) {
        return;
      }
      const badge = item.querySelector('.adm-nav-badge');
      if (count > 0) {
        if (badge) {
          badge.textContent = String(count);
        } else {
          const span = document.createElement('span');
          span.className = 'adm-nav-badge';
          span.textContent = String(count);
          item.appendChild(span);
        }
      } else if (badge) {
        badge.remove();
      }
    } catch (err) {
      console.warn('support: badge refresh failed');
    }
  }
```

- [ ] **Step 2: Routes.** In the route-registration block (after `router.register('/admin/coupons', …)`, pages.js:1049), add:

```js
    router.register('/admin/support', params => safeCall('renderAdminSupport', params && params.filter));
    router.register('/admin/support/:id', params => safeCall('renderAdminSupportDetail', params.id));
```

- [ ] **Step 3: List renderer.** Add `static async renderAdminSupport(filter)` to `Pages` (place after `renderAdminPayouts`, following its structure: `_requireAdmin` guard → admin user guard → `hideOriginalNavFooter` → mainContent shell → `wireSidebar` → `paint()` → delegated handlers). Full code:

```js
  static async renderAdminSupport(filter) {
    if (!_requireAdmin()) {
      return;
    }
    const adminUser =
      (typeof adminAuthManager !== 'undefined' && adminAuthManager.getCurrentUser?.()) || null;
    if (!adminUser) {
      this.renderAdminLogin();
      return;
    }

    this.hideOriginalNavFooter();
    document.body.style.background = '';

    const mainContent = document.getElementById('main-content');
    const qs = (typeof router !== 'undefined' && router.getParams()) || {};
    const allowedFilters = ['all', 'open', 'pending', 'resolved'];
    const initialFilter = allowedFilters.includes(filter)
      ? filter
      : allowedFilters.includes(qs.filter)
        ? qs.filter
        : 'all';
    this._supportFilter = initialFilter;
    const state = {
      pill: initialFilter,
      q: typeof qs.q === 'string' ? qs.q : '',
      page: 1,
      pageSize: 20,
      rows: [],
      total: 0,
      openCount: 0,
      loading: true,
      loadError: null,
    };

    const topbarActions = `
      <div class="adm-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" placeholder="Search subject, email or name" aria-label="Search support tickets" id="admin-support-search" value="${_pageEsc(state.q)}" />
      </div>
    `;

    mainContent.innerHTML = `
      <div class="adm-layout">
        ${AdminUI.sidebar('support')}
        <div class="adm-main">
          ${AdminUI.topbar('Support', topbarActions)}
          <div class="adm-page">
            ${AdminUI.pageHeader('Support tickets', 'Customer contact tickets — reply and update status.', null)}
            <div id="admin-support-card-host"></div>
          </div>
        </div>
      </div>
    `;

    AdminUI.wireSidebar(key => {
      router.navigate('/admin/' + key);
    });

    const statusToBadgeKind = { open: 'info', pending: 'warning', resolved: 'success' };

    const supportColumns = [
      {
        label: 'Subject',
        render: t =>
          `<span class="adm-text-strong">${_pageEsc(t.subject || '')}</span>
           <div class="adm-text-muted" style="font-size:0.75rem;">${_pageEsc(
             t.category ? Formatter.capitalize(t.category) : ''
           )}</div>`,
      },
      {
        label: 'Requester',
        render: t => `
          <div class="adm-text-strong">${_pageEsc(t.userName || 'Unknown user')}</div>
          <div class="adm-text-muted" style="font-size:0.75rem;">${_pageEsc(t.userEmail || '')}</div>`,
      },
      {
        label: 'Status',
        render: t => {
          const kind = statusToBadgeKind[t.status] || 'neutral';
          const label = t.status ? Formatter.capitalize(t.status) : '—';
          return `<span class="adm-badge adm-badge--${kind}">${_pageEsc(label)}</span>`;
        },
      },
      { label: 'Updated', render: t => _pageEsc(Formatter.formatTimeAgo(t.updatedAt)) },
      {
        label: 'Actions',
        render: t => {
          const id = t.id || t._id || '';
          return `<a class="adm-btn adm-btn--sm" href="#/admin/support/${encodeURIComponent(
            id
          )}" data-adm-support-action="open" data-ticket-id="${_pageEsc(id)}">Open</a>`;
        },
      },
    ];

    const cardHost = document.getElementById('admin-support-card-host');

    const load = async () => {
      state.loading = true;
      paint();
      try {
        const resp = await adminSupportManager.list({
          status: state.pill,
          q: state.q.trim(),
          page: state.page,
          pageSize: state.pageSize,
        });
        const data = (resp && resp.data) || {};
        state.rows = data.tickets || [];
        state.total = data.total || 0;
        state.openCount = data.openCount || 0;
        state.loadError = null;
        // Keep the badge cache warm from the list we just fetched.
        if (typeof adminSupportManager !== 'undefined') {
          adminSupportManager._openCount = state.openCount;
          adminSupportManager._openCountAt = Date.now();
        }
      } catch (err) {
        state.rows = [];
        state.loadError = 'Could not reach the server.';
      } finally {
        state.loading = false;
        paint();
      }
    };

    const paint = () => {
      const pillTabs = [
        { key: 'open', label: 'Open' },
        { key: 'pending', label: 'Pending' },
        { key: 'resolved', label: 'Resolved' },
        { key: 'all', label: `All (${state.total})` },
      ];
      const pillSelector = AdminUI.pillGroup(
        pillTabs,
        state.pill,
        'adm-pill-group--inverse',
        'data-support-filter'
      );
      const cardTitle = `<h3 class="adm-card-title">Tickets</h3><p class="adm-card-sub">${
        state.loading
          ? 'Loading tickets…'
          : `${state.total} ticket${state.total === 1 ? '' : 's'}${state.q.trim() ? ' matching search' : ''}`
      }</p>`;
      const tableHtml = state.loading
        ? AdminUI.tableSkeleton({ columns: supportColumns.length, rows: 6 })
        : AdminUI.table({
            columns: supportColumns,
            rows: state.rows,
            rowAttr: row => ` data-ticket-id="${_pageEsc(row.id || row._id || '')}"`,
            emptyHtml: `<tr><td class="adm-td" colspan="${supportColumns.length}">${AdminUI.emptyState({
              icon: Icons.help || '',
              title: 'No support tickets',
              body: state.loadError
                ? `${state.loadError} Offline or server unreachable.`
                : 'No tickets match this view.',
            })}</td></tr>`,
            footerHtml: AdminUI.paginationFooter({
              total: state.total,
              page: state.page,
              pageSize: state.pageSize,
            }),
          });
      if (cardHost) {
        cardHost.innerHTML = AdminUI.card(cardTitle, tableHtml, pillSelector);
      }

      AdminUI.wirePillGroup(cardHost && cardHost.querySelector('.adm-pill-group'), key => {
        state.pill = key;
        Pages._supportFilter = key;
        state.page = 1;
        router.updateUrl('/admin/support', { filter: key });
        load();
      });
    };

    // Delegated handlers on the stable page wrapper — survive re-renders.
    const page = mainContent.querySelector('.adm-page');
    if (page) {
      page.addEventListener('click', e => {
        const pg = e.target.closest('[data-adm-page]');
        if (pg && !pg.disabled) {
          state.page = Number(pg.dataset.admPage) || 1;
          load();
        }
      });
    }

    const searchInput = document.getElementById('admin-support-search');
    if (searchInput) {
      AdminUI.wireSearch(searchInput, value => {
        state.q = value || '';
        state.page = 1;
        const qq = state.q.trim();
        router.updateUrl('/admin/support', qq ? { filter: state.pill, q: qq } : { filter: state.pill }, true);
        load();
      });
    }

    await load();
  }
```

  Notes: status badge map uses `adm-badge--info/warning/success` — all three verified present (admin.css:2432-2448). `Icons.help` exists (icons.js:201). The `Open` action is a plain hash link — the router's history-mode hash-click interceptor (`_interceptHashClick`) routes it. The `<style>` block is required: `.sup-msg*` styles otherwise only exist after `#/contact` has rendered once (FAQ-inline-style precedent).

- [ ] **Step 4: Detail renderer.** Add `static async renderAdminSupportDetail(id)` to `Pages`:

```js
  static async renderAdminSupportDetail(id) {
    if (!_requireAdmin()) {
      return;
    }
    const adminUser =
      (typeof adminAuthManager !== 'undefined' && adminAuthManager.getCurrentUser?.()) || null;
    if (!adminUser) {
      this.renderAdminLogin();
      return;
    }

    this.hideOriginalNavFooter();
    document.body.style.background = '';

    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
      <div class="adm-layout">
        ${AdminUI.sidebar('support')}
        <div class="adm-main">
          ${AdminUI.topbar('Support')}
          <div class="adm-page">
            ${AdminUI.pageHeader('Ticket', 'Loading ticket…', null)}
            <div id="admin-support-detail-host">${AdminUI.tableSkeleton({ columns: 1, rows: 3 })}</div>
          </div>
        </div>
      </div>
    `;

    AdminUI.wireSidebar(key => {
      router.navigate('/admin/' + key);
    });

    const host = document.getElementById('admin-support-detail-host');
    const esc = _pageEsc;
    let data = null;
    try {
      const resp = await adminSupportManager.getThread(id);
      data = (resp && resp.data) || null;
    } catch (err) {
      data = null;
    }

    if (!data || !data.ticket) {
      if (host) {
        host.innerHTML = AdminUI.card(
          '<h3 class="adm-card-title">Ticket not found</h3>',
          `<div style="padding:1rem;">${AdminUI.emptyState({
            icon: Icons.help || '',
            title: 'Ticket not found',
            body: 'It may have been deleted with the owner account.',
          })}</div>`
        );
      }
      return;
    }

    const ticket = data.ticket;
    const replies = data.replies || [];
    const statusKind = { open: 'info', pending: 'warning', resolved: 'success' }[ticket.status] || 'neutral';
    const canResolve = ticket.status !== 'resolved';
    const canReopen = ticket.status === 'resolved';

    const threadHtml = replies
      .map(reply => {
        const admin = reply.authorRole === 'admin';
        return `
          <div class="sup-msg${admin ? ' sup-msg--admin' : ''}">
            <div class="sup-msg-meta">${admin ? 'Support team' : 'Customer'} · ${esc(
              Formatter.formatTimeAgo(reply.createdAt)
            )}</div>
            <div class="sup-msg-body">${esc(reply.body)}</div>
          </div>`;
      })
      .join('');

    const actionsHtml = `
      <div style="display:flex; gap:0.75rem; flex-wrap:wrap; margin-top:1rem;">
        <a class="adm-btn adm-btn--sm" href="#/admin/support" data-adm-support-action="back">Back to list</a>
        ${
          canResolve
            ? '<button type="button" class="adm-btn adm-btn--sm" data-adm-support-action="resolve">Mark resolved</button>'
            : ''
        }
        ${
          canReopen
            ? '<button type="button" class="adm-btn adm-btn--sm" data-adm-support-action="reopen">Reopen</button>'
            : ''
        }
      </div>
    `;

    const cardBody = `
      <style>
        .sup-thread { border-top: 1px solid var(--border, #e5e7eb); }
        .sup-msg { padding: 0.75rem 0; border-bottom: 1px dashed var(--border, #e5e7eb); }
        .sup-msg--admin .sup-msg-meta { color: #0046be; font-weight: 600; }
        .sup-msg-meta { font-size: 0.8rem; color: var(--text-secondary, #6b7280); margin-bottom: 0.25rem; }
        .sup-msg-body { white-space: pre-wrap; color: var(--text-primary, #111827); }
        .sup-reply-row { display: flex; gap: 0.75rem; align-items: flex-start; }
        .sup-reply-row textarea { flex: 1; }
        .sup-empty { color: var(--text-secondary, #6b7280); padding: 1rem 0; }
      </style>
      <div style="padding:1.25rem;">
        <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap; margin-bottom:0.5rem;">
          <span class="adm-badge adm-badge--${statusKind}">${esc(Formatter.capitalize(ticket.status))}</span>
          <span class="adm-text-muted">${esc(Formatter.capitalize(ticket.category || ''))}</span>
          <span class="adm-text-muted">·</span>
          <span class="adm-text-muted">${esc(ticket.userEmail || '')}</span>
          <span class="adm-text-muted">·</span>
          <span class="adm-text-muted">${esc(Formatter.formatTimeAgo(ticket.updatedAt))}</span>
        </div>
        <div class="sup-thread" style="margin-top:0.75rem;">
          ${threadHtml || '<p class="sup-empty">No replies yet.</p>'}
        </div>
        <form id="admin-support-reply-form" class="sup-reply-row" style="margin-top:1rem;">
          <textarea class="form-control" rows="3" maxlength="5000" required
            placeholder="Write a reply to the customer..." aria-label="Reply message"></textarea>
          <button type="submit" class="adm-btn adm-btn--sm adm-btn--primary">Send reply</button>
        </form>
        ${actionsHtml}
      </div>
    `;

    if (host) {
      host.innerHTML = AdminUI.card(
        `<h3 class="adm-card-title">${esc(ticket.subject || '')}</h3><p class="adm-card-sub">Ticket ${esc(
          ticket.id || ticket._id || ''
        )}</p>`,
        cardBody
      );
    }

    // TODO: security review / CSP — delegation on the stable host; all
    // ticket strings escaped above at render time (spec §3).
    const stableHost = host || mainContent;
    stableHost.addEventListener('click', async e => {
      const btn = e.target.closest('[data-adm-support-action]');
      if (!btn) return;
      // stopPropagation is NOT used (we still want the router's hash
      // interceptor skipped, not the event suppressed for children);
      // preventDefault makes _interceptHashClick bail so the "back" link
      // navigates exactly once (our handler owns it).
      e.preventDefault();
      const action = btn.dataset.admSupportAction;
      if (action === 'back') {
        router.navigate('/admin/support');
        return;
      }
      if (action === 'resolve' || action === 'reopen') {
        const status = action === 'resolve' ? 'resolved' : 'open';
        btn.disabled = true;
        try {
          await adminSupportManager.setStatus(id, status);
          showToast(
            status === 'resolved' ? 'Ticket marked as resolved.' : 'Ticket reopened.',
            'success'
          );
          Pages.renderAdminSupportDetail(id);
        } catch (err) {
          showToast('Could not update the ticket.', 'error');
          btn.disabled = false;
        }
      }
    });

    const replyForm = document.getElementById('admin-support-reply-form');
    if (replyForm) {
      replyForm.addEventListener('submit', async e => {
        e.preventDefault();
        const textarea = replyForm.querySelector('textarea');
        const message = textarea ? textarea.value.trim() : '';
        if (!message) {
          showToast('Write a reply first.', 'warning');
          return;
        }
        const submitBtn = replyForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        try {
          const resp = await adminSupportManager.reply(id, message);
          const emailSent = Boolean(resp && resp.data && resp.data.emailSent);
          showToast(
            emailSent ? 'Reply sent and emailed to the customer.' : 'Reply saved — email not sent.',
            'success'
          );
          Pages.renderAdminSupportDetail(id);
        } catch (err) {
          showToast('Could not send the reply.', 'error');
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }
  }
```

  Notes: the reply textarea uses the global `.form-control` (css/components/forms.css:25) — there is NO `.adm-input` class in this codebase. Never log reply bodies; toast copy is fixed strings only.

- [ ] **Step 5: Verify** — root: `npm run lint:check && npx prettier --check "js/**/*.js" "css/**/*.css" && npm run build`. If prettier flags pages.js: `npm run format`, re-run all three. Manual smoke (both services up): admin login → sidebar shows Support → queue renders → open ticket → reply → status toggles.

- [ ] **Step 6: Commit** — `feat: admin support queue and ticket detail pages with sidebar badge`.

---

### Task 9: E2E — user portal + admin queue (hermetic)

**Files:**
- Create: `e2e/support-contact.spec.js`
- Create: `e2e/admin-support.spec.js`

**Interfaces:**
- Produces: two Playwright specs, chromium only, fully mocked APIs (no seed-state dependence).
- Consumed by: Task 10 full-suite gate.

**Steps:**

- [ ] **Step 1: User portal spec.** Create `e2e/support-contact.spec.js`:

```js
const { test, expect } = require('@playwright/test');

// Hermetic contact-portal tests (spec 2026-09-24). Every /api/** call is
// mocked so the suite does not depend on backend seed state. The catch-all
// is registered FIRST — Playwright routes match the most recently
// registered handler, so the specific mocks below win.
//
// Shape must match authManager.saveSession (flat user + token + expiresAt;
// role stays 'buyer' or loadSession rejects it into the admin store).

const SESSION_KEY = 'unihub_session';

const baseUser = {
  id: 'e2e-support-user',
  fullName: 'E2E Supporter',
  email: 'e2e_support@example.com',
  phone: '+233200000002',
  university: 'atu',
  level: '300',
  role: 'buyer',
  isVerified: true,
};

const json = body => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

async function setup(page, { signedIn = true } = {}) {
  await page.addInitScript(() => {
    window.API_URL = 'http://localhost:5000/api';
  });
  if (signedIn) {
    await page.addInitScript(
      ({ key, user }) => {
        window.localStorage.setItem(
          key,
          JSON.stringify({
            token: 'e2e-fake-token',
            user,
            expiresAt: Date.now() + 60 * 60 * 1000,
          })
        );
      },
      { key: SESSION_KEY, user: baseUser }
    );
  }

  await page.route('**/api/**', route =>
    route.fulfill(json({ success: true, data: {} }))
  );
  await page.route('**/api/auth/me', route =>
    route.fulfill(json({ success: true, data: { user: baseUser } }))
  );
}

// Scope covers list, detail and replies — branch on method + path.
async function mockSupportApi(page) {
  const ticketA = {
    id: 'e2e-tkt-1',
    userId: baseUser.id,
    category: 'payment',
    subject: 'MoMo payment stuck',
    status: 'open',
    createdAt: '2026-09-24 09:00:00',
    updatedAt: '2026-09-24 09:05:00',
  };
  const state = {
    tickets: [ticketA],
    replies: [
      {
        id: 'e2e-rep-1',
        ticketId: 'e2e-tkt-1',
        authorId: baseUser.id,
        authorRole: 'user',
        body: 'I paid with MoMo and the order is still pending.',
        createdAt: '2026-09-24 09:00:00',
      },
    ],
  };

  await page.route('**/api/support/tickets*', route => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const method = req.method();
    const isDetail = /\/api\/support\/tickets\/[^/]+$/.test(path);
    const isReply = /\/replies$/.test(path);

    if (method === 'GET' && isDetail) {
      return route.fulfill(
        json({ success: true, data: { ticket: state.tickets[0], replies: state.replies } })
      );
    }
    if (method === 'GET') {
      return route.fulfill(json({ success: true, data: { tickets: state.tickets } }));
    }
    if (method === 'POST' && !isReply) {
      const body = JSON.parse(req.postData() || '{}');
      const created = {
        ...state.tickets[0],
        id: 'e2e-tkt-new',
        category: body.category,
        subject: body.subject,
        status: 'open',
        updatedAt: '2026-09-24 10:00:00',
      };
      state.tickets = [created, ...state.tickets];
      return route.fulfill(json({ success: true, data: { ticket: created } }));
    }
    if (method === 'POST' && isReply) {
      const body = JSON.parse(req.postData() || '{}');
      const reply = {
        id: 'e2e-rep-new',
        ticketId: 'e2e-tkt-1',
        authorId: baseUser.id,
        authorRole: 'user',
        body: body.message,
        createdAt: '2026-09-24 10:05:00',
      };
      state.replies = [...state.replies, reply];
      return route.fulfill(
        json({ success: true, data: { reply, ticket: { ...state.tickets[0], status: 'open' } } })
      );
    }
    return route.fulfill(json({ success: true, data: {} }));
  });
  return state;
}

test.describe('Support contact portal', () => {
  test('signed-out visitors see the sign-in panel, not a fake form', async ({ page }) => {
    await setup(page, { signedIn: false });
    await page.goto('/#/contact');

    await expect(page.getByRole('heading', { name: 'Contact support' })).toBeVisible();
    const signIn = page.getByRole('link', { name: 'Sign in to contact support' });
    await expect(signIn).toBeVisible();
    await expect(signIn).toHaveAttribute('href', '#/login');
    await expect(page.locator('#support-new-form')).toHaveCount(0);
    // Fake phone card removed (spec: email + FAQ only).
    await expect(page.getByText('+233 50 123 4567')).toHaveCount(0);
  });

  test('signed-in users get the create form and their ticket list', async ({ page }) => {
    await setup(page);
    await mockSupportApi(page);
    await page.goto('/#/contact');

    await expect(page.locator('#support-new-form')).toBeVisible();
    await expect(page.locator('#support-category option')).toHaveCount(6);
    await expect(page.locator('#contact-tickets .sup-ticket')).toHaveCount(1);
    await expect(page.locator('#contact-tickets')).toContainText('MoMo payment stuck');
  });

  test('creating a ticket posts the form and refreshes the list', async ({ page }) => {
    await setup(page);
    await mockSupportApi(page);
    await page.goto('/#/contact');

    await page.selectOption('#support-category', 'payment');
    await page.fill('#support-subject', 'Refund not received');
    await page.fill('#support-body', 'I want my money back.');
    await page.click('#support-new-form button[type="submit"]');

    await expect(page.locator('.uni-toast-item').filter({ hasText: 'Ticket sent' })).toBeVisible();
    await expect(page.locator('#contact-tickets')).toContainText('Refund not received');
  });

  test('thread toggles, lazy-loads detail, and replies', async ({ page }) => {
    await setup(page);
    await mockSupportApi(page);
    await page.goto('/#/contact');

    await page.click('.sup-ticket[data-ticket-id="e2e-tkt-1"] [data-action="toggle-thread"]');
    await expect(page.locator('.sup-thread .sup-msg')).toHaveCount(1);
    await expect(page.locator('.sup-thread')).toContainText('I paid with MoMo.');

    await page.fill('.sup-reply-row textarea', 'Any update on this?');
    await page.click('.sup-reply-row button[type="submit"]');
    await expect(page.locator('.uni-toast-item').filter({ hasText: 'Reply sent' })).toBeVisible();
    await expect(page.locator('.sup-thread .sup-msg')).toHaveCount(2);
    await expect(page.locator('.sup-thread')).toContainText('Any update on this?');
  });

  test('FAQ Contact Support link navigates to the contact page', async ({ page }) => {
    await setup(page, { signedIn: false });
    await page.goto('/#/faq');

    await page.getByRole('link', { name: 'Contact Support' }).click();
    await expect(page).toHaveURL(/\/contact/);
    await expect(page.getByRole('heading', { name: 'Contact support' })).toBeVisible();
  });
});
```

- [ ] **Step 2: Admin spec.** Create `e2e/admin-support.spec.js`:

```js
const { test, expect } = require('@playwright/test');
const { injectAdminSession } = require('./helpers/admin-auth');

// Hermetic admin support tests (spec 2026-09-24 §Test decisions).
// injectAdminSession FIRST: it performs the real privileged login against
// the local backend (NODE_ENV=test devCode) and injects the flat admin
// session before any app code runs. Then all browser /api/** calls are
// mocked — most recently registered route wins, so the support mocks
// below take precedence over the catch-all.

const json = body => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

const adminTicket = {
  id: 'e2e-adm-tkt-1',
  userId: 'e2e-support-user',
  category: 'payment',
  subject: 'Checkout error at payment step',
  status: 'open',
  userEmail: 'customer@example.com',
  userName: 'Customer One',
  createdAt: '2026-09-24 09:00:00',
  updatedAt: '2026-09-24 09:10:00',
};

async function mockAdminSupport(page, { replies = [] } = {}) {
  // Stateful: a POSTed reply lands in `thread` so the detail refetch
  // after the reply actually shows it (spec §Test decisions).
  const thread = [...replies];
  await page.route('**/api/**', route => route.fulfill(json({ success: true, data: {} })));
  await page.route('**/api/admin/support/tickets*', route => {
    const path = new URL(route.request().url()).pathname;
    if (/\/api\/admin\/support\/tickets\/[^/]+$/.test(path)) {
      return route.fulfill(
        json({
          success: true,
          data: { ticket: adminTicket, replies: thread, userEmail: adminTicket.userEmail },
        })
      );
    }
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      const reply = {
        id: 'e2e-adm-rep-new',
        ticketId: adminTicket.id,
        authorId: 'e2e-admin',
        authorRole: 'admin',
        body: body.message,
        createdAt: '2026-09-24 10:00:00',
      };
      thread.push(reply);
      return route.fulfill(
        json({
          success: true,
          data: { reply, ticket: { ...adminTicket, status: 'pending' }, emailSent: true },
        })
      );
    }
    return route.fulfill(
      json({
        success: true,
        data: { tickets: [adminTicket], total: 1, openCount: 2, page: 1, pageSize: 20 },
      })
    );
  });
}

test.describe('Admin support queue', () => {
  test('queue renders rows and the sidebar badge shows the open count', async ({ page }) => {
    await injectAdminSession(page);
    await mockAdminSupport(page);

    await page.goto('/#/admin/support');
    await expect(page.locator('tr[data-ticket-id="e2e-adm-tkt-1"]')).toBeVisible();
    await expect(page.locator('tr[data-ticket-id="e2e-adm-tkt-1"]')).toContainText(
      'Checkout error at payment step'
    );
    await expect(page.locator('[data-adm-nav="support"] .adm-nav-badge')).toHaveText('2');
  });

  test('opening a ticket routes to the detail thread with reply form', async ({ page }) => {
    await injectAdminSession(page);
    await mockAdminSupport(page, {
      replies: [
        {
          id: 'e2e-adm-rep-1',
          ticketId: adminTicket.id,
          authorId: adminTicket.userId,
          authorRole: 'user',
          body: 'I paid with MoMo and the order is still pending.',
          createdAt: '2026-09-24 09:00:00',
        },
      ],
    });

    await page.goto('/#/admin/support');
    await page.click('tr[data-ticket-id="e2e-adm-tkt-1"] a[href^="#/admin/support/"]');

    // History mode strips the hash on dispatch (replaceState in
    // handleUrlChange) — assert the clean path, like product-detail.spec.
    await expect(page).toHaveURL(/\/admin\/support\/e2e-adm-tkt-1/);
    await expect(page.locator('#admin-support-detail-host')).toContainText(
      'Checkout error at payment step'
    );
    await expect(page.locator('.sup-msg')).toContainText('I paid with MoMo.');
    await expect(page.locator('#admin-support-reply-form textarea')).toBeVisible();
    await expect(page.locator('[data-adm-support-action="back"]')).toBeVisible();
    await expect(page.locator('[data-adm-support-action="resolve"]')).toBeVisible();
  });

  test('admin reply posts, toasts, and re-renders the thread', async ({ page }) => {
    await injectAdminSession(page);
    await mockAdminSupport(page);

    await page.goto('/#/admin/support/e2e-adm-tkt-1');
    await expect(page.locator('#admin-support-reply-form')).toBeVisible();

    await page.fill('#admin-support-reply-form textarea', 'We are checking with the provider.');
    await page.click('#admin-support-reply-form button[type="submit"]');

    await expect(page.locator('.uni-toast-item').filter({ hasText: 'emailed' })).toBeVisible();
    await expect(page.locator('#admin-support-detail-host')).toContainText(
      'We are checking with the provider.'
    );
  });
});
```

- [ ] **Step 3: Verify** — from repo root with both services running (or let Playwright's webServer start them): `npx playwright test e2e/support-contact.spec.js e2e/admin-support.spec.js`. All 8 tests green. If the admin badge test fails on `toHaveText('2')`, first confirm `refreshSupportBadge` fires from `wireSidebar` and that the list mock's `openCount` path (`status=all&pageSize=1`) hits the `**/api/admin/support/tickets*` route.

- [ ] **Step 4: Commit** — `test: e2e specs for contact portal and admin support queue`.

---

### Task 10: Full gates + cache-bump + final review

**Files:**
- Modify: `js/app-init.js` (`MODULE_VERSION '37' → '38'`, ~:141)
- Modify: `vite.config.js` (`APP_INIT_VERSION '38' → '39'`, :10)
- Modify: `index.html` (`?v=38` → `?v=39`, :318)

**Steps:**

- [ ] **Step 1: Backend gates** — `cd backend && npm run lint:check && npm test`. Expect 34 suites (30 baseline + supportSchema, supportDeletion, supportUser, supportAdmin), all passing, 0 lint errors. If a suite count differs, check for silently-skipped files.

- [ ] **Step 2: Frontend gates** — repo root: `npm run lint:check && npx prettier --check "js/**/*.js" "css/**/*.css" && npm run build`. All three must pass (`npm run format` fallback, then re-run). `npm run build` must exit 0.

- [ ] **Step 3: E2E full suite** — `npx playwright test --workers=1`. Everything green (existing specs + the 8 new ones).

- [ ] **Step 4: Grep for leftovers** (all must return nothing / expected):

```bash
grep -rn "_handleContactForm" js/                 # must be empty
grep -rn "onclick=\|onsubmit=" js/pages/static-pages.js   # must be empty
grep -rn "123 4567" js/                            # fake phone gone
grep -n "MODULE_VERSION" js/app-init.js            # '38' after bump
grep -n "APP_INIT_VERSION" vite.config.js          # '39' after bump
grep -n "app-init.js?v=" index.html                # ?v=39 after bump
```

- [ ] **Step 5: Cache triple bump** — apply the three version edits above, then re-run `npm run build` (the build rewrites `dist/index.html` from the source tag, so bump BEFORE the final build).

- [ ] **Step 6: Final self-review** (AGENTS.md RCI):
  - Every rendered string in `static-pages.js` / the two admin renderers passes through `escSupport`/`_pageEsc` (spec §3) — spot-check `ticket.subject`, `reply.body`, `userEmail`.
  - No new inline handlers; the FAQ button is an `<a href>`; delegation only in the portal/admin detail.
  - No ticket content in console/Sentry/toasts (fixed toast strings only); email subject CRLF-stripped; email sent only to the ticket owner.
  - No new dependencies; no raw `fetch` outside `api.js`; CSRF still flows through `api.request`.
  - Rate-limit stores exported and reset in tests; audit rows asserted exactly once per mutation.
  - AI-sensitive zones (`admin.routes.js`, `audit.middleware.js`, email path) flagged with `// TODO: security review` for human eyes.

- [ ] **Step 7: Commit** — `chore: bump app-init cache version for support release`. Do NOT push — the developer pushes.

---

## Out of scope (spec §Non-goals — do not do these)

- decode+`textContent` rework of the double-escape approach (flagged follow-up).
- Real-time chat, socket updates on tickets, WhatsApp/phone/live chat, attachments.
- Public (logged-out) ticket creation or returnTo-on-login.
- Moderator tier on support routes (spec: moderator 403 on all four).
- Fixing the pre-existing cross-session GET cache leak for wishlist/notifications (flagged in api.js with `// TODO: security review`).
- Email delivery retries/queues, ticket categories beyond the enum, SLA timers.
