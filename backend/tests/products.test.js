/**
 * Products API Tests
 * Tests for product CRUD operations and search
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');
const app = createTestApp();

describe('Products API', () => {
let authToken;
let creatorId;
let testProductId;
const testUser = global.testUtils.generateTestUser();
const adminUser = { ...global.testUtils.generateTestUser(), role: 'admin', email: `admin_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com` };

beforeEach(async () => {
const adminRes = await request(app)
.post('/api/auth/register')
.send(adminUser);

authToken = adminRes.body.data.token;
creatorId = adminRes.body.data.user._id;
});

  describe('POST /api/products', () => {
it('should create a new product', async () => {
const productData = global.testUtils.generateTestProduct(creatorId);

const res = await request(app)
.post('/api/admin/products')
.set('Authorization', `Bearer ${authToken}`)
.send(productData);

expect(res.status).toBe(201);
expect(res.body.success).toBe(true);
expect(res.body.data.title).toBe(productData.title);

testProductId = res.body.data._id;
});

it('should reject product creation without auth', async () => {
const productData = global.testUtils.generateTestProduct();

const res = await request(app)
.post('/api/admin/products')
.send(productData);

expect(res.status).toBe(401);
expect(res.body.success).toBe(false);
});

it('should validate required fields', async () => {
const res = await request(app)
.post('/api/admin/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Short',
          price: -100,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/products', () => {
  it('should get all products', async () => {
    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.products).toBeDefined();
    expect(Array.isArray(res.body.data.products)).toBe(true);
  });

  it('should filter products by category', async () => {
    const res = await request(app)
      .get('/api/products')
      .query({ category: 'electronics' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.products.every(p => p.category === 'electronics')).toBe(true);
  });

  it('should filter products by price range', async () => {
    const res = await request(app)
      .get('/api/products')
      .query({ minPrice: 0, maxPrice: 1000 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.products.every(p => p.price >= 0 && p.price <= 1000)).toBe(true);
  });

    it('should search products by title', async () => {
      const res = await request(app)
        .get('/api/products')
        .query({ search: 'laptop' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/products/:id', () => {
    let localProductId;

beforeEach(async () => {
const res = await request(app)
.post('/api/admin/products')
.set('Authorization', `Bearer ${authToken}`)
.send(global.testUtils.generateTestProduct(creatorId));
localProductId = res.body.data._id;
});

it('should get a single product by ID', async () => {
      const res = await request(app).get(`/api/products/${localProductId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id.toString()).toBe(localProductId);
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app).get('/api/products/507f1f77bcf86cd799439011');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should validate product ID format', async () => {
      const res = await request(app).get('/api/products/invalid-id');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/products/:id', () => {
    let localProductId;

beforeEach(async () => {
const res = await request(app)
.post('/api/admin/products')
.set('Authorization', `Bearer ${authToken}`)
.send(global.testUtils.generateTestProduct(creatorId));
localProductId = res.body.data._id;
});

it('should update own product', async () => {
const res = await request(app)
.put(`/api/admin/products/${localProductId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
          price: 999,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Title');
      expect(res.body.data.price).toBe(999);
    });

it('should reject update without auth', async () => {
const res = await request(app)
.put(`/api/admin/products/${localProductId}`)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

describe('DELETE /api/admin/products/:id', () => {
let localProductId;

beforeEach(async () => {
const res = await request(app)
.post('/api/admin/products')
.set('Authorization', `Bearer ${authToken}`)
.send(global.testUtils.generateTestProduct(creatorId));
localProductId = res.body.data._id;
});

it('should delete product as admin', async () => {
const res = await request(app)
.delete(`/api/admin/products/${localProductId}`)
.set('Authorization', `Bearer ${authToken}`);

expect(res.status).toBe(200);
expect(res.body.success).toBe(true);
});

it('should return 404 for deleted product', async () => {
await request(app)
.delete(`/api/admin/products/${localProductId}`)
.set('Authorization', `Bearer ${authToken}`);

const res = await request(app).get(`/api/products/${localProductId}`);

expect(res.status).toBe(404);
expect(res.body.success).toBe(false);
});
});

describe('Security Tests', () => {
it('should sanitize XSS in product title', async () => {
const xssProduct = {
...global.testUtils.generateTestProduct(creatorId),
title: '<script>alert("xss")</script>Laptop',
};

const res = await request(app)
.post('/api/admin/products')
.set('Authorization', `Bearer ${authToken}`)
.send(xssProduct);

expect(res.status).toBe(201);
expect(res.body.data.title).not.toContain('<script>');
});

it('should not expose creator password', async () => {
const product = global.testUtils.generateTestProduct(creatorId);
const res = await request(app)
.post('/api/admin/products')
.set('Authorization', `Bearer ${authToken}`)
.send(product);

const bodyStr = JSON.stringify(res.body);
expect(bodyStr).not.toContain(adminUser.password);
});
});
});
