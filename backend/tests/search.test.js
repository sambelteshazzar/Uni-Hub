/**
 * Search API Tests
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

describe('Search API', () => {
  let app;
  let authToken;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(async () => {
    const testUser = global.testUtils.generateTestUser();
    const registerRes = await request(app).post('/api/auth/register').send(testUser);
    authToken = registerRes.body.data.token;
  });

  describe('GET /api/search', () => {
    it('should return search results with query', async () => {
      const res = await request(app)
        .get('/api/search?query=laptop')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('results');
    });

    it('should return results even without query parameter', async () => {
      const res = await request(app)
        .get('/api/search')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/search/suggestions', () => {
    it('should return suggestions for a prefix', async () => {
      const res = await request(app)
        .get('/api/search/suggestions?q=lap')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/search/trending', () => {
    it('should return trending searches', async () => {
      const res = await request(app)
        .get('/api/search/trending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/search/history', () => {
    it('should return search history for user', async () => {
      const res = await request(app)
        .get('/api/search/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/search/history');
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/search/history', () => {
    it('should clear search history', async () => {
      const res = await request(app)
        .delete('/api/search/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
