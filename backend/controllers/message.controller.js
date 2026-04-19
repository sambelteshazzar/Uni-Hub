const { ApiError, asyncHandler } = require('../utils/errorHandler');
/**
 * ============================================
 * Message Controller
 * Handle in-app messaging between users
 * ============================================
 */

const Message = require('../models/Message.model');
const Conversation = require('../models/Conversation.model');
const User = require('../models/User.model');

/**
 * @desc    Send a new message
 * @route   POST /api/messages
 * @access  Private
 */
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, receiverId, content, type = 'text', imageUrl, productId } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Receiver ID and content are required',
      });
    }

    // Verify receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        error: 'Receiver not found',
      });
    }

    // Find or create conversation
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }
    } else {
      conversation = await Conversation.findOrCreateConversation(
        req.user._id,
        receiverId,
        productId,
      );
    }

    // Create message
    const message = await Message.create({
      conversationId: conversation._id,
      sender: req.user._id,
      receiver: receiverId,
      content,
      type,
      imageUrl: type === 'image' ? imageUrl : undefined,
    });

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastActivity = new Date();

    // Increment unread count for receiver
    const currentUnread = conversation.unreadCount.get(receiverId) || 0;
    conversation.unreadCount.set(receiverId, currentUnread + 1);

    await conversation.save();

    // Populate message with sender info
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'fullName avatar university')
      .populate('receiver', 'fullName avatar university')
      .populate('product', 'title price images')
      .populate('conversationId', 'status');

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message: populatedMessage,
        conversationId: conversation._id,
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send message',
    });
  }
};

/**
 * @desc    Get messages for a conversation
 * @route   GET /api/messages/conversation/:conversationId
 * @access  Private
 */
exports.getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    const isParticipant = conversation.participants.some(
      p => p.toString() === req.user._id.toString(),
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this conversation',
      });
    }

    // Get messages
    const messages = await Message.find({
      conversationId,
      deletedBy: { $ne: req.user._id },
    })
      .populate('sender', 'fullName avatar university')
      .populate('receiver', 'fullName avatar university')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Message.countDocuments({
      conversationId,
      deletedBy: { $ne: req.user._id },
    });

    // Mark messages as read
    await Message.markConversationAsRead(conversationId, req.user._id);
    await conversation.markAsRead(req.user._id);

    res.json({
      success: true,
      data: {
        messages: messages.reverse(),
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: page,
      },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get messages',
    });
  }
};

/**
 * @desc    Get user's conversations
 * @route   GET /api/messages/conversations
 * @access  Private
 */
exports.getUserConversations = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'active' } = req.query;

    const result = await Conversation.getUserConversations(req.user._id, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
    });

    // Get total unread messages
    const unreadCount = await Conversation.getUserUnreadCount(req.user._id);

    res.json({
      success: true,
      data: {
        conversations: result.conversations,
        total: result.total,
        pages: result.pages,
        currentPage: result.currentPage,
        unreadCount,
      },
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get conversations',
    });
  }
};

/**
 * @desc    Get conversation details
 * @route   GET /api/messages/conversation/:conversationId
 * @access  Private
 */
exports.getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'fullName avatar university isOnline')
      .populate('lastMessage', 'content sender createdAt type')
      .populate('product', 'title price images')
      .populate('order', 'orderNumber status pricing');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    // Verify user is participant
    const isParticipant = conversation.participants.some(
      p => p._id.toString() === req.user._id.toString(),
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this conversation',
      });
    }

    // Mark as read
    await conversation.markAsRead(req.user._id);

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get conversation',
    });
  }
};

/**
 * @desc    Mark message as read
 * @route   PUT /api/messages/:messageId/read
 * @access  Private
 */
exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
      });
    }

    // Verify user is receiver
    if (message.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    await message.markAsRead();

    res.json({
      success: true,
      message: 'Message marked as read',
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark message as read',
    });
  }
};

/**
 * @desc    Delete a message (soft delete)
 * @route   DELETE /api/messages/:messageId
 * @access  Private
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
      });
    }

    // Verify user is sender or receiver
    const isSenderOrReceiver = message.sender.toString() === req.user._id.toString() ||
      message.receiver.toString() === req.user._id.toString();

    if (!isSenderOrReceiver) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this message',
      });
    }

    // Add user to deletedBy array
    if (!message.deletedBy.includes(req.user._id)) {
      message.deletedBy.push(req.user._id);
      await message.save();
    }

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete message',
    });
  }
};

/**
 * @desc    Get unread message count
 * @route   GET /api/messages/unread-count
 * @access  Private
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Message.getUnreadCount(req.user._id);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get unread count',
    });
  }
};

/**
 * @desc    Search messages
 * @route   GET /api/messages/search
 * @access  Private
 */
exports.searchMessages = async (req, res) => {
  try {
    const { query, conversationId, page = 1, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    const searchQuery = {
      content: { $regex: query, $options: 'i' },
      deletedBy: { $ne: req.user._id },
    };

    if (conversationId) {
      searchQuery.conversationId = conversationId;
    }

    const messages = await Message.find(searchQuery)
      .populate('sender', 'fullName avatar university')
      .populate('receiver', 'fullName avatar university')
      .populate('conversationId', 'participants')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Message.countDocuments(searchQuery);

    res.json({
      success: true,
      data: {
        messages,
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: page,
      },
    });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search messages',
    });
  }
};
