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

exports.createOrder = asyncHandler(async (req, res) => {
  const { items, delivery, payment } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Order must contain at least one item');
  }

  if (!delivery || !delivery.mode) {
    throw new ApiError(400, 'Delivery information is required');
  }

  if (!payment || !payment.mode) {
    throw new ApiError(400, 'Payment information is required');
  }

  const productIds = items.map(item => item.productId);
  const dbProducts = await db('products').find({ id: { $in: productIds } });

  if (dbProducts.length !== items.length) {
    throw new ApiError(400, 'One or more products not found');
  }

  const productMap = new Map(dbProducts.map(p => [p.id, p]));

  let subtotal = 0;
  const verifiedItems = [];
  for (const item of items) {
    const dbProduct = productMap.get(item.productId);
    if (!dbProduct) {
      throw new ApiError(400, `Product ${item.productId} not found`);
    }
    if (dbProduct.status === 'sold') {
      throw new ApiError(400, `Product "${dbProduct.title}" is no longer available`);
    }
    const images = parseJson(dbProduct.images) || [];
    subtotal += dbProduct.price * item.quantity;
    const sellerUser = await db('users').findById(dbProduct.seller);
    verifiedItems.push({
      productId: item.productId,
      title: dbProduct.title,
      price: dbProduct.price,
      quantity: item.quantity,
      seller: dbProduct.seller,
      sellerName: sellerUser ? sellerUser.fullName : '',
      image: item.image || (images && images[0]) || '',
      variant: item.variant || null,
    });
  }

  const deliveryFee = delivery.mode === 'inperson' ? 0 : delivery.mode === 'yango' ? 12 : 15;
  const grandTotal = subtotal + deliveryFee;

  const order = await db('orders').transaction(async () => {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    const datePart = `${yy}${mm}${dd}`;
    const orderNum = `UH-${datePart}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const trackNum = `UHT-${datePart}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const createdOrder = await db('orders').create({
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
      status: 'placed',
      orderNumber: orderNum,
      trackingNumber: trackNum,
    });

    for (const vItem of verifiedItems) {
      await db('order_items').create({
        orderId: createdOrder.id,
        productId: vItem.productId,
        title: vItem.title,
        price: vItem.price,
        quantity: vItem.quantity,
        seller: vItem.seller,
        sellerName: vItem.sellerName,
        image: vItem.image,
        variant: vItem.variant || null,
      });
    }

    for (const pid of productIds) {
      await db('products').updateById(pid, { status: 'sold' });
    }

    await db('users').updateById(req.user.id, {
      totalOrders: (req.user.totalOrders || 0) + 1,
    });

    return createdOrder;
  });

  const createdOrder = await db('orders').findById(order.id);
  const orderItems = await db('order_items').find({ orderId: order.id });
  createdOrder._items = orderItems;

  const io = req.app.get('io');
  notifyOrderCreated(io, createdOrder, orderItems, req.user);

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: getPublicOrder(createdOrder),
  });
});

exports.getMyOrders = asyncHandler(async (req, res) => {
  const orders = await db('orders').find(
    { userId: req.user.id },
    { sort: { createdAt: -1 } },
  );

  const populatedOrders = [];
  for (const order of orders) {
    const items = await db('order_items').find({ orderId: order.id });
    order._items = items;
    populatedOrders.push(getPublicOrder(order));
  }

  res.json({
    success: true,
    data: {
      orders: populatedOrders,
      total: populatedOrders.length,
    },
  });
});

exports.getOrder = asyncHandler(async (req, res) => {
  const order = await db('orders').findById(req.params.id);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.userId !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to view this order');
  }

  const items = await db('order_items').find({ orderId: order.id });
  order._items = items;

  const user = await db('users').findById(order.userId);
  order.userId = user ? { id: user.id, fullName: user.fullName, email: user.email } : order.userId;

  for (const item of items) {
    const seller = await db('users').findById(item.seller);
    item.seller = seller ? { id: seller.id, fullName: seller.fullName, email: seller.email, phone: seller.phone } : item.seller;
  }

  res.json({
    success: true,
    data: getPublicOrder(order),
  });
});

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  if (!status) {
    throw new ApiError(400, 'Status is required');
  }

  const allowedStatuses = ['pending', 'confirmed', 'in-transit', 'delivered', 'cancelled', 'refunded'];
  if (!allowedStatuses.includes(status)) {
    throw new ApiError(400, 'Invalid status value');
  }

  const order = await db('orders').findById(req.params.id);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const orderItems = await db('order_items').find({ orderId: order.id });
  const isSeller = orderItems.some(item => item.seller === req.user.id);
  if (order.userId !== req.user.id && req.user.role !== 'admin' && !isSeller) {
    throw new ApiError(403, 'Not authorized to update this order');
  }

  await db('orders').updateById(order.id, {
    status,
  });

  await db('order_status_history').create({
    orderId: order.id,
    status,
    note: note || '',
    updatedBy: req.user.id,
  });

  const updatedOrder = await db('orders').findById(order.id);
  const items = await db('order_items').find({ orderId: order.id });
  updatedOrder._items = items;

  const io = req.app.get('io');
  notifyOrderStatusChanged(io, updatedOrder, status, req.user);

  res.json({
    success: true,
    message: 'Order status updated',
    data: getPublicOrder(updatedOrder),
  });
});

