/**
 * Test Setup File
 * Configure test environment with in-memory SQLite
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing-only';
process.env.SQLITE_PATH = ':memory:';

const { connectDatabase, getDb } = require('../config/database');

global.testUtils = {
  generateTestUser: () => ({
    fullName: `Test User ${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'TestPass123!',
    phone: `+233${String(Math.floor(Math.random() * 900000000) + 100000000)}`,
    university: 'University of Ghana',
    level: '300',
    role: 'buyer',
    acceptedTerms: true,
  }),

  generateTestProduct: (creatorId) => ({
    title: `Test Product ${Date.now()}`,
    description: 'A test product for automated testing',
    price: 100,
    category: 'electronics',
    condition: 'good',
    university: 'University of Ghana',
    seller: creatorId || 'test-creator-id',
    images: ['https://example.com/test-image.jpg'],
  }),
};

beforeAll(async () => {
  try {
    await connectDatabase();
    console.log('✅ Connected to in-memory SQLite');
  } catch (error) {
    console.error('❌ Failed to connect to SQLite:', error);
    throw error;
  }
});

afterEach(() => {
  try {
    const database = getDb();
    const tables = [
      // consent_records references users(id); clear it first or the FK
      // constraint aborts this loop before users gets cleared.
      'consent_records',
      'delivery_status_history', 'order_status_history', 'order_items',
      'verification_documents', 'message_deleted_by', 'conversation_participants',
      'search_history', 'activity_logs', 'wishlists', 'notifications',
      'idempotency_keys', 'ledger_entries', 'payouts', 'admin_mfa_challenges',
      'messages', 'conversations', 'deliveries', 'payments', 'reviews',
      'orders', 'products', 'student_verifications', 'users',
    ];
    for (const table of tables) {
      database.exec(`DELETE FROM ${table}`);
    }
  } catch (error) {
    console.error('❌ Error clearing tables:', error);
  }
});

console.log('✅ Test environment configured');
