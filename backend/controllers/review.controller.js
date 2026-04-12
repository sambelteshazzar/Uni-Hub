const { ApiError, asyncHandler } = require('../utils/errorHandler');
/**
 * ============================================
 * Review Controller
 * Handle seller ratings and reviews
 * ============================================
 */

const Review = require('../models/Review.model');
const User = require('../models/User.model');
const Order = require('../models/Order.model');

/**
 * @desc    Create a review for a seller
 * @route   POST /api/reviews
 * @access  Private
 */
exports.createReview = async (req, res) => {
  try {
    const { sellerId, productId, orderId, rating, comment, detailedRatings } = req.body;

    // Validate required fields
    if (!sellerId || !rating) {
      return res.status(400).json({
        success: false,
        error: 'Seller ID and rating are required',
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5',
      });
    }

    // Cannot review yourself
    if (sellerId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'You cannot review yourself',
      });
    }

    // Check if seller exists
    const seller = await User.findById(sellerId);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found',
      });
    }

    // If order ID provided, verify the transaction
    if (orderId) {
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
        });
      }

      // Verify user was involved in this order
      const isCustomer = order.userId.toString() === req.user._id.toString();
      const isSeller = order.items.some(item => item.seller.toString() === req.user._id.toString());

      if (!isCustomer && !isSeller) {
        return res.status(403).json({
          success: false,
          error: 'You were not involved in this transaction',
        });
      }

      // Check if review already exists for this order
      const existingReview = await Review.findOne({
        reviewer: req.user._id,
        seller: sellerId,
        order: orderId,
      });

      if (existingReview) {
        return res.status(400).json({
          success: false,
          error: 'You have already reviewed this transaction',
        });
      }
    }

    // Create review
    const review = await Review.create({
      reviewer: req.user._id,
      seller: sellerId,
      product: productId || undefined,
      order: orderId || undefined,
      rating,
      comment,
      detailedRatings,
    });

    // Populate review with reviewer info
    const populatedReview = await Review.findById(review._id)
      .populate('reviewer', 'fullName avatar university')
      .populate('product', 'title images');

    // Update seller's average rating
    await updateSellerRating(sellerId);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: populatedReview,
    });
  } catch (error) {
    console.error('Create review error:', error);

    // Handle duplicate key error (unique constraint)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'You have already reviewed this seller',
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit review',
    });
  }
};

/**
 * @desc    Get reviews for a seller
 * @route   GET /api/reviews/seller/:sellerId
 * @access  Public
 */
exports.getSellerReviews = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = -1 } = req.query;

    // Check if seller exists
    const seller = await User.findById(sellerId);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found',
      });
    }

    // Get reviews and average rating
    const result = await Review.getSellerReviews(sellerId, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder: parseInt(sortOrder),
    });

    const averageRating = await Review.calculateAverageRating(sellerId);

    res.json({
      success: true,
      data: {
        reviews: result.reviews,
        total: result.total,
        pages: result.pages,
        currentPage: result.currentPage,
        averageRating: averageRating.averageRating,
        totalReviews: averageRating.totalReviews,
        ratingBreakdown: averageRating.ratingBreakdown,
      },
    });
  } catch (error) {
    console.error('Get seller reviews error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get reviews',
    });
  }
};

/**
 * @desc    Get seller rating summary
 * @route   GET /api/reviews/seller/:sellerId/summary
 * @access  Public
 */
exports.getSellerRatingSummary = async (req, res) => {
  try {
    const { sellerId } = req.params;

    const summary = await Review.calculateAverageRating(sellerId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Get rating summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get rating summary',
    });
  }
};

/**
 * @desc    Get user's reviews (as reviewer)
 * @route   GET /api/reviews/my-reviews
 * @access  Private
 */
exports.getMyReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const reviews = await Review.find({ reviewer: req.user._id })
      .populate('seller', 'fullName avatar university')
      .populate('product', 'title images')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Review.countDocuments({ reviewer: req.user._id });

    res.json({
      success: true,
      data: {
        reviews,
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: page,
      },
    });
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get reviews',
    });
  }
};

/**
 * @desc    Update a review
 * @route   PUT /api/reviews/:id
 * @access  Private
 */
exports.updateReview = async (req, res) => {
  try {
    const { rating, comment, detailedRatings } = req.body;

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found',
      });
    }

    // Verify ownership
    if (review.reviewer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this review',
      });
    }

    // Update fields
    if (rating) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: 'Rating must be between 1 and 5',
        });
      }
      review.rating = rating;
    }
    if (comment !== undefined) {
      review.comment = comment;
    }
    if (detailedRatings) {
      review.detailedRatings = { ...review.detailedRatings, ...detailedRatings };
    }

    await review.save();

    // Update seller's average rating
    await updateSellerRating(review.seller.toString());

    const updatedReview = await Review.findById(review._id)
      .populate('reviewer', 'fullName avatar university')
      .populate('product', 'title images');

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: updatedReview,
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update review',
    });
  }
};

/**
 * @desc    Delete a review
 * @route   DELETE /api/reviews/:id
 * @access  Private
 */
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found',
      });
    }

    // Verify ownership or admin
    const isAdmin = req.user.role === 'admin';
    const isOwner = review.reviewer.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this review',
      });
    }

    await review.deleteOne();

    // Update seller's average rating
    await updateSellerRating(review.seller.toString());

    res.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete review',
    });
  }
};

/**
 * @desc    Mark review as helpful
 * @route   POST /api/reviews/:id/helpful
 * @access  Private
 */
exports.markHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found',
      });
    }

    const helpfulCount = await review.addHelpfulVote(req.user._id);

    res.json({
      success: true,
      message: 'Review marked as helpful',
      data: { helpfulCount },
    });
  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark review as helpful',
    });
  }
};

/**
 * @desc    Report a review
 * @route   POST /api/reviews/:id/report
 * @access  Private
 */
exports.reportReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found',
      });
    }

    await review.report();

    res.json({
      success: true,
      message: 'Review reported successfully',
    });
  } catch (error) {
    console.error('Report review error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to report review',
    });
  }
};

/**
 * @desc    Seller respond to review
 * @route   POST /api/reviews/:id/respond
 * @access  Private
 */
exports.respondToReview = async (req, res) => {
  try {
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({
        success: false,
        error: 'Response comment is required',
      });
    }

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found',
      });
    }

    // Verify user is the seller
    if (review.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Only the seller can respond to this review',
      });
    }

    await review.addSellerResponse(comment);

    res.json({
      success: true,
      message: 'Response added successfully',
      data: review,
    });
  } catch (error) {
    console.error('Respond to review error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to respond to review',
    });
  }
};

/**
 * Helper: Update seller's average rating
 */
async function updateSellerRating(sellerId) {
  try {
    const summary = await Review.calculateAverageRating(sellerId);

    await User.findByIdAndUpdate(sellerId, {
      rating: summary.averageRating,
      totalReviews: summary.totalReviews,
    });
  } catch (error) {
    console.error('Failed to update seller rating:', error);
  }
}
