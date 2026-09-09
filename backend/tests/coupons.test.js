/**
 * Coupon API Tests
 * Covers the validate/CRUD flows added in the coupons feature.
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');
const { getDb } = require('../config/database');

const app = createTestApp();

async function makeBuyer (suffix = Date.now()) {
  const user = {
    ...global.testUtils.generateTestUser(),
    role: 'buyer',
    email: `coupon_buyer_${suffix}@test.com`,
  };
  const res = await request(app).post('/api/auth/register').send(user);
  const token = res.body.data.token;
  const id = res.body.data.user._id;
  getDb().prepare('UPDATE users SET isVerified = 1 WHERE id = ?').run(id);
  return { token, id, user };
}

async function makeAdmin (suffix = Date.now()) {
  const admin = {
    ...global.testUtils.generateTestUser(),
    email: `coupon_admin_${suffix}@test.com`,
  };
  const res = await request(app).post('/api/auth/register').send(admin);
  if (!res.body?.data?.token) {
    throw new Error('admin register failed: ' + JSON.stringify(res.body));
  }
  const id = res.body.data.user._id;
  getDb().prepare('UPDATE users SET isVerified = 1 WHERE id = ?').run(id);
  // Elevate to admin server-side (registration never honors a client role).
  getDb().prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(id);
  return { token: res.body.data.token, id };
}

describe('Coupon API', () => {
  describe('POST /api/coupons/validate (buyer)', () => {
    let buyer;
    beforeEach(async () => {buyer = await makeBuyer();});

    it('returns a discount for a valid percent coupon above the min order', async () => {
      // Seed directly so we don't depend on the admin path in this suite.
      const id = 'cp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      getDb()
        .prepare(
          `INSERT INTO coupons (id, code, type, value, min_order, max_uses, used_count, active, description)
           VALUES (?, ?, 'percent', 10, 50, 0, 0, 1, '10% off orders over GHS 50')`
        )
        .run(id, 'WELCOME10');

      const res = await request(app)
        .post('/api/coupons/validate')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ code: 'welcome10', subtotal: 100 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('WELCOME10');
      expect(res.body.data.discount).toBeCloseTo(10, 2);
    });

    it('rejects codes below the min_order with a 400', async () => {
      const id = 'cp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      getDb()
        .prepare(
          `INSERT INTO coupons (id, code, type, value, min_order, max_uses, used_count, active, description)
           VALUES (?, ?, 'percent', 10, 50, 0, 0, 1, '')`
        )
        .run(id, 'MIN50');

      const res = await request(app)
        .post('/api/coupons/validate')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ code: 'MIN50', subtotal: 10 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Minimum order/);
    });

    it('rejects unknown codes with 404', async () => {
      const res = await request(app)
        .post('/api/coupons/validate')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ code: 'NOPE', subtotal: 100 });
      expect(res.status).toBe(404);
    });

    it('rejects a disabled coupon with 400', async () => {
      const id = 'cp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      getDb()
        .prepare(
          `INSERT INTO coupons (id, code, type, value, min_order, max_uses, used_count, active, description)
           VALUES (?, ?, 'fixed', 5, 0, 0, 0, 0, '')`
        )
        .run(id, 'OFF');
      const res = await request(app)
        .post('/api/coupons/validate')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ code: 'OFF', subtotal: 100 });
      expect(res.status).toBe(400);
    });

    it('rejects a coupon that has hit its max_uses', async () => {
      const id = 'cp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      getDb()
        .prepare(
          `INSERT INTO coupons (id, code, type, value, min_order, max_uses, used_count, active, description)
           VALUES (?, ?, 'fixed', 5, 0, 3, 3, 1, '')`
        )
        .run(id, 'LIMITED');
      const res = await request(app)
        .post('/api/coupons/validate')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ code: 'LIMITED', subtotal: 100 });
      expect(res.status).toBe(400);
    });

    it('requires authentication', async () => {
      const res = await request(app)
        .post('/api/coupons/validate')
        .send({ code: 'WELCOME10', subtotal: 100 });
      expect(res.status).toBe(401);
    });

    it('rejects a non-positive subtotal with 400', async () => {
      const res = await request(app)
        .post('/api/coupons/validate')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ code: 'WELCOME10', subtotal: 0 });
      expect(res.status).toBe(400);
    });
  });

  describe('Admin CRUD', () => {
    let admin;
    beforeEach(async () => {admin = await makeAdmin();});

    it('creates a coupon and lists it', async () => {
      const create = await request(app)
        .post('/api/admin/coupons')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          code: 'NEW20', type: 'percent', value: 20, min_order: 0, max_uses: 0,
          description: '20% off', active: true,
        });
      expect(create.status).toBe(201);
      expect(create.body.data.code).toBe('NEW20');

      const list = await request(app)
        .get('/api/admin/coupons')
        .set('Authorization', `Bearer ${admin.token}`);
      expect(list.status).toBe(200);
      const codes = (list.body.data || []).map(c => c.code);
      expect(codes).toContain('NEW20');
    });

    it('rejects a duplicate code with 409', async () => {
      const payload = { code: 'DUPE', type: 'percent', value: 5, active: true };
      const r1 = await request(app)
        .post('/api/admin/coupons')
        .set('Authorization', `Bearer ${admin.token}`)
        .send(payload);
      expect(r1.status).toBe(201);
      const r2 = await request(app)
        .post('/api/admin/coupons')
        .set('Authorization', `Bearer ${admin.token}`)
        .send(payload);
      expect(r2.status).toBe(409);
    });

    it('rejects percent > 100 with 400', async () => {
      const r = await request(app)
        .post('/api/admin/coupons')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ code: 'OVER100', type: 'percent', value: 150, active: true });
      expect(r.status).toBe(400);
    });

    it('updates a coupon and toggles it off', async () => {
      const create = await request(app)
        .post('/api/admin/coupons')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ code: 'TGL', type: 'fixed', value: 5, active: true });
      const id = create.body.data.id;
      const upd = await request(app)
        .put(`/api/admin/coupons/${id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ active: false });
      expect(upd.status).toBe(200);
      expect(upd.body.data.active).toBe(0);
    });

    it('deletes a coupon and 404s on subsequent read', async () => {
      const create = await request(app)
        .post('/api/admin/coupons')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ code: 'DEL', type: 'fixed', value: 1, active: true });
      const id = create.body.data.id;
      const del = await request(app)
        .delete(`/api/admin/coupons/${id}`)
        .set('Authorization', `Bearer ${admin.token}`);
      expect(del.status).toBe(200);

      // The validate path should 404 for the now-deleted code (admins also
      // use the buyer-side /api/coupons/validate endpoint, not a separate
      // admin "get" route).
      const after = await request(app)
        .post('/api/coupons/validate')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ code: 'DEL', subtotal: 100 });
      expect(after.status).toBe(404);
    });

    it('forbids a non-admin from creating coupons', async () => {
      const buyer = await makeBuyer('admin_crud');
      const r = await request(app)
        .post('/api/admin/coupons')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ code: 'X', type: 'fixed', value: 1, active: true });
      expect(r.status).toBe(403);
    });
  });

  describe('Order-time coupon application', () => {
    it('subtracts the discount from the grand total and persists it on the order', async () => {
      const buyer = await makeBuyer('order_apply');
      // Buyer needs a product to buy. Make a product as the same buyer
      // (acting as seller for the listing — the test order sells buyer→buyer
      // but the inventory machine doesn't care about seller identity).
      const productData = {
        ...global.testUtils.generateTestProduct(buyer.id),
        price: 100,
      };
      const productRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send(productData);
      const productId = productRes.body.data.id || productRes.body.data._id;

      // Create a 10% off coupon
      getDb()
        .prepare(
          `INSERT INTO coupons (id, code, type, value, min_order, max_uses, used_count, active, description)
           VALUES (?, ?, 'percent', 10, 0, 5, 0, 1, '')`
        )
        .run('cp_apply_test', 'APPLY10');

      // Place an order with subtotal=100, coupon=APPLY10. Use inperson
      // delivery (GHS 0) so the math is obvious: 100 - 10 = 90.
      // idem key is 16-100 printable ASCII (see order.controller.js).
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          items: [{ productId, quantity: 1 }],
          delivery: { mode: 'inperson', address: 'Test', instructions: '' },
          payment: { mode: 'cash' },
          couponCode: 'apply10',
          idempotencyKey: 'apply10_' + Date.now() + '_abcdef',
        });
      expect(orderRes.status).toBe(201);
      const pricing = orderRes.body.data?.pricing || orderRes.body.data;
      expect(pricing.pricing_discount ?? pricing.discount).toBeCloseTo(10, 2);
      expect(pricing.pricing_grandTotal ?? pricing.grandTotal).toBeCloseTo(90, 2);
      expect(pricing.pricing_couponCode ?? pricing.couponCode).toBe('APPLY10');

      // used_count should have been bumped to 1.
      const used = getDb()
        .prepare('SELECT used_count FROM coupons WHERE code = ?')
        .get('APPLY10');
      expect(used.used_count).toBe(1);
    });
  });
});
