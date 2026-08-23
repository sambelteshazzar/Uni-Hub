# Verification Document Uploads with Privacy-Preserving Lifecycle — Design Spec

Date: 2026-08-23
Status: Approved design, awaiting implementation plan
Author: ox-alpha (AI) — requires human review before merge
Related: docs/superpowers/specs/2026-08-03-admin-block-and-email-verification-design.md

## Problem

Student verification by document upload is currently decorative: the browser
sends only `{name, size}` metadata (js/pages/auth-pages.js), so admins approve
or reject "document" verifications without ever seeing a file. Meanwhile the
verification UI implies documents exist. Separately, verification submissions
(student ID, phone, email) persist in localStorage indefinitely, and dead
`verification_documents` rows accumulate server-side forever.

This spec fixes both problems and establishes a defensible retention posture
under Ghana's Data Protection Act, 2012 (Act 843):

1. Real document uploads (Cloudinary private assets) so review is genuine.
2. Bounded retention: files destroyed 30 days after decision (admin may purge
   earlier). Verdict metadata persists for audit.
3. Client-side PII minimization.
4. Audit trail of who viewed which documents.

## Decisions made

- Viewing architecture: **private Cloudinary assets + short-lived signed URLs**
  (5-minute TTL), issued per view through the backend. Backend proxy streaming
  was considered and rejected as heavier; storing encrypted blobs in our own
  DB was rejected outright.
- Retention: **30-day grace window** after approve/reject, then automatic
  destruction; admin can purge immediately at any time.
- Email-code verification method is unchanged.

## Money-free zone

No payment data flows through any endpoint in this spec.

## Data model changes

`verification_documents` — add columns (via existing PRAGMA table_info
migration pattern in backend/config/database.js):

```sql
cloudinaryPublicId TEXT,   -- Cloudinary public_id; required for destroy
sizeBytes INTEGER,
mimeType TEXT
```

Retention timing lives ONLY on the parent (`documentsPurgeAt`) so there is a
single source of truth; the purge service resolves documents via join.

`student_verifications` — add:

```sql
documentsPurgeAt TEXT      -- decision + 30 days
documentsPurgedAt TEXT     -- stamp when sweep completes (DPA evidence)
```

## API surface (all under existing /api/verification mount)

| Endpoint | Auth | Behavior |
|---|---|---|
| `POST /verification` (modified) | protect | Multipart when method=document. Server-side validation: jpg/png/pdf only (magic-byte sniff, not extension), ≤5 MB/file, ≤3 files. Uploads to private folder `uni-hub/verifications/<verificationId>/`. Any single-file failure destroys already-uploaded assets and fails the submission. |
| `GET /verification/:id/documents` | moderator/admin | Returns `[{ fileName, mimeType, sizeBytes, url }]`; `url` = signed URL, TTL 300 s, generated fresh per call. Every call appends an audit-log entry (`verification_docs_viewed`, includes viewer id + verification id, never the URLs). Empty array once purged. |
| `POST /verification/:id/purge-documents` | admin | Immediate destroy of all remaining assets + row deletion; stamps `documentsPurgedAt`. Wrapped in `auditMutation('verification_docs_purge')`. |
| `PUT /verification/:id/approve|reject` (existing) | moderator/admin | Additionally sets `documentsPurgeAt = now + 30d` on the parent. No immediate destruction. |

Security invariants:

- Signed URLs are never persisted and never logged (scrub from audit payloads).
- Cloudinary assets use `type: 'private'`; unsigned URL construction is impossible.
- Document endpoints send no-store cache headers.
- Role checks mirror the existing verification queue matrix (moderator+ to view;
  admin to purge early).
- File-type validation is a hand-rolled magic-byte signature check
  (JPEG `FF D8 FF`, PNG `89 50 4E 47`, PDF `%PDF`) — no new dependency.

## Purge mechanism

New service `backend/services/docRetention.js`: `purgeExpiredVerificationDocs()` —

1. Select `verification_documents` joined to parents where
   `documentsPurgeAt < now` and not yet stamped purged.
2. For each asset: `cloudinary.uploader.destroy(publicId)`; on failure skip +
   console.warn (retried next run).
3. Delete succeeded rows; when a parent has zero remaining rows, stamp its
   `documentsPurgedAt`.

Invocation: hourly `setInterval` in server.js, plus an opportunistic call when
an admin loads the verifications queue (so low-uptime dev environments still
converge).

## Frontend changes

- **auth-pages.js document tab**: real `FormData` submission replacing the
  `{name, size}` stub. Client-side 5 MB/type checks remain as UX affordance;
  server re-validates authoritatively. Consent text under upload gains:
  "Documents are viewable only by moderators and are permanently deleted
  30 days after your review."
- **pages.js viewVerificationDetail**: fetches fresh signed URLs each open
  (no caching); renders images inline / PDF links. Three states displayed:
  live documents · "Purging on <date>" · "Documents deleted". Admin-only
  "Purge now" button while documents exist. Inline handlers touched during
  this work migrate to event delegation per AGENTS.md CSP rule.
- **localStorage hygiene**: after successful submit, `STUDENT_VERIFICATION`
  keeps only `{universityId, verificationMethod, isPending/isVerified,
  submittedAt}` — drops documents array and phone. `adminVerificationsManager
  .submit()` local-write path removed; the queue is backend-authoritative.

## Error handling

- Partial upload failure → destroy uploaded assets, HTTP 400 naming the
  failing file; nothing persisted server-side.
- Cloudinary unavailable at submit → generic retryable error toast; nothing
  stored.
- Signed URL expires while modal open → modal refetches automatically once;
  then shows manual refresh link.
- Sweep destroy failure → warn + retry next sweep; purge timestamp withheld
  until every asset confirmed destroyed or row-deleted.

## Testing

Jest (mocked cloudinary.util): multipart submit persists metadata + uploads;
oversize/wrong-type rejected server-side; non-moderator blocked from
/documents; approve/reject sets documentsPurgeAt; purge service destroys and
stamps documentsPurgedAt; partial-failure rollback destroys uploaded assets;
signed-URL issuance audited.

E2E smoke: submit → admin views → decide → (fast-forward purgeAt) sweep clears.

## Out of scope / follow-ups

- Consent logging (separate Wave 1 item)
- Account deletion/export (separate Wave 1 item)
- TOTP-based privileged-login MFA (existing TODO)
- Backfill migration of legacy `{name,size}` rows: they contain no assets, so
  they are simply deleted once, during migration.
