const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db, generateId, mapDeliveryRow } = require('../utils/db');
const { notifyDeliveryCreated, notifyDeliveryStatusChanged } = require('../utils/notificationHelper');

function generateDeliveryNumber () {
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DEL-${dateStr}-${rand}`;
}

async function populateDelivery (delivery) {
  if (!delivery) return null;
  const order = await db('orders').findById(delivery.orderId);
  if (order) {
    delivery.orderId = { _id: order.id, id: order.id, orderNumber: order.orderNumber, status: order.status, customer: { name: order.customer_name } };
  }
  const user = await db('users').findById(delivery.userId);
  if (user) {
    delivery.userId = { _id: user.id, id: user.id, fullName: user.fullName, email: user.email, phone: user.phone };
  }
  delivery._id = delivery.id;
  return delivery;
}

exports.createDelivery = asyncHandler(async (req, res) => {
  const { orderId, mode, address, instructions } = req.body;

  if (!orderId || !mode) {
    throw new ApiError(400, 'Order ID and delivery mode are required');
  }

  const order = await db('orders').findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.userId !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized');
  }

  const delivery = await db('deliveries').create({
    id: generateId(),
    deliveryNumber: generateDeliveryNumber(),
    orderId: order.id,
    userId: req.user.id,
    mode,
    address,
    instructions,
    status: 'pending',
  });

  await db('delivery_status_history').create({
    id: generateId(),
    deliveryId: delivery.id,
    status: 'pending',
    note: 'Delivery record created',
  });

  const io = req.app.get('io');
  notifyDeliveryCreated(io, delivery);

  res.status(201).json({ success: true, message: 'Delivery record created', data: mapDeliveryRow(delivery) });
});

exports.getDeliveryByOrder = asyncHandler(async (req, res) => {
  const delivery = await db('deliveries').findOne({ orderId: req.params.orderId });
  if (!delivery) {
    throw new ApiError(404, 'Delivery record not found');
  }

  const userId = typeof delivery.userId === 'string' ? delivery.userId : delivery.userId?.id || delivery.userId?._id;
  if (userId !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized');
  }

  const populated = await populateDelivery(mapDeliveryRow(delivery));
  res.json({ success: true, data: populated });
});

exports.updateDeliveryStatus = asyncHandler(async (req, res) => {
  const { status, location, note } = req.body;

  if (!status) {
    throw new ApiError(400, 'Status is required');
  }

  const delivery = await db('deliveries').findById(req.params.id);
  if (!delivery) {
    throw new ApiError(404, 'Delivery not found');
  }

  const updates = { status };
  if (location) {
    updates.location_latitude = location.latitude;
    updates.location_longitude = location.longitude;
    updates.location_lastUpdated = new Date().toISOString();
  }

  if (status === 'picked-up') updates.pickedUpAt = new Date().toISOString();
  if (status === 'delivered') updates.deliveredAt = new Date().toISOString();

  await db('deliveries').updateById(delivery.id, updates);

  await db('delivery_status_history').create({
    id: generateId(),
    deliveryId: delivery.id,
    status,
    note: note || null,
    location_latitude: location?.latitude || null,
    location_longitude: location?.longitude || null,
  });

  const updated = await db('deliveries').findById(delivery.id);

  const io = req.app.get('io');
  notifyDeliveryStatusChanged(io, updated);

  res.json({ success: true, message: 'Delivery status updated', data: mapDeliveryRow(updated) });
});

exports.getMyDeliveries = asyncHandler(async (req, res) => {
  const deliveries = await db('deliveries').find({ userId: req.user.id }, { sort: { createdAt: -1 } });
  const mapped = [];
  for (const d of deliveries) {
    mapped.push(await populateDelivery(mapDeliveryRow(d)));
  }

  res.json({ success: true, data: { deliveries: mapped, total: mapped.length } });
});

exports.getAllDeliveries = asyncHandler(async (req, res) => {
  const { status, mode, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status) query.status = status;
  if (mode) query.mode = mode;

  const skip = (page - 1) * limit;
  const deliveries = await db('deliveries').find(query, { sort: { createdAt: -1 }, limit: Number(limit), skip });
  const count = await db('deliveries').countDocuments(query);

  const mapped = [];
  for (const d of deliveries) {
    mapped.push(await populateDelivery(mapDeliveryRow(d)));
  }

  res.json({ success: true, data: { deliveries: mapped, total: count, pages: Math.ceil(count / limit), currentPage: page } });
});