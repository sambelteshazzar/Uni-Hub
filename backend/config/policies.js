// ============================================
// POLICIES - Versioned legal documents
// ============================================
// Bump POLICY_VERSION whenever the Terms of Service or Privacy Policy text
// changes materially. consent_records rows store the version each user
// agreed to; future re-consent flows key off this value.

const POLICY_VERSION = '2026-08-1';

module.exports = { POLICY_VERSION };
