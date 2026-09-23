/**
 * Hardened deletion (spec 2026-09-22): obligations gate, OTP re-auth,
 * full scrub, atomicity.
 */
jest.mock('../utils/cloudinary.util', () => {
  const actual = jest.requireActual('../utils/cloudinary.util');
  return {
    ...actual,
    destroyDocument: jest.fn(async () => ({ result: 'ok' })),
  };
});
jest.mock('../utils/emailService', () => {
  const actual = jest.requireActual('../utils/emailService');
  return {
    ...actual,
    sendEmail: jest.fn(async () => ({ success: true })),
  };
});

const request = require('supertest');
const { createTestApp } = require('./test-server');
const { destroyDocument } = require('../utils/cloudinary.util');
const { sendEmail } = require('../utils/emailService');
const mfa = require('../utils/mfa');

const app = createTestApp();

// Per-test reset so mockResolvedValueOnce / mockRejectedValueOnce queues
// from one test can never poison the next.
beforeEach(() => {
  sendEmail.mockReset();
  sendEmail.mockResolvedValue({ success: true });
  destroyDocument.mockReset();
  destroyDocument.mockResolvedValue({ result: 'ok' });
});

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

const setGoogleId = id =>
  getDb().prepare('UPDATE users SET googleId = ? WHERE id = ?').run(`g_${Date.now()}`, id);

const requestOtp = async token => {
  const res = await request(app).post('/api/users/me/deletion-otp')
    .set('Authorization', `Bearer ${token}`).send({});
  return res;
};

// NOTE (Task 3 only): /me/deletion-otp does not exist yet — create OTPs
// directly via mfa.createChallenge(user, 'delete') for THIS task's factor
// tests; Task 4 switches/extends to the HTTP endpoint.
const makeDeleteChallenge = async userId => {
  const user = await require('../utils/db').db('users').findById(userId);
  return mfa.createChallenge(user, 'delete');
};

describe('DELETE /users/me — factors', () => {
  test('pure-email account requires password; wrong password → 401 structured', async () => {
    const u = await registerUser();
    const bad = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', password: 'Nope1!' });
    expect(bad.status).toBe(401);
    expect(bad.body.success).toBe(false);

    // challengeId instead of password → requiredFactor password
    const ch = await makeDeleteChallenge(u.id);
    const wrongFactor = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', challengeId: ch.id, code: ch.code });
    expect(wrongFactor.status).toBe(400);
    expect(wrongFactor.body.requiredFactor).toBe('password');
  });

  test('google-linked account requires OTP; password-only → 400 requiredFactor otp', async () => {
    const u = await registerUser();
    setGoogleId(u.id);
    const pw = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', password: u.password });
    expect(pw.status).toBe(400);
    expect(pw.body.requiredFactor).toBe('otp');
  });

  test('google-linked deletes with OTP; purpose-confused login challenge rejected', async () => {
    const u = await registerUser();
    setGoogleId(u.id);

    // Purpose confusion: a LOGIN-bound challenge must not redeem here.
    const loginCh = await mfa.createChallenge(
      await require('../utils/db').db('users').findById(u.id), 'login');
    const confused = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', challengeId: loginCh.id, code: loginCh.code });
    expect(confused.status).not.toBe(200);
    const still = getDb().prepare('SELECT isActive FROM users WHERE id = ?').get(u.id);
    expect(still.isActive).toBe(1);

    const delCh = await makeDeleteChallenge(u.id);
    const ok = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', challengeId: delCh.id, code: delCh.code });
    expect(ok.status).toBe(200);
  });

  test('wrong OTP code → 400 with attemptsLeft; lock after 3', async () => {
    const u = await registerUser();
    setGoogleId(u.id);
    const ch = await makeDeleteChallenge(u.id);
    const miss = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', challengeId: ch.id, code: '000001' });
    expect(miss.status).toBe(400);
    expect(miss.body.attemptsLeft).toBe(2);

    for (let i = 0; i < 2; i++) {
      await request(app).delete('/api/users/me')
        .set('Authorization', `Bearer ${u.token}`)
        .send({ confirmText: 'DELETE', challengeId: ch.id, code: `00000${i + 2}` });
    }
    const locked = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', challengeId: ch.id, code: ch.code });
    expect(locked.status).toBe(400);
    expect(locked.body.error).toMatch(/too many/i);
    expect(getDb().prepare('SELECT isActive FROM users WHERE id = ?').get(u.id).isActive).toBe(1);
  });
});

