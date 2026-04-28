const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db, generateId, mapDeliveryRow } = require('../utils/db');

function generateDeliveryNumber () {
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DEL-${dateStr}-${rand}`;
}

function populateDelivery (delivery) {
  if (!delivery) return null;
  const order = db('orders').findById(delivery.orderId);
  if (order) {
    delivery.orderId = { _id: order.id, id: order.id, orderNumber: order.orderNumber, status: order.status, customer: { name: order.customer_name } };
  }
  const user = db('users').findById(delivery.userId);
  if (user) {
    delivery.userId = { _id: user.id, id: user.id, fullName: user.fullName, email: user.email, phone: user.phone };
  }
  delivery._id = delivery.id;
  return delivery;
}

exports.createDelivery = async (req, res) => {
  try {
    const { orderId, mode, address, instructions } = req.body;

    if (!orderId || !mode) {
      return res.status(400).json({ success: false, error: 'Order ID and delivery mode are required' });
    }

    const order = db('orders').findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const delivery = db('deliveries').create({
      id: generateId(),
      deliveryNumber: generateDeliveryNumber(),
      orderId: order.id,
      userId: req.user.id,
      mode,
      address,
      instructions,
      status: 'pending',
    });

    db('delivery_status_history').create({
      id: generateId(),
      deliveryId: delivery.id,
      status: 'pending',
      note: 'Delivery record created',
    });

    res.status(201).json({ success: true, message: 'Delivery record created', data: mapDeliveryRow(delivery) });
  } catch (error) {
    console.error('Create delivery error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create delivery' });
  }
};

exports.getDeliveryByOrder = async (req, res) => {
  try {
    const delivery = db('deliveries').findOne({ orderId: req.params.orderId });
    if (!delivery) {
      return res.status(404).json({ success: false, error: 'Delivery record not found' });
    }

    const userId = typeof delivery.userId === 'string' ? delivery.userId : delivery.userId?.id || delivery.userId?._id;
    if (userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const populated = populateDelivery(mapDeliveryRow(delivery));
    res.json({ success: true, data: populated });
  } catch (error) {
    console.error('Get delivery error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch delivery' });
  }
};

exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { status, location, note } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const delivery = db('deliveries').findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ success: false, error: 'Delivery not found' });
    }

    const updates = { status };
    if (location) {
      updates.location_latitude = location.latitude;
      updates.location_longitude = location.longitude;
      updates.location_lastUpdated = new Date().toISOString();
    }

    if (status === 'picked-up') updates.pickedUpAt = new Date().toISOString();
    if (status === 'delivered') updates.deliveredAt = new Date().toISOString();

    db('deliveries').updateById(delivery.id, updates);

    db('delivery_status_history').create({
      id: generateId(),
      deliveryId: delivery.id,
      status,
      note: note || null,
      location_latitude: location?.latitude || null,
      location_longitude: location?.longitude || null,
    });

    const updated = db('deliveries').findById(delivery.id);
    res.json({ success: true, message: 'Delivery status updated', data: mapDeliveryRow(updated) });
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update delivery' });
  }
};

exports.getMyDeliveries = async (req, res) => {
  try {
    const deliveries = db('deliveries').find({ userId: req.user.id }, { sort: { createdAt: -1 } });
    const mapped = deliveries.map(d => populateDelivery(mapDeliveryRow(d)));

    res.json({ success: true, data: { deliveries: mapped, total: mapped.length } });
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch deliveries' });
  }
};

exports.getAllDeliveries = async (req, res) => {
  try {
    const { status, mode, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (mode) query.mode = mode;

    const skip = (page - 1) * limit;
    const deliveries = db('deliveries').find(query, { sort: { createdAt: -1 }, limit: Number(limit), skip });
    const count = db('deliveries').countDocuments(query);

    const mapped = deliveries.map(d => populateDelivery(mapDeliveryRow(d)));

    res.json({ success: true, data: { deliveries: mapped, total: count, pages: Math.ceil(count / limit), currentPage: page } });
  } catch (error) {
    console.error('Get all deliveries error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch deliveries' });
  }
};
