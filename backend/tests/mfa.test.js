/**
 * MFA Tests
 * Email-OTP gate for privileged logins (admins + moderators):
 * password alone no longer yields a token; the emailed 6-digit code does.
 * Buyers are unaffected.
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

const app = createTestApp();

async function registerUser (role, emailPrefix) {
  const user = {
    ...global.testUtils.generateTestUser(),
    email: `${emailPrefix}_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
  };
  const res = await request(app).post('/api/auth/register').send(user);
  const { getDb } = require('../config/database');
  const id = res.body.data.user._id;
  if (role === 'admin') {
    // Elevate server-side; registration never honors a client-supplied role.
    getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', id);
  }
  return {
    token: res.body.data.token,
    id,
    setRole (newRole) {
      getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run(newRole, this.id);
    },
  };
}

describe('MFA — privileged login flow', () => {
  it('does not affect buyer logins', async () => {
    const buyer = await registerUser('buyer', 'mfbuyer');
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${buyer.token}`);
    const email = me.body.data.email;

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'TestPass123!' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.mfaRequired).toBeUndefined();
  });

  it('requires an emailed code for admin logins and issues a token on success', async () => {
    const admin = await registerUser('admin', 'mfadmin');

    const first = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email || 'unknown', password: 'TestPass123!' });
    // We need the actual email; re-login using profile lookup is clumsy —
    // fetch from /me with registration token instead.
    void first;

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${admin.token}`);
    const email = me.body.data.email;

    const step1 = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'TestPass123!' });
    expect(step1.status).toBe(200);
    expect(step1.body.data.mfaRequired).toBe(true);
    expect(step1.body.data.challengeId).toBeDefined();
    expect(step1.body.data.token).toBeUndefined(); // no session yet
    expect(step1.body.data.devCode).toMatch(/^\d{6}$/); // test env only

    const wrong = await request(app)
      .post('/api/auth/mfa/verify')
      .send({ challengeId: step1.body.data.challengeId, code: '000001' });
    expect(wrong.status).toBe(401);

    const right = await request(app)
      .post('/api/auth/mfa/verify')
      .send({ challengeId: step1.body.data.challengeId, code: step1.body.data.devCode });
    expect(right.status).toBe(200);
    expect(right.body.data.token).toBeDefined();

    // Token actually works.
    const meAfter = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${right.body.data.token}`);
    expect(meAfter.status).toBe(200);
  });

  it('locks a challenge after three bad attempts', async () => {
    const mod = await registerUser('buyer', 'mfmod');
    mod.setRole('moderator');

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${mod.token}`);
    const email = me.body.data.email;

    const step1 = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'TestPass123!' });

    for (let i = 0; i < 3; i++) {
      const attempt = await request(app)
        .post('/api/auth/mfa/verify')
        .send({ challengeId: step1.body.data.challengeId, code: String(100000 + i) });
      expect(attempt.status).toBe(401);
    }

    // Even the CORRECT code is now rejected — challenge locked.
    const locked = await request(app)
      .post('/api/auth/mfa/verify')
      .send({ challengeId: step1.body.data.challengeId, code: step1.body.data.devCode });
    expect(locked.status).toBe(401);
  });

  it('rejects expired challenges', async () => {
    const admin2 = await registerUser('admin', 'mfexp');
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${admin2.token}`);
    const email = me.body.data.email;

    const step1 = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'TestPass123!' });

    const { getDb } = require('../config/database');
    getDb()
      .prepare('UPDATE admin_mfa_challenges SET expiresAt = ? WHERE id = ?')
      .run(new Date(Date.now() - 1000).toISOString(), step1.body.data.challengeId);

    const expired = await request(app)
      .post('/api/auth/mfa/verify')
      .send({ challengeId: step1.body.data.challengeId, code: step1.body.data.devCode });
    expect(expired.status).toBe(401);
    expect(expired.body.error).toMatch(/expired/i);
  });

  it('is single-use: a consumed code cannot be replayed', async () => {
    const admin3 = await registerUser('admin', 'mfreplay');
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${admin3.token}`);
    const email = me.body.data.email;

    const step1 = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'TestPass123!' });
    const verify = await request(app)
      .post('/api/auth/mfa/verify')
      .send({ challengeId: step1.body.data.challengeId, code: step1.body.data.devCode });
    expect(verify.status).toBe(200);

    const replay = await request(app)
      .post('/api/auth/mfa/verify')
      .send({ challengeId: step1.body.data.challengeId, code: step1.body.data.devCode });
    expect(replay.status).toBe(401);
  });
});
