/**
 * Hardened deletion (spec 2026-09-22): obligations gate, OTP re-auth,
 * full scrub, atomicity.
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

const app = createTestApp();

const { getDb } = require('../config/database');
const { getDeletionBlockers } = require('../utils/accountDeletion');

async function registerUser (prefix = 'dgate') {
  const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const password = 'DeletionPass1!';
  const res = await request(app).post('/api/auth/register').send({
    fullName: `Deletion User ${suffix}`,
    email: `${prefix}_${suffix}@test.com`,
    phone: `+23324${String(1000000 + Math.floor(Math.random() * 8999999))}`,
    password,
    university: 'atu',
    level: '200',
    acceptedTerms: true,
  });
  return { token: res.body.data.token, id: res.body.data.user._id, email: res.body.data.user.email, password };
}

const seedLedger = (sellerId, amount, status) => {
  getDb().prepare(
    'INSERT INTO ledger_entries (id, sellerId, type, amount, status) VALUES (?, ?, ?, ?, ?)',
  ).run(`led_${Date.now()}_${Math.random().toString(36).slice(2)}`, sellerId, 'sale', amount, status);
};

const seedPayout = (sellerId, status) => {
  getDb().prepare(
    'INSERT INTO payouts (id, sellerId, amount, method, destination, status) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(`pay_${Date.now()}_${Math.random().toString(36).slice(2)}`, sellerId, 20, 'momo', '0240000000', status);
};

const seedOrder = ({ buyerId, status = 'placed', paymentStatus = 'pending', orderNumber }) => {
  const id = `ord_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  getDb().prepare(
    `INSERT INTO orders (id, orderNumber, userId, customer_name, customer_email, customer_phone,
       customer_university, pricing_subtotal, pricing_grandTotal, delivery_mode, delivery_address,
       payment_mode, payment_status, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id, orderNumber || `T${String(Math.floor(Math.random() * 900000) + 100000)}`, buyerId,
    'Test Buyer', 'buyer@test.com', '+233241111111', 'atu',
    50, 50, 'inperson', 'Hall A', 'cash', paymentStatus, status,
  );
  return id;
};

// FK enforcement is ON (PRAGMA foreign_keys=1): order_items.productId must
// reference a real product row.
const seedProduct = (sellerId, suffix) => {
  const id = `prod_${suffix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  getDb().prepare(
    `INSERT INTO products (id, title, description, price, category, condition, seller, sellerName, university, status)
     VALUES (?, 'Seeded', 'Seeded for deletion tests', 10, 'electronics', 'good', ?, 'Seeded Seller', 'atu', 'active')`,
  ).run(id, sellerId);
  return id;
};

const seedSoldItem = (sellerId, orderId) => {
  const productId = seedProduct(sellerId, 'sold');
  getDb().prepare(
    'INSERT INTO order_items (id, orderId, productId, title, price, quantity, seller) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(`oi_${Date.now()}_${Math.random().toString(36).slice(2)}`, orderId, productId, 'Item', 50, 1, sellerId);
};

describe('getDeletionBlockers', () => {
  test('clear account → empty list', async () => {
    const u = await registerUser();
    const blockers = await getDeletionBlockers(u.id);
    expect(blockers).toEqual([]);
  });

  test('escrowed or available balance blocks with amount + support action', async () => {
    const u = await registerUser();
    seedLedger(u.id, 45, 'escrowed');
    const blockers = await getDeletionBlockers(u.id);
    const balance = blockers.find(b => b.type === 'balance');
    expect(balance).toBeTruthy();
    expect(balance.message).toContain('GHS 45.00');
    expect(balance.action.href).toBe('#/contact');
  });

  test('available-only balance also blocks', async () => {
    const u = await registerUser();
    seedLedger(u.id, 12.5, 'released');
    const blockers = await getDeletionBlockers(u.id);
    expect(blockers.some(b => b.type === 'balance')).toBe(true);
  });

  test('in-flight payout blocks; paid/failed payouts do not', async () => {
    const a = await registerUser();
    seedPayout(a.id, 'requested');
    expect((await getDeletionBlockers(a.id)).some(b => b.type === 'payout')).toBe(true);

    const b = await registerUser();
    seedPayout(b.id, 'paid');
    seedPayout(b.id, 'failed');
    expect((await getDeletionBlockers(b.id)).some(x => x.type === 'payout')).toBe(false);
  });

  test('buyer open order blocks with #/orders action; failed payment does not; terminal states do not', async () => {
    const u = await registerUser();
    seedOrder({ buyerId: u.id, status: 'placed', paymentStatus: 'pending' });
    const blockers = await getDeletionBlockers(u.id);
    const open = blockers.find(b => b.type === 'open_order');
    expect(open).toBeTruthy();
    expect(open.action.href).toBe('#/orders');

    const v = await registerUser();
    seedOrder({ buyerId: v.id, status: 'placed', paymentStatus: 'failed' });
    seedOrder({ buyerId: v.id, status: 'delivered', paymentStatus: 'completed' });
    seedOrder({ buyerId: v.id, status: 'cancelled', paymentStatus: 'completed' });
    expect(await getDeletionBlockers(v.id)).toEqual([]);
  });

  test('seller-side open order blocks via order_items join even when buyer is someone else', async () => {
    const seller = await registerUser();
    const buyer = await registerUser();
    const orderId = seedOrder({ buyerId: buyer.id, status: 'confirmed', paymentStatus: 'completed' });
    seedSoldItem(seller.id, orderId);
    const blockers = await getDeletionBlockers(seller.id);
    expect(blockers.some(b => b.type === 'open_order')).toBe(true);
    // Buyer's own gate sees it too.
    expect((await getDeletionBlockers(buyer.id)).some(b => b.type === 'open_order')).toBe(true);
  });
});
