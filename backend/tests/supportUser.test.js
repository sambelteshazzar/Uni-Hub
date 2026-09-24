/**
 * User-facing support endpoints (spec 2026-09-24 §API).
 * Logged-in users only; tickets are private; IDOR returns 404 (not 403);
 * rate limits are enforced per user with an exported MemoryStore so
 * tests can reset them deterministically.
 */
jest.mock('../utils/emailService', () => {
  const actual = jest.requireActual('../utils/emailService');
  return { ...actual, sendEmail: jest.fn(async () => ({ success: true })) };
});

const request = require('supertest');
const { createTestApp } = require('./test-server');
const { db } = require('../utils/db');
const supportRoutes = require('../routes/support.routes');
const { getDb } = require('../config/database');
const { sendEmail } = require('../utils/emailService');

const app = createTestApp();

async function registerUser (role) {
  const suffix = `${role}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const res = await request(app).post('/api/auth/register').send({
    fullName: `Support ${role} ${suffix}`,
    email: `${suffix}@test.com`,
    phone: `+23324${String(1000000 + Math.floor(Math.random() * 8999999))}`,
    password: 'Student123!',
    university: 'atu',
    level: '200',
    acceptedTerms: true,
  });
  expect(res.status).toBe(201);
  if (role && role !== 'buyer') {
    getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run(role, res.body.data.user._id);
  }
  return { token: res.body.data.token, id: res.body.data.user._id, email: res.body.data.user.email };
}

function validTicket (overrides = {}) {
  return {
    category: 'payment',
    subject: 'Payment failed but money left my wallet',
    message: 'I paid with MoMo and the order is still pending.',
    ...overrides,
  };
}

describe('User support tickets API', () => {
  beforeEach(async () => {
    await supportRoutes.ticketStore.resetAll();
    await supportRoutes.replyStore.resetAll();
    sendEmail.mockClear();
  });

  test('POST /api/support/tickets requires authentication', async () => {
    const res = await request(app).post('/api/support/tickets').send(validTicket());
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/not authorized/i);
  });

  test('POST /api/support/tickets creates a ticket with a first reply', async () => {
    const user = await registerUser('buyer');
    const res = await request(app)
      .post('/api/support/tickets')
      .set('Authorization', `Bearer ${user.token}`)
      .send(validTicket());

    expect(res.status).toBe(201);
    expect(res.body.data.ticket.status).toBe('open');
    expect(res.body.data.ticket.category).toBe('payment');
    expect(res.body.data.ticket.userId).toBe(user.id);
    // Best-effort confirmation email to the creator (spec §2).
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0]).toBe(user.email);

    const detail = await request(app)
      .get(`/api/support/tickets/${res.body.data.ticket._id}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.replies).toHaveLength(1);
    expect(detail.body.data.replies[0].authorRole).toBe('user');
    expect(detail.body.data.replies[0].body).toContain('MoMo');
  });

  test('POST /api/support/tickets validates input', async () => {
    const user = await registerUser('buyer');
    const cases = [
      { ...validTicket(), category: 'invalid' },
      { ...validTicket(), subject: '' },
      { ...validTicket(), subject: 'x'.repeat(201) },
      { ...validTicket(), message: '' },
      { ...validTicket(), message: 'x'.repeat(5001) },
    ];
    for (const body of cases) {
      const res = await request(app)
        .post('/api/support/tickets')
        .set('Authorization', `Bearer ${user.token}`)
        .send(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required|characters|valid/i);
    }
  });

  test('GET /api/support/tickets returns only the caller tickets', async () => {
    const alice = await registerUser('buyer');
    const bob = await registerUser('buyer');

    await request(app)
      .post('/api/support/tickets')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(validTicket({ subject: 'Alice ticket' }));
    await request(app)
      .post('/api/support/tickets')
      .set('Authorization', `Bearer ${bob.token}`)
      .send(validTicket({ subject: 'Bob ticket' }));

    const res = await request(app)
      .get('/api/support/tickets')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.tickets).toHaveLength(1);
    expect(res.body.data.tickets[0].subject).toBe('Alice ticket');
  });

  test('GET /api/support/tickets/:id hides tickets from other users (404, not 403)', async () => {
    const alice = await registerUser('buyer');
    const bob = await registerUser('buyer');
    const created = await request(app)
      .post('/api/support/tickets')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(validTicket());

    const res = await request(app)
      .get(`/api/support/tickets/${created.body.data.ticket._id}`)
      .set('Authorization', `Bearer ${bob.token}`);
    expect(res.status).toBe(404);
  });

  test('GET /api/support/tickets/:id rejects malformed ids with 400', async () => {
    const user = await registerUser('buyer');
    const res = await request(app)
      .get('/api/support/tickets/not-a-real-objectid')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(400);
  });

  test('GET /api/support/tickets/:id returns 404 for unknown id', async () => {
    const user = await registerUser('buyer');
    const res = await request(app)
      .get('/api/support/tickets/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(404);
  });

  test('POST /api/support/tickets/:id/replies reopens a resolved ticket', async () => {
    const user = await registerUser('buyer');
    const created = await request(app)
      .post('/api/support/tickets')
      .set('Authorization', `Bearer ${user.token}`)
      .send(validTicket());
    const ticketId = created.body.data.ticket._id;

    await db('support_tickets').updateById(ticketId, { status: 'resolved' });

    const res = await request(app)
      .post(`/api/support/tickets/${ticketId}/replies`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ message: 'Any update on this please?' });

    expect(res.status).toBe(201);
    expect(res.body.data.ticket.status).toBe('open');
    expect(res.body.data.reply.authorRole).toBe('user');

    const detail = await request(app)
      .get(`/api/support/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(detail.body.data.replies).toHaveLength(2);
  });

  test('reply endpoint validates body length and rejects IDOR with 404', async () => {
    const alice = await registerUser('buyer');
    const bob = await registerUser('buyer');
    const created = await request(app)
      .post('/api/support/tickets')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(validTicket());
    const ticketId = created.body.data.ticket._id;

    const bad = await request(app)
      .post(`/api/support/tickets/${ticketId}/replies`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ message: '' });
    expect(bad.status).toBe(400);

    const tooLong = await request(app)
      .post(`/api/support/tickets/${ticketId}/replies`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ message: 'x'.repeat(5001) });
    expect(tooLong.status).toBe(400);

    const idor = await request(app)
      .post(`/api/support/tickets/${ticketId}/replies`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ message: 'let me in' });
    expect(idor.status).toBe(404);
  });

  test('creating tickets is rate limited to 5/hour per user', async () => {
    const user = await registerUser('buyer');
    for (let i = 0; i < 5; i++) {
      const ok = await request(app)
        .post('/api/support/tickets')
        .set('Authorization', `Bearer ${user.token}`)
        .send(validTicket({ subject: `Ticket ${i}` }));
      expect(ok.status).toBe(201);
    }
    const limited = await request(app)
      .post('/api/support/tickets')
      .set('Authorization', `Bearer ${user.token}`)
      .send(validTicket({ subject: 'One too many' }));
    expect(limited.status).toBe(429);
    expect(limited.body.error).toMatch(/too many requests/i);
    expect(typeof limited.body.retryAfterSeconds).toBe('number');
  });
});
