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
const { validateObjectId } = require('../middleware/sanitize.middleware');
const { auditMutation } = require('../middleware/audit.middleware');
const adminController = require('../controllers/admin.controller');

router.use(protect);
router.use(authorize('admin'));
// Server-side audit trail for every mutating admin request.
router.use(auditMutation());

router.get('/stats', asyncHandler(adminController.getDashboardStats));
router.get('/products', asyncHandler(adminController.getAdminProducts));
router.post('/products', asyncHandler(adminController.adminCreateProduct));
router.put('/products/:id', validateObjectId, asyncHandler(adminController.adminUpdateProduct));
router.delete('/products/:id', validateObjectId, asyncHandler(adminController.adminDeleteProduct));
router.get('/orders', asyncHandler(adminController.getAdminOrders));
router.put('/products/:id/approve', validateObjectId, asyncHandler(adminController.approveProduct));
router.put('/products/:id/reject', validateObjectId, asyncHandler(adminController.rejectProduct));
router.put('/users/:id/ban', validateObjectId, asyncHandler(adminController.banUser));
router.get('/users/banned', asyncHandler(adminController.getBannedUsers));
router.get('/activity', asyncHandler(adminController.getActivityLogs));
router.get('/activity/stats', asyncHandler(adminController.getActivityStats));
router.get('/analytics', asyncHandler(adminController.getAnalytics));
router.get('/online-users', asyncHandler(adminController.getOnlineUsers));

module.exports = router;
