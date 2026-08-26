# Admin Brand-Aligned Redesign — Design Spec

Date: 2026-08-26
Status: Approved interactive mockup, awaiting human review of this spec
Author: ox-alpha (AI) — requires human review before merge
Related: `docs/superpowers/specs/2026-08-23-admin-design-system.md` (prior fix pass
that fixed dark modals, raw hex, JSON dumps, and empty states). This spec is
**additive on top of that work** — the recent commits are not reverted.

## Problem

The admin panel is functional but reads as a generated default. It uses the
right tokens (Best Buy blue + light surfaces) but the *composition* is generic
Bootstrap-admin: solid-blue sidebar, icon-in-colored-square stat cards, flat
table headers, decorative chips, and a 2010s visual language that doesn't
match the storefront's brand personality. The user wants the admin to feel
like a *real product* — same brand voice as the storefront, same level of
typography care, same restraint in decoration.

What the user said, captured:
- "the admin page looks too AI-slop UI designs"
- "how can we make the designs look professional by maintaining our features?"
- Liked the JERTS CART branded sidebar from the brainstorm.
- "take out the AI gradient UIs" — no gradients, no glows, no decorative
  chips, no fake 3D, no sale-tag stickers, no colored text on light
  backgrounds. Flat colors, real type hierarchy, real whitespace, professional
  restraint.
- Page title treatment should "not match the storefront but can maintain
  its style and theme" — same font + palette, but its own hierarchy (no
  italic-yellow storefront pattern).
- "test and see it every button, or element are functioning" — every
  interactive surface must work and be verified.

## Solution (high level)

Redesign the admin **surfaces** (layout + visual identity) without adding
new features. The data, routes, and behaviors stay exactly the same — every
screen renders the same info as today, but inside a layout that matches the
storefront's brand voice and reads as a designed product.

Out of scope (separate specs/plans): page-specific identity widgets (dashboard
"today" strip, payouts summary card, orders kanban-lite), Wave 2 features
(order detail/refunds, settings page, CSV exports, role-aware sidebar).

## Design language

- **Sidebar** — light surface (`#ffffff`) with `#e5e5e5` right border, brand
  mark at top (flat single-color blue block with white "J"), grouped nav with
  subtle section labels (Operations / Insights), active item = light gray
  background (`#f4f4f4`) + dark text + bold + dark icon stroke. Yellow count
  badge only where the count is a *callout* (not decoration).
- **Top utility bar** — 12px/32px padding, white surface, bottom border,
  breadcrumb left, search + notification + primary action right. Primary
  action is the storefront's brand blue (`#0046be`).
- **Page header** — strong type hierarchy: 24px h1 (700, -0.01em tracking),
  13px muted subtitle below, period selector right-aligned as a small
  tab group (no decorative bar, no chip).
- **Stats cards** — flat white card, 12px label (muted), 30px bold number
  with -0.02em tracking, contextual line under (success/danger text on
  white, never colored text on light backgrounds). No icon-in-square. Hover:
  border darkens to `#d4d4d4`.
- **Table** — denser rows (14px padding), avatar + name in user column,
  status pills using brand tokens (success/warning/danger/neutral as
  light backgrounds + dark text), action menu (•••) right-aligned. Hover:
  row gets `#fafafa` background. Sticky header on long tables.
- **Filter tabs** — flat text group, no rounded chips. Active = dark
  background (`#1a1a1a`) + white text + medium weight. Inactive = transparent
  + gray text. The "All" default is dark.
- **Buttons** — same brand blue primary, white-with-border ghost, red
  danger, green success. 8px/14px padding, 6px radius, 13px text, 600
  weight for primary. Hover: darker shade. Focus: 2px primary ring.
- **Modals** — light card, 10px radius, soft shadow, max-width by purpose
  (default 480px, --lg 720px, --xl 960px). Backdrop = `rgba(15,23,42,0.5)`.
  Esc closes. Backdrop click closes. Focus trap.
- **Toasts** — dark background (`#1a1a1a` for info, brand colors for
  success/warning/danger), 6px radius, 10/14 padding, slide-up animation.
  2.4s auto-dismiss.

## Color tokens (token-driven, zero raw hex in new code)

All colors from `css/variables.css`:
- `--primary` (`#0046be`) — actions, active accents, primary buttons
- `--primary-hover` (`#003399`) — primary button hover
- `--neutral-900` (`#1a1a1a`) — heading text, dark surfaces
- `--neutral-800` (`#2e2e2e`) — body text bold
- `--neutral-700` (`#4a4a4a`) — body text
- `--neutral-600` (`#666666`) — secondary text
- `--neutral-500` (`#6b6b6b`) — muted text, table headers
- `--neutral-400` (`#b0b0b0`) — disabled
- `--neutral-300` (`#d4d4d4`) — hover border
- `--neutral-200` (`#e5e5e5`) — default border, dividers
- `--neutral-100` (`#f4f4f4`) — hover bg, active nav, period chip
- `--neutral-50` (`#fafafa`) — table row hover
- `--bg-primary` (`#ffffff`) — surfaces
- `--bg-secondary` (`#f4f4f4`) — page canvas
- `--success` (`#1a8917`), `--warning` (`#d27500`), `--danger` (`#c00`)
  — status pill text. The pill background is the matching `*-light` token
  (`--success-light`, `--warning-light`, `--danger-light`).

