/**
 * ============================================
 * Admin Routes
 * Dashboard stats and admin operations
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../utils/errorHandler');
const adminController = require('../controllers/admin.controller');

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', asyncHandler(adminController.getDashboardStats));
router.get('/products', asyncHandler(adminController.getAdminProducts));
router.get('/orders', asyncHandler(adminController.getAdminOrders));
router.put('/products/:id/approve', asyncHandler(adminController.approveProduct));
router.put('/products/:id/reject', asyncHandler(adminController.rejectProduct));
router.put('/users/:id/ban', asyncHandler(adminController.banUser));
router.get('/users/banned', asyncHandler(adminController.getBannedUsers));

module.exports = router;
