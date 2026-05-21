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

async function getUsers (req, res) {
  try {
    const { university, role, page = 1, limit = 20 } = req.query;

    const where = {};
    if (university) { where.university = university; }
    if (role) { where.role = role; }

    const users = db('users').find(where, {
      sort: { createdAt: -1 },
      limit: Number(limit),
      skip: (page - 1) * limit,
    });

    const total = db('users').countDocuments(where);

    res.json({
      success: true,
      data: {
        users: users.map(u => getPublicProfile(u)),
        total,
        page: Number(page),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch users',
    });
  }
}

async function getUser (req, res) {
  try {
    const user = db('users').findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: getPublicProfile(user),
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch user',
    });
  }
}

async function updateUser (req, res) {
  try {
    const { isSuspended, role, isVerified } = req.body;

    const user = db('users').findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const updates = {};
    if (isSuspended !== undefined) { updates.isSuspended = isSuspended; }
    if (role !== undefined) { updates.role = role; }
    if (isVerified !== undefined) { updates.isVerified = isVerified; }

    const updated = db('users').updateById(req.params.id, updates);

    res.json({
      success: true,
      message: 'User updated',
      data: getPublicProfile(updated),
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update user',
    });
  }
}

async function deleteUser (req, res) {
  try {
    const user = db('users').findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    db('users').updateById(req.params.id, { isActive: false });

    res.json({
      success: true,
      message: 'User deactivated',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete user',
    });
  }
}

module.exports = { getUsers, getUser, updateUser, deleteUser };
