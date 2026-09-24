/**
 * ============================================
 * Verification Routes
 * ============================================
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { uploadVerificationDocs } = require('../middleware/upload.middleware');
const { auditMutation } = require('../middleware/audit.middleware');
const { ApiError, asyncHandler } = require('../utils/errorHandler');
const {
  submitVerification,
  getPendingVerifications,
  approveVerification,
  rejectVerification,
  getVerificationStatus,
  getMyVerificationStatus,
  getVerificationDocuments,
  purgeVerificationDocuments,
  confirmVerification,
  resendConfirmation,
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

// Self-service resend of the confirmation email. protect first: only an
// authenticated owner can trigger a send (unauthenticated callers 401
// before any mail path), so the limiter guards actual send attempts —
// 3 per 15 min per IP, stacked under server.js's namespace POST limiter.
// Explicit MemoryStore so tests can resetAll() between cases (same
// pattern as otpStore / replyStore — see user.routes.js, support.routes.js).
const resendStore = new rateLimit.MemoryStore();
const resendConfirmationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  store: resendStore,
  message: {
    success: false,
    error: 'Too many resend attempts. Please wait about 15 minutes and try again.',
  },
});
router.post('/resend-confirmation', protect, resendConfirmationLimiter, resendConfirmation);

// Magic-link confirmation (2026-08-29): public, token-in-URL is the
// credential. GETs are auto-exempt from CSRF, and the verification
// rate-limiter explicitly skips this path (see server.js).
router.get('/confirm', confirmVerification);

// Admin + moderator routes (verification queue is moderator work)
router.get('/pending', protect, authorize('admin', 'moderator'), getPendingVerifications);
router.put('/:id/approve', protect, authorize('admin', 'moderator'), approveVerification);
router.put('/:id/reject', protect, authorize('admin', 'moderator'), rejectVerification);
// PII-bearing document listing — audited per call, short-lived signed URLs only.
router.get('/:id/documents', protect, authorize('admin', 'moderator'), asyncHandler(getVerificationDocuments));
// Admin-only immediate purge (DPA erasure) — audited mutation.
router.post('/:id/purge-documents', protect, authorize('admin'), auditMutation('verification_docs_purge'), asyncHandler(purgeVerificationDocuments));

// Test hook: verificationResend.test.js resets the throttle between
// cases so counts never leak across tests (same module instance via
// require cache — same pattern as user.routes.js otpStore).
router.resendStore = resendStore;

module.exports = router;
