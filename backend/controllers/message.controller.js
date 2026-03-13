const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db, generateId, toBool, fromBool, parseJson, stringifyJson } = require('../utils/db');

function escapeRegex (str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findOrCreateConversation (userId1, userId2, productId) {
  const existing = db('conversations').db.prepare(
    `SELECT c.* FROM conversations c
     JOIN conversation_participants cp1 ON cp1.conversationId = c.id AND cp1.userId = ?
     JOIN conversation_participants cp2 ON cp2.conversationId = c.id AND cp2.userId = ?
     WHERE c.productId ${productId ? '= ?' : 'IS NULL'}
     LIMIT 1`
  ).get(userId1, userId2, ...(productId ? [productId] : []));

  if (existing) {
    return existing;
  }

  const conversation = db('conversations').create({
    productId: productId || null,
    lastMessage: null,
    lastActivity: new Date().toISOString(),
    status: 'active',
  });

  db('conversation_participants').create({
    conversationId: conversation.id,
    userId: userId1,
    unreadCount: 0,
  });
  db('conversation_participants').create({
    conversationId: conversation.id,
    userId: userId2,
    unreadCount: 0,
  });

  return conversation;
}

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, receiverId, content, type = 'text', imageUrl, productId } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Receiver ID and content are required',
      });
    }

    const receiver = db('users').findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        error: 'Receiver not found',
      });
    }

    let conversation;
    if (conversationId) {
      conversation = db('conversations').findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }
    } else {
      conversation = await findOrCreateConversation(req.user.id, receiverId, productId);
    }

    const message = db('messages').create({
      conversationId: conversation.id,
      sender: req.user.id,
      receiver: receiverId,
      content,
      type,
      imageUrl: type === 'image' ? imageUrl : null,
      isRead: 0,
    });

    db('conversations').updateById(conversation.id, {
      lastMessage: message.id,
      lastActivity: new Date().toISOString(),
    });

    const participant = db('conversation_participants').findOne({
      conversationId: conversation.id,
      userId: receiverId,
    });
    if (participant) {
      db('conversation_participants').updateById(participant.id, {
        unreadCount: (participant.unreadCount || 0) + 1,
      });
    }

    const senderUser = db('users').findById(req.user.id);
    const populatedMessage = {
      ...message,
      sender: senderUser ? { id: senderUser.id, fullName: senderUser.fullName, avatar: senderUser.avatar, university: senderUser.university } : null,
      receiver: { id: receiver.id, fullName: receiver.fullName, avatar: receiver.avatar, university: receiver.university },
    };

    if (productId) {
      const product = db('products').findById(productId);
      populatedMessage.product = product ? { id: product.id, title: product.title, price: product.price, images: parseJson(product.images) } : null;
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message: populatedMessage,
        conversationId: conversation.id,
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

exports.getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const conversation = db('conversations').findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    const participants = db('conversation_participants').find({ conversationId });
    const isParticipant = participants.some(p => p.userId === req.user.id);

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this conversation',
      });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const countRow = db('messages').db.prepare(
      `SELECT COUNT(*) as count FROM messages m
       LEFT JOIN message_deleted_by mdb ON mdb.messageId = m.id AND mdb.userId = ?
       WHERE m.conversationId = ? AND mdb.id IS NULL`
    ).get(req.user.id, conversationId);

    const totalFiltered = countRow.count;

    const rows = db('messages').db.prepare(
      `SELECT m.* FROM messages m
       LEFT JOIN message_deleted_by mdb ON mdb.messageId = m.id AND mdb.userId = ?
       WHERE m.conversationId = ? AND mdb.id IS NULL
       ORDER BY m.createdAt DESC
       LIMIT ? OFFSET ?`
    ).all(req.user.id, conversationId, limitNum, offset);

    const senderIds = [...new Set(rows.map(m => m.sender))];
    const receiverIds = [...new Set(rows.map(m => m.receiver))];
    const allUserIds = [...new Set([...senderIds, ...receiverIds])];

    const userMap = {};
    if (allUserIds.length > 0) {
      const placeholders = allUserIds.map(() => '?').join(',');
      const userRows = db('users').db.prepare(
        `SELECT id, fullName, avatar, university FROM users WHERE id IN (${placeholders})`
      ).all(...allUserIds);
      for (const u of userRows) {
        userMap[u.id] = u;
      }
    }

    const messages = rows.map(msg => {
      const sender = userMap[msg.sender];
      const receiver = userMap[msg.receiver];
      return {
        ...msg,
        isRead: fromBool(msg.isRead),
        sender: sender ? { id: sender.id, fullName: sender.fullName, avatar: sender.avatar, university: sender.university } : null,
        receiver: receiver ? { id: receiver.id, fullName: receiver.fullName, avatar: receiver.avatar, university: receiver.university } : null,
      };
    });

    db('messages').updateMany(
      { conversationId, receiver: req.user.id, isRead: 0 },
      { isRead: toBool(true), readAt: new Date().toISOString() },
    );

    const convParticipant = db('conversation_participants').findOne({
      conversationId,
      userId: req.user.id,
    });
    if (convParticipant) {
      db('conversation_participants').updateById(convParticipant.id, { unreadCount: 0 });
    }

    res.json({
      success: true,
      data: {
        messages: messages.reverse(),
        total: totalFiltered,
        pages: Math.ceil(totalFiltered / limitNum),
        currentPage: pageNum,
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

exports.getUserConversations = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'active' } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const totalRow = db('conversations').db.prepare(
      `SELECT COUNT(*) as count FROM conversations c
       JOIN conversation_participants cp ON cp.conversationId = c.id
       WHERE cp.userId = ? AND c.status = ?`
    ).get(req.user.id, status);

    const rows = db('conversations').db.prepare(
      `SELECT c.* FROM conversations c
       JOIN conversation_participants cp ON cp.conversationId = c.id
       WHERE cp.userId = ? AND c.status = ?
       ORDER BY c.lastActivity DESC
       LIMIT ? OFFSET ?`
    ).all(req.user.id, status, limitNum, offset);

    const conversations = [];
    for (const conv of rows) {
      const participants = db('conversation_participants').find({ conversationId: conv.id });
      const otherParticipant = participants.find(p => p.userId !== req.user.id);
      const otherUser = otherParticipant ? db('users').findById(otherParticipant.userId) : null;

      const lastMsg = conv.lastMessage ? db('messages').findById(conv.lastMessage) : null;

      let product = null;
      if (conv.productId) {
        product = db('products').findById(conv.productId);
      }

      conversations.push({
        ...conv,
        participants: participants.map(p => {
          const u = db('users').findById(p.userId);
          return u ? { id: u.id, fullName: u.fullName, avatar: u.avatar, university: u.university, isOnline: fromBool(u.isOnline) } : null;
        }).filter(Boolean),
        otherUser: otherUser ? { id: otherUser.id, fullName: otherUser.fullName, avatar: otherUser.avatar, university: otherUser.university } : null,
        lastMessage: lastMsg ? { content: lastMsg.content, sender: lastMsg.sender, createdAt: lastMsg.createdAt, type: lastMsg.type } : null,
        product: product ? { id: product.id, title: product.title, price: product.price, images: parseJson(product.images) } : null,
        unreadCount: participants.find(p => p.userId === req.user.id)?.unreadCount || 0,
      });
    }

    const unreadRow = db('conversations').db.prepare(
      `SELECT COALESCE(SUM(unreadCount), 0) as total FROM conversation_participants WHERE userId = ?`
    ).get(req.user.id);

    res.json({
      success: true,
      data: {
        conversations,
        total: totalRow.count,
        pages: Math.ceil(totalRow.count / limitNum),
        currentPage: pageNum,
        unreadCount: unreadRow.total,
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

exports.getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = db('conversations').findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    const participants = db('conversation_participants').find({ conversationId });
    const isParticipant = participants.some(p => p.userId === req.user.id);

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this conversation',
      });
    }

    const convParticipant = db('conversation_participants').findOne({
      conversationId,
      userId: req.user.id,
    });
    if (convParticipant) {
      db('conversation_participants').updateById(convParticipant.id, { unreadCount: 0 });
    }

    const populatedConversation = {
      ...conversation,
      participants: participants.map(p => {
        const u = db('users').findById(p.userId);
        return u ? { id: u.id, fullName: u.fullName, avatar: u.avatar, university: u.university, isOnline: fromBool(u.isOnline) } : null;
      }).filter(Boolean),
    };

    if (conversation.lastMessage) {
      const lastMsg = db('messages').findById(conversation.lastMessage);
      populatedConversation.lastMessage = lastMsg ? { content: lastMsg.content, sender: lastMsg.sender, createdAt: lastMsg.createdAt, type: lastMsg.type } : null;
    }

    if (conversation.productId) {
      const product = db('products').findById(conversation.productId);
      populatedConversation.product = product ? { id: product.id, title: product.title, price: product.price, images: parseJson(product.images) } : null;
    }

    res.json({
      success: true,
      data: populatedConversation,
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get conversation',
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = db('messages').findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
      });
    }

    if (message.receiver !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    db('messages').updateById(messageId, {
      isRead: toBool(true),
      readAt: new Date().toISOString(),
    });

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

exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = db('messages').findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
      });
    }

    const isSenderOrReceiver = message.sender === req.user.id || message.receiver === req.user.id;

    if (!isSenderOrReceiver) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this message',
      });
    }

    const alreadyDeleted = db('message_deleted_by').findOne({ messageId, userId: req.user.id });
    if (!alreadyDeleted) {
      db('message_deleted_by').create({ messageId, userId: req.user.id });
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

exports.getUnreadCount = async (req, res) => {
  try {
    const count = db('messages').countDocuments({ receiver: req.user.id, isRead: 0 });

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

exports.searchMessages = async (req, res) => {
  try {
    const { query, conversationId, page = 1, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let sql = `SELECT m.* FROM messages m
     LEFT JOIN message_deleted_by mdb ON mdb.messageId = m.id AND mdb.userId = ?
     WHERE m.content LIKE ? AND mdb.id IS NULL`;
  const escapedQuery = escapeRegex(query).replace(/%/g, '\\%').replace(/_/g, '\\_');
  const params = [req.user.id, `%${escapedQuery}%`];

    if (conversationId) {
      sql += ' AND m.conversationId = ?';
      params.push(conversationId);
    }

    const countSql = sql.replace('SELECT m.*', 'SELECT COUNT(*) as count');
    const countRow = db('messages').db.prepare(countSql).get(...params);
    const count = countRow.count;

    sql += ' ORDER BY m.createdAt DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

  const rows = db('messages').db.prepare(sql).all(...params);

  const senderIds = [...new Set(rows.map(m => m.sender))];
  const receiverIds = [...new Set(rows.map(m => m.receiver))];
  const allUserIds = [...new Set([...senderIds, ...receiverIds])];

  const userMap = {};
  if (allUserIds.length > 0) {
    const placeholders = allUserIds.map(() => '?').join(',');
    const userRows = db('users').db.prepare(
      `SELECT id, fullName, avatar, university FROM users WHERE id IN (${placeholders})`
    ).all(...allUserIds);
    for (const u of userRows) {
      userMap[u.id] = u;
    }
  }

  const messages = rows.map(msg => {
    const sender = userMap[msg.sender];
    const receiver = userMap[msg.receiver];
    return {
      ...msg,
      isRead: fromBool(msg.isRead),
      sender: sender ? { id: sender.id, fullName: sender.fullName, avatar: sender.avatar, university: sender.university } : null,
      receiver: receiver ? { id: receiver.id, fullName: receiver.fullName, avatar: receiver.avatar, university: receiver.university } : null,
    };
  });

    res.json({
      success: true,
      data: {
        messages,
        total: count,
        pages: Math.ceil(count / limitNum),
        currentPage: pageNum,
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
