const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db, toBool, fromBool } = require('../utils/db');

exports.getNotifications = asyncHandler(async (req, res) => {
  const { type, read, startDate, endDate } = req.query;

  const query = { user: req.user.id };

  if (type) {
    query.type = type;
  }

  if (read !== undefined) {
    query.read = read === 'true' ? 1 : 0;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) { query.createdAt.$gte = startDate; }
    if (endDate) { query.createdAt.$lte = endDate; }
  }

  query.$or = [
    { expiresAt: null },
    { expiresAt: { $gt: new Date().toISOString() } },
  ];

  const notifications = await db('notifications').find(query, {
    sort: { createdAt: -1 },
    limit: 100,
  });

  const data = notifications.map(n => ({
    ...n,
    id: n.id || n._id,
    read: fromBool(n.read),
  }));

  res.json({
    success: true,
    data,
  });
});

exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await db('notifications').countDocuments({
    user: req.user.id,
    read: 0,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date().toISOString() } },
    ],
  });

  res.json({
    success: true,
    data: { unreadCount: count },
  });
});

exports.createNotification = asyncHandler(async (req, res) => {
  const { type, title, message, icon, expiresAt } = req.body;

  if (!title || !message) {
    throw new ApiError(400, 'Title and message are required');
  }

  const notification = await db('notifications').create({
    user: req.user.id,
    type: type || 'info',
    title,
    message,
    icon: icon || null,
    read: 0,
    expiresAt: expiresAt || null,
  });

  res.status(201).json({
    success: true,
    data: {
      ...notification,
      read: fromBool(notification.read),
    },
  });
});

exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await db('notifications').findOneAndUpdate(
    { id: req.params.id, user: req.user.id },
    { read: toBool(true) },
  );

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  res.json({
    success: true,
    data: {
      ...notification,
      read: fromBool(notification.read),
    },
  });
});

exports.markAllAsRead = asyncHandler(async (req, res) => {
  await db('notifications').updateMany(
    { user: req.user.id, read: 0 },
    { read: toBool(true) },
  );

  res.json({
    success: true,
    message: 'All notifications marked as read',
  });
});

exports.deleteNotification = asyncHandler(async (req, res) => {
  const result = await db('notifications').deleteOne({
    id: req.params.id,
    user: req.user.id,
  });

  if (result === 0) {
    throw new ApiError(404, 'Notification not found');
  }

  res.json({
    success: true,
    message: 'Notification deleted',
  });
});

exports.deleteAllNotifications = asyncHandler(async (req, res) => {
  await db('notifications').deleteMany({ user: req.user.id });

  res.json({
    success: true,
    message: 'All notifications deleted',
  });
});

exports.deleteReadNotifications = asyncHandler(async (req, res) => {
  await db('notifications').deleteMany({
    user: req.user.id,
    read: 1,
  });

  res.json({
    success: true,
    message: 'Read notifications deleted',
  });
});
