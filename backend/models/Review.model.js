/**
 * ============================================
 * Review Model
 * ============================================
 * Seller ratings and reviews system
 */

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Reviewer (buyer)
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Seller being reviewed
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Related product (optional, for context)
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  },

  // Related order (to verify transaction happened)
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },

  // Rating (1-5 stars)
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },

  // Detailed ratings (optional)
  detailedRatings: {
    // How accurate was the product description
    accuracy: {
      type: Number,
      min: 1,
      max: 5,
    },
    // How responsive was the seller
    communication: {
      type: Number,
      min: 1,
      max: 5,
    },
    // How fair was the price
    value: {
      type: Number,
      min: 1,
      max: 5,
    },
  },

  // Written review
  comment: {
    type: String,
    trim: true,
    maxlength: [1000, 'Review cannot exceed 1000 characters'],
  },

  // Review status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved',
  },

  // Helpful votes
  helpfulVotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],

  // Report count (for moderation)
  reportCount: {
    type: Number,
    default: 0,
  },

  // Seller response (optional)
  sellerResponse: {
    comment: {
      type: String,
      maxlength: [500, 'Response cannot exceed 500 characters'],
    },
    respondedAt: Date,
  },
}, {
  timestamps: true,
});

// Compound index to prevent duplicate reviews for same order
reviewSchema.index({ reviewer: 1, seller: 1, order: 1 }, { unique: true, sparse: true });

// Index for fast queries
reviewSchema.index({ seller: 1, createdAt: -1 });
reviewSchema.index({ product: 1 });
reviewSchema.index({ reviewer: 1 });

// Static method to calculate average rating for a seller
reviewSchema.statics.calculateAverageRating = async function (sellerId) {
  const result = await this.aggregate([
    { $match: { seller: new mongoose.Types.ObjectId(sellerId), status: 'approved' } },
    {
      $group: {
        _id: '$seller',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
      },
    },
  ]);

  if (result.length > 0) {
    return {
      averageRating: Math.round(result[0].averageRating * 10) / 10,
      totalReviews: result[0].totalReviews,
      ratingBreakdown: {
        5: result[0].rating5,
        4: result[0].rating4,
        3: result[0].rating3,
        2: result[0].rating2,
        1: result[0].rating1,
      },
    };
  }

  return {
    averageRating: 0,
    totalReviews: 0,
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  };
};

// Static method to get reviews for a seller
reviewSchema.statics.getSellerReviews = async function (sellerId, options = {}) {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = -1 } = options;

  const reviews = await this.find({
    seller: sellerId,
    status: 'approved',
  })
    .populate('reviewer', 'fullName avatar university')
    .populate('product', 'title images')
    .populate('order', 'orderNumber')
    .sort({ [sortBy]: sortOrder })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await this.countDocuments({
    seller: sellerId,
    status: 'approved',
  });

  return {
    reviews,
    total: count,
    pages: Math.ceil(count / limit),
    currentPage: page,
  };
};

// Method to add helpful vote
reviewSchema.methods.addHelpfulVote = async function (userId) {
  if (!this.helpfulVotes.includes(userId)) {
    this.helpfulVotes.push(userId);
    await this.save();
  }
  return this.helpfulVotes.length;
};

// Method to add seller response
reviewSchema.methods.addSellerResponse = async function (comment) {
  this.sellerResponse = {
    comment,
    respondedAt: new Date(),
  };
  return this.save();
};

// Method to report review
reviewSchema.methods.report = async function () {
  this.reportCount += 1;
  if (this.reportCount >= 5) {
    this.status = 'pending'; // Auto-hide if too many reports
  }
  return this.save();
};

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
