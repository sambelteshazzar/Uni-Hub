// ============================================
// LEDGER CONTROLLER - Seller balance + payouts
// ============================================
// Phase 3 of docs/superpowers/specs/2026-08-21-escrow-payouts-design.md:
// sellers request payouts against their AVAILABLE balance; admins approve
// or reject. Approval writes a negative 'payout' ledger entry (Phase 4
// will automate the actual money movement via Paystack Transfers).

const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db } = require('../utils/db');
const ledger = require('../utils/ledger');

const MIN_PAYOUT = 10; // GHS — below this the fees/effort make no sense

exports.getMyBalance = asyncHandler(async (req, res) => {
  const balance = await ledger.getSellerBalance(req.user.id);
  res.json({ success: true, data: balance });
});

function validateDestination (method, destination) {
  if (!destination || typeof destination !== 'string') {
    return 'Payout destination is required';
  }
  const dest = destination.trim();
  if (method === 'momo') {
    // Ghana MoMo numbers: 0XXXXXXXXX or +233XXXXXXXXX
    if (!/^(\+233|0)\d{9}$/.test(dest)) {
      return 'Mobile money number must be a valid Ghana number (e.g. 0241234567)';
    }
  } else if (method === 'bank') {
    if (!/^\d{6,20}$/.test(dest)) {
      return 'Bank account number must be 6-20 digits';
    }
  }
  return null;
}

/**
 * @desc Request a payout of available balance
 * @route POST /api/ledger/payouts
 * @access protect (+ verified sellers)
 */
exports.requestPayout = asyncHandler(async (req, res) => {
  const { method, destination } = req.body;
  const amount = Number(req.body.amount);

  if (!['momo', 'bank'].includes(method)) {
    throw new ApiError(400, 'Payout method must be "momo" or "bank"');
  }

  const destError = validateDestination(method, destination);
  if (destError) {
    throw new ApiError(400, destError);
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'Amount must be a positive number');
  }
  const rounded = Math.round(amount * 100) / 100;
  if (rounded < MIN_PAYOUT) {
    throw new ApiError(400, `Minimum payout is GHS ${MIN_PAYOUT}`);
  }

  const balance = await ledger.getSellerBalance(req.user.id);
  if (rounded > balance.available) {
    throw new ApiError(400, `Insufficient available balance: GHS ${balance.available.toFixed(2)} available`);
  }

  // TODO: security review — destination is PII used to move money later.
  // Stored as provided; Phase 4 must verify account ownership with the
  // provider before transferring.
  const payout = await db('payouts').create({
    sellerId: req.user.id,
    amount: rounded,
    method,
    destination: destination.trim(),
    status: 'requested',
  });

  res.status(201).json({
    success: true,
    message: 'Payout request submitted for review',
    data: payout,
  });
});

/**
 * @desc Seller's own payout history
 * @route GET /api/ledger/payouts
 * @access protect
 */
exports.getMyPayouts = asyncHandler(async (req, res) => {
  const payouts = await db('payouts').find(
    { sellerId: req.user.id },
    { sort: { requestedAt: -1 }, limit: 100 },
  );
  res.json({ success: true, data: { payouts, total: payouts.length } });
});
