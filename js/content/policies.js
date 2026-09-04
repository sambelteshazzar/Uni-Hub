// ============================================
// POLICIES - Versioned legal document content
// ============================================
// Single source for /privacy and /terms page content.
//
// VERSION here MUST match backend/config/policies.js POLICY_VERSION:
// consent_records store that version at signup, so bump BOTH together.
//
// TODO: security review / legal — these drafts align with Ghana's Data
// Protection Act 2012 (Act 843) principles but ARE NOT LEGAL ADVICE.
// Obtain a Ghanaian lawyer's review before treating them as binding.

export const POLICIES = {
  VERSION: '2026-08-1',
  LAST_UPDATED: 'August 2026',

  // privacy/terms are getters so section bodies interpolate
  // ${POLICIES.VERSION} at page-render time; a plain array property
  // would self-reference POLICIES inside its own initializer (TDZ
  // ReferenceError at module load).
  get privacy() {
    return [
      {
        heading: '1. Who We Are',
        body: `<p>JERTS CART ("we", "us") operates a marketplace connecting verified university students in Ghana to buy and sell items. This policy explains how we handle personal data under Ghana's Data Protection Act, 2012 (Act 843).</p>
<p>We are committed to registration with the Data Protection Commission of Ghana as a data controller; our registration is maintained or in progress at the time of writing.</p>`,
      },
      {
        heading: '2. Data We Collect',
        body: `<p><strong>Account data:</strong> your name, email address, phone number, university, level, hall, profile photo and bio.</p>
<p><strong>Verification data:</strong> student ID details and any admission or enrolment documents you upload when verifying student status.</p>
<p><strong>Transaction data:</strong> orders, delivery details you provide, payments processed through our payment partners, commissions and payout records.</p>
<p><strong>Communications:</strong> messages you exchange with other users, notifications, and support enquiries.</p>
<p><strong>Technical data:</strong> sign-in activity, device and usage information used to keep the platform secure.</p>`,
      },
      {
        heading: '3. Why We Use Your Data',
        body: `<p>We process personal data to: provide the marketplace and your account; verify student status; run escrow, commission and payout features; deliver orders and notifications; prevent fraud and abuse; meet legal obligations; and, where you consent, send service updates.</p>
<p>We do not sell your personal data.</p>`,
      },
      {
        heading: '4. Verification Documents',
        body: '<p>Documents you submit to prove student status are stored privately and can be viewed only by authorised moderators. Every view is recorded in our audit log. Documents are permanently destroyed within 30 days after your verification is approved or rejected (often sooner). Only the decision, reviewer and date are retained afterwards.</p>',
      },
      {
        heading: '5. Sharing & Processors',
        body: `<p>We share data only as needed to run the service: <strong>Paystack</strong> processes payments; <strong>Cloudinary</strong> stores uploaded images and verification documents in private storage; <strong>Turso</strong> hosts our database; <strong>Sentry</strong> helps us diagnose errors; email messages are delivered through our email provider.</p>
<p>Some of these processors operate outside Ghana. Where data leaves the country we rely on the safeguards required by Part VI of Act 843, including contractual protections with our processors.</p>
<p>Sellers see the delivery information needed to fulfil your order. We may also disclose data where Ghanaian law requires it.</p>`,
      },
      {
        heading: '6. How Long We Keep Data',
        body: `<p>Verification documents: destroyed within 30 days after a decision (see §4). Financial records (orders, ledger entries, payouts): retained as accounting rules require. Messages and listings: kept while your account is active.</p>
<p>When you delete your account we immediately remove your identifying details and disable sign-in. Anonymous transaction records may remain where they are needed for accounting or other users' order history.</p>`,
      },
      {
        heading: '7. Your Rights',
        body: `<p>You can exercise the following rights directly in the app, under Dashboard → Settings → "Your data":</p>
<p><strong>Access & portability</strong> — download a machine-readable copy of your data at any time.<br/>
<strong>Rectification</strong> — correct your profile details.<br/>
<strong>Erasure</strong> — delete your account; we anonymise your personal information immediately.</p>
<p>You may also contact us at <a href="mailto:unihubsupport@gmail.com">unihubsupport@gmail.com</a> for any request, and you have the right to lodge a complaint with the Data Protection Commission of Ghana.</p>`,
      },
      {
        heading: '8. Security',
        body: '<p>Passwords are hashed, never stored in plain text. Traffic is encrypted in transit. Administrative actions on sensitive data are logged, and privileged accounts use role-based access controls with separate sessions. No system is perfectly secure; if a breach affecting your data occurs we will notify you and the Data Protection Commission as Act 843 requires.</p>',
      },
      {
        heading: '9. Eligibility',
        body: '<p>JERTS CART is for verified university students. Account holders must be 18 years or older.</p>',
      },
      {
        heading: '10. Changes to This Policy',
        body: '<p>The version and date at the top of this page change whenever we update it. Material changes will be announced in the app. The version current when you accepted these terms is stored with your consent record.</p>',
      },
      {
        heading: '11. Contact',
        body: `<p>Questions or requests: <a href="mailto:unihubsupport@gmail.com">unihubsupport@gmail.com</a>.</p>
<p>You may escalate unresolved concerns to the Data Protection Commission of Ghana.</p>`,
      },
    ];
  },

  get terms() {
    return [
      {
        heading: '1. Acceptance of Terms',
        body: `<p>By creating an account you agree to these Terms and to the Privacy Policy (version ${POLICIES.VERSION}). If you do not agree, do not use JERTS CART.</p>`,
      },
      {
        heading: '2. Accounts & Verification',
        body: `<p>Accounts are for verified university students aged 18 or older. You must provide accurate details and may be asked to verify student status. Providing false information may lead to suspension.</p>
<p>You are responsible for your account; tell us promptly at <a href="mailto:unihubsupport@gmail.com">unihubsupport@gmail.com</a> if you suspect unauthorised access. You can delete your account at any time from Dashboard → Settings.</p>`,
      },
      {
        heading: '3. The Marketplace & Our Role',
        body: `<p>JERTS CART is a venue: sales contracts form between buyer and seller, not with us. We are not party to those contracts but we operate the payment, escrow and delivery-status systems used by them.</p>
<p>Listings must be lawful, accurate and yours to sell. We may remove listings that breach these Terms.</p>`,
      },
      {
        heading: '4. Payments, Escrow & Commissions',
        body: `<p>Online payments are processed by Paystack. For qualifying orders we hold cleared payments in escrow and release them to the seller after delivery is confirmed, minus a platform commission displayed at checkout. Commission rates applied at the time of each sale are final for that sale.</p>
<p>Sellers may request payouts of available balances from their dashboard; requests are reviewed before settlement. Cash-on-delivery orders settle directly between buyer and seller.</p>`,
      },
      {
        heading: '5. Refunds & Disputes',
        body: '<p>Where an order is cancelled or refunded before release, escrowed amounts are returned through the original payment method. Escrowed amounts already released may be clawed back where these Terms allow a refund. Contact support first — most issues are resolvable — and we may mediate disputes, without becoming a party to the sale.</p>',
      },
      {
        heading: '6. Prohibited Conduct',
        body: "<p>No fraudulent orders or listings, harassment, off-platform payment evasion designed to defeat escrow, interference with the service, or attempts to access other users' data.</p>",
      },
      {
        heading: '7. Liability',
        body: '<p>To the fullest extent Ghanaian law allows, JERTS CART is liable only for direct losses caused by our own negligence or breach, and not for indirect or consequential losses, or for the underlying goods traded between users. Nothing limits liability that cannot lawfully be limited.</p>',
      },
      {
        heading: '8. Data Protection',
        body: `<p>We process personal data under our Privacy Policy (version ${POLICIES.VERSION}), which forms part of these Terms. You keep the rights described there, including data download and account deletion.</p>`,
      },
      {
        heading: '9. Changes, Governing Law',
        body: '<p>We may update these Terms; the version posted on this page applies going forward, and material changes will be announced in the app. These Terms are governed by the laws of the Republic of Ghana.</p>',
      },
    ];
  },
};

// Hybrid-module convention: expose globally for non-importing callers.
window.POLICIES = POLICIES;
