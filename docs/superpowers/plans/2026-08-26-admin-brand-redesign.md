# Admin Brand-Aligned Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the admin panel surfaces (sidebar, topbar, page header, stats, tables, filter tabs, modals, empty states, login, 404) to match the storefront's brand voice and read as a designed product. Behavior-preserving on the data and routes.

**Architecture:** Add a new `adm-*` component family to `css/pages/admin.css` (additive). Add `AdminUI` static helpers in `js/pages/pages.js` (pageHeader, topbar, sidebar, statCard, tableWrap, pillGroup, emptyState, modal). Rewrite each `Pages.renderAdmin*` method to use the new helpers. Login gets a split layout. 404 + shared error page at `js/pages/static-pages.js`. Delegation everywhere. Module version bumped on the final commit.

**Tech Stack:** Vanilla JS SPA. No new dependencies. Tokens from `css/variables.css`.

**Reference spec:** `docs/superpowers/specs/2026-08-26-admin-brand-redesign-design.md`
**Reference interactive mockup:** served at `http://localhost:53499/?key=0c62d260487c79714e9e19e1fbcab3f9ab5954769549f9e7f40abd6e85151a3f` (file: `.superpowers/brainstorm/108730-1787785891/content/admin-v3.html`)

---

## Global Constraints

- No new npm dependencies.
- ZERO raw hex in NEW code — every color from `css/variables.css` tokens. The only allowed raw rgba is the modal backdrop `rgba(15,23,42,0.5)` and focus ring `rgba(0,70,190,0.25)` (both derived from existing tokens).
- All user data in templates continues to use the existing `_pageEsc` helper.
- No NEW inline `onclick`/`onchange`/`onkeyup` handlers. New interactions use delegation on stable parents via `data-*` attributes.
- The `admin-*` legacy classes stay intact. The `adm-*` family is the new standard. When a class is renamed, update e2e selectors in the same commit.
- Lint baseline: 1426 problems (1415 errors, 11 warnings). No new errors per task.
- Build gate: `npm run build` must succeed.
- Commit after every task. One task = one commit.
- Admin auth for visual testing: `admin@unihub.local` / `Admin123!`.
- Services: frontend on :8000 (start with `setsid /tmp/start-frontend.sh` if down), backend on :5000 (`cd backend && (node server.js > /tmp/be.log 2>&1 &) disown`).
- Cache: after a code change, force `agent-browser eval "location.reload(true)"`. Module version `?v=N` bumped 19→20 in the final task so users pick up new code without manual cache clearing.

---

## File Structure

```
css/pages/admin.css            # +adm-* component library appended
js/pages/pages.js              # renderAdmin* rewrites + AdminUI helpers
js/pages/static-pages.js       # shared error/404 split-layout renderer
index.html                     # app-init.js ?v=20 (final commit only)
js/app-init.js                 # MODULE_VERSION = '20' (final commit only)
```

---

## Baseline Recording (run once before Task 1)

```bash
cd /home/belteshazzarkijin/Documents/danny/Uni-Hub
npm run lint:check 2>&1 | tail -3
# Expected: ✖ 1426 problems (1415 errors, 11 warnings)
npm run build 2>&1 | tail -3
# Expected: ✓ built in <N>s
```

If the baseline differs, stop and investigate before continuing.

---

## Task summary

| # | Task | Files |
|---|---|---|
| 1 | Add `.adm-*` component library to admin.css | `css/pages/admin.css` |
| 2 | `AdminUI` helpers + new sidebar + topbar helpers in pages.js | `js/pages/pages.js` |
| 3 | Admin login split layout | `js/pages/pages.js` |
| 4 | 404 + shared error page split layout | `js/pages/static-pages.js`, `js/pages/pages.js` |
| 5 | Dashboard | `js/pages/pages.js` |
| 6 | Users | `js/pages/pages.js` |
| 7 | Products list | `js/pages/pages.js` |
| 8 | Orders + empty state | `js/pages/pages.js` |
| 9 | Payouts + reject modal | `js/pages/pages.js` |
| 10 | Verifications + detail modal | `js/pages/pages.js` |
| 11 | Activity | `js/pages/pages.js` |
| 12 | Reports | `js/pages/pages.js` |
| 13 | Analytics | `js/pages/pages.js` |
| 14 | Regions | `js/pages/pages.js` |
| 15 | Newsletter | `js/pages/pages.js` |
| 16 | Final gate: lint, build, e2e admin suite, visual sweep, push, module version bump | `index.html`, `js/app-init.js`, all e2e specs |

