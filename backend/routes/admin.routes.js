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
router.post('/products', asyncHandler(adminController.adminCreateProduct));
router.put('/products/:id', asyncHandler(adminController.adminUpdateProduct));
router.delete('/products/:id', asyncHandler(adminController.adminDeleteProduct));
router.get('/orders', asyncHandler(adminController.getAdminOrders));
router.put('/products/:id/approve', asyncHandler(adminController.approveProduct));
router.put('/products/:id/reject', asyncHandler(adminController.rejectProduct));
router.put('/users/:id/ban', asyncHandler(adminController.banUser));
router.get('/users/banned', asyncHandler(adminController.getBannedUsers));
router.get('/activity', asyncHandler(adminController.getActivityLogs));
router.get('/activity/stats', asyncHandler(adminController.getActivityStats));
router.get('/online-users', asyncHandler(adminController.getOnlineUsers));

module.exports = router;
