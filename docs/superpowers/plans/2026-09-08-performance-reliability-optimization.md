# JERTS CART — Performance & Reliability Optimization Plan

Status: partially implemented. Order = highest ROI first. Each item is scoped,
measured against the current codebase, and can ship independently.

Implemented so far:
- Phase 1 (N+1 elimination) — DONE. `db.findByIds()` helper + batched reads in
  verification, admin, products, search, orders, messages, wishlist.
- Phase 2 (frontend double-fetch + localStorage-as-DB) — DONE. GET request cache
  + in-flight coalescing in `api.js`; verification queue no longer persists PII.
- Phase 4 (security cleanup, partial) — DONE for Sentry PII scrubbing and the
  verification key-prefix TODO.
- Phase 3 (partial) — DONE: Sentry SDK (~249 KB gzipped) deferred off the
  critical path via requestIdleCallback. Previously loaded eagerly in the
  `core` module level for every visitor.

Remaining (deferred — needs tooling or a dedicated, low-risk follow-up):
- Phase 3.1 CSS: the 341 KB (raw) / ~53 KB (gz) bundle is 34 files, several of
  which are coexisting generations (browse.css + browse-modern.css, landing.css
  + bestbuy-landing.css + components/landing-page.css). Both old and new class
  names are actively emitted in JS, so this needs a CSS-coverage/PurgeCSS pass,
  not hand-editing.
- Phase 3.2 code-splitting pages.js (82 KB gz, loaded every route): splitting
  the monolithic `Pages` class into admin vs public chunks is a multi-file,
  regression-risky refactor (router + admin sidebar + bestbuy-auth-dashboard all
  reference `window.Pages.<method>`). Best done as an isolated change with full
  Playwright coverage.

---

## Why now

The app works for modest load, but accumulates features without a perf pass.
The concrete symptoms (from read-through, not guesswork):

- **N+1 queries** in almost every read path — `admin.controller.js`,
  `order.controller.js`, `message.controller.js`, `verification.controller.js`,
  `wishlist.controller.js`, `search.controller.js` all loop and call
  `db().findById(...)` per row.
- **Double-fetching** on admin pages: `renderAdminProducts()` fetches
  `/admin/products` inline while `AdminProductsManager.init()` fetches the same
  list into `_backendProducts`, uncoordinated.
- **localStorage used as a database** for the verification queue, product
  moderation, admin activity, and products — with PII-adjacent data (student
  emails/names) persisted and merged client-side.
- **Synchronous SQLite on the Node event loop** — `better-sqlite3` calls block
  and, combined with loop-per-row population, stall concurrent requests
  (including socket.io messaging).
- **Single 341 KB CSS bundle + monolithic `pages.js` (9708 lines)**, no
  route-level lazy loading.

---

## Phase 1 — Backend read-path efficiency (highest ROI, lowest risk)

### 1.1 Add a batch lookup + eliminate N+1 where rows are populated

Add one helper to `backend/utils/db.js`:

```js
async findByIds(ids) {
  // dedupe, chunk, SELECT ... WHERE id IN (...), preserve order, _mapRows
}
```

Then convert the "populate one row-at-a-time" loops to a single call:

- `verification.controller.js:169` (`getPendingVerifications`) — one
  `findByIds` for all `reviewedBy` values.
- `admin.controller.js:37,75,107,246,483` — dashboard stats, product list,
  orders, banned-users, payout queue.
- `order.controller.js:334,436,474,663` — order-item product/seller lookups.
- `message.controller.js:226-240,298-311` — conversation participants +
  last-message + product.
- `wishlist.controller.js:11` and `search.controller.js:73`.

**Expected:** admin/verification/browse page backend latency drops from
O(rows) round-trips to ~2 queries. No API shape change.

### 1.2 Add pagination/limit to unbounded reads

- `getPendingVerifications` (no `limit` today) — add `page`/`limit`, default
  sensible cap, and a `total`.
- Confirm `getAdminProducts`/`getProducts` cap and clamp are actually enforced
  (they exist, verify at the data layer).

### 1.3 Make heavy population fire-and-forget-safe

Where `purgeExpiredVerificationDocs()` is triggered inline, keep it — but
ensure it doesn't block the response (already `.catch()`'d; verify).

---

## Phase 2 — Frontend caching & double-fetch (removes the stale-merge bug class)

### 2.1 Single shared product data source

`AdminProductsManager` should not re-fetch what `productsManager` (or the page)
already fetched. Introduce a tiny request cache in `api.js`:

- In-memory Map keyed by `method + path + canonical query`, TTL ~30s, with
  cache-busting for mutations (DELETE/PUT/POST invalidate the relevant prefix).

### 2.2 Stop persisting the verification queue to localStorage as source of truth

The backend is already the sole source (commit 8fc65636). Remove the
`localStorage` merge-as-truth in `admin-verifications.js:_fetchFromBackend` and
`_loadQueue`; keep only a last-known-good snapshot for offline display, clearly
flagged. This also removes PII (emails) from durable storage.

### 2.3 Reduce re-render churn

Admin tables: unify on row `display` toggling (search already does this) instead
of rebuilding `innerHTML` where the data hasn't changed.

---

## Phase 3 — Bundle & initial load

### 3.1 CSS size
The 341 KB CSS bundle is the single easiest win. Audit for unused utility
classes / duplicated vendor CSS, or split critical CSS.

### 3.2 Code-splitting / lazy route load
`pages.js` (9708 lines) is always loaded. Split admin routes into a lazy chunk
loaded only when `#/admin` is entered; same for heavy pages (messages, browse
variants). Keep the ESM/module-loader contract intact (`AGENTS.md`).

---

## Phase 4 — Correctness/security cleanup (parallel, low effort)

- Resolve the two `TODO: security review` markers (verification doc purge +
  `_syncUserVerification` hardcoded key prefix — derive from `STORAGE_KEYS`).
- Migrate the remaining inline `onclick`/`onchange` handlers to
  `addEventListener`/delegation (unblocks a strict CSP).
- Loosen/normalize `validateObjectId` to the actual ID scheme the app uses
  (UUID), and add a single shared validation helper.

---

## Out of scope / deferred

- SSR / hydration — not justified for this SPA.
- Replatforming SQLite → Postgres — `better-sqlite3` is fine at this scale
  once N+1s are gone; revisit only if concurrency grows by an order of magnitude.

---

## Suggested sequencing

1. **Phase 1.1 (N+1)** — immediate, measurable, low risk. Do this first.
2. **Phase 2.1 + 2.2** — removes the double-fetch + stale-merge bug class that
   already caused the verification-queue and admin-list 401 bugs.
3. **Phase 3.1 (CSS)** — large perceptual win for very little effort.
4. **Phase 1.2, 4** — correctness hardening alongside.
5. **Phase 3.2** — only when product/user count warrants it.