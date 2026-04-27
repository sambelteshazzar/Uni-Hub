/**
 * ============================================
 * Authentication Middleware
 * Protect routes with JWT verification
 * ============================================
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

/**
 * Protect routes - Verify JWT token
 * Usage: router.get('/protected', protect, handler)
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route',
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }

      // Check if user is active
      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Account is deactivated',
        });
      }

      // Check if user is suspended
      if (req.user.isSuspended) {
        return res.status(401).json({
          success: false,
          error: 'Account is suspended',
        });
      }

      // Update last login (throttled — only if >5 min since last update)
      const fiveMinAgo = Date.now() - 5 * 60 * 1000;
      if (!req.user.lastLogin || new Date(req.user.lastLogin).getTime() < fiveMinAgo) {
        User.findByIdAndUpdate(req.user._id, { lastLogin: new Date() }).exec();
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
};

/**
 * Authorize specific roles
 * Usage: router.get('/admin', protect, authorize('admin'), handler)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};

/**
 * Optional authentication - Attach user if token exists, but don't require it
 * Usage: router.get('/public', optionalAuth, handler)
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
      } catch (error) {
        // Token invalid, but that's okay for optional auth
        req.user = null;
      }
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = { protect, authorize, optionalAuth };
