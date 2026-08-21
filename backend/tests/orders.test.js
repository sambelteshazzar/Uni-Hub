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

    it('rejects non-positive-integer quantities (total manipulation)', async () => {
      for (const quantity of [0, -1, 2.5, 'x']) {
        const res = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({
            items: [{ productId, quantity }],
            delivery: { mode: 'inperson', address: 'test' },
            payment: { mode: 'cash' },
          });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/quantity/i);
      }
    });

    it('rejects quantity > 1 (listings are one-off items)', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          items: [{ productId, quantity: 2 }],
          delivery: { mode: 'inperson', address: 'test' },
          payment: { mode: 'cash' },
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/one-off/i);
    });

    it('rejects duplicate product lines in one order', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          items: [
            { productId, quantity: 1 },
            { productId, quantity: 1 },
          ],
          delivery: { mode: 'inperson', address: 'test' },
          payment: { mode: 'cash' },
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/duplicate/i);
    });

    it('generates CSPRNG tracking numbers and minimizes public track data', async () => {
      const placed = await placeOrder(buyerToken, productId);
      expect(placed.status).toBe(201);
      const { trackingNumber } = placed.body.data;

      // Unpredictable: UHT-YYMMDD- plus 10 uppercase hex chars (CSPRNG).
      expect(trackingNumber).toMatch(/^UHT-\d{6}-[0-9A-F]{10}$/);

      const trackRes = await request(app).get(`/api/orders/track/${trackingNumber}`);
      expect(trackRes.status).toBe(200);
      expect(trackRes.body.success).toBe(true);

      const data = trackRes.body.data;
      expect(data.status).toBeDefined();
      expect(data.orderNumber).toBeDefined();
      expect(Array.isArray(data.items)).toBe(true);

      // Data minimization: public endpoint must not leak PII or secrets.
      const serialized = JSON.stringify(trackRes.body);
      expect(serialized).not.toMatch(/customer/i);
      expect(serialized).not.toMatch(/address/i);
      expect(data.customer).toBeUndefined();
      expect(data.delivery).toBeUndefined();
      expect(data.payment).toBeUndefined();
      expect(data.transactionId).toBeUndefined();
    });
  });

  describe('POST /api/orders/:id/payment', () => {
    beforeEach(async () => {
      const res = await placeOrder(buyerToken, productId);
      orderId = res.body.data.id || res.body.data._id;
    });

    // Real flow: payments must be initialized (creating a payments record)
    // before completion can verify them.
    const initPayment = async () =>
      request(app)
        .post('/api/payment')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ orderId, paymentMode: 'cash' });

    it('records cash payment as pending until confirmed on delivery', async () => {
      const initRes = await initPayment();
      expect(initRes.status).toBe(201);

      const payRes = await request(app)
        .post(`/api/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ transactionId: 'CASH-TEST-1' });

      expect(payRes.status).toBe(200);
      expect(payRes.body.success).toBe(true);
      expect(payRes.body.message).toMatch(/upon delivery/i);

      // Cash settles out-of-band: inventory stays reserved and the order
      // remains payment-pending until an admin closes it out on delivery.
      const { getDb } = require('../config/database');
      const product = getDb().prepare('SELECT status FROM products WHERE id = ?').get(productId);
      expect(product.status).toBe('reserved');
      const order = getDb().prepare('SELECT payment_status FROM orders WHERE id = ?').get(orderId);
      expect(order.payment_status).toBe('pending');
    });

    it('rejects momo completion when provider verification is unavailable', async () => {
      const initRes = await request(app)
        .post('/api/payment')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ orderId, paymentMode: 'momo' });
      expect(initRes.status).toBe(201);

      const payRes = await request(app)
        .post(`/api/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ transactionId: 'MOMO-TEST-1' });

      // No PAYSTACK_SECRET_KEY in tests -> cannot verify -> must fail closed.
      expect(payRes.status).toBe(400);

      const { getDb } = require('../config/database');
      const order = getDb().prepare('SELECT payment_status FROM orders WHERE id = ?').get(orderId);
      expect(order.payment_status).toBe('pending');
    });

    it('rejects completion when no payment was initialized (fail closed)', async () => {
      const payRes = await request(app)
        .post(`/api/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ transactionId: 'CASH-TEST-2' });

      expect(payRes.status).toBe(404);
      expect(payRes.body.success).toBe(false);

      const { getDb } = require('../config/database');
      const product = getDb().prepare('SELECT status FROM products WHERE id = ?').get(productId);
      expect(product.status).toBe('reserved');
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
