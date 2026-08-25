/**
 * Consent logging tests (spec 2026-08-23): provable terms/privacy consent
 * captured at account creation on both signup paths.
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

const app = createTestApp();

// Shared payload builder for the signup-consent cases.
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

describe('email signup consent', () => {
  test('rejects registration without acceptedTerms and creates nothing', async () => {
    const { res } = await registerViaApi();
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/accept/i);

    const { getDb } = require('../config/database');
    const dbh = getDb();
    const users = dbh.prepare(
      'SELECT COUNT(*) AS n FROM users WHERE email LIKE ?',
    ).get('consent_%');
    expect(users.n).toBe(0);
  });

  test('records versioned consent on successful signup', async () => {
    const { res } = await registerViaApi({ acceptedTerms: true });
    expect(res.status).toBe(201);

    const { getDb } = require('../config/database');
    const dbh = getDb();
    const userId = res.body.data.user._id;
    const row = dbh.prepare(
      'SELECT policyVersion, method, ipAddress FROM consent_records WHERE userId = ?',
    ).get(userId);
    expect(row).toBeTruthy();
    expect(row.policyVersion).toBe('2026-08-1');
    expect(row.method).toBe('email_signup');
  });
});

describe('google path consent helper', () => {
  test('recordConsent writes a google-method row', async () => {
    // The Google OAuth flow cannot be driven end-to-end in jest without a
    // live token endpoint; exercise the shared helper directly instead.
    const controller = require('../controllers/auth.controller');
    expect(typeof controller.recordConsentForTesting).toBe('function');

    const { res } = await registerViaApi({ acceptedTerms: true });
    const userId = res.body.data.user._id;

    await controller.recordConsentForTesting(userId, 'google', '10.0.0.1');

    const { getDb } = require('../config/database');
    const rows = getDb().prepare(
      'SELECT policyVersion, method FROM consent_records WHERE userId = ? AND method = \'google\'',
    ).all(userId);
    expect(rows).toHaveLength(1);
    expect(rows[0].policyVersion).toBe('2026-08-1');
  });
});
