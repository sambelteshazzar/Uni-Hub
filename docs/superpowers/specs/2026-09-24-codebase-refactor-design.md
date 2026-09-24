# Codebase Refactor — Design

**Date:** 2026-09-24
**Status:** approved (design), pending implementation plan
**Scope decision:** frontend only; strict refactor-only; phased approach

## Context

Measured facts driving this design:

| Area | Fact |
| --- | --- |
| `js/pages/pages.js` | 11,082 lines, 188 static methods, 57 `window.*` exports — the monolith |
| Other hotspots | `auth-pages.js` 2.2k, `checkout.js` 1.3k, `browse-pages.js` 1.1k, `api.js` 1.0k |
| Inline handlers | ~160 total (82 in `pages.js`) — standing CSP blocker per AGENTS.md |
| Dead markers | 42 `TODO/FIXME/legacy/deprecated` hits |
| Backend | Excluded: healthier (largest file 746 lines), not where the pain is |
| Safety net | 313 backend tests, 35 e2e specs, **zero frontend unit tests** |

The 188 static methods in `pages.js` are three kinds of code mixed together: a **UI
kit** (lines ~74–830: `card`, `table`, `modalHtml`, `toast`, `pillGroup`, `sidebar`…,
already written like a component library), **page renderers** (`renderLanding`,
`renderBrowse`, admin page renders…), and **route wiring/helpers** (`registerRoutes`,
`navigate`, formatters).

## Decisions (confirmed with developer)

1. **Scope:** phased — surgical pass → test gate → structure work (refined approach C).
2. **Strictness:** refactor-only (decision A). Bugs/UX issues found go to a findings
   log; no behavior fixes inside refactor commits.
3. **Backend:** out of scope this round.
4. **Inline handlers:** full migration to delegation as an explicit sub-phase (B), not
   "migrate what we touch".
5. **Tests:** e2e expansion only, no new dependencies (A). No vitest this round;
   re-evaluate only if the phase-2 gate proves insufficient (deferred, not decided).
6. **Structure:** layer-first then vertical (approach B): extract the UI kit first,
   then split renderers by feature. Not an upfront full-split (A), not a targetless
   strangler (C).

## Target architecture

```
js/
├── ui/                      ← NEW: extracted UI kit
│   ├── layout.js            brand, sidebar, topbar, pageHeader, nav helpers
│   ├── data.js              card, table, tableSkeleton, statCard, pagination, rowMenu
│   ├── overlays.js          modalHtml, wireModal, confirmDialog, promptDialog, toast
│   └── feedback.js          emptyState, renderErrorPage, pillGroup + wiring
├── pages/
│   ├── pages.js             route registry + shared page helpers (target ≤2,000 lines)
│   └── <feature>-page.js    renderers grouped by feature (checkout, browse, verification,
│                            orders, profile, …)
├── admin/                   existing files gain admin renderers moved out of pages.js
└── setup/globals.js         public contract unchanged — every window.* name keeps working
```

**Compat contract.** The 57 `window.*` exports and all `globals.js` re-exports keep
identical names; consumers never notice where a function lives. Correction from
planning: the kit's 26 methods live on `class AdminUI` (pages.js:72–821,
`window.AdminUI` at :821), not on `Pages` — the only external consumer is
`router.js` (`AdminUI.renderErrorPage`, 4 refs), plus in-file self-refs. Kit methods
leave `pages.js` via one **module-level compat object** that grows as each ui file is
extracted — `const AdminUI = { ...layout, ...inlineRemainders }` — ending as a pure
spread block (`{ ...layout, ...overlays, ...data, ...feedback }`), no per-method
forwarders. `renderStars` stays in `pages.js` as a shared helper (it is a `Pages`
static, outside the kit block). Verify-item before the swap: confirm nothing
enumerates `AdminUI` (`for…in`, `getOwnPropertyNames`, `new AdminUI`) — class statics
are non-enumerable while object properties are enumerable. If enumeration exists, use
`Object.defineProperties` with `enumerable: false` instead. New internal code imports
from `js/ui/*` directly.

