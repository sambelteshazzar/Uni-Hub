/**
 * Approval-link recipient bug: approve emailed users.email (the account /
 * registration address) while the form requirement, its controller comment
 * ("personal email … because the magic-link approval confirmation is sent
 * there"), and the status-page copy ("sent … to your personal email") all
 * promise the address submitted on the verification form. A user who
 * registered with one address (e.g. Gmail) and typed another on the form
 * checked the wrong inbox — reported live after the Brevo pipeline fix.
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

jest.mock('../utils/emailService', () => ({
  ...jest.requireActual('../utils/emailService'),
  sendApprovalLinkEmail: jest.fn(async () => ({ success: true })),
}));

const { sendApprovalLinkEmail } = require('../utils/emailService');
const app = createTestApp();

const setRole = (userId, role) => {
  const { getDb } = require('../config/database');
  getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
};

async function registerUser (prefix, accountEmail) {
  const res = await request(app).post('/api/auth/register').send({
    ...global.testUtils.generateTestUser(),
    email: accountEmail || `${prefix}_${Date.now()}@test.com`,
  });
  return { token: res.body.data.token, id: res.body.data.user._id };
}

describe('approve sends the confirmation link to the form personal email', () => {
  beforeEach(() => {
    sendApprovalLinkEmail.mockClear();
  });

  test('recipient is verification.email even when it differs from the account email', async () => {
    const accountEmail = `acct_${Date.now()}@registered.test`;
    const personalEmail = `personal_${Date.now()}@gmail.test`;
    const buyer = await registerUser('apprc', accountEmail);
    const reviewer = await registerUser('appradm');
    setRole(reviewer.id, 'admin');

    const sub = await request(app)
      .post('/api/verification')
      .set('Authorization', `Bearer ${buyer.token}`)
      .field('studentId', `209${Date.now().toString().slice(-7)}`)
      .field('fullName', 'Recipient Check')
      .field('email', personalEmail)
      .field('phone', '+233203000001')
      .field('university', 'atu')
      .field('level', '300')
      .field('verificationMethod', 'document');
    expect(sub.status).toBe(201);
    const vid = sub.body.data.id || sub.body.data._id;

    const appr = await request(app)
      .put(`/api/verification/${vid}/approve`)
      .set('Authorization', `Bearer ${reviewer.token}`)
      .send({ notes: 'ok' });
    expect(appr.status).toBe(200);
    expect(appr.body.message).toMatch(/emailed/i);

    expect(sendApprovalLinkEmail).toHaveBeenCalled();
    const recipient = sendApprovalLinkEmail.mock.calls.at(-1)[0];
    expect(recipient).toBe(personalEmail);
    expect(recipient).not.toBe(accountEmail);
  });
});
