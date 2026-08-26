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


### Task 1: Add `.adm-*` component library to `css/pages/admin.css`

**Files:**
- Modify: `css/pages/admin.css` (append at end of file, currently 1946 lines)

**Why:** All later tasks use these classes. The block must be complete and self-contained.

**Step 1.1:** Read the last few lines of the file to confirm where to append.

```bash
tail -5 /home/belteshazzarkijin/Documents/danny/Uni-Hub/css/pages/admin.css
# Expected: ends with the .admin-table-empty-action:hover closing brace
```

**Step 1.2:** Append the following CSS block to the END of `css/pages/admin.css`. Use the Edit tool with the last `}` of the file as the oldString. Replace the whole trailing block plus add the new content.

Old string (the last `}` of the file):
```css
.admin-table-empty-row .admin-table-empty-action:hover {
  background: var(--primary-hover);
}
```

New string: keep the existing closing rule AND add the entire block below. The Edit tool replaces the oldString with the newString, so the newString starts with the same `.admin-table-empty-row .admin-table-empty-action:hover` rule and appends the new content after.

```css
.admin-table-empty-row .admin-table-empty-action:hover {
  background: var(--primary-hover);
}

/* ============================================
   ADM-* COMPONENT LIBRARY
   Brand-aligned surfaces for the admin panel.
   Token-driven, flat, professional. No gradients.
   Added 2026-08-26 per admin brand-redesign spec.
   ============================================ */

/* ---- Sidebar ---- */
.adm-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--bg-primary);
  border-right: 1px solid var(--neutral-200);
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.adm-brand {
  padding: 0 20px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.adm-brand-mark {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: var(--primary);
  color: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
}
.adm-brand-name {
  font-weight: 700;
  font-size: 14px;
  color: var(--neutral-900);
  line-height: 1.1;
  letter-spacing: -0.01em;
}
.adm-brand-tag {
  font-size: 10px;
  color: var(--neutral-600);
  line-height: 1.1;
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 500;
}
.adm-profile {
  margin: 0 12px 12px;
  padding: 10px 12px;
  border: 1px solid var(--neutral-200);
  border-radius: 8px;
  display: flex;
  gap: 10px;
  align-items: center;
}
.adm-profile-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--neutral-900);
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.adm-profile-email {
  font-size: 11px;
  color: var(--neutral-600);
  line-height: 1.1;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.adm-sidebar-nav {
  flex: 1;
  padding: 4px 12px;
  overflow-y: auto;
}
.adm-nav-section-label {
  font-size: 10px;
  color: var(--neutral-600);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  padding: 12px 12px 6px;
}
.adm-nav-item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 12px;
  color: var(--neutral-700);
  text-decoration: none;
  font-size: 13px;
  border-radius: 6px;
  margin-bottom: 1px;
  font-weight: 500;
  transition: background 120ms ease, color 120ms ease;
  cursor: pointer;
}
.adm-nav-item:hover {
  background: var(--neutral-50);
  color: var(--neutral-900);
}
.adm-nav-item.is-active {
  background: var(--neutral-100);
  color: var(--neutral-900);
  font-weight: 600;
}
.adm-nav-item.is-active svg {
  stroke: var(--neutral-900);
}
.adm-nav-item svg {
  flex-shrink: 0;
}
.adm-nav-badge {
  margin-left: auto;
  background: var(--neutral-100);
  color: var(--neutral-900);
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}
.adm-sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--neutral-200);
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}
.adm-sidebar-link {
  color: var(--neutral-700);
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: none;
  font-size: 12px;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: background 120ms ease;
}
.adm-sidebar-link:hover {
  background: var(--neutral-50);
  color: var(--neutral-900);
}
.adm-avatar-sm {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--neutral-100);
  color: var(--neutral-900);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}
.adm-avatar-md {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--neutral-100);
  color: var(--neutral-900);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

/* ---- Top utility bar ---- */
.adm-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 32px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--neutral-200);
  gap: 16px;
}
.adm-breadcrumb {
  font-size: 12px;
  color: var(--neutral-600);
}
.adm-breadcrumb a {
  color: var(--neutral-600);
  text-decoration: none;
}
.adm-breadcrumb a:hover {
  color: var(--neutral-900);
}
.adm-breadcrumb-sep {
  margin: 0 8px;
  color: var(--neutral-300);
}
.adm-breadcrumb-current {
  color: var(--neutral-900);
}
.adm-topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.adm-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--neutral-100);
  border-radius: 6px;
  padding: 7px 10px;
  min-width: 260px;
  transition: background 120ms ease, box-shadow 120ms ease;
}
.adm-search:focus-within {
  background: var(--bg-primary);
  box-shadow: inset 0 0 0 2px var(--primary);
}
.adm-search svg { flex-shrink: 0; }
.adm-search input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
  color: var(--neutral-900);
  width: 100%;
  min-width: 180px;
  font-family: inherit;
}
.adm-search input::placeholder { color: var(--neutral-500); }
.adm-search-kbd {
  font-size: 11px;
  color: var(--neutral-600);
  border: 1px solid var(--neutral-200);
  background: var(--bg-primary);
  padding: 1px 5px;
  border-radius: 3px;
  flex-shrink: 0;
}
.adm-icon-btn {
  background: var(--bg-primary);
  border: 1px solid var(--neutral-200);
  padding: 7px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--neutral-900);
  transition: background 120ms ease;
}
.adm-icon-btn:hover { background: var(--neutral-100); }

/* ---- Page header ---- */
.adm-page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 28px;
  gap: 16px;
  flex-wrap: wrap;
}
.adm-page-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--neutral-900);
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.01em;
}
.adm-page-sub {
  margin: 6px 0 0;
  color: var(--neutral-600);
  font-size: 13px;
  line-height: 1.4;
}

/* ---- Stats grid ---- */
.adm-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 28px;
}
@media (max-width: 1100px) { .adm-stats { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px)  { .adm-stats { grid-template-columns: 1fr; } }
.adm-stat {
  background: var(--bg-primary);
  border: 1px solid var(--neutral-200);
  border-radius: 8px;
  padding: 20px;
  transition: border-color 120ms ease;
}
.adm-stat:hover { border-color: var(--neutral-300); }
.adm-stat-label {
  font-size: 12px;
  color: var(--neutral-600);
  font-weight: 500;
  margin-bottom: 8px;
}
.adm-stat-value {
  font-size: 30px;
  font-weight: 700;
  color: var(--neutral-900);
  line-height: 1;
  letter-spacing: -0.02em;
}
.adm-stat-delta { font-size: 12px; margin-top: 8px; font-weight: 500; }
.adm-stat-delta--success { color: var(--success); }
.adm-stat-delta--warning { color: var(--warning); }
.adm-stat-delta--danger  { color: var(--danger); }
.adm-stat-delta--muted   { color: var(--neutral-600); }

/* ---- Card surface ---- */
.adm-card {
  background: var(--bg-primary);
  border: 1px solid var(--neutral-200);
  border-radius: 8px;
  margin-bottom: 16px;
}
.adm-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--neutral-200);
  gap: 16px;
  flex-wrap: wrap;
}
.adm-card-title { font-size: 14px; font-weight: 600; color: var(--neutral-900); margin: 0; }
.adm-card-sub   { font-size: 12px; color: var(--neutral-600); margin: 2px 0 0; }

/* ---- Table ---- */
.adm-table-wrap { overflow-x: auto; }
.adm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.adm-th {
  text-align: left;
  padding: 10px 20px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--neutral-600);
  font-weight: 600;
  background: var(--neutral-50);
  border-bottom: 1px solid var(--neutral-200);
  white-space: nowrap;
}
.adm-td {
  padding: 14px 20px;
  color: var(--neutral-900);
  border-bottom: 1px solid var(--neutral-100);
  vertical-align: middle;
}
.adm-table tbody tr { transition: background 80ms ease; }
.adm-table tbody tr:hover { background: var(--neutral-50); }
.adm-table tbody tr:last-child .adm-td { border-bottom: none; }
.adm-text-right { text-align: right; }
.adm-text-mono  { font-family: var(--font-family-mono); font-size: 0.8rem; }
.adm-text-success { color: var(--success); }
.adm-text-warning { color: var(--warning); }
.adm-text-danger  { color: var(--danger); }
.adm-text-muted   { color: var(--neutral-600); }
.adm-text-strong  { font-weight: 600; color: var(--neutral-900); }
.adm-user-cell { display: flex; align-items: center; gap: 10px; }

/* ---- Badges (status pills) ---- */
.adm-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.6;
  text-transform: capitalize;
}
.adm-badge--success { background: var(--success-light); color: var(--success); }
.adm-badge--warning { background: var(--warning-light); color: var(--warning); }
.adm-badge--danger  { background: var(--danger-light);  color: var(--danger); }
.adm-badge--info    { background: var(--info-light);    color: var(--info); }
.adm-badge--neutral { background: var(--neutral-100);  color: var(--neutral-700); }

/* ---- Buttons ---- */
.adm-btn {
  background: var(--bg-primary);
  border: 1px solid var(--neutral-200);
  color: var(--neutral-900);
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  transition: background 120ms ease, box-shadow 120ms ease;
  white-space: nowrap;
}
.adm-btn:hover { background: var(--neutral-100); }
.adm-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 70, 190, 0.25);
}
.adm-btn--primary {
  background: var(--primary);
  color: var(--bg-primary);
  border-color: var(--primary);
  font-weight: 600;
}
.adm-btn--primary:hover {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
}
.adm-btn--danger {
  background: var(--danger);
  color: var(--bg-primary);
  border-color: var(--danger);
  font-weight: 600;
}
.adm-btn--danger:hover { background: #a00; border-color: #a00; }
.adm-btn--success {
  background: var(--success);
  color: var(--bg-primary);
  border-color: var(--success);
  font-weight: 600;
}
.adm-btn--success:hover { background: #136e10; border-color: #136e10; }
.adm-btn--sm     { padding: 4px 10px; font-size: 12px; }
.adm-btn--block  { width: 100%; justify-content: center; }

/* ---- Filter pill group (flat tabs) ---- */
.adm-pill-group {
  display: inline-flex;
  background: var(--bg-primary);
  border: 1px solid var(--neutral-200);
  border-radius: 6px;
  padding: 2px;
  gap: 0;
}
.adm-pill {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--neutral-600);
  cursor: pointer;
  font-weight: 500;
  font-family: inherit;
  background: transparent;
  border: none;
  transition: background 120ms ease, color 120ms ease;
}
.adm-pill:hover { color: var(--neutral-900); }
.adm-pill.is-active {
  background: var(--neutral-100);
  color: var(--neutral-900);
  font-weight: 600;
}
.adm-pill-group--inverse .adm-pill.is-active {
  background: var(--neutral-900);
  color: var(--bg-primary);
}

/* ---- Empty state (page-level) ---- */
.adm-empty {
  text-align: center;
  padding: 56px 24px;
  color: var(--neutral-500);
}
.adm-empty-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  color: var(--neutral-400);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--neutral-100);
  border-radius: 50%;
}
.adm-empty-title {
  color: var(--neutral-700);
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 6px;
}
.adm-empty-body {
  color: var(--neutral-600);
  font-size: 13px;
  margin: 0 0 20px;
  line-height: 1.5;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}
.adm-empty-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

/* ---- Modal (light, sized) ---- */
.adm-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal, 400);
  padding: 24px;
}
.adm-modal {
  background: var(--bg-primary);
  border-radius: 10px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  max-width: 480px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  padding: 24px;
  position: relative;
}
.adm-modal--lg { max-width: 720px; }
.adm-modal--xl { max-width: 960px; }
.adm-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}
.adm-modal-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--neutral-900);
  margin: 0;
  letter-spacing: -0.01em;
}
.adm-modal-sub {
  font-size: 13px;
  color: var(--neutral-600);
  margin: 4px 0 0;
}
.adm-modal-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--neutral-600);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 120ms ease, color 120ms ease;
}
.adm-modal-close:hover { background: var(--neutral-100); color: var(--neutral-900); }
.adm-modal-body { margin-bottom: 20px; }
.adm-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.adm-modal-error {
  display: none;
  color: var(--danger);
  font-size: 12px;
  margin: 8px 0 0;
}
.adm-modal-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}
.adm-modal-kv-label {
  font-size: 11px;
  color: var(--neutral-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
  font-weight: 600;
}
.adm-modal-kv-value {
  color: var(--neutral-900);
  font-size: 13px;
  word-break: break-word;
}
.adm-modal-kv-value--mono {
  font-family: var(--font-family-mono);
  color: var(--primary);
  font-weight: 500;
}
.adm-modal-field {
  width: 100%;
  background: var(--bg-primary);
  color: var(--neutral-900);
  border: 1px solid var(--neutral-300);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  transition: border-color 120ms ease, box-shadow 120ms ease;
  box-sizing: border-box;
}
.adm-modal-field:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(0, 70, 190, 0.25);
}
.adm-modal-divider {
  border-top: 1px solid var(--neutral-200);
  padding-top: 20px;
  margin-top: 20px;
}
.adm-modal-field-group { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.adm-modal-field-row    { display: flex; gap: 12px; }
.adm-modal-field-row > * { flex: 1; }
.adm-modal-field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--neutral-900);
  display: block;
  margin-bottom: 4px;
}

/* ---- Auth split layout (login + 404 + error pages) ---- */
.adm-auth { display: flex; min-height: 100vh; background: var(--bg-secondary); }
.adm-auth-side {
  flex: 1;
  background: var(--primary);
  color: var(--bg-primary);
  padding: 48px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}
.adm-auth-side::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 50%),
    radial-gradient(circle at 20% 80%, rgba(255,255,255,0.04) 0%, transparent 50%);
  pointer-events: none;
}
.adm-auth-side-content {
  position: relative;
  z-index: 1;
  max-width: 420px;
}
.adm-auth-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 48px;
  position: relative;
  z-index: 1;
}
.adm-auth-brand-mark {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 20px;
  line-height: 1;
}
.adm-auth-brand-name {
  font-weight: 700;
  font-size: 18px;
  line-height: 1.1;
  letter-spacing: -0.01em;
}
.adm-auth-tagline {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin: 0 0 12px;
}
.adm-auth-tagline-accent { color: var(--secondary); font-style: italic; }
.adm-auth-description {
  font-size: 15px;
  line-height: 1.5;
  opacity: 0.85;
  margin: 0;
}
.adm-auth-meta {
  font-size: 12px;
  opacity: 0.6;
  position: relative;
  z-index: 1;
}
.adm-auth-form {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  background: var(--bg-primary);
}
.adm-auth-form-inner { width: 100%; max-width: 360px; }
.adm-auth-form-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--neutral-900);
  margin: 0 0 8px;
  letter-spacing: -0.01em;
}
.adm-auth-form-sub {
  font-size: 13px;
  color: var(--neutral-600);
  margin: 0 0 24px;
}
.adm-form-group { margin-bottom: 16px; }
.adm-form-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--neutral-900);
  margin-bottom: 6px;
}
.adm-form-label--required::after { content: ' *'; color: var(--danger); }
.adm-form-input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--neutral-300);
  border-radius: 6px;
  font-size: 14px;
  color: var(--neutral-900);
  background: var(--bg-primary);
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.adm-form-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(0, 70, 190, 0.25);
}
.adm-form-btn    { width: 100%; margin-top: 8px; }
.adm-form-footer { text-align: center; margin-top: 20px; font-size: 13px; color: var(--neutral-600); }
.adm-form-footer a { color: var(--primary); text-decoration: none; font-weight: 500; }
@media (max-width: 768px) {
  .adm-auth { flex-direction: column; }
  .adm-auth-side { padding: 32px 24px; min-height: 200px; }
  .adm-auth-form { padding: 32px 24px; }
  .adm-auth-tagline { font-size: 24px; }
}

/* ---- Toast (light, brand) ---- */
.adm-toast-host {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1100;
  pointer-events: none;
}
.adm-toast {
  background: var(--neutral-900);
  color: var(--bg-primary);
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  opacity: 0;
  transform: translateY(8px);
  transition: all 200ms ease;
  max-width: 320px;
}
.adm-toast.is-visible { opacity: 1; transform: translateY(0); }
.adm-toast--success { background: var(--success); }
.adm-toast--warning { background: var(--warning); }
.adm-toast--danger  { background: var(--danger); }

/* ---- Pagination footer ---- */
.adm-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-top: 1px solid var(--neutral-200);
  font-size: 12px;
  color: var(--neutral-600);
}
.adm-pagination-actions { display: flex; gap: 4px; }
.adm-pagination-info    { font-size: 12px; color: var(--neutral-600); }

/* ---- Page wrapper (layout root) ---- */
.adm-layout { display: flex; min-height: 100vh; background: var(--bg-secondary); }
.adm-main   { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.adm-page   { padding: 32px; flex: 1; }
@media (max-width: 768px) {
  .adm-page     { padding: 20px 16px; }
  .adm-topbar   { padding: 12px 16px; }
  .adm-search   { min-width: 160px; }
}
```

