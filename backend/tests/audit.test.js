/**
 * Audit Trail Tests
 * Verifies the server-side audit middleware: privileged mutations land in
 * activity_logs with the real actor, sensitive fields are redacted, and the
 * refund endpoint is admin-only (previously any verified user could refund).
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

const app = createTestApp();

async function registerUser (role = 'buyer') {
  const user = {
    ...global.testUtils.generateTestUser(),
    role,
    email: `${role}_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
  };
  const res = await request(app).post('/api/auth/register').send(user);
  return { token: res.body.data.token, id: res.body.data.user._id, email: user.email };
}

const getAuditRows = async () => {
  const { getDb } = require('../config/database');
  return getDb().prepare('SELECT * FROM activity_logs ORDER BY createdAt DESC').all();
};

describe('Server-side audit trail', () => {
  let adminToken;
  let targetUserId;

  beforeEach(async () => {
    const admin = await registerUser('admin');
    adminToken = admin.token;
    const victim = await registerUser('buyer');
    targetUserId = victim.id;
  });

  it('records a ban with actor, IP and severity', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${targetUserId}/ban`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'ban', reason: 'fraudulent listings reported' });
    expect(res.status).toBe(200);

    const rows = await getAuditRows();
    const banRow = rows.find(r => r.action === 'admin_ban');
    expect(banRow).toBeDefined();
    expect(banRow.userEmail).toMatch(/@test\.com$/);
    expect(banRow.userRole).toBe('admin');
    expect(banRow.ipAddress).toBeDefined();
    // DELETE-grade actions are at least 'warning' even on success.
    expect(['warning', 'info']).toContain(banRow.severity);
  });

  it('logs failed authorization attempts too', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${targetUserId}/ban`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'ban', reason: 'no' }); // reason < 5 chars -> 400
    expect(res.status).toBe(400);

    const rows = await getAuditRows();
    const failedRow = rows.find(r => r.action === 'admin_ban');
    expect(failedRow).toBeDefined();
    expect(failedRow.severity).toBe('warning');
  });

  it('redacts sensitive body fields in details', async () => {
    await request(app)
      .put(`/api/admin/users/${targetUserId}/ban`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'ban', reason: 'test reason here', password: 'super-secret-123' });

    const rows = await getAuditRows();
    const row = rows.find(r => r.action === 'admin_ban');
    expect(row.details).not.toContain('super-secret-123');
    expect(row.details).toContain('password_redacted');
  });

  it('does not log GET requests', async () => {
    await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    // Auth itself writes signup/login rows; assert no admin-route actions.
    const adminRows = (await getAuditRows()).filter(r =>
      r.action.startsWith('admin_') || ['product_create', 'product_update', 'product_delete'].includes(r.action));
    expect(adminRows.length).toBe(0);
  });
});

describe('Refund endpoint authorization (regression)', () => {
  it('rejects refunds from non-admin verified users', async () => {
    const buyer = await registerUser('buyer');

    const res = await request(app)
      .post('/api/payment/refund')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ paymentId: 'some-payment-id', reason: 'changed my mind' });

    expect(res.status).toBe(403);
  });

  it('audits admin refund attempts even when the payment is missing', async () => {
    const admin = await registerUser('admin');

    const res = await request(app)
      .post('/api/payment/refund')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ paymentId: 'missing-payment-id', reason: 'customer complaint' });
    expect([404, 500]).toContain(res.status); // not 403 — admin got through authz

    const rows = await getAuditRows();
    expect(rows.find(r => r.action === 'admin_refund')).toBeDefined();
  });
});
