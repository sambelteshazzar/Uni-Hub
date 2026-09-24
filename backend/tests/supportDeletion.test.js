/**
 * Support scrub on account deletion (spec 2026-09-24 §Data).
 * Deleting an account removes their tickets AND the reply threads on
 * them — no orphaned ticket bodies left in support_replies.
 */
jest.mock('../utils/emailService', () => {
  const actual = jest.requireActual('../utils/emailService');
  return { ...actual, sendEmail: jest.fn(async () => ({ success: true })) };
});

const request = require('supertest');
const { createTestApp } = require('./test-server');
const { db } = require('../utils/db');
const { getDb } = require('../config/database');

const app = createTestApp();

async function registerUser () {
  const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const password = 'SupportDel1!';
  const res = await request(app).post('/api/auth/register').send({
    fullName: `Support Del ${suffix}`,
    email: `support_del_${suffix}@test.com`,
    phone: `+23324${String(1000000 + Math.floor(Math.random() * 8999999))}`,
    password,
    university: 'atu',
    level: '200',
    acceptedTerms: true,
  });
  expect(res.status).toBe(201);
  return { token: res.body.data.token, id: res.body.data.user._id, password };
}

describe('Account deletion scrubs support tickets', () => {
  test('removes tickets and replies owned by the deleted user', async () => {
    const user = await registerUser();

    await db('support_tickets').create({
      id: 'del-tkt-1',
      userId: user.id,
      category: 'payment',
      subject: 'Payment not received',
      status: 'pending',
    });
    await db('support_replies').create({
      id: 'del-rep-1',
      ticketId: 'del-tkt-1',
      authorId: user.id,
      authorRole: 'user',
      body: 'Please help with my MoMo payment.',
    });
    await db('support_replies').create({
      id: 'del-rep-2',
      ticketId: 'del-tkt-1',
      authorId: user.id,
      authorRole: 'admin',
      body: 'We are checking with the provider.',
    });

    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ confirmText: 'DELETE', password: user.password });
    expect(res.status).toBe(200);

    const sql = getDb();
    expect(sql.prepare('SELECT * FROM support_tickets WHERE id = ?').get('del-tkt-1')).toBeUndefined();
    expect(
      sql.prepare('SELECT * FROM support_replies WHERE ticketId = ?').all('del-tkt-1')
    ).toHaveLength(0);
  });
});
