/**
 * Consent logging tests (spec 2026-08-23): provable terms/privacy consent
 * captured at account creation on both signup paths.
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

const app = createTestApp();

// Shared payload builder for the signup-consent cases appended in Task 2;
// not referenced yet, hence the suppression.
// eslint-disable-next-line no-unused-vars
async function registerViaApi (overrides = {}) {
  const suffix = Date.now() + Math.floor(Math.random() * 100000);
  const user = {
    fullName: `Consent User ${suffix}`,
    email: `consent_${suffix}@test.com`,
    phone: `+23320${String(1000000 + Math.floor(Math.random() * 8999999))}`,
    password: 'ConsentPass1!',
    university: 'University of Ghana',
    level: '200',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(user);
  return { res, user };
}

describe('consent schema', () => {
  test('consent_records table exists with expected columns', async () => {
    const { getDb } = require('../config/database');
    const cols = getDb().prepare('PRAGMA table_info(consent_records)').all().map(c => c.name);
    expect(cols).toEqual(expect.arrayContaining([
      'id', 'userId', 'documentType', 'policyVersion', 'method', 'ipAddress', 'createdAt',
    ]));
  });

  test('policies.js exports the current POLICY_VERSION', () => {
    const { POLICY_VERSION } = require('../config/policies');
    expect(POLICY_VERSION).toBe('2026-08-1');
  });
});
