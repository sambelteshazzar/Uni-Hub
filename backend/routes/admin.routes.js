/**
 * ============================================
 * Admin Routes
 * Dashboard stats and admin operations
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { asyncHandler, ApiError } = require('../utils/errorHandler');
const User = require('../models/User.model');
const Product = require('../models/Product.model');
const Order = require('../models/Order.model');

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/admin/stats
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalProducts = await Product.countDocuments();
  const totalOrders = await Order.countDocuments();

  const pendingVerifications = await require('../models/StudentVerification.model')
    .countDocuments({ status: 'pending' });

  // Revenue calculation (completed orders)
  const completedOrders = await Order.find({ 'payment.status': 'completed' });
  const totalRevenue = completedOrders.reduce((sum, order) => {
    return sum + order.pricing.grandTotal;
  }, 0);

  // Recent orders
  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('userId', 'fullName email');

  res.json({
    success: true,
    data: {
      summary: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue,
        pendingVerifications,
      },
      recentOrders,
    },
  });
}));

/**
 * @desc    Get all products (admin view)
 * @route   GET /api/admin/products
 */
router.get('/products', asyncHandler(async (req, res) => {
  const { status, university, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status) {query.status = status;}
  if (university) {query.university = university;}

  const products = await Product.find(query)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip((page - 1) * limit)
    .populate('seller', 'fullName email university');

  const total = await Product.countDocuments(query);

  res.json({
    success: true,
    data: {
      products,
      total,
      page: Number(page),
    },
  });
}));

/**
 * @desc    Get all orders (admin view)
 * @route   GET /api/admin/orders
 */
router.get('/orders', asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status) {query.status = status;}

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip((page - 1) * limit)
    .populate('userId', 'fullName email phone');

  const total = await Order.countDocuments(query);

  res.json({
    success: true,
    data: {
      orders,
      total,
      page: Number(page),
    },
  });
}));

/**
 * @desc    Approve a product listing
 * @route   PUT /api/admin/products/:id/approve
 */
router.put('/products/:id/approve', asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Update product status to active and record admin approval
  product.status = 'active';
  product.approvedBy = req.user._id;
  product.moderationNote = req.body.note || product.moderationNote || 'Approved by admin';

  await product.save();

  res.json({
    success: true,
    message: 'Product approved successfully',
    data: product,
  });
}));

/**
 * @desc    Reject a product listing
 * @route   PUT /api/admin/products/:id/reject
 */
router.put('/products/:id/reject', asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Reject requires a reason
  const reason = req.body.reason;
  if (!reason || reason.trim().length < 5) {
    throw new ApiError(400, 'Rejection reason must be at least 5 characters');
  }

  // Update product status to rejected and record reason
  product.status = 'rejected';
  product.approvedBy = req.user._id;
  product.moderationNote = reason;

  await product.save();

  res.json({
    success: true,
    message: 'Product rejected successfully',
    data: product,
  });
}));

/**
 * @desc    Ban/suspend a user
 * @route   PUT /api/admin/users/:id/ban
 * @access  Admin only
 */
router.put('/users/:id/ban', asyncHandler(async (req, res) => {
  const { reason, action } = req.body;

  if (!action || !['ban', 'unban'].includes(action)) {
    throw new ApiError(400, 'Action must be "ban" or "unban"');
  }

  if (action === 'ban' && (!reason || reason.trim().length < 5)) {
    throw new ApiError(400, 'Ban reason must be at least 5 characters');
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Prevent admins from banning themselves or other admins
  if (user.role === 'admin') {
    throw new ApiError(403, 'Cannot ban another admin user');
  }

  if (action === 'ban') {
    user.isSuspended = true;
    user.isActive = false;
    user.banReason = reason;
    user.bannedAt = new Date();
    user.bannedBy = req.user._id;
  } else {
    user.isSuspended = false;
    user.isActive = true;
    user.banReason = undefined;
    user.bannedAt = undefined;
    user.bannedBy = undefined;
  }

  await user.save();

  res.json({
    success: true,
    message: action === 'ban' ? 'User has been banned successfully' : 'User has been unbanned successfully',
    data: {
      userId: user._id,
      fullName: user.fullName,
      email: user.email,
      isSuspended: user.isSuspended,
      isActive: user.isActive,
      banReason: user.banReason,
      bannedAt: user.bannedAt,
    },
  });
}));

/**
 * @desc    Get all banned/suspended users
 * @route   GET /api/admin/users/banned
 * @access  Admin only
 */
router.get('/users/banned', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const bannedUsers = await User.find({ isSuspended: true })
    .select('fullName email university role banReason bannedAt bannedBy rating createdAt')
    .populate('bannedBy', 'fullName')
    .sort({ bannedAt: -1 })
    .limit(Number(limit))
    .skip((page - 1) * limit);

  const total = await User.countDocuments({ isSuspended: true });

  res.json({
    success: true,
    data: {
      users: bannedUsers,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    },
  });
}));

module.exports = router;
