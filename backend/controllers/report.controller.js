const { ApiError, asyncHandler } = require('../utils/errorHandler');
/**
 * ============================================
 * Report Controller
 * Generate reports and analytics
 * ============================================
 */

const Order = require('../models/Order.model');
const Product = require('../models/Product.model');
const User = require('../models/User.model');

/**
 * @desc    Get admin dashboard stats
 * @route   GET /api/reports/stats
 * @access  Private (admin only)
 */
exports.getDashboardStats = asyncHandler(async (req, res) => {
  // Get total counts
  const totalUsers = await User.countDocuments();
  const totalProducts = await Product.countDocuments();
  const totalOrders = await Order.countDocuments();

  // Get orders by status
  const ordersByStatus = await Order.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Get revenue (completed orders only)
  const revenueData = await Order.aggregate([
    { $match: { status: 'delivered' } },
    { $group: { _id: null, total: { $sum: '$pricing.grandTotal' } } },
  ]);

  // Get recent orders
  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('userId', 'fullName email');

  // Get top products
  const topProducts = await Product.find({ status: 'sold' })
    .sort({ createdAt: -1 })
    .limit(10);

  // Get user growth (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const newUsers = await User.countDocuments({
    createdAt: { $gte: sevenDaysAgo },
  });

  res.json({
    success: true,
    data: {
      overview: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue: revenueData[0]?.total || 0,
        newUsersLast7Days: newUsers,
      },
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      recentOrders,
      topProducts,
    },
  });
});

/**
 * @desc    Get sales report
 * @route   GET /api/reports/sales
 * @access  Private (admin only)
 */
exports.getSalesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;

  const dateQuery = {};
  if (startDate || endDate) {
    dateQuery.createdAt = {};
    if (startDate) {dateQuery.createdAt.$gte = new Date(startDate);}
    if (endDate) {dateQuery.createdAt.$lte = new Date(endDate);}
  }

  // Group by format
  let groupFormat;
  switch (groupBy) {
  case 'week':
    groupFormat = '%Y-%U';
    break;
  case 'month':
    groupFormat = '%Y-%m';
    break;
  default:
    groupFormat = '%Y-%m-%d';
  }

  const salesData = await Order.aggregate([
    { $match: dateQuery },
    {
      $group: {
        _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
        totalSales: { $sum: '$pricing.grandTotal' },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    success: true,
    data: {
      sales: salesData,
      period: { startDate, endDate, groupBy },
    },
  });
});

/**
 * @desc    Get product performance report
 * @route   GET /api/reports/products
 * @access  Private (admin only)
 */
exports.getProductReport = asyncHandler(async (req, res) => {
  const { category, university, status } = req.query;

  const query = {};
  if (category) {query.category = category;}
  if (university) {query.university = university;}
  if (status) {query.status = status;}

  const products = await Product.find(query)
    .populate('seller', 'fullName email rating')
    .sort({ createdAt: -1 });

  // Calculate stats
  const totalProducts = products.length;
  const soldProducts = products.filter(p => p.status === 'sold').length;
  const activeProducts = products.filter(p => p.status === 'active').length;

  res.json({
    success: true,
    data: {
      products,
      stats: {
        total: totalProducts,
        sold: soldProducts,
        active: activeProducts,
      },
    },
  });
});

/**
 * @desc    Get user activity report
 * @route   GET /api/reports/users
 * @access  Private (admin only)
 */
exports.getUserReport = asyncHandler(async (req, res) => {
  const { role, university, isVerified } = req.query;

  const query = {};
  if (role) {query.role = role;}
  if (university) {query.university = university;}
  if (isVerified !== undefined) {query.isVerified = isVerified === 'true';}

  const users = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: {
      users,
      total: users.length,
    },
  });
});
