/**
 * Admin API Tests
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');
const { db } = require('../utils/db');

describe('Admin API', () => {
  let app;
  let adminToken;
  let buyerToken;
  let buyerId;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(async () => {
    const adminUser = global.testUtils.generateTestUser();
    adminUser.role = 'admin';
    const adminRes = await request(app).post('/api/auth/register').send(adminUser);
    adminToken = adminRes.body.data.token;
    const adminId = adminRes.body.data.user._id || adminRes.body.data.user.id;
    db('users').updateById(adminId, { role: 'admin' });

    const buyerUser = global.testUtils.generateTestUser();
    buyerUser.email = `buyer_${Date.now()}@example.com`;
    const buyerRes = await request(app).post('/api/auth/register').send(buyerUser);
    buyerToken = buyerRes.body.data.token;
    buyerId = buyerRes.body.data.user._id || buyerRes.body.data.user.id;
  });

  describe('GET /api/admin/stats', () => {
    it('should return dashboard stats for admin', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toHaveProperty('totalUsers');
      expect(res.body.data.summary).toHaveProperty('totalProducts');
      expect(res.body.data.summary).toHaveProperty('totalOrders');
      expect(res.body.data.summary).toHaveProperty('totalRevenue');
    });

    it('should reject non-admin users', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(403);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/admin/stats');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/products', () => {
    it('should return products list for admin', async () => {
      const res = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('products');
    });
  });

  describe('GET /api/admin/orders', () => {
    it('should return orders list for admin', async () => {
      const res = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('orders');
    });
  });

  describe('PUT /api/admin/users/:id/ban', () => {
    it('should ban a user', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${buyerId}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'ban', reason: 'Violation of terms of service' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isSuspended).toBe(true);
    });

    it('should unban a user', async () => {
      await request(app)
        .put(`/api/admin/users/${buyerId}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'ban', reason: 'Violation of terms of service' });

      const res = await request(app)
        .put(`/api/admin/users/${buyerId}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'unban' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isSuspended).toBe(false);
    });

    it('should reject ban without reason', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${buyerId}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'ban', reason: 'hi' });

      expect(res.status).toBe(400);
    });

    it('should reject invalid action', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${buyerId}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'kick' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/admin/users/banned', () => {
    it('should return banned users list', async () => {
      const res = await request(app)
        .get('/api/admin/users/banned')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