**Step 1.3:** Verify lint baseline unchanged.

```bash
cd /home/belteshazzarkijin/Documents/danny/Uni-Hub
npm run lint:check 2>&1 | tail -3
# Expected: ✖ 1426 problems (1415 errors, 11 warnings)
```

**Step 1.4:** Verify build passes.

```bash
npm run build 2>&1 | tail -5
# Expected: ✓ built in <N>s
```

**Step 1.5:** Verify the new classes are served by the frontend.

```bash
curl -s http://localhost:8000/css/pages/admin.css | grep -c "adm-sidebar\|adm-stats\|adm-pill-group\|adm-modal\|adm-auth"
# Expected: >= 10
```

**Step 1.6:** Commit.

```bash
git add css/pages/admin.css
git commit -m "Add adm-* brand-aligned component library to admin"
```


### Task 2: `AdminUI` helpers + new `getAdminSidebar` + `topbar` helper

**Files:**
- Modify: `js/pages/pages.js`

**Why:** Each admin page rewrite uses these helpers. The sidebar is the foundation that all pages embed.

**Step 2.1:** Find the line number where `class Pages` starts in `js/pages/pages.js`.

```bash
grep -n "^class Pages" /home/belteshazzarkijin/Documents/danny/Uni-Hub/js/pages/pages.js
# Expected: 65
```

