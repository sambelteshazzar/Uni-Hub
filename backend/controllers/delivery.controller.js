const { ApiError, asyncHandler } = require('../utils/errorHandler');
/**
 * ============================================
 * Delivery Controller
 * Handle delivery tracking and management
 * ============================================
 */

const Delivery = require('../models/Delivery.model');
const Order = require('../models/Order.model');

/**
 * @desc    Create delivery record
 * @route   POST /api/delivery
 * @access  Private
 */
exports.createDelivery = async (req, res) => {
  try {
    const { orderId, mode, address, instructions } = req.body;

    if (!orderId || !mode) {
      return res.status(400).json({
        success: false,
        error: 'Order ID and delivery mode are required',
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Check ownership or admin
    if (order.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    const delivery = await Delivery.create({
      orderId: order._id,
      userId: req.user._id,
      mode,
      address,
      instructions,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Delivery record created',
      data: delivery,
    });
  } catch (error) {
    console.error('Create delivery error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create delivery',
    });
  }
};

/**
 * @desc    Get delivery by order ID
 * @route   GET /api/delivery/order/:orderId
 * @access  Private
 */
exports.getDeliveryByOrder = async (req, res) => {
  try {
    const delivery = await Delivery.findOne({ orderId: req.params.orderId })
      .populate('orderId', 'orderNumber status')
      .populate('userId', 'fullName email phone');

    if (!delivery) {
      return res.status(404).json({
        success: false,
        error: 'Delivery record not found',
      });
    }

    // Check ownership or admin
    if (delivery.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    res.json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    console.error('Get delivery error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch delivery',
    });
  }
};

/**
 * @desc    Update delivery status
 * @route   PUT /api/delivery/:id/status
 * @access  Private (admin/delivery only)
 */
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { status, location, note } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
      });
    }

    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        error: 'Delivery not found',
      });
    }

    await delivery.updateStatus(status, note);

    if (location) {
      delivery.location = location;
      await delivery.save();
    }

    res.json({
      success: true,
      message: 'Delivery status updated',
      data: delivery,
    });
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update delivery',
    });
  }
};

/**
 * @desc    Get user's deliveries
 * @route   GET /api/delivery/my-deliveries
 * @access  Private
 */
exports.getMyDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find({ userId: req.user._id })
      .populate('orderId', 'orderNumber status')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        deliveries,
        total: deliveries.length,
      },
    });
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch deliveries',
    });
  }
};

/**
 * @desc    Get all deliveries (admin only)
 * @route   GET /api/delivery
 * @access  Private (admin only)
 */
exports.getAllDeliveries = async (req, res) => {
  try {
    const { status, mode, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) { query.status = status; }
    if (mode) { query.mode = mode; }

    const deliveries = await Delivery.find(query)
      .populate('orderId', 'orderNumber customer')
      .populate('userId', 'fullName email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Delivery.countDocuments(query);

    res.json({
      success: true,
      data: {
        deliveries,
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: page,
      },
    });
  } catch (error) {
    console.error('Get all deliveries error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch deliveries',
    });
  }
};
