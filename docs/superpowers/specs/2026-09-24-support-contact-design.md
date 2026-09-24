# Support Contact System (Tickets) — Design Spec

Date: 2026-09-24
Status: Approved design, awaiting implementation plan
Author: opencode (AI) — requires human review before merge
Related: 2026-08-23-policies-rewrite-design.md (contact/FAQ copy context)

## Problem

JERTS CART advertises support channels it doesn't have:

1. **Fake contact form** — `renderContact` (`js/pages/static-pages.js:84-141`)
   collects name/email/subject/message, then `_handleContactForm`
   (`:143-148`) shows a "Message sent!" toast and discards the input. Nothing
   reaches the backend. `#/contact` is reachable from the footer/header.
2. **FAQ dead-end** — the FAQ page's "Contact Support" button
   (`js/pages/pages.js:10331`) navigates to `/messages`, a peer-to-peer
   messaging surface, not support.
3. **No support surface for admins** — the messaging system
   (`message.controller.js:8-42`) is bare two-user-ID conversations (optional
   productId). There is no support conversation type, no admin inbox, and no
   UI that exposes an admin user ID for users to message. The app is
   **buy-only** (admins upload all products), so peer messaging is vestigial
   and cannot substitute for support.

Industry research (Amazon cases, Jumia GH, Takealot, Shopify helpdesks via
Zendesk/Gorgias) shows the standard model: FAQ-first deflection → contact form
→ **ticket/case queue** with Pending/Resolved workflow, portal-stored replies
that also email the user. Live chat is deliberately deferred (requires staffed
<2 min response; "bad chat is worse than no chat"). WhatsApp/phone are
Jumia-scale call-center channels, out of scope here.

## Decisions made (user-approved)

- **Approach A: dedicated `support_tickets` + `support_replies`** (not
  extending peer messaging). Confirmed against industry research.
- **Logged-in users only** — no anonymous tickets; logged-out visitors are
  nudged to sign in.
- **Admin panel page** — new Support item in the admin sidebar; replies are
  stored **and** emailed to the user.
- **User visibility** — users see their own tickets and reply threads on
  `#/contact`.
- **No live chat / WhatsApp / phone in v1** — YAGNI until support volume
  justifies staffing.
- **No attachments in v1** — verification file upload already covers document
  flows; message bodies suffice.
- **Account deletion integration** — support tickets for a deleted user are
  hard-deleted via one new statement in `accountDeletion.js` (Section 1).

## 1. Data model

Two tables appended to `SCHEMA_SQL` (`backend/config/database.js:53-552`),
mirroring the `newsletter_subscribers` pattern (`:527-551`), so both the
better-sqlite3 (dev) and Turso libSQL (prod) branches create them. The
defensive re-create guard in `connectLocal` (`:1553-1581`) must also list the
new tables.

```sql
CREATE TABLE IF NOT EXISTS support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN ('order','payment','verification','product','account','other')),
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','pending','resolved')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS support_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('user','admin')),
  body TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
);
```

Semantics:

- **Ticket = metadata only** (category, subject, status, timestamps). Every
  message — including the first user message from the contact form — is a row
  in `support_replies`. No message body lives on the ticket row.
- **Status lifecycle** (minimal Jumia-style):
  - `open` — created by user; re-set when the user replies to a `pending` or
    `resolved` ticket.
  - `pending` — admin replied; awaiting the user.
  - `resolved` — admin closed; user reply reopens to `open`.
- **Category enum** covers the app's real support surface: `order`, `payment`,
  `verification`, `product`, `account`, `other`.
- `updated_at` is refreshed on every reply and status change; lists sort by
  newest activity first.
- `ON DELETE CASCADE` on both FKs: deleting a ticket removes its replies.
  **Account deletion note:** account deletion *anonymizes* the `users` row
  (it never deletes it), so the user FK cascade never fires there — one new
  statement must be added to the scrub list in `backend/utils/accountDeletion.js`
  (after `:119`): `DELETE FROM support_tickets WHERE user_id = ?` (replies go
  via cascade). Support threads are user content with no counterparty — they
  belong in the "hard delete" tier of the deletion disposition
  (`2026-09-22-secure-account-deletion-design.md` §3).
- Indexes: `support_tickets(user_id)`, `support_tickets(status)`,
  `support_replies(ticket_id)`.

## 2. Backend API

### User routes — new `backend/routes/support.routes.js` (JWT `protect`, CSRF
as usual)

