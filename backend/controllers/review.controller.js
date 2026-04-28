const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db, generateId, parseJson, stringifyJson, mapReviewRow } = require('../utils/db');

function calculateAverageRating (sellerId) {
  const row = db('reviews').db.prepare(
    `SELECT AVG(rating) as averageRating, COUNT(*) as totalReviews FROM reviews WHERE seller = ?`
  ).get(sellerId);

  const breakdown = db('reviews').db.prepare(
    `SELECT rating, COUNT(*) as count FROM reviews WHERE seller = ? GROUP BY rating ORDER BY rating DESC`
  ).all(sellerId);

  const ratingBreakdown = {};
  for (let i = 1; i <= 5; i++) {
    ratingBreakdown[i] = 0;
  }
  for (const b of breakdown) {
    ratingBreakdown[b.rating] = b.count;
  }

  return {
    averageRating: row.averageRating ? Math.round(row.averageRating * 10) / 10 : 0,
    totalReviews: row.totalReviews || 0,
    ratingBreakdown,
  };
}

async function updateSellerRating (sellerId) {
  try {
    const summary = calculateAverageRating(sellerId);

    db('users').findByIdAndUpdate(sellerId, {
      rating: summary.averageRating,
      totalReviews: summary.totalReviews,
    });
  } catch (error) {
    console.error('Failed to update seller rating:', error);
  }
}

exports.createReview = async (req, res) => {
  try {
    const { sellerId, productId, orderId, rating, comment, detailedRatings } = req.body;

    if (!sellerId || !rating) {
      return res.status(400).json({
        success: false,
        error: 'Seller ID and rating are required',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5',
      });
    }

    if (sellerId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot review yourself',
      });
    }

    const seller = db('users').findById(sellerId);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found',
      });
    }

    if (orderId) {
      const order = db('orders').findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
        });
      }

      const isCustomer = order.userId === req.user.id;
      const orderItems = db('order_items').find({ orderId });
      const isSeller = orderItems.some(item => item.seller === req.user.id);

      if (!isCustomer && !isSeller) {
        return res.status(403).json({
          success: false,
          error: 'You were not involved in this transaction',
        });
      }

      const existingReview = db('reviews').findOne({
        reviewer: req.user.id,
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

    const review = db('reviews').create({
      reviewer: req.user.id,
      seller: sellerId,
      product: productId || null,
      order: orderId || null,
      rating,
      comment: comment || '',
      detailedRatings_accuracy: detailedRatings?.accuracy || null,
      detailedRatings_communication: detailedRatings?.communication || null,
      detailedRatings_value: detailedRatings?.value || null,
      helpfulVotes: stringifyJson([]),
      reportCount: 0,
      sellerResponse_comment: null,
      sellerResponse_respondedAt: null,
    });

    const reviewer = db('users').findById(req.user.id);
    const populatedReview = {
      ...mapReviewRow(review),
      reviewer: reviewer ? { id: reviewer.id, fullName: reviewer.fullName, avatar: reviewer.avatar, university: reviewer.university } : null,
      product: productId ? (() => {
        const p = db('products').findById(productId);
        return p ? { id: p.id, title: p.title, images: parseJson(p.images) } : null;
      })() : null,
    };

    await updateSellerRating(sellerId);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: populatedReview,
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit review',
    });
  }
};

