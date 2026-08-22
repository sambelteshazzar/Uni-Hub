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

// RBAC tiers (2026-08-21): moderators may read admin data and moderate
// products + verifications; bans, product write/delete and refunds remain
// admin-only. Matrix documented in backend/config/roles.js.
router.use(protect);
// Server-side audit trail for every mutating admin request.
router.use(auditMutation());

const MODERATOR_ACCESS = ['admin', 'moderator'];

router.get('/stats', authorize(...MODERATOR_ACCESS), asyncHandler(adminController.getDashboardStats));
router.get('/products', authorize(...MODERATOR_ACCESS), asyncHandler(adminController.getAdminProducts));
router.post('/products', authorize('admin'), asyncHandler(adminController.adminCreateProduct));
router.put('/products/:id', validateObjectId, authorize('admin'), asyncHandler(adminController.adminUpdateProduct));
router.delete('/products/:id', validateObjectId, authorize('admin'), asyncHandler(adminController.adminDeleteProduct));
router.get('/orders', authorize(...MODERATOR_ACCESS), asyncHandler(adminController.getAdminOrders));
router.put('/products/:id/approve', validateObjectId, authorize(...MODERATOR_ACCESS), asyncHandler(adminController.approveProduct));
router.put('/products/:id/reject', validateObjectId, authorize(...MODERATOR_ACCESS), asyncHandler(adminController.rejectProduct));
router.put('/users/:id/ban', validateObjectId, authorize('admin'), asyncHandler(adminController.banUser));
router.get('/users/banned', authorize('admin'), asyncHandler(adminController.getBannedUsers));
router.get('/activity', authorize(...MODERATOR_ACCESS), asyncHandler(adminController.getActivityLogs));
router.get('/activity/stats', authorize(...MODERATOR_ACCESS), asyncHandler(adminController.getActivityStats));
router.get('/analytics', authorize(...MODERATOR_ACCESS), asyncHandler(adminController.getAnalytics));
router.get('/online-users', authorize(...MODERATOR_ACCESS), asyncHandler(adminController.getOnlineUsers));

module.exports = router;
