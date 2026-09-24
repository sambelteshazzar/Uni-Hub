/**
 * Admin verification queue endpoint (spec 2026-09-24).
 *
 * Regression: GET /api/verification/pending returned ONLY status='pending'
 * rows, so reviewed rows (approved_pending_user / approved / rejected)
 * were invisible on any browser other than the one that reviewed them —
 * the admin panel showed an empty queue while a user sat stuck awaiting
 * confirmation, and the "ask an admin to re-approve" instruction in the
 * expired-link error had no UI path (the queue never delivered the row).
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

jest.mock('../utils/emailService', () => ({
  ...jest.requireActual('../utils/emailService'),
  sendApprovalLinkEmail: jest.fn(async () => ({ success: true })),
  isEmailConfigured: jest.fn(() => true),
}));

const { sendApprovalLinkEmail } = require('../utils/emailService');
const app = createTestApp();

async function registerUser (prefix) {
  const res = await request(app).post('/api/auth/register').send({
    ...global.testUtils.generateTestUser(),
    email: `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
  });
  return { token: res.body.data.token, id: res.body.data.user._id, email: res.body.data.user.email };
}

const setRole = (userId, role) => {
  const { getDb } = require('../config/database');
  getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
};

async function submitVerification (buyer) {
  const sub = await request(app)
    .post('/api/verification')
    .set('Authorization', `Bearer ${buyer.token}`)
    .field('studentId', `30${Date.now().toString().slice(-8)}`)
    .field('fullName', 'Queue Tester')
    .field('email', `q_${Date.now()}@gmail.test`)
    .field('phone', '+233204000007')
    .field('university', 'atu')
    .field('level', '300')
    .field('verificationMethod', 'document');
  expect(sub.status).toBe(201);
  return sub.body.data.id || sub.body.data._id;
}

describe('GET /api/verification/pending (admin queue)', () => {
  beforeEach(() => {
    sendApprovalLinkEmail.mockClear();
  });

  test('returns pending AND reviewed rows (awaiting-confirmation, approved, rejected)', async () => {
    const admin = await registerUser('qadm');
    setRole(admin.id, 'admin');

    const pendingBuyer = await registerUser('qpend');
    const pendingId = await submitVerification(pendingBuyer);

    const awaitingBuyer = await registerUser('qaw');
    const awaitingId = await submitVerification(awaitingBuyer);
    const appr = await request(app)
      .put(`/api/verification/${awaitingId}/approve`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ notes: 'ok' });
    expect(appr.status).toBe(200);

    const confirmedBuyer = await registerUser('qcf');
    const confirmedId = await submitVerification(confirmedBuyer);
    const appr2 = await request(app)
      .put(`/api/verification/${confirmedId}/approve`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ notes: 'ok' });
    expect(appr2.status).toBe(200);
    // Email is mocked success, so the raw token is NOT exposed — mint the
    // confirm directly through the public endpoint using a token we hash
    // into the row (mirrors the controller's own hashing).
    const crypto = require('crypto');
    const rawToken = crypto.randomBytes(32).toString('hex');
    const { getDb } = require('../config/database');
    getDb()
      .prepare(
        "UPDATE student_verifications SET confirmationTokenHash = ?, confirmationTokenExpiresAt = datetime('now', '+24 hours'), confirmationTokenUsedAt = NULL WHERE id = ?"
      )
      .run(crypto.createHash('sha256').update(rawToken).digest('hex'), confirmedId);
    const conf = await request(app).get(`/api/verification/confirm?token=${rawToken}`);
    expect(conf.status).toBe(200);

    const rejectedBuyer = await registerUser('qrj');
    const rejectedId = await submitVerification(rejectedBuyer);
    const rej = await request(app)
      .put(`/api/verification/${rejectedId}/reject`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ notes: 'nope' });
    expect(rej.status).toBe(200);

    const queue = await request(app)
      .get('/api/verification/pending')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(queue.status).toBe(200);

    const rows = queue.body.data.verifications;
    const byId = Object.fromEntries(rows.map(r => [r.id, r]));
    expect(byId[pendingId] && byId[pendingId].status).toBe('pending');
    expect(byId[awaitingId] && byId[awaitingId].status).toBe('approved_pending_user');
    expect(byId[confirmedId] && byId[confirmedId].status).toBe('approved');
    expect(byId[rejectedId] && byId[rejectedId].status).toBe('rejected');
  });

  test('still 403 for non-admin and 401 without a session', async () => {
    const buyer = await registerUser('qforb');
    const forbidden = await request(app)
      .get('/api/verification/pending')
      .set('Authorization', `Bearer ${buyer.token}`);
    expect(forbidden.status).toBe(403);

    const anon = await request(app).get('/api/verification/pending');
    expect(anon.status).toBe(401);
  });
});
