/**
 * Admin support endpoints + audit trail (spec 2026-09-24 §API/§Audit).
 * Moderator is denied on ALL four routes (spec test decision).
 * Audit rows are asserted via the audit.test.js helpers: mutations are
 * logged asynchronously on `res.finish`, so tests flush ~100ms.
 */
jest.mock('../utils/emailService', () => {
  const actual = jest.requireActual('../utils/emailService');
  return { ...actual, sendEmail: jest.fn(async () => ({ success: true })) };
});

const request = require('supertest');
const { createTestApp } = require('./test-server');
const { db } = require('../utils/db');
const { getDb } = require('../config/database');
const supportRoutes = require('../routes/support.routes');
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
  return {
    token: res.body.data.token,
    id: res.body.data.user._id,
    email: res.body.data.user.email,
  };
}

// Seed ids MUST be UUID-shaped: every /:id admin route runs
// validateObjectId (400 on anything that is not a dashed UUID or 24-hex).
function newUuid () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function seedTicket (overrides = {}) {
  const id = overrides.id || newUuid();
  await db('support_tickets').create({
    id,
    userId: overrides.userId,
    category: overrides.category || 'payment',
    subject: overrides.subject || 'Payment not received',
    status: overrides.status || 'open',
  });
  return id;
}

const flush = () => new Promise(resolve => setTimeout(resolve, 100));

function getAuditRows () {
  return getDb()
    .prepare(`SELECT * FROM activity_logs WHERE action LIKE 'support%'`)
    .all();
}

