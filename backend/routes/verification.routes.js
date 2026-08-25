/**
 * ============================================
 * Verification Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { uploadVerificationDocs } = require('../middleware/upload.middleware');
const { ApiError, asyncHandler } = require('../utils/errorHandler');
const {
  submitVerification,
  getPendingVerifications,
  approveVerification,
  rejectVerification,
  getVerificationStatus,
  getMyVerificationStatus,
  getVerificationDocuments,
} = require('../controllers/verification.controller');

// Authenticated routes
router.post('/', protect, (req, res, next) => {
  uploadVerificationDocs(req, res, (err) => {
    if (err instanceof require('multer').MulterError) {
      next(new ApiError(400, err.message));
    } else if (err) {
      next(new ApiError(400, err.message));
    } else {
      next();
    }
  });
}, submitVerification);
router.get('/me', protect, getMyVerificationStatus);
router.get('/status/:studentId/:university', getVerificationStatus);

// Admin + moderator routes (verification queue is moderator work)
router.get('/pending', protect, authorize('admin', 'moderator'), getPendingVerifications);
router.put('/:id/approve', protect, authorize('admin', 'moderator'), approveVerification);
router.put('/:id/reject', protect, authorize('admin', 'moderator'), rejectVerification);
// PII-bearing document listing — audited per call, short-lived signed URLs only.
router.get('/:id/documents', protect, authorize('admin', 'moderator'), asyncHandler(getVerificationDocuments));

module.exports = router;
