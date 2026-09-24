/**
 * Self-service resend of the verification confirmation email (product
 * decision "b"): like admin re-approve, the token ROTATES and a fresh link
 * is emailed to the FORM personal email — but the user triggers it
 * themselves. Constraints under test:
 *   - owner-only (userId-scoped lookup; strangers get 404)
 *   - only while status is approved_pending_user (409 otherwise)
 *   - the raw token NEVER appears in the response (email is the only channel)
 *   - activity is logged as verification_link_resent for Admin → Activity
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

jest.mock('../utils/emailService', () => ({
  ...jest.requireActual('../utils/emailService'),
  sendApprovalLinkEmail: jest.fn(async () => ({ success: true })),
  isEmailConfigured: jest.fn(() => true),
}));

const { sendApprovalLinkEmail, isEmailConfigured } = require('../utils/emailService');
// Shared require-cache instance of the mounted router — its resendStore
// is the live limiter store. resetAll between tests or the 3/15min
// counter accumulates and poisons later cases (same pattern as
// deletionGate.test.js otpStore / support tests replyStore).
const verificationRoutes = require('../routes/verification.routes');
const app = createTestApp();

const setRole = (userId, role) => {
  const { getDb } = require('../config/database');
  getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
};

async function registerUser (prefix) {
  const res = await request(app).post('/api/auth/register').send({
    ...global.testUtils.generateTestUser(),
    email: `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
  });
  return { token: res.body.data.token, id: res.body.data.user._id, email: res.body.data.user.email };
}

function getTokenHash (vid) {
  const { getDb } = require('../config/database');
  return getDb()
    .prepare('SELECT confirmationTokenHash, status FROM student_verifications WHERE id = ?')
    .get(vid);
}

async function submitVerification (buyer, personalEmail) {
  const sub = await request(app)
    .post('/api/verification')
    .set('Authorization', `Bearer ${buyer.token}`)
    .field('studentId', `30${Date.now().toString().slice(-8)}`)
    .field('fullName', 'Resend Tester')
    .field('email', personalEmail)
    .field('phone', '+233204000001')
    .field('university', 'atu')
    .field('level', '300')
    .field('verificationMethod', 'document');
  expect(sub.status).toBe(201);
  return sub.body.data.id || sub.body.data._id;
}

describe('POST /api/verification/resend-confirmation', () => {
  beforeEach(async () => {
    sendApprovalLinkEmail.mockClear();
    isEmailConfigured.mockReturnValue(true);
    if (verificationRoutes.resendStore) {
      await verificationRoutes.resendStore.resetAll();
    }
  });

  test('rotates the token, re-sends to the form email, never returns the raw token, logs activity', async () => {
    const personalEmail = `rsn_${Date.now()}@gmail.test`;
    const buyer = await registerUser('rsn');
    const reviewer = await registerUser('rsnadm');
    setRole(reviewer.id, 'admin');

    const vid = await submitVerification(buyer, personalEmail);
    const appr = await request(app)
      .put(`/api/verification/${vid}/approve`)
      .set('Authorization', `Bearer ${reviewer.token}`)
      .send({ notes: 'ok' });
    expect(appr.status).toBe(200);

    const before = getTokenHash(vid);
    expect(before.confirmationTokenHash).toBeTruthy();
    sendApprovalLinkEmail.mockClear();

    const resend = await request(app)
      .post('/api/verification/resend-confirmation')
      .set('Authorization', `Bearer ${buyer.token}`);
    expect(resend.status).toBe(200);

    // Token rotated — old delivered links are now dead.
    const after = getTokenHash(vid);
    expect(after.confirmationTokenHash).toBeTruthy();
    expect(after.confirmationTokenHash).not.toBe(before.confirmationTokenHash);
    expect(after.status).toBe('approved_pending_user');

    // Re-sent to the FORM personal email, not the registration address.
    expect(sendApprovalLinkEmail).toHaveBeenCalledTimes(1);
    expect(sendApprovalLinkEmail.mock.calls[0][0]).toBe(personalEmail);

    // Raw token must never leave the server via this endpoint.
    const body = JSON.stringify(resend.body);
    expect(body).not.toMatch(/confirmationLink|"token"|confirmationToken/);
    expect(resend.body.message).toContain(personalEmail);

    // Visible in Admin → Activity — both the admin approve (regression:
    // the CHECK enum silently rejected this action until 2026-09-23) and
    // the user-triggered resend.
    const { getDb } = require('../config/database');
    const counts = getDb()
      .prepare("SELECT action, COUNT(*) AS n FROM activity_logs WHERE action IN ('verification_link_resent','verification_approved_by_admin') GROUP BY action")
      .all();
    const byAction = Object.fromEntries(counts.map(r => [r.action, r.n]));
    expect(byAction.verification_link_resent).toBeGreaterThanOrEqual(1);
    expect(byAction.verification_approved_by_admin).toBeGreaterThanOrEqual(1);
  });

  test('409 before admin approval (status is still pending)', async () => {
    const buyer = await registerUser('rsnp');
    await submitVerification(buyer, `rsnp_${Date.now()}@gmail.test`);

    const resend = await request(app)
      .post('/api/verification/resend-confirmation')
      .set('Authorization', `Bearer ${buyer.token}`);
    expect(resend.status).toBe(409);
  });

  test('404 when the caller has no verification of their own', async () => {
    const stranger = await registerUser('rsnx');
    const resend = await request(app)
      .post('/api/verification/resend-confirmation')
      .set('Authorization', `Bearer ${stranger.token}`);
    expect(resend.status).toBe(404);
  });

  test('401 without a session', async () => {
    const resend = await request(app).post('/api/verification/resend-confirmation');
    expect(resend.status).toBe(401);
  });

  // Regression: production deployments without BREVO/EMAIL_* config
  // returned a generic 502 "try again later" AFTER rotating the token —
  // destroying the user's only working link while delivering nothing,
  // leaving them stuck in approved_pending_user forever.
  test('email service not configured: 503 EMAIL_NOT_CONFIGURED, no send attempt, link NOT rotated', async () => {
    const buyer = await registerUser('rsnu');
    const reviewer = await registerUser('rsnuadm');
    setRole(reviewer.id, 'admin');
    const vid = await submitVerification(buyer, `rsnu_${Date.now()}@gmail.test`);
    const appr = await request(app)
      .put(`/api/verification/${vid}/approve`)
      .set('Authorization', `Bearer ${reviewer.token}`)
      .send({ notes: 'ok' });
    expect(appr.status).toBe(200);

    const before = getTokenHash(vid);
    expect(before.confirmationTokenHash).toBeTruthy();
    sendApprovalLinkEmail.mockClear();
    isEmailConfigured.mockReturnValue(false);

    const resend = await request(app)
      .post('/api/verification/resend-confirmation')
      .set('Authorization', `Bearer ${buyer.token}`);
    expect(resend.status).toBe(503);
    expect(resend.body.details && resend.body.details.code).toBe('EMAIL_NOT_CONFIGURED');
    expect(sendApprovalLinkEmail).not.toHaveBeenCalled();

    // The previously issued link must remain valid — resend did nothing.
    const after = getTokenHash(vid);
    expect(after.confirmationTokenHash).toBe(before.confirmationTokenHash);

    const body = JSON.stringify(resend.body);
    expect(body).not.toMatch(/confirmationLink|"token"|confirmationToken/);
  });

  test('send failure: 502 but the previous link is restored (still usable)', async () => {
    const buyer = await registerUser('rsnf');
    const reviewer = await registerUser('rsnfadm');
    setRole(reviewer.id, 'admin');
    const vid = await submitVerification(buyer, `rsnf_${Date.now()}@gmail.test`);
    const appr = await request(app)
      .put(`/api/verification/${vid}/approve`)
      .set('Authorization', `Bearer ${reviewer.token}`)
      .send({ notes: 'ok' });
    expect(appr.status).toBe(200);

    const before = getTokenHash(vid);
    sendApprovalLinkEmail.mockClear();
    sendApprovalLinkEmail.mockResolvedValueOnce({ success: false, error: 'smtp down' });

    const resend = await request(app)
      .post('/api/verification/resend-confirmation')
      .set('Authorization', `Bearer ${buyer.token}`);
    expect(resend.status).toBe(502);

    // Rotation must be rolled back so the already-delivered link survives
    // the failed resend.
    const after = getTokenHash(vid);
    expect(after.confirmationTokenHash).toBe(before.confirmationTokenHash);
    expect(after.status).toBe('approved_pending_user');
  });
});