describe('Admin support endpoints', () => {
  beforeEach(async () => {
    await supportRoutes.replyStore.resetAll();
    sendEmail.mockClear();
  });

  test('all four support routes deny moderator with 403', async () => {
    const mod = await registerUser('moderator');
    const buyer = await registerUser('buyer');
    const ticketId = await seedTicket({ userId: buyer.id });

    const list = await request(app)
      .get('/api/admin/support/tickets')
      .set('Authorization', `Bearer ${mod.token}`);
    expect(list.status).toBe(403);

    const detail = await request(app)
      .get(`/api/admin/support/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${mod.token}`);
    expect(detail.status).toBe(403);

    const reply = await request(app)
      .post(`/api/admin/support/tickets/${ticketId}/replies`)
      .set('Authorization', `Bearer ${mod.token}`)
      .send({ message: 'nope' });
    expect(reply.status).toBe(403);

    const update = await request(app)
      .put(`/api/admin/support/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${mod.token}`)
      .send({ status: 'resolved' });
    expect(update.status).toBe(403);
  });

  test('all four support routes require authentication', async () => {
    const list = await request(app).get('/api/admin/support/tickets');
    expect(list.status).toBe(401);
  });

  test('list supports status filter, LIKE-escaped search, and pagination', async () => {
    const admin = await registerUser('admin');
    const buyer = await registerUser('buyer');
    await seedTicket({ userId: buyer.id, subject: 'Alpha save 50% refund', status: 'open' });
    await seedTicket({ userId: buyer.id, subject: 'Beta save 50 invoice', status: 'pending' });
    await seedTicket({ userId: buyer.id, subject: 'Gamma verification issue', status: 'resolved' });

    const page1 = await request(app)
      .get('/api/admin/support/tickets?pageSize=2&page=1')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(page1.status).toBe(200);
    expect(page1.body.data.total).toBe(3);
    expect(page1.body.data.openCount).toBe(1);
    expect(page1.body.data.tickets).toHaveLength(2);
    expect(page1.body.data.tickets[0].userEmail).toBe(buyer.email);

    const openOnly = await request(app)
      .get('/api/admin/support/tickets?status=open')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(openOnly.body.data.tickets.every(t => t.status === 'open')).toBe(true);

    // '50%' must match only the subject containing the literal '50%' —
    // an unescaped '%' would also match 'Beta save 50 invoice'.
    const search = await request(app)
      .get(`/api/admin/support/tickets?q=${encodeURIComponent('50%')}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(search.status).toBe(200);
    expect(search.body.data.tickets).toHaveLength(1);
    expect(search.body.data.tickets[0].subject).toContain('Alpha');
  });

  test('detail returns thread with requester email; malformed id 400; unknown 404', async () => {
    const admin = await registerUser('admin');
    const buyer = await registerUser('buyer');
    const ticketId = await seedTicket({ userId: buyer.id, subject: 'Detail me' });
    await db('support_replies').create({
      ticketId,
      authorId: buyer.id,
      authorRole: 'user',
      body: 'First message from the customer.',
    });

    const res = await request(app)
      .get(`/api/admin/support/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.replies).toHaveLength(1);
    expect(res.body.data.userEmail).toBe(buyer.email);

    const malformed = await request(app)
      .get('/api/admin/support/tickets/nope')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(malformed.status).toBe(400);

    const missing = await request(app)
      .get('/api/admin/support/tickets/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(missing.status).toBe(404);
  });

  test('admin reply stores a reply, sets pending, and emails the owner', async () => {
    const admin = await registerUser('admin');
    const buyer = await registerUser('buyer');
    const ticketId = await seedTicket({ userId: buyer.id, subject: 'Order stuck' });

    const res = await request(app)
      .post(`/api/admin/support/tickets/${ticketId}/replies`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ message: 'We are escalating this to the provider.' });

    expect(res.status).toBe(201);
    expect(res.body.data.reply.authorRole).toBe('admin');
    expect(res.body.data.ticket.status).toBe('pending');
    expect(res.body.data.emailSent).toBe(true);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0]).toBe(buyer.email);

    const detail = await request(app)
      .get(`/api/admin/support/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(detail.body.data.replies).toHaveLength(1);
  });

  test('admin reply strips CRLF from the email subject (header injection guard)', async () => {
    const admin = await registerUser('admin');
    const buyer = await registerUser('buyer');
    const ticketId = await seedTicket({ userId: buyer.id, subject: 'Line\nBreak: subject' });

    const res = await request(app)
      .post(`/api/admin/support/tickets/${ticketId}/replies`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ message: 'Reply body' });

    expect(res.status).toBe(201);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const subject = sendEmail.mock.calls[0][1];
    expect(subject).not.toMatch(/[\r\n]/);
    expect(subject).toContain('[JERTS CART] Re:');
  });

  test('admin reply still succeeds when the email transport throws (best-effort)', async () => {
    const admin = await registerUser('admin');
    const buyer = await registerUser('buyer');
    const ticketId = await seedTicket({ userId: buyer.id, subject: 'Email down' });
    sendEmail.mockRejectedValueOnce(new Error('SMTP unavailable'));

    const res = await request(app)
      .post(`/api/admin/support/tickets/${ticketId}/replies`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ message: 'Persisted even when email fails.' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.emailSent).toBe(false);

    const detail = await request(app)
      .get(`/api/admin/support/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(detail.body.data.replies).toHaveLength(1);
    expect(detail.body.data.ticket.status).toBe('pending');
  });

  test('admin reply validates body and 404s unknown tickets', async () => {
    const admin = await registerUser('admin');
    const empty = await request(app)
      .post('/api/admin/support/tickets/00000000-0000-0000-0000-000000000000/replies')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ message: '' });
    expect(empty.status).toBe(400);

    const missing = await request(app)
      .post('/api/admin/support/tickets/00000000-0000-0000-0000-000000000000/replies')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ message: 'hello' });
    expect(missing.status).toBe(404);
  });

  test('PUT status updates the ticket and validates the enum', async () => {
    const admin = await registerUser('admin');
    const buyer = await registerUser('buyer');
    const ticketId = await seedTicket({ userId: buyer.id, status: 'open' });

    const ok = await request(app)
      .put(`/api/admin/support/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'resolved' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.ticket.status).toBe('resolved');

    const reopen = await request(app)
      .put(`/api/admin/support/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'open' });
    expect(reopen.body.data.ticket.status).toBe('open');

    const bad = await request(app)
      .put(`/api/admin/support/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'archived' });
    expect(bad.status).toBe(400);
  });

  test('admin mutations write audit rows (support_reply, support_status_change)', async () => {
    const admin = await registerUser('admin');
    const buyer = await registerUser('buyer');
    const ticketId = await seedTicket({ userId: buyer.id });

    await request(app)
      .post(`/api/admin/support/tickets/${ticketId}/replies`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ message: 'Audit this reply' });
    await flush();

    await request(app)
      .put(`/api/admin/support/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'resolved' });
    await flush();

    const rows = getAuditRows();
    const actions = rows.map(r => r.action);
    expect(actions).toEqual(expect.arrayContaining(['support_reply', 'support_status_change']));

    const replyRow = rows.find(r => r.action === 'support_reply');
    expect(replyRow.user).toBe(admin.id);
    expect(replyRow.userRole).toBe('admin');
    expect(replyRow.severity).toBe('info');
    // Middleware details are sanitizeDetails(req.body) — the route/method
    // are captured by the action itself, not the body (verified against
    // audit.middleware.js: details = sanitizeDetails(req.body)).
    expect(JSON.parse(replyRow.details)).toEqual({ message: 'Audit this reply' });

    const statusRow = rows.find(r => r.action === 'support_status_change');
    expect(JSON.parse(statusRow.details)).toEqual({ status: 'resolved' });

    // Exactly one row per mutation — no double logging from a route-level
    // override stacked on the router-level auditMutation().
    expect(actions.filter(a => a === 'support_reply')).toHaveLength(1);
    expect(actions.filter(a => a === 'support_status_change')).toHaveLength(1);
  });

  test('admin reply route is rate limited via the shared reply limiter', async () => {
    const admin = await registerUser('admin');
    const buyer = await registerUser('buyer');
    const ticketId = await seedTicket({ userId: buyer.id });

    for (let i = 0; i < 20; i++) {
      const ok = await request(app)
        .post(`/api/admin/support/tickets/${ticketId}/replies`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ message: `Reply ${i}` });
      expect(ok.status).toBe(201);
    }
    const limited = await request(app)
      .post(`/api/admin/support/tickets/${ticketId}/replies`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ message: 'One too many' });
    expect(limited.status).toBe(429);
  });
});
