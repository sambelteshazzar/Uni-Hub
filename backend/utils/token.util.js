/**
 * ============================================
 * JWT Token Utilities
 * ============================================
 */

const jwt = require('jsonwebtoken');

/**
 * Generate JWT token
 * @param {string} id - User ID
 * @returns {string} - JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

/**
 * Decode JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded token payload
 */
const decodeToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Generate password reset token (valid for 1 hour)
 * @param {string} id - User ID
 * @returns {string} - Reset token
 */
const generateResetToken = (id) => {
  return jwt.sign({ id, type: 'reset' }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
};

module.exports = { generateToken, decodeToken, generateResetToken };
