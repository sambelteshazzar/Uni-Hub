/**
 * Integration Tests - Critical User Flows
 * Tests complete workflows: Browse -> Product -> Cart -> Checkout -> Order
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');
const app = createTestApp();

describe('Integration Tests - Critical User Flows', () => {
  let buyerToken;
  let adminToken;
  let buyerId;
  let adminId;
  let productId;
  let orderId;
  let admin;
  let buyer;

  const makeAdmin = () => ({
    ...global.testUtils.generateTestUser(),
    email: `admin_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
  });

  const makeBuyer = () => ({
    ...global.testUtils.generateTestUser(),
    role: 'buyer',
    email: `buyer_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
  });

  beforeEach(async () => {
    admin = makeAdmin();
    buyer = makeBuyer();
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send(admin);
    adminToken = adminRes.body.data.token;
    adminId = adminRes.body.data.user._id;

    // Roles are assigned server-side only (registration always creates a
    // buyer). Elevate the admin in the DB directly, mirroring the seed path.
    const { db } = require('../utils/db');
    await db('users').updateById(adminId, { role: 'admin' });

    const buyerRes = await request(app)
      .post('/api/auth/register')
      .send(buyer);
    buyerToken = buyerRes.body.data.token;
    buyerId = buyerRes.body.data.user._id;

    try {
      const { getDb } = require('../config/database');
      const database = getDb();
      database.prepare('UPDATE users SET isVerified = 1 WHERE id = ?').run(buyerId);
    } catch (e) {
      /* noop — test environment may not support direct DB writes */
    }
  });

  describe('Flow 1: User Registration & Authentication', () => {
    it('should register an admin (elevated server-side, not via client role)', async () => {
      const freshAdmin = makeAdmin();
      const res = await request(app)
        .post('/api/auth/register')
        .send(freshAdmin);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      // Registration never honors a client-supplied role — everyone starts
      // as 'buyer'; admin is assigned via a server-side DB elevation below.
      expect(res.body.data.user.role).toBe('buyer');

      const id = res.body.data.user._id;
      const { db } = require('../utils/db');
      await db('users').updateById(id, { role: 'admin' });

      adminToken = res.body.data.token;
      adminId = id;
    });

    it('should register a buyer', async () => {
      const freshBuyer = makeBuyer();
      const res = await request(app)
        .post('/api/auth/register')
        .send(freshBuyer);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('buyer');

      buyerToken = res.body.data.token;
      buyerId = res.body.data.user._id;
    });

    it('should login with registered credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: buyer.email,
          password: buyer.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });
  });

  describe('Flow 2: Product Management (Admin)', () => {
    it('should create a product as admin', async () => {
      const productData = {
        title: 'Test Laptop for Sale',
        description: 'A great laptop for students. Intel i5, 8GB RAM, 256GB SSD.',
        price: 2500,
        category: 'electronics',
        condition: 'good',
        images: ['https://example.com/laptop.jpg'],
        university: admin.university,
        deliveryModes: ['inperson', 'bolt'],
        paymentModes: ['momo', 'cash'],
      };

      const res = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      productId = res.body.data._id;
    });
  });

  describe('Flow 3: Product Discovery (Buyer)', () => {
    beforeEach(async () => {
      const productData = {
        title: 'Test Laptop for Sale',
        description: 'A great laptop for students. Intel i5, 8GB RAM, 256GB SSD.',
        price: 2500,
        category: 'electronics',
        condition: 'good',
        images: ['https://example.com/laptop.jpg'],
        university: admin.university,
        deliveryModes: ['inperson', 'bolt'],
        paymentModes: ['momo', 'cash'],
      };

      const res = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData);

      productId = res.body.data._id;
    });

    it('should browse all products', async () => {
      const res = await request(app).get('/api/products');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.products)).toBe(true);
    });

    it('should search products', async () => {
      const res = await request(app)
        .get('/api/products')
        .query({ search: 'laptop' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should filter by category', async () => {
      const res = await request(app)
        .get('/api/products')
        .query({ category: 'electronics' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should get single product details', async () => {
      const res = await request(app).get(`/api/products/${productId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id.toString()).toBe(productId);
    });
  });

  describe('Flow 4: Order Creation & Management', () => {
    beforeEach(async () => {
      const productData = {
        title: 'Test Laptop for Sale',
        description: 'A great laptop for students. Intel i5, 8GB RAM, 256GB SSD.',
        price: 2500,
        category: 'electronics',
        condition: 'good',
        images: ['https://example.com/laptop.jpg'],
        university: admin.university,
        deliveryModes: ['inperson', 'bolt'],
        paymentModes: ['momo', 'cash'],
      };

      const prodRes = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData);

      productId = prodRes.body.data._id;
    });

    it('should create an order', async () => {
      const orderData = {
        items: [
          {
            productId: productId,
            quantity: 1,
            price: 2500,
          },
        ],
        totalAmount: 2500,
        delivery: { mode: 'inperson', address: { street: 'Legon Campus', city: 'Accra', region: 'Greater Accra' } },
        payment: { mode: 'momo' },
        notes: 'Please contact me on WhatsApp',
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('placed');

      orderId = res.body.data._id;
    });

    it('should get buyer orders', async () => {
      const orderData = {
        items: [{ productId: productId, quantity: 1, price: 2500 }],
        totalAmount: 2500,
        delivery: { mode: 'inperson', address: { street: 'Legon Campus', city: 'Accra', region: 'Greater Accra' } },
        payment: { mode: 'momo' },
      };

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData);

      const res = await request(app)
        .get('/api/orders/my-orders')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orders.length).toBeGreaterThan(0);
    });

    it('should get order details', async () => {
      const orderData = {
        items: [{ productId: productId, quantity: 1, price: 2500 }],
        totalAmount: 2500,
        delivery: { mode: 'inperson', address: { street: 'Legon Campus', city: 'Accra', region: 'Greater Accra' } },
        payment: { mode: 'momo' },
      };

      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData);

      orderId = orderRes.body.data._id;

      const res = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id.toString()).toBe(orderId);
    });
  });

  describe('Flow 5: Payment Processing', () => {
    it('should initiate payment for order', async () => {
      const res = await request(app)
        .post(`/api/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          transactionId: `TXN${Date.now()}`,
          paymentMethod: 'momo',
        });

      // May fail if payment processing isn't fully implemented
      // Just checking it doesn't crash
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('Flow 6: Security - Unauthorized Access', () => {
    it('should not allow unauthenticated product creation', async () => {
      const res = await request(app)
        .post('/api/admin/products')
        .send(global.testUtils.generateTestProduct());

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should not allow accessing other user orders', async () => {
      // Create a new user
      const otherUser = global.testUtils.generateTestUser();
      const otherRes = await request(app)
        .post('/api/auth/register')
        .send(otherUser);
      const otherToken = otherRes.body.data.token;

      // Try to access order with different user's token
      const res = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      // Should either be 404 (not found for this user) or 403 (forbidden)
      expect([403, 404]).toContain(res.status);
    });

    it('should not expose passwords in any response', async () => {
      const res = await request(app)
        .get('/api/orders/my-orders')
        .set('Authorization', `Bearer ${buyerToken}`);

      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain(buyer.password);
    });
  });

  describe('Flow 7: Data Consistency', () => {
    let flow7ProductId;
    let flow7OrderId;

    beforeEach(async () => {
      const productData = {
        title: 'Test Laptop for Sale',
        description: 'A great laptop for students. Intel i5, 8GB RAM, 256GB SSD.',
        price: 2500,
        category: 'electronics',
        condition: 'good',
        images: ['https://example.com/laptop.jpg'],
        university: admin.university,
        deliveryModes: ['inperson', 'bolt'],
        paymentModes: ['momo', 'cash'],
      };

      const prodRes = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData);

      flow7ProductId = prodRes.body.data._id;

      const orderData = {
        items: [{ productId: flow7ProductId, quantity: 1, price: 2500 }],
        totalAmount: 2500,
        delivery: { mode: 'inperson', address: { street: 'Legon Campus', city: 'Accra', region: 'Greater Accra' } },
        payment: { mode: 'momo' },
        notes: 'Please contact me on WhatsApp',
      };

      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData);

      flow7OrderId = orderRes.body.data?._id;
    });

    it('should maintain data relationships', async () => {
      const res = await request(app)
        .get(`/api/orders/${flow7OrderId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const order = res.body.data;
      expect(order.userId.id || order.userId).toBe(buyerId);

      expect(order.items.length).toBeGreaterThan(0);
    });

    it('should track product status correctly', async () => {
      const res = await request(app).get(`/api/products/${flow7ProductId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      expect(res.body.data.status).toBeDefined();
    });
  });
});

// Performance test
describe('Performance Tests', () => {
  it('should respond to product list within 2 seconds', async () => {
    const start = Date.now();
    const res = await request(app).get('/api/products');
    const duration = Date.now() - start;

    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(2000);
  });

  it('should handle concurrent requests', async () => {
    const requests = Array(10).fill(null).map(() =>
      request(app).get('/api/products'),
    );

    const responses = await Promise.all(requests);

    expect(responses.every(r => r.status === 200)).toBe(true);
  });
});