describe('DELETE /users/me — obligations gate', () => {
  test('balance blocker → 409 DELETION_BLOCKED with structured list, account untouched', async () => {
    const u = await registerUser();
    setGoogleId(u.id);
    seedLedger(u.id, 45, 'escrowed');
    const ch = await makeDeleteChallenge(u.id);
    const res = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', challengeId: ch.id, code: ch.code });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DELETION_BLOCKED');
    expect(res.body.blockers.map(b => b.type)).toContain('balance');
    expect(getDb().prepare('SELECT isActive, email FROM users WHERE id = ?').get(u.id))
      .toMatchObject({ isActive: 1 });
    // OTP was consumed-or-not — irrelevant; account must be intact either way.
  });

  test('open buyer order → 409; after cancelling it, delete succeeds', async () => {
    const u = await registerUser();
    setGoogleId(u.id);
    const orderId = seedOrder({ buyerId: u.id });
    const ch1 = await makeDeleteChallenge(u.id);
    const blocked = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', challengeId: ch1.id, code: ch1.code });
    expect(blocked.status).toBe(409);
    expect(blocked.body.blockers[0].action.href).toBe('#/orders');

    // Clear the obligation (what the UI cancel button does).
    getDb().prepare('UPDATE orders SET status = ? WHERE id = ?').run('cancelled', orderId);
    const ch2 = await makeDeleteChallenge(u.id);
    const ok = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', challengeId: ch2.id, code: ch2.code });
    expect(ok.status).toBe(200);
  });
});

