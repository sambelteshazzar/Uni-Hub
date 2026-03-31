/**
 * ============================================
 * User Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const User = require('../models/User.model');

/**
 * @desc    Get all users (admin)
 * @route   GET /api/users
 * @access  Private (admin)
 */
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { university, role, page = 1, limit = 20 } = req.query;

    const query = {};
    if (university) query.university = university;
    if (role) query.role = role;

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users: users.map(u => u.getPublicProfile()),
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
});

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user.getPublicProfile(),
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch user',
    });
  }
});

/**
 * @desc    Update user (admin)
 * @route   PUT /api/users/:id
 * @access  Private (admin)
 */
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { isSuspended, role, isVerified } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (isSuspended !== undefined) user.isSuspended = isSuspended;
    if (role !== undefined) user.role = role;
    if (isVerified !== undefined) user.isVerified = isVerified;

    await user.save();

    res.json({
      success: true,
      message: 'User updated',
      data: user.getPublicProfile(),
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update user',
    });
  }
});

/**
 * @desc    Delete user (admin)
 * @route   DELETE /api/users/:id
 * @access  Private (admin)
 */
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Soft delete - deactivate instead of delete
    user.isActive = false;
    await user.save();

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
});

module.exports = router;
