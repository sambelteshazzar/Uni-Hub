/**
 * Test Setup File
 * Configure test environment with in-memory MongoDB
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing-only';

let mongod = null;

// Global test utilities
global.testUtils = {
  // Generate random test user
  generateTestUser: () => ({
    fullName: `Test User ${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'TestPass123!',
    phone: '+233501234567',
    university: 'University of Ghana',
    level: '300',
    role: 'buyer',
  }),

  // Generate random test product
  generateTestProduct: (sellerId) => ({
    title: `Test Product ${Date.now()}`,
    description: 'A test product for automated testing',
    price: 100,
    category: 'electronics',
    condition: 'good',
    university: 'University of Ghana',
    seller: sellerId || 'test-seller-id',
    images: ['https://example.com/test-image.jpg'],
  }),
};

// Start in-memory MongoDB and connect before all tests
beforeAll(async () => {
  try {
    // Create in-memory MongoDB instance
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();

    // Set the connection string
    process.env.MONGODB_URI = mongoUri;

    // Connect Mongoose to the in-memory database
    await mongoose.connect(mongoUri);

    console.log('✅ Connected to in-memory MongoDB');
  } catch (error) {
    console.error('❌ Failed to start in-memory MongoDB:', error);
    throw error;
  }
}, 30000); // 30 second timeout

// Clear collections after each test
afterEach(async () => {
  if (mongoose.connection.readyState === 1) { // Connected
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});

// Disconnect and stop in-memory MongoDB after all tests
afterAll(async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('✅ Disconnected from MongoDB');
    }
    if (mongod) {
      await mongod.stop();
      console.log('✅ In-memory MongoDB stopped');
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}, 30000); // 30 second timeout

console.log('✅ Test environment configured');
