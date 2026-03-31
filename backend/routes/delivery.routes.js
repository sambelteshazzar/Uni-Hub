/**
 * ============================================
 * Delivery Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  createDelivery,
  getDeliveryByOrder,
  updateDeliveryStatus,
  getMyDeliveries,
  getAllDeliveries,
} = require('../controllers/delivery.controller');

// All routes are protected
router.use(protect);

router.post('/', createDelivery);
router.get('/my-deliveries', getMyDeliveries);
router.get('/order/:orderId', getDeliveryByOrder);
router.put('/:id/status', authorize('admin'), updateDeliveryStatus);
router.get('/', authorize('admin'), getAllDeliveries);

module.exports = router;