| Method | Route | Behavior |
|---|---|---|
| `POST` | `/api/support/tickets` | Body `{ category, subject, body }`. Creates ticket + first `support_replies` row (`author_role='user'`), status `open`. Best-effort confirmation email to the user. |
| `GET` | `/api/support/tickets` | Caller's tickets only, ordered by `updated_at DESC`. |
| `GET` | `/api/support/tickets/:id` | Ticket + full reply thread. `404` if ticket doesn't exist or `user_id != caller` (no existence leak). |
| `POST` | `/api/support/tickets/:id/replies` | Body `{ body }`. Appends user reply; status → `open` regardless of current status (users can always reply, including to reopen `resolved`). `404` on not-owner. |

Mounted in `backend/server.js` alongside the other user routers.

### Admin routes — added under `backend/routes/admin.routes.js`
(`protect + authorize('admin') + auditMiddleware`, same as existing admin
endpoints)

| Method | Route | Behavior |
|---|---|---|
| `GET` | `/api/admin/support/tickets?status=&q=&page=` | All tickets; optional status filter and subject search (`q`); newest activity first. |
| `GET` | `/api/admin/support/tickets/:id` | Ticket + thread (+ requester email for reply context). |
| `POST` | `/api/admin/support/tickets/:id/replies` | Body `{ body }`. Stores reply (`author_role='admin'`), sets status `pending`, **then** best-effort emails the user via `emailService.sendEmail` (subject `[JERTS CART] Re: <subject>`). Email failure → log only, API still succeeds (graceful-degrade pattern from newsletter). |
| `PATCH` | `/api/admin/support/tickets/:id` | Body `{ status: 'resolved' \| 'open' \| 'pending' }`. Status-only change; audit-logged. |

Controllers live in `backend/controllers/support.controller.js` (user) and an
admin section following the existing admin controller split.

## 3. Contact page UI (`#/contact`)

Rewrite `renderContact` in `js/pages/static-pages.js` (route at
`js/pages/pages.js:984`, wrapper `Pages.renderContact` `:10461-10471`):

- **Logged out:** no form. Render a "Sign in to contact support" panel —
  copy plus a link to sign-in that returns to `#/contact`. No anonymous
  submissions ever hit the API.
- **Logged in:**
  - **New request form** — category `<select>` (six enum values), subject
    (≤200 chars), message (≤5000 chars) → `POST /api/support/tickets`.
  - **"Your support requests"** list below — each row: subject, category
    badge, status badge (`open` / `pending` / `resolved`), relative time.
    Click expands the reply thread inline (all messages escaped) with a reply
    composer → `POST /…/replies`. Thread refresh after each post.
- Delete the fake success path (`static-pages.js:143-148`); all network via
  the `api` singleton (`js/utils/api.js`) — no raw `fetch`.
- Fix FAQ "Contact Support" button (`pages.js:10331`) → `#/contact`.
- No new inline handlers; delegation on stable parents / `data-action`.
  Every user-supplied string through `SecurityUtils.escapeHtml` before
  `innerHTML`. TODO CSP comment on any legacy inline handlers touched.

## 4. Admin Support page

- **Sidebar:** new **Support** nav item (`js/pages/pages.js:140-163`) after
  Verifications. Label shows the open-ticket count, fetched once whenever the
  admin layout renders — no polling, no live badge in v1.
- **Routes:** `#/admin/support` (list) and `#/admin/support/:id` (detail),
  registered in the admin route block (`pages.js` ~`:930-1010`) behind the
  existing admin auth guard.
- **List page:** status filter chips (All / Open / Pending / Resolved),
  search box (`q`), columns — id, user email, category, subject, status,
  updated_at. Copy structure from `js/admin/admin-verifications.js`
  (list/detail template).
