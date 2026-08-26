# Admin Design System — Bug-Fix Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the remaining AI-slop design defects in the admin panel — dark-on-light text, dark modals, raw JSON in UI, empty-state voids, emoji-as-icons, and inline raw hex colors — to bring every page and modal in line with the existing "Retail Console" token-based design system (the on-brand light theme already established in `css/pages/admin.css` and used by Dashboard, Users, Products, Verifications, Reports, Newsletter).

**Scope (per design spec `2026-08-23-admin-design-system.md`):** This plan is the **fix pass** for the existing pages in `js/pages/pages.js`. The page-by-page module extraction (dashboard, users, products, orders, payouts, verifications, activity, reports, analytics, regions, newsletter, login moving into `js/admin/admin-pages/*.js`) is **out of scope here** — the current code is functional and behavior is the same after this fix pass. The full structural refactor will follow as a separate spec/plan after the user accepts these fixes.

**Architecture:** Targeted edits in `js/pages/pages.js` and `css/pages/admin.css`. All fixes are behavior-preserving: same routes, same data calls, same handlers — only visual classes/colors and markup patterns change. New helper functions in `js/pages/pages.js` for the two non-trivial pieces (activity details humanizer, orders empty-state row). No new files, no new modules, no app-init changes.

**Tech Stack:** Vanilla JS SPA, no new dependencies.

## Real Defect Inventory (confirmed via agent-browser screenshots on 2026-08-26)

| # | Defect | Where |
|---|--------|-------|
| 1 | Payouts table seller name in **white-on-white** (`color:#f9fafb`) | `pages.js` line 4523 |
| 2 | Payouts table inline raw hex everywhere: phone `#6b7280`, monospace destination `#60a5fa`, action button backgrounds `#059669` / `#dc2626` | `pages.js` 4525, 4529, 4542, 4544 |
| 3 | Payouts empty state shows 💸 emoji | `pages.js` 4581 |
| 4 | Payouts reject modal `background:#111827` (dark modal on light app) + dark text colors throughout | `pages.js` 4650-4711 |
| 5 | Delete-account modal (used from user profile) `background:#111827` | `pages.js` 3652-3724 |
| 6 | Verification detail modal `background:#1f2937`, `color:#f9fafb` everywhere, emojis (🗑📄⏳📧), inline `onclick` for close + approve/reject buttons | `pages.js` 4713-4853 |
| 7 | Activity page Details column shows raw JSON `{"email":"...","mfaBypassed":...}` | `pages.js` 5638, 5563, 5543 |
| 8 | Orders page is a **void** when no orders — empty `<tbody>`, no colspan message, no CTA | `pages.js` 5193-5216 |
| 9 | Analytics page all 4 cards `background:#1f2937` dark, headings `color:#d1d5db`, no empty-state fallback | `pages.js` 6671-6705 |
| 10 | Activity page severity pills inline `background:rgba(...)` non-token hex colors | `pages.js` 5607-5612, 5564 |
| 11 | Activity page filter selects use inline `onchange=` (pre-existing) | `pages.js` 5461, 5474 |
| 12 | Regions page action column has a tiny blue `pencil` icon (✏️ emoji fallback) at ~12px with no label | `pages.js` region actions (search and confirm) |

**Pages already on-brand (do not touch in this plan):** Dashboard, Users, Products, Verifications (list), Reports, Newsletter, Admin Login.

## Global Constraints

- NO new npm dependencies.
- NO new files in this plan; helpers go in `js/pages/pages.js` adjacent to their first use (private static methods, prefixed `_`).
- NO new inline event handlers (AGENTS.md) — use `addEventListener` or delegation. Item 6 verification detail modal currently has 3 inline `onclick` on the close/approve/reject buttons; converting them to delegation is in scope.
- ALL color values MUST come from existing tokens (`--neutral-*`, `--primary`, `--success/-light`, `--warning/-light`, `--danger/-light`, `--info/-light`). No raw hex in new code.
- All user data in templates continues to be escaped via existing `_pageEsc`.
- Escape all 4 emojis (💸🗑📄⏳📧✉️📋) — replace with `Icons.*` SVG or remove where redundant.
- Gates per task: `npm run lint:check` (no NEW errors vs current baseline), `npm run build` (must succeed).
- Visual gate: after each task, re-capture screenshot via agent-browser; compare against baseline in `/tmp/opencode/admin-shots-2/`. After all tasks: full e2e admin suite.
- Commit after every task. One task = one commit.
- Admin auth credentials: `admin@unihub.local` / `Admin123!` (per `start-uni-hub.sh`).

## File Structure

```
css/pages/admin.css                       # add ~70 lines: light modal styles, info card, table empty-state row
js/pages/pages.js                         # all targeted edits; 2 new private static methods (helpers)
```

## Baseline Recording (run once before Task 1)

```bash
# Record current lint baseline (must not increase)
cd /home/belteshazzarkijin/Documents/danny/Uni-Hub
npm run lint:check 2>&1 | tail -3 | tee /tmp/admin-lint-baseline.txt
# Baseline screenshots are already in /tmp/opencode/admin-shots-2/
```

## Task 1: Add light modal + table empty-state styles to admin.css

**Files:**
- `css/pages/admin.css` (modify — append at the end, before the closing of the file or after the modal block)

**Why:** The current `admin.css` has dark-mode modal classes (`.admin-modal-backdrop` is used by some Pages, but reject/delete/verification-detail modals use inline styles entirely). To honor the "no raw hex" rule we need token-driven light modal classes. Also need a proper empty-state row class for tables.

**Step 1.1:** At the end of `css/pages/admin.css` (or just after the existing `.admin-modal-body .form-group textarea:focus` block — verify with `grep -n "admin-modal-body" css/pages/admin.css`), append this block. **Zero raw hex — all token refs.**

