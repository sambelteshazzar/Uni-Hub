/**
 * ============================================
 * Review Routes
 * ============================================
 * Routes for seller ratings and reviews
 */

const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const {
  createReview,
  getSellerReviews,
  getSellerRatingSummary,
  getMyReviews,
  updateReview,
  deleteReview,
  markHelpful,
  reportReview,
  respondToReview,
} = require('../controllers/review.controller');

// Public routes (no auth required)
router.get('/seller/:sellerId', optionalAuth, getSellerReviews);
router.get('/seller/:sellerId/summary', getSellerRatingSummary);

// Protected routes (require authentication)
router.use(protect);

// Create review
router.post('/', createReview);

// Get user's own reviews
router.get('/my-reviews', getMyReviews);

// Update review
router.put('/:id', updateReview);

// Delete review
router.delete('/:id', deleteReview);

// Mark review as helpful
router.post('/:id/helpful', markHelpful);

// Report a review
router.post('/:id/report', reportReview);

// Seller respond to review
router.post('/:id/respond', respondToReview);

module.exports = router;
