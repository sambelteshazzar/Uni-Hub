const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db, mapOrderRow, toBool, fromBool } = require('../utils/db');
const { notifyPaymentVerified } = require('../utils/notificationHelper');

exports.initializePayment = async (req, res) => {
  try {
    const { orderId, paymentMode } = req.body;

    if (!orderId || !paymentMode) {
      return res.status(400).json({
        success: false,
        error: 'Order ID and payment mode are required',
      });
    }

    const order = db('orders').findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    if (order.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to pay for this order',
      });
    }

    const mappedOrder = mapOrderRow(order);

    const payment = db('payments').create({
      orderId: order.id,
      userId: req.user.id,
      amount: mappedOrder.pricing.grandTotal,
      currency: 'GHS',
      mode: paymentMode,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Payment initialized',
      data: {
        paymentId: payment.id,
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

exports.verifyPayment = async (req, res) => {
  try {
    const { paymentId, transactionId } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment ID is required',
      });
    }

    const payment = db('payments').findById(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    if (payment.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    const txnId = transactionId || `txn_${Date.now()}`;
    db('payments').updateById(paymentId, {
      status: 'completed',
      transactionId: txnId,
      verifiedAt: new Date().toISOString(),
    });

    const order = db('orders').findById(payment.orderId);
    if (order) {
      db('orders').updateById(order.id, {
        payment_status: 'completed',
        payment_transactionId: txnId,
      });
    }

  const updatedPayment = db('payments').findById(paymentId);

  const io = req.app.get('io');
  notifyPaymentVerified(io, updatedPayment, order);

  res.json({
      success: true,
      message: 'Payment verified successfully',
      data: updatedPayment,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify payment',
    });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const payments = db('payments').find(
      { userId: req.user.id },
      { sort: { createdAt: -1 } },
    );

    const populatedPayments = payments.map(p => {
      const order = db('orders').findById(p.orderId);
      return {
        ...p,
        orderId: order ? { id: order.id, orderNumber: order.orderNumber, status: order.status } : p.orderId,
      };
    });

    res.json({
      success: true,
      data: {
        payments: populatedPayments,
        total: populatedPayments.length,
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

exports.getPayment = async (req, res) => {
  try {
    const payment = db('payments').findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    if (payment.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    const order = db('orders').findById(payment.orderId);
    const user = db('users').findById(payment.userId);

    const populatedPayment = {
      ...payment,
      orderId: order ? { id: order.id, orderNumber: order.orderNumber, pricing: mapOrderRow(order).pricing } : payment.orderId,
      userId: user ? { id: user.id, fullName: user.fullName, email: user.email } : payment.userId,
    };

    res.json({
      success: true,
      data: populatedPayment,
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch payment',
    });
  }
};

function getPaymentInstructions (paymentMode, order) {
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
