/**
 * Payout Tests (Phase 3)
 * Seller payout requests against available balance + admin approval queue.
 * Flow: cash-settle an order to release GHS 95 (100 - 5% commission),
 * then exercise request/approve/reject semantics on top of that balance.
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

const app = createTestApp();

async function registerUser (role = 'buyer', prefix = 'po') {
  const user = {
    ...global.testUtils.generateTestUser(),
    role,
    email: `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
  };
  const res = await request(app).post('/api/auth/register').send(user);
  return { token: res.body.data.token, id: res.body.data.user._id, email: user.email };
}

const setRole = (userId, role) => {
  const { getDb } = require('../config/database');
  getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
};

// Releases GHS 95 available for the seller via the real cash flow.
async function seedAvailableBalance (seller) {
  const { getDb } = require('../config/database');
  getDb().prepare('UPDATE users SET isVerified = 1 WHERE id = ?').run(seller.id);

  const productRes = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${seller.token}`)
    .send(global.testUtils.generateTestProduct(seller.id));
  const productId = productRes.body.data.id || productRes.body.data._id;

  const orderRes = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${seller.token}`)
    .send({
      items: [{ productId, quantity: 1 }],
      delivery: { mode: 'inperson', address: 'test' },
      payment: { mode: 'cash' },
    });
  const orderId = orderRes.body.data.id || orderRes.body.data._id;

  await request(app)
    .post('/api/payment')
    .set('Authorization', `Bearer ${seller.token}`)
    .send({ orderId, paymentMode: 'cash' });
  await request(app)
    .post(`/api/orders/${orderId}/payment`)
    .set('Authorization', `Bearer ${seller.token}`)
    .send({ transactionId: `PO-SEED-${Date.now()}` });

  const admin = await registerUser('admin', 'poseedadmin');
  await request(app)
    .put(`/api/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ status: 'delivered' });

  return productId;
}

describe('POST /api/ledger/payouts — seller requests', () => {
  let seller;

  beforeEach(async () => {
    seller = await registerUser('buyer', 'poseller');
    await seedAvailableBalance(seller);
  });

  it('creates a request within available balance', async () => {
    const res = await request(app)
      .post('/api/ledger/payouts')
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ amount: 50, method: 'momo', destination: '0241234567' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('requested');
    expect(res.body.data.amount).toBe(50);

    // Requesting does NOT touch the balance — only approval does.
    const bal = await request(app)
      .get('/api/ledger/balance')
      .set('Authorization', `Bearer ${seller.token}`);
    expect(bal.body.data.available).toBe(95);
  });

  it('rejects amounts above available balance', async () => {
    const res = await request(app)
      .post('/api/ledger/payouts')
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ amount: 96, method: 'momo', destination: '0241234567' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insufficient/i);
  });

  it('rejects sub-minimum amounts and invalid destinations', async () => {
    const low = await request(app)
      .post('/api/ledger/payouts')
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ amount: 5, method: 'momo', destination: '0241234567' });
    expect(low.status).toBe(400);
    expect(low.body.error).toMatch(/minimum/i);

    for (const bad of ['12345', 'not-a-number-xyz', '02412']) {
      const res = await request(app)
        .post('/api/ledger/payouts')
        .set('Authorization', `Bearer ${seller.token}`)
        .send({ amount: 20, method: 'momo', destination: bad });
      expect(res.status).toBe(400);
    }
  });

  it('blocks unverified users from requesting', async () => {
    const unverified = await registerUser('buyer', 'pounverified');
    const res = await request(app)
      .post('/api/ledger/payouts')
      .set('Authorization', `Bearer ${unverified.token}`)
      .send({ amount: 20, method: 'momo', destination: '0241234567' });
    expect(res.status).toBe(403);
  });

  it('lists the seller\'s own payouts only', async () => {
    await request(app)
      .post('/api/ledger/payouts')
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ amount: 30, method: 'bank', destination: '1234567890' });

    const other = await registerUser('buyer', 'poother');
    await seedAvailableBalance(other);
    await request(app)
      .post('/api/ledger/payouts')
      .set('Authorization', `Bearer ${other.token}`)
      .send({ amount: 20, method: 'momo', destination: '0249999999' });

    const mine = await request(app)
      .get('/api/ledger/payouts')
      .set('Authorization', `Bearer ${seller.token}`);
    expect(mine.body.data.total).toBe(1);
    expect(mine.body.data.payouts[0].amount).toBe(30);
  });
});

describe('Payout approval queue (admin)', () => {
  let admin;
  let moderator;
  let seller;
  let payoutId;

  beforeEach(async () => {
    admin = await registerUser('admin', 'poqueueadmin');
    moderator = await registerUser('buyer', 'poqueuemod');
    setRole(moderator.id, 'moderator');
    seller = await registerUser('buyer', 'poqueueseller');
    await seedAvailableBalance(seller);

    const res = await request(app)
      .post('/api/ledger/payouts')
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ amount: 50, method: 'momo', destination: '0241234567' });
    payoutId = res.body.data.id;
  });

  it('lists requests with populated seller info', async () => {
    const res = await request(app)
      .get('/api/admin/payouts?status=requested')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    const row = res.body.data.payouts.find(p => p.id === payoutId);
    expect(row).toBeDefined();
    expect(row.seller.email).toBe(seller.email);
  });

  it('approves: marks paid, debits ledger, reduces balance', async () => {
    const res = await request(app)
      .put(`/api/admin/payouts/${payoutId}/approve`)
      .set('Authorization', `Bearer ${admin.token}`);
    if (res.status !== 200) {
      console.warn('approve failed with:', JSON.stringify(res.body));
    }
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('paid');

    const bal = await request(app)
      .get('/api/ledger/balance')
      .set('Authorization', `Bearer ${seller.token}`);
    expect(bal.body.data.available).toBe(45); // 95 - 50

    // Double approve loses the status race.
    const again = await request(app)
      .put(`/api/admin/payouts/${payoutId}/approve`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(again.status).toBe(409);

    // Balance must not have been double-debited.
    const bal2 = await request(app)
      .get('/api/ledger/balance')
      .set('Authorization', `Bearer ${seller.token}`);
    expect(bal2.body.data.available).toBe(45);
  });

  it('rejects with a required reason and no ledger effect', async () => {
    const noReason = await request(app)
      .put(`/api/admin/payouts/${payoutId}/reject`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({});
    expect(noReason.status).toBe(400);

    const res = await request(app)
      .put(`/api/admin/payouts/${payoutId}/reject`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ reason: 'destination verification failed' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('failed');
    expect(res.body.data.failureReason).toMatch(/verification/i);

    const bal = await request(app)
      .get('/api/ledger/balance')
      .set('Authorization', `Bearer ${seller.token}`);
    expect(bal.body.data.available).toBe(95); // untouched
  });

  it('denies moderators from the payout queue actions (RBAC)', async () => {
    const list = await request(app)
      .get('/api/admin/payouts')
      .set('Authorization', `Bearer ${moderator.token}`);
    expect(list.status).toBe(403);

    const approve = await request(app)
      .put(`/api/admin/payouts/${payoutId}/approve`)
      .set('Authorization', `Bearer ${moderator.token}`);
    expect(approve.status).toBe(403);
  });

  it('audits request and approve actions server-side', async () => {
    await request(app)
      .put(`/api/admin/payouts/${payoutId}/approve`)
      .set('Authorization', `Bearer ${admin.token}`);

    const { getDb } = require('../config/database');
    const actions = getDb()
      .prepare('SELECT action FROM activity_logs ORDER BY rowid DESC LIMIT 10')
      .all()
      .map(r => r.action);
    expect(actions).toContain('payout_request');
    expect(actions).toContain('payout_approve');
  });
});
