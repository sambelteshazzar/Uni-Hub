const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  getNotifications,
  getUnreadCount,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  deleteReadNotifications,
} = require('../controllers/notification.controller');

router.get('/', protect, getNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.post('/', protect, createNotification);
router.put('/:id/read', protect, markAsRead);
router.put('/read-all', protect, markAllAsRead);
router.delete('/read', protect, deleteReadNotifications);
router.delete('/all', protect, deleteAllNotifications);
router.delete('/:id', protect, deleteNotification);

module.exports = router;
