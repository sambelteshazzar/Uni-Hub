/**
* ============================================
* Admin Controller
* Handles dashboard stats and admin operations
* ============================================
*/

const { db, mapUserRow, mapProductRow } = require('../utils/db');
const { ApiError } = require('../utils/errorHandler');
const logActivity = require('../utils/logActivity');

exports.getDashboardStats = async (req, res) => {
const totalUsers = await db('users').countDocuments();
const totalProducts = await db('products').countDocuments();
const totalOrders = await db('orders').countDocuments();

const pendingVerifications = await db('student_verifications').countDocuments({ status: 'pending' });

const rawDb = db('orders').db;
const revenueRow = rawDb.prepare("SELECT SUM(pricing_grandTotal) as totalRevenue FROM orders WHERE payment_status = 'completed'").get();
const totalRevenue = revenueRow.totalRevenue || 0;

const recentOrders = await db('orders').find({}, { sort: { createdAt: -1 }, limit: 10 });

const ordersWithUser = await Promise.all(recentOrders.map(async (order) => {
const user = await db('users').findById(order.userId);
return {
...order,
userId: user ? { id: user.id, fullName: user.fullName, email: user.email } : null,
};
}));

res.json({
success: true,
data: {
summary: {
totalUsers,
totalProducts,
totalOrders,
totalRevenue,
pendingVerifications,
},
recentOrders: ordersWithUser,
},
});
};

exports.getAdminProducts = async (req, res) => {
const { status, university, page = 1, limit = 20 } = req.query;

const query = {};
if (status) { query.status = status; }
if (university) { query.university = university; }

const products = await db('products').find(query, {
sort: { createdAt: -1 },
limit: Number(limit),
skip: (page - 1) * limit,
});

const productsWithSeller = await Promise.all(products.map(async (product) => {
const seller = await db('users').findById(product.seller);
return {
...product,
seller: seller ? { id: seller.id, fullName: seller.fullName, email: seller.email, university: seller.university } : null,
};
}));

const total = await db('products').countDocuments(query);

res.json({
success: true,
data: {
products: productsWithSeller,
total,
page: Number(page),
},
});
};

exports.getAdminOrders = async (req, res) => {
const { status, page = 1, limit = 20 } = req.query;

const query = {};
if (status) { query.status = status; }

const orders = await db('orders').find(query, {
sort: { createdAt: -1 },
limit: Number(limit),
skip: (page - 1) * limit,
});

const ordersWithUser = await Promise.all(orders.map(async (order) => {
const user = await db('users').findById(order.userId);
return {
...order,
userId: user ? { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone } : null,
};
}));

const total = await db('orders').countDocuments(query);

res.json({
success: true,
data: {
orders: ordersWithUser,
total,
page: Number(page),
},
});
};

exports.approveProduct = async (req, res) => {
const product = await db('products').findById(req.params.id);

if (!product) {
throw new ApiError(404, 'Product not found');
}

const updated = await db('products').updateById(product.id, {
status: 'active',
approvedBy: req.user.id,
moderationNote: req.body.note || product.moderationNote || 'Approved by admin',
});

await logActivity('admin_approve', req.user, { productId: product.id, title: product.title }, 'info', req);

res.json({
success: true,
message: 'Product approved successfully',
data: { ...updated, _id: updated.id },
});
};

exports.rejectProduct = async (req, res) => {
const product = await db('products').findById(req.params.id);

if (!product) {
throw new ApiError(404, 'Product not found');
}

const reason = req.body.reason;
if (!reason || reason.trim().length < 5) {
throw new ApiError(400, 'Rejection reason must be at least 5 characters');
}

const updated = await db('products').updateById(product.id, {
status: 'rejected',
approvedBy: req.user.id,
moderationNote: reason,
});

await logActivity('admin_reject', req.user, { productId: product.id, title: product.title, reason }, 'warning', req);

res.json({
success: true,
message: 'Product rejected successfully',
data: { ...updated, _id: updated.id },
});
};

exports.banUser = async (req, res) => {
const { reason, action } = req.body;

if (!action || !['ban', 'unban'].includes(action)) {
throw new ApiError(400, 'Action must be "ban" or "unban"');
}

if (action === 'ban' && (!reason || reason.trim().length < 5)) {
throw new ApiError(400, 'Ban reason must be at least 5 characters');
}

const user = await db('users').findById(req.params.id);

if (!user) {
throw new ApiError(404, 'User not found');
}

if (user.role === 'admin') {
throw new ApiError(403, 'Cannot ban another admin user');
}

let updated;
if (action === 'ban') {
updated = await db('users').updateById(user.id, {
isSuspended: true,
isActive: false,
banReason: reason,
bannedAt: new Date().toISOString(),
bannedBy: req.user.id,
});
} else {
updated = await db('users').updateById(user.id, {
isSuspended: false,
isActive: true,
banReason: null,
bannedAt: null,
bannedBy: null,
});
}

await logActivity('admin_ban', req.user, { targetUserId: user.id, targetEmail: user.email, action, reason: reason || null }, action === 'ban' ? 'critical' : 'info', req);

res.json({
success: true,
message: action === 'ban' ? 'User has been banned successfully' : 'User has been unbanned successfully',
data: {
userId: updated.id,
fullName: updated.fullName,
email: updated.email,
isSuspended: updated.isSuspended,
isActive: updated.isActive,
banReason: updated.banReason,
bannedAt: updated.bannedAt,
},
});
};

