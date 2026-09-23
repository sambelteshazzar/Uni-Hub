/**
 * Production MFA email bug fix (spec 2026-09-22): the login email must
 * contain the real 6-digit code — devCode exists only under NODE_ENV=test,
 * so the old `challenge.devCode || '••••••'` shipped bullets in prod.
 *
 * The production-path test is the one that catches the bug: flip NODE_ENV
 * (response has no devCode) and make isEmailConfigured() true via EMAIL_*
 * so MFA is not bypassed, then assert the HTML carries real digits.
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

jest.mock('../utils/emailService', () => {
  const actual = jest.requireActual('../utils/emailService');
  return {
    ...actual,
    sendEmail: jest.fn(async () => ({ success: true })),
  };
});

const { sendEmail } = require('../utils/emailService');
const app = createTestApp();

async function registerAdmin (prefix) {
  const reg = await request(app).post('/api/auth/register').send({
    ...global.testUtils.generateTestUser(),
    email: `${prefix}_${Date.now()}@test.com`,
  });
  const id = reg.body.data.user._id;
  const { getDb } = require('../config/database');
  getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', id);
  return reg.body.data.user.email;
}

describe('login MFA email contains the real code', () => {
  beforeEach(() => {
    sendEmail.mockReset();
    sendEmail.mockResolvedValue({ success: true });
  });

  test('admin login email html carries the code from createChallenge', async () => {
    const email = await registerAdmin('mfaemail');

    const step1 = await request(app).post('/api/auth/login').send({ email, password: 'TestPass123!' });
    expect(step1.status).toBe(200);
    expect(step1.body.data.mfaRequired).toBe(true);

    expect(sendEmail).toHaveBeenCalled();
    const [, subject, html] = sendEmail.mock.calls[sendEmail.mock.calls.length - 1];
    expect(subject).toMatch(/login code/i);
    expect(html).toContain(step1.body.data.devCode);
    expect(html).not.toContain('••••••');
    // Response still must NOT leak the raw `code` field (devCode only).
    expect(step1.body.data.code).toBeUndefined();
  });

  test('production path (no devCode): html still carries the real 6-digit code', async () => {
    const email = await registerAdmin('mfaprod');
    const prevEnv = process.env.NODE_ENV;
    const prevHost = process.env.EMAIL_HOST;
    const prevUser = process.env.EMAIL_USER;
    const prevPass = process.env.EMAIL_PASS;
    try {
      // Make isEmailConfigured() true so MFA is not bypassed outside test,
      // and remove devCode from responses the way prod does.
      process.env.EMAIL_HOST = 'smtp.test.local';
      process.env.EMAIL_USER = 'smtp@test.local';
      process.env.EMAIL_PASS = 'test-pass';
      process.env.NODE_ENV = 'production';

      const step1 = await request(app).post('/api/auth/login').send({ email, password: 'TestPass123!' });
      expect(step1.status).toBe(200);
      expect(step1.body.data.mfaRequired).toBe(true);
      expect(step1.body.data.devCode).toBeUndefined();
      expect(step1.body.data.code).toBeUndefined();

      expect(sendEmail).toHaveBeenCalled();
      const [, , html] = sendEmail.mock.calls[sendEmail.mock.calls.length - 1];
      expect(html).toMatch(/\d{6}/);
      expect(html).not.toContain('••••••');
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevHost === undefined) { delete process.env.EMAIL_HOST; } else { process.env.EMAIL_HOST = prevHost; }
      if (prevUser === undefined) { delete process.env.EMAIL_USER; } else { process.env.EMAIL_USER = prevUser; }
      if (prevPass === undefined) { delete process.env.EMAIL_PASS; } else { process.env.EMAIL_PASS = prevPass; }
    }
  });
});
