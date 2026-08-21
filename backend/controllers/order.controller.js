const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db, generateId, parseJson, mapOrderRow, toBool, fromBool } = require('../utils/db');
const { notifyOrderCreated, notifyOrderStatusChanged, notifyPaymentCompleted, notifyOrderCancelled } = require('../utils/notificationHelper');
const crypto = require('crypto');
const ledger = require('../utils/ledger');

function getPublicOrder (order) {
  if (!order) {return null;}
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

  // TODO: security review — order input is untrusted. Every listing is a
  // one-off physical item with no stock count, so quantity must be exactly 1
  // and each product may appear once per order (prevents paying N× for a
  // single item and duplicate-line abuse).
  const seenProductIds = new Set();
  for (const item of items) {
    if (!item || typeof item.productId !== 'string' || !item.productId.trim()) {
      throw new ApiError(400, 'Each order item must include a valid productId');
    }
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity !== 1) {
      throw new ApiError(400, 'Each listing is a one-off item — quantity must be 1');
    }
    if (seenProductIds.has(item.productId)) {
      throw new ApiError(400, 'Duplicate products in an order are not allowed');
    }
    seenProductIds.add(item.productId);
    item.quantity = quantity;
  }

  // TODO: security review — idempotency-key handling. A client-supplied
  // key makes order creation replay-safe (double-clicks, network retries):
  // every repeat of the same key returns the FIRST final response instead
  // of creating a duplicate order. Keys are scoped per user+endpoint,
  // validated strictly, expire after 24h, and their reservation is
  // released automatically when the request ends in an error response.
  const IDEMPOTENCY_ENDPOINT = 'POST /api/orders';
  const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
  let idemKey = null;
  const rawIdemKey = req.body.idempotencyKey;
  if (rawIdemKey !== undefined && rawIdemKey !== null) {
    // Strict format: 16-100 printable ASCII chars, no whitespace/control.
    if (typeof rawIdemKey !== 'string' || !/^[\x21-\x7E]{16,100}$/.test(rawIdemKey)) {
      throw new ApiError(400, 'idempotencyKey must be a string of 16-100 printable characters');
    }
    idemKey = rawIdemKey;

    const cutoff = new Date(Date.now() - IDEMPOTENCY_TTL_MS).toISOString();
    const existing = await db('idempotency_keys').rawGet(
      'SELECT * FROM idempotency_keys WHERE "key" = ? AND userId = ? AND endpoint = ? AND createdAt > ?',
      [idemKey, req.user.id, IDEMPOTENCY_ENDPOINT, cutoff],
    );
    if (existing && existing.status === 'completed') {
      // Replay: return the stored original response byte-for-byte.
      let stored;
      try { stored = JSON.parse(existing.responseBody); } catch (_) { stored = null; }
      if (stored) {
        return res.status(existing.responseStatus || 201).json(stored);
      }
    }
    if (existing) {
      throw new ApiError(409, 'An identical request is still being processed');
    }

    // Lazily purge expired rows for this user, then reserve the key.
    // UNIQUE(key, userId, endpoint) arbitrates concurrent duplicates: the
    // loser of the insert race gets a constraint violation -> 409.
    await db('idempotency_keys').rawRun(
      'DELETE FROM idempotency_keys WHERE userId = ? AND createdAt <= ?',
      [req.user.id, cutoff],
    );
    try {
      await db('idempotency_keys').rawRun(
        'INSERT INTO idempotency_keys (id, "key", userId, endpoint, status) VALUES (?, ?, ?, ?, \'processing\')',
        [generateId(), idemKey, req.user.id, IDEMPOTENCY_ENDPOINT],
      );
    } catch (insertErr) {
      if (insertErr && /UNIQUE/i.test(insertErr.message || '')) {
        throw new ApiError(409, 'An identical request is still being processed');
      }
      throw insertErr;
    }

    // Intercept the outgoing response exactly once: a success payload is
    // persisted for future replays; any non-2xx (including errors thrown
    // later and rendered by the central error handler) releases the key
    // reservation so the client can safely retry with the same key.
    let idemStatusCode = 201;
    const origJson = res.json.bind(res);
    res.status = code => {
      idemStatusCode = code;
      res.statusCode = code; // preserve express's own status() side effect
      return res;
    };
    res.json = payload => {
      const finalize = (idemStatusCode >= 200 && idemStatusCode < 300)
        ? db('idempotency_keys').rawRun(
          'UPDATE idempotency_keys SET status = \'completed\', responseStatus = ?, responseBody = ? WHERE "key" = ? AND userId = ? AND endpoint = ?',
          [idemStatusCode, JSON.stringify(payload), idemKey, req.user.id, IDEMPOTENCY_ENDPOINT],
        )
        : db('idempotency_keys').rawRun(
          'DELETE FROM idempotency_keys WHERE "key" = ? AND userId = ? AND endpoint = ?',
          [idemKey, req.user.id, IDEMPOTENCY_ENDPOINT],
        );
      finalize.catch(() => { /* best-effort bookkeeping */ });
      return origJson(payload);
    };
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
    if (dbProduct.status === 'sold' || dbProduct.status === 'reserved') {
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
    // TODO: security review — identifiers must be unguessable: tracking
    // numbers are accepted by a PUBLIC endpoint, so Math.random (a
    // predictable PRNG) is not safe here. crypto.randomBytes draws from the
    // OS CSPRNG; 10 hex chars ≈ 40 bits of entropy per day bucket.
    const orderNum = `UH-${datePart}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const trackNum = `UHT-${datePart}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

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

    // TODO: security review — atomic reservation. The availability check
    // earlier is advisory (fast-fail UX); THIS conditional UPDATE is the
    // authoritative gate. The WHERE guard makes check-and-reserve one
    // indivisible statement: if another buyer reserved/purchased first, the
    // guard no longer matches, changes === 0, and the whole order aborts.
    // Guard mirrors the advisory check above (behavior-preserving); note
    // non-'active' statuses like 'pending' remain orderable — moderation
    // policy tightening is tracked separately.
    // batchWrite() is required because transaction() is not atomic on Turso
    // (each HTTP call auto-commits — see utils/db.js).
    const reserveResults = await db('products').batchWrite(
      [...new Set(productIds)].map(pid => ({
        sql: 'UPDATE products SET status = \'reserved\' WHERE id = ? AND status NOT IN (\'sold\', \'reserved\')',
        args: [pid],
      })),
    );
    const lostRace = reserveResults.some(r => !r || r.changes !== 1);
    if (lostRace) {
      throw new ApiError(409, 'One or more items in your order were just purchased or reserved by someone else');
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

  // Mirror order status into delivery_status so tracking endpoints read
  // consistent state. The deliveries table has its own status field
  // managed separately by delivery.controller; this keeps the order
  // row's own denormalized delivery_status in sync with order.status.
  const deliveryStatusMap = {
    pending: 'pending',
    confirmed: 'processing',
    'in-transit': 'in-transit',
    delivered: 'delivered',
    cancelled: 'cancelled',
    refunded: 'cancelled',
  };
  const deliveryStatus = deliveryStatusMap[status] || order.delivery_status;

  const updates = { status };
  if (deliveryStatus) {updates.delivery_status = deliveryStatus;}

  // Refund flow: release inventory back to 'active' and try to refund
  // via Paystack if the payment was card/momo/bank. Cash refunds are
  // out-of-band (no Paystack transaction to reverse).
  if (status === 'refunded') {
    updates.payment_status = 'refunded';
    for (const item of orderItems) {
      await db('products').updateById(item.productId, { status: 'active' });
    }
    const payments = await db('payments').find({ orderId: order.id });
    const payment = payments[0];
    if (payment && (payment.mode === 'momo' || payment.mode === 'telecel' || payment.mode === 'bank') && payment.transactionId) {
      const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
      if (PAYSTACK_SECRET_KEY) {
        try {
          const response = await fetch('https://api.paystack.co/refund', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ transaction: payment.transactionId, merchant_note: note || 'Order refunded' }),
          });
          const data = await response.json();
          if (!(data.status === true)) {
            console.error('Paystack refund failed:', data.message || data);
          } else if (payment) {
            await db('payments').updateById(payment.id, {
              status: 'refunded',
              refundedAt: new Date().toISOString(),
              refundReason: note || 'Order refunded',
            });
          }
        } catch (err) {
          console.error('Paystack refund error:', err.message);
        }
      }
    } else if (payment) {
      await db('payments').updateById(payment.id, {
        status: 'refunded',
        refundedAt: new Date().toISOString(),
        refundReason: note || 'Order refunded',
      });
    }
    // Ledger: escrowed entries -> reversed; released sales -> clawback.
    await ledger.reverseOrderLedger(order.id);
  }

  if (status === 'cancelled' && order.status !== 'cancelled') {
    // Release inventory on transition into cancelled (only if not
    // already cancelled to avoid double-release on idempotent calls).
    for (const item of orderItems) {
      const p = await db('products').findById(item.productId);
      if (p && (p.status === 'reserved' || p.status === 'sold')) {
        await db('products').updateById(item.productId, { status: 'active' });
      }
    }
  }

  // TODO: security review — delivery settles cash-on-delivery orders and
  // closes out inventory. Cash orders never pass through completePayment's
  // sold-flip (that only runs for provider-verified payments), so without
  // this transition their listings stayed 'reserved' forever. Idempotent:
  // skipped on re-calls for an already-delivered order.
  let settledCashPayment = false;
  if (status === 'delivered' && order.status !== 'delivered') {
    const isCashOrder = order.payment_mode === 'cash';
    const payments = await db('payments').find({ orderId: order.id });
    const payment = payments[0];

    // Money changes hands at handoff, so marking the order delivered
    // confirms a pending cash payment. Provider-paid orders were already
    // settled in completePayment / the Paystack webhook.
    if (isCashOrder && order.payment_status === 'pending') {
      updates.payment_status = 'completed';
      updates.payment_paidAt = new Date().toISOString();
      settledCashPayment = true;
      if (payment) {
        await db('payments').updateById(payment.id, {
          status: 'completed',
          paidAt: updates.payment_paidAt,
          verifiedAt: updates.payment_paidAt,
        });
      }
    }

    // Lock inventory as sold for anything still reserved (cash path;
    // provider-paid items are typically already 'sold' via completePayment).
    for (const item of orderItems) {
      const p = await db('products').findById(item.productId);
      if (p && p.status === 'reserved') {
        await db('products').updateById(item.productId, { status: 'sold' });
      }
    }

    // Ledger release: escrowed provider-paid entries become available;
    // cash orders record informational released entries directly.
    if (isCashOrder) {
      await ledger.recordCashSale(order.id, orderItems);
    } else {
      await ledger.releaseOrderLedger(order.id);
    }
  }

  await db('orders').updateById(order.id, updates);

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
  if (settledCashPayment) {
    notifyPaymentCompleted(io, updatedOrder);
  }

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

  // TODO: security review — fail closed. Without an initialized payment
  // record there is nothing to verify, so never fall through to marking the
  // order as paid (previously missing records skipped all checks).
  if (!payment) {
    throw new ApiError(404, 'No payment has been initialized for this order');
  }

  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  if ((payment.mode === 'momo' || payment.mode === 'telecel' || payment.mode === 'bank') && PAYSTACK_SECRET_KEY) {
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
      // TODO: security review — verify the paid amount matches the order
      // total. Paystack reports minor units (pesewas). Without this check a
      // small successful transaction could be replayed to settle any order.
      const paidAmount = data.data.amount / 100;
      if (typeof paidAmount !== 'number' || Number.isNaN(paidAmount) ||
        Math.abs(payment.amount - paidAmount) > 0.01) {
        console.warn(`Payment amount mismatch for order ${order.id}: expected ${payment.amount}, got ${paidAmount}`);
        throw new ApiError(400, 'Paid amount does not match the order total');
      }
    } catch (err) {
      if (err instanceof ApiError) {throw err;}
      console.error('Paystack verification error:', err);
      throw new ApiError(400, 'Payment provider verification failed');
    }
  } else if (payment.mode !== 'cash') {
    throw new ApiError(400, 'Payment verification is required for this payment mode');
  }

  if (payment.mode === 'cash') {
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

  // Payment completed → lock inventory as sold (was 'reserved' at
  // order-create time). If the order is later cancelled/refunded, the
  // cancelOrder flow already resets the product status back to 'active'.
  const paidItems = await db('order_items').find({ orderId: order.id });
  for (const item of paidItems) {
    await db('products').updateById(item.productId, { status: 'sold' });
  }

  // Ledger capture: escrow the sale per item; released on delivery.
  await ledger.recordEscrowedSale(order.id, paidItems);

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

  if (order.status === 'cancelled') {
    throw new ApiError(400, 'Order is already cancelled');
  }

  await db('orders').updateById(order.id, {
    status: 'cancelled',
    delivery_status: 'cancelled',
  });

  await db('order_status_history').create({
    orderId: order.id,
    status: 'cancelled',
    note: 'Order cancelled by user',
    updatedBy: req.user.id,
  });

  // Release inventory back to 'active'. Only reset if currently reserved
  // or sold — avoids double-release on idempotent calls.
  const orderItems = await db('order_items').find({ orderId: order.id });
  for (const item of orderItems) {
    const p = await db('products').findById(item.productId);
    if (p && (p.status === 'reserved' || p.status === 'sold')) {
      await db('products').updateById(item.productId, { status: 'active' });
    }
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

  // TODO: security review — data minimization. This endpoint is PUBLIC and
  // guarded only by the tracking number, so the response is allowlisted to
  // exactly what a tracking page needs. The full order object would leak
  // buyer PII (name/email/phone), delivery address/instructions, and the
  // payment transaction id.
  const items = await db('order_items').find({ orderId: order.id });

  res.json({
    success: true,
    data: {
      id: order.id,
      orderNumber: order.orderNumber,
      trackingNumber: order.trackingNumber,
      status: order.status,
      deliveryStatus: order.delivery_status,
      paymentStatus: order.payment_status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: items.map(i => ({ title: i.title, quantity: i.quantity })),
    },
  });
});
