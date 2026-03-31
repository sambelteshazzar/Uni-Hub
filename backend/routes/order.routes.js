/**
 * ============================================
 * Order Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  completePayment,
  cancelOrder,
} = require('../controllers/order.controller');

// All routes are protected
router.use(protect);

router.post('/', createOrder);
router.get('/my-orders', getMyOrders);
router.get('/:id', getOrder);
router.put('/:id/status', authorize('admin', 'seller'), updateOrderStatus);
router.post('/:id/payment', completePayment);
router.put('/:id/cancel', cancelOrder);

module.exports = router;
