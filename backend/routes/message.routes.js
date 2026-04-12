/**
 * ============================================
 * Message Routes
 * ============================================
 * Routes for in-app messaging
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  sendMessage,
  getConversationMessages,
  getUserConversations,
  getConversation,
  markAsRead,
  deleteMessage,
  getUnreadCount,
  searchMessages,
} = require('../controllers/message.controller');

// All routes are protected (require authentication)
router.use(protect);

// Send a new message
router.post('/', sendMessage);

// Get user's conversations
router.get('/conversations', getUserConversations);

// Get conversation details
router.get('/conversation/:conversationId', getConversation);

// Get messages for a conversation
router.get('/conversation/:conversationId/messages', getConversationMessages);

// Mark message as read
router.put('/:messageId/read', markAsRead);

// Delete a message
router.delete('/:messageId', deleteMessage);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Search messages
router.get('/search', searchMessages);

module.exports = router;
