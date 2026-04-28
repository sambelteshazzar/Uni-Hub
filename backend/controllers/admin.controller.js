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
const ActivityLog = require('../models/ActivityLog.model');
const { ApiError } = require('../utils/errorHandler');
const logActivity = require('../utils/logActivity');

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

  await logActivity('admin_approve', req.user, { productId: product._id, title: product.title }, 'info', req);

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

  await logActivity('admin_reject', req.user, { productId: product._id, title: product.title, reason }, 'warning', req);

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

  await logActivity('admin_ban', req.user, { targetUserId: user._id, targetEmail: user.email, action, reason: reason || null }, action === 'ban' ? 'critical' : 'info', req);

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

exports.getActivityLogs = async (req, res) => {
  const { action, severity, userId, startDate, endDate, page = 1, limit = 50 } = req.query;

  const query = {};
  if (action) { query.action = action; }
  if (severity) { query.severity = severity; }
  if (userId) { query.user = userId; }
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) { query.createdAt.$gte = new Date(startDate); }
    if (endDate) { query.createdAt.$lte = new Date(endDate); }
  }

  const logs = await ActivityLog.find(query)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip((page - 1) * limit);

  const total = await ActivityLog.countDocuments(query);

  res.json({
    success: true,
    data: {
      logs,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    },
  });
};

exports.getActivityStats = async (req, res) => {
  const stats = await ActivityLog.getStats();
  const result = stats.length > 0 ? stats[0] : { totalToday: 0, totalThisWeek: 0, byAction: {}, bySeverity: {} };

  res.json({
    success: true,
    data: result,
  });
};

exports.getOnlineUsers = async (req, res) => {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recentLogins = await ActivityLog.find({ action: 'login', createdAt: { $gte: fiveMinAgo } })
    .sort({ createdAt: -1 })
    .select('user userName userEmail university createdAt');

  const seen = new Set();
  const onlineUsers = recentLogins.filter(l => {
    if (seen.has(l.user?.toString())) { return false; }
    seen.add(l.user?.toString());
    return true;
  });

  res.json({
    success: true,
    data: {
      onlineCount: onlineUsers.length,
      users: onlineUsers,
    },
  });
};

exports.adminCreateProduct = async (req, res) => {
  const { title, description, price, category, condition, images, deliveryModes, paymentModes, university } = req.body;

  const product = await Product.create({
    title,
    description,
    price,
    category,
    condition,
    images: images || [],
    deliveryModes: deliveryModes || [],
    paymentModes: paymentModes || [],
    seller: req.user._id,
    sellerName: req.user.fullName,
    sellerRating: req.user.rating,
    university: university || req.user.university,
    status: 'active',
    approvedBy: req.user._id,
  });

  await logActivity('product_create', req.user, { productId: product._id, title: product.title, adminCreated: true }, 'info', req);

  res.status(201).json({
    success: true,
    message: 'Product created by admin',
    data: product.getPublicProduct(),
  });
};

exports.adminUpdateProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const allowedFields = ['title', 'description', 'price', 'category', 'condition', 'images', 'deliveryModes', 'paymentModes', 'status', 'university'];
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      product[field] = req.body[field];
    }
  });

  await product.save();

  await logActivity('product_update', req.user, { productId: product._id, title: product.title, adminUpdated: true }, 'info', req);

  res.json({
    success: true,
    message: 'Product updated by admin',
    data: product.getPublicProduct(),
  });
};

exports.adminDeleteProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  await product.deleteOne();

  await logActivity('product_delete', req.user, { productId: req.params.id, title: product.title, adminDeleted: true }, 'warning', req);

  res.json({
    success: true,
    message: 'Product deleted by admin',
  });
};
