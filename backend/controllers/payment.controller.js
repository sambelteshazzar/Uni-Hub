const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db, mapOrderRow } = require('../utils/db');
const { notifyPaymentVerified } = require('../utils/notificationHelper');
const ledger = require('../utils/ledger');
const crypto = require('crypto');

exports.initializePayment = asyncHandler(async (req, res) => {
  const { orderId, paymentMode } = req.body;

  if (!orderId || !paymentMode) {
    throw new ApiError(400, 'Order ID and payment mode are required');
  }

  const order = await db('orders').findById(orderId);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.userId !== req.user.id) {
    throw new ApiError(403, 'Not authorized to pay for this order');
  }

  const mappedOrder = mapOrderRow(order);

  const payment = await db('payments').create({
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
});

exports.verifyPayment = asyncHandler(async (req, res) => {
  const { paymentId, transactionId } = req.body;

  if (!paymentId) {
    throw new ApiError(400, 'Payment ID is required');
  }

  if (!transactionId) {
    throw new ApiError(400, 'Transaction ID is required for verification');
  }

  const payment = await db('payments').findById(paymentId);

  if (!payment) {
    throw new ApiError(404, 'Payment not found');
  }

  if (payment.userId !== req.user.id) {
    throw new ApiError(403, 'Not authorized');
  }

  if (payment.status === 'completed') {
    throw new ApiError(400, 'Payment has already been verified');
  }

  const verified = await verifyTransactionWithProvider(payment, transactionId);
  if (!verified) {
    throw new ApiError(400, 'Transaction could not be verified with the payment provider');
  }

  await db('payments').updateById(paymentId, {
    status: 'completed',
    transactionId: transactionId,
    verifiedAt: new Date().toISOString(),
  });

  const order = await db('orders').findById(payment.orderId);
  if (order) {
    await db('orders').updateById(order.id, {
      payment_status: 'completed',
      payment_transactionId: transactionId,
    });
  }

  const updatedPayment = await db('payments').findById(paymentId);

  const io = req.app.get('io');
  notifyPaymentVerified(io, updatedPayment, order);

  res.json({
    success: true,
    message: 'Payment verified successfully',
    data: updatedPayment,
  });
});

exports.getPaymentHistory = asyncHandler(async (req, res) => {
  const payments = await db('payments').find(
    { userId: req.user.id },
    { sort: { createdAt: -1 } },
  );

  const populatedPayments = [];
  for (const p of payments) {
    const order = await db('orders').findById(p.orderId);
    populatedPayments.push({
      ...p,
      orderId: order ? { id: order.id, orderNumber: order.orderNumber, status: order.status } : p.orderId,
    });
  }

  res.json({
    success: true,
    data: {
      payments: populatedPayments,
      total: populatedPayments.length,
    },
  });
});

exports.getPayment = asyncHandler(async (req, res) => {
  const payment = await db('payments').findById(req.params.id);

  if (!payment) {
    throw new ApiError(404, 'Payment not found');
  }

  if (payment.userId !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized');
  }

  const order = await db('orders').findById(payment.orderId);
  const user = await db('users').findById(payment.userId);

  const populatedPayment = {
    ...payment,
    orderId: order ? { id: order.id, orderNumber: order.orderNumber, pricing: mapOrderRow(order).pricing } : payment.orderId,
    userId: user ? { id: user.id, fullName: user.fullName, email: user.email } : payment.userId,
  };

  res.json({
    success: true,
    data: populatedPayment,
  });
});

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
      accountName: 'JERTS CART Ghana',
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

async function verifyTransactionWithProvider (payment, transactionId) {
  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  if (payment.mode === 'momo' || payment.mode === 'telecel' || payment.mode === 'bank') {
    if (!PAYSTACK_SECRET_KEY) {
      console.error('PAYSTACK_SECRET_KEY not configured — payment verification skipped');
      return false;
    }
    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(transactionId)}`, {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      return data.status === true && data.data && data.data.status === 'success';
    } catch (err) {
      console.error('Paystack verification error:', err);
      return false;
    }
  }
  if (payment.mode === 'cash') {
    return false;
  }
  return false;
}

exports.handlePaystackWebhook = asyncHandler(async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error('PAYSTACK_SECRET_KEY not configured — webhook disabled');
    return res.status(503).send('Payment gateway not configured');
  }

  const hash = crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    console.warn('Paystack webhook: invalid signature');
    return res.status(400).send('Invalid signature');
  }

  const event = req.body;
  if (event.event === 'charge.success') {
    const data = event.data;
    const reference = data.reference;
    const amount = data.amount / 100; // pesewas to GHS
    const channel = data.channel;
    const paidAt = data.paid_at;

    const payment = await db('payments').findOne({ transactionId: reference });

    if (!payment) {
      console.warn(`Paystack webhook: payment not found for reference ${reference}`);
      return res.status(404).send('Payment not found');
    }

    if (payment.status === 'completed') {
      console.info(`Paystack webhook: payment ${payment.id} already completed`);
      return res.status(200).send('OK');
    }

    if (Math.abs(payment.amount - amount) > 0.01) {
      console.error(`Paystack webhook: amount mismatch for ${reference}. Expected ${payment.amount}, got ${amount}`);
      return res.status(400).send('Amount mismatch');
    }

    await db('payments').updateById(payment.id, {
      status: 'completed',
      transactionId: reference,
      verifiedAt: new Date().toISOString(),
      providerData: JSON.stringify({ channel, paidAt, ...data }),
    });

    const order = await db('orders').findById(payment.orderId);
    if (order) {
      await db('orders').updateById(order.id, {
        payment_status: 'completed',
        payment_transactionId: reference,
        status: 'confirmed',
      });

      // Ledger capture (escrow) — mirrors completePayment. Idempotent per
      // order inside the ledger service.
      const webhookItems = await db('order_items').find({ orderId: order.id });
      await ledger.recordEscrowedSale(order.id, webhookItems);

      const io = req.app.get('io');
      if (io) {
        io.to(`user_${payment.userId}`).emit('payment:completed', {
          paymentId: payment.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
        });
      }

      notifyPaymentVerified(io, await db('payments').findById(payment.id), order);
    }

    console.info(`Paystack webhook: payment ${payment.id} verified via webhook`);
  }

  res.status(200).send('OK');
});

exports.refundPayment = asyncHandler(async (req, res) => {
  const { paymentId, reason } = req.body;

  if (!paymentId || !reason) {
    throw new ApiError(400, 'Payment ID and reason are required');
  }

  const payment = await db('payments').findById(paymentId);
  if (!payment) {
    throw new ApiError(404, 'Payment not found');
  }

  if (payment.status !== 'completed') {
    throw new ApiError(400, 'Only completed payments can be refunded');
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new ApiError(503, 'Payment gateway not configured');
  }

  try {
    const response = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction: payment.transactionId,
        amount: Math.round(payment.amount * 100),
        customer_note: reason,
        merchant_note: `Refund for payment ${paymentId}`,
      }),
    });

    const data = await response.json();

    if (data.status === true) {
      await db('payments').updateById(paymentId, {
        status: 'refunded',
        refundedAt: new Date().toISOString(),
        refundReason: reason,
        providerRefundData: JSON.stringify(data.data),
      });

      const order = await db('orders').findById(payment.orderId);
      if (order) {
        await db('orders').updateById(order.id, {
          payment_status: 'refunded',
          status: 'refunded',
        });
      }

      const io = req.app.get('io');
      if (io) {
        io.to(`user_${payment.userId}`).emit('payment:refunded', {
          paymentId: payment.id,
          orderId: payment.orderId,
        });
      }

      return res.json({
        success: true,
        message: 'Refund processed successfully',
        data: { refundId: data.data.id },
      });
    }

    throw new ApiError(400, data.message || 'Refund failed');
  } catch (err) {
    console.error('Paystack refund error:', err);
    throw new ApiError(500, 'Refund processing failed');
  }
});
