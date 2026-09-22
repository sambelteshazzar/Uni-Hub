/**
 * Logout route tests.
 *
 * The frontend has always POSTed /api/auth/logout (fire-and-forget with a
 * CSRF token), but no backend route existed — every logout hit Express's
 * 404 handler. JWT sessions are stateless, so the route only needs to
 * acknowledge the request; it must NOT require a valid bearer token
 * (an expired/absent token would turn a legitimate logout into a failure
 * the UI reports as an error).
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

const app = createTestApp();

describe('POST /api/auth/logout', () => {
  test('acknowledges logout with 200 (no session required — stateless JWT)', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/logged out/i);
  });

  test('acknowledges logout even with an expired/garbage bearer token', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