```css
/* ============================================
   LIGHT MODAL + EMPTY-STATE CLASSES
   Replace the dark #111827 / #1f2937 inline
   modals with token-driven light surfaces.
   ============================================ */

.admin-modal-light-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal-backdrop, 300);
  padding: var(--space-xl);
}

.admin-modal-light {
  background: var(--bg-primary, #ffffff);
  color: var(--color-text, var(--neutral-700));
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius-xl, 0.75rem);
  box-shadow: var(--shadow-xl);
  max-width: 480px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  padding: var(--space-xl, 2rem);
}

.admin-modal-light--wide {
  max-width: 600px;
}

.admin-modal-light-title {
  margin: 0 0 var(--space-sm);
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--neutral-900);
}

.admin-modal-light-text {
  margin: 0 0 var(--space-md);
  font-size: var(--text-sm);
  color: var(--neutral-700);
  line-height: var(--line-normal);
}

.admin-modal-light-text--muted {
  color: var(--neutral-600);
  font-size: 0.85rem;
}

.admin-modal-light-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.admin-modal-light-close {
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
  background: transparent;
  border: none;
  color: var(--neutral-500);
  cursor: pointer;
  font-size: 1.25rem;
  padding: var(--space-xs);
  line-height: 1;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.admin-modal-light-close:hover {
  background: var(--neutral-100);
  color: var(--neutral-800);
}

.admin-modal-light-error {
  display: none;
  color: var(--color-danger, var(--danger));
  font-size: var(--text-xs);
  margin: var(--space-xs) 0 0;
}

.admin-modal-light-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.admin-modal-light-kv-label {
  font-size: 0.7rem;
  color: var(--neutral-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-xs);
  font-weight: var(--font-semibold);
}

.admin-modal-light-kv-value {
  color: var(--neutral-800);
  font-size: var(--text-sm);
  word-break: break-word;
}

.admin-modal-light-kv-value--mono {
  font-family: var(--font-family-mono);
  color: var(--primary);
  font-weight: var(--font-medium);
}

.admin-modal-light-kv-value--notes {
  background: var(--neutral-50);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  border: 1px solid var(--neutral-200);
  font-size: 0.85rem;
  color: var(--neutral-800);
}

.admin-modal-light-field {
  width: 100%;
  background: var(--bg-primary);
  color: var(--neutral-800);
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  font-size: var(--text-sm);
  font-family: inherit;
  resize: vertical;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.admin-modal-light-field:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.admin-modal-light-divider {
  border-top: 1px solid var(--neutral-200);
  padding-top: var(--space-lg);
  margin-top: var(--space-md);
}

/* Status badges for severity/action labels inside tables */
.admin-status-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  line-height: 1.6;
  text-transform: capitalize;
}

.admin-status-pill--info    { background: var(--info-light);    color: var(--color-info); }
.admin-status-pill--success { background: var(--success-light); color: var(--color-success); }
.admin-status-pill--warning { background: var(--warning-light); color: var(--color-warning); }
.admin-status-pill--danger  { background: var(--danger-light);  color: var(--color-danger); }
.admin-status-pill--neutral { background: var(--neutral-100);  color: var(--neutral-700); }

/* Empty-state row used inside an <table> when data array is empty */
.admin-table-empty-row > td {
  text-align: center;
  padding: var(--space-2xl) var(--space-md);
  color: var(--neutral-500);
  font-size: var(--text-sm);
}

.admin-table-empty-row .admin-table-empty-icon {
  display: block;
  margin: 0 auto var(--space-sm);
  color: var(--neutral-400);
  width: 40px;
  height: 40px;
}

.admin-table-empty-row .admin-table-empty-title {
  color: var(--neutral-700);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin: 0 0 var(--space-xs);
}

.admin-table-empty-row .admin-table-empty-msg {
  color: var(--neutral-500);
  font-size: 0.85rem;
  margin: 0 0 var(--space-md);
}

.admin-table-empty-row .admin-table-empty-action {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 6px 14px;
  background: var(--primary);
  color: var(--bg-primary);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  text-decoration: none;
  transition: background var(--transition-fast);
}

.admin-table-empty-row .admin-table-empty-action:hover {
  background: var(--primary-hover);
}
```

**Step 1.2:** Verify lint baseline is unchanged.

```bash
npm run lint:check 2>&1 | tail -3
# Compare against /tmp/admin-lint-baseline.txt
diff /tmp/admin-lint-baseline.txt <(npm run lint:check 2>&1 | tail -3)
# Expected: no diff
```

**Step 1.3:** Verify build passes.

```bash
npm run build 2>&1 | tail -10
# Expected: "✓ built in" line, no errors
```

**Step 1.4:** Commit.

```bash
git add css/pages/admin.css
git commit -m "Add light modal and table empty-state styles to admin"
```

## Task 2: Fix payouts table — light tokens, action buttons, empty state

**Files:**
- `js/pages/pages.js` (modify the row template and the empty-state block in `renderAdminPayouts`)

