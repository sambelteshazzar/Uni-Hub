# Consent Logging — Design Spec

Date: 2026-08-23
Status: Approved design, awaiting implementation plan
Author: ox-alpha (AI) — requires human review before merge
Related: 2026-08-23-verification-doc-uploads-design.md (Wave 1 data-protection stream)

## Problem

Signup shows a required Terms/Privacy checkbox (js/pages/auth-pages.js) but
nothing is recorded server-side. Ghana DPA (Act 843) compliance requires
provable consent: who agreed, to what version, when, via which flow. Google
signups never see the checkbox at all.

## Scope decision

Consent is captured at account creation ONLY (both paths). Schema carries a
policyVersion column so future re-consent flows can be added without
migration, but no re-prompt machinery is built now (YAGNI, per user decision).

## Design

### Schema

```sql
CREATE TABLE IF NOT EXISTS consent_records (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  documentType TEXT NOT NULL DEFAULT 'terms_and_privacy'
    CHECK(documentType IN ('terms_and_privacy')),
  policyVersion TEXT NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('email_signup','google')),
  ipAddress TEXT,
  createdAt TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_consent_userId ON consent_records(userId, createdAt);
```

### Policy version source

New `backend/config/policies.js` exports `POLICY_VERSION = '2026-08-1'`.
Bumping it later is a one-line change; the table already supports multiple
records per user over time.

### Capture points

1. **Email signup** (`exports.register`, backend/controllers/auth.controller.js):
   after input validation, BEFORE user creation:
   `if (req.body.acceptedTerms !== true) throw new ApiError(400, 'You must accept the Terms of Service and Privacy Policy');`
   On successful creation, insert a row with `method: 'email_signup'`,
   `ipAddress: req.ip`.
2. **Google first-time creation** (`googleTokenLogin`, new-user branch only):
   insert with `method: 'google'` right after `db('users').create(...)`,
   next to the existing signup logActivity call. Returning Google users get
   NO new record (they never see fresh terms this round).

Shared helper in auth.controller.js:

```js
async function recordConsent (userId, method, ip) {
  try {
    await db('consent_records').create({
      userId,
      documentType: 'terms_and_privacy',
      policyVersion: POLICY_VERSION,
      method,
      ipAddress: ip || null,
    });
  } catch (err) {
    // Signup succeeds even if the consent write fails; the warning flags
    // the gap rather than locking a new user out.
    console.warn('[consent] failed to record consent:', err.message);
  }
}
```

### Frontend

- Signup submit handler sends `acceptedTerms: form.terms.checked === true`
  in the register POST body.
- Microcopy under the social buttons grid:
  "By continuing with Google, you agree to our Terms of Service and Privacy Policy."
- Checkbox itself unchanged (client-side required stays as UX).

### Read access

No endpoints expose consent records this round — they exist for DPA requests
and a future admin UI (follow-up). Direct DB queries suffice for disputes.

## Error handling

- Missing/false `acceptedTerms` → 400 before any user record exists.
- Consent INSERT failure → warning logged, signup continues (documented
  trade-off above).

## Testing

Jest additions (backend/tests/auth.test.js or new consent.test.js):
- register WITHOUT acceptedTerms → 400, zero rows in users AND consent_records
- register WITH acceptedTerms → user created + consent row has correct
  policyVersion, method='email_signup', non-null createdAt
- recordConsent unit-called with method='google' → row written
Frontend: eslint + build gates only.

## Out of scope / follow-ups

- Re-consent prompts on policy version bump
- Admin UI surfacing consent history per user
- Consent records surfaced in account-export (Wave 1 item 2 will include them)