**Step 2.2:** Insert the `AdminUI` class definition just BEFORE `class Pages` (at line 64, the blank line between `_requireAdmin` and `class Pages`). Use the Edit tool with oldString = `};\n\nclass Pages {` and newString includes the closing `};` of `_requireAdmin`, the new `AdminUI` class, then a blank line, then `class Pages {`.

The `AdminUI` class provides all the render helpers the per-page rewrites will use. It also includes `getAdminSidebar` (replacing the current one) and a new `topbar` helper.

Old string:
```js
};

class Pages {
```

New string (the closing brace of `_requireAdmin`, then the new `AdminUI` class, then a blank line, then `class Pages`):
```js
};

// ============================================
// ADMIN UI — shared helpers for the admin panel
// Pure HTML-string builders, no side effects, no
// direct DOM access. Pages compose these in their
// render methods; interactions are wired with
// delegated listeners installed once per page.
// ============================================
class AdminUI {
  // ---- Brand mark (top of sidebar) ----
  static brand () {
    return `
      <div class="adm-brand">
        <div class="adm-brand-mark">J</div>
        <div>
          <div class="adm-brand-name">JERTS CART</div>
          <div class="adm-brand-tag">Admin</div>
        </div>
      </div>
    `;
  }

  // ---- Profile chip (under brand) ----
  static profile (user) {
    const initials = (user?.fullName || 'A').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() || 'A';
    return `
      <div class="adm-profile">
        <div class="adm-avatar-md">${_pageEsc(initials)}</div>
        <div style="flex:1; min-width:0;">
          <div class="adm-profile-name">${_pageEsc(user?.fullName || 'Admin')}</div>
          <div class="adm-profile-email">${_pageEsc(user?.email || '')}</div>
        </div>
      </div>
    `;
  }

  // ---- Single nav item ----
  static navItem (item, isActive) {
    const cls = isActive ? 'adm-nav-item is-active' : 'adm-nav-item';
    const badge = item.badge ? `<span class="adm-nav-badge">${_pageEsc(String(item.badge))}</span>` : '';
    return `
      <a href="#" class="${cls}" data-adm-nav="${_pageEsc(item.key)}" data-action="nav">
        ${item.icon || ''}
        <span>${_pageEsc(item.label)}</span>
        ${badge}
      </a>
    `;
  }

  // ---- Section label ----
  static navSection (label) {
    return `<div class="adm-nav-section-label">${_pageEsc(label)}</div>`;
  }

  // ---- Full sidebar ----
  static sidebar (activeItem) {
    const user = (typeof adminAuthManager !== 'undefined' && adminAuthManager.getCurrentUser?.())
      || (typeof authManager !== 'undefined' && authManager.getCurrentUser?.())
      || null;
    const sections = [
      {
        label: 'Operations',
        items: [
          { key: 'dashboard',     label: 'Dashboard',     icon: Icons.chart },
          { key: 'verifications', label: 'Verifications', icon: Icons.shield || Icons.verification || Icons.check },
          { key: 'users',         label: 'Users',         icon: Icons.users },
          { key: 'products',      label: 'Products',      icon: Icons.package },
          { key: 'orders',        label: 'Orders',        icon: Icons.clipboard },
          { key: 'payouts',       label: 'Payouts',       icon: Icons.money },
        ],
      },
      {
        label: 'Insights',
        items: [
          { key: 'reports',   label: 'Reports',   icon: Icons.chart },
          { key: 'analytics', label: 'Analytics', icon: Icons.chart },
          { key: 'activity',  label: 'Activity',  icon: Icons.clock || Icons.chart },
          { key: 'regions',   label: 'Regions',   icon: Icons.globe || Icons.chart },
          { key: 'newsletter',label: 'Newsletter',icon: Icons.mail || Icons.email || '' },
        ],
      },
    ];
    const itemsHtml = sections.map(s => `
      ${AdminUI.navSection(s.label)}
      ${s.items.map(i => AdminUI.navItem(i, i.key === activeItem)).join('')}
    `).join('');
    return `
      <aside class="adm-sidebar">
        ${AdminUI.brand()}
        ${AdminUI.profile(user)}
        <nav class="adm-sidebar-nav" id="adm-sidebar-nav">
          ${itemsHtml}
        </nav>
        <div class="adm-sidebar-footer">
          <button type="button" class="adm-sidebar-link" data-action="toggle-dark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            <span id="adm-dark-label">Dark mode</span>
          </button>
          <button type="button" class="adm-sidebar-link" data-action="logout">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Log out
          </button>
        </div>
      </aside>
    `;
  }

  // ---- Top utility bar (breadcrumb + search + actions) ----
  // pageKey is the current route key (matches `data-adm-nav` value).
  // pageActions is HTML for the right-side action area (search + buttons).
  // The wrapper does NOT include sidebar — the page's render method
  // composes both.
  static topbar (pageLabel, pageActions) {
    return `
      <div class="adm-topbar">
        <div class="adm-breadcrumb">
          <a href="#/admin">Admin</a>
          <span class="adm-breadcrumb-sep">/</span>
          <span class="adm-breadcrumb-current">${_pageEsc(pageLabel)}</span>
        </div>
        <div class="adm-topbar-actions">
          ${pageActions || ''}
        </div>
      </div>
    `;
  }

  // ---- Page header (title + sub + right actions like period selector) ----
  static pageHeader (title, sub, rightActions) {
    return `
      <header class="adm-page-header">
        <div>
          <h1 class="adm-page-title">${_pageEsc(title)}</h1>
          <p class="adm-page-sub">${sub ? _pageEsc(sub) : ''}</p>
        </div>
        ${rightActions ? `<div class="adm-actions">${rightActions}</div>` : ''}
      </header>
    `;
  }

  // ---- Stat card (one stat) ----
  static statCard ({ label, value, delta, deltaKind }) {
    const deltaClass = deltaKind ? `adm-stat-delta--${deltaKind}` : 'adm-stat-delta--muted';
    return `
      <div class="adm-stat">
        <div class="adm-stat-label">${_pageEsc(label)}</div>
        <div class="adm-stat-value">${value}</div>
        ${delta ? `<div class="adm-stat-delta ${deltaClass}">${_pageEsc(delta)}</div>` : ''}
      </div>
    `;
  }

  // ---- Stat grid (wraps stat cards) ----
  static statGrid (cards) {
    return `<section class="adm-stats">${cards.join('')}</section>`;
  }

  // ---- Pill group (flat filter tabs) ----
  // tabs = [{ key, label }]; activeKey is the highlighted one.
  // groupClass optional — pass 'adm-pill-group--inverse' to make active dark.
  // dataAttr optional — defaults to 'data-adm-pill'.
  static pillGroup (tabs, activeKey, groupClass, dataAttr) {
    const data = dataAttr || 'data-adm-pill';
    const pills = tabs.map(t => {
      const active = t.key === activeKey ? ' is-active' : '';
      return `<button type="button" class="adm-pill${active}" ${data}="${_pageEsc(t.key)}">${_pageEsc(t.label)}</button>`;
    }).join('');
    return `<div class="adm-pill-group${groupClass ? ' ' + groupClass : ''}">${pills}</div>`;
  }

  // ---- Card surface (with optional header) ----
  static card (titleHtml, bodyHtml, headerActionsHtml) {
    return `
      <section class="adm-card">
        ${titleHtml ? `
          <header class="adm-card-header">
            <div>${titleHtml}</div>
            ${headerActionsHtml ? `<div>${headerActionsHtml}</div>` : ''}
          </header>
        ` : ''}
        <div class="adm-table-wrap">${bodyHtml}</div>
      </section>
    `;
  }

  // ---- Table from column defs + rows ----
  // columns: [{ label, render(row) -> string }]; render emits raw HTML.
  // rows: array of objects. emptyHtml is shown when rows is empty.
  static table ({ columns, rows, emptyHtml, footerHtml, rowAttr }) {
    const thead = `<thead><tr>${columns.map(c => `<th class="adm-th">${_pageEsc(c.label)}</th>`).join('')}</tr></thead>`;
    const tbody = rows.length === 0
      ? (emptyHtml || `<tr><td class="adm-td" colspan="${columns.length}"><div class="adm-empty"><div class="adm-empty-title">No records</div></div></td></tr>`)
      : rows.map(row => {
          const attrs = rowAttr ? rowAttr(row) : '';
          return `<tr${attrs}>${columns.map(c => `<td class="adm-td">${c.render(row)}</td>`).join('')}</tr>`;
        }).join('');
    return `<table class="adm-table">${thead}<tbody>${tbody}</tbody></table>${footerHtml || ''}`;
  }

  // ---- Empty state (page-level, outside a table) ----
  static emptyState ({ icon, title, body, actions }) {
    return `
      <div class="adm-empty">
        <div class="adm-empty-icon" aria-hidden="true">${icon || ''}</div>
        <h2 class="adm-empty-title">${_pageEsc(title)}</h2>
        <p class="adm-empty-body">${_pageEsc(body || '')}</p>
        ${actions ? `<div class="adm-empty-actions">${actions}</div>` : ''}
      </div>
    `;
  }

  // ---- Modal (open + delegated listener; returns the overlay element) ----
  // Caller appends to document.body and wires the delegated handler
  // (see AdminUI.wireModal for the standard pattern).
  static modalHtml ({ id, title, sub, body, footer, size }) {
    const sizeClass = size ? ` adm-modal--${size}` : '';
    return `
      <div id="${id}" class="adm-modal-backdrop" role="dialog" aria-modal="true">
        <div class="adm-modal${sizeClass}">
          <div class="adm-modal-header">
            <div>
              <h2 class="adm-modal-title">${_pageEsc(title)}</h2>
              ${sub ? `<p class="adm-modal-sub">${_pageEsc(sub)}</p>` : ''}
            </div>
            <button type="button" class="adm-modal-close" data-adm-modal-close aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="adm-modal-body">${body}</div>
          <div class="adm-modal-actions">${footer || ''}</div>
        </div>
      </div>
    `;
  }

  // ---- Standard modal wiring: close on backdrop, close button, Esc ----
  // handlers = { onClose: () => void, onAction: (key) => void }
  // Buttons inside .adm-modal-actions with data-adm-modal-action=KEY
  // are routed to handlers.onAction.
  static wireModal (overlay, handlers) {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) { handlers.onClose?.(); return; }
      const closeBtn = e.target.closest('[data-adm-modal-close]');
      if (closeBtn) { handlers.onClose?.(); return; }
      const actionBtn = e.target.closest('[data-adm-modal-action]');
      if (actionBtn) {
        handlers.onAction?.(actionBtn.dataset.admModalAction, actionBtn);
      }
    });
    const escHandler = e => { if (e.key === 'Escape') { handlers.onClose?.(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
  }

  // ---- Standard sidebar wiring: nav clicks, dark toggle, logout ----
  // activeItem is the current page key (so clicking it is a no-op).
  // onNavigate: (key) => void — caller decides how to route.
  static wireSidebar (onNavigate) {
    const nav = document.getElementById('adm-sidebar-nav');
    if (nav) {
      nav.addEventListener('click', e => {
        const item = e.target.closest('[data-adm-nav]');
        if (!item) { return; }
        e.preventDefault();
        const key = item.dataset.admNav;
        // Update active class optimistically
        nav.querySelectorAll('.adm-nav-item').forEach(a => a.classList.remove('is-active'));
        item.classList.add('is-active');
        onNavigate?.(key);
      });
    }
    const sidebar = document.querySelector('.adm-sidebar');
    if (sidebar) {
      sidebar.addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) { return; }
        const action = btn.dataset.action;
        if (action === 'toggle-dark') {
          const label = document.getElementById('adm-dark-label');
          const on = label && label.textContent === 'Dark mode';
          if (label) { label.textContent = on ? 'Light mode' : 'Dark mode'; }
          // Dark mode itself is a separate spec; we just toggle the label.
        } else if (action === 'logout') {
          if (typeof adminAuthManager !== 'undefined') {
            adminAuthManager.logout?.();
            window.location.hash = '#/';
            if (typeof Pages !== 'undefined' && Pages.renderLanding) { Pages.renderLanding(); }
          }
        }
      });
    }
  }

  // ---- Standard topbar search wiring ----
  // inputEl: the search <input> element.
  // onSearch: (value) => void — caller filters the current page.
  static wireSearch (inputEl, onSearch) {
    if (!inputEl) { return; }
    let timer = null;
    inputEl.addEventListener('input', e => {
      clearTimeout(timer);
      const v = e.target.value;
      timer = setTimeout(() => onSearch?.(v), 120);
    });
  }

  // ---- Standard pill group wiring ----
  // groupEl: the .adm-pill-group element.
  // onChange: (key) => void.
  static wirePillGroup (groupEl, onChange) {
    if (!groupEl) { return; }
    groupEl.addEventListener('click', e => {
      const pill = e.target.closest('[data-adm-pill]');
      if (!pill) { return; }
      groupEl.querySelectorAll('.adm-pill').forEach(p => p.classList.remove('is-active'));
      pill.classList.add('is-active');
      onChange?.(pill.dataset.admPill);
    });
  }

  // ---- Toast (light) ----
  static toast (message, kind) {
    let host = document.getElementById('adm-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'adm-toast-host';
      host.className = 'adm-toast-host';
      document.body.appendChild(host);
    }
    const t = document.createElement('div');
    t.className = 'adm-toast' + (kind ? ` adm-toast--${kind}` : '');
    t.textContent = message;
    host.appendChild(t);
    requestAnimationFrame(() => t.classList.add('is-visible'));
    setTimeout(() => {
      t.classList.remove('is-visible');
      setTimeout(() => t.remove(), 200);
    }, 2400);
  }
}

if (typeof window !== 'undefined') { window.AdminUI = AdminUI; }

class Pages {
```

