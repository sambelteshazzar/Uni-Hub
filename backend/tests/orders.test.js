/**
 * Orders API Tests
 * Covers the critical inventory-state machine:
 *   active → reserved (order placed)
 *          → sold     (payment completed)
 *          → active   (order cancelled or refunded)
 * Also covers double-cancel, delivery_status sync, and Paystack-free
 * cash-payment path.
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');
const app = createTestApp();

describe('Orders API — inventory state machine', () => {
  let buyerToken;
  let buyerId;
  let productId;
  let orderId;
  const buyer = {
    ...global.testUtils.generateTestUser(),
    role: 'buyer',
    email: `buyer_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
  };

  beforeEach(async () => {
    const buyerRes = await request(app).post('/api/auth/register').send(buyer);
    buyerToken = buyerRes.body.data.token;
    buyerId = buyerRes.body.data.user._id;

    // verify the buyer so requireVerified passes on POST /api/orders
    const { getDb } = require('../config/database');
    getDb().prepare('UPDATE users SET isVerified = 1 WHERE id = ?').run(buyerId);

    // create a product as the same buyer (acts as seller for own listing)
    const productData = global.testUtils.generateTestProduct(buyerId);
    const productRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send(productData);
    productId = productRes.body.data.id || productRes.body.data._id;
  });

  const placeOrder = async (token, pId) =>
    request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: pId, quantity: 1 }],
        delivery: { mode: 'inperson', address: 'test' },
        payment: { mode: 'cash' },
      });

  describe('POST /api/orders', () => {
    it('marks product as "reserved" on order creation (not "sold")', async () => {
      const res = await placeOrder(buyerToken, productId);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      orderId = res.body.data.id || res.body.data._id;

      const { getDb } = require('../config/database');
      const product = getDb().prepare('SELECT status FROM products WHERE id = ?').get(productId);
      expect(product.status).toBe('reserved');
    });

    it('rejects second order on a reserved product (prevents double-sell)', async () => {
      await placeOrder(buyerToken, productId);
      const second = await placeOrder(buyerToken, productId);
      expect(second.status).toBe(400);
      expect(second.body.error).toMatch(/no longer available/i);
    });
  });

  describe('POST /api/orders/:id/payment', () => {
    beforeEach(async () => {
      const res = await placeOrder(buyerToken, productId);
      orderId = res.body.data.id || res.body.data._id;
    });

    it('flips product from "reserved" to "sold" after cash payment', async () => {
      const payRes = await request(app)
        .post(`/api/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ transactionId: 'CASH-TEST-1' });

      expect(payRes.status).toBe(200);
      expect(payRes.body.success).toBe(true);

      const { getDb } = require('../config/database');
      const product = getDb().prepare('SELECT status FROM products WHERE id = ?').get(productId);
      expect(product.status).toBe('sold');
    });
  });

  describe('PUT /api/orders/:id/cancel', () => {
    beforeEach(async () => {
      const res = await placeOrder(buyerToken, productId);
      orderId = res.body.data.id || res.body.data._id;
    });

    it('releases inventory (status -> "active") and syncs delivery_status', async () => {
      const cancelRes = await request(app)
        .put(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.success).toBe(true);

      const { getDb } = require('../config/database');
      const product = getDb().prepare('SELECT status FROM products WHERE id = ?').get(productId);
      expect(product.status).toBe('active');

      const order = getDb().prepare('SELECT status, delivery_status FROM orders WHERE id = ?').get(orderId);
      expect(order.status).toBe('cancelled');
      expect(order.delivery_status).toBe('cancelled');
    });

    it('rejects double-cancel', async () => {
      await request(app)
        .put(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${buyerToken}`);

      const second = await request(app)
        .put(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(second.status).toBe(400);
      expect(second.body.error).toMatch(/already cancelled/i);
    });
  });

  describe('PUT /api/orders/:id/status with refunded (admin only)', () => {
    let adminToken;
    beforeEach(async () => {
      const admin = {
        ...global.testUtils.generateTestUser(),
        role: 'admin',
        email: `admin_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
      };
      const adminRes = await request(app).post('/api/auth/register').send(admin);
      adminToken = adminRes.body.data.token;

      const res = await placeOrder(buyerToken, productId);
      orderId = res.body.data.id || res.body.data._id;
    });

    it('releases inventory on refund and sets payment_status to refunded', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'refunded', note: 'customer complaint' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { getDb } = require('../config/database');
      const product = getDb().prepare('SELECT status FROM products WHERE id = ?').get(productId);
      expect(product.status).toBe('active');

      const order = getDb().prepare('SELECT status, payment_status FROM orders WHERE id = ?').get(orderId);
      expect(order.status).toBe('refunded');
      expect(order.payment_status).toBe('refunded');
    });

    it('rejects non-admin from updating status', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ status: 'delivered' });

      expect(res.status).toBe(403);
    });

    it('rejects invalid status value', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'bogus-status' });

      expect(res.status).toBe(400);
    });
  });
});
