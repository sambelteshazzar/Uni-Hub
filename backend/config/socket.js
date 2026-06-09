/**
* ============================================
* Socket.io Configuration
* Real-time messaging for Uni-Hub
* ============================================
*/

const jwt = require('jsonwebtoken');
const { db, mapUserRow, mapProductRow, fromBool, toBool } = require('../utils/db');

const onlineUsers = new Map();

function addUserSocket (userId, socketId) {
if (!onlineUsers.has(userId)) {
onlineUsers.set(userId, new Set());
}
onlineUsers.get(userId).add(socketId);
}

function removeUserSocket (userId, socketId) {
const sockets = onlineUsers.get(userId);
if (sockets) {
sockets.delete(socketId);
if (sockets.size === 0) {
onlineUsers.delete(userId);
}
}
}

function getUserSockets (userId) {
return onlineUsers.has(userId) ? [...onlineUsers.get(userId)] : [];
}

const initializeSocket = (io) => {
io.use(async (socket, next) => {
try {
const token = socket.handshake.auth?.token || socket.handshake.query?.token;

if (!token) {
return next(new Error('Authentication error: No token provided'));
}

const decoded = jwt.verify(token, process.env.JWT_SECRET);
socket.userId = decoded.id;
socket.user = decoded;

next();
} catch (error) {
next(new Error('Authentication error: Invalid token'));
}
});

io.on('connection', (socket) => {
console.log(`User connected: ${socket.userId}`);

addUserSocket(socket.userId, socket.id);

socket.join(`user_${socket.userId}`);

socket.on('join_conversation', async (conversationId) => {
try {
const conversation = await db('conversations').findById(conversationId);

if (!conversation) {
socket.emit('error', { message: 'Conversation not found' });
return;
}

const participant = await db('conversation_participants')
.findOne({ conversationId, userId: socket.userId });

if (!participant) {
socket.emit('error', { message: 'Not authorized to join this conversation' });
return;
}

socket.join(`conversation_${conversationId}`);

socket.to(`conversation_${conversationId}`).emit('user_typing', {
userId: socket.userId,
isTyping: false,
});
} catch (error) {
socket.emit('error', { message: 'Failed to join conversation' });
}
});

socket.on('leave_conversation', (conversationId) => {
socket.leave(`conversation_${conversationId}`);
});

socket.on('send_message', async (data) => {
try {
const { conversationId, content, type = 'text', imageUrl, productId } = data;

if (!conversationId || !content) {
socket.emit('error', { message: 'Conversation ID and content are required' });
return;
}

const conversation = await db('conversations').findById(conversationId);

if (!conversation) {
socket.emit('error', { message: 'Conversation not found' });
return;
}

const participants = await db('conversation_participants')
.find({ conversationId });

const receiverParticipant = participants.find(p => p.userId !== socket.userId);

if (!receiverParticipant) {
socket.emit('error', { message: 'Invalid conversation' });
return;
}

const receiverId = receiverParticipant.userId;

const message = await db('messages').create({
conversationId,
sender: socket.userId,
receiver: receiverId,
content,
type,
imageUrl: type === 'image' ? imageUrl : undefined,
product: productId || null,
});

await db('conversations').updateById(conversationId, {
lastMessage: message.id,
lastActivity: new Date().toISOString(),
});

await db('conversation_participants').rawRun(
`UPDATE conversation_participants SET unreadCount = unreadCount + 1 WHERE conversationId = ? AND userId = ?`,
conversationId, receiverId
);

const senderUser = await db('users').findById(socket.userId);
const receiverUser = await db('users').findById(receiverId);

const broadcastMessage = {
...message,
sender: senderUser ? { id: senderUser.id, fullName: senderUser.fullName, avatar: senderUser.avatar, university: senderUser.university } : null,
receiver: receiverUser ? { id: receiverUser.id, fullName: receiverUser.fullName, avatar: receiverUser.avatar, university: receiverUser.university } : null,
};

if (productId) {
const productRow = await db('products').findById(productId);
broadcastMessage.product = productRow ? { id: productRow.id, title: productRow.title, price: productRow.price, images: JSON.parse(productRow.images || '[]') } : null;
}

io.to(`conversation_${conversationId}`).emit('new_message', {
message: broadcastMessage,
conversationId,
});

const receiverSockets = getUserSockets(receiverId);
if (receiverSockets.length === 0) {
}
} catch (error) {
socket.emit('error', { message: 'Failed to send message' });
}
});

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

socket.on('message_read', async (data) => {
try {
const { messageId } = data;

const message = await db('messages').findById(messageId);
if (!message) {
return;
}

if (!fromBool(message.isRead)) {
await db('messages').updateById(messageId, {
isRead: toBool(true),
readAt: new Date().toISOString(),
});

const senderSockets = getUserSockets(message.sender);
senderSockets.forEach(socketId => {
io.to(socketId).emit('message_read', {
messageId,
conversationId: message.conversationId,
readBy: socket.userId,
});
});
}
} catch (error) {
}
});

socket.on('disconnect', () => {
removeUserSocket(socket.userId, socket.id);
console.log(`User disconnected: ${socket.userId}`);

if (!onlineUsers.has(socket.userId)) {
io.emit('user_offline', { userId: socket.userId });
}
});
});

return {
onlineUsers,
io,
};
};

module.exports = { initializeSocket };
