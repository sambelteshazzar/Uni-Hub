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
const couponController = require('../controllers/coupon.controller');

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

// Coupon CRUD — admin only per the RBAC matrix. Code reads coupons via
// the /api/coupons/validate route, not these endpoints.
router.get('/coupons', authorize('admin'), asyncHandler(couponController.list));
router.post('/coupons', authorize('admin'), auditMutation('coupon_create'), asyncHandler(couponController.create));
router.put('/coupons/:id', validateObjectId, authorize('admin'), auditMutation('coupon_update'), asyncHandler(couponController.update));
router.delete('/coupons/:id', validateObjectId, authorize('admin'), auditMutation('coupon_delete'), asyncHandler(couponController.remove));

// Payout approval queue — admin-only per the RBAC matrix (moderators: N).
router.get('/payouts', authorize('admin'), asyncHandler(adminController.getPayoutQueue));
router.put('/payouts/:id/approve', validateObjectId, authorize('admin'), auditMutation('payout_approve'), asyncHandler(adminController.approvePayout));
router.put('/payouts/:id/reject', validateObjectId, authorize('admin'), auditMutation('payout_reject'), asyncHandler(adminController.rejectPayout));

module.exports = router;