exports.completePayment = asyncHandler(async (req, res) => {
  const { transactionId } = req.body;

  if (!transactionId) {
    throw new ApiError(400, 'Transaction ID is required to complete payment');
  }

  const order = await db('orders').findById(req.params.id);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.userId !== req.user.id) {
    throw new ApiError(403, 'Not authorized');
  }

  if (order.payment_status === 'completed') {
    throw new ApiError(400, 'Payment has already been completed');
  }

  const payments = await db('payments').find({ orderId: order.id });
  const payment = payments[0];
  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  if (payment && (payment.mode === 'momo' || payment.mode === 'telecel' || payment.mode === 'bank') && PAYSTACK_SECRET_KEY) {
    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(transactionId)}`, {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!(data.status === true && data.data && data.data.status === 'success')) {
        throw new ApiError(400, 'Transaction could not be verified with the payment provider');
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      console.error('Paystack verification error:', err);
      throw new ApiError(400, 'Payment provider verification failed');
    }
  } else if (payment && payment.mode !== 'cash') {
    throw new ApiError(400, 'Payment verification is required for this payment mode');
  }

  if (payment && payment.mode === 'cash') {
    await db('orders').updateById(order.id, {
      payment_status: 'pending',
      payment_transactionId: transactionId,
      payment_paidAt: '',
    });
    return res.json({
      success: true,
      message: 'Cash payment will be confirmed upon delivery',
      data: getPublicOrder(await db('orders').findById(order.id)),
    });
  }

  await db('orders').updateById(order.id, {
    payment_status: 'completed',
    payment_transactionId: transactionId,
    payment_paidAt: new Date().toISOString(),
  });

  if (payment) {
    await db('payments').updateById(payment.id, {
      status: 'completed',
      transactionId: transactionId,
      verifiedAt: new Date().toISOString(),
    });
  }

  const updatedOrder = await db('orders').findById(order.id);
  const items = await db('order_items').find({ orderId: order.id });
  updatedOrder._items = items;

  const io = req.app.get('io');
  notifyPaymentCompleted(io, updatedOrder);

  res.json({
    success: true,
    message: 'Payment completed',
    data: getPublicOrder(updatedOrder),
  });
});

exports.cancelOrder = asyncHandler(async (req, res) => {
  const order = await db('orders').findById(req.params.id);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.userId !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized');
  }

  if (order.status === 'delivered') {
    throw new ApiError(400, 'Cannot cancel a delivered order');
  }

  await db('orders').updateById(order.id, {
    status: 'cancelled',
  });

  await db('order_status_history').create({
    orderId: order.id,
    status: 'cancelled',
    note: 'Order cancelled by user',
    updatedBy: req.user.id,
  });

  const orderItems = await db('order_items').find({ orderId: order.id });
  for (const item of orderItems) {
    await db('products').updateById(item.productId, { status: 'active' });
  }

  const io = req.app.get('io');
  const cancelledOrder = await db('orders').findById(order.id);
  notifyOrderCancelled(io, cancelledOrder);

  res.json({
    success: true,
    message: 'Order cancelled successfully',
  });
});

exports.trackByTrackingNumber = asyncHandler(async (req, res) => {
  const { trackingNumber } = req.params;
  if (!trackingNumber) {
    throw new ApiError(400, 'Tracking number is required');
  }

  const orders = await db('orders').find({ trackingNumber });
  const order = orders.find(o => o.trackingNumber === trackingNumber);
  if (!order) {
    throw new ApiError(404, 'No order found with this tracking number');
  }

  const items = await db('order_items').find({ orderId: order.id });
  order._items = items;

  const statusHistory = await db('order_status_history').find({ orderId: order.id });

  const publicOrder = getPublicOrder(order);
  publicOrder.statusHistory = statusHistory;

  res.json({ success: true, data: publicOrder });
});