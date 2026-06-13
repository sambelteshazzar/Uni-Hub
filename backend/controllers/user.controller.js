const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db } = require('../utils/db');

function getPublicProfile (user) {
  if (!user) return null;
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