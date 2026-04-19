/**
 * ============================================
 * Socket.io Configuration
 * Real-time messaging for Uni-Hub
 * ============================================
 */

const jwt = require('jsonwebtoken');
const Message = require('../models/Message.model');
const Conversation = require('../models/Conversation.model');

// Store online users
const onlineUsers = new Map();

/**
 * Initialize Socket.io
 * @param {Object} io - Socket.io server instance
 */
const initializeSocket = (io) => {
  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user info to socket
      socket.userId = decoded.id;
      socket.user = decoded;

      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Handle connections
  io.on('connection', (socket) => {
    // eslint-disable-next-line no-console
    console.log(`User connected: ${socket.userId}`);

    // Store user's socket connection
    onlineUsers.set(socket.userId, socket.id);

    // Join user's personal room
    socket.join(`user_${socket.userId}`);

    // Handle joining a conversation room
    socket.on('join_conversation', async (conversationId) => {
      try {
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        // Verify user is a participant
        const isParticipant = conversation.participants.some(
          p => p.toString() === socket.userId,
        );

        if (!isParticipant) {
          socket.emit('error', { message: 'Not authorized to join this conversation' });
          return;
        }

        socket.join(`conversation_${conversationId}`);

        // Notify other participants
        socket.to(`conversation_${conversationId}`).emit('user_typing', {
          userId: socket.userId,
          isTyping: false,
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Handle leaving a conversation room
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
    });

    // Handle new message
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, type = 'text', imageUrl, productId } = data;

        if (!conversationId || !content) {
          socket.emit('error', { message: 'Conversation ID and content are required' });
          return;
        }

        // Find conversation
        const conversation = await Conversation.findById(conversationId)
          .populate('participants', '_id fullName avatar');

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        // Verify user is a participant
        const receiver = conversation.participants.find(
          p => p._id.toString() !== socket.userId,
        );

        if (!receiver) {
          socket.emit('error', { message: 'Invalid conversation' });
          return;
        }

        // Create message in database
        const message = await Message.create({
          conversationId,
          sender: socket.userId,
          receiver: receiver._id,
          content,
          type,
          imageUrl: type === 'image' ? imageUrl : undefined,
          product: productId,
        });

        // Update conversation
        conversation.lastMessage = message._id;
        conversation.lastActivity = new Date();

        // Increment unread count for receiver
        const currentUnread = conversation.unreadCount.get(receiver._id.toString()) || 0;
        conversation.unreadCount.set(receiver._id.toString(), currentUnread + 1);
        await conversation.save();

        // Populate message for broadcasting
        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'fullName avatar university')
          .populate('receiver', 'fullName avatar university')
          .populate('product', 'title price images');

        // Broadcast to conversation room
        io.to(`conversation_${conversationId}`).emit('new_message', {
          message: populatedMessage,
          conversationId,
        });

        // Send notification to receiver if offline
        const receiverSocketId = onlineUsers.get(receiver._id.toString());
        if (!receiverSocketId) {
          // Receiver is offline, could send push notification here
          // For now, just update the unread count
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing_start', (data) => {
      const { conversationId } = data;
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId: socket.userId,
        isTyping: true,
      });
    });

    socket.on('typing_stop', (data) => {
      const { conversationId } = data;
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId: socket.userId,
        isTyping: false,
      });
    });

    // Handle message read
    socket.on('message_read', async (data) => {
      try {
        const { messageId } = data;

        const message = await Message.findById(messageId);
        if (!message) {
          return;
        }

        if (!message.isRead) {
          await message.markAsRead();

          // Notify sender that message was read
          const senderSocketId = onlineUsers.get(message.sender.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit('message_read', {
              messageId,
              conversationId: message.conversationId.toString(),
              readBy: socket.userId,
            });
          }
        }
      } catch (error) {
        // Silently fail for read receipts
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      onlineUsers.delete(socket.userId);
      // eslint-disable-next-line no-console
      console.log(`User disconnected: ${socket.userId}`);

      // Notify user's conversations that they went offline
      // This could be optimized with a debounce
      io.emit('user_offline', { userId: socket.userId });
    });
  });

  // Export helper functions
  return {
    onlineUsers,
    io,
  };
};

module.exports = { initializeSocket };
