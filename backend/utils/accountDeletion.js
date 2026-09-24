// ============================================
// ACCOUNT DELETION — shared helpers (spec 2026-09-22)
// Obligations gate + atomic anonymize statements, shared by
// self-service DELETE /users/me and admin DELETE /users/:id.
// ============================================
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('../utils/db');
const { getSellerBalance } = require('./ledger');
const { destroyDocument } = require('./cloudinary.util');

const OPEN_ORDER_STATUSES = ['placed', 'confirmed', 'in-transit'];
const MAX_ORDERS_LISTED = 10;

async function getDeletionBlockers (userId) {
  const blockers = [];

  const bal = await getSellerBalance(userId);
  const total = bal.pending + bal.available;
  if (total > 0) {
    blockers.push({
      type: 'balance',
      message: `GHS ${total.toFixed(2)} is in your seller balance. Contact support to arrange a payout — or ask an administrator to delete this account for you.`,
      action: { label: 'Contact support', href: '#/contact' },
    });
  }

  const payout = await db('payouts').rawGet(
    `SELECT id FROM payouts WHERE sellerId = ? AND status IN ('requested','approved','processing') LIMIT 1`,
    [userId],
  );
  if (payout) {
    blockers.push({
      type: 'payout',
      message: 'A payout request is being processed. Wait for it to finish — or ask an administrator to delete this account for you.',
      action: { label: 'Contact support', href: '#/contact' },
    });
  }

  const placeholders = OPEN_ORDER_STATUSES.map(() => '?').join(',');
  const buyerOrders = await db('orders').rawAll(
    `SELECT id, orderNumber FROM orders
     WHERE userId = ? AND status IN (${placeholders}) AND payment_status != 'failed'
     ORDER BY createdAt DESC LIMIT ${MAX_ORDERS_LISTED}`,
    [userId, ...OPEN_ORDER_STATUSES],
  );
  const sellerOrders = await db('orders').rawAll(
    `SELECT DISTINCT o.id, o.orderNumber FROM order_items oi
     JOIN orders o ON o.id = oi.orderId
     WHERE oi.seller = ? AND o.status IN (${placeholders}) AND o.payment_status != 'failed'
     ORDER BY o.createdAt DESC LIMIT ${MAX_ORDERS_LISTED}`,
    [userId, ...OPEN_ORDER_STATUSES],
  );
  const seen = new Set();
  for (const o of [...buyerOrders, ...sellerOrders]) {
    if (seen.has(o.id)) { continue; }
    seen.add(o.id);
    blockers.push({
      type: 'open_order',
      message: `Order #${o.orderNumber || String(o.id).slice(0, 8)} is still in progress`,
      action: { label: 'View orders', href: '#/orders' },
    });
  }

  return blockers;
}

/**
 * Atomic anonymize + scrub. Writes go through ONE batchWrite (atomic on
 * local SQLite and Turso). The caller re-checks blockers immediately
 * before invoking this; the residual SELECT→batch gap is a documented
 * TOCTOU (same-user, milliseconds) — see spec §2 escape clause.
 * Cloudinary destroys run post-commit, best-effort.
 * @returns {Promise<{ oldEmail: string }>}
 */
async function executeAccountDeletion (user, { marker }) {
  const oldEmail = user.email;
  const shellEmail = `deleted_${user.id}@anonymized.invalid`;
  const newHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);

  // Collect document assets BEFORE their rows vanish.
  const verifications = await db('student_verifications').find({ userId: user.id });
  const docs = [];
  for (const v of verifications) {
    const rows = await db('verification_documents').find({ verificationId: v.id });
    docs.push(...rows);
  }

  // TODO: security review — gate SELECT happens in the controller right
  // before this call; batchWrite is all-or-nothing but cannot interleave
  // reads (Turso has no cross-request transactions).
  const statements = [
    {
      sql: `UPDATE users SET fullName = 'Deleted User', email = ?, phone = ?,
            avatar = '', bio = NULL, googleId = NULL, password = ?, isActive = 0,
            banReason = ?, resetToken = NULL, resetTokenExpiry = NULL,
            updatedAt = datetime('now') WHERE id = ?`,
      args: [shellEmail, `deleted-${String(user.id).slice(0, 8)}`, newHash, marker, user.id],
    },
    {
      sql: `UPDATE activity_logs SET userEmail = NULL, userName = NULL,
            ipAddress = NULL, userAgent = NULL, details = '[redacted]' WHERE user = ?`,
      args: [user.id],
    },
    {
      sql: `UPDATE student_verifications SET fullName = 'Deleted User', email = ?,
            phone = 'deleted', studentId = 'redacted', universityEmail = NULL,
            hall = NULL, verificationCode = NULL,
            documentsPurgedAt = datetime('now'), updatedAt = datetime('now')
            WHERE userId = ?`,
      args: [shellEmail, user.id],
    },
    { sql: `DELETE FROM verification_documents WHERE verificationId IN (SELECT id FROM student_verifications WHERE userId = ?)`, args: [user.id] },
    { sql: `DELETE FROM newsletter_subscribers WHERE email = ?`, args: [oldEmail] },
    { sql: `DELETE FROM wishlists WHERE user = ?`, args: [user.id] },
    { sql: `DELETE FROM search_history WHERE user = ?`, args: [user.id] },
    { sql: `DELETE FROM notifications WHERE user = ?`, args: [user.id] },
    { sql: `DELETE FROM idempotency_keys WHERE userId = ?`, args: [user.id] },
    { sql: `DELETE FROM admin_mfa_challenges WHERE userId = ?`, args: [user.id] },
    { sql: `DELETE FROM support_replies WHERE ticketId IN (SELECT id FROM support_tickets WHERE userId = ?)`, args: [user.id] },
    { sql: `DELETE FROM support_tickets WHERE userId = ?`, args: [user.id] },
    { sql: `UPDATE products SET status = 'inactive', updatedAt = datetime('now') WHERE seller = ? AND status != 'sold'`, args: [user.id] },
  ];

  await db('users').batchWrite(statements);

  for (const d of docs) {
    if (!d.cloudinaryPublicId) { continue; }
    try {
      await destroyDocument(d.cloudinaryPublicId, d.mimeType || d.fileType);
    } catch (_e) { /* best-effort: never resurrect a committed deletion */ }
  }

  return { oldEmail };
}

module.exports = { getDeletionBlockers, executeAccountDeletion };