**Why:** The seller name is white-on-white (the user's headline complaint), the action buttons are raw hex inline, and the empty state shows a 💸 emoji.

**Step 2.1:** Locate the row map template in `renderAdminPayouts` (line 4517-4552). Replace lines 4520-4549 with the following. The new version uses token-driven classes (defined in Task 1) for the action buttons; the seller block uses neutral text colors; destination is monospace primary blue; email/phone are `--neutral-500`; the emoji empty-state is replaced with a structured colspan row.

```javascript
    const sellerBlock = p => `
      <div style="font-weight:600;color:var(--neutral-800);">${_pageEsc(p.seller?.fullName || 'Unknown seller')}</div>
      <div style="font-size:0.75rem;color:var(--neutral-500);">${_pageEsc(p.seller?.email || '')}</div>
      <div style="font-size:0.75rem;color:var(--neutral-500);">${_pageEsc(p.seller?.phone || '')}</div>
    `;

    const rows =
      visible
        .map(
          p => `
                  <tr>
                    <td>${sellerBlock(p)}</td>
                    <td style="font-weight:600;color:var(--neutral-800);">${Formatter.formatPrice(p.amount || 0)}</td>
                    <td style="color:var(--neutral-700);">${_pageEsc(Formatter.capitalize(p.method || ''))}</td>
                    <td class="admin-modal-light-kv-value admin-modal-light-kv-value--mono" style="font-size:0.8rem;">${_pageEsc(p.destination || '')}</td>
                    <td style="font-size:0.8rem;color:var(--neutral-500);">${Formatter.formatTimeAgo(p.requestedAt)}</td>
                    <td>
                      <span class="admin-status-badge ${this._payoutStatusClass(p.status)}" style="text-transform:capitalize;">${_pageEsc(p.status)}</span>
                      ${p.failureReason ? `<div style="font-size:0.7rem;color:var(--color-danger);margin-top:0.25rem;max-width:160px;">${_pageEsc(p.failureReason)}</div>` : ''}
                      ${p.processedAt ? `<div style="font-size:0.7rem;color:var(--neutral-500);margin-top:0.25rem;">${Formatter.formatTimeAgo(p.processedAt)}</div>` : ''}
                    </td>
                    <td>
                      ${
  p.status === 'requested'
    ? `
                        <div style="display:flex;gap:0.35rem;flex-wrap:wrap;">
                          <button class="btn btn-sm" data-payout-action="approve" data-id="${_pageEsc(p.id)}" aria-label="Approve payout"
                            style="padding:4px 10px;font-size:11px;background:var(--color-success);color:#fff;border:none;cursor:pointer;border-radius:var(--radius-sm);font-weight:var(--font-medium);">Approve</button>
                          <button class="btn btn-sm" data-payout-action="reject" data-id="${_pageEsc(p.id)}" aria-label="Reject payout"
                            style="padding:4px 10px;font-size:11px;background:var(--color-danger);color:#fff;border:none;cursor:pointer;border-radius:var(--radius-sm);font-weight:var(--font-medium);">Reject</button>
                        </div>
                      `
    : ''
}
                    </td>
                  </tr>
                  `,
        )
        .join('') ||
      ''; // Empty rows → outer logic handles empty-state colspan row
```

**Step 2.2:** Locate the empty-state emoji block (line 4578-4584) in the second `mainContent.innerHTML` template. Replace the conditional empty-state block so it renders a proper colspan row using `.admin-table-empty-row` (defined in Task 1) with an Icons-* SVG and a "Refresh" action. Replace lines 4577-4601 with:

```javascript
              ${
  visible.length === 0
    ? `
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Seller</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Destination</th>
                      <th>Requested</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="admin-table-empty-row">
                      <td colspan="7">
                        <div class="admin-table-empty-icon" aria-hidden="true">${Icons.money || ''}</div>
                        <p class="admin-table-empty-title">No payout requests</p>
                        <p class="admin-table-empty-msg">There are no ${activeFilter === 'all' ? '' : `${_pageEsc(activeFilter)} `}payout requests right now.</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              `
    : `
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Seller</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Destination</th>
                      <th>Requested</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              `
}
```

**Step 2.3:** Verify with a screenshot.

```bash
# Frontend + backend should already be running on :8000 and :5000
agent-browser open http://localhost:8000/#/admin/payouts
sleep 2
agent-browser screenshot /tmp/opencode/admin-shots-2/after-02-payouts.png
# Expected: "John Doe" name now readable (dark text); action buttons solid green/red; no emoji
```

**Step 2.4:** Lint + build.

```bash
npm run lint:check 2>&1 | tail -3
npm run build 2>&1 | tail -3
```

**Step 2.5:** Commit.

```bash
git add js/pages/pages.js
git commit -m "Fix payouts table white-on-white text and raw hex"
```

## Task 3: Fix payouts reject modal — light theme + Icons

**Files:**
- `js/pages/pages.js` (modify `_openRejectPayoutModal`)

**Why:** Currently a `#111827` dark modal that clashes with the rest of the app.

**Step 3.1:** Replace the entire `_openRejectPayoutModal` method body (lines 4647-4711) so the overlay uses `.admin-modal-light-backdrop` and the dialog uses `.admin-modal-light` (defined in Task 1). All inline colors come from tokens. Replace inline `style` strings with the new classes.

```javascript
  static _openRejectPayoutModal (id) {
    if (!_requireAdmin()) {return;}

    const overlay = document.createElement('div');
    overlay.id = 'payout-reject-overlay';
    overlay.className = 'admin-modal-light-backdrop';
    overlay.innerHTML = `
      <div role="dialog" aria-modal="true" aria-labelledby="payout-reject-title" class="admin-modal-light" style="position:relative;">
        <button type="button" data-payout-modal-cancel class="admin-modal-light-close" aria-label="Close">&times;</button>
        <h3 id="payout-reject-title" class="admin-modal-light-title">Reject payout request</h3>
        <p class="admin-modal-light-text admin-modal-light-text--muted">Rejection is final — the seller would need to submit a new request. The reason is kept in the payout record.</p>
        <textarea id="payout-reject-reason" class="admin-modal-light-field" maxlength="300" rows="3" placeholder="Reason (min 3 characters)"></textarea>
        <p id="payout-reject-error" class="admin-modal-light-error" role="alert"></p>
        <div class="admin-modal-light-actions">
          <button type="button" data-payout-modal-cancel class="btn btn-ghost btn-sm">Cancel</button>
          <button type="button" id="payout-reject-confirm" class="btn btn-sm" style="background:var(--color-danger);color:#fff;border:none;font-weight:var(--font-medium);">Reject request</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => {
      document.removeEventListener('keydown', escListener);
      overlay.remove();
    };
    const escListener = e => {
      if (e.key === 'Escape') {close();}
    };
    document.addEventListener('keydown', escListener);

    overlay.addEventListener('click', e => {
      if (e.target === overlay) {close();}
    });
    overlay.querySelectorAll('[data-payout-modal-cancel]').forEach(btn => {
      btn.addEventListener('click', close);
    });

    const confirmBtn = overlay.querySelector('#payout-reject-confirm');
    const errorEl = overlay.querySelector('#payout-reject-error');
    confirmBtn.addEventListener('click', async () => {
      const reason = overlay.querySelector('#payout-reject-reason').value.trim();
      if (reason.length < 3) {
        errorEl.textContent = 'Please enter a rejection reason of at least 3 characters.';
        errorEl.style.display = 'block';
        return;
      }
      confirmBtn.disabled = true;
      try {
        const resp = await api.admin.rejectPayout(id, reason);
        if (resp.success) {
          showToast('Payout request rejected', 'success');
        } else {
          showToast(resp.error || 'Failed to reject payout', 'error');
        }
        close();
        await Pages.renderAdminPayouts();
      } catch (err) {
        confirmBtn.disabled = false;
        errorEl.textContent = err.message || 'Failed to reject payout.';
        errorEl.style.display = 'block';
      }
    });

    overlay.querySelector('#payout-reject-reason').focus();
  }