**Classification rule** (placement of every method): `ui/*` if it renders/wires a
widget with no feature-specific data; `<feature>-page.js` if it renders one product
area; `pages.js` only if it serves the router itself.

## Phase order

1. **1a — Surgical pass.**    Dead code (triage all 42 `TODO/FIXME/legacy` grep matches: delete what lint + e2e
   prove unused; the rest goes to the findings log), duplicate extraction (rule of
   three: extract only patterns appearing ≥3 times), renames **only** for code that
   survives the end-state in place.
2. **1b — E2E characterization gate.** Specs written **before** any risky change,
   pinning critical flows: browse/search, product detail, cart → checkout gate
   (the bug-prone zone), auth + verification status page, messages, admin
   dashboard/verifications/users, landing. Floor list only — the final spec set is
   derived from the renderer inventory produced in the implementation plan.
3. **1c — UI kit extraction.** Pure-move commits (moves + import/compat wiring only;
   zero logic edits) moving lines ~74–830 into `js/ui/*`.
4. **1d — Inline-handler migration.** All ~160 handlers → delegation/`addEventListener`
   in their final locations, test-backed by 1b.
5. **Phase 2 — Feature split.** One feature area per commit; renderers move to their
   files (feature files under `js/pages/`, admin renderers into `js/admin/*`).

**Gate after every commit-sized unit:** the full AGENTS.md verification set verbatim —
`npm run lint:check`, `npx prettier --check "js/**/*.js" "css/**/*.css"`,
`npm run build`. **Full e2e at every phase end and after every event-wiring batch.**
Backend untouched; backend `lint:check` + `test` run at phase ends as sanity only.

## Working mechanics

- **Findings log:** `docs/REFACTOR_FINDINGS.md`, numbered entries:
  `file:line`, description, category (bug / UX / debt), suggested fix. Committed as a
  deliverable; never fixed inside refactor commits.
- **Commits:** `refactor:` prefix, one coherent unit each, gates green per unit.
  Orthogonality: a commit contains exactly one kind of change (moves, or renames, or
  handler edits — never mixed).
- **Renames:** descriptive camelCase per existing style; `_`-prefix for
  intentionally-unused names (ESLint convention); 1a only, stay-put code only.

## Risk controls

**Stop and re-plan (do not push through) when:**
- a diff mixes two kinds of change (orthogonality violated);
- a gate is red twice in a row;
- a characterization spec fails for a reason that cannot be attributed within one
  session.

Line count is a soft review hint only, not a stop rule.

**Rollback contract:** each phase is a contiguous `refactor:` series, revertable
**while it is the newest phase**. Once a later phase builds on it, reverts are no
longer independent — late-found regressions get forward fixes. No promise of
independent retroactive revert.

**Security invariants (every phase, non-negotiable):**
- escaping preserved at the same points in every migrated handler; delegation on
  stable parents per AGENTS.md;
- zero new inline handlers;
- `window.*` surface unchanged;
- no behavior changes (strict refactor);
- no new dependencies.

## Definition of done

- `pages.js` ≤2,000 lines (route registry + shared helpers);
- kit extracted to `js/ui/*` with compat block in place;
- **0 inline handlers in `js/**`**; any inline handlers in `index.html`/`public/`
  are audited into the findings log, not silently in scope;
- `docs/REFACTOR_FINDINGS.md` committed;
- all AGENTS.md gates green (frontend lint/prettier/build; backend untouched-green
  at phase ends);
- **all e2e specs green** (count grows with the 1b characterization specs).

## Out of scope

Backend refactoring; behavior/UX fixes (findings log only); new dependencies
including a frontend unit-test framework; renaming or removing `window.*` exports;
CSS restructuring.