- **Detail page:** thread view (admin messages right-aligned or otherwise
  distinguished), reply composer, "Mark resolved" / "Reopen" buttons hitting
  the PATCH endpoint. Email failures surface a non-blocking toast ("reply
  saved; email not sent").
- New manager `js/admin/admin-support.js` assigned to `window` per the hybrid
  module pattern; **add its globals to `.eslintrc.json`** (eslint enumerates
  window-exposed managers).
- Admin replies and status changes write `activity_logs` rows via
  `auditMiddleware`.

## 5. Security, rate limiting, CSRF

- **AuthN/AuthZ:** user routes behind `protect`; admin routes behind
  `protect + authorize('admin')`. Every user query filters
  `user_id = req.user.id` server-side (IDOR-proof); detail routes return `404`
  (not `403`) for not-owned tickets to avoid existence leaks.
- **CSRF:** no new configuration. `app.use(csrfProtection)` is already global
  (`server.js:419`); the list in `csrf.middleware.js:76-86` is an *exemption*
  list for public endpoints (newsletter, webhook, Google token). Support
  routes are authenticated mutations, so they are **not** exempt and get the
  normal `X-CSRF-Token` check — which `js/utils/api.js` attaches
  automatically on mutating requests. Nothing to add; covered by existing
  CSRF tests' patterns.
- **Rate limits:** `supportTicketLimiter` (5/hour) and `supportReplyLimiter`
  (20/hour), wired in `server.js` exactly like `newsletterLimiter`
  (`server.js:319-330`), keyed by userId+IP, `429` with `retryAfterSeconds`.
  Admin reply relies on admin auth; no special admin limiter in v1.
- **Validation** (server authoritative; client mirrors for UX):
  - `category` must be in the CHECK enum → else `400`.
  - `subject` required, trimmed, ≤ 200 chars; `body` required, trimmed,
    ≤ 5000 chars → else `400`.
  - Input through `sanitizeInput` / existing validators on the way in;
    `escapeHtml` on the way out in templates.
- **Email hygiene:** only the recipient's own address; subject
  `[JERTS CART] Re: <ticket subject>` (subject is user-controlled — must be
  header-safe/escaped by `nodemailer`, no newline injection); no stack traces
  or secrets in user-facing errors or toasts; Sentry payloads scrubbed of
  ticket bodies/emails per existing policy.
- **No new inline handlers; no secrets client-side; no raw `fetch` to
  backend.**

## 6. Testing

### Backend (jest, `cd backend && npm test`)

- **Ownership:** user A cannot `GET`/`POST` user B's ticket (404); list
  endpoints return only the caller's tickets.
- **Lifecycle:** create → status `open`; admin reply → `pending` + reply row +
  `emailService` called (mock); user reply → `open`; PATCH `resolved` works;
  PATCH validation rejects bad status.
- **Validation:** missing/empty/oversized subject or body → 400; bad category
  → 400.
- **Rate limits:** the two limiters are mounted on the exact paths above
  (assert via config/inspection test or a repeated-POST 429 if the harness
  keeps rate limiting enabled — match however `newsletterLimiter` is covered
  today).
- **Email degrade:** `sendEmail` throws → API still 200, reply persisted.
- **Cascade / deletion:** deleting a ticket removes its replies; a new jest
  case runs `executeAccountDeletion` and asserts the user's
  `support_tickets` rows are gone (and replies with them).
- Schema smoke: tables exist after migrate (both branches covered by existing
  test harness patterns).

### E2E (Playwright, `--workers=1`, hermetic)

Catch-all `page.route('**/api/**', …)` registered **first**, specific mocks
after (Playwright last-registered-wins — lesson from
`e2e/verification-status-routing.spec.js`):

1. Logged-in user opens ticket from `#/contact` → appears in "Your support
   requests" with `open` badge.
2. User expands thread → admin reply (mocked) visible; user reply posts and
   appears.
3. FAQ "Contact Support" navigates to `#/contact`.
4. Admin session (`e2e/helpers/admin-auth.js` `injectAdminSession`): list
   shows the ticket; detail reply → status becomes `pending` in UI.

### Gates (all must pass before done)

- `cd backend && npm run lint:check && npm test`
- Root: `npm run lint:check` → `npx prettier --check "js/**/*.js" "css/**/*.css"`
  → `npm run build`
- `npx playwright test --workers=1`
- **Cache triple bump** on any frontend change: `MODULE_VERSION` 37→38
  (`js/app-init.js`), `APP_INIT_VERSION` 38→39 (`vite.config.js`),
  `index.html` `?v=38`→`?v=39`.

## Out of scope / follow-ups

- Live chat (socket-backed) — phase 2 if volume warrants staffing.
- WhatsApp / phone channels, help-center deflection analytics.
- Attachments on tickets.
- Ticket satisfaction ratings ("was this helpful?").
- Anonymous (logged-out) support requests.
- Extending peer `messages` with a support type / admin inbox — rejected as
  the wrong model for a buy-only store.
- `ACTIVITY_LOGS_ACTIONS` CHECK values: reuse existing admin action strings in
  v1 (same pragmatic choice as account-deletion spec) unless adding one is
  free.
- Auto-close stale `pending` tickets (no cron v1; admin can resolve manually).
