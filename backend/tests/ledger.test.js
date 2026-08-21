/**
 * Ledger (Escrow) Tests
 * Covers Phase 1 of docs/superpowers/specs/2026-08-21-escrow-payouts-design.md:
 *   capture -> escrowed, release on delivery, reversal/clawback on refund,
 *   computed seller balances, and the /api/ledger/balance endpoint.
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');
const ledger = require('../utils/ledger');

const app = createTestApp();

describe('Ledger — escrow state machine', () => {
  let sellerToken;
  let sellerId;
  let productId;
  let orderId;

  beforeEach(async () => {
    const seller = {
      ...global.testUtils.generateTestUser(),
      email: `seller_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
    };
    const res = await request(app).post('/api/auth/register').send(seller);
    sellerToken = res.body.data.token;
    sellerId = res.body.data.user._id;

    const { getDb } = require('../config/database');
    getDb().prepare('UPDATE users SET isVerified = 1 WHERE id = ?').run(sellerId);

    // Seller creates a GHS 100 listing, then buys it themselves (fixture
    // pattern used across the orders suite).
    const productRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send(global.testUtils.generateTestProduct(sellerId));
    productId = productRes.body.data.id || productRes.body.data._id;

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        items: [{ productId, quantity: 1 }],
        delivery: { mode: 'inperson', address: 'test' },
        payment: { mode: 'momo' },
      });
    expect(orderRes.status).toBe(201);
    orderId = orderRes.body.data.id || orderRes.body.data._id;

    // Order creation reserves the product; release it so later flow steps
    // that check status behave like a fresh fixture where needed.
    getDb().prepare('UPDATE products SET status = \'active\' WHERE id = ?').run(productId);
  });

  const getOrderItems = async () => {
    const { getDb } = require('../config/database');
    return getDb().prepare('SELECT * FROM order_items WHERE orderId = ?').all(orderId);
  };

  it('captures provider payments as escrowed entries (idempotent)', async () => {
    await ledger.recordEscrowedSale(orderId, await getOrderItems());
    let balance = await ledger.getSellerBalance(sellerId);
    expect(balance.pending).toBe(100); // gross held
    expect(balance.available).toBe(0);

    // Duplicate capture (webhook racing verify endpoint) changes nothing.
    await ledger.recordEscrowedSale(orderId, await getOrderItems());
    balance = await ledger.getSellerBalance(sellerId);
    expect(balance.pending).toBe(100);

    // Commission is NOT taken at capture time — only at release.
    const { getDb } = require('../config/database');
    const commissions = getDb()
      .prepare('SELECT COUNT(*) as n FROM ledger_entries WHERE orderId = ? AND type = \'commission\'')
      .get(orderId);
    expect(commissions.n).toBe(0);
  });

  it('releases escrow on delivery and deducts commission at current rate', async () => {
    await ledger.recordEscrowedSale(orderId, await getOrderItems());
    const released = await ledger.releaseOrderLedger(orderId);
    expect(released).toBe(true);

    const balance = await ledger.getSellerBalance(sellerId);
    expect(balance.pending).toBe(0);
    expect(balance.available).toBe(95); // 100 - 5% commission
    expect(balance.lifetimeSales).toBe(100);

    // Second release call is a no-op (no double commission).
    const again = await ledger.releaseOrderLedger(orderId);
    expect(again).toBe(false);
    const after = await ledger.getSellerBalance(sellerId);
    expect(after.available).toBe(95);
  });

  it('reverses escrow cleanly when refunded before release', async () => {
    await ledger.recordEscrowedSale(orderId, await getOrderItems());
    const result = await ledger.reverseOrderLedger(orderId);
    expect(result.reversedEscrow).toBe(1);
    expect(result.clawbacks).toBe(0);

    const balance = await ledger.getSellerBalance(sellerId);
    expect(balance.pending).toBe(0);
    expect(balance.available).toBe(0);
  });

  it('claws back released funds when refunded after release', async () => {
    await ledger.recordEscrowedSale(orderId, await getOrderItems());
    await ledger.releaseOrderLedger(orderId);
    expect((await ledger.getSellerBalance(sellerId)).available).toBe(95);

    const result = await ledger.reverseOrderLedger(orderId);
    expect(result.clawbacks).toBe(1);

    const balance = await ledger.getSellerBalance(sellerId);
    expect(balance.available).toBe(-5); // 95 - 100 clawback
  });

  it('records cash-on-delivery sales directly as released', async () => {
    await ledger.recordCashSale(orderId, await getOrderItems());
    const balance = await ledger.getSellerBalance(sellerId);
    expect(balance.pending).toBe(0);
    expect(balance.available).toBe(95);

    // Idempotent.
    await ledger.recordCashSale(orderId, await getOrderItems());
    expect((await ledger.getSellerBalance(sellerId)).available).toBe(95);
  });
});

describe('GET /api/ledger/balance', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/ledger/balance');
    expect(res.status).toBe(401);
  });

  it('returns zero balances for a new user', async () => {
    const user = {
      ...global.testUtils.generateTestUser(),
      email: `balance_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
    };
    const reg = await request(app).post('/api/auth/register').send(user);
    const token = reg.body.data.token;

    const res = await request(app)
      .get('/api/ledger/balance')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ pending: 0, available: 0, lifetimeSales: 0 });
  });

  it('reflects the full cash-settlement flow end to end', async () => {
    const seller = {
      ...global.testUtils.generateTestUser(),
      email: `flow_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
    };
    const reg = await request(app).post('/api/auth/register').send(seller);
    const token = reg.body.data.token;
    const userId = reg.body.data.user._id;

    const { getDb } = require('../config/database');
    getDb().prepare('UPDATE users SET isVerified = 1 WHERE id = ?').run(userId);

    const productRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send(global.testUtils.generateTestProduct(userId));
    const productId = productRes.body.data.id || productRes.body.data._id;

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId, quantity: 1 }],
        delivery: { mode: 'inperson', address: 'test' },
        payment: { mode: 'cash' },
      });
    const orderId = orderRes.body.data.id || orderRes.body.data._id;

    await request(app)
      .post('/api/payment')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId, paymentMode: 'cash' });
    await request(app)
      .post(`/api/orders/${orderId}/payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ transactionId: 'CASH-LEDGER-1' });

    // Before delivery: nothing available (cash settles at handoff).
    let balance = (await request(app)
      .get('/api/ledger/balance')
      .set('Authorization', `Bearer ${token}`)).body.data;
    expect(balance.available).toBe(0);

    // Admin marks delivered -> cash settlement writes released entries.
    const admin = {
      ...global.testUtils.generateTestUser(),
      role: 'admin',
      email: `admin_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
    };
    const adminReg = await request(app).post('/api/auth/register').send(admin);
    await request(app)
      .put(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminReg.body.data.token}`)
      .send({ status: 'delivered' });

    balance = (await request(app)
      .get('/api/ledger/balance')
      .set('Authorization', `Bearer ${token}`)).body.data;
    expect(balance.available).toBe(95);
    expect(balance.lifetimeSales).toBe(100);
  });
});
