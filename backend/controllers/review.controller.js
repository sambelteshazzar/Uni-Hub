const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db, generateId, parseJson, stringifyJson, mapReviewRow } = require('../utils/db');

async function calculateAverageRating (sellerId, productId = null) {
  let query = 'SELECT AVG(rating) as averageRating, COUNT(*) as totalReviews FROM reviews WHERE seller = ?';
  const params = [sellerId];
  
  if (productId) {
    query += ' AND product = ?';
    params.push(productId);
  }

  const row = await db('reviews').rawGet(query, ...params);

  let breakdownQuery = 'SELECT rating, COUNT(*) as count FROM reviews WHERE seller = ?';
  const breakdownParams = [sellerId];
  
  if (productId) {
    breakdownQuery += ' AND product = ?';
    breakdownParams.push(productId);
  }
  
  breakdownQuery += ' GROUP BY rating ORDER BY rating DESC';

  const breakdown = await db('reviews').rawAll(breakdownQuery, ...breakdownParams);

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
const summary = await calculateAverageRating(sellerId);

await db('users').findByIdAndUpdate(sellerId, {
rating: summary.averageRating,
totalReviews: summary.totalReviews,
});
} catch (error) {
console.error('Failed to update seller rating:', error);
}
}

exports.createReview = asyncHandler(async (req, res) => {
const { sellerId, productId, orderId, rating, comment, detailedRatings } = req.body;

if (!sellerId || !rating) {
throw new ApiError(400, 'Seller ID and rating are required');
}

if (rating < 1 || rating > 5) {
throw new ApiError(400, 'Rating must be between 1 and 5');
}

if (sellerId === req.user.id) {
throw new ApiError(400, 'You cannot review yourself');
}

const seller = await db('users').findById(sellerId);
if (!seller) {
throw new ApiError(404, 'Seller not found');
}

if (orderId) {
const order = await db('orders').findById(orderId);
if (!order) {
throw new ApiError(404, 'Order not found');
}

const isCustomer = order.userId === req.user.id;
const orderItems = await db('order_items').find({ orderId });
const isSeller = orderItems.some(item => item.seller === req.user.id);

if (!isCustomer && !isSeller) {
throw new ApiError(403, 'You were not involved in this transaction');
}

const existingReview = await db('reviews').findOne({
reviewer: req.user.id,
seller: sellerId,
order: orderId,
});

if (existingReview) {
throw new ApiError(400, 'You have already reviewed this transaction');
}
}

const review = await db('reviews').create({
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

const reviewer = await db('users').findById(req.user.id);
let productData = null;
if (productId) {
const p = await db('products').findById(productId);
productData = p ? { id: p.id, title: p.title, images: parseJson(p.images) } : null;
}
const populatedReview = {
...mapReviewRow(review),
reviewer: reviewer ? { id: reviewer.id, fullName: reviewer.fullName, avatar: reviewer.avatar, university: reviewer.university } : null,
product: productData,
};

await updateSellerRating(sellerId);

res.status(201).json({
success: true,
message: 'Review submitted successfully',
data: populatedReview,
});
});

exports.getSellerReviews = asyncHandler(async (req, res) => {
  const { sellerId } = req.params;
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = -1, productId } = req.query;

  const allowedSortFields = ['createdAt', 'rating', 'updatedAt'];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const seller = await db('users').findById(sellerId);
  if (!seller) {
    throw new ApiError(404, 'Seller not found');
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const sortObj = {};
  sortObj[safeSortBy] = parseInt(sortOrder);

  // Build query - filter by seller, optionally by product
  const query = { seller: sellerId };
  if (productId) {
    query.product = productId;
  }

  const reviews = await db('reviews').find(query, { sort: sortObj, limit: limitNum, skip });
  const total = await db('reviews').countDocuments(query);

  const populatedReviews = [];
  for (const r of reviews) {
    const reviewer = await db('users').findById(r.reviewer);
    const product = r.product ? await db('products').findById(r.product) : null;
    populatedReviews.push({
      ...mapReviewRow(r),
      reviewer: reviewer ? { id: reviewer.id, fullName: reviewer.fullName, avatar: reviewer.avatar, university: reviewer.university } : null,
      product: product ? { id: product.id, title: product.title, images: parseJson(product.images) } : null,
    });
  }

  const averageRating = await calculateAverageRating(sellerId, productId);

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
});

exports.getSellerRatingSummary = asyncHandler(async (req, res) => {
  const { sellerId } = req.params;
  const { productId } = req.query;

  const summary = await calculateAverageRating(sellerId, productId);

  res.json({
    success: true,
    data: summary,
  });
});

exports.getMyReviews = asyncHandler(async (req, res) => {
const { page = 1, limit = 10 } = req.query;

const pageNum = parseInt(page);
const limitNum = parseInt(limit);
const skip = (pageNum - 1) * limitNum;

const reviews = await db('reviews').find(
{ reviewer: req.user.id },
{ sort: { createdAt: -1 }, limit: limitNum, skip },
);
const count = await db('reviews').countDocuments({ reviewer: req.user.id });

const populatedReviews = [];
for (const r of reviews) {
const seller = await db('users').findById(r.seller);
const product = r.product ? await db('products').findById(r.product) : null;
populatedReviews.push({
...mapReviewRow(r),
seller: seller ? { id: seller.id, fullName: seller.fullName, avatar: seller.avatar, university: seller.university } : null,
product: product ? { id: product.id, title: product.title, images: parseJson(product.images) } : null,
});
}

res.json({
success: true,
data: {
reviews: populatedReviews,
total: count,
pages: Math.ceil(count / limitNum),
currentPage: pageNum,
},
});
});

exports.updateReview = asyncHandler(async (req, res) => {
const { rating, comment, detailedRatings } = req.body;

const review = await db('reviews').findById(req.params.id);

if (!review) {
throw new ApiError(404, 'Review not found');
}

if (review.reviewer !== req.user.id) {
throw new ApiError(403, 'Not authorized to update this review');
}

const updateData = {};
if (rating) {
if (rating < 1 || rating > 5) {
throw new ApiError(400, 'Rating must be between 1 and 5');
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

await db('reviews').updateById(review.id, updateData);

await updateSellerRating(review.seller);

const updatedReview = await db('reviews').findById(review.id);
const reviewer = await db('users').findById(updatedReview.reviewer);
const product = updatedReview.product ? await db('products').findById(updatedReview.product) : null;

res.json({
success: true,
message: 'Review updated successfully',
data: {
...mapReviewRow(updatedReview),
reviewer: reviewer ? { id: reviewer.id, fullName: reviewer.fullName, avatar: reviewer.avatar, university: reviewer.university } : null,
product: product ? { id: product.id, title: product.title, images: parseJson(product.images) } : null,
},
});
});

exports.deleteReview = asyncHandler(async (req, res) => {
const review = await db('reviews').findById(req.params.id);

if (!review) {
throw new ApiError(404, 'Review not found');
}

const isAdmin = req.user.role === 'admin';
const isOwner = review.reviewer === req.user.id;

if (!isOwner && !isAdmin) {
throw new ApiError(403, 'Not authorized to delete this review');
}

const sellerId = review.seller;
await db('reviews').deleteById(review.id);

await updateSellerRating(sellerId);

res.json({
success: true,
message: 'Review deleted successfully',
});
});

exports.markHelpful = asyncHandler(async (req, res) => {
const review = await db('reviews').findById(req.params.id);

if (!review) {
throw new ApiError(404, 'Review not found');
}

const votes = parseJson(review.helpfulVotes) || [];
if (!votes.includes(req.user.id)) {
votes.push(req.user.id);
await db('reviews').updateById(review.id, {
helpfulVotes: stringifyJson(votes),
});
}

res.json({
success: true,
message: 'Review marked as helpful',
data: { helpfulCount: votes.length },
});
});

exports.reportReview = asyncHandler(async (req, res) => {
const review = await db('reviews').findById(req.params.id);

if (!review) {
throw new ApiError(404, 'Review not found');
}

await db('reviews').updateById(review.id, {
reportCount: (review.reportCount || 0) + 1,
});

res.json({
success: true,
message: 'Review reported successfully',
});
});

exports.respondToReview = asyncHandler(async (req, res) => {
const { comment } = req.body;

if (!comment) {
throw new ApiError(400, 'Response comment is required');
}

const review = await db('reviews').findById(req.params.id);

if (!review) {
throw new ApiError(404, 'Review not found');
}

if (review.seller !== req.user.id) {
throw new ApiError(403, 'Only the seller can respond to this review');
}

await db('reviews').updateById(review.id, {
sellerResponse_comment: comment,
sellerResponse_respondedAt: new Date().toISOString(),
});

const updatedReview = await db('reviews').findById(review.id);

res.json({
success: true,
message: 'Response added successfully',
data: mapReviewRow(updatedReview),
});
});
