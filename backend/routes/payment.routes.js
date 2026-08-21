/**
 * ============================================
 * Payment Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { protect, requireVerified, authorize } = require('../middleware/auth.middleware');
const { auditMutation } = require('../middleware/audit.middleware');
const {
  initializePayment,
  verifyPayment,
  getPaymentHistory,
  getPayment,
  handlePaystackWebhook,
  refundPayment,
} = require('../controllers/payment.controller');

// Webhook (no auth, raw body for signature verification) - MUST BE BEFORE protect()
router.post('/webhook', express.raw({ type: 'application/json' }), handlePaystackWebhook);

// All routes below are protected
router.use(protect);

router.post('/', requireVerified, initializePayment);
router.post('/verify', verifyPayment);
router.get('/history', getPaymentHistory);
router.get('/:id', getPayment);

// Admin refund — admin-only (previously ANY verified user could trigger
// Paystack refunds) and audited server-side.
router.post('/refund', requireVerified, authorize('admin'), auditMutation('admin_refund'), refundPayment);

module.exports = router;
