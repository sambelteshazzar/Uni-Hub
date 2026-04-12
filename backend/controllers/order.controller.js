const { ApiError, asyncHandler } = require('../utils/errorHandler');
/**
 * ============================================
 * Order Controller
 * Create, update, and manage orders
 * ============================================
 */

const Order = require('../models/Order.model');
const Product = require('../models/Product.model');

/**
 * @desc    Create new order
 * @route   POST /api/orders
 * @access  Private
 */
exports.createOrder = async (req, res) => {
  try {
    const { items, delivery, payment } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Order must contain at least one item',
      });
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.price * item.quantity;
    }

    const deliveryFee = delivery.mode === 'inperson' ? 0 : delivery.mode === 'yango' ? 12 : 15;
    const grandTotal = subtotal + deliveryFee;

    // Create order
    const order = await Order.create({
      userId: req.user._id,
      customer: {
        name: req.user.fullName,
        email: req.user.email,
        phone: req.user.phone,
        university: req.user.university,
      },
      items,
      pricing: {
        subtotal,
        deliveryFee,
        grandTotal,
      },
      delivery,
      payment,
    });

    // Update product status if sold
    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, {
        status: 'sold',
      });
    }

    // Update user's total orders
    req.user.totalOrders += 1;
    await req.user.save();

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order.getPublicOrder(),
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create order',
    });
  }
};

/**
 * @desc    Get user's orders
 * @route   GET /api/orders/my-orders
 * @access  Private
 */
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.productId', 'title images');

    res.json({
      success: true,
      data: {
        orders,
        total: orders.length,
      },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch orders',
    });
  }
};

/**
 * @desc    Get single order
 * @route   GET /api/orders/:id
 * @access  Private
 */
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'fullName email')
      .populate('items.productId', 'title images')
      .populate('items.seller', 'fullName email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Check ownership or admin
    if (order.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this order',
      });
    }

    res.json({
      success: true,
      data: order.getPublicOrder(),
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch order',
    });
  }
};

/**
 * @desc    Update order status
 * @route   PUT /api/orders/:id/status
 * @access  Private (admin only)
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    await order.updateStatus(status, note);

    res.json({
      success: true,
      message: 'Order status updated',
      data: order.getPublicOrder(),
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update order',
    });
  }
};

/**
 * @desc    Complete payment
 * @route   POST /api/orders/:id/payment
 * @access  Private
 */
exports.completePayment = async (req, res) => {
  try {
    const { transactionId } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Check ownership
    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    await order.completePayment(transactionId || `txn_${Date.now()}`);

    res.json({
      success: true,
      message: 'Payment completed',
      data: order.getPublicOrder(),
    });
  } catch (error) {
    console.error('Complete payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to complete payment',
    });
  }
};

/**
 * @desc    Cancel order
 * @route   PUT /api/orders/:id/cancel
 * @access  Private
 */
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Check ownership
    if (order.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel a delivered order',
      });
    }

    await order.updateStatus('cancelled', 'Order cancelled by user');

    // Reactivate products
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, { status: 'active' });
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel order',
    });
  }
};
