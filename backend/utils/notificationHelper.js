const { db } = require('./db');
const {
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendPaymentVerifiedEmail,
  sendDeliveryStatusEmail,
  sendNewOrderEmail,
} = require('./emailService');

function createNotification (userId, type, title, message) {
  try {
    db('notifications').create({
      user: userId,
      type,
      title,
      message,
      icon: null,
      read: 0,
      expiresAt: null,
    });
  } catch (error) {
    console.error('Failed to create notification:', error.message);
  }
}

function emitToUser (io, userId, event, data) {
  if (!io) return;
  try {
    io.to(`user_${userId}`).emit(event, data);
  } catch (error) {
    console.error('Failed to emit socket event:', error.message);
  }
}

async function notifyOrderCreated (io, order, orderItems, buyerUser) {
  const orderNumber = order.orderNumber || order.id;

  createNotification(
    order.userId,
    'order',
    'Order Placed',
    `Your order #${orderNumber} has been placed successfully!`,
  );
  emitToUser(io, order.userId, 'order_status_changed', {
    orderId: order.id,
    orderNumber,
    status: order.status,
    type: 'order_created',
  });

  if (buyerUser && buyerUser.email) {
    sendOrderConfirmationEmail(buyerUser.email, {
      orderNumber,
      _id: order.id,
      pricing: { grandTotal: order.pricing_grandTotal },
      delivery: { mode: order.delivery_mode },
      payment: { mode: order.payment_mode },
    });
  }

  const sellerIds = new Set();
  for (const item of orderItems) {
    const sellerId = item.seller;
    if (sellerId && sellerId !== order.userId) {
      sellerIds.add(sellerId);
    }
  }

  for (const sellerId of sellerIds) {
    const sellerUser = db('users').findById(sellerId);
    if (sellerUser) {
      createNotification(
        sellerId,
        'order',
        'New Order Received',
        `You have a new order #${orderNumber}. Please confirm and process it.`,
      );
      emitToUser(io, sellerId, 'order_status_changed', {
        orderId: order.id,
        orderNumber,
        status: order.status,
        type: 'seller_new_order',
      });

      if (sellerUser.email) {
        sendNewOrderEmail(sellerUser.email, {
          orderNumber,
          _id: order.id,
          customer_name: order.customer_name,
          pricing: { grandTotal: order.pricing_grandTotal },
          delivery: { mode: order.delivery_mode },
        });
      }
    }
  }
}

async function notifyOrderStatusChanged (io, order, newStatus, updatedByUser) {
  const orderNumber = order.orderNumber || order.id;
  const statusLabels = {
    confirmed: 'confirmed',
    'in-transit': 'is now in transit',
    delivered: 'has been delivered',
    cancelled: 'has been cancelled',
    pending: 'is pending',
    placed: 'has been placed',
  };
  const statusText = statusLabels[newStatus] || `updated to ${newStatus}`;

  createNotification(
    order.userId,
    'order',
    'Order Status Updated',
    `Your order #${orderNumber} ${statusText}.`,
  );
  emitToUser(io, order.userId, 'order_status_changed', {
    orderId: order.id,
    orderNumber,
    status: newStatus,
    type: 'order_status_update',
  });

  const buyerUser = db('users').findById(order.userId);
  if (buyerUser && buyerUser.email) {
    sendOrderStatusEmail(buyerUser.email, {
      orderNumber,
      _id: order.id,
      status: newStatus,
      pricing: { grandTotal: order.pricing_grandTotal },
    });
  }

  const orderItems = db('order_items').find({ orderId: order.id });
  const sellerIds = new Set();
  for (const item of orderItems) {
    if (item.seller && item.seller !== order.userId) {
      sellerIds.add(item.seller);
    }
  }
  for (const sellerId of sellerIds) {
    createNotification(
      sellerId,
      'order',
      'Order Status Updated',
      `Order #${orderNumber} ${statusText}.`,
    );
    emitToUser(io, sellerId, 'order_status_changed', {
      orderId: order.id,
      orderNumber,
      status: newStatus,
      type: 'seller_order_status_update',
    });
  }
}

async function notifyPaymentCompleted (io, order) {
  const orderNumber = order.orderNumber || order.id;

  createNotification(
    order.userId,
    'payment',
    'Payment Completed',
    `Payment for order #${orderNumber} has been completed.`,
  );
  emitToUser(io, order.userId, 'payment_status_changed', {
    orderId: order.id,
    orderNumber,
    paymentStatus: 'completed',
    type: 'payment_completed',
  });
}

