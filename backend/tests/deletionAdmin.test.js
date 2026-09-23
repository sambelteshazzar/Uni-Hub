/**
 * Admin-side deletion (spec 2026-09-22 §4): reason guards, gate bypass,
 * shared scrub, audit — Ban remains the reversible moderation tool.
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

jest.mock('../utils/emailService', () => {
  const actual = jest.requireActual('../utils/emailService');
  return { ...actual, sendEmail: jest.fn(async () => ({ success: true })) };
});

const app = createTestApp();
const { getDb } = require('../config/database');
const { sendEmail } = require('../utils/emailService');

beforeEach(() => {
  sendEmail.mockReset();
  sendEmail.mockResolvedValue({ success: true });
});

async function registerUser (prefix = 'adm') {
  const res = await request(app).post('/api/auth/register').send({
    ...global.testUtils.generateTestUser(),
    email: `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
  });
  return { token: res.body.data.token, id: res.body.data.user._id, email: res.body.data.user.email };
}

const promote = (id, role) =>
  getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);

describe('admin DELETE /users/:id', () => {
  test('missing/short reason → 400; unknown id → 404; non-admin → 403', async () => {
    const admin = await registerUser(); promote(admin.id, 'admin');
    const victim = await registerUser();

    const noReason = await request(app).delete(`/api/users/${victim.id}`)
      .set('Authorization', `Bearer ${admin.token}`).send({});
    expect(noReason.status).toBe(400);

    const short = await request(app).delete(`/api/users/${victim.id}`)
      .set('Authorization', `Bearer ${admin.token}`).send({ reason: 'ab' });
    expect(short.status).toBe(400);

    const unknown = await request(app).delete('/api/users/nope-id')
      .set('Authorization', `Bearer ${admin.token}`).send({ reason: 'valid reason' });
    expect(unknown.status).toBe(404);

    const buyer = await registerUser();
    const forbidden = await request(app).delete(`/api/users/${victim.id}`)
      .set('Authorization', `Bearer ${buyer.token}`).send({ reason: 'valid reason' });
    expect(forbidden.status).toBe(403);
  });

  test('cannot delete self, an admin, or a moderator', async () => {
    const admin = await registerUser(); promote(admin.id, 'admin');
    const otherAdmin = await registerUser(); promote(otherAdmin.id, 'admin');
    const mod = await registerUser(); promote(mod.id, 'moderator');

    const self = await request(app).delete(`/api/users/${admin.id}`)
      .set('Authorization', `Bearer ${admin.token}`).send({ reason: 'valid reason' });
    expect(self.status).toBe(403);

    const peer = await request(app).delete(`/api/users/${otherAdmin.id}`)
      .set('Authorization', `Bearer ${admin.token}`).send({ reason: 'valid reason' });
    expect(peer.status).toBe(403);

    const targetMod = await request(app).delete(`/api/users/${mod.id}`)
      .set('Authorization', `Bearer ${admin.token}`).send({ reason: 'valid reason' });
    expect(targetMod.status).toBe(403);
  });

  test('bypasses obligations gate, runs shared scrub, writes audit with reason', async () => {
    const admin = await registerUser(); promote(admin.id, 'admin');
    const seller = await registerUser();
    // Escrowed money — would 409 on the self path.
    getDb().prepare(
      'INSERT INTO ledger_entries (id, sellerId, type, amount, status) VALUES (?, ?, ?, ?, ?)',
    ).run(`led_${Date.now()}`, seller.id, 'sale', 99, 'escrowed');

    const res = await request(app).delete(`/api/users/${seller.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ reason: 'spam account harassment' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);

    const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(seller.id);
    expect(row.isActive).toBe(0);
    expect(row.email).toBe(`deleted_${seller.id}@anonymized.invalid`);
    expect(row.banReason).toBe('deleted by admin: spam account harassment');

    const audit = getDb().prepare(
      `SELECT details FROM activity_logs WHERE action = 'account_deleted' AND user = ? ORDER BY createdAt DESC LIMIT 1`,
    ).get(seller.id);
    expect(audit).toBeTruthy();
    const details = JSON.parse(audit.details);
    expect(details.by).toBe('admin');
    expect(details.actorId).toBe(admin.id);
    expect(details.reason).toBe('spam account harassment');
    // logActivity(action, user, details, severity, req) — the ADMIN's req
    // fills ipAddress; userEmail/userName are explicitly '[redacted]' for
    // account_deleted (see logActivity.js). Assert redaction, not nulls.
    const full = getDb().prepare(
      'SELECT userEmail, userName, ipAddress FROM activity_logs WHERE action = ? AND user = ?',
    ).get('account_deleted', seller.id);
    expect(full.userEmail).toBe('[redacted]');
    expect(full.userName).toBe('[redacted]');
    expect(full.userEmail).not.toBe(seller.email);
    expect(full.ipAddress).not.toBe(seller.email);
  });

  test('already-deleted shell → 404; banned-but-live user remains deletable', async () => {
    const admin = await registerUser(); promote(admin.id, 'admin');
    const shell = await registerUser();
    await request(app).delete(`/api/users/${shell.id}`)
      .set('Authorization', `Bearer ${admin.token}`).send({ reason: 'first delete reason' });
    const again = await request(app).delete(`/api/users/${shell.id}`)
      .set('Authorization', `Bearer ${admin.token}`).send({ reason: 'second delete reason' });
    expect(again.status).toBe(404);

    const banned = await registerUser();
    getDb().prepare('UPDATE users SET isSuspended = 1, banReason = ? WHERE id = ?')
      .run('abuse', banned.id);
    const del = await request(app).delete(`/api/users/${banned.id}`)
      .set('Authorization', `Bearer ${admin.token}`).send({ reason: 'abuse plus delete' });
    expect(del.status).toBe(200);
  });
});

describe('admin GET /users/:id/deletion-blockers', () => {
  test('returns target blockers for admin; 404 unknown; 403 non-admin', async () => {
    const admin = await registerUser(); promote(admin.id, 'admin');
    const seller = await registerUser();
    getDb().prepare(
      'INSERT INTO payouts (id, sellerId, amount, method, destination, status) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(`p_${Date.now()}`, seller.id, 30, 'momo', '024', 'requested');

    const ok = await request(app).get(`/api/users/${seller.id}/deletion-blockers`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(ok.status).toBe(200);
    expect(ok.body.blockers.map(b => b.type)).toContain('payout');

    expect((await request(app).get('/api/users/ghost/deletion-blockers')
      .set('Authorization', `Bearer ${admin.token}`)).status).toBe(404);

    const buyer = await registerUser();
    expect((await request(app).get(`/api/users/${seller.id}/deletion-blockers`)
      .set('Authorization', `Bearer ${buyer.token}`)).status).toBe(403);
  });
});
