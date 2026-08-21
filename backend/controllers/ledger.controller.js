// ============================================
// LEDGER CONTROLLER - Seller balance visibility
// ============================================

const { asyncHandler } = require('../utils/errorHandler');
const ledger = require('../utils/ledger');

exports.getMyBalance = asyncHandler(async (req, res) => {
  const balance = await ledger.getSellerBalance(req.user.id);
  res.json({ success: true, data: balance });
});
