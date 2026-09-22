# Secure Account Deletion (Hardened) — Design Spec

Date: 2026-09-22
Status: Approved design, awaiting implementation plan
Author: opencode (AI) — requires human review before merge
Related: 2026-08-23-account-delete-export-design.md (predecessor — this spec
extends it; deletion semantics from Wave 1 are preserved unless amended here)

## Problem

Wave 1 shipped immediate-anonymization account deletion end-to-end, but a
professional review found five gaps:

1. **Lying password field** — the modal always asks for a password; Google-only
   users never had one (their `users.password` holds a bcrypt hash of a random
   string, `auth.controller.js:573`), and the backend silently skips
   verification whenever `googleId` is set (`user.controller.js:208-217`) —
   friction without security.
2. **No obligations gate** — a seller with escrowed funds, an in-flight payout,
   or open orders can delete, lose login, and strand money/orders.
3. **Partial erasure** — `activity_logs.userEmail/userName/details/ip/userAgent`
   and `student_verifications` PII (incl. ID documents on Cloudinary) survive
   deletion; so do behavioral tables (wishlists, search history, notifications)
   with no counterparty purpose. This contradicts the privacy policy promise.
4. **Admin delete is half-built** — `DELETE /api/users/:id` only flips
   `isActive` (no scrub), and no UI calls it; `adminUsersManager.deleteUser`
   (`admin-users.js:267`) is orphaned. Day-to-day moderation relies on Ban,
   which is correct and stays.
5. **Adjacent critical bug** — the login-MFA email renders
   `challenge.devCode || '••••••'` but `devCode` exists only under
   `NODE_ENV=test` (`mfa.js:45-47`), so with email configured the code is
   hashed and discarded before the controller sends the mail
   (`auth.controller.js:249-255`) — **production admin login is broken**
   whenever `isEmailConfigured()` is true.

## Decisions made (user-approved)

- **Approach 1: hardened immediate deletion.** No grace period (Approach 2
  deferred); minimal-patch option rejected.
- Re-auth: password for pure-email accounts, email OTP for Google-linked.
- Obligations block self-deletion; **admin delete bypasses the gate** (the
  permanent exit valve).
- Behavioral data hard-deleted; transactions/audit/consent survive linked to
  the anonymized shell (Wave 1 semantics kept).
- Admin side = two tiers: **Ban** (unchanged, reversible) + **Delete**
  (anonymize, replaces the old deactivate semantics). No third Deactivate.
- MFA-email bug fix rides along in the same change set.

## 1. Re-authentication model

| Account | Factor | Rationale |
|---|---|---|
| `googleId IS NULL` (pure email) | Current password, bcrypt-verified (as today) | They know it; industry standard |
| `googleId` set (Google-only **or** linked) | 6-digit email OTP to the address on file | No fake password field; OTP is the stronger consistent factor |

No schema migration: `googleId` is the proxy. Side effect (accepted): an
email-first user who later links Google switches from password to OTP for
deletion — OTP is not weaker.

**OTP mechanics** — reuses `backend/utils/mfa.js` + `admin_mfa_challenges`
(zero schema change):

- `hashCode(userId, code)` gains a **purpose** argument; the purpose string is
  folded into the SHA-256 input (`login:` vs `delete:`). A login challenge can
  never redeem at the delete endpoint and vice versa — no `purpose` column, no
  CHECK/table rebuild. All existing `mfa.js` call sites pass `'login'`.
