const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db, generateId, toBool, fromBool, parseJson, stringifyJson } = require('../utils/db');

function escapeRegex (str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findOrCreateConversation (userId1, userId2, productId) {
  const existing = await db('conversations').rawGet(
    `SELECT c.* FROM conversations c
    JOIN conversation_participants cp1 ON cp1.conversationId = c.id AND cp1.userId = ?
    JOIN conversation_participants cp2 ON cp2.conversationId = c.id AND cp2.userId = ?
    WHERE c.product ${productId ? '= ?' : 'IS NULL'}
    LIMIT 1`,
    userId1, userId2, ...(productId ? [productId] : []),
  );

  if (existing) {
    return existing;
  }

  const conversation = await db('conversations').create({
    product: productId || null,
    lastMessage: null,
    lastActivity: new Date().toISOString(),
    status: 'active',
    createdBy: userId1,
  });

  await db('conversation_participants').create({
    conversationId: conversation.id,
    userId: userId1,
    unreadCount: 0,
  });
  await db('conversation_participants').create({
    conversationId: conversation.id,
    userId: userId2,
    unreadCount: 0,
  });

  return conversation;
}

exports.sendMessage = asyncHandler(async (req, res) => {
  const { conversationId, receiverId, content, type = 'text', imageUrl, productId } = req.body;

  if (!receiverId || !content) {
    throw new ApiError(400, 'Receiver ID and content are required');
  }

  const receiver = await db('users').findById(receiverId);
  if (!receiver) {
    throw new ApiError(404, 'Receiver not found');
  }

  let conversation;
  if (conversationId) {
    conversation = await db('conversations').findById(conversationId);
    if (!conversation) {
      throw new ApiError(404, 'Conversation not found');
    }
  } else {
    conversation = await findOrCreateConversation(req.user.id, receiverId, productId);
  }

  const message = await db('messages').create({
    conversationId: conversation.id,
    sender: req.user.id,
    receiver: receiverId,
    content,
    type,
    imageUrl: type === 'image' ? imageUrl : null,
    isRead: 0,
  });

  await db('conversations').updateById(conversation.id, {
    lastMessage: message.id,
    lastActivity: new Date().toISOString(),
  });

  const participant = await db('conversation_participants').findOne({
    conversationId: conversation.id,
    userId: receiverId,
  });
  if (participant) {
    await db('conversation_participants').updateById(participant.id, {
      unreadCount: (participant.unreadCount || 0) + 1,
    });
  }

  const senderUser = await db('users').findById(req.user.id);
  const populatedMessage = {
    ...message,
    sender: senderUser ? { id: senderUser.id, fullName: senderUser.fullName, avatar: senderUser.avatar, university: senderUser.university } : null,
    receiver: { id: receiver.id, fullName: receiver.fullName, avatar: receiver.avatar, university: receiver.university },
  };

  if (productId) {
    const product = await db('products').findById(productId);
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
});

exports.getConversationMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const conversation = await db('conversations').findById(conversationId);
  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  const participants = await db('conversation_participants').find({ conversationId });
  const isParticipant = participants.some(p => p.userId === req.user.id);

  if (!isParticipant) {
    throw new ApiError(403, 'Not authorized to view this conversation');
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const countRow = await db('messages').rawGet(
    `SELECT COUNT(*) as count FROM messages m
    LEFT JOIN message_deleted_by mdb ON mdb.messageId = m.id AND mdb.userId = ?
    WHERE m.conversationId = ? AND mdb.id IS NULL`,
    req.user.id, conversationId,
  );

  const totalFiltered = countRow.count;

  const rows = await db('messages').rawAll(
    `SELECT m.* FROM messages m
    LEFT JOIN message_deleted_by mdb ON mdb.messageId = m.id AND mdb.userId = ?
    WHERE m.conversationId = ? AND mdb.id IS NULL
    ORDER BY m.createdAt DESC
    LIMIT ? OFFSET ?`,
    req.user.id, conversationId, limitNum, offset,
  );

  const senderIds = [...new Set(rows.map(m => m.sender))];
  const receiverIds = [...new Set(rows.map(m => m.receiver))];
  const allUserIds = [...new Set([...senderIds, ...receiverIds])];

  const userMap = {};
  if (allUserIds.length > 0) {
    const placeholders = allUserIds.map(() => '?').join(',');
    const userRows = await db('users').rawAll(
      `SELECT id, fullName, avatar, university FROM users WHERE id IN (${placeholders})`,
      ...allUserIds,
    );
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

  await db('messages').updateMany(
    { conversationId, receiver: req.user.id, isRead: 0 },
    { isRead: toBool(true), readAt: new Date().toISOString() },
  );

  const convParticipant = await db('conversation_participants').findOne({
    conversationId,
    userId: req.user.id,
  });
  if (convParticipant) {
    await db('conversation_participants').updateById(convParticipant.id, { unreadCount: 0 });
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
});

exports.getUserConversations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status = 'active' } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const totalRow = await db('conversations').rawGet(
    `SELECT COUNT(*) as count FROM conversations c
    JOIN conversation_participants cp ON cp.conversationId = c.id
    WHERE cp.userId = ? AND c.status = ?`,
    [req.user.id, status],
  );

  const rows = await db('conversations').rawAll(
    `SELECT c.* FROM conversations c
    JOIN conversation_participants cp ON cp.conversationId = c.id
    WHERE cp.userId = ? AND c.status = ?
    ORDER BY c.lastActivity DESC
    LIMIT ? OFFSET ?`,
    [req.user.id, status, limitNum, offset],
  );

  const conversations = [];
  for (const conv of rows) {
    const participants = await db('conversation_participants').find({ conversationId: conv.id });
    const otherParticipant = participants.find(p => p.userId !== req.user.id);
    const otherUser = otherParticipant ? await db('users').findById(otherParticipant.userId) : null;

    const lastMsg = conv.lastMessage ? await db('messages').findById(conv.lastMessage) : null;

    let product = null;
    if (conv.product) {
      product = await db('products').findById(conv.product);
    }

    const participantsWithUsers = [];
    for (const p of participants) {
      const u = await db('users').findById(p.userId);
      if (u) {
        participantsWithUsers.push({ id: u.id, fullName: u.fullName, avatar: u.avatar, university: u.university, isOnline: fromBool(u.isOnline) });
      }
    }

    conversations.push({
      ...conv,
      participants: participantsWithUsers,
      otherUser: otherUser ? { id: otherUser.id, fullName: otherUser.fullName, avatar: otherUser.avatar, university: otherUser.university } : null,
      lastMessage: lastMsg ? { content: lastMsg.content, sender: lastMsg.sender, createdAt: lastMsg.createdAt, type: lastMsg.type } : null,
      product: product ? { id: product.id, title: product.title, price: product.price, images: parseJson(product.images) } : null,
      unreadCount: participants.find(p => p.userId === req.user.id)?.unreadCount || 0,
    });
  }

  const unreadRow = await db('conversations').rawGet(
    'SELECT COALESCE(SUM(unreadCount), 0) as total FROM conversation_participants WHERE userId = ?',
    req.user.id,
  );

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
});

exports.getConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  const conversation = await db('conversations').findById(conversationId);

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  const participants = await db('conversation_participants').find({ conversationId });
  const isParticipant = participants.some(p => p.userId === req.user.id);

  if (!isParticipant) {
    throw new ApiError(403, 'Not authorized to view this conversation');
  }

  const convParticipant = await db('conversation_participants').findOne({
    conversationId,
    userId: req.user.id,
  });
  if (convParticipant) {
    await db('conversation_participants').updateById(convParticipant.id, { unreadCount: 0 });
  }

  const participantsWithUsers = [];
  for (const p of participants) {
    const u = await db('users').findById(p.userId);
    if (u) {
      participantsWithUsers.push({ id: u.id, fullName: u.fullName, avatar: u.avatar, university: u.university, isOnline: fromBool(u.isOnline) });
    }
  }

  const populatedConversation = {
    ...conversation,
    participants: participantsWithUsers,
  };

  if (conversation.lastMessage) {
    const lastMsg = await db('messages').findById(conversation.lastMessage);
    populatedConversation.lastMessage = lastMsg ? { content: lastMsg.content, sender: lastMsg.sender, createdAt: lastMsg.createdAt, type: lastMsg.type } : null;
  }

  if (conversation.product) {
    const product = await db('products').findById(conversation.product);
    populatedConversation.product = product ? { id: product.id, title: product.title, price: product.price, images: parseJson(product.images) } : null;
  }

  res.json({
    success: true,
    data: populatedConversation,
  });
});

exports.markAsRead = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await db('messages').findById(messageId);
  if (!message) {
    throw new ApiError(404, 'Message not found');
  }

  if (message.receiver !== req.user.id) {
    throw new ApiError(403, 'Not authorized');
  }

  await db('messages').updateById(messageId, {
    isRead: toBool(true),
    readAt: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'Message marked as read',
  });
});

exports.deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await db('messages').findById(messageId);
  if (!message) {
    throw new ApiError(404, 'Message not found');
  }

  const isSenderOrReceiver = message.sender === req.user.id || message.receiver === req.user.id;

  if (!isSenderOrReceiver) {
    throw new ApiError(403, 'Not authorized to delete this message');
  }

  const alreadyDeleted = await db('message_deleted_by').findOne({ messageId, userId: req.user.id });
  if (!alreadyDeleted) {
    await db('message_deleted_by').create({ messageId, userId: req.user.id });
  }

  res.json({
    success: true,
    message: 'Message deleted successfully',
  });
});

exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await db('messages').countDocuments({ receiver: req.user.id, isRead: 0 });

  res.json({
    success: true,
    data: { count },
  });
});

exports.searchMessages = asyncHandler(async (req, res) => {
  const { query, conversationId, page = 1, limit = 20 } = req.query;

  if (!query) {
    throw new ApiError(400, 'Search query is required');
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
  const countRow = await db('messages').rawGet(countSql, ...params);
  const count = countRow.count;

  sql += ' ORDER BY m.createdAt DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  const rows = await db('messages').rawAll(sql, ...params);

  const senderIds = [...new Set(rows.map(m => m.sender))];
  const receiverIds = [...new Set(rows.map(m => m.receiver))];
  const allUserIds = [...new Set([...senderIds, ...receiverIds])];

  const userMap = {};
  if (allUserIds.length > 0) {
    const placeholders = allUserIds.map(() => '?').join(',');
    const userRows = await db('users').rawAll(
      `SELECT id, fullName, avatar, university FROM users WHERE id IN (${placeholders})`,
      ...allUserIds,
    );
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
});
