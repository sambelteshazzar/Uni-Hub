# Privacy Policy & Terms Rewrite — Design Spec

Date: 2026-08-23
Status: Approved design, awaiting implementation plan
Author: ox-alpha (AI) — requires human review before merge
Related: Wave 1 data-protection stream (verification docs, consent logging,
account delete/export). Ghana Data Protection Act, 2012 (Act 843).

## Problem

The /privacy and /terms pages carry generic April-2026 text that predates the
platform's actual mechanics: no escrow/commission/payouts, no verification-
document retention disclosure, no self-service data rights, no processor
list. The signup checkbox links to `href="#"` — both documents unreachable
at the exact moment consent is requested. Consent records stamp version
`2026-08-1` but no page displays a version.

## Decisions made (user-approved)

- BOTH documents updated in this task (privacy rewrite + terms accuracy pass);
  one shared version stamp matching POLICY_VERSION.
- DPC status is "registered or in process": text commits accurately without
  fabricating a certificate number.
- Content lives in ONE versioned module consumed by both renderers.
- STANDING CAVEAT (must appear as code comment and stays true until a
  Ghanaian lawyer reviews): these drafts align with Act 843 principles but
  are not legal advice.

## Design

### New file: `js/content/policies.js`

```js
// Single source for legal-document content and versioning.
// POLICY_VERSION here MUST match backend/config/policies.js — consent
// records store it at signup; bump both together or re-consent breaks.
// TODO: legal review — drafts align with Act 843 principles; obtain a
// Ghanaian lawyer's review before treating these as binding terms.
export const POLICIES = {
  VERSION: '2026-08-1',
  LAST_UPDATED: 'August 2026',
  privacy: [ { heading, body }... ],
  terms:   [ { heading, body }... ],
};
```

ES module export (matches repo hybrid-module conventions; also assign
`window.POLICIES` for non-module callers if renderers need it).

### Renderers

`StaticPageMethods.renderPrivacy()` / `renderTerms()` keep their shell
(header, container) but iterate `POLICIES.privacy` / `.terms` sections
instead of hardcoded HTML. Header shows:
`Version ${POLICIES.VERSION} · Last updated ${POLICIES.LAST_UPDATED}`.

### Signup checkbox links (bug fix)

auth-pages.js ~line 1069: `href="#"` → `href="#/terms"` and `#/privacy`
for both links.

## Content outline — Privacy Policy (11 sections)

1. Who we are & scope — JERTS CART, Ghanaian student marketplace; Act 843
   applies; DPC registered/in-process commitment.
2. Data we collect — account fields; verification data incl. uploaded
   documents; transaction & delivery data; messages; technical/usage data.
3. Why we use it — contract performance; safety/anti-fraud (legitimate
   interests); legal obligations; consent where required.
4. Verification documents — moderators only; every view audit-logged;
   permanently destroyed 30 days after decision (or earlier via purge);
   verdict metadata retained.
5. Processors & sharing — Paystack (payments), Cloudinary (documents/images,
   private storage), Turso/libSQL (database hosting), Sentry (error
   monitoring), email delivery. Cross-border transfers occur under Act 843
   safeguards; we do not sell personal data.
6. Retention — verification docs per §4; financial records retained as
   accounting requires; account deletion anonymizes PII immediately while
   anonymous transaction shells persist.
7. Your rights — access/portability (Settings → Download my data),
   rectification (profile editing), erasure (Settings → Delete account),
   objection/complaints (contact us; escalate to the Data Protection
   Commission).
8. Security — bcrypt passwords, TLS, CSRF protection, role-based access,
   audited privileged access, scoped sessions.
9. Eligibility — verified university students; adult account holders.
10. Changes — version + date on this page; material changes announced;
    continued use governed by the posted version (see Terms).
11. Contact — unihubsupport@gmail.com; escalation to the Data Protection
    Commission of Ghana.

## Content outline — Terms accuracy pass

Existing skeleton kept, sections corrected: acceptance references the
versioned documents; accounts section cites verification requirement;
Buying/Selling gains platform-not-party clause, escrow release mechanics,
commission on completed sales, payout request/approval rules; new short
Data Protection clause cross-referencing the Privacy Policy version;
governing law: Ghana.

## Error handling / testing

- Pure frontend change: eslint gates on touched files, build must pass.
- Manual check: both routes render all sections; signup links navigate.

## Out of scope / follow-ups

- Re-consent prompting on future version bumps
- Lawyer review (user action; flagged in-code)
- PDF/printable versions
