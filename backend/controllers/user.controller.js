const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db } = require('../utils/db');
const { POLICY_VERSION } = require('../config/policies');
const logActivity = require('../utils/logActivity');

function getPublicProfile (user) {
  if (!user) {return null;}
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    university: user.university,
    level: user.level,
    hall: user.hall,
    avatar: user.avatar,
    bio: user.bio,
    isVerified: user.isVerified,
    rating: user.rating,
    totalOrders: user.totalOrders,
    totalSales: user.totalSales,
    totalReviews: user.totalReviews,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

exports.getUsers = asyncHandler(async (req, res) => {
  const { university, role, page = 1, limit = 20 } = req.query;

  const where = {};
  if (university) { where.university = university; }
  if (role) { where.role = role; }

  const users = await db('users').find(where, {
    sort: { createdAt: -1 },
    limit: Number(limit),
    skip: (page - 1) * limit,
  });

  const total = await db('users').countDocuments(where);

  res.json({
    success: true,
    data: {
      users: users.map(u => getPublicProfile(u)),
      total,
      page: Number(page),
    },
  });
});

exports.getUser = asyncHandler(async (req, res) => {
  const user = await db('users').findById(req.params.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // IDOR guard: non-admin users may only fetch their own full profile.
  // Other users receive a minimal, non-sensitive public projection so a
  // buyer cannot enumerate email/phone/studentId across the user base.
  if (req.user.id !== user.id && req.user.role !== 'admin') {
    return res.json({
      success: true,
      data: {
        id: user.id,
        fullName: user.fullName,
        avatar: user.avatar,
        university: user.university,
        rating: user.rating,
      },
    });
  }

  res.json({
    success: true,
    data: getPublicProfile(user),
  });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const { isSuspended, role, isVerified } = req.body;

  const user = await db('users').findById(req.params.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const updates = {};
  if (isSuspended !== undefined) { updates.isSuspended = isSuspended; }
  if (role !== undefined) { updates.role = role; }
  if (isVerified !== undefined) { updates.isVerified = isVerified; }

  const updated = await db('users').updateById(req.params.id, updates);

  res.json({
    success: true,
    message: 'User updated',
    data: getPublicProfile(updated),
  });
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await db('users').findById(req.params.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  await db('users').updateById(req.params.id, { isActive: false });

  res.json({
    success: true,
    message: 'User deactivated',
  });
});

/**
 * @desc Export every entity owned by the requesting user as a JSON download
 * @route GET /api/users/me/export
 * @access private
 */
exports.exportMyData = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const profile = await db('users').findById(userId);
  if (!profile) {
    throw new ApiError(404, 'Account not found');
  }
  const safeProfile = { ...profile };
  // Never export credential material: the password hash, plus any live
  // password-reset token — possessing resetToken before its expiry would
  // allow an account takeover via /api/auth/reset-password.
  delete safeProfile.password;
  delete safeProfile.resetToken;
  delete safeProfile.resetTokenExpiry;

  // Where-clause column names verified against config/database.js:
  // reviews keys the author as `reviewer`; notifications + wishlists key
  // the owner as `user` (not userId).
  const [orders, orderItems, listings, reviews, sent, received, ledgerEntries,
    payouts, verifications, consents, notifications, wishlist] = await Promise.all([
    db('orders').find({ userId }),
    db('order_items').rawAll(
      'SELECT oi.* FROM order_items oi JOIN orders o ON o.id = oi.orderId WHERE o.userId = ?',
      [userId],
    ),
    db('products').find({ seller: userId }),
    db('reviews').find({ reviewer: userId }),
    db('messages').find({ sender: userId }),
    db('messages').find({ receiver: userId }),
    db('ledger_entries').find({ sellerId: userId }),
    db('payouts').find({ sellerId: userId }),
    db('student_verifications').find({ userId }),
    db('consent_records').find({ userId }),
    db('notifications').find({ user: userId }),
    db('wishlists').find({ user: userId }),
  ]);

  const messages = [...sent, ...received];

  res.set({
    'Content-Type': 'application/json',
    'Content-Disposition': 'attachment; filename="jertscart-my-data.json"',
    'Cache-Control': 'no-store',
  });
  res.json({
    exportedAt: new Date().toISOString(),
    policyVersion: POLICY_VERSION,
    profile: safeProfile,
    orders,
    orderItems,
    listings,
    reviews,
    messages,
    ledgerEntries,
    payouts,
    verifications,
    consents,
    notifications,
    wishlist,
  });
});

/**
 * @desc Self-service account deletion = immediate PII anonymization (Act 843).
 *   Financial rows keep referencing the anonymous shell; isActive=0 kills
 *   all sessions via the protect middleware's inactive-user check.
 * @route DELETE /api/users/me
 * @access private
 */
exports.deleteMyAccount = asyncHandler(async (req, res) => {
  const user = await db('users').findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'Account not found');
  }

  const { confirmText, password } = req.body;
  if (confirmText !== 'DELETE') {
    throw new ApiError(400, 'Type DELETE to confirm account deletion');
  }

  const isGoogleOnly = !!user.googleId;
  if (!isGoogleOnly) {
    if (!password || typeof password !== 'string') {
      throw new ApiError(400, 'Password confirmation required');
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      throw new ApiError(401, 'Invalid password');
    }
  }

  await db('users').updateById(user.id, {
    fullName: 'Deleted User',
    email: `deleted_${user.id}@anonymized.invalid`,
    phone: `deleted-${String(user.id).slice(0, 8)}`,
    avatar: '',
    bio: null,
    googleId: null,
    password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
    isActive: 0,
    banReason: 'account deleted by user',
  });

  await logActivity('account_deleted',
    { id: user.id, email: '[redacted]' },
    { method: isGoogleOnly ? 'google' : 'password' },
    'warning', req);

  res.json({ success: true, message: 'Your account has been deleted and your personal data removed.' });
});