describe('DELETE /users/me — scrub completeness', () => {
  test('PII dies, transactions/consent/messages survive, receipt best-effort', async () => {
    const u = await registerUser();
    setGoogleId(u.id);
    const dbh = getDb();
    // FK-safe seeds (PRAGMA foreign_keys=1): real product + real conversation
    // before the rows that reference them.
    const wlProduct = seedProduct(u.id, 'wl');
    dbh.prepare('INSERT INTO wishlists (id, user, product) VALUES (?, ?, ?)').run(`wl_${u.id}`, u.id, wlProduct);
    dbh.prepare(
      'INSERT INTO student_verifications (id, userId, studentId, fullName, email, phone, university, level, verificationMethod, verificationCode, status, universityEmail, hall) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(`sv_${u.id}`, u.id, 'UG123456', 'Real Name', u.email, '+233249999999', 'atu', '200', 'email', '123456', 'pending', 'real@student.ug.edu.gh', 'Hall B');
    dbh.prepare(
      'INSERT INTO verification_documents (id, verificationId, fileName, cloudinaryPublicId, mimeType) VALUES (?, ?, ?, ?, ?)',
    ).run(`vd_${u.id}`, `sv_${u.id}`, 'id.png', 'jertscart/verifications/id.png', 'image/png');
    dbh.prepare('INSERT INTO newsletter_subscribers (id, email) VALUES (?, ?)').run(`nl_${u.id}`, u.email);
    dbh.prepare('INSERT INTO search_history (id, user, query) VALUES (?, ?, ?)').run(`sh_${u.id}`, u.id, 'shoes');
    dbh.prepare('INSERT INTO notifications (id, user, title, message) VALUES (?, ?, ?, ?)').run(`nt_${u.id}`, u.id, 'Hi', 'There');
    dbh.prepare('INSERT INTO conversations (id, createdBy) VALUES (?, ?)').run(`cv_${u.id}`, u.id);
    dbh.prepare('INSERT INTO messages (id, conversationId, sender, receiver, content) VALUES (?, ?, ?, ?, ?)').run(`msg_${u.id}`, `cv_${u.id}`, u.id, u.id, 'keep me');

    const ch = await makeDeleteChallenge(u.id);
    sendEmail.mockClear();
    destroyDocument.mockClear();

    const res = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', challengeId: ch.id, code: ch.code });
    expect(res.status).toBe(200);

    const user = dbh.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
    expect(user.isActive).toBe(0);
    expect(user.resetToken).toBeNull();
    expect(user.email).toBe(`deleted_${u.id}@anonymized.invalid`);

    // activity_logs PII scrubbed — target the signup row: the NEW
    // account_deleted audit row (inserted after the batch, details=
    // {by:'user'}) must NOT be picked by a bare LIMIT 1.
    const log = dbh.prepare(
      `SELECT userEmail, userName, ipAddress, userAgent, details FROM activity_logs
       WHERE user = ? AND action = 'signup' LIMIT 1`,
    ).get(u.id);
    expect(log).toBeTruthy();
    expect(log.userEmail).toBeNull();
    expect(log.ipAddress).toBeNull();
    expect(log.details).toBe('[redacted]');

    const ver = dbh.prepare('SELECT * FROM student_verifications WHERE userId = ?').get(u.id);
    expect(ver.studentId).toBe('redacted');
    expect(ver.email).toBe(`deleted_${u.id}@anonymized.invalid`);
    expect(ver.verificationCode).toBeNull();
    expect(ver.universityEmail).toBeNull();
    expect(ver.documentsPurgedAt).toBeTruthy();
    expect(dbh.prepare('SELECT COUNT(*) c FROM verification_documents').get().c).toBe(0);
    expect(destroyDocument).toHaveBeenCalledWith('jertscart/verifications/id.png', 'image/png');

    expect(dbh.prepare('SELECT COUNT(*) c FROM newsletter_subscribers').get().c).toBe(0);
    expect(dbh.prepare('SELECT COUNT(*) c FROM wishlists').get().c).toBe(0);
    expect(dbh.prepare('SELECT COUNT(*) c FROM search_history').get().c).toBe(0);
    expect(dbh.prepare('SELECT COUNT(*) c FROM notifications').get().c).toBe(0);

    // Survivors
    expect(dbh.prepare('SELECT COUNT(*) c FROM messages').get().c).toBe(1);
    expect(dbh.prepare('SELECT COUNT(*) c FROM consent_records WHERE userId = ?').get(u.id).c).toBeGreaterThanOrEqual(1);

    // Receipt to the OLD address, success irrelevant.
    expect(sendEmail).toHaveBeenCalled();
    expect(sendEmail.mock.calls[0][0]).toBe(u.email);
  });

  test('products flip to inactive (except sold)', async () => {
    const u = await registerUser();
    const dbh = getDb();
    const mk = (id, status) => dbh.prepare(
      `INSERT INTO products (id, title, description, price, category, condition, seller, sellerName, university, status)
       VALUES (?, 'P', 'D', 10, 'electronics', 'good', ?, 'S', 'atu', ?)`,
    ).run(id, u.id, status);
    mk('pr_active', 'active');
    mk('pr_sold', 'sold');

    // Password factor (this user is NOT google-linked — a challengeId would
    // bounce with requiredFactor:password).
    const res = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', password: u.password });
    expect(res.status).toBe(200);
    expect(dbh.prepare('SELECT status FROM products WHERE id = ?').get('pr_active').status).toBe('inactive');
    expect(dbh.prepare('SELECT status FROM products WHERE id = ?').get('pr_sold').status).toBe('sold');
  });

  test('atomicity: forced UNIQUE failure rolls back the whole scrub', async () => {
    const u = await registerUser();
    setGoogleId(u.id);
    const dbh = getDb();
    const wlProduct = seedProduct(u.id, 'atom');
    dbh.prepare('INSERT INTO wishlists (id, user, product) VALUES (?, ?, ?)').run(`wl_a_${u.id}`, u.id, wlProduct);
    // Plant the row the shell email would collide with (users.email UNIQUE).
    dbh.prepare(
      'INSERT INTO users (id, fullName, email, phone, university, password) VALUES (?, ?, ?, ?, ?, ?)',
    ).run('planter', 'Planter', `deleted_${u.id}@anonymized.invalid`, '+233240000009', 'atu', 'x');

    const ch = await makeDeleteChallenge(u.id);
    const res = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', challengeId: ch.id, code: ch.code });
    // errorHandler.js:112 maps 'UNIQUE constraint failed' → 400 (not 500).
    expect(res.status).toBe(400);

    const user = dbh.prepare('SELECT fullName, isActive FROM users WHERE id = ?').get(u.id);
    expect(user.isActive).toBe(1);
    expect(user.fullName).not.toBe('Deleted User');
    expect(dbh.prepare('SELECT COUNT(*) c FROM wishlists WHERE user = ?').get(u.id).c).toBe(1);
  });

  test('receipt email failure never fails the delete', async () => {
    const u = await registerUser();
    setGoogleId(u.id);
    sendEmail.mockRejectedValueOnce(new Error('smtp down'));
    const ch = await makeDeleteChallenge(u.id);
    const res = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ confirmText: 'DELETE', challengeId: ch.id, code: ch.code });
    expect(res.status).toBe(200);
    expect(getDb().prepare('SELECT isActive FROM users WHERE id = ?').get(u.id).isActive).toBe(0);
  });
});

