/**
 * GET /api/verification/me must use the SAME notion of "verified" as
 * requireVerified (users.isVerified), not only student_verifications.
 *
 * Bug reproduced: an account with users.isVerified=1 and NO
 * student_verifications row (seed users, admin users-list "mark verified",
 * pre-migration accounts) got { isVerified:false, status:'not_submitted' }
 * from this endpoint. The client's syncVerificationStatus() trusts the
 * response unconditionally and DOWNGRADES session.user.isVerified on every
 * login / dashboard paint — so a verified user was asked to "submit
 * verification again" after logout/login.
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

const app = createTestApp();

async function registerUser () {
  const res = await request(app)
    .post('/api/auth/register')
    .send(global.testUtils.generateTestUser());
  expect(res.status).toBe(201);
  return { token: res.body.data.token, id: res.body.data.user._id || res.body.data.user.id };
}

const setUsersVerified = (userId, value) => {
  const { getDb } = require('../config/database');
  getDb().prepare('UPDATE users SET isVerified = ? WHERE id = ?').run(value ? 1 : 0, userId);
};

const insertVerificationRow = (userId, status, studentId) => {
  const { getDb } = require('../config/database');
  const { generateId } = require('../utils/db');
  const id = generateId();
  getDb()
    .prepare(
      `INSERT INTO student_verifications
        (id, userId, studentId, fullName, email, phone, university, level,
         verificationMethod, status)
       VALUES (?, ?, ?, 'Me Test', 'me_test@example.com', '+233200000001', 'atu', '300',
         'document', ?)`
    )
    .run(id, userId, studentId, status);
  return id;
};

describe('GET /api/verification/me', () => {
  test('fresh user: isVerified false, status not_submitted', async () => {
    const user = await registerUser();
    const res = await request(app)
      .get('/api/verification/me')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isVerified).toBe(false);
    expect(res.body.data.status).toBe('not_submitted');
  });

  test('users.isVerified=1 with NO verification row: isVerified true (the downgrade bug)', async () => {
    const user = await registerUser();
    setUsersVerified(user.id, true);

    const res = await request(app)
      .get('/api/verification/me')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isVerified).toBe(true);
  });

  test('approved student_verifications row: isVerified true, status approved', async () => {
    const user = await registerUser();
    insertVerificationRow(user.id, 'approved', `90${Date.now().toString().slice(-8)}`);

    const res = await request(app)
      .get('/api/verification/me')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isVerified).toBe(true);
    expect(res.body.data.status).toBe('approved');
  });

  test('pending row and users.isVerified=0: isVerified false, status pending', async () => {
    const user = await registerUser();
    insertVerificationRow(user.id, 'pending', `91${Date.now().toString().slice(-8)}`);

    const res = await request(app)
      .get('/api/verification/me')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isVerified).toBe(false);
    expect(res.body.data.status).toBe('pending');
  });

  test('approved_pending_user row: isVerified false until the magic link is clicked', async () => {
    const user = await registerUser();
    insertVerificationRow(user.id, 'approved_pending_user', `92${Date.now().toString().slice(-8)}`);

    const res = await request(app)
      .get('/api/verification/me')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isVerified).toBe(false);
    expect(res.body.data.status).toBe('approved_pending_user');
  });

  // State B self-heal: status='approved' but users.isVerified never flipped
  // (confirmVerification partial failure / legacy rows). requireVerified
  // checks users.isVerified only, so checkout stayed blocked while this
  // endpoint already claimed verified — and no other write path fixed it.
  test('approved row + users.isVerified=0: self-heals users.isVerified to 1', async () => {
    const user = await registerUser();
    insertVerificationRow(user.id, 'approved', `94${Date.now().toString().slice(-8)}`);
    setUsersVerified(user.id, false);

    const res = await request(app)
      .get('/api/verification/me')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isVerified).toBe(true);

    const { getDb } = require('../config/database');
    const row = getDb().prepare('SELECT isVerified FROM users WHERE id = ?').get(user.id);
    expect(row.isVerified).toBe(1);
  });

  test('self-heal does NOT flip users.isVerified for approved_pending_user', async () => {
    const user = await registerUser();
    insertVerificationRow(user.id, 'approved_pending_user', `95${Date.now().toString().slice(-8)}`);
    setUsersVerified(user.id, false);

    const res = await request(app)
      .get('/api/verification/me')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isVerified).toBe(false);

    const { getDb } = require('../config/database');
    const row = getDb().prepare('SELECT isVerified FROM users WHERE id = ?').get(user.id);
    expect(row.isVerified).toBe(0);
  });
});
