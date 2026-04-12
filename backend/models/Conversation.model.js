/**
 * ============================================
 * Conversation Model
 * ============================================
 * Tracks conversations between users
 */

const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  // Participants in the conversation
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],

  // Related product (optional)
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  },

  // Related order (optional, for transaction context)
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },

  // Last message in the conversation
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },

  // Last activity timestamp
  lastActivity: {
    type: Date,
    default: Date.now,
  },

  // Unread count per user
  unreadCount: {
    type: Map,
    of: Number,
    default: {},
  },

  // Conversation status
  status: {
    type: String,
    enum: ['active', 'archived', 'closed'],
    default: 'active',
  },

  // Created by (the initiator)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes for fast queries
conversationSchema.index({ participants: 1, status: 1 });
conversationSchema.index({ lastActivity: -1 });
conversationSchema.index({ product: 1 });
conversationSchema.index({ order: 1 });

// Ensure unique conversation between two users for same product
conversationSchema.index(
  { participants: 1, product: 1 },
  { unique: true, partialFilterExpression: { product: { $exists: true } } }
);

// Virtual for getting the other participant
conversationSchema.virtual('getOtherParticipant').get(function () {
  if (this._otherUserId) {
    return this.participants.find(p => p.toString() !== this._otherUserId);
  }
  return null;
});

// Method to set the "other user" for queries
conversationSchema.methods.setOtherUserId = function (userId) {
  this._otherUserId = userId;
  return this;
};

// Method to update unread count
conversationSchema.methods.updateUnreadCount = async function (userId, increment = true) {
  const currentCount = this.unreadCount.get(userId) || 0;
  this.unreadCount.set(userId, increment ? currentCount + 1 : 0);
  return this.save();
};

// Method to mark conversation as read for a user
conversationSchema.methods.markAsRead = async function (userId) {
  this.unreadCount.set(userId, 0);
  return this.save();
};

// Static method to find or create conversation between two users
conversationSchema.statics.findOrCreateConversation = async function (user1Id, user2Id, productId = null) {
  const query = {
    participants: { $all: [user1Id, user2Id], $size: 2 },
  };

  if (productId) {
    query.product = productId;
  } else {
    query.product = { $exists: false };
  }

  let conversation = await this.findOne(query)
    .populate('participants', 'fullName avatar university')
    .populate('lastMessage')
    .populate('product', 'title price images');

  if (!conversation) {
    conversation = await this.create({
      participants: [user1Id, user2Id],
      product: productId || undefined,
      createdBy: user1Id,
      lastActivity: new Date(),
      unreadCount: {
        [user1Id]: 0,
        [user2Id]: 0,
      },
    });

    conversation = await this.findById(conversation._id)
      .populate('participants', 'fullName avatar university')
      .populate('lastMessage')
      .populate('product', 'title price images');
  }

  return conversation;
};

// Static method to get user's conversations
conversationSchema.statics.getUserConversations = async function (userId, options = {}) {
  const { page = 1, limit = 20, status = 'active' } = options;

  const conversations = await this.find({
    participants: userId,
    status,
  })
    .populate('participants', 'fullName avatar university')
    .populate('lastMessage', 'content sender createdAt type')
    .populate('product', 'title price images')
    .populate('order', 'orderNumber status')
    .sort({ lastActivity: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await this.countDocuments({
    participants: userId,
    status,
  });

  return {
    conversations,
    total: count,
    pages: Math.ceil(count / limit),
    currentPage: page,
  };
};

// Static method to get unread count for user
conversationSchema.statics.getUserUnreadCount = async function (userId) {
  const result = await this.aggregate([
    { $match: { participants: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, totalUnread: { $sum: { $ifNull: [{ $getField: { field: String(userId), input: '$unreadCount' } }, 0] } } } },
  ]);

  return result.length > 0 ? result[0].totalUnread : 0;
};

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
