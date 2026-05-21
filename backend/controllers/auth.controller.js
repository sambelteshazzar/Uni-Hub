const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db, mapUserRow } = require('../utils/db');
const { generateToken, generateResetToken } = require('../utils/token.util');
const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { sendPasswordResetEmail } = require('../utils/emailService');
const logActivity = require('../utils/logActivity');

function getPublicProfile(user) {
  const { password: _, resetToken: __, resetTokenExpiry: ___, passwordChangedAt: ____, bannedBy: _____, ...profile } = user;
  profile._id = profile.id;
  return profile;
}

/**
 * @desc Register new user
 * @route POST /api/auth/register
 * @access Public
 */
exports.register = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, university, level, hall } = req.body;

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    throw new ApiError(400, 'Full name is required (at least 2 characters)');
  }

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'A valid email is required');
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters');
  }

  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)) {
    throw new ApiError(400, 'Password must contain uppercase, lowercase, number, and special character');
  }

  if (!university || typeof university !== 'string') {
    throw new ApiError(400, 'University is required');
  }

  if (phone && typeof phone === 'string' && !/^[\d\s+\-()]{7,15}$/.test(phone)) {
    throw new ApiError(400, 'Invalid phone number format');
  }

  const existingUser = await db('users').findOne({ email });
  if (existingUser) {
    throw new ApiError(400, 'Email already registered');
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await db('users').create({
    fullName,
    email,
    phone,
    password: hashedPassword,
    university,
    level,
    hall,
    role: ['seller', 'buyer'].includes(req.body.role) ? req.body.role : 'buyer',
    isVerified: 0,
  });

  const mappedUser = mapUserRow(user);

  const token = generateToken(mappedUser.id);

  await logActivity('signup', mappedUser, { email: mappedUser.email, university: mappedUser.university }, 'info', req);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: {
      user: getPublicProfile(mappedUser),
      token,
    },
  });
});

/**
 * @desc Login user
 * @route POST /api/auth/login
 * @access Public
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Please provide email and password');
  }

  const user = await db('users').findOne({ email });

  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const mappedUser = mapUserRow(user);

  if (!mappedUser.isActive) {
    throw new ApiError(401, 'Account is deactivated');
  }

  if (mappedUser.isSuspended) {
    throw new ApiError(
      403,
      mappedUser.banReason
        ? `Account suspended: ${mappedUser.banReason}`
        : 'Your account has been suspended. Contact support for more information.',
    );
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  await db('users').updateById(user.id, { lastLogin: new Date().toISOString() });

  const token = generateToken(mappedUser.id);

  await logActivity('login', mappedUser, { email: mappedUser.email }, 'info', req);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: getPublicProfile(mappedUser),
      token,
    },
  });
});

/**
 * @desc Get current user profile
 * @route GET /api/auth/me
 * @access Private
 */
exports.getMe = async (req, res) => {
  try {
    const user = await db('users').findById(req.user.id);
    const mappedUser = mapUserRow(user);

    res.json({
      success: true,
      data: getPublicProfile(mappedUser),
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
 * @desc Update user profile
 * @route PUT /api/auth/profile
 * @access Private
 */
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, phone, bio, hall, level } = req.body;

    const user = await db('users').findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const updates = {};
    if (fullName) updates.fullName = fullName;
    if (phone) updates.phone = phone;
    if (bio) updates.bio = bio;
    if (hall) updates.hall = hall;
    if (level) updates.level = level;

    const updatedUser = await db('users').updateById(user.id, updates);
    const mappedUser = mapUserRow(updatedUser);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: getPublicProfile(mappedUser),
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
 * @desc Change password
 * @route PUT /api/auth/change-password
 * @access Private
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

    const user = await db('users').findById(req.user.id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db('users').updateById(user.id, {
      password: hashedPassword,
      passwordChangedAt: new Date().toISOString(),
    });

    const mappedUser = mapUserRow(user);
    await logActivity('password_change', mappedUser, { email: mappedUser.email }, 'warning', req);

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
 * @desc Request password reset (sends email with reset link)
 * @route POST /api/auth/forgot-password
 * @access Public
 */
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  const user = await db('users').findOne({ email });

  if (!user) {
    return res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  }

  const resetToken = generateResetToken(user.id);
  await db('users').updateById(user.id, {
    resetToken,
    resetTokenExpiry: Date.now() + 3600000,
  });

  if (process.env.NODE_ENV === 'production' || process.env.EMAIL_USER) {
    await sendPasswordResetEmail(user.email, resetToken);
  }

  res.json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.',
  });
});

/**
 * @desc Reset password using token
 * @route POST /api/auth/reset-password
 * @access Public
 */
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new ApiError(400, 'Token and new password are required');
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters with uppercase, lowercase, number, and special character');
  }

  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(newPassword)) {
    throw new ApiError(400, 'Password must contain uppercase, lowercase, number, and special character');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired reset token');
  }

  if (decoded.type !== 'reset') {
    throw new ApiError(401, 'Invalid token type');
  }

  const user = await db('users').findById(decoded.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.resetToken !== token) {
    throw new ApiError(401, 'Reset token has already been used or is invalid');
  }

  if (user.resetTokenExpiry && Date.now() > user.resetTokenExpiry) {
    throw new ApiError(401, 'Reset token has expired');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await db('users').updateById(user.id, {
    password: hashedPassword,
    passwordChangedAt: new Date().toISOString(),
    resetToken: null,
    resetTokenExpiry: null,
  });

  res.json({
    success: true,
    message: 'Password reset successfully. You can now log in with your new password.',
  });
});
