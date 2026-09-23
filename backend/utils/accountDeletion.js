// ============================================
// ACCOUNT DELETION — shared helpers (spec 2026-09-22)
// Obligations gate + atomic anonymize statements, shared by
// self-service DELETE /users/me and admin DELETE /users/:id.
// ============================================
const { db } = require('../utils/db');
const { getSellerBalance } = require('./ledger');

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

module.exports = { getDeletionBlockers };
