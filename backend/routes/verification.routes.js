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
} = require('../controllers/verification.controller');

// Authenticated routes
router.post('/', protect, submitVerification);
router.get('/status/:studentId/:university', getVerificationStatus);

// Admin routes
router.get('/pending', protect, authorize('admin'), getPendingVerifications);
router.put('/:id/approve', protect, authorize('admin'), approveVerification);
router.put('/:id/reject', protect, authorize('admin'), rejectVerification);

module.exports = router;
