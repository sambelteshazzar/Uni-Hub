// ============================================
// LEDGER SERVICE - Escrow & seller balance bookkeeping
// ============================================
// Append-only money ledger. Balances are always computed from entries —
// never stored and mutated. See docs/superpowers/specs/
// 2026-08-21-escrow-payouts-design.md for the state machine.
//
// Sign convention (seller perspective):
//   sale +gross | commission -take | payout -amount
//   clawback -gross | adjustment +/- manual

const { db, generateId } = require('./db');

const DEFAULT_COMMISSION_PERCENT = 5;

function roundMoney (n) {
  return Math.round(n * 100) / 100;
}

async function getCommissionPercent () {
  const row = await db('platform_settings').rawGet(
    'SELECT value FROM platform_settings WHERE key = ?',
    ['commission_percent'],
  );
  const pct = row ? Number(row.value) : NaN;
  if (!Number.isFinite(pct) || pct < 0 || pct > 50) {
    return DEFAULT_COMMISSION_PERCENT;
  }
  return pct;
}

async function insertEntry ({ sellerId, orderId, type, amount, status = 'released', note = null }) {
  await db('ledger_entries').rawRun(
    'INSERT INTO ledger_entries (id, sellerId, orderId, type, amount, currency, status, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [generateId(), sellerId, orderId, type, amount, 'GHS', status, note],
  );
}

/**
 * Record escrowed sale entries for a provider-paid order. One 'sale' entry
 * per item so multi-seller carts split correctly. Idempotent per order.
 */
async function recordEscrowedSale (orderId, orderItems) {
  const existing = await db('ledger_entries').rawGet(
    'SELECT id FROM ledger_entries WHERE orderId = ? AND type = \'sale\' LIMIT 1',
    [orderId],
  );
  if (existing) {
    return; // already captured (e.g. webhook raced the verify endpoint)
  }
  for (const item of orderItems) {
    if (!item.seller || !(item.price > 0)) {
      continue;
    }
    const gross = roundMoney(item.price * item.quantity);
    await insertEntry({
      sellerId: item.seller,
      orderId,
      type: 'sale',
      amount: gross,
      status: 'escrowed',
      note: 'provider payment captured',
    });
  }
}

/**
 * Release a previously captured order: escrowed sale entries become
 * 'released' and one negative commission entry per affected seller is
 * written at the CURRENT rate.
 */
async function releaseOrderLedger (orderId) {
  const escrowed = await db('ledger_entries').rawAll(
    'SELECT * FROM ledger_entries WHERE orderId = ? AND type = \'sale\' AND status = \'escrowed\'',
    [orderId],
  );
  if (!escrowed.length) {
    return false;
  }
  const commissionPct = await getCommissionPercent();
  const bySeller = new Map();
  for (const entry of escrowed) {
    await db('ledger_entries').rawRun(
      'UPDATE ledger_entries SET status = \'released\' WHERE id = ?',
      [entry.id],
    );
    bySeller.set(entry.sellerId, (bySeller.get(entry.sellerId) || 0) + entry.amount);
  }
  for (const [sellerId, gross] of bySeller) {
    const take = roundMoney(gross * commissionPct / 100);
    if (take > 0) {
      await insertEntry({
        sellerId,
        orderId,
        type: 'commission',
        amount: -take,
        note: `commission ${commissionPct}%`,
      });
    }
  }
  return true;
}

/**
 * Cash-on-delivery orders settle outside the platform: record informational
 * released entries (sale + commission) directly so seller stats are true.
 */
async function recordCashSale (orderId, orderItems) {
  const existing = await db('ledger_entries').rawGet(
    'SELECT id FROM ledger_entries WHERE orderId = ? AND type = \'sale\' LIMIT 1',
    [orderId],
  );
  if (existing) {
    return false;
  }
  const commissionPct = await getCommissionPercent();
  const bySeller = new Map();
  for (const item of orderItems) {
    if (!item.seller || !(item.price > 0)) {
      continue;
    }
    const gross = roundMoney(item.price * item.quantity);
    await insertEntry({
      sellerId: item.seller,
      orderId,
      type: 'sale',
      amount: gross,
      status: 'released',
      note: 'cash-on-delivery (settled outside platform)',
    });
    bySeller.set(item.seller, (bySeller.get(item.seller) || 0) + gross);
  }
  for (const [sellerId, gross] of bySeller) {
    const take = roundMoney(gross * commissionPct / 100);
    if (take > 0) {
      await insertEntry({
        sellerId,
        orderId,
        type: 'commission',
        amount: -take,
        note: `commission ${commissionPct}% (cash-on-delivery)`,
      });
    }
  }
  return true;
}

/**
 * Reverse an order's ledger on refund/cancel:
 * - escrowed entries -> 'reversed' (buyer refunded before release)
 * - already-released sales -> negative 'clawback' entries (recover from
 *   future payouts)
 */
async function reverseOrderLedger (orderId) {
  const sales = await db('ledger_entries').rawAll(
    'SELECT * FROM ledger_entries WHERE orderId = ? AND type = \'sale\' AND status IN (\'escrowed\', \'released\')',
    [orderId],
  );
  let reversedEscrow = 0;
  let clawbacks = 0;
  for (const entry of sales) {
    if (entry.status === 'escrowed') {
      await db('ledger_entries').rawRun(
        'UPDATE ledger_entries SET status = \'reversed\', note = COALESCE(note, \'\') || \' | reversed on refund\' WHERE id = ?',
        [entry.id],
      );
      reversedEscrow += 1;
    } else {
      await insertEntry({
        sellerId: entry.sellerId,
        orderId,
        type: 'clawback',
        amount: -Math.abs(entry.amount),
        note: 'clawback after refund post-release',
      });
      clawbacks += 1;
    }
  }
  return { reversedEscrow, clawbacks };
}

/**
 * Computed balances for one seller.
 */
async function getSellerBalance (sellerId) {
  const pendingRow = await db('ledger_entries').rawGet(
    'SELECT COALESCE(SUM(amount), 0) as total FROM ledger_entries WHERE sellerId = ? AND status = \'escrowed\'',
    [sellerId],
  );
  const availableRow = await db('ledger_entries').rawGet(
    'SELECT COALESCE(SUM(amount), 0) as total FROM ledger_entries WHERE sellerId = ? AND status = \'released\'',
    [sellerId],
  );
  const lifetimeRow = await db('ledger_entries').rawGet(
    'SELECT COALESCE(SUM(amount), 0) as total FROM ledger_entries WHERE sellerId = ? AND type = \'sale\' AND status != \'reversed\'',
    [sellerId],
  );
  return {
    pending: roundMoney(pendingRow.total),
    available: roundMoney(availableRow.total),
    lifetimeSales: roundMoney(lifetimeRow.total),
  };
}

module.exports = {
  getCommissionPercent,
  recordEscrowedSale,
  releaseOrderLedger,
  recordCashSale,
  reverseOrderLedger,
  getSellerBalance,
};