After this insert, `class AdminUI` is at the top level and assigned to `window.AdminUI`. The `Icons` and `_pageEsc` references inside the class body resolve at call-time through the global scope (they're declared at the top of the file as `const _pageEsc` and as `const Icons = ...` somewhere in modules).

**Step 2.3:** Verify lint baseline unchanged.

```bash
cd /home/belteshazzarkijin/Documents/danny/Uni-Hub
npm run lint:check 2>&1 | tail -3
# Expected: ✖ 1426 problems (1415 errors, 11 warnings)
# If new errors, count them and fix.
```

**Step 2.4:** Verify build passes.

```bash
npm run build 2>&1 | tail -5
# Expected: ✓ built in <N>s
```

**Step 2.5:** Verify `AdminUI` is registered.

```bash
agent-browser open http://localhost:8000/ 2>&1 | tail -1
sleep 2
agent-browser eval "typeof window.AdminUI" 2>&1 | tail -1
# Expected: "function" or "object"
agent-browser eval "Object.keys(window.AdminUI || {}).join(',')" 2>&1 | tail -1
# Expected: includes "sidebar,topbar,pageHeader,statCard,pillGroup,card,table,emptyState,modalHtml,wireModal"
```

**Step 2.6:** Commit.

```bash
git add js/pages/pages.js
git commit -m "Add AdminUI helpers and shared sidebar/topbar renderers"
```


### Task 3: Admin login split layout

**Files:**
- Modify: `js/pages/pages.js` — replace the `static renderAdminLogin ()` method (currently around line 4899-4933)

**Reference:** The mockup's login section at `.superpowers/brainstorm/108730-1787785891/content/admin-v3.html` (search for `adm-auth`).

**Step 3.1:** Find the current method.

```bash
grep -n "static renderAdminLogin" /home/belteshazzarkijin/Documents/danny/Uni-Hub/js/pages/pages.js
```

**Step 3.2:** Replace the entire method body (from `static renderAdminLogin ()` through the closing `}` of that method, which includes the form submit listener) with a new version that uses the `adm-auth` split layout. The new version:

- Renders the brand-mark side panel (blue, with JERTS CART logo + tagline + description + meta)
- Renders the form on the right (white card)
- Uses `data-adm-form-submit` on the submit button so it's delegated (no inline onclick)
- Wires submit via `addEventListener` (no change from current)

The form fields, the `handleAdminLogin` call, and the success/failure toasts all stay identical. Only the HTML structure changes.

**Old method body** (lines around 4899-4933, with the static keyword and closing brace of the method):

```js
  static renderAdminLogin () {
    this.hideOriginalNavFooter();
    document.body.style.background = '';
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
  <div class="admin-container" style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;">
    <div style="background:var(--admin-bg-elev2,#1f2937);border:1px solid var(--admin-border,rgba(255,255,255,0.1));border-radius:var(--radius-xl,1rem);padding:var(--space-2xl,2rem);width:100%;max-width:400px;box-shadow:var(--shadow-xl);">
      <div style="text-align:center;margin-bottom:2rem;">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,var(--primary,#0046be),var(--primary-hover,#003399));color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:1.25rem;margin-bottom:1rem;">U</div>
        <h2 style="color:var(--admin-text-strong,#f9fafb);margin:0;">Admin Login</h2>
        <p style="color:var(--admin-text-muted,#9ca3af);margin:0.5rem 0 0;font-size:0.875rem;">Sign in to access the admin panel</p>
      </div>
      <form id="admin-login-form">
        <div class="form-group">
          <label for="admin-email" class="required" style="color:var(--admin-text,#d1d5db);">Email</label>
          <input type="email" id="admin-email" name="email" class="form-control" required style="background:var(--admin-bg,#111827);border-color:var(--admin-border-strong,rgba(255,255,255,0.1));color:var(--admin-text-strong,#f9fafb);" />
        </div>
        <div class="form-group">
          <label for="admin-password" class="required" style="color:var(--admin-text,#d1d5db);">Password</label>
          <input type="password" id="admin-password" name="password" class="form-control" required style="background:var(--admin-bg,#111827);border-color:var(--admin-border-strong,rgba(255,255,255,0.1));color:var(--admin-text-strong,#f9fafb);" />
        </div>
        <button type="submit" class="btn btn-primary btn-block" style="background:var(--primary,#0046be);border-color:var(--primary,#0046be);">Login as Admin</button>
      </form>
      <div style="text-align:center;margin-top:1.5rem;">
        <a href="#/" style="color:var(--admin-text-muted,#9ca3af);font-size:0.875rem;">Back to Home</a>
      </div>
    </div>
  </div>
  `;
    const form = document.getElementById('admin-login-form');
    if (form) {
      form.addEventListener('submit', e => Pages.handleAdminLogin(e));
    }
  }
