/**
 * Support ticket controllers (spec 2026-09-24).
 *
 * ONE feature controller owns BOTH surfaces — the same convention as
 * coupon.controller.js, which serves /api/coupons (user) and
 * /api/admin/coupons (admin) from a single file. User handlers are
 * mounted behind `protect` on /api/support; admin handlers are wired
 * into admin.routes.js (router-level protect + auditMutation already
 * apply there).
 *
 * TODO: security review — ticket bodies are user-generated content:
 * always escape at render time (frontend) and never interpolate raw
 * into email HTML without escapeHtml.
 */
const { db, generateId } = require('../utils/db');
const { escapeHtml } = require('../middleware/sanitize.middleware');
const { sendEmail } = require('../utils/emailService');

const CATEGORY_ENUM = ['order', 'payment', 'verification', 'product', 'account', 'other'];
const STATUS_ENUM = ['open', 'pending', 'resolved'];
const SUBJECT_MAX = 200;
const MESSAGE_MAX = 5000;

function trimOrNull (value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateNewTicket (body) {
  const category = trimOrNull(body && body.category);
  const subject = trimOrNull(body && body.subject);
  const message = trimOrNull(body && body.message);
  if (!category || !CATEGORY_ENUM.includes(category)) {
    return { error: 'Category is required and must be a valid support category.' };
  }
  if (!subject) {return { error: 'Subject is required.' };}
  if (subject.length > SUBJECT_MAX) {
    return { error: `Subject must be ${SUBJECT_MAX} characters or fewer.` };
  }
  if (!message) {return { error: 'Message is required.' };}
  if (message.length > MESSAGE_MAX) {
    return { error: `Message must be ${MESSAGE_MAX} characters or fewer.` };
  }
  return { category, subject, message };
}

function validateReplyBody (body) {
  const message = trimOrNull(body && body.message);
  if (!message) {return { error: 'Message is required.' };}
  if (message.length > MESSAGE_MAX) {
    return { error: `Message must be ${MESSAGE_MAX} characters or fewer.` };
  }
  return { message };
}

async function findOwnedTicket (id, userId) {
  const ticket = await db('support_tickets').findById(id);
  if (!ticket || ticket.userId !== userId) {return null;}
  return ticket;
}

// LIKE wildcards are data, not syntax — escape before building patterns.
function escapeLike (value) {
  return value.replace(/[\\%_]/g, ch => `\\${ch}`);
}

module.exports = {
  CATEGORY_ENUM,
  STATUS_ENUM,
  escapeLike,

  validateNewTicket,
  validateReplyBody,
  findOwnedTicket,

  async createTicket (req, res, next) {
    try {
      const valid = validateNewTicket(req.body);
      if (valid.error) {return res.status(400).json({ success: false, error: valid.error });}
      const ticketId = generateId();
      const replyId = generateId();
      // Atomic on both engines: insert ticket + first message together.
      await db('support_tickets').batchWrite([
        {
          sql: `INSERT INTO support_tickets (id, userId, category, subject, status) VALUES (?, ?, ?, ?, 'open')`,
          args: [ticketId, req.user.id, valid.category, valid.subject],
        },
        {
          sql: `INSERT INTO support_replies (id, ticketId, authorId, authorRole, body) VALUES (?, ?, ?, 'user', ?)`,
          args: [replyId, ticketId, req.user.id, valid.message],
        },
      ]);
      const ticket = await db('support_tickets').findById(ticketId);

      // Best-effort confirmation to the ticket creator (spec §2). A failed
      // transport must never fail the API call; subject gets CR/LF stripped.
      try {
        const subject = `[JERTS CART] We received your request: ${ticket.subject.replace(/[\r\n]+/g, ' ')}`;
        const html = [
          `<p>Hi ${escapeHtml(req.user.fullName || 'there')},</p>`,
          '<p>Thanks for contacting JERTS CART support — we received your request:</p>',
          `<blockquote>${escapeHtml(ticket.subject)}</blockquote>`,
          '<p>We usually reply within 24 hours.</p>',
          '<p><a href="https://jertscart.com/#/contact">View the conversation</a></p>',
        ].join('\n');
        await sendEmail(req.user.email, subject, html);
      } catch (err) {
        // TODO: security review — do not log the error wholesale (may carry PII).
        console.warn('Support ticket confirmation email failed:', err && err.message);
      }

      res.status(201).json({ success: true, data: { ticket } });
    } catch (err) {
      next(err);
    }
  },

  async listTickets (req, res, next) {
    try {
      const rows = await db('support_tickets').rawAll(
        `SELECT * FROM support_tickets WHERE userId = ? ORDER BY updatedAt DESC`,
        [req.user.id]
      );
      res.json({ success: true, data: { tickets: rows } });
    } catch (err) {
      next(err);
    }
  },

  async getTicket (req, res, next) {
    try {
      const ticket = await findOwnedTicket(req.params.id, req.user.id);
      if (!ticket) {return res.status(404).json({ success: false, error: 'Ticket not found.' });}
      const replies = await db('support_replies').rawAll(
        `SELECT * FROM support_replies WHERE ticketId = ? ORDER BY createdAt ASC`,
        [ticket.id]
      );
      res.json({ success: true, data: { ticket, replies } });
    } catch (err) {
      next(err);
    }
  },

  async replyToTicket (req, res, next) {
    try {
      const valid = validateReplyBody(req.body);
      if (valid.error) {return res.status(400).json({ success: false, error: valid.error });}
      const ticket = await findOwnedTicket(req.params.id, req.user.id);
      if (!ticket) {return res.status(404).json({ success: false, error: 'Ticket not found.' });}
      const replyId = generateId();
      await db('support_tickets').batchWrite([
        {
          sql: `INSERT INTO support_replies (id, ticketId, authorId, authorRole, body) VALUES (?, ?, ?, 'user', ?)`,
          args: [replyId, ticket.id, req.user.id, valid.message],
        },
        {
          sql: `UPDATE support_tickets SET status = 'open', updatedAt = datetime('now') WHERE id = ?`,
          args: [ticket.id],
        },
      ]);
      const reply = await db('support_replies').findById(replyId);
      const updated = await db('support_tickets').findById(ticket.id);
      res.status(201).json({ success: true, data: { reply, ticket: updated } });
    } catch (err) {
      next(err);
    }
  },

  async adminListTickets (req, res, next) {
    try {
      const allowedStatus = ['all', ...STATUS_ENUM];
      const status = allowedStatus.includes(req.query.status) ? req.query.status : 'all';
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));

      const where = [];
      const params = [];
      if (status !== 'all') {
        where.push('t.status = ?');
        params.push(status);
      }
      if (q) {
        const like = `%${escapeLike(q)}%`;
        where.push(
          `(t.subject LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\' OR u.fullName LIKE ? ESCAPE '\\')`
        );
        params.push(like, like, like);
      }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const totalRow = await db('support_tickets').rawGet(
        `SELECT COUNT(*) AS total FROM support_tickets t LEFT JOIN users u ON u.id = t.userId ${whereSql}`,
        params
      );
      const openRow = await db('support_tickets').rawGet(
        `SELECT COUNT(*) AS openCount FROM support_tickets WHERE status = 'open'`
      );
      const offset = (page - 1) * pageSize;
      const tickets = await db('support_tickets').rawAll(
        `SELECT t.*, u.email AS userEmail, u.fullName AS userName
           FROM support_tickets t LEFT JOIN users u ON u.id = t.userId
           ${whereSql}
          ORDER BY t.updatedAt DESC
          LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      res.json({
        success: true,
        data: {
          tickets,
          total: (totalRow && totalRow.total) || 0,
          openCount: (openRow && openRow.openCount) || 0,
          page,
          pageSize,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async adminGetTicket (req, res, next) {
    try {
      const ticket = await db('support_tickets').findById(req.params.id);
      if (!ticket) {return res.status(404).json({ success: false, error: 'Ticket not found.' });}
      const replies = await db('support_replies').rawAll(
        `SELECT * FROM support_replies WHERE ticketId = ? ORDER BY createdAt ASC`,
        [ticket.id]
      );
      const user = await db('users').findById(ticket.userId);
      res.json({
        success: true,
        data: { ticket, replies, userEmail: user ? user.email : null },
      });
    } catch (err) {
      next(err);
    }
  },

  async adminReplyTicket (req, res, next) {
    try {
      const valid = validateReplyBody(req.body);
      if (valid.error) {return res.status(400).json({ success: false, error: valid.error });}
      const ticket = await db('support_tickets').findById(req.params.id);
      if (!ticket) {return res.status(404).json({ success: false, error: 'Ticket not found.' });}

      const replyId = generateId();
      await db('support_tickets').batchWrite([
        {
          sql: `INSERT INTO support_replies (id, ticketId, authorId, authorRole, body) VALUES (?, ?, ?, 'admin', ?)`,
          args: [replyId, ticket.id, req.user.id, valid.message],
        },
        {
          sql: `UPDATE support_tickets SET status = 'pending', updatedAt = datetime('now') WHERE id = ?`,
          args: [ticket.id],
        },
      ]);
      const reply = await db('support_replies').findById(replyId);
      const updated = await db('support_tickets').findById(ticket.id);

      // Email is best-effort: an unconfigured transport must not fail the
      // API call. Only the ticket owner is notified.
      let emailSent = false;
      try {
        const owner = await db('users').findById(ticket.userId);
        if (owner && owner.email) {
          // CRLF in the subject would allow header injection; escapeHtml
          // does not touch newlines, so strip them explicitly.
          const subject = `[JERTS CART] Re: ${ticket.subject.replace(/[\r\n]+/g, ' ')}`;
          const html = [
            `<p>Hi ${escapeHtml(owner.fullName || 'there')},</p>`,
            `<p><strong>${escapeHtml(ticket.subject)}</strong> has a new reply from our support team:</p>`,
            `<blockquote>${escapeHtml(valid.message)}</blockquote>`,
            `<p><a href="https://jertscart.com/#/contact">View the conversation</a></p>`,
          ].join('\n');
          const result = await sendEmail(owner.email, subject, html);
          emailSent = Boolean(result && result.success);
        }
      } catch (err) {
        // TODO: security review — never log the error wholesale if it may
        // carry PII; a transport failure is non-fatal here.
        console.warn('Support reply email failed:', err && err.message);
      }

      res.status(201).json({ success: true, data: { reply, ticket: updated, emailSent } });
    } catch (err) {
      next(err);
    }
  },

  async adminUpdateTicketStatus (req, res, next) {
    try {
      const status = req.body && req.body.status;
      if (!STATUS_ENUM.includes(status)) {
        return res
          .status(400)
          .json({ success: false, error: 'Status must be open, pending, or resolved.' });
      }
      const ticket = await db('support_tickets').findById(req.params.id);
      if (!ticket) {return res.status(404).json({ success: false, error: 'Ticket not found.' });}
      const updated = await db('support_tickets').updateById(ticket.id, { status });
      res.json({ success: true, data: { ticket: updated } });
    } catch (err) {
      next(err);
    }
  },
};
