/**
 * Wishlist API Tests
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

describe('Wishlist API', () => {
  let app;
  let authToken;
  let userId;
  let productId;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(async () => {
    const testUser = global.testUtils.generateTestUser();
    const registerRes = await request(app).post('/api/auth/register').send(testUser);
    authToken = registerRes.body.data.token;
    userId = registerRes.body.data.user._id || registerRes.body.data.user.id;

    const adminUser = { ...global.testUtils.generateTestUser(), email: `admin_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com` };
    const adminRes = await request(app).post('/api/auth/register').send(adminUser);
    const adminToken = adminRes.body.data.token;
    const adminId = adminRes.body.data.user._id || adminRes.body.data.user.id;
    const { db } = require('../utils/db');
    await db('users').updateById(adminId, { role: 'admin' });

    const testProduct = global.testUtils.generateTestProduct(userId);
    const productRes = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(testProduct);
    productId = productRes.body.data?._id || productRes.body.data?.id;
  });

  describe('GET /api/wishlist', () => {
    it('should return empty wishlist initially', async () => {
      const res = await request(app)
        .get('/api/wishlist')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/wishlist');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/wishlist/:productId', () => {
    it('should add a product to wishlist', async () => {
      const res = await request(app)
        .post(`/api/wishlist/${productId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post(`/api/wishlist/${productId}`);

      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app)
        .post('/api/wishlist/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/wishlist/:productId', () => {
    it('should remove a product from wishlist', async () => {
      await request(app)
        .post(`/api/wishlist/${productId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const res = await request(app)
        .delete(`/api/wishlist/${productId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      const res = await request(app).delete(`/api/wishlist/${productId}`);
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/wishlist', () => {
    it('should clear the entire wishlist', async () => {
      await request(app)
        .post(`/api/wishlist/${productId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const res = await request(app)
        .delete('/api/wishlist')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
