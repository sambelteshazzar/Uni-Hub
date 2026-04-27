const Notification = require('../models/Notification.model');

async function getNotifications (req, res) {
  try {
    const { type, read, startDate, endDate } = req.query;

    const query = { user: req.user._id };

    if (type) {
      query.type = type;
    }

    if (read !== undefined) {
      query.read = read === 'true';
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    query.$or = [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ];

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    const data = notifications.map(n => {
      const obj = n.toObject();
      obj.id = obj._id.toString();
      delete obj.__v;
      return obj;
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
    });
  }
}

async function getUnreadCount (req, res) {
  try {
    const count = await Notification.countDocuments({
      user: req.user._id,
      read: false,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    });

    res.json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count',
    });
  }
}

async function createNotification (req, res) {
  try {
    const { type, title, message, icon, expiresAt } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required',
      });
    }

    const notification = await Notification.create({
      user: req.user._id,
      type: type || 'info',
      title,
      message,
      icon,
      expiresAt: expiresAt || null,
    });

    const obj = notification.toObject();
    obj.id = obj._id.toString();
    delete obj.__v;

    res.status(201).json({
      success: true,
      data: obj,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create notification',
    });
  }
}

async function markAsRead (req, res) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    res.json({
      success: true,
      data: notification.toObject(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
    });
  }
}

async function markAllAsRead (req, res) {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true },
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to mark all as read',
    });
  }
}

async function deleteNotification (req, res) {
  try {
    const result = await Notification.deleteOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
    });
  }
}

async function deleteAllNotifications (req, res) {
  try {
    await Notification.deleteMany({ user: req.user._id });

    res.json({
      success: true,
      message: 'All notifications deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete all notifications',
    });
  }
}

async function deleteReadNotifications (req, res) {
  try {
    await Notification.deleteMany({
      user: req.user._id,
      read: true,
    });

    res.json({
      success: true,
      message: 'Read notifications deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete read notifications',
    });
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  deleteReadNotifications,
};