## Component API

### CSS component classes (in `css/pages/admin.css`)

```
.adm-page                       page wrapper
.adm-page-header                page header section
.adm-page-title                 24px h1
.adm-page-sub                   13px subtitle
.adm-actions                    right-aligned action group

.adm-stats                      grid container
.adm-stat                       stat card
.adm-stat-label                 12px label
.adm-stat-value                 30px number
.adm-stat-delta                 contextual line under (success/danger/muted)

.adm-card                       white surface
.adm-card-header                header row inside card
.adm-card-title                 14px card title
.adm-card-sub                   12px card subtitle

.adm-table-wrap                 overflow wrapper
.adm-table                      table
.adm-th                         header cell
.adm-td                         body cell
.adm-table-empty                empty state row (replaces .admin-table-empty-row)

.adm-badge                      status pill base
.adm-badge--success/warning/danger/info/neutral   pill variants

.adm-btn                        button base
.adm-btn--primary               brand blue
.adm-btn--ghost                 white with border
.adm-btn--danger                red
.adm-btn--success               green

.adm-pill-group                 flat text group container
.adm-pill                       flat text tab
.adm-pill--active               active state

.adm-empty                      empty state (icon + title + body + CTA)

.adm-modal                      modal card
.adm-modal--lg/--xl             size variants
.adm-modal-backdrop             backdrop

.adm-input                      input field
.adm-toast                      toast item
```

The legacy `.admin-*` classes from the existing `admin.css` stay in place
(used by `css/pages/admin.css` itself and the prior fix-pass commits). New
code uses `.adm-*`. The two are compatible — `.adm-*` is the
brand-aligned family, `.admin-*` is the generic family.

### HTML structure conventions (per surface)

**Sidebar (`js/pages/pages.js` `getAdminSidebar`):**
```html
<aside class="adm-sidebar">
  <div class="adm-brand">
    <div class="adm-brand-mark">J</div>
    <div>
      <div class="adm-brand-name">JERTS CART</div>
      <div class="adm-brand-tag">Admin</div>
    </div>
  </div>
  <div class="adm-profile">
    <div class="adm-avatar-sm">AU</div>
    <div>
      <div class="adm-profile-name">Admin User</div>
      <div class="adm-profile-email">admin@unihub.local</div>
    </div>
  </div>
  <nav class="adm-sidebar-nav">
    <div class="adm-nav-section-label">Operations</div>
    <a data-key="dashboard" class="adm-nav-item is-active">…</a>
    <a data-key="verifications" class="adm-nav-item">…</a>
    …
    <div class="adm-nav-section-label">Insights</div>
    …
  </nav>
  <div class="adm-sidebar-footer">
    <button data-action="toggle-dark">Dark mode</button>
    <button data-action="help">Help</button>
    <button data-action="logout">Log out</button>
  </div>
</aside>
```

**Top utility bar (new, rendered inside each admin page main):**
```html
<div class="adm-topbar">
  <div class="adm-breadcrumb">
    <a href="#/admin">Admin</a> / <span>Dashboard</span>
  </div>
  <div class="adm-topbar-actions">
    <div class="adm-search">
      <input type="search" placeholder="Search…" data-action="search">
      <span class="adm-search-kbd">⌘K</span>
    </div>
    <button data-action="notifications">…</button>
    <button data-action="primary-page" class="adm-btn adm-btn--primary">
      + New product
    </button>
  </div>
</div>
```

**Page header:**
```html
<header class="adm-page-header">
  <div>
    <h1 class="adm-page-title">Dashboard</h1>
    <p class="adm-page-sub">Tuesday, August 26 · Last refreshed 2 min ago</p>
  </div>
  <div class="adm-actions">
    <div class="adm-pill-group" role="tablist">
      <button class="adm-pill" data-period="7d">7d</button>
      <button class="adm-pill is-active" data-period="30d">30d</button>
      <button class="adm-pill" data-period="90d">90d</button>
      <button class="adm-pill" data-period="all">All time</button>
    </div>
  </div>
</header>
```

**Stats grid (dashboard example):**
```html
<section class="adm-stats">
  <div class="adm-stat">
    <div class="adm-stat-label">Total users</div>
    <div class="adm-stat-value">9</div>
    <div class="adm-stat-delta adm-stat-delta--success">+2 this week</div>
  </div>
  …
</section>
```

