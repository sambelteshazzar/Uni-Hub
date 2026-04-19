/**
 * ============================================
 * Message Model
 * ============================================
 * In-app messaging between buyers and sellers
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Conversation this message belongs to
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  },

  // Sender of the message
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Receiver of the message
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Message content
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters'],
  },

  // Message type
  type: {
    type: String,
    enum: ['text', 'image', 'system'],
    default: 'text',
  },

  // Image URL (for image messages)
  imageUrl: {
    type: String,
  },

  // Read status
  isRead: {
    type: Boolean,
    default: false,
  },

  // When the message was read
  readAt: {
    type: Date,
  },

  // Deleted by users (soft delete)
  deletedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],

  // Related product (optional, for context)
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  },

  // Related order (optional, for transaction context)
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
}, {
  timestamps: true,
});

// Index for fast queries
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, isRead: 1 });

// Method to mark message as read
messageSchema.methods.markAsRead = function () {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to get unread count for a user
messageSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({
    receiver: userId,
    isRead: false,
    deletedBy: { $ne: userId },
  });
};

// Static method to mark all messages in conversation as read
messageSchema.statics.markConversationAsRead = async function (conversationId, userId) {
  return this.updateMany(
    {
      conversationId,
      receiver: userId,
      isRead: false,
    },
    {
      isRead: true,
      readAt: new Date(),
    },
  );
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