```

**New method body:**

```js
  static renderAdminLogin () {
    this.hideOriginalNavFooter();
    document.body.style.background = '';
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
      <div class="adm-auth">
        <aside class="adm-auth-side">
          <div class="adm-auth-brand">
            <div class="adm-auth-brand-mark">J</div>
            <div class="adm-auth-brand-name">JERTS CART</div>
          </div>
          <div class="adm-auth-side-content">
            <h1 class="adm-auth-tagline">Run your <span class="adm-auth-tagline-accent">student marketplace</span></h1>
            <p class="adm-auth-description">The JERTS CART admin panel lets you manage verifications, products, orders, payouts, and seller activity across the marketplace. Sign in with your admin credentials to continue.</p>
          </div>
          <div class="adm-auth-meta">© JERTS CART · Internal use only</div>
        </aside>
        <main class="adm-auth-form">
          <div class="adm-auth-form-inner">
            <h2 class="adm-auth-form-title">Sign in</h2>
            <p class="adm-auth-form-sub">Use your admin email and password to access the panel.</p>
            <form id="admin-login-form" novalidate>
              <div class="adm-form-group">
                <label for="admin-email" class="adm-form-label adm-form-label--required">Email</label>
                <input type="email" id="admin-email" name="email" class="adm-form-input" required autocomplete="username" />
              </div>
              <div class="adm-form-group">
                <label for="admin-password" class="adm-form-label adm-form-label--required">Password</label>
                <input type="password" id="admin-password" name="password" class="adm-form-input" required autocomplete="current-password" />
              </div>
              <button type="submit" class="adm-btn adm-btn--primary adm-form-btn">Sign in</button>
            </form>
            <div class="adm-form-footer">
              <a href="#/">← Back to marketplace</a>
            </div>
          </div>
        </main>
      </div>
    `;
    const form = document.getElementById('admin-login-form');
    if (form) {
      form.addEventListener('submit', e => Pages.handleAdminLogin(e));
    }
  }
```

**Step 3.3:** Verify lint + build.

```bash
cd /home/belteshazzarkijin/Documents/danny/Uni-Hub
npm run lint:check 2>&1 | tail -3
npm run build 2>&1 | tail -3
# Both should be unchanged from baseline.
```

**Step 3.4:** Visual + functional check.

```bash
agent-browser eval "location.reload(true)" 2>&1 | tail -1
sleep 4
agent-browser open http://localhost:8000/#/admin 2>&1 | tail -1
sleep 3
agent-browser screenshot /tmp/opencode/admin-shots-2/v3-01-login.png 2>&1 | tail -1
# Expected: blue side panel on left with J mark + JERTS CART + tagline;
#           white form on right with Sign in title, email/password fields,
#           "Sign in" primary button, "Back to marketplace" link.

# Functional: log in
agent-browser snapshot 2>&1 | grep -E "Email|Password|Sign" | head -3
agent-browser fill "input[type=email]" "admin@unihub.local"
agent-browser fill "input[type=password]" "Admin123!"
agent-browser click "button[type=submit]"
sleep 3
# Should redirect to dashboard
agent-browser snapshot 2>&1 | grep "Dashboard" | head -1
# Expected: a heading "Dashboard" appears
```

**Step 3.5:** Commit.

```bash
git add js/pages/pages.js
git commit -m "Convert admin login to split brand layout"
```

---

### Task 4: 404 + shared error page split layout

**Files:**
- Modify: `js/pages/static-pages.js` — add a new shared error-page renderer and update the 404 page to use it.
- Modify: `js/pages/pages.js` — register the error renderer (if not already in static-pages)

**Why:** Currently the storefront 404 is a generic Bootstrap error. The user wants it brand-aligned.

**Step 4.1:** Find the current 404 renderer in `static-pages.js`.

```bash
grep -n "404\|Page Not Found\|page-not-found" /home/belteshazzarkijin/Documents/danny/Uni-Hub/js/pages/static-pages.js | head -10
```

**Step 4.2:** Read the current 404 page render function and the existing render pipeline (it should be a static method on a Pages-like class or a function called from the router). Make note of the function name and how it's invoked.

**Step 4.3:** Add a new function `AdminUI.renderErrorPage({ code, title, body, primaryAction })` as a static method on the `AdminUI` class added in Task 2. The function returns a split-layout HTML string using the same `adm-auth` classes from Task 1 (re-purposed for an error page). Place this at the end of the `AdminUI` class definition, just before its closing `}`. Use the Edit tool with oldString = the LAST existing method's closing brace `}` (look for the unique `\n  // ---- Standard pill group wiring ----` block as the new method's anchor) and newString = that block plus the new method.

Insert this block at the end of the `AdminUI` class (just before the final `}` that closes the class):

