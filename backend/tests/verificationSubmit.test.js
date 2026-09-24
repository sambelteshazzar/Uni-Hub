/**
 * POST /api/verification re-submit guard (2026-09-24).
 *
 * A studentId+university already approved — or waiting for the user to
 * click the magic link — must 400 with a machine-readable details.code
 * the client can branch on. Tester bug: renderStudentVerification only
 * checked isVerified flags (not student_verifications.status), so an
 * approved_pending_user user got a blank form, submitted, hit this guard,
 * and the toast "This student ID is already verified or awaiting
 * confirmation" was a dead end. The SPA now routes ALREADY_SUBMITTED to
 * /verification-status. pending rows still allow a fresh submission and
 * rejected rows must stay resubmittable (the form is the only retry path).
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

const app = createTestApp();

async function registerUser (prefix) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      ...global.testUtils.generateTestUser(),
      email: `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
    });
  expect(res.status).toBe(201);
  return { token: res.body.data.token, id: res.body.data.user._id || res.body.data.user.id };
}

const insertVerificationRow = (userId, status, studentId) => {
  const { getDb } = require('../config/database');
  const { generateId } = require('../utils/db');
  const id = generateId();
  getDb()
    .prepare(
      `INSERT INTO student_verifications
        (id, userId, studentId, fullName, email, phone, university, level,
         verificationMethod, status)
       VALUES (?, ?, ?, 'Submit Test', 'submit_test@example.com', '+233200000003', 'atu', '300',
         'document', ?)`
    )
    .run(id, userId, studentId, status);
  return id;
};

async function submit (token, studentId) {
  return request(app)
    .post('/api/verification')
    .set('Authorization', `Bearer ${token}`)
    .field('studentId', studentId)
    .field('fullName', 'Submit Tester')
    .field('email', `sub_${Date.now()}@gmail.test`)
    .field('phone', '+233204000002')
    .field('university', 'atu')
    .field('level', '300')
    .field('verificationMethod', 'document');
}

describe('POST /api/verification re-submit guard', () => {
  test('approved row: 400 with details.code ALREADY_SUBMITTED and status approved', async () => {
    const user = await registerUser('als');
    const studentId = `96${Date.now().toString().slice(-8)}`;
    insertVerificationRow(user.id, 'approved', studentId);

    const res = await submit(user.token, studentId);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already verified or awaiting confirmation/i);
    expect(res.body.details).toEqual({ code: 'ALREADY_SUBMITTED', status: 'approved' });
  });

  test('approved_pending_user row: 400 with details.code ALREADY_SUBMITTED and status approved_pending_user', async () => {
    const user = await registerUser('alsp');
    const studentId = `97${Date.now().toString().slice(-8)}`;
    insertVerificationRow(user.id, 'approved_pending_user', studentId);

    const res = await submit(user.token, studentId);
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual({
      code: 'ALREADY_SUBMITTED',
      status: 'approved_pending_user',
    });
  });

  test('pending row: a fresh submission is still accepted (guard does not block it)', async () => {
    const user = await registerUser('alspend');
    const studentId = `98${Date.now().toString().slice(-8)}`;
    insertVerificationRow(user.id, 'pending', studentId);

    const res = await submit(user.token, studentId);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('rejected row: resubmission is allowed (form is the only retry path)', async () => {
    const user = await registerUser('alsrej');
    const studentId = `99${Date.now().toString().slice(-8)}`;
    insertVerificationRow(user.id, 'rejected', studentId);

    const res = await submit(user.token, studentId);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});
