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

describe('PUT /api/verification/:id/approve with activate (approve & activate now)', () => {
  beforeEach(() => {
    sendApprovalLinkEmail.mockClear();
  });

  const getUserVerified = userId => {
    const { getDb } = require('../config/database');
    const row = getDb().prepare('SELECT isVerified FROM users WHERE id = ?').get(userId);
    return !!(row && (row.isVerified === 1 || row.isVerified === true));
  };

  test('activates a pending row immediately: status approved, users.isVerified=true, no email', async () => {
    const admin = await registerUser('qact_adm');
    setRole(admin.id, 'admin');

    const buyer = await registerUser('qact_buyer');
    const id = await submitVerification(buyer);
    expect(getUserVerified(buyer.id)).toBe(false);

    const res = await request(app)
      .put(`/api/verification/${id}/approve`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ notes: 'walked in with ID', activate: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.activated).toBe(true);
    expect(res.body.data && res.body.data.status).toBe('approved');
    expect(getUserVerified(buyer.id)).toBe(true);
    // No confirmation link is needed — the account is already active.
    expect(res.body.confirmationLink).toBeUndefined();
    expect(sendApprovalLinkEmail).not.toHaveBeenCalled();
  });

  test('activates an awaiting-confirmation row (approved_pending_user → approved)', async () => {
    const admin = await registerUser('qact2_adm');
    setRole(admin.id, 'admin');

    const buyer = await registerUser('qact2_buyer');
    const id = await submitVerification(buyer);
    const normal = await request(app)
      .put(`/api/verification/${id}/approve`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ notes: 'ok' });
    expect(normal.status).toBe(200);
    expect(getUserVerified(buyer.id)).toBe(false);
    sendApprovalLinkEmail.mockClear();

    const res = await request(app)
      .put(`/api/verification/${id}/approve`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ activate: true });
    expect(res.status).toBe(200);
    expect(res.body.activated).toBe(true);
    expect(res.body.data && res.body.data.status).toBe('approved');
    expect(getUserVerified(buyer.id)).toBe(true);
    expect(sendApprovalLinkEmail).not.toHaveBeenCalled();
  });

  test('still 403 for non-admin', async () => {
    const admin = await registerUser('qact3_adm');
    setRole(admin.id, 'admin');
    const buyer = await registerUser('qact3_buyer');
    const id = await submitVerification(buyer);

    const moderator = await registerUser('qact3_mod');
    setRole(moderator.id, 'moderator');
    const modOk = await request(app)
      .put(`/api/verification/${id}/approve`)
      .set('Authorization', `Bearer ${moderator.token}`)
      .send({ activate: true });
    expect(modOk.status).toBe(200);

    const buyer2 = await registerUser('qact3_buyer2');
    const id2 = await submitVerification(buyer2);
    const forbidden = await request(app)
      .put(`/api/verification/${id2}/approve`)
      .set('Authorization', `Bearer ${buyer2.token}`)
      .send({ activate: true });
    expect(forbidden.status).toBe(403);
  });
});
