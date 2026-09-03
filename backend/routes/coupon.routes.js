/**
 * ============================================
 * Coupon Routes
 * Public validation + admin CRUD for promotional coupons.
 *
 * Mounts:
 *   /api/coupons/validate  (auth required, any role)
 *   /api/admin/coupons/*   (admin only — see admin.routes.js for the
 *                           existing protect + auditMiddleware stack)
 * ============================================ */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const couponController = require('../controllers/coupon.controller');

// Buyer-side: called from cart/checkout to check a code before
// placing the order. Does NOT mutate the coupon.
router.post('/validate', protect, couponController.validate);

module.exports = router;
