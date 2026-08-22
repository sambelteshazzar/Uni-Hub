/**
 * RBAC Tests
 * Verifies the role tier matrix (backend/config/roles.js):
 * moderators read admin data and moderate products/verifications;
 * bans, product writes and refunds stay admin-only; buyers stay out.
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

const app = createTestApp();

async function registerUser (emailPrefix) {
  const user = {
    ...global.testUtils.generateTestUser(),
    email: `${emailPrefix}_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
  };
  const res = await request(app).post('/api/auth/register').send(user);
  return {
    token: res.body.data.token,
    id: res.body.data.user._id,
    email: user.email,
    role: () => {
      const { getDb } = require('../config/database');
      return getDb().prepare('SELECT role FROM users WHERE id = ?').get(res.body.data.user._id).role;
    },
  };
}

const setRole = (userId, role) => {
  const { getDb } = require('../config/database');
  getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
};

async function createVerifiedSellerWithProduct (token, userId) {
  const { getDb } = require('../config/database');
  getDb().prepare('UPDATE users SET isVerified = 1 WHERE id = ?').run(userId);
  const productRes = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${token}`)
    .send(global.testUtils.generateTestProduct(userId));
  return productRes.body.data.id || productRes.body.data._id;
}

describe('RBAC — moderator tier', () => {
  let admin;
  let moderator;

  beforeEach(async () => {
    admin = await registerUser('rbacadmin');
    setRole(admin.id, 'admin');
    moderator = await registerUser('rbacmod');
    setRole(moderator.id, 'moderator');
  });

  it('allows moderators to read dashboard stats and products', async () => {
    const stats = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${moderator.token}`);
    expect(stats.status).toBe(200);

    const products = await request(app)
      .get('/api/admin/products')
      .set('Authorization', `Bearer ${moderator.token}`);
    expect(products.status).toBe(200);
  });

  it('allows moderators to moderate products', async () => {
    const seller = await registerUser('rbacseller');
    const productId = await createVerifiedSellerWithProduct(seller.token, seller.id);

    const approveRes = await request(app)
      .put(`/api/admin/products/${productId}/approve`)
      .set('Authorization', `Bearer ${moderator.token}`);
    expect(approveRes.status).toBe(200);

    const rejectRes = await request(app)
      .put(`/api/admin/products/${productId}/reject`)
      .set('Authorization', `Bearer ${moderator.token}`)
      .send({ reason: 'duplicate listing' });
    expect(rejectRes.status).toBe(200);
  });

  it('denies moderators bans, product deletion and creation', async () => {
    const victim = await registerUser('rbacvictim');

    const banRes = await request(app)
      .put(`/api/admin/users/${victim.id}/ban`)
      .set('Authorization', `Bearer ${moderator.token}`)
      .send({ action: 'ban', reason: 'should not be allowed' });
    expect(banRes.status).toBe(403);

    const seller = await registerUser('rbacseller2');
    const productId = await createVerifiedSellerWithProduct(seller.token, seller.id);

    const deleteRes = await request(app)
      .delete(`/api/admin/products/${productId}`)
      .set('Authorization', `Bearer ${moderator.token}`);
    expect(deleteRes.status).toBe(403);

    const createRes = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${moderator.token}`)
      .send(global.testUtils.generateTestProduct(moderator.id));
    expect(createRes.status).toBe(403);
  });

  it('still keeps buyers out of every admin route', async () => {
    const buyer = await registerUser('rbacbuyer');

    const statsRes = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${buyer.token}`);
    expect(statsRes.status).toBe(403);

    const approveRes = await request(app)
      .put('/api/admin/products/70b7d92b-303d-4ab3-bb36-d89e53b291c6/approve')
      .set('Authorization', `Bearer ${buyer.token}`);
    expect(approveRes.status).toBe(403);
  });

  it('audits moderator actions with their real role', async () => {
    const seller = await registerUser('rbacseller3');
    const productId = await createVerifiedSellerWithProduct(seller.token, seller.id);

    await request(app)
      .put(`/api/admin/products/${productId}/approve`)
      .set('Authorization', `Bearer ${moderator.token}`);

    // Curated success log comes from the controller via utils/logActivity.
    const { getDb } = require('../config/database');
    const row = getDb()
      .prepare('SELECT * FROM activity_logs WHERE action = \'admin_approve\' ORDER BY rowid DESC LIMIT 1')
      .get();
    expect(row.userRole).toBe('moderator');
    expect(row.userEmail).toBe(moderator.email);
  });
});