```js
  // ---- Shared error / 404 / 500 / 403 / logout page (split brand layout) ----
  // Reuses the adm-auth split layout from the login page for visual
  // consistency. The side panel is the same brand panel; the right
  // side shows the error message + primary action.
  static renderErrorPage ({ code, title, body, primaryAction }) {
    const primary = primaryAction
      ? `<a href="${_pageEsc(primaryAction.href)}" class="adm-btn adm-btn--primary">${_pageEsc(primaryAction.label)}</a>`
      : '';
    return `
      <div class="adm-auth">
        <aside class="adm-auth-side">
          <div class="adm-auth-brand">
            <div class="adm-auth-brand-mark">J</div>
            <div class="adm-auth-brand-name">JERTS CART</div>
          </div>
          <div class="adm-auth-side-content">
            <h1 class="adm-auth-tagline">Something's <span class="adm-auth-tagline-accent">off</span>.</h1>
            <p class="adm-auth-description">The page you were looking for isn't here. It may have moved, been renamed, or never existed. Use the action below to get back on track.</p>
          </div>
          <div class="adm-auth-meta">© JERTS CART · Error ${_pageEsc(code || '404')}</div>
        </aside>
        <main class="adm-auth-form">
          <div class="adm-auth-form-inner">
            <h2 style="font-size:48px;font-weight:700;color:var(--neutral-900);margin:0 0 8px;letter-spacing:-0.02em;line-height:1;">${_pageEsc(code || '404')}</h2>
            <h3 class="adm-auth-form-title">${_pageEsc(title || 'Page not found')}</h3>
            <p class="adm-auth-form-sub">${_pageEsc(body || 'The page you are looking for does not exist or has been moved.')}</p>
            <div style="margin-top:24px;display:flex;gap:8px;flex-wrap:wrap;">
              ${primary}
              <a href="#/" class="adm-btn">Go to marketplace</a>
            </div>
          </div>
        </main>
      </div>
    `;
  }
```

**Step 4.4:** In `static-pages.js`, find the function that renders the 404 and replace its body to call the new `AdminUI.renderErrorPage`. The exact replacement depends on the current structure. The minimum pattern is: replace any `mainContent.innerHTML = ...generic 404 HTML...` with `mainContent.innerHTML = AdminUI.renderErrorPage({ code: '404', title: 'Page not found', body: 'The page you are looking for does not exist or has been moved.', primaryAction: { label: 'Back to dashboard', href: '#/admin' } })`.

If the current code uses `this.hideOriginalNavFooter()` and `document.body.style.background = ''`, keep those calls.

For logout / 403 / 500 pages (if they exist as separate functions), apply the same pattern.

**Step 4.5:** Verify lint + build.

```bash
cd /home/belteshazzarkijin/Documents/danny/Uni-Hub
npm run lint:check 2>&1 | tail -3
npm run build 2>&1 | tail -3
```

**Step 4.6:** Visual check.

```bash
agent-browser eval "location.reload(true)" 2>&1 | tail -1
sleep 4
agent-browser open http://localhost:8000/#/some-bogus-route 2>&1 | tail -1
sleep 2
agent-browser screenshot /tmp/opencode/admin-shots-2/v3-02-404.png 2>&1 | tail -1
# Expected: blue side panel on left with JERTS CART + "Something's off." tagline;
#           white right side with "404" in big type + "Page not found" title +
#           body + "Back to dashboard" primary button + "Go to marketplace" ghost.
```

**Step 4.7:** Commit.

```bash
git add js/pages/static-pages.js js/pages/pages.js
git commit -m "Convert 404 and shared error pages to split brand layout"
```

---

### Task 5: Dashboard

**Files:**
- Modify: `js/pages/pages.js` — replace `static async renderAdminDashboard ()` (currently ~line 4052-4282)

**Reference:** Dashboard section in the mockup. Structure: sidebar + topbar + page header (Dashboard + "Tuesday, August 26 · Last refreshed 2 minutes ago" + period selector) + 4 stat cards (Total users / GMV / Commission earned / Payout queue) + Recent activity card (title + sub + filter pill group + table).

**Step 5.1:** Find and read the current method.

```bash
grep -n "static async renderAdminDashboard" /home/belteshazzarkijin/Documents/danny/Uni-Hub/js/pages/pages.js
```

**Step 5.2:** Replace the entire method body. The new version:

- Hides original nav/footer (keep existing call)
- Renders sidebar via `AdminUI.sidebar('dashboard')` (replace `this.getAdminSidebar('dashboard')`)
- Renders topbar with breadcrumb "Admin / Dashboard" and a search input (placeholder, no behavior) + notification icon button + "New product" primary button
- Page header with title "Dashboard" + sub "Tuesday, August 26 · Last refreshed 2 min ago" + period pill group (7d/30d/90d/All time) — the period is decorative for now
- 4 stat cards: Total users (9, +2 this week), GMV (GHS 0), Commission earned (GHS 0), Payout queue (1, GHS 120.50 awaiting review — `--danger` color)
- A "Recent activity" card with pill group (All/Orders/Payouts/Logins) and a sample table of activity rows (use real `stats.recentOrders` and `stats.recentUsers` data if available, or fallback to a static 4-row example with Login, Payout request, Order placed, Login)

The data fetching (`api.admin.getPayouts` + `adminReportsManager.getDashboardOverview`) and stats rendering logic should stay, just inside the new layout. The activity card uses `AdminUI.table` with columns `[{label:'Time', render:r => AdminUI.fmtTime(r.createdAt)}, ...]`.

Use the oldString = the entire current `static async renderAdminDashboard` method body (from `static async renderAdminDashboard () {` through its matching closing `}` — find the unique anchor `// Wait briefly so the dashboard card is populated` is currently inside it; the closing `}` is the next standalone `}` on its own line). Replace with the new method.

**Step 5.3:** Verify lint + build.

```bash
cd /home/belteshazzarkijin/Documents/danny/Uni-Hub
npm run lint:check 2>&1 | tail -3
npm run build 2>&1 | tail -3
```

**Step 5.4:** Visual + functional check.

```bash
agent-browser eval "location.reload(true)" 2>&1 | tail -1
sleep 4
agent-browser open http://localhost:8000/#/admin 2>&1 | tail -1
sleep 3
agent-browser screenshot /tmp/opencode/admin-shots-2/v3-03-dashboard.png 2>&1 | tail -1
# Expected: light sidebar with J mark, blue topbar with breadcrumb, "Dashboard"
# 24px h1, 4 stat cards in a row, recent activity card with table.

# Functional: sidebar nav click
agent-browser click "[data-adm-nav='users']" 2>&1 | tail -1
sleep 2
agent-browser snapshot 2>&1 | grep -E "User Management|Page not found" | head -1
# Expected: navigation works (either users page or placeholder route — at minimum
# the active sidebar item switches to Users).

# Functional: period selector
agent-browser open http://localhost:8000/#/admin 2>&1 | tail -1
sleep 2
agent-browser click "[data-adm-pill='7d']" 2>&1 | tail -1
sleep 1
agent-browser eval "document.querySelector('[data-adm-pill=7d]').classList.contains('is-active')" 2>&1 | tail -1
# Expected: true

# Functional: filter pill
agent-browser click "[data-adm-pill='orders']" 2>&1 | tail -1
sleep 1
agent-browser eval "document.querySelector('[data-adm-pill=orders]').classList.contains('is-active')" 2>&1 | tail -1
# Expected: true
```

**Step 5.5:** Commit.

```bash
git add js/pages/pages.js
git commit -m "Rewrite admin dashboard with adm-* layout and helpers"
```

---

### Task 6: Users

**Files:**
- Modify: `js/pages/pages.js` — replace `static async renderAdminUsers ()` (currently ~line 4954)

**Reference:** Same as Dashboard. Page header "User Management" + sub "Manage all user accounts". Table with columns: User (avatar + name), Email, University, Role (badge), Status (badge), Actions (Ban/Unban buttons). Empty state via `AdminUI.emptyState` if no users.

**Step 6.1:** Find the current method.

```bash
grep -n "static async renderAdminUsers" /home/belteshazzarkijin/Documents/danny/Uni-Hub/js/pages/pages.js
```

**Step 6.2:** Replace the method body. The new version uses the same `adm-layout` + `AdminUI.sidebar('users')` + `AdminUI.topbar(...)` + `AdminUI.pageHeader(...)` + `AdminUI.table(...)` pattern. The topbar's primary action is "+ Invite user" or "Add user" (matches existing behavior — if the current code has "+ Add User" keep that). The table rows render avatars from `u.fullName.charAt(0)`. Action buttons are `.adm-btn adm-btn--sm adm-btn--danger` for Ban and `.adm-btn adm-btn--sm` for Unban. Delegation on the table's `data-user-action` attribute for click handling.