**Table:**
```html
<section class="adm-card">
  <header class="adm-card-header">
    <div>
      <h3 class="adm-card-title">Recent activity</h3>
      <p class="adm-card-sub">Live across orders, verifications, and payouts.</p>
    </div>
    <div class="adm-pill-group">
      <button class="adm-pill is-active" data-filter="all">All</button>
      <button class="adm-pill" data-filter="orders">Orders</button>
      …
    </div>
  </header>
  <div class="adm-table-wrap">
    <table class="adm-table">
      <thead><tr><th>Time</th>…</tr></thead>
      <tbody>
        <tr>
          <td>2 min ago</td>
          <td>
            <div class="adm-user-cell">
              <div class="adm-avatar-sm">AU</div>
              <span>Admin User</span>
            </div>
          </td>
          <td>Login</td>
          <td>admin@unihub.local</td>
          <td class="adm-text-right">
            <span class="adm-badge adm-badge--info">Info</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <footer class="adm-pagination">
    <span>Showing 4 of 4</span>
    <button>Previous</button>
    <button>Next</button>
  </footer>
</section>
```

## Pages affected (all keep their existing data + routes)

| Page | What changes |
|---|---|
| Login (`renderAdminLogin`) | Split layout: blue brand panel left with logo + tagline, form right. Replaces "card on a void". |
| 404 (storefront) | Same split layout, brand-styled. Replaces generic Bootstrap error. |
| Dashboard | Stats, page header, breadcrumb, topbar. Period selector wires to backend `?days=` query. |
| Verifications | Tabs as `.adm-pill-group`, table as `.adm-table`. Filter rows on data attributes (existing delegation). |
| Users | Search bar filters table live (client-side). |
| Products | Same. |
| Orders | Empty state uses `.adm-empty` with brand voice copy. |
| Payouts | Tabs as `.adm-pill-group`. Reject modal uses `.adm-modal`. |
| Reports | KPI cards, chart placeholders. |
| Analytics | Charts (Chart.js) keep dark chart colors but the wrapping cards are now light `.adm-chart-area`. |
| Activity | Filter tabs, severity badges use `.adm-badge`. |
| Regions | Table only. |
| Newsletter | Stats + table. |
| Logout / 403 / 500 | New shared error page. |

## Error handling / testing

- Behavior-preserving: same routes, same data calls, same delegated actions
  re-pointed at new markup. Playwright admin suite (4 spec files) stays green.
- Per-page visual verification: agent-browser screenshots before/after
  compared against `interactive-mockup` reference; the dashboard
  interactivity (period selector, filter tabs, search) is the gold standard
  for visual + functional parity.
- Lint baseline: `npm run lint:check` reports no NEW errors vs. 1426
  (1415 errors, 11 warnings) pre-redesign.
- Build: `npm run build` must succeed.
- Interactive gate per page: every button, tab, form, modal verified by
  agent-browser or by Playwright before that page is marked done.

## Rollout/risks

- Largest risk: e2e selector breakage. The current selectors in
  `admin.spec.js` and `admin-verifications-docs.spec.js` target class names
  that may change (e.g. `admin-stat-card` → `adm-stat`). Each task that
  renames a class updates the e2e selectors in the same commit.
- The pages.js file is large (~7300 lines). Changes are localized to
  each render method + the shared `getAdminSidebar`; no cross-page
  refactor.
- The module version (`?v=N` in `app-init.js`) gets bumped on the final
  commit so users get the new CSS without a stale-cache.

## Open questions for review

1. Should the dark-mode toggle in the sidebar footer do anything in this
   pass, or stay visual-only and punt to a later spec? Recommend: visual-only
   (toggle the label, no theme change) — dark mode for the admin is its own
   design problem worth a dedicated spec.
2. Should the topbar search be global (queries multiple APIs) or
   page-scoped (filters the current page's table)? Recommend: page-scoped
   for this pass. Global search is a separate feature.
3. The brand mark currently shows "J" (single letter). If you have a real
   logo SVG (the storefront's `jerts.jpg` is a photo, not a mark), drop it in
   `public/components/logos/` and I'll swap the "J" for it.

## Reference

- Interactive mockup: brainstorm session at `/tmp/opencode/admin-shots-2/...`
  served from `.superpowers/brainstorm/108730-*/content/admin-v3.html`
  (server still running at `http://localhost:53499/?key=0c62d2…`).
- Storefront reference: blue hero with yellow italic "Student" accent on
  `Discover Student Deals`; pill-shaped category filter rail with counts;
  Best Buy-style card grid for products.
- Tokens: `css/variables.css`.
- Prior fix-pass commits on `main`: `599901e1` through `f8e3ff06` — kept
  intact, this spec is additive.
