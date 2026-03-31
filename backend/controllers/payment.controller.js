/**
 * ============================================
 * Payment Controller
 * Handle payment processing and verification
 * ============================================
 */

const Order = require('../models/Order.model');
const Payment = require('../models/Payment.model');

/**
 * @desc    Initialize payment
 * @route   POST /api/payment
 * @access  Private
 */
exports.initializePayment = async (req, res) => {
  try {
    const { orderId, paymentMode } = req.body;

    if (!orderId || !paymentMode) {
      return res.status(400).json({
        success: false,
        error: 'Order ID and payment mode are required',
      });
    }

    const order = await Order.findById(orderId);

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
        error: 'Not authorized to pay for this order',
      });
    }

    // Create payment record
    const payment = await Payment.create({
      orderId: order._id,
      userId: req.user._id,
      amount: order.pricing.grandTotal,
      currency: 'GHS',
      mode: paymentMode,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Payment initialized',
      data: {
        paymentId: payment._id,
        amount: payment.amount,
        mode: payment.mode,
        instructions: getPaymentInstructions(paymentMode, order),
      },
    });
  } catch (error) {
    console.error('Initialize payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initialize payment',
    });
  }
};

/**
 * @desc    Verify payment
 * @route   POST /api/payment/verify
 * @access  Private
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { paymentId, transactionId } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment ID is required',
      });
    }

    const payment = await Payment.findById(paymentId).populate('orderId');

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    // Check ownership
    if (payment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    // Update payment status
    payment.status = 'completed';
    payment.transactionId = transactionId || `txn_${Date.now()}`;
    payment.verifiedAt = new Date();
    await payment.save();

    // Update order payment status
    const order = payment.orderId;
    order.payment.status = 'completed';
    order.payment.transactionId = payment.transactionId;
    await order.save();

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: payment,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify payment',
    });
  }
};

/**
 * @desc    Get payment history
 * @route   GET /api/payment/history
 * @access  Private
 */
exports.getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .populate('orderId', 'orderNumber status')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        payments,
        total: payments.length,
      },
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch payment history',
    });
  }
};

/**
 * @desc    Get payment by ID
 * @route   GET /api/payment/:id
 * @access  Private
 */
exports.getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('orderId', 'orderNumber pricing')
      .populate('userId', 'fullName email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    // Check ownership or admin
    if (payment.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch payment',
    });
  }
};

/**
 * Helper: Get payment instructions based on mode
 */
function getPaymentInstructions(paymentMode, order) {
  switch (paymentMode) {
    case 'momo':
      return {
        message: 'Enter your MoMo number to complete payment',
        provider: 'MTN Mobile Money',
      };
    case 'telecel':
      return {
        message: 'Enter your Telecel number to complete payment',
        provider: 'Telecel Cash',
      };
    case 'bank':
      return {
        message: 'Transfer to the following account',
        bankName: 'GCB Bank',
        accountName: 'Uni-Hub Ghana',
        accountNumber: '1234567890',
        reference: order.orderNumber,
      };
    case 'cash':
      return {
        message: 'Pay when you receive your items',
      };
    default:
      return {
        message: 'Follow the payment instructions',
      };
  }
}