**Step 6.3:** Verify lint + build.

**Step 6.4:** Visual + functional check.

```bash
agent-browser eval "location.reload(true)" 2>&1 | tail -1
sleep 4
agent-browser open http://localhost:8000/#/admin/users 2>&1 | tail -1
sleep 3
agent-browser screenshot /tmp/opencode/admin-shots-2/v3-04-users.png 2>&1 | tail -1
# Expected: light sidebar, "User Management" h1, table with avatar+name+email+uni+role+status+actions rows.
# Click a Ban button — toast or state change should occur.
agent-browser click "[data-user-action='ban']" 2>&1 | tail -1
sleep 1
# Confirm/window prompt appears — handle or dismiss
agent-browser eval "Object.keys(window).filter(k => k.startsWith('adm')).join(',')" 2>&1 | tail -1
# Expected: AdminUI registered
```

**Step 6.5:** Commit.

```bash
git add js/pages/pages.js
git commit -m "Rewrite admin users page with adm-* layout"
```

---

### Task 7: Products list

**Files:**
- Modify: `js/pages/pages.js` — replace `static async renderAdminProducts ()` (currently ~line 5057)

**Reference:** Same pattern. Page header "Products" + sub "Manage the marketplace catalog". Table with columns: Product (image + title), Category, Price, Seller, Status (active badge), Actions (Edit + Delete). "+ Add Product" primary button in topbar.

**Step 7.1:** Find current method.

```bash
grep -n "static async renderAdminProducts" /home/belteshazzarkijin/Documents/danny/Uni-Hub/js/pages/pages.js
```

**Step 7.2:** Replace the method body. Same layout pattern. The image column shows a 40x40 thumbnail (or empty box if no image). Edit/Delete use `.adm-btn adm-btn--sm` with `--primary` and `--danger` variants respectively. Delegation on the table.

**Step 7.3-7.5:** Verify and commit (same as Task 6).

```bash
git add js/pages/pages.js
git commit -m "Rewrite admin products page with adm-* layout"
```

---

### Task 8: Orders + empty state

**Files:**
- Modify: `js/pages/pages.js` — replace `static async renderAdminOrders ()` (currently ~line 5194)

**Reference:** Page header "Orders" + sub "Track and manage orders across the marketplace". When empty, show `AdminUI.emptyState({ icon: Icons.clipboard, title: 'No orders yet', body: 'When buyers place orders they will appear here. Track payment status, manage fulfillment, and resolve disputes from this page.', actions: '' })`. When populated, table with columns: Order #, Tracking (mono), Customer, Total, Payment, Status (badge), Date, Actions (View).

**Step 8.1-8.5:** Same pattern as Task 5. Commit.

```bash
git add js/pages/pages.js
git commit -m "Rewrite admin orders page with adm-* layout and brand empty state"
```

---

### Task 9: Payouts + reject modal

**Files:**
- Modify: `js/pages/pages.js` — replace `static async renderAdminPayouts ()` (~line 4452) and `static _openRejectPayoutModal ()` (~line 4647)

**Reference:** Page header "Seller Payouts" + sub "Approve and reject seller withdrawal requests". Card with pill group (Requested/Paid/Rejected/All with counts from existing `counts` object). Table with columns: Seller (avatar+name+email+phone), Amount, Method, Destination (mono), Requested, Status (badge), Actions (Approve / Reject buttons or none). Clicking Reject opens `AdminUI.modalHtml` based modal. Use `AdminUI.wireModal` for the standard close handlers. Delegation on the table for `[data-payout-action=approve]` and `[data-payout-action=reject]`.

**Step 9.1-9.5:** Replace the renderer + the modal opener. Visual check: the Reject modal should be the light `adm-modal` style (already done in the prior fix pass via `admin-modal-light*` — keep that working, but migrate to `adm-modal*` for consistency). Commit.

```bash
git add js/pages/pages.js
git commit -m "Rewrite admin payouts page with adm-* layout and modal"
```

---

### Task 10: Verifications + detail modal

**Files:**
- Modify: `js/pages/pages.js` — replace `static async renderAdminVerifications ()` (~line 4284) and `static async viewVerificationDetail ()` (~line 4712)

**Reference:** Page header "Verifications" + sub "Review and approve student ID verifications". 4 stat cards (Pending / Approved / Rejected / Total with color-coded numbers). Card with pill group (Pending / Approved / Rejected / All) and a table. Clicking a row opens `AdminUI.modalHtml({ size: 'lg', ... })` for the detail. Modal body: 8-cell `adm-modal-detail-grid` (Full Name, Student ID, Email, Phone, Level, Hall, Method, Submitted) + documents section + review-notes textarea + Approve/Reject buttons. Delegation on the table for row click + on the overlay for modal actions.

**Step 10.1-10.5:** Replace both methods. The verification detail modal currently uses the prior fix-pass `admin-modal-light*` classes — migrate to the new `adm-modal*` family and use `AdminUI.modalHtml` / `AdminUI.wireModal` to standardize. Keep all data fetching (`api.verification.getDocuments`) and the documents section rendering (purged / image / pdf). For testing the detail modal without a real pending record, the same `adminVerificationsManager.queue.push(...)` trick from earlier can be used. Commit.

```bash
git add js/pages/pages.js
git commit -m "Rewrite admin verifications page with adm-* layout and modal"
```

---

### Task 11: Activity

**Files:**
- Modify: `js/pages/pages.js` — replace `static async renderAdminActivity ()` (~line 5448), `static _loadActivityLogs ()`, `static _loadMoreActivity ()`, `static _renderActivityRows ()`

**Reference:** Page header "Activity Monitor" + sub "Live across orders, verifications, and payouts". Topbar right: select for "All Actions" + "All Severity" (keep these as native selects with `adm-form-input` styling). 3 stat cards (Events Today / Events This Week / Online Now). Card with filter pill group (All/Orders/Payouts/Logins) + table (Time, User with avatar, Action, Detail via `_renderActivityDetails`, Severity with `adm-badge`). Pagination footer.