- `createChallenge(user, purpose)` now **returns the raw code to its caller**
  (server-side only). The login controller embeds it in the MFA email HTML
  instead of `••••••` (**bug fix #5 above**). The API response still includes
  `devCode` **only** under `NODE_ENV=test` (test suites read it from the
  response, same pattern as `mfa.test.js:71`).
- Same guarantees as login MFA:6 digits (CSPRNG), SHA-256 + `JWT_SECRET`
  pepper,5-min TTL, max3 attempts, single-use (`consumedAt`).
- New endpoint `POST /api/users/me/deletion-otp` (protect) generates the
  `delete:` challenge and emails the code via `sendEmail`, responding
  `{ success, challengeId, expiresInSeconds, devCode? }` (`devCode` only under
  `NODE_ENV=test`). Failure to send →
 502 with a generic message (deletion intent cannot be verified). If email is
  unconfigured in production, Google-linked users cannot self-delete — the
  documented escape is an admin-side deletion (Section4).

The `DELETE` request verifies and consumes the challenge **inside the same
call that anonymizes** — no two-step half-state.

**Authoritative factor:** the server decides from the DB row. The UI branches
on cached `session.user.googleId` as a nicety; on mismatch the error response
carries `{ requiredFactor: 'password' | 'otp' }` and the modal switches instead
of erroring. Client state is never trusted.

## 2. In-flight obligations gate (self-service only)

Checked in the `DELETE /users/me` handler **and** exposed as a preflight.

Blockers (any hit → `409 DELETION_BLOCKED` with a structured list):

| type | Condition | Notes |
|---|---|---|
| `balance` | `getSellerBalance(userId).pending + .available > 0` (`ledger.js:198-216`) | Escrowed **or** withdrawable money would become unclaimable |
| `payout` | `payouts.sellerId = user AND status IN ('requested','approved','processing')` | In-flight money movement |
| `open_order` | Buyer: `orders.userId = user AND status IN ('placed','confirmed','in-transit')` **and** `payment_status != 'failed'`; Seller: same via `order_items` join | Failed payments are terminal, not in-flight (anti-deadlock) |

Stale-order deadlock: buyer-side `placed` orders with `payment_status='pending'`
are only blockable if the buyer can cancel them (escape-hatch link). The
implementation plan must verify whether buyer-cancel accepts `placed`; if not,
drop unpaid `placed` orders **older than7 days** from the blocker set
(abandoned, not in-flight).

Response shape — every blocker is **actionable**, never a dead end:

```json
{ "success": false, "code": "DELETION_BLOCKED",
  "blockers": [
    { "type": "balance",
      "message": "GHS 45.00 is available in your balance",
      "action": { "label": "Request a payout", "href": "#/dashboard" } },
    { "type": "open_order",
      "message": "Order #123 is still in progress",
      "action": { "label": "View order", "href": "#/orders/123" } }
  ] }
```

- `GET /api/users/me/deletion-blockers` (protect) → `{ success, blockers: [] }`
  when clear. Advisory only.
- The mutation re-checks **inside the same SQLite transaction** as the
  anonymize writes (`BEGIN … COMMIT`; if the db wrapper lacks a transaction
  helper, use raw BEGIN/COMMIT — verify in plan). Never trust the preflight.
- Preflight UX is fail-closed with three states: `checking…` → `blocked(list)`
  / `clear` / `couldn't verify — try again` (button stays disabled).
- If a `balance` blocker exists, the message must state the amount and the
  payout path; if the payout is waiting on admin processing, say so and point
  to support — **admin delete (Section4) is the guaranteed escape** so nobody
  is ever permanently trapped.

## 3. Data disposition

Principle: **personal/behavioral data dies; transactional, counterparty,
audit, and compliance data survives anonymized** (privacy policy §6 already
promises exactly this).

### Scrubbed / destroyed (new — Wave 1 gaps)

| Data | Action |
|---|---|
| `users` row | Wave 1 anonymize unchanged (`fullName`, synthetic `email`/`phone`, `avatar`, `bio`, `googleId: null`, random password re-hash, `isActive: 0`, marker in `banReason`) **plus null `resetToken`/`resetTokenExpiry`** |
| `activity_logs` rows where `user = <id>` | `userEmail`, `userName`, `ipAddress`, `userAgent` → NULL; `details` → `'[redacted]'` (free-form, unparseable). Keep `user` FK, `action`, `severity`, `university`, timestamps — identifiers go, events stay |
| `student_verifications` for user | `fullName`, `email`, `phone`, `studentId`, `universityEmail`, `hall` → shell placeholders; `verificationCode` → NULL; `documentsPurgedAt` = now |
| `verification_documents` | DB rows (CASCADE) + **immediate Cloudinary destroy** of every `cloudinaryPublicId` (do not wait the30-day `documentsPurgeAt` window — ID documents are highest-sensitivity PII). Reuse `cloudinary.util` |
| `newsletter_subscribers` where `email = <old email>` | **Delete row** |
| Behavioral, no counterparty: `wishlists`, `search_history`, `notifications`, `idempotency_keys`, user's `admin_mfa_challenges` | **Hard delete rows** |
| `products` where `seller = user` | `status → inactive` (exact enum verified in plan) |

### Survives (linked to the shell)

- **Money/transaction**: `orders`, `order_items`, `payments`, `ledger_entries`,
  `payouts`, `deliveries`, `order_status_history`, `coupons` — no FK cascades
  exist to `users(id)` (verified: zero `ON DELETE` on user FKs); Wave 1 tests
  already prove rows remain queryable (`accountLifecycle.test.js:109-111`).
- **Counterparty content**: `messages`, `conversations`, `reviews` — the other
  party's history stays coherent ("Deleted User" wrote/sent it).
- **Audit**: `activity_logs` rows themselves (scrubbed per above) — a trail
  that vanishes on deletion is useless for security investigations.
- **Compliance**: `consent_records` — proof of consent must outlive the account.

### Deletion receipt email

Capture the address in memory **before** scrub → commit transaction →
best-effort `sendEmail` to the captured address ("your account was deleted and
anonymized today; anonymized transaction records we must keep for accounting
remain"). Send failure → log only; **never roll back a committed deletion**
(intent already proven by factor + typed `DELETE`).

## 4. Admin side

**Ban unchanged** — `PUT /api/admin/users/:id/ban` stays the reversible
moderation tool (suspension + reason + audit + self/admin guards).

**Delete upgraded** — `DELETE /api/users/:id` (protect, `authorize('admin')`,
route stays below `/me` routes per the load-bearing order comment in
`user.routes.js:15-20`):

| Aspect | Design |
|---|---|
| Semantics | **Replaces** deactivate-only: runs the same anonymize + scrub as Section3 via a shared helper `anonymizeUser(tx, userId, { marker, actorId })` extracted from `deleteMyAccount` — admin erasure = user erasure |
| Body | `{ reason }`, required, min5 chars → stored as `banReason = 'deleted by admin: <reason>'` (follows the existing marker-in-`banReason` pattern) |
| Obligations gate | **Bypassed** (hard requirement — deadlock/legal escape). Instead the admin modal preflights `GET /api/users/:id/deletion-blockers` (admin-only) and displays the same blockers as **warnings**: "transaction records will remain linked to the anonymized profile" |
| Guards |400 missing/short reason;403 self-target;403 admin/moderator target (mirrors ban guards);404 unknown id |
| Audit | Activity row with actor = admin, `details = 'target=<id>; reason=<reason>'`. Pragmatic v1: reuse an existing `ACTIVITY_LOGS_ACTIONS` value — adding `admin_user_deleted` needs a SQLite CHECK rebuild across five schema definitions in `database.js`, deferred as a follow-up. Admin-owned rows are **not** subject to Section3 redaction (that only scrubs rows `user = <deleted id>`) |
| Response | `{ success: true, message: 'User deleted and anonymized' }` |

`adminUsersManager.deleteUser` (`admin-users.js:267-297`) stops being orphaned:
it sends `{ reason }` to this endpoint.

**Frontend** (`#/admin/users`):

- Delete button in the actions column (`pages.js:6354-6367`), rendered only
  for non-admin, non-self rows (admins already render `—` at `:6357-6359`; the
  viewer's own row gets the same treatment).
- New delegated branch `data-user-action="delete"` (`pages.js:6417-6421`) →
  `Pages.adminDeleteUser(id)` mirroring `adminBanUser` (`:7430-7447`), then
  `renderAdminUsers()` refresh.
- Modal = payout-reject pattern (`AdminUI.modalHtml` + `wireModal`,
  `pages.js:5788-5839`): permanent-deletion warning copy, preflight blocker
  **warnings**, required reason textarea (min5, live validation), danger
  button disabled in flight, errors via `textContent`.

No third "Deactivate" action: Ban already sets `isActive=0` plus more; a
separate Deactivate would be a strictly weaker duplicate (YAGNI).

##5. User-side UX flow

```
Settings → "🗑 Delete account…"
   ├─ GET /users/me/deletion-blockers   (tri-state; fail-closed)
   │    blocked → actionable list, Confirm disabled
   │    clear   → factor step
   ├─ Factor (UI guesses from session.user.googleId; server authoritative)
   │    pure email     → password field (autocomplete="current-password")
   │    Google-linked  → "Send code" → single numeric input
   │         (inputmode="numeric" maxlength="6" pattern="[0-9]{6}"
   │          autocomplete="one-time-code" — one field, not six boxes)
   │         resend cooldown: client-enforced60s between sends; on server
   │         `429`, Send stays disabled for the returned `retryAfterSeconds`
   │         with a live countdown, "code expires in 5 min", attempts
   │         countdown after failures, expired-code state offers "request a
   │         new one"
   ├─ Type DELETE (existing client check)
   └─ ONE request: DELETE /users/me
        { confirmText, password? | challengeId + code? }
        → factor verify + gate re-check + full scrub inside ONE transaction
        → commit → best-effort receipt email
        → client: clearSession, toast, navigate #/
```

**Rate limiting:** `POST /users/me/deletion-otp` — **3 sends /15 min**, keyed
`userId+IP`, same `express-rate-limit` pattern as existing limiters in
`server.js`. `429` responses return `retryAfterSeconds`; the modal disables
Send with a live countdown (prevents the3-sends-then-code-expired deadlock).
The OTP keeps MFA's built-ins (hash,5-min TTL,3 attempts, single-use,
purpose-bound).

**Errors** (all via `textContent`; session kept unless deleted):

| Status | Handling |
|---|---|
| `409 DELETION_BLOCKED` | Re-render blocker list (server may be newer than preflight) |
| `401` wrong password / `400` bad code | Inline message + attempts remaining;0 → force new code; body may carry `requiredFactor` → modal switches factor |
| `429` | "Too many attempts — try again in N:SS" from `retryAfterSeconds` |
| `502` OTP send failed | "We couldn't email your code — try again shortly" |
| Network/5xx | Existing generic connectivity toast |

No new inline handlers; delegation on stable parents; dynamic text escaped
(`SecurityUtils.escapeHtml`); no PII in toasts/Sentry.

## API surface

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /api/users/me/deletion-blockers` | protect | Preflight list, empty = clear |
| `POST /api/users/me/deletion-otp` | protect | Send delete OTP; rate-limited3/15min; `devCode` in response only under `NODE_ENV=test` |
| `DELETE /api/users/me` | protect | Wave1 body **extended**: `confirmText` + (`password` \| `challengeId`+`code`); gate + atomic scrub |
| `GET /api/users/:id/deletion-blockers` | protect, admin | Same queries for a target id (warnings UI) |
| `DELETE /api/users/:id` | protect, admin | `{ reason }`; anonymize; bypasses gate; guards |
| `GET /api/users/me/export` | protect | Unchanged (Wave1) |

All user routes stay **above** the parametric `/:id` block
(`user.routes.js:15-20` — order is load-bearing).

## Testing (jest — the verification layer for deletion)

- **Blockers**: each of the3 types →409 + structured `blockers`; all-clear →
 200; `payment_status='failed'` orders don't block; (stale7-day rule per plan's
  cancel-path finding).
- **Atomicity**: forced mid-transaction failure → no partial scrub (row and
  behavioral tables untouched).
- **OTP**: purpose-confusion (login challenge rejected at delete endpoint and
  vice versa);3-attempt lock;5-min expiry; single-use; raw code present in
  emailed HTML (mock or capture `sendEmail` — first spy in the suite, justified
  here); `devCode` absent from response when `NODE_ENV` is unset.
- **Factors**: pure-email requires password; google-linked requires OTP and
  rejects password; `requiredFactor` emitted on mismatch.
- **Scrub completeness**: after delete — `activity_logs` PII columns NULL,
  `details` redacted, `student_verifications` PII replaced, behavioral tables
  empty, `newsletter_subscribers` row gone, products inactive, transactions/
  consent/messages intact, old token rejected (`isActive` path).
- **Receipt email failure** → delete still succeeds.
- **Admin**: missing/short reason400; self/admin target403; obligations bypass
  confirmed (deletes despite escrow); full scrub shared with self-path.
- **MFA-email fix**: `createChallenge` returns code to caller; login email
  HTML contains the actual code; response `devCode` only in test env.
- Wave1 `accountLifecycle.test.js` cases keep passing (regression).

E2E: **no new deletion scenario** (amendment — scratch-user deletion would
pollute the shared dev SQLite with irreversible shell rows on every run, and
jest already covers the flow exhaustively). Frontend gates only: eslint,
prettier, `npm run build`.

## Out of scope / follow-ups

- Grace-period / pending-deletion state with undo (Approach2 — future)
- `ACTIVITY_LOGS_ACTIONS` CHECK rebuild to add `admin_user_deleted`
  (five schema definitions in `database.js`)
- Server-side token revocation table (`isActive=0` + per-request user read
  already kills JWTs on next use)
- Admin Deactivate button (Ban supersedes)
- Auto-refund / auto-cancel of open orders; buyer-cancel path discovery for
  `placed` orders (the plan resolves the blocker-set rule, not a feature)
- Privacy-policy copy update if the final scrub list diverges from §6-§7 text
  (current promises remain accurate)
