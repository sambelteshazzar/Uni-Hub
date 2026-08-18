/**
 * ============================================
 * Payment Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { protect, requireVerified } = require('../middleware/auth.middleware');
const {
  initializePayment,
  verifyPayment,
  getPaymentHistory,
  getPayment,
  handlePaystackWebhook,
  refundPayment,
} = require('../controllers/payment.controller');

// All routes are protected
router.use(protect);

router.post('/', requireVerified, initializePayment);
router.post('/verify', verifyPayment);
router.get('/history', getPaymentHistory);
router.get('/:id', getPayment);

// Admin refund
router.post('/refund', requireVerified, refundPayment);

// Webhook (no auth, raw body for signature verification)
router.post('/webhook', express.raw({ type: 'application/json' }), handlePaystackWebhook);

module.exports = router;
