/**
 * ============================================
 * Order Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { protect, authorize, requireVerified } = require('../middleware/auth.middleware');
const {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  completePayment,
  cancelOrder,
  trackByTrackingNumber,
} = require('../controllers/order.controller');

router.get('/track/:trackingNumber', trackByTrackingNumber);

router.use(protect);

router.post('/', requireVerified, createOrder);
router.get('/my-orders', getMyOrders);
router.get('/track/:trackingNumber', trackByTrackingNumber);
router.get('/:id', getOrder);
router.put('/:id/status', authorize('admin'), updateOrderStatus);
router.post('/:id/payment', completePayment);
router.put('/:id/cancel', cancelOrder);

module.exports = router;