describe('deletion preflight + OTP endpoints', () => {
  // Shared require-cache instance of the mounted router — its otpStore is
  // the live limiter store. resetAll between tests or the 3/15min counter
  // accumulates (rate-limit test would poison the OTP tests that follow).
  const { otpStore } = require('../routes/user.routes');
  // Guarded: at Step 1 (routes not yet written) otpStore is undefined and
  // tests must fail with 404, not a TypeError.
  beforeEach(async () => {
    if (otpStore) { await otpStore.resetAll(); }
  });

  test('GET /users/me/deletion-blockers → 200 clear / 200 with list when blocked', async () => {
    const u = await registerUser();
    const clear = await request(app).get('/api/users/me/deletion-blockers')
      .set('Authorization', `Bearer ${u.token}`);
    expect(clear.status).toBe(200);
    expect(clear.body.blockers).toEqual([]);

    seedLedger(u.id, 10, 'released');
    const blocked = await request(app).get('/api/users/me/deletion-blockers')
      .set('Authorization', `Bearer ${u.token}`);
    expect(blocked.status).toBe(200);
    expect(blocked.body.blockers[0].type).toBe('balance');
  });

  test('requires authentication', async () => {
    expect((await request(app).get('/api/users/me/deletion-blockers')).status).toBe(401);
  });

  test('google-linked POST deletion-otp → challengeId + devCode(test); pure-email → requiredFactor password', async () => {
    const g = await registerUser();
    setGoogleId(g.id);
    const otp = await requestOtp(g.token);
    expect(otp.status).toBe(200);
    expect(otp.body.challengeId).toBeDefined();
    expect(otp.body.expiresInSeconds).toBe(300);
    expect(otp.body.devCode).toMatch(/^\d{6}$/);
    expect(otp.body.code).toBeUndefined(); // raw code never in responses

    const p = await registerUser();
    const res = await requestOtp(p.token);
    expect(res.status).toBe(400);
    expect(res.body.requiredFactor).toBe('password');
  });

  test('devCode absent when NODE_ENV is not test; 502 when send fails outside test', async () => {
    const g = await registerUser();
    setGoogleId(g.id);
    const prev = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      sendEmail.mockResolvedValueOnce({ success: true });
      const ok = await requestOtp(g.token);
      expect(ok.status).toBe(200);
      expect(ok.body.devCode).toBeUndefined();

      sendEmail.mockResolvedValueOnce({ success: false, error: 'no transport' });
      const fail = await requestOtp(g.token);
      expect(fail.status).toBe(502);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  test('rate limit: 4th send in window → 429 with retryAfterSeconds', async () => {
    const g = await registerUser();
    setGoogleId(g.id);
    for (let i = 0; i < 3; i++) {
      const r = await requestOtp(g.token);
      expect(r.status).toBe(200);
    }
    const limited = await requestOtp(g.token);
    expect(limited.status).toBe(429);
    expect(limited.body.retryAfterSeconds).toBeGreaterThan(0);
  });

  test('purpose confusion across endpoints: deletion challenge rejected at /auth/mfa/verify', async () => {
    const g = await registerUser();
    setGoogleId(g.id);
    const otp = await requestOtp(g.token);
    const verify = await request(app).post('/api/auth/mfa/verify')
      .send({ challengeId: otp.body.challengeId, code: otp.body.devCode });
    expect(verify.status).toBe(401);
    expect(verify.body.token).toBeUndefined();
  });
});
