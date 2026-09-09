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
    email: `${role}_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
  };
  const res = await request(app).post('/api/auth/register').send(user);
  const id = res.body.data.user._id;
  if (role !== 'buyer') {
    const { getDb } = require('../config/database');
    getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  }
  return { token: res.body.data.token, id, email: user.email };
}

const getAuditRows = async () => {
  const { getDb } = require('../config/database');
  return getDb().prepare('SELECT * FROM activity_logs ORDER BY rowid DESC').all();
};

// Controllers write curated rows via utils/logActivity.js on SUCCESS; the
// audit middleware additionally writes raw-attempt rows (incl. failures).
// Middleware rows never carry the controller's targetUserId field.
const flush = () => new Promise(resolve => setTimeout(resolve, 100));
const isMiddlewareRow = r => r.details && !r.details.includes('targetUserId');

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
    await flush();

    const banRows = (await getAuditRows()).filter(r => r.action === 'admin_ban');
    // Curated success row from the controller...
    const curated = banRows.find(r => !isMiddlewareRow(r));
    expect(curated).toBeDefined();
    expect(curated.userEmail).toMatch(/@test\.com$/);
    expect(curated.userRole).toBe('admin');
    expect(curated.severity).toBe('critical');
    expect(curated.ipAddress).toBeDefined();
    // ...plus the middleware's raw-attempt row.
    const audited = banRows.find(isMiddlewareRow);
    expect(audited).toBeDefined();
    expect(audited.userRole).toBe('admin');
    expect(audited.ipAddress).toBeDefined();
  });

  it('logs failed authorization attempts too', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${targetUserId}/ban`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'ban', reason: 'no' }); // reason < 5 chars -> 400
    expect(res.status).toBe(400);
    await flush();

    // The controller never reached its logging line — only the middleware
    // captured this attempt.
    const failedRows = (await getAuditRows())
      .filter(r => r.action === 'admin_ban')
      .filter(isMiddlewareRow);
    expect(failedRows.length).toBe(1);
    expect(failedRows[0].severity).toBe('warning');
  });

  it('redacts sensitive body fields in details', async () => {
    await request(app)
      .put(`/api/admin/users/${targetUserId}/ban`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'ban', reason: 'test reason here', password: 'super-secret-123' });
    await flush();

    const audited = (await getAuditRows())
      .filter(r => r.action === 'admin_ban')
      .filter(isMiddlewareRow);
    expect(audited.length).toBeGreaterThan(0);
    for (const row of audited) {
      expect(row.details).not.toContain('super-secret-123');
      expect(row.details).toContain('password_redacted');
    }
  });

  it('does not log GET requests', async () => {
    await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    await flush();
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