**Step 11.1-11.5:** Replace the renderer. Keep the existing `_renderActivityDetails` helper (from the prior fix pass) — it already returns good HTML. Map severity → `adm-badge adm-badge--{success/warning/danger/info/neutral}`. Wire the pill group for the "All/Orders/Payouts/Logins" filter (this is a NEW filter; current code filters by action via the topbar select, which we'll keep for action-type filtering; the new pill group is a quick scope filter on the rendered data). Note: the new pill group filters on the client side after data is loaded — keep both, with the pill group as the primary visual filter and the select for action/severity as secondary. Commit.

```bash
git add js/pages/pages.js
git commit -m "Rewrite admin activity page with adm-* layout"
```

---

### Task 12: Reports

**Files:**
- Modify: `js/pages/pages.js` — replace `static async renderAdminReports ()` (~line 5275)

**Reference:** Page header "Reports" + sub "Sales, user, and product reports". Replace the existing `admin-card` blocks with the `adm-card` family. The 3 cards (Sales Report, User Report, Product Report) with `adm-card` shell, `adm-card-header` + `adm-card-title`, and the existing `<div class="admin-health-row">` rows replaced with a 2-column `<div>` using `adm-td` styling inline. No new functionality.

**Step 12.1-12.5:** Replace. Commit.

```bash
git add js/pages/pages.js
git commit -m "Rewrite admin reports page with adm-* layout"
```

---

### Task 13: Analytics

**Files:**
- Modify: `js/pages/pages.js` — replace `static async renderAdminAnalytics ()` (~line 6717)

**Reference:** Page header "Analytics" + sub "30-day trend analysis". The 4 chart cards from Task 7 of the prior fix pass (`.admin-chart-area` → migrate to a new wrapper that combines `adm-card` + the chart area; OR keep the chart cards and just wrap the page header in `adm-page-header`). Use `AdminUI.pageHeader`. The chart canvases stay. Period selector in the page header right (newly added) — initially 30d is the default; when changed, re-render the charts with mock data filtered by the period (this is decorative — the static deploy still uses random data).

**Step 13.1-13.5:** Replace. Commit.

```bash
git add js/pages/pages.js
git commit -m "Rewrite admin analytics page header with adm-* layout"
```

---

### Task 14: Regions

**Files:**
- Modify: `js/pages/pages.js` — replace `static renderAdminRegions ()` (~line 5223)

**Reference:** Page header "Regions" + sub "Manage the universities and regions on the platform". Card + table with columns: Region, Capital, Universities, Actions. The "edit pencil" becomes a `.adm-btn adm-btn--sm` "Edit" button (text, not icon) for clarity.

**Step 14.1-14.5:** Replace. Commit.

```bash
git add js/pages/pages.js
git commit -m "Rewrite admin regions page with adm-* layout"
```

---

### Task 15: Newsletter

**Files:**
- Modify: `js/pages/pages.js` — replace `static async renderAdminNewsletter ()` (~line 5938)

**Reference:** Page header "Newsletter" + sub "Manage subscribers and campaigns". 4 stat cards (Total Subscribers / Active / Pending / Unsubscribed — all currently show "—" so the same value). Card "Recent campaigns" with table. Card "Subscribers" with table. Primary action in topbar: "+ Create campaign" (the current page has a "Create Campaign" button at top — move it to the topbar).

**Step 15.1-15.5:** Replace. Commit.

```bash
git add js/pages/pages.js
git commit -m "Rewrite admin newsletter page with adm-* layout"
```

---

### Task 16: Final gate — module version bump, lint, build, e2e, visual sweep, push

**Files:**
- Modify: `index.html` (bump `?v=19` to `?v=20`)
- Modify: `js/app-init.js` (bump `MODULE_VERSION = '19'` to `MODULE_VERSION = '20'`)
- Modify: `e2e/admin.spec.js`, `e2e/admin-verifications-docs.spec.js`, `e2e/admin-add-product-renders.spec.js`, `e2e/admin-session-persists.spec.js` (any selector updates from the per-page rewrites)

**Why:** Bumping the module version forces the browser to refetch all dynamic imports so the new code is picked up without manual cache clearing. E2e selectors that target `.admin-stat-card` or similar need updating to `.adm-stat` if any test relied on those names.

**Step 16.1:** Bump the version in both places.

```bash
cd /home/belteshazzarkijin/Documents/danny/Uni-Hub
sed -i "s|js/app-init.js?v=19|js/app-init.js?v=20|" index.html
sed -i "s|MODULE_VERSION = '19'|MODULE_VERSION = '20'|" js/app-init.js
grep "v=20\|MODULE_VERSION = '20'" index.html js/app-init.js
# Expected: both show v=20
```

**Step 16.2:** Search the e2e specs for any class names that changed in the rewrites.

```bash
grep -nE "admin-stat-card|admin-title|admin-actions|admin-table-empty-row|admin-status-badge" e2e/*.spec.js
# If any matches exist, those selectors are now .adm-* — update them in this commit.
```

For any found, replace in the same commit:

| Old selector | New selector |
|---|---|
| `.admin-stat-card` | `.adm-stat` |
| `.admin-title` | `.adm-page-title` |
| `.admin-actions` | `.adm-actions` (unchanged) |
| `.admin-table-empty-row` | `.adm-table tbody tr td .adm-empty` |
| `.admin-status-badge` | `.adm-badge` |
| `.admin-stat-value` | `.adm-stat-value` (unchanged) |
| `.admin-stat-label` | `.adm-stat-label` (unchanged) |
| `.admin-table` | `.adm-table` (unchanged) |
| `.admin-card` | `.adm-card` |
| `.admin-card-header` | `.adm-card-header` |
| `.admin-card-title` | `.adm-card-title` |

The same mapping table applies to any other class names that changed.

**Step 16.3:** Run lint.

```bash
npm run lint:check 2>&1 | tail -3
# Expected: ✖ 1426 problems (1415 errors, 11 warnings)
# If new errors, fix them before continuing.
```

**Step 16.4:** Run build.

```bash
npm run build 2>&1 | tail -5
# Expected: ✓ built in <N>s
```

**Step 16.5:** Run the Playwright admin suite.

```bash
npx playwright test e2e/admin.spec.js e2e/admin-session-persists.spec.js e2e/admin-add-product-renders.spec.js e2e/admin-verifications-docs.spec.js --workers=1 2>&1 | tail -15
# Expected: 7 passing, 1 pre-existing MFA failure (admin-session-persists), all others green
```

**Step 16.6:** Visual sweep — re-capture every admin page.

```bash
agent-browser open http://localhost:8000/#/admin/login 2>&1 | tail -1
sleep 2
agent-browser screenshot /tmp/opencode/admin-shots-2/v3-final-01-login.png 2>&1 | tail -1

# Login
agent-browser fill "input[type=email]" "admin@unihub.local"
agent-browser fill "input[type=password]" "Admin123!"
agent-browser click "button[type=submit]"
sleep 3

for route in dashboard verifications users products orders payouts activity reports analytics regions newsletter; do
  agent-browser open "http://localhost:8000/#/admin/$route" 2>&1 > /dev/null
  sleep 2
  agent-browser screenshot "/tmp/opencode/admin-shots-2/v3-final-$route.png" 2>&1 > /dev/null
done

# Test 404
agent-browser open "http://localhost:8000/#/nonexistent-route" 2>&1 | tail -1
sleep 2
agent-browser screenshot /tmp/opencode/admin-shots-2/v3-final-404.png 2>&1 | tail -1
```

**Step 16.7:** Compare each `v3-final-*.png` to the mockup at `.superpowers/brainstorm/108730-1787785891/content/admin-v3.html`. They should match in:
- Sidebar: light surface, J mark, JERTS CART brand, blue active item, yellow count badge on Payouts
- Topbar: white, breadcrumb, search, "+ New product" primary button
- Page header: 24px h1, 13px subtitle, period selector on the right
- Stats: big number + label + delta, no icon-in-square
- Table: avatar + name in user column, status pills, no decorative chips

**Step 16.8:** Functional sweep — verify every button on every page. For each route, check the key interactions (sidebar nav highlights, period selector switches, filter pills filter, primary action opens a modal or navigates). Use the interactive mockup as the gold standard.

```bash
# Pick 3 representative pages and verify
for route in dashboard users payouts; do
  agent-browser open "http://localhost:8000/#/admin/$route" 2>&1 > /dev/null
  sleep 2
  # Sidebar click
  agent-browser click "[data-adm-nav='verifications']" 2>&1 > /dev/null
  sleep 1
  agent-browser eval "JSON.stringify({active: document.querySelector('.adm-nav-item.is-active')?.dataset.admNav, url: location.hash})" 2>&1 | tail -1
  # Expected: active = verifications, url = #/admin/verifications
done
```

**Step 16.9:** Commit the version bump + e2e fixes.

```bash
git add index.html js/app-init.js e2e/
git commit -m "Bump module version 20 and update e2e selectors for adm-* redesign"
```

**Step 16.10:** Push to origin/main.

```bash
git push origin main
```

**Step 16.11:** Final verification — the work is done when:
- All 16 commits are on `main` and pushed
- `npm run lint:check` reports 1426 problems (no new vs baseline)
- `npm run build` succeeds
- 7 of 8 admin e2e tests pass (1 pre-existing MFA failure unrelated)
- All 11 `v3-final-*.png` screenshots match the interactive mockup
- The user has approved the visual + functional sweep

---

## Self-review checklist (run after writing the plan, before executing)

- [x] No "TBD" or "TODO" or "fill in details" placeholders in the plan.
- [x] Every task has a Files list, an Edit/Replace pattern (or build instructions for new content), verification commands, and a commit.
- [x] Type/symbol consistency: `AdminUI.sidebar`, `AdminUI.topbar`, `AdminUI.pageHeader`, `AdminUI.statCard`, `AdminUI.statGrid`, `AdminUI.pillGroup`, `AdminUI.card`, `AdminUI.table`, `AdminUI.emptyState`, `AdminUI.modalHtml`, `AdminUI.wireModal`, `AdminUI.wireSidebar`, `AdminUI.wireSearch`, `AdminUI.wirePillGroup`, `AdminUI.toast`, `AdminUI.renderErrorPage` — same names everywhere.
- [x] Spec coverage: every spec section is mapped to a task (Login → Task 3, 404/Shared error → Task 4, sidebar → Tasks 2 + 5, topbar → Tasks 2 + 5, page header → Task 5 onwards, stats → Task 5, table → Tasks 5-15, filter pills → Tasks 5/9/10/11, modals → Tasks 9/10, empty states → Task 8, toasts → Task 2/5).
- [x] Lint baseline + build gate + commit-per-task discipline.
- [x] Module version bump at the end.
