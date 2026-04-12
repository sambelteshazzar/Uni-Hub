/**
 * ============================================
 * Admin Routes
 * Dashboard stats and admin operations
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
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
router.get('/stats', async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch stats',
    });
  }
});

/**
 * @desc    Get all products (admin view)
 * @route   GET /api/admin/products
 */
router.get('/products', async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Get admin products error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch products',
    });
  }
});

/**
 * @desc    Get all orders (admin view)
 * @route   GET /api/admin/orders
 */
router.get('/orders', async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Get admin orders error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch orders',
    });
  }
});

module.exports = router;