exports.getSellerReviews = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = -1 } = req.query;

    const seller = db('users').findById(sellerId);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found',
      });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const sortObj = {};
    sortObj[sortBy] = parseInt(sortOrder);

    const reviews = db('reviews').find({ seller: sellerId }, { sort: sortObj, limit: limitNum, skip });
    const total = db('reviews').countDocuments({ seller: sellerId });

    const populatedReviews = reviews.map(r => {
      const reviewer = db('users').findById(r.reviewer);
      const product = r.product ? db('products').findById(r.product) : null;
      return {
        ...mapReviewRow(r),
        reviewer: reviewer ? { id: reviewer.id, fullName: reviewer.fullName, avatar: reviewer.avatar, university: reviewer.university } : null,
        product: product ? { id: product.id, title: product.title, images: parseJson(product.images) } : null,
      };
    });

    const averageRating = calculateAverageRating(sellerId);

    res.json({
      success: true,
      data: {
        reviews: populatedReviews,
        total,
        pages: Math.ceil(total / limitNum),
        currentPage: pageNum,
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

exports.getSellerRatingSummary = async (req, res) => {
  try {
    const { sellerId } = req.params;

    const summary = calculateAverageRating(sellerId);

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

exports.getMyReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const reviews = db('reviews').find(
      { reviewer: req.user.id },
      { sort: { createdAt: -1 }, limit: limitNum, skip },
    );
    const count = db('reviews').countDocuments({ reviewer: req.user.id });

    const populatedReviews = reviews.map(r => {
      const seller = db('users').findById(r.seller);
      const product = r.product ? db('products').findById(r.product) : null;
      return {
        ...mapReviewRow(r),
        seller: seller ? { id: seller.id, fullName: seller.fullName, avatar: seller.avatar, university: seller.university } : null,
        product: product ? { id: product.id, title: product.title, images: parseJson(product.images) } : null,
      };
    });

    res.json({
      success: true,
      data: {
        reviews: populatedReviews,
        total: count,
        pages: Math.ceil(count / limitNum),
        currentPage: pageNum,
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

exports.updateReview = async (req, res) => {
  try {
    const { rating, comment, detailedRatings } = req.body;

    const review = db('reviews').findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found',
      });
    }

    if (review.reviewer !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this review',
      });
    }

    const updateData = {};
    if (rating) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: 'Rating must be between 1 and 5',
        });
      }
      updateData.rating = rating;
    }
    if (comment !== undefined) {
      updateData.comment = comment;
    }
    if (detailedRatings) {
      const existing = {
        accuracy: review.detailedRatings_accuracy,
        communication: review.detailedRatings_communication,
        value: review.detailedRatings_value,
      };
      updateData.detailedRatings_accuracy = detailedRatings.accuracy !== undefined ? detailedRatings.accuracy : existing.accuracy;
      updateData.detailedRatings_communication = detailedRatings.communication !== undefined ? detailedRatings.communication : existing.communication;
      updateData.detailedRatings_value = detailedRatings.value !== undefined ? detailedRatings.value : existing.value;
    }

    db('reviews').updateById(review.id, updateData);

    await updateSellerRating(review.seller);

    const updatedReview = db('reviews').findById(review.id);
    const reviewer = db('users').findById(updatedReview.reviewer);
    const product = updatedReview.product ? db('products').findById(updatedReview.product) : null;

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: {
        ...mapReviewRow(updatedReview),
        reviewer: reviewer ? { id: reviewer.id, fullName: reviewer.fullName, avatar: reviewer.avatar, university: reviewer.university } : null,
        product: product ? { id: product.id, title: product.title, images: parseJson(product.images) } : null,
      },
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update review',
    });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const review = db('reviews').findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found',
      });
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = review.reviewer === req.user.id;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this review',
      });
    }

    const sellerId = review.seller;
    db('reviews').deleteById(review.id);

    await updateSellerRating(sellerId);

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

exports.markHelpful = async (req, res) => {
  try {
    const review = db('reviews').findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found',
      });
    }

    const votes = parseJson(review.helpfulVotes) || [];
    if (!votes.includes(req.user.id)) {
      votes.push(req.user.id);
      db('reviews').updateById(review.id, {
        helpfulVotes: stringifyJson(votes),
      });
    }

    res.json({
      success: true,
      message: 'Review marked as helpful',
      data: { helpfulCount: votes.length },
    });
  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark review as helpful',
    });
  }
};

exports.reportReview = async (req, res) => {
  try {
    const review = db('reviews').findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found',
      });
    }

    db('reviews').updateById(review.id, {
      reportCount: (review.reportCount || 0) + 1,
    });

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

exports.respondToReview = async (req, res) => {
  try {
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({
        success: false,
        error: 'Response comment is required',
      });
    }

    const review = db('reviews').findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found',
      });
    }

    if (review.seller !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Only the seller can respond to this review',
      });
    }

    db('reviews').updateById(review.id, {
      sellerResponse_comment: comment,
      sellerResponse_respondedAt: new Date().toISOString(),
    });

    const updatedReview = db('reviews').findById(review.id);

    res.json({
      success: true,
      message: 'Response added successfully',
      data: mapReviewRow(updatedReview),
    });
  } catch (error) {
    console.error('Respond to review error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to respond to review',
    });
  }
};
