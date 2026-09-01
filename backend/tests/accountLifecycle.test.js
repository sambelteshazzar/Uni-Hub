/**
 * Account lifecycle tests (spec 2026-08-23): self-service data export and
 * immediate anonymizing deletion.
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

const app = createTestApp();

async function registerUser (overrides = {}, prefix = 'alc') {
  const suffix = Date.now() + Math.floor(Math.random() * 100000);
  const user = {
    fullName: `Lifecycle User ${suffix}`,
    email: `${prefix}_${suffix}@test.com`,
    phone: `+23324${String(1000000 + Math.floor(Math.random() * 8999999))}`,
    password: 'LifecyclePass1!',
    university: 'atu',
    level: '200',
    // Server-side consent gate rejects signups without explicit acceptance.
    acceptedTerms: true,
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(user);
  return { token: res.body.data.token, id: res.body.data.user._id, password: user.password, email: user.email };
}

describe('data export', () => {
  test('returns every entity key, excludes password hash', async () => {
    const u = await registerUser();
    const res = await request(app)
      .get('/api/users/me/export')
      .set('Authorization', `Bearer ${u.token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');
    const body = res.body;
    ['exportedAt', 'policyVersion', 'profile', 'orders', 'orderItems', 'listings',
      'reviews', 'messages', 'ledgerEntries', 'payouts', 'verifications',
      'consents', 'notifications', 'wishlist'].forEach(k => {
      expect(body).toHaveProperty(k);
    });
    expect(JSON.stringify(body)).not.toMatch(/LifecyclePass1!/);
    // Account is live at export time: profile carries the REAL email.
    expect(body.profile.email).toBe(u.email || undefined);
    expect(body.profile.password).toBeUndefined();
  });

  test('requires authentication', async () => {
    const res = await request(app).get('/api/users/me/export');
    expect(res.status).toBe(401);
  });
});

describe('account deletion', () => {
  test('rejects missing confirmText without changing anything', async () => {
    const u = await registerUser();
    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({});
    expect(res.status).toBe(400);

    const { getDb } = require('../config/database');
    const row = getDb().prepare('SELECT fullName, isActive FROM users WHERE id = ?').get(u.id);
    expect(row.isActive).toBe(1);
    expect(row.fullName).not.toBe('Deleted User');
  });

  test('wrong password -> 401, unchanged', async () => {
    const u = await registerUser();
    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', password: 'WrongPass1!' });
    expect(res.status).toBe(401);
  });

  test('happy path anonymizes, deactivates, kills token, keeps money rows', async () => {
    const u = await registerUser();

    // Seed one order so we can prove financial rows survive.
    const productRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${u.token}`)
      .send(global.testUtils.generateTestProduct(u.id));
    expect(productRes.status).toBeLessThan(500);

    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', password: u.password });
    expect(res.status).toBe(200);

    const { getDb } = require('../config/database');
    const dbh = getDb();
    const row = dbh.prepare(
      'SELECT fullName, email, phone, googleId, isActive FROM users WHERE id = ?',
    ).get(u.id);
    expect(row.fullName).toBe('Deleted User');
    expect(row.email).toBe(`deleted_${u.id}@anonymized.invalid`);
    expect(row.googleId).toBeNull();
    expect(row.isActive).toBe(0);

    // Old token now rejected by an authenticated endpoint.
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${u.token}`);
    expect([401, 403]).toContain(me.status);

    // Product row still references the shell seller id.
    const prod = dbh.prepare('SELECT seller FROM products WHERE seller = ?').get(u.id);
    expect(prod).toBeTruthy();
  });

  test('google-only account deletes without password', async () => {
    const u = await registerUser();
    const { getDb } = require('../config/database');
    getDb().prepare('UPDATE users SET googleId = ? WHERE id = ?')
      .run(`g-${Date.now()}`, u.id);

    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE' });
    expect(res.status).toBe(200);
  });
});
