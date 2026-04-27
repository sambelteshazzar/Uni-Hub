/**
 * ============================================
 * Admin Controller
 * Handles dashboard stats and admin operations
 * ============================================
 */

const User = require('../models/User.model');
const Product = require('../models/Product.model');
const Order = require('../models/Order.model');
const StudentVerification = require('../models/StudentVerification.model');
const { ApiError } = require('../utils/errorHandler');

exports.getDashboardStats = async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalProducts = await Product.countDocuments();
  const totalOrders = await Order.countDocuments();

  const pendingVerifications = await StudentVerification.countDocuments({ status: 'pending' });

  const revenueResult = await Order.aggregate([
    { $match: { 'payment.status': 'completed' } },
    { $group: { _id: null, totalRevenue: { $sum: '$pricing.grandTotal' } } },
  ]);
  const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

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
};

exports.getAdminProducts = async (req, res) => {
  const { status, university, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status) { query.status = status; }
  if (university) { query.university = university; }

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
};

exports.getAdminOrders = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status) { query.status = status; }

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
};

exports.approveProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  product.status = 'active';
  product.approvedBy = req.user._id;
  product.moderationNote = req.body.note || product.moderationNote || 'Approved by admin';

  await product.save();

  res.json({
    success: true,
    message: 'Product approved successfully',
    data: product,
  });
};

exports.rejectProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const reason = req.body.reason;
  if (!reason || reason.trim().length < 5) {
    throw new ApiError(400, 'Rejection reason must be at least 5 characters');
  }

  product.status = 'rejected';
  product.approvedBy = req.user._id;
  product.moderationNote = reason;

  await product.save();

  res.json({
    success: true,
    message: 'Product rejected successfully',
    data: product,
  });
};

exports.banUser = async (req, res) => {
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
};

exports.getBannedUsers = async (req, res) => {
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
};