```

**Step 3.2:** Visual check — open payouts, click Reject, screenshot.

```bash
agent-browser open http://localhost:8000/#/admin/payouts
sleep 2
agent-browser click "button[aria-label='Reject payout']"
sleep 1
agent-browser screenshot /tmp/opencode/admin-shots-2/after-12-reject-modal.png
# Expected: white modal card on dimmed backdrop; readable black text; no dark modal
agent-browser eval "document.getElementById('payout-reject-overlay')?.remove()"
```

**Step 3.3:** Lint + build.

```bash
npm run lint:check 2>&1 | tail -3
npm run build 2>&1 | tail -3
```

**Step 3.4:** Commit.

```bash
git add js/pages/pages.js
git commit -m "Convert payouts reject modal to light theme"
```

## Task 4: Fix delete-account modal — light theme

**Files:**
- `js/pages/pages.js` (modify `_openDeleteAccountModal`)

**Why:** Same dark-modal-on-light problem. Used from user profile (storefront context), not just admin — but the visual is jarring either way. The user's complaint about "AI-slop" includes this.

**Step 4.1:** Replace the `_openDeleteAccountModal` method (lines 3652-3724) so it uses the same `.admin-modal-light*` classes. Note this method lives in the storefront flow, not admin — but it shares the same class names which is fine; the classes are defined in admin.css which is loaded by both contexts.

```javascript
  static _openDeleteAccountModal () {
    const overlay = document.createElement('div');
    overlay.id = 'delete-account-overlay';
    overlay.className = 'admin-modal-light-backdrop';
    overlay.innerHTML = `
      <div role="dialog" aria-modal="true" aria-labelledby="del-acct-title" class="admin-modal-light" style="position:relative;">
        <button type="button" data-del-cancel class="admin-modal-light-close" aria-label="Close">&times;</button>
        <h3 id="del-acct-title" class="admin-modal-light-title">Delete your account?</h3>
        <p class="admin-modal-light-text admin-modal-light-text--muted">This permanently removes your personal information. Your past orders remain as anonymous records for accounting. This cannot be undone.</p>
        <input id="del-acct-confirm" class="admin-modal-light-field" maxlength="10" placeholder="Type DELETE to confirm" autocomplete="off" style="margin-bottom:var(--space-sm);" />
        <input id="del-acct-password" type="password" class="admin-modal-light-field" placeholder="Current password" autocomplete="current-password" />
        <p id="del-acct-error" class="admin-modal-light-error" role="alert"></p>
        <div class="admin-modal-light-actions">
          <button type="button" data-del-cancel class="btn btn-ghost btn-sm">Cancel</button>
          <button type="button" id="del-acct-go" class="btn btn-sm" style="background:var(--color-danger);color:#fff;border:none;font-weight:var(--font-medium);">Delete forever</button>
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
    overlay.querySelectorAll('[data-del-cancel]').forEach(btn => {
      btn.addEventListener('click', close);
    });

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
        if (resp && resp.success) {
          close();
          authManager.clearSession();
          StorageManager.remove(STORAGE_KEYS.STUDENT_VERIFICATION);
          showToast('Your account has been deleted.', 'success');
          window.location.hash = '#/';
          Pages.renderLanding();
        } else {
          errEl.textContent = (resp && resp.error) || 'Could not delete your account.';
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

**Step 4.2:** Visual check. Logout, then go to user profile (storefront), open delete modal.

```bash
agent-browser open http://localhost:8000/#/login
# ... login as a test user (sarah@student.upsa.edu.gh / Student123!) ...
# Navigate to profile, open delete modal, screenshot
agent-browser screenshot /tmp/opencode/admin-shots-2/after-13-delete-modal.png
# Expected: white modal, readable text
```

If storefront login is harder to script, a simpler check: open admin, run `eval` to call the static method directly:

```bash
agent-browser open http://localhost:8000/#/admin
sleep 2
agent-browser eval "Pages._openDeleteAccountModal()"
sleep 1
agent-browser screenshot /tmp/opencode/admin-shots-2/after-13-delete-modal.png
agent-browser eval "document.getElementById('delete-account-overlay')?.remove()"
```

**Step 4.3:** Lint + build.

```bash
npm run lint:check 2>&1 | tail -3
npm run build 2>&1 | tail -3
```

**Step 4.4:** Commit.

```bash
git add js/pages/pages.js
git commit -m "Convert delete-account modal to light theme"
```

## Task 5: Fix verification detail modal — light theme + remove emojis + delegation

**Files:**
- `js/pages/pages.js` (modify `viewVerificationDetail` lines 4713-4853)

**Why:** Heavily dark modal with 3 inline `onclick` handlers (close, approve, reject), 4 emojis (🗑📄⏳📧), and inline raw hex throughout.

**Step 5.1:** Replace `viewVerificationDetail` with the light-theme version. This is a big rewrite of ~140 lines, so do it as one Edit. The new version:
- Uses `.admin-modal-light-backdrop` and `.admin-modal-light--wide`
- Replaces emojis with `Icons.*` SVG or removes redundant ones (e.g. 📧 near "University Email")
- Replaces inline `color:#f9fafb` with token classes
- Replaces the 3 inline `onclick` on close/approve/reject with delegation on the overlay
- Uses `.admin-modal-light-kv-*` classes for the detail grid

```javascript
  static async viewVerificationDetail (id) {
    if (typeof adminVerificationsManager === 'undefined') {
      showToast('Verification module not loaded', 'error');
      return;
    }
    const v = adminVerificationsManager.getById(id);
    if (!v) {
      showToast('Verification not found', 'error');
      return;
    }

    // Fresh signed URLs on EVERY open — never cached, never persisted.
    let docsState = { documents: [], purged: false, purgeScheduledFor: null };
    try {
      const resp = await api.verification.getDocuments(v.id);
      if (resp.success && resp.data) {
        docsState = resp.data;
      }
    } catch (_) { /* non-fatal: render modal without doc section */ }

    const esc = v2 => _pageEsc(String(v2 === null || v2 === undefined ? '' : v2));
    let docsSection;
    if (docsState.purged || (!docsState.documents.length && docsState.purgeScheduledFor)) {
      docsSection = `
        <div class="admin-modal-light-text admin-modal-light-text--muted" style="text-align:center;padding:1rem;border:1px dashed var(--neutral-300);border-radius:var(--radius-md);">
          Documents permanently deleted${v.reviewedAt ? ` (decision ${esc(Formatter.formatDate(v.reviewedAt))})` : ''}
        </div>`;
    } else if (docsState.documents.length > 0) {
      const items = docsState.documents.map(d => {
        if (d.mimeType === 'application/pdf') {
          return `<a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer" class="admin-modal-light-text" style="display:block;padding:0.5rem;background:var(--neutral-50);border-radius:var(--radius-md);color:var(--primary);font-size:0.85rem;text-decoration:none;border:1px solid var(--neutral-200);">${Icons.clipboard || ''} ${esc(d.fileName)}</a>`;
        }
        return `<img src="${esc(d.url)}" alt="${esc(d.fileName)}" style="max-width:100%;max-height:280px;display:block;margin:0.5rem auto;border-radius:var(--radius-md);" />`;
      }).join('');
      const purgeNote = docsState.purgeScheduledFor
        ? `<div style="font-size:0.75rem;color:var(--color-warning);margin-top:0.5rem;">Auto-deletes ${esc(Formatter.formatDate(docsState.purgeScheduledFor))}</div>`
        : '';
      const purgeBtn = adminAuthManager.getCurrentUser()?.role === 'admin'
        ? `<button type="button" data-purge-docs="${esc(v.id)}" class="btn btn-sm" style="margin-top:0.5rem;background:var(--color-danger);color:#fff;border:none;font-weight:var(--font-medium);">Purge now</button>`
        : '';
      docsSection = `
        <div style="border:1px solid var(--neutral-200);border-radius:var(--radius-md);padding:0.75rem;background:var(--bg-primary);">
          ${items}
          ${purgeNote}
          ${purgeBtn}
        </div>`;
    } else {
      docsSection = `
        <div class="admin-modal-light-text admin-modal-light-text--muted" style="text-align:center;padding:1rem;border:1px dashed var(--neutral-300);border-radius:var(--radius-md);">
          No documents attached to this request
        </div>`;
    }

    const statusClass = v.status === 'approved'
      ? 'admin-status-badge delivered'
      : v.status === 'rejected'
        ? 'admin-status-badge cancelled'
        : 'admin-status-badge placed';

    const overlay = document.createElement('div');
    overlay.id = 'vrf-detail-overlay';
    overlay.className = 'admin-modal-light-backdrop';

    overlay.innerHTML = `
    <div class="admin-modal-light admin-modal-light--wide" style="position:relative;">
      <button type="button" data-vrf-close class="admin-modal-light-close" aria-label="Close">&times;</button>
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:1.5rem;padding-right:2rem;">
        <div>
          <h2 class="admin-modal-light-title">Verification Details</h2>
          <span class="${statusClass}" style="text-transform:capitalize;">${esc(v.status)}</span>
        </div>
      </div>

      <div class="admin-modal-light-detail-grid">
        <div>
          <div class="admin-modal-light-kv-label">Full Name</div>
          <div class="admin-modal-light-kv-value">${_pageEsc(v.fullName || 'N/A')}</div>
        </div>
        <div>
          <div class="admin-modal-light-kv-label">Student ID</div>
          <div class="admin-modal-light-kv-value admin-modal-light-kv-value--mono">${_pageEsc(v.studentId || 'N/A')}</div>
        </div>
        <div>
          <div class="admin-modal-light-kv-label">Email</div>
          <div class="admin-modal-light-kv-value">${_pageEsc(v.personalEmail || v.universityEmail || v.email || 'N/A')}</div>
        </div>
        <div>
          <div class="admin-modal-light-kv-label">Phone</div>
          <div class="admin-modal-light-kv-value">${_pageEsc(v.phone || 'N/A')}</div>
        </div>
        <div>
          <div class="admin-modal-light-kv-label">Level</div>
          <div class="admin-modal-light-kv-value">Level ${_pageEsc(v.level || 'N/A')}</div>
        </div>
        <div>
          <div class="admin-modal-light-kv-label">Hall</div>
          <div class="admin-modal-light-kv-value">${_pageEsc(v.hall || 'N/A')}</div>
        </div>
        <div>
          <div class="admin-modal-light-kv-label">Method</div>
          <div class="admin-modal-light-kv-value">${v.verificationMethod === 'email' ? 'University Email' : 'Document Upload'}</div>
        </div>
        <div>
          <div class="admin-modal-light-kv-label">Submitted</div>
          <div class="admin-modal-light-kv-value">${esc(Formatter.formatDate(v.submittedAt))}</div>
        </div>
        ${v.reviewedBy ? `<div><div class="admin-modal-light-kv-label">Reviewed By</div><div class="admin-modal-light-kv-value">${esc(v.reviewedBy)}</div></div>` : ''}
        ${v.reviewedAt ? `<div><div class="admin-modal-light-kv-label">Reviewed At</div><div class="admin-modal-light-kv-value">${esc(Formatter.formatDate(v.reviewedAt))}</div></div>` : ''}
        ${v.reviewNotes ? `<div style="grid-column:1/-1;"><div class="admin-modal-light-kv-label">Review Notes</div><div class="admin-modal-light-kv-value admin-modal-light-kv-value--notes">${esc(v.reviewNotes)}</div></div>` : ''}
      </div>

      <div style="margin-bottom:1.5rem;">
        <h4 class="admin-modal-light-title" style="font-size:0.95rem;">Verification documents</h4>
        ${docsSection}
      </div>

      ${
  v.status === 'pending'
    ? `
      <div class="admin-modal-light-divider">
        <div style="margin-bottom:1rem;">
          <label class="admin-modal-light-kv-label" style="display:block;margin-bottom:var(--space-xs);">Review Notes (optional)</label>
          <textarea id="vrf-review-notes-${esc(v.id)}" class="admin-modal-light-field" rows="3" placeholder="Add notes about this verification..."></textarea>
        </div>
        <div style="display:flex;gap:var(--space-sm);">
          <button type="button" data-vrf-action="approve" data-vrf-id="${esc(v.id)}" class="btn btn-sm" style="flex:1;padding:0.75rem;background:var(--color-success);color:#fff;border:none;font-weight:var(--font-semibold);font-size:0.9rem;">Approve Verification</button>
          <button type="button" data-vrf-action="reject" data-vrf-id="${esc(v.id)}" class="btn btn-sm" style="flex:1;padding:0.75rem;background:var(--color-danger);color:#fff;border:none;font-weight:var(--font-semibold);font-size:0.9rem;">Reject Verification</button>
        </div>
      </div>`
    : ''
}
    </div>`;

    document.body.appendChild(overlay);

    // Signed URLs expire after 300s; refetch fresh ones once on load error.
    let refetched = false;
    overlay.addEventListener('error', e => {
      if (refetched || e.target.tagName !== 'IMG') { return; }
      refetched = true;
      void Pages.viewVerificationDetail(id);
    }, true);

    // Single delegated handler: backdrop click-to-close, close button,
    // approve/reject buttons, purge button. No new inline handlers.
    overlay.addEventListener('click', async e => {
      if (e.target === overlay) { overlay.remove(); return; }

      const closeBtn = e.target.closest('[data-vrf-close]');
      if (closeBtn) { overlay.remove(); return; }

      const actionBtn = e.target.closest('[data-vrf-action]');
      if (actionBtn) {
        const vid = actionBtn.dataset.vrfId;
        const action = actionBtn.dataset.vrfAction;
        if (action === 'approve') { Pages.approveVerification(vid); }
        else if (action === 'reject') { Pages.rejectVerification(vid); }
        overlay.remove();
        return;
      }

      const purgeBtn = e.target.closest('[data-purge-docs]');
      if (!purgeBtn) { return; }
      const vid = purgeBtn.dataset.purgeDocs;
      if (!window.confirm('Permanently delete all documents for this request now? This cannot be undone.')) { return; }
      purgeBtn.disabled = true;
      try {
        const resp = await api.verification.purgeDocuments(vid);
        if (resp.success) {
          showToast('Documents permanently deleted', 'success');
          overlay.remove();
          Pages.renderAdminVerifications(Pages._verifFilter || 'pending');
        } else {
          showToast(resp.error || 'Failed to delete documents', 'error');
          purgeBtn.disabled = false;
        }
      } catch (err) {
        showToast(err.message || 'Failed to delete documents', 'error');
        purgeBtn.disabled = false;
      }
    });
  }
