const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect, authorize } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../utils/errorHandler');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  exportMyData,
  deleteMyAccount,
  getMyDeletionBlockers,
  requestDeletionOtp,
  getTargetDeletionBlockers,
} = require('../controllers/user.controller');

// OTP-send throttle: 3 / 15 min keyed userId+IP. custom handler returns
// retryAfterSeconds for the modal countdown (spec §5). Placed here (not
// server.js) so it sits AFTER protect and can key on req.user.
// Explicit MemoryStore so tests can resetAll() between cases — without
// this the in-process counter accumulates suite-wide and later tests 429.
// TODO: security review — confirm 3/15min is not lockout-prone for shared-NAT dorm users.
const otpStore = new rateLimit.MemoryStore();
const deletionOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  store: otpStore,
  keyGenerator: req => `${(req.user && req.user.id) || 'anon'}:${req.ip}`,
  handler: (req, res, _next, options) => {
    const info = req.rateLimit || {};
    const resetMs = info.resetTime instanceof Date
      ? info.resetTime.getTime() - Date.now()
      : (options && options.windowMs) || 15 * 60 * 1000;
    res.status(429).json({
      success: false,
      error: 'Too many code requests — please wait before trying again.',
      retryAfterSeconds: Math.max(1, Math.ceil(resetMs / 1000)),
    });
  },
});

router.get('/', protect, authorize('admin'), getUsers);
// Self-service account lifecycle (specs 2026-08-23, 2026-09-22). ORDERING
// IS LOAD-BEARING: every /me/* route MUST stay above the parametric /:id
// block — GET '/me/deletion-blockers' would otherwise be captured by
// GET '/:id/deletion-blockers', and DELETE /:id (admin) by DELETE /me.
router.get('/me/export', protect, asyncHandler(exportMyData));
router.get('/me/deletion-blockers', protect, asyncHandler(getMyDeletionBlockers));
router.post('/me/deletion-otp', protect, deletionOtpLimiter, asyncHandler(requestDeletionOtp));
router.delete('/me', protect, asyncHandler(deleteMyAccount));
router.get('/:id/deletion-blockers', protect, authorize('admin'), asyncHandler(getTargetDeletionBlockers));
router.get('/:id', protect, getUser);
router.put('/:id', protect, authorize('admin'), updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);

// Test hook: deletionGate.test.js resets the throttle between cases so
// counts never leak across tests (same module instance via require cache).
router.otpStore = otpStore;

module.exports = router;
