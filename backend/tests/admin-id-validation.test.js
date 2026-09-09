/**
 * Admin route :id validation Tests
 *
 * Pins the fix for the `validateObjectId` gap on admin routes
 * (backend/routes/admin.routes.js). Before the fix, the five admin
 * routes below accepted an arbitrary `:id` string and passed it
 * straight into `db('products').findById(req.params.id)` /
 * `db('users').findById(req.params.id)` (parameterized — not
 * injectable — but untyped on the audit-log/bannedBy column side).
 *
 * Today (pre-fix), a malformed id like 'not-a-uuid' reaches the
 * controller, the DB returns null, and the controller response is
 * `404 'Product not found'` / `404 'User not found'` — which masks
 * the input error as a "missing resource" error and pollutes the
 * audit path with garbage ids.
 *
 * After adding `validateObjectId` (sanitize.middleware.js:61-70) to
 * each admin route registration, malformed ids return
 *   400 { success: false, error: 'Invalid ID format' }
 * from the middleware — before the controller runs at all.
 *
 * TDD note: this file was written BEFORE the middleware patch and
 * run to confirm red on every case below.
 */

const request = require('supertest');
const { createTestApp } = require('./test-server');
const { db } = require('../utils/db');
const { generateCsrfToken } = require('../middleware/csrf.middleware');

describe('Admin route :id validation (validateObjectId)', () => {
  let app;
  let adminToken;
  let csrfToken;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(async () => {
    const adminUser = global.testUtils.generateTestUser();
    adminUser.role = 'admin';
    const adminRes = await request(app).post('/api/auth/register').send(adminUser);
    adminToken = adminRes.body.data.token;
    const adminId = adminRes.body.data.user._id || adminRes.body.data.user.id;
    await db('users').updateById(adminId, { role: 'admin' });
    csrfToken = generateCsrfToken();
  });

  const badIds = [
    'not-a-uuid',
    'undefined',
    'null',
    '../',
    '"; SELECT 1 --',
    '12345', // 5 chars — neither UUID nor 24-hex
    'abcdefghijklmnopqrstuvwxyz012345', // 31 chars — wrong length
  ];

  // The behaviour we want for every malformed id:
  //   400 + 'Invalid ID format', NOT 404 + 'Product not found' / 'User not found'.
  const expectInvalidId = res => {
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid ID format');
  };

  describe('PUT /api/admin/products/:id', () => {
    test.each(badIds)('rejects malformed id %p with 400, not 404', async badId => {
      const res = await request(app)
        .put(`/api/admin/products/${encodeURIComponent(badId)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ title: 'test', price: 10, category: 'electronics', condition: 'new' });
      expectInvalidId(res);
    });
  });

  describe('DELETE /api/admin/products/:id', () => {
    test.each(badIds)('rejects malformed id %p with 400, not 404', async badId => {
      const res = await request(app)
        .delete(`/api/admin/products/${encodeURIComponent(badId)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-CSRF-Token', csrfToken);
      expectInvalidId(res);
    });
  });

  describe('PUT /api/admin/products/:id/approve', () => {
    test.each(badIds)('rejects malformed id %p with 400, not 404', async badId => {
      const res = await request(app)
        .put(`/api/admin/products/${encodeURIComponent(badId)}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-CSRF-Token', csrfToken);
      expectInvalidId(res);
    });
  });

  describe('PUT /api/admin/products/:id/reject', () => {
    test.each(badIds)('rejects malformed id %p with 400, not 404', async badId => {
      const res = await request(app)
        .put(`/api/admin/products/${encodeURIComponent(badId)}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ reason: 'rejected for a real reason' });
      expectInvalidId(res);
    });
  });

  describe('PUT /api/admin/users/:id/ban (both ban + unban actions)', () => {
    test.each(badIds)('rejects malformed id %p on action=ban with 400, not 404', async badId => {
      const res = await request(app)
        .put(`/api/admin/users/${encodeURIComponent(badId)}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ action: 'ban', reason: 'banned for a real reason' });
      expectInvalidId(res);
    });

    test.each(badIds)('rejects malformed id %p on action=unban with 400, not 404', async badId => {
      const res = await request(app)
        .put(`/api/admin/users/${encodeURIComponent(badId)}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ action: 'unban' });
      expectInvalidId(res);
    });
  });

  // Sanity: a real UUID that does not exist still returns 404 'Product/User
  // not found' (validateObjectId accepts the format, controller rejects the
  // lookup). This pins that the middleware doesn't accidentally swallow
  // legitimate-but-missing ids.
  describe('legitimate UUID that does not exist', () => {
    const missingUuid = '00000000-0000-4000-8000-000000000000';

    test('PUT /admin/products/:id — still returns 404, not 400', async () => {
      const res = await request(app)
        .put(`/api/admin/products/${missingUuid}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ title: 'test', price: 10, category: 'electronics', condition: 'new' });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Product not found');
    });

    test('PUT /admin/users/:id/ban — still returns 404, not 400', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${missingUuid}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ action: 'ban', reason: 'banned for a real reason' });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });
  });
});
