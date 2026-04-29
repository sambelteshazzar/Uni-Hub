const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db, generateId, parseJson, mapOrderRow, toBool, fromBool } = require('../utils/db');
const { notifyOrderCreated, notifyOrderStatusChanged, notifyPaymentCompleted, notifyOrderCancelled } = require('../utils/notificationHelper');

function getPublicOrder (order) {
  if (!order) return null;
  const mapped = mapOrderRow(order);
  return {
    ...mapped,
    _id: mapped.id,
    items: order._items || [],
  };
}

exports.createOrder = async (req, res) => {
  try {
    const { items, delivery, payment } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Order must contain at least one item',
      });
    }

    if (!delivery || !delivery.mode) {
      return res.status(400).json({
        success: false,
        error: 'Delivery information is required',
      });
    }

    if (!payment || !payment.mode) {
      return res.status(400).json({
        success: false,
        error: 'Payment information is required',
      });
    }

    const productIds = items.map(item => item.productId);
    const dbProducts = db('products').find({ id: { $in: productIds } });

    if (dbProducts.length !== items.length) {
      return res.status(400).json({
        success: false,
        error: 'One or more products not found',
      });
    }

    const productMap = new Map(dbProducts.map(p => [p.id, p]));

    let subtotal = 0;
    const verifiedItems = [];
    for (const item of items) {
      const dbProduct = productMap.get(item.productId);
      if (!dbProduct) {
        return res.status(400).json({
          success: false,
          error: `Product ${item.productId} not found`,
        });
      }
      if (dbProduct.status === 'sold') {
        return res.status(400).json({
          success: false,
          error: `Product "${dbProduct.title}" is no longer available`,
        });
      }
      const images = parseJson(dbProduct.images) || [];
      subtotal += dbProduct.price * item.quantity;
      const sellerUser = db('users').findById(dbProduct.seller);
      verifiedItems.push({
        productId: item.productId,
        title: dbProduct.title,
        price: dbProduct.price,
        quantity: item.quantity,
        seller: dbProduct.seller,
        sellerName: sellerUser ? sellerUser.fullName : '',
        image: item.image || (images && images[0]) || '',
      });
    }

    const deliveryFee = delivery.mode === 'inperson' ? 0 : delivery.mode === 'yango' ? 12 : 15;
    const grandTotal = subtotal + deliveryFee;

    const order = db('orders').create({
      userId: req.user.id,
      customer_name: req.user.fullName,
      customer_email: req.user.email,
      customer_phone: req.user.phone || '',
      customer_university: req.user.university || '',
      pricing_subtotal: subtotal,
      pricing_deliveryFee: deliveryFee,
      pricing_grandTotal: grandTotal,
      pricing_currency: 'GHS',
      delivery_mode: delivery.mode,
      delivery_address: delivery.address || '',
      delivery_instructions: delivery.instructions || '',
      delivery_status: 'pending',
      payment_mode: payment.mode,
      payment_status: 'pending',
      payment_transactionId: '',
      payment_paidAt: '',
      status: 'pending',
      orderNumber: `ORD-${Date.now()}`,
    });

    for (const vItem of verifiedItems) {
      db('order_items').create({
        orderId: order.id,
        productId: vItem.productId,
        title: vItem.title,
        price: vItem.price,
        quantity: vItem.quantity,
        seller: vItem.seller,
        sellerName: vItem.sellerName,
        image: vItem.image,
      });
    }

    for (const pid of productIds) {
      db('products').updateById(pid, { status: 'sold' });
    }

    db('users').updateById(req.user.id, {
      totalOrders: (req.user.totalOrders || 0) + 1,
    });

  const createdOrder = db('orders').findById(order.id);
  const orderItems = db('order_items').find({ orderId: order.id });
  createdOrder._items = orderItems;

  const io = req.app.get('io');
  notifyOrderCreated(io, createdOrder, orderItems, req.user);

  res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: getPublicOrder(createdOrder),
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create order',
    });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = db('orders').find(
      { userId: req.user.id },
      { sort: { createdAt: -1 } },
    );

    const populatedOrders = orders.map(order => {
      const items = db('order_items').find({ orderId: order.id });
      order._items = items;
      return getPublicOrder(order);
    });

    res.json({
      success: true,
      data: {
        orders: populatedOrders,
        total: populatedOrders.length,
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

exports.getOrder = async (req, res) => {
  try {
    const order = db('orders').findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    if (order.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this order',
      });
    }

    const items = db('order_items').find({ orderId: order.id });
    order._items = items;

    const user = db('users').findById(order.userId);
    order.userId = user ? { id: user.id, fullName: user.fullName, email: user.email } : order.userId;

    for (const item of items) {
      const seller = db('users').findById(item.seller);
      item.seller = seller ? { id: seller.id, fullName: seller.fullName, email: seller.email, phone: seller.phone } : item.seller;
    }

    res.json({
      success: true,
      data: getPublicOrder(order),
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch order',
    });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
      });
    }

    const order = db('orders').findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    db('orders').updateById(order.id, {
      status,
    });

  db('order_status_history').create({
  orderId: order.id,
  status,
  note: note || '',
  updatedBy: req.user.id,
  });

  const updatedOrder = db('orders').findById(order.id);
  const items = db('order_items').find({ orderId: order.id });
  updatedOrder._items = items;

  const io = req.app.get('io');
  notifyOrderStatusChanged(io, updatedOrder, status, req.user);

  res.json({
  success: true,
  message: 'Order status updated',
      data: getPublicOrder(updatedOrder),
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update order',
    });
  }
};

exports.completePayment = async (req, res) => {
  try {
    const { transactionId } = req.body;

    const order = db('orders').findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    if (order.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    const txnId = transactionId || `txn_${Date.now()}`;
    db('orders').updateById(order.id, {
      payment_status: 'completed',
      payment_transactionId: txnId,
      payment_paidAt: new Date().toISOString(),
    });

    const updatedOrder = db('orders').findById(order.id);
    const items = db('order_items').find({ orderId: order.id });
    updatedOrder._items = items;

    res.json({
      success: true,
      message: 'Payment completed',
      data: getPublicOrder(updatedOrder),
    });
  } catch (error) {
    console.error('Complete payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to complete payment',
    });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = db('orders').findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    if (order.userId !== req.user.id && req.user.role !== 'admin') {
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

    db('orders').updateById(order.id, {
      status: 'cancelled',
    });

    db('order_status_history').create({
      orderId: order.id,
      status: 'cancelled',
      note: 'Order cancelled by user',
      updatedBy: req.user.id,
    });

    const orderItems = db('order_items').find({ orderId: order.id });
    for (const item of orderItems) {
      db('products').updateById(item.productId, { status: 'active' });
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