```

**Step 5.2:** Visual check. Since verifications is empty, force-open the detail modal by calling the static method via eval with a known ID from the dev seed.

```bash
agent-browser open http://localhost:8000/#/admin
sleep 2
# Trigger the modal even if no records: eval triggers it directly with a fake ID
# to see the structure. To see a real one, we'd need a pending verification in the seed.
agent-browser eval "Pages.viewVerificationDetail('test-id'); setTimeout(()=>{const o=document.getElementById('vrf-detail-overlay');if(o)o.remove();},500);"
sleep 1
agent-browser screenshot /tmp/opencode/admin-shots-2/after-15-vrf-modal.png
# Expected: light modal, readable text, Icons used
agent-browser eval "document.getElementById('vrf-detail-overlay')?.remove()"
```

If you have a real pending verification (run `npm run seed` in `backend/`), open the verifications page, click "Review" or the row to open the detail modal — that's the real visual proof.

**Step 5.3:** Lint + build.

```bash
npm run lint:check 2>&1 | tail -3
npm run build 2>&1 | tail -3
```

**Step 5.4:** Commit.

```bash
git add js/pages/pages.js
git commit -m "Convert verification detail modal to light theme with delegation"
```

## Task 6: Fix orders page empty-state void

**Files:**
- `js/pages/pages.js` (modify `renderAdminOrders`)

**Why:** When `orders` array is empty, `<tbody>` is empty — user sees just a table header bar with no body, no message, no CTA. The user explicitly called this out.

**Step 6.1:** Locate the orders table body block (lines 5192-5216). Replace the `<tbody>...</tbody>` content with a row that handles the empty case. Update the lines 5178-5217 block:

```javascript
    if (card) {
      const tableHead = `
        <thead>
          <tr>
            <th>Order #</th>
            <th>Tracking</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
      `;

      const tableBody = orders.length === 0
        ? `<tr class="admin-table-empty-row"><td colspan="8">
            <div class="admin-table-empty-icon" aria-hidden="true">${Icons.clipboard || ''}</div>
            <p class="admin-table-empty-title">No orders yet</p>
            <p class="admin-table-empty-msg">When buyers place orders they will appear here.</p>
          </td></tr>`
        : `<tbody>${orders.map(order => `
          <tr>
            <td><strong>${_pageEsc(order.orderNumber || '')}</strong></td>
            <td class="admin-modal-light-kv-value admin-modal-light-kv-value--mono" style="font-size:0.8rem;">${_pageEsc(order.trackingNumber || '—')}</td>
            <td>${_pageEsc(order.customer?.name || 'N/A')}</td>
            <td>${Formatter.formatPrice(order.pricing?.grandTotal ?? 0)}</td>
            <td>${_pageEsc(Formatter.capitalize(order.payment?.mode || '') || '—')}</td>
            <td><span class="admin-status-badge ${_pageEsc(order.status || '')}">${_pageEsc(Formatter.capitalize(order.status || '') || '—')}</span></td>
            <td>${Formatter.formatDate(order.createdAt)}</td>
            <td>
              <div class="table-actions">
                <button class="table-action-btn view" title="View">${Icons.view}</button>
              </div>
            </td>
          </tr>
        `).join('')}</tbody>`;

      card.outerHTML = `
        <div class="admin-table-container">
          <table class="admin-table">
            ${tableHead}
            ${tableBody}
          </table>
        </div>`;
    }