exports.getBannedUsers = async (req, res) => {
const { page = 1, limit = 20 } = req.query;

const bannedUsers = await db('users').find({ isSuspended: 1 }, {
sort: { bannedAt: -1 },
limit: Number(limit),
skip: (page - 1) * limit,
});

const usersWithBannedBy = await Promise.all(bannedUsers.map(async (user) => {
const bannedByUser = user.bannedBy ? await db('users').findById(user.bannedBy) : null;
return {
...user,
bannedBy: bannedByUser ? { id: bannedByUser.id, fullName: bannedByUser.fullName } : null,
};
}));

const total = await db('users').countDocuments({ isSuspended: 1 });

res.json({
success: true,
data: {
users: usersWithBannedBy,
total,
page: Number(page),
pages: Math.ceil(total / limit),
},
});
};

exports.getActivityLogs = async (req, res) => {
const { action, severity, userId, startDate, endDate, page = 1, limit = 50 } = req.query;

const query = {};
if (action) { query.action = action; }
if (severity) { query.severity = severity; }
if (userId) { query.user = userId; }
if (startDate || endDate) {
query.createdAt = {};
if (startDate) { query.createdAt.$gte = new Date(startDate).toISOString(); }
if (endDate) { query.createdAt.$lte = new Date(endDate).toISOString(); }
}

const logs = await db('activity_logs').find(query, {
sort: { createdAt: -1 },
limit: Number(limit),
skip: (page - 1) * limit,
});

const total = await db('activity_logs').countDocuments(query);

res.json({
success: true,
data: {
logs,
total,
page: Number(page),
pages: Math.ceil(total / limit),
},
});
};

exports.getActivityStats = async (req, res) => {
const rawDb = db('activity_logs').db;
const today = new Date();
today.setHours(0, 0, 0, 0);
const weekAgo = new Date(today);
weekAgo.setDate(weekAgo.getDate() - 7);

const totalToday = rawDb.prepare("SELECT COUNT(*) as count FROM activity_logs WHERE createdAt >= ?").get(today.toISOString()).count;
const totalThisWeek = rawDb.prepare("SELECT COUNT(*) as count FROM activity_logs WHERE createdAt >= ?").get(weekAgo.toISOString()).count;

const byActionRows = rawDb.prepare("SELECT action, COUNT(*) as count FROM activity_logs WHERE createdAt >= ? GROUP BY action").all(weekAgo.toISOString());
const byAction = {};
for (const row of byActionRows) {
byAction[row.action] = row.count;
}

const bySeverityRows = rawDb.prepare("SELECT severity, COUNT(*) as count FROM activity_logs WHERE createdAt >= ? GROUP BY severity").all(weekAgo.toISOString());
const bySeverity = {};
for (const row of bySeverityRows) {
bySeverity[row.severity] = row.count;
}

res.json({
success: true,
data: { totalToday, totalThisWeek, byAction, bySeverity },
});
};

exports.getOnlineUsers = async (req, res) => {
const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
const recentLogins = await db('activity_logs').find(
{ action: 'login', createdAt: { $gte: fiveMinAgo.toISOString() } },
{ sort: { createdAt: -1 } },
);

const seen = new Set();
const onlineUsers = recentLogins.filter(l => {
if (seen.has(l.user)) { return false; }
seen.add(l.user);
return true;
});

res.json({
success: true,
data: {
onlineCount: onlineUsers.length,
users: onlineUsers,
},
});
};

exports.adminCreateProduct = async (req, res) => {
const { title, description, price, category, condition, images, deliveryModes, paymentModes, university } = req.body;

const product = await db('products').create({
title,
description,
price,
category,
condition,
images: images || [],
deliveryModes: deliveryModes || [],
paymentModes: paymentModes || [],
seller: req.user.id,
sellerName: req.user.fullName,
sellerRating: req.user.rating,
university: university || req.user.university,
status: 'active',
approvedBy: req.user.id,
});

await logActivity('product_create', req.user, { productId: product.id, title: product.title, adminCreated: true }, 'info', req);

res.status(201).json({
success: true,
message: 'Product created by admin',
data: { ...product, _id: product.id },
});
};

exports.adminUpdateProduct = async (req, res) => {
const product = await db('products').findById(req.params.id);

if (!product) {
throw new ApiError(404, 'Product not found');
}

const allowedFields = ['title', 'description', 'price', 'category', 'condition', 'images', 'deliveryModes', 'paymentModes', 'status', 'university'];
const updates = {};
allowedFields.forEach(field => {
if (req.body[field] !== undefined) {
updates[field] = req.body[field];
}
});

const updated = await db('products').updateById(product.id, updates);

await logActivity('product_update', req.user, { productId: product.id, title: product.title, adminUpdated: true }, 'info', req);

res.json({
success: true,
message: 'Product updated by admin',
data: { ...updated, _id: updated.id },
});
};

exports.adminDeleteProduct = async (req, res) => {
const product = await db('products').findById(req.params.id);

if (!product) {
throw new ApiError(404, 'Product not found');
}

await db('products').deleteById(req.params.id);

await logActivity('product_delete', req.user, { productId: req.params.id, title: product.title, adminDeleted: true }, 'warning', req);

res.json({
success: true,
message: 'Product deleted by admin',
});
};
