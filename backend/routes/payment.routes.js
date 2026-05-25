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
} = require('../controllers/payment.controller');

// All routes are protected
router.use(protect);

router.post('/', requireVerified, initializePayment);
router.post('/verify', verifyPayment);
router.get('/history', getPaymentHistory);
router.get('/:id', getPayment);

module.exports = router;
