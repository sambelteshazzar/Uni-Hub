/**
 * ============================================
 * Verification Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  submitVerification,
  getPendingVerifications,
  approveVerification,
  rejectVerification,
  getVerificationStatus,
  getMyVerificationStatus,
} = require('../controllers/verification.controller');

// Authenticated routes
router.post('/', protect, submitVerification);
router.get('/me', protect, getMyVerificationStatus);
router.get('/status/:studentId/:university', getVerificationStatus);

// Admin + moderator routes (verification queue is moderator work)
router.get('/pending', protect, authorize('admin', 'moderator'), getPendingVerifications);
router.put('/:id/approve', protect, authorize('admin', 'moderator'), approveVerification);
router.put('/:id/reject', protect, authorize('admin', 'moderator'), rejectVerification);

module.exports = router;
