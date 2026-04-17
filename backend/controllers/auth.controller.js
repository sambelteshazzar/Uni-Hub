const jwt = require("jsonwebtoken");
/**
 * ============================================
 * Authentication Controller
 * Handle register, login, logout, profile
 * ============================================
 */

const User = require('../models/User.model');
const { generateToken } = require('../utils/token.util');
const { ApiError, asyncHandler } = require('../utils/errorHandler');

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, university, level, hall } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, 'Email already registered');
  }

  // Create user
  const user = await User.create({
    fullName,
    email,
    phone,
    password,
    university,
    level,
    hall,
    role: 'buyer',
    isVerified: false,
  });

  // Generate token
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: {
      user: user.getPublicProfile(),
      token,
    },
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    throw new ApiError(400, 'Please provide email and password');
  }

  // Find user and include password
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new ApiError(401, 'Account is deactivated');
  }

  // Check if user is suspended/banned
  if (user.isSuspended) {
    throw new ApiError(
      403,
      user.banReason
        ? `Account suspended: ${user.banReason}`
        : 'Your account has been suspended. Contact support for more information.'
    );
  }

  // Check password
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate token
  const token = generateToken(user._id);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.getPublicProfile(),
      token,
    },
  });
});

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      data: user.getPublicProfile(),
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get profile',
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, phone, bio, hall, level } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Update fields
    if (fullName) { user.fullName = fullName; }
    if (phone) { user.phone = phone; }
    if (bio) { user.bio = bio; }
    if (hall) { user.hall = hall; }
    if (level) { user.level = level; }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user.getPublicProfile(),
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update profile',
    });
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide current and new password',
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to change password',
    });
  }
};

/**
 * @desc    Request password reset (sends email with reset link)
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  const user = await User.findOne({ email });

  if (!user) {
    // Don't reveal if user exists for security
    return res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  }

  // Generate reset token
  const resetToken = generateResetToken(user._id);

  // In production, send email with reset link
  // For now, return the token so frontend can use it
  // NOTE: In production, use nodemailer to send email instead
  res.json({
    success: true,
    message: 'Password reset token generated. In production, this would be emailed to the user.',
    resetToken, // Remove this in production - only for development/testing
  });
});

/**
 * @desc    Reset password using token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new ApiError(400, 'Token and new password are required');
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters');
  }

  // Verify reset token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired reset token');
  }

  // Check token type
  if (decoded.type !== 'reset') {
    throw new ApiError(401, 'Invalid token type');
  }

  // Find user and update password
  const user = await User.findById(decoded.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password reset successfully. You can now log in with your new password.',
  });
});