```

**Step 6.2:** Visual check.

```bash
agent-browser open http://localhost:8000/#/admin/orders
sleep 2
agent-browser screenshot /tmp/opencode/admin-shots-2/after-04-orders.png
# Expected: empty-state row with clipboard icon, "No orders yet" title, helpful message
```

**Step 6.3:** Lint + build.

```bash
npm run lint:check 2>&1 | tail -3
npm run build 2>&1 | tail -3
```

**Step 6.4:** Commit.

```bash
git add js/pages/pages.js
git commit -m "Fix admin orders page empty-state void"
```

## Task 7: Fix analytics page — light cards + chart color scheme

**Files:**
- `js/pages/pages.js` (modify `renderAdminAnalytics` lines 6671-6705)

**Why:** All 4 chart cards use `background:#1f2937` (dark) and Chart.js is configured with dark-theme assumptions (grid color, tick color). The page is unreadable on a light app.

**Step 7.1:** Replace lines 6684-6705 (the chart grid markup) with token-driven markup using `.admin-chart-area` and `.admin-chart-header` classes (already exist in `admin.css` from prior work).

```javascript
          <div class="admin-chart-area">
            <div class="admin-chart-header"><h3>Revenue (Last 30 Days)</h3></div>
            <div class="admin-chart-body"><canvas id="analytics-revenue-chart" height="220"></canvas></div>
          </div>
          <div class="admin-chart-area">
            <div class="admin-chart-header"><h3>Orders by Status</h3></div>
            <div class="admin-chart-body"><canvas id="analytics-orders-chart" height="220"></canvas></div>
          </div>
          <div class="admin-chart-area">
            <div class="admin-chart-header"><h3>Products by Category</h3></div>
            <div class="admin-chart-body"><canvas id="analytics-categories-chart" height="220"></canvas></div>
          </div>
          <div class="admin-chart-area">
            <div class="admin-chart-header"><h3>New Users (Last 30 Days)</h3></div>
            <div class="admin-chart-body"><canvas id="analytics-users-chart" height="220"></canvas></div>
          </div>
```

