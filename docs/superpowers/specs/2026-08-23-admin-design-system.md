# Admin Design System ("Retail Console") — Design Spec

Date: 2026-08-23
Status: Approved design, awaiting implementation plan
Author: ox-alpha (AI) — requires human review before merge
Related: Wave 2 roadmap (order detail/refunds, settings page, CSV exports,
role-aware sidebar will be built ON this system in a separate spec).

## Problem

The admin panel mixes a Best Buy–inspired light storefront theme with
dark-theme fragments: invisible white-on-white text (payouts/verifications
seller names), #111827 dark modals, emoji used as icons, raw JSON dumped in
the activity table, dead empty states, and hundreds of one-off inline styles.
Root cause: admin UI is copy-pasted HTML smeared across a 7,000-line
pages.js with no shared components.

User decision: full "Retail Console" direction — token-driven light theme,
shared component system, structural refactor of all admin pages. Wave 2
features are built on the new system afterwards (separate spec).

## Design language (from css/variables.css — the storefront's own tokens)

- Canvas: `--bg-secondary` (#f4f4f4); content on white `.adm-card` surfaces,
  `1px solid var(--neutral-200)` borders, storefront radius scale.
- Blue `--primary` = actions, links, active nav, primary buttons.
- Yellow `--secondary` = HIGHLIGHT ONLY (pending-count badges, "awaiting
  review") — never buttons, never large surfaces.
- Status pills: `--success/warning/danger` text on matching `*-light`
  backgrounds (all pairs already defined in variables.css, 4.5:1 verified).
- Text: `--neutral-800` headings, `--neutral-700` body, `--neutral-500`
  secondary — never lighter on light surfaces.
- Icons: existing `Icons` SVG util only. Emoji prohibited in admin UI.
- Sidebar: unchanged (already on-brand blue with white active notch).
- Motion: 150–200ms transitions on hover/focus; visible `:focus-visible`
  rings; `prefers-reduced-motion` honored; `cursor: pointer` on clickables.

## Architecture

### 1. `css/pages/admin.css` (new, loaded from index.html after style.css)

Component classes (prefix `adm-`), all values from tokens — ZERO raw hex:

| Class | Purpose |
|---|---|
| `.adm-page`, `.adm-page-header`, `.adm-page-title`, `.adm-page-sub` | Page scaffolding |
| `.adm-stats-grid`, `.adm-stat-card`, `.adm-stat-value`, `.adm-stat-label`, `.adm-stat-badge` | KPI cards (replaces admin-stats inline soup) |
| `.adm-card`, `.adm-card-header`, `.adm-card-title` | Generic white surface |
| `.adm-table`, `.adm-th`, `.adm-td` | Data tables: sticky header, row hover `--neutral-50`, token text colors |
| `.adm-badge` + modifiers `--success --warning --danger --info --neutral` | Status pills |
| `.adm-btn` + `--primary --ghost --danger` | Action buttons (replace raw-hex inline buttons) |
| `.adm-tabs`, `.adm-tab` (+ `.is-active`) | Filter tab rows |
| `.adm-empty` (+ icon/title/action slots) | Empty states with guidance |
| `.adm-modal-backdrop`, `.adm-modal`, header/body/footer | Light modals (replaces #111827) |
| `.adm-toast`, `.adm-toast-item` | Restyled to storefront toast look |
| `.adm-detail-grid`, `.adm-kv` | Key/value detail rows (verification detail, order detail) |
| `.adm-field`, `.adm-input`, `.adm-textarea` | Form controls in modals |

Responsive: stats grid `repeat(auto-fit,minmax(200px,1fr))`; tables scroll
horizontally in `.adm-table-wrap` under 768px; sidebar behavior unchanged.

Accessibility: `:focus-visible { outline: 2px solid var(--primary);
outline-offset: 2px }`; minimum touch target 40px for table action buttons;
contrast pairs taken only from variables.css verified pairs.

### 2. `js/admin/admin-ui.js` (new hybrid module)

String-template helpers — pure functions returning HTML strings; pages
compose them. Registered in app-init.js admin group; window-exposed as
`AdminUI`.

```js
window.AdminUI = {
  pageHeader(title, subtitle, actionsHtml),
  statCard({ value, label, badge, icon, onClickAttr }),
  card(title, bodyHtml, actionsHtml),
  table({ columns: [{label, key|render}], rows, emptyAction }),
  statusBadge(status),           // maps domain statuses -> adm-badge modifier
  emptyState({ icon, title, message, actionLabel, actionAttr }),
  modal({ id, title, bodyHtml, footerHtml, danger }),
  filterTabs(tabs, activeKey, attrName),
  esc(v),                        // SecurityUtils.escapeHtml passthrough w/ fallback
};
```

Rules encoded in helpers: all dynamic values escaped via `esc()`; buttons
carry `data-adm-action` + `data-id` for delegation (NO inline onclick in NEW
markup); status→badge mapping centralized (payout, order, verification,
product, user statuses).

### 3. Page migration (each becomes a focused module)

New files under `js/admin/admin-pages/`, registered in app-init.js pages
group before `pages.js`; router registrations move with them:

| New module | Migrates from pages.js |
|---|---|
| `admin-dashboard-page.js` | renderAdminDashboard (~line 3957) |
| `admin-users-page.js` | renderAdminUsers |
| `admin-products-page.js` | renderAdminProducts (+create/edit forms) |
| `admin-orders-page.js` | renderAdminOrders |
| `admin-payouts-page.js` | renderAdminPayouts + approve/reject modal |
| `admin-verifications-page.js` | renderAdminVerifications + detail modal |
| `admin-activity-page.js` | renderAdminActivity |
| `admin-reports-page.js` / `admin-analytics-page.js` / `admin-regions-page.js` / `admin-newsletter-page.js` | corresponding renderers |
| `admin-login-page.js` | renderAdminLogin |

`pages.js` keeps thin delegating stubs (`Pages.renderAdminUsers()` →
`AdminUsersPage.render()`) so existing router registrations and any
`onclick="Pages.renderAdminUsers()"` references keep working during
migration. Sidebar (`getAdminSidebar`) moves to `admin-ui.js` as
`AdminUI.sidebar(activeItem)`.

pages.js shrinks by ~2,500 lines across the migration.

### 4. Defect fixes landed by the migration

1. Invisible `#f9fafb` seller/student names → `.adm-td` token colors
   (payouts, verifications).
2. Dark #111827 modals → `.adm-modal` light surfaces (verification detail,
   payout reject, delete-account).
3. Activity details: parse JSON server payloads → human-readable
   key/value rows (`.adm-kv`); severity pill via `.adm-badge`; raw JSON
   shown only as collapsed fallback for unparseable entries.
4. Emoji (📋💸🗑✓✕) → `Icons` SVGs; text-glyph buttons → `.adm-btn` with
   labels.
5. Empty states: orders/users/products/payouts/verifications get
   `.adm-empty` with icon + message + primary action ("Add product",
   "Adjust filters", …).
6. Admin toasts restyled via `.adm-toast` to match storefront toasts.

## Error handling / testing

- Migration is behavior-preserving: same routes, same data calls, same
  delegated actions (re-pointed at new markup). Playwright admin suite
  (admin.spec.js, admin-verifications-docs.spec.js,
  admin-session-persists.spec.js, admin-add-product-renders.spec.js) must
  stay green — selectors updated only where classes changed.
- Per-page visual verification: agent-browser screenshots before/after;
  check text contrast on payouts/verifications rows specifically.
- Gates per task: eslint on touched files (no NEW errors vs baseline),
  `npm run build`, full Playwright admin set at the end.

## Out of scope (Spec B — Wave 2 on this system)

- Order detail drawer + refund wiring, settings page (commission %),
  CSV exports, role-aware sidebar items
- Any backend changes
- Storefront styling (untouched)

## Rollout/risks

- Largest risk: selector breakage in e2e tests → mitigated by keeping
  `admin-title`, `admin-sidebar`, route paths, and `Pages.renderAdminX()`
  API stable; e2e selectors that target removed classes get updated in the
  same task that removes them.
- pages.js edits are conflict-prone → migration is one page per task/commit.
