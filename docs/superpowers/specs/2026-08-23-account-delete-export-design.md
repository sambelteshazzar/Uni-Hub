# Account Deletion & Data Export — Design Spec

Date: 2026-08-23
Status: Approved design, awaiting implementation plan
Author: ox-alpha (AI) — requires human review before merge
Related: 2026-08-23-consent-logging-design.md, 2026-08-23-verification-doc-uploads-design.md
(Wave 1 data-protection stream; Ghana DPA Act 843 erasure + portability)

## Problem

Users cannot delete their account or obtain a copy of their data. 40 foreign
keys reference users(id) — orders, ledger_entries, payouts, messages,
reviews, verifications — so true row deletion is impossible without
destroying financial history that accounting and other parties' records
depend on.

## Decisions made (user-approved)

- **Deletion = immediate anonymization** of the user row; no grace window.
- **Export = single JSON** download containing every entity the user owns.
- User-generated content in messages/reviews is RETAINED (part of other
  parties' transaction records); its author renders as the anonymized shell.

## Deletion semantics

`DELETE /api/users/me` (protect middleware):

1. Body validation:
   - `confirmText` must equal `'DELETE'` (typed confirmation), else 400.
   - If the account is NOT Google-only (`googleId` null/empty): `password`
     required and bcrypt-verified against the stored hash, else 401 with
     generic message. Google-only accounts skip the password check.
2. Anonymize the row (single UPDATE):
   ```js
   {
     fullName: 'Deleted User',
     email: `deleted_${user.id}@anonymized.invalid`,  // unique per id
     phone: `deleted-${user.id.slice(0, 8)}`,         // synthetic, unique
     avatar: '',
     bio: null,
     googleId: null,
     password: bcrypt(random 32-byte hex, 12),
     isActive: 0,
     banReason: 'account deleted by user',
   }
   ```
3. Session kill: no token blacklist needed — auth.middleware.js:52 already
   rejects `isActive === false`, so every existing JWT dies on next use.
4. Audit: `logActivity('account_deleted', mappedUser, { method }, 'warning', req)`
5. Financial rows (orders, ledger_entries, payouts) are untouched — they keep
   referencing the anonymous shell, preserving GMV/commission/balance truth.
6. Response `{ success: true, message }`. Client-side: clear session storage,
   navigate home.

## Export semantics

`GET /api/users/me/export` (protect):

- Response headers: `Content-Type: application/json`,
  `Content-Disposition: attachment; filename="unihub-my-data.json"`.
- Body shape:
  ```json
  {
    "exportedAt": "<ISO>",
    "policyVersion": "<from backend/config/policies.js>",
    "profile": { ...users row minus password hash },
    "orders": [...], "orderItems": [...],
    "listings": [...],            // products where seller = user
    "reviews": [...],             // written by user
    "messages": [...],            // sender OR receiver = user
    "ledgerEntries": [...],
    "payouts": [...],
    "verifications": [...],
    "consents": [...],            // consent_records for user
    "notifications": [...],
    "wishlist": [...]
  }
  ```
- Every key present even when empty (predictable clients).
- Password hash NEVER included. Activity logs excluded (operational data).

## API surface

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /api/users/me/export` | protect | JSON attachment as above |
| `DELETE /api/users/me` | protect | confirmText + conditional password |

Both live in existing `backend/controllers/user.controller.js` +
`backend/routes/user.routes.js`.

## Frontend

Settings tab of the user dashboard (pages.js ~3556, currently a stub) gains a
"Your data" card:

- **Download my data** — button → fetch export → trigger browser download
  (blob + object URL). One click, no confirmation.
- **Delete account** (danger styling) → modal requiring typed `DELETE`;
  shows password field only for non-Google accounts (detect via profile in
  session: `googleId && !hasPassword` — if that flag isn't available
  client-side, always show the password field and let Google users leave it
  blank; backend decides). On success: clear local session, toast, navigate
  home.
- Event delegation with data-action attributes; all dynamic text escaped;
  no new inline handlers.

## Error handling

- Wrong/missing password → 401 'Invalid password'.
- Missing confirmText → 400 'Type DELETE to confirm account deletion'.
- Deleting an already-inactive/deleted account → protect middleware 401s
  naturally before handler logic runs.
- Export failure mid-stream → standard api error path; client toast.

## Testing (jest)

- DELETE without confirmText → 400; user row unchanged.
- DELETE with wrong password → 401; unchanged.
- Happy path (email account): PII fields anonymized, isActive=0, old token
  rejected by GET /api/auth/me afterward, orders/ledger rows still reference
  the shell id and remain queryable.
- Google-only account (seed googleId, random password): deletes without
  password.
- Export: contains all entity keys incl. empties; JSON.stringify never
  contains the password hash substring or the original email post-deletion.

Frontend: eslint + build gates only.

## Out of scope / follow-ups

- Scrubbing message/review text content (kept by design)
- Admin-facing "deleted accounts" filter (shell rows visible as Deleted User)
- Privacy policy rewrite (Wave 1 item 3 — will document both features)