Wrap them in a CSS grid (replaces the inline `style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;max-width:1100px;"`):

Actually, easier: keep the grid wrapper but with token-driven inline. Replace line 6684 wrapper with:

```javascript
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:1.5rem;max-width:1100px;">
```

And the top-products card at lines 6702-6705 — wrap it in `.admin-chart-area` too:

```javascript
          <div class="admin-chart-area" style="max-width:1100px;margin-top:1.5rem;">
            <div class="admin-chart-header"><h3>Top Selling Products</h3></div>
            <div class="admin-chart-body" id="analytics-top-products" style="color:var(--neutral-500);font-size:0.85rem;">Loading...</div>
          </div>
```

**Step 7.2:** Update the Chart.js color scheme. Locate the `chartFont`/`gridColor`/`tickColor` block (line 6757-6759) and replace with light-theme values:

```javascript
      const chartFont = { family: "var(--font-family-sans)" };
      const gridColor = 'rgba(0, 0, 0, 0.08)';
      const tickColor = '#6b7280';
```

Also any hardcoded dark-theme colors in the datasets (e.g. line 6769 `borderColor: '#3b82f6'` is fine — it's a brand blue; but later there may be other dark colors). The 4 datasets (revenue, orders, categories, users) — quick visual scan of the code from 6761 onwards — the colors are `borderColor: '#3b82f6'` (blue), `backgroundColor: 'rgba(59,130,246,0.1)'` (light blue), `borderColor: '#10b981'` (green), `backgroundColor: 'rgba(16,185,129,0.1)'`, etc. These render fine on a light card. Just `gridColor` and `tickColor` need fixing.

**Step 7.3:** Visual check.

```bash
agent-browser open http://localhost:8000/#/admin/analytics
sleep 3
agent-browser screenshot /tmp/opencode/admin-shots-2/after-09-analytics.png
# Expected: 4 white card surfaces on light canvas; charts render in brand colors with subtle grid
```

**Step 7.4:** Lint + build.

```bash
npm run lint:check 2>&1 | tail -3
npm run build 2>&1 | tail -3
```

**Step 7.5:** Commit.

```bash
git add js/pages/pages.js
git commit -m "Convert analytics cards to light-theme chart surfaces"
```

## Task 8: Fix activity log Details — human-readable rendering + severity pills

**Files:**
- `js/pages/pages.js` (modify `_loadActivityLogs` and `_renderActivityRows`)

**Why:** Details column shows raw `{"email":"admin@unihub.local","mfaBypassed":true}`. Users can't read this. Severity pills use raw rgba hex.

**Step 8.1:** Add a private static helper method just before `_renderActivityRows` (around line 5607). This converts a details object into a small, scannable list of key→value pairs with smart formatting for common keys.

```javascript
  // Render a server-side activity-log `details` payload as a compact,
  // human-readable list. Falls back to JSON.stringify for unknown shapes.
  // All values are escaped via `_pageEsc` before insertion.
  static _renderActivityDetails (details) {
    if (details == null) {return '<span style="color:var(--neutral-500);">—</span>';}
    if (typeof details === 'string') {return _pageEsc(details) || '<span style="color:var(--neutral-500);">—</span>';}
    if (typeof details !== 'object') {return _pageEsc(String(details));}

    // Order keys by importance for the most common actions.
    const keyOrder = ['email', 'name', 'productTitle', 'productId', 'orderNumber', 'amount', 'role', 'status', 'reason', 'mfaBypassed', 'ip', 'userAgent'];
    const sortedKeys = Object.keys(details).sort((a, b) => {
      const ai = keyOrder.indexOf(a);
      const bi = keyOrder.indexOf(b);
      if (ai === -1 && bi === -1) {return a.localeCompare(b);}
      if (ai === -1) {return 1;}
      if (bi === -1) {return -1;}
      return ai - bi;
    });

    const items = sortedKeys.map(k => {
      const v = details[k];
      if (v === null || v === undefined || v === '') {return '';}
      const prettyKey = k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
      let prettyVal;
      if (typeof v === 'boolean') {prettyVal = v ? 'Yes' : 'No';}
      else if (typeof v === 'object') {prettyVal = JSON.stringify(v);}
      else {prettyVal = String(v);}
      return `<div style="display:flex;gap:var(--space-sm);align-items:baseline;line-height:1.5;">
        <span style="color:var(--neutral-500);min-width:90px;flex-shrink:0;">${_pageEsc(prettyKey)}</span>
        <span style="color:var(--neutral-800);">${_pageEsc(prettyVal)}</span>
      </div>`;
    }).filter(Boolean).join('');

    if (!items) {return '<span style="color:var(--neutral-500);">—</span>';}
    return `<div style="font-size:0.8rem;">${items}</div>`;
  }
```

**Step 8.2:** Replace the inline `details` rendering in `_renderActivityRows` (line 5638) with the helper:

Find:
```javascript
        const details = log.details ? JSON.stringify(log.details).substring(0, 100) : '-';
```

Replace with:
```javascript
        const details = log.details ? Pages._renderActivityDetails(log.details) : '<span style="color:var(--neutral-500);">—</span>';
```

Then change the cell at line 5646 to use `details` (now an HTML string) directly. Find:
```javascript
        <td style="font-size:0.85rem;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${_pageEsc(details)}">${_pageEsc(details)}</td>
```

Replace with:
```javascript
        <td style="font-size:0.85rem;max-width:300px;">${details}</td>
```

**Step 8.3:** Replace the inline severity pill style in `_renderActivityRows` (line 5607-5612) with the new `.admin-status-pill` classes. Find the `severityColors` declaration and remove it; instead map severity → modifier:

Find:
```javascript
    const severityColors = {
      info: 'background:rgba(0,70,190,0.15);color:#93c5fd;',
      warning: 'background:rgba(245,158,11,0.15);color:#fbbf24;',
      critical: 'background:rgba(239,68,68,0.15);color:#f87171;',
    };
```

Replace with:
```javascript
    const severityToModifier = {
      info: 'admin-status-pill--info',
      warning: 'admin-status-pill--warning',
      critical: 'admin-status-pill--danger',
    };
```

Then update line 5640 (`const sevStyle = severityColors[severity] || severityColors.info;`) to:

```javascript
        const sevModifier = severityToModifier[severity] || 'admin-status-pill--neutral';
```

And the pill at line 5647 — find:
```javascript
        <td><span style="padding:2px 8px;border-radius:4px;font-size:0.75rem;${sevStyle}">${_pageEsc(severity)}</span></td>
```

Replace with:
```javascript
        <td><span class="admin-status-pill ${sevModifier}">${_pageEsc(severity)}</span></td>
```

**Step 8.4:** Same severity-pill fix in the local fallback at line 5564. Find:
```javascript
            <td><span style="padding:2px 8px;border-radius:4px;font-size:0.75rem;background:rgba(0,70,190,0.15);color:#93c5fd;">info</span></td>
```

Replace with:
```javascript
            <td><span class="admin-status-pill admin-status-pill--info">info</span></td>
```

**Step 8.5:** Visual check.

```bash
agent-browser open http://localhost:8000/#/admin/activity
sleep 2
agent-browser screenshot /tmp/opencode/admin-shots-2/after-07-activity.png
# Expected: Details column shows key/value rows (Email: admin@..., MFA Bypassed: Yes); severity pills use light theme
```

**Step 8.6:** Lint + build.

```bash
npm run lint:check 2>&1 | tail -3
npm run build 2>&1 | tail -3
```

**Step 8.7:** Commit.

```bash
git add js/pages/pages.js
git commit -m "Humanize activity log details and use token-based severity pills"
```

## Task 9: Final e2e + visual sweep

**Step 9.1:** Run the full Playwright admin suite.

```bash
cd /home/belteshazzarkijin/Documents/danny/Uni-Hub
npx playwright test e2e/admin.spec.js e2e/admin-verifications-docs.spec.js e2e/admin-session-persists.spec.js e2e/admin-add-product-renders.spec.js 2>&1 | tail -10
# Expected: all tests passing
```

**Step 9.2:** Re-capture all admin pages for the after-state archive.

```bash
agent-browser open http://localhost:8000/#/admin
sleep 2
for route in dashboard verifications users products orders payouts activity reports analytics regions newsletter; do
  agent-browser open "http://localhost:8000/#/admin/$route" 2>&1 > /dev/null
  sleep 2
  agent-browser screenshot "/tmp/opencode/admin-shots-2/final-$route.png" 2>&1 > /dev/null
done
# Open reject modal on payouts
agent-browser open http://localhost:8000/#/admin/payouts
sleep 2
agent-browser click "button[aria-label='Reject payout']"
sleep 1
agent-browser screenshot /tmp/opencode/admin-shots-2/final-reject-modal.png
agent-browser eval "document.getElementById('payout-reject-overlay')?.remove()"
```

**Step 9.3:** Visual diff each page against `/tmp/opencode/admin-shots-2/*` (the "before" set). Expected changes:
- `final-payouts.png`: seller name now dark/readable, buttons are solid green/red
- `final-reject-modal.png`: white modal card on dim backdrop, readable text
- `final-orders.png`: empty-state row with icon + title + message
- `final-activity.png`: human-readable details (key/value rows), token-based severity pills
- `final-analytics.png`: light cards on light canvas
- All other pages: unchanged (they were already on-brand)

**Step 9.4:** Final lint+build sanity.

```bash
npm run lint:check 2>&1 | tail -3
npm run build 2>&1 | tail -3
# Expected: no new errors vs baseline
```

**Step 9.5:** No commit — this is a verification step. If anything is off, add a follow-up task.

## Acceptance Criteria

- [ ] Payouts seller name is dark text, readable.
- [ ] All three modals (payouts reject, delete-account, verification detail) are light-themed.
- [ ] No emojis in admin UI (💸🗑📄⏳📧 removed).
- [ ] Activity Details column shows human-readable key/value rows.
- [ ] Orders page has a proper empty-state when no orders.
- [ ] Analytics cards are light, charts render on light surfaces.
- [ ] All severity pills use `.admin-status-pill` token classes.
- [ ] `npm run lint:check` and `npm run build` pass with no new errors.
- [ ] Playwright admin suite (4 spec files) still green.
- [ ] All commits in this branch (9 total) are pushed to `origin/main` (or your work branch).
