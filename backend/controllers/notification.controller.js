const { db, toBool, fromBool } = require('../utils/db');

async function getNotifications (req, res) {
  try {
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

    const notifications = db('notifications').find(query, {
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
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
    });
  }
}

async function getUnreadCount (req, res) {
  try {
    const count = db('notifications').countDocuments({
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

    const notification = db('notifications').create({
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
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create notification',
    });
  }
}

async function markAsRead (req, res) {
  try {
    const notification = db('notifications').findOneAndUpdate(
      { id: req.params.id, user: req.user.id },
      { read: toBool(true) },
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    res.json({
      success: true,
      data: {
        ...notification,
        read: fromBool(notification.read),
      },
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
    db('notifications').updateMany(
      { user: req.user.id, read: 0 },
      { read: toBool(true) },
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
    const result = db('notifications').deleteOne({
      id: req.params.id,
      user: req.user.id,
    });

    if (result === 0) {
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
    db('notifications').deleteMany({ user: req.user.id });

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
    db('notifications').deleteMany({
      user: req.user.id,
      read: 1,
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