async function notifyPaymentVerified (io, payment, order) {
  const orderNumber = order.orderNumber || order.id;

  createNotification(
    payment.userId,
    'payment',
    'Payment Verified',
    `Your payment of GHS ${payment.amount} for order #${orderNumber} has been verified.`,
  );
  emitToUser(io, payment.userId, 'payment_status_changed', {
    orderId: order.id,
    orderNumber,
    paymentStatus: 'completed',
    paymentId: payment.id,
    type: 'payment_verified',
  });

  const paymentUser = db('users').findById(payment.userId);
  if (paymentUser && paymentUser.email) {
    sendPaymentVerifiedEmail(paymentUser.email, {
      amount: payment.amount,
      mode: payment.mode,
      transactionId: payment.transactionId,
    });
  }
}

async function notifyOrderCancelled (io, order) {
  const orderNumber = order.orderNumber || order.id;

  createNotification(
    order.userId,
    'order',
    'Order Cancelled',
    `Your order #${orderNumber} has been cancelled.`,
  );
  emitToUser(io, order.userId, 'order_status_changed', {
    orderId: order.id,
    orderNumber,
    status: 'cancelled',
    type: 'order_cancelled',
  });

  const buyerUser = db('users').findById(order.userId);
  if (buyerUser && buyerUser.email) {
    sendOrderStatusEmail(buyerUser.email, {
      orderNumber,
      _id: order.id,
      status: 'cancelled',
      pricing: { grandTotal: order.pricing_grandTotal },
    });
  }

  const orderItems = db('order_items').find({ orderId: order.id });
  const sellerIds = new Set();
  for (const item of orderItems) {
    if (item.seller && item.seller !== order.userId) {
      sellerIds.add(item.seller);
    }
  }
  for (const sellerId of sellerIds) {
    createNotification(
      sellerId,
      'order',
      'Order Cancelled',
      `Order #${orderNumber} has been cancelled by the buyer.`,
    );
    emitToUser(io, sellerId, 'order_status_changed', {
      orderId: order.id,
      orderNumber,
      status: 'cancelled',
      type: 'seller_order_cancelled',
    });
  }
}

async function notifyDeliveryCreated (io, delivery) {
  const deliveryNumber = delivery.deliveryNumber || delivery.id;

  const userId = typeof delivery.userId === 'string' ? delivery.userId : delivery.userId?.id;
  createNotification(
    userId,
    'delivery',
    'Delivery Created',
    `A delivery record has been created for your order. Tracking #${deliveryNumber}.`,
  );
  emitToUser(io, userId, 'delivery_status_changed', {
    deliveryId: delivery.id,
    deliveryNumber,
    status: 'pending',
    type: 'delivery_created',
  });
}

async function notifyDeliveryStatusChanged (io, delivery) {
  const deliveryNumber = delivery.deliveryNumber || delivery.id;
  const statusLabels = {
    pending: 'is being prepared',
    processing: 'is being processed',
    'picked-up': 'has been picked up',
    'in-transit': 'is in transit',
    delivered: 'has been delivered',
    cancelled: 'has been cancelled',
    failed: 'delivery failed',
  };
  const statusText = statusLabels[delivery.status] || `updated to ${delivery.status}`;

  const userId = typeof delivery.userId === 'string' ? delivery.userId : delivery.userId?.id;
  createNotification(
    userId,
    'delivery',
    'Delivery Update',
    `Your delivery #${deliveryNumber} ${statusText}.`,
  );
  emitToUser(io, userId, 'delivery_status_changed', {
    deliveryId: delivery.id,
    deliveryNumber,
    status: delivery.status,
    type: 'delivery_status_update',
  });

  const deliveryUser = db('users').findById(userId);
  if (deliveryUser && deliveryUser.email) {
    sendDeliveryStatusEmail(deliveryUser.email, {
      deliveryNumber,
      _id: delivery.id,
      status: delivery.status,
      mode: delivery.mode,
      address: delivery.address,
    });
  }
}

module.exports = {
  createNotification,
  emitToUser,
  notifyOrderCreated,
  notifyOrderStatusChanged,
  notifyPaymentCompleted,
  notifyPaymentVerified,
  notifyOrderCancelled,
  notifyDeliveryCreated,
  notifyDeliveryStatusChanged,
};
