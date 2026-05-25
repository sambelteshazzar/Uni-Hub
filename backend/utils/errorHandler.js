/**
 * ============================================
 * Error Handling Utilities
 * ============================================
 * Centralized error handling for backend API
 */

/**
 * Custom API Error class with status code
 */
class ApiError extends Error {
  constructor (statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'ApiError';
  }
}

/**
 * Async error handler wrapper
 * Wraps async route handlers to catch errors and pass to error middleware
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle validation errors
 * @param {Object} error - Validation error object
 * @returns {Object} - Formatted error response
 */
const handleValidationError = (error) => {
  if (error.errors && typeof error.errors === 'object') {
    const errors = Object.values(error.errors).map(err => err.message || String(err));
    return {
      statusCode: 400,
      message: 'Validation Error',
      details: errors,
    };
  }
  return {
    statusCode: 400,
    message: error.message || 'Validation Error',
  };
};

/**
 * Handle SQLite constraint errors (replaces Mongoose duplicate key handler)
 * @param {Object} error - SQLite constraint error
 * @returns {Object} - Formatted error response
 */
const handleDuplicateKeyError = (error) => {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'record';
    return {
      statusCode: 400,
      message: `${field} already exists`,
    };
  }
  return {
    statusCode: 400,
    message: error.message || 'Duplicate entry',
  };
};

/**
 * Handle JWT errors
 * @param {Object} error - JWT error object
 * @returns {Object} - Formatted error response
 */
const handleJwtError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return {
      statusCode: 401,
      message: 'Invalid token',
    };
  }

  if (error.name === 'TokenExpiredError') {
    return {
      statusCode: 401,
      message: 'Token expired',
    };
  }

  return null;
};

/**
 * Global error handler middleware
 * @param {Object} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, _next) => {
  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  let errorResponse = {
    statusCode: err.statusCode || 500,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  };

  if (err.name === 'ApiError') {
    errorResponse = {
      statusCode: err.statusCode,
      message: err.message,
      ...(err.details && { details: err.details }),
    };
  } else if (err.name === 'ValidationError') {
    errorResponse = handleValidationError(err);
  } else if (err.code === 11000) {
    errorResponse = handleDuplicateKeyError(err);
  } else if (err.name === 'SqliteError' || err.code === 'SQLITE_CONSTRAINT') {
    errorResponse = handleDuplicateKeyError(err);
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    errorResponse = handleJwtError(err);
  }

  // Send error response
  res.status(errorResponse.statusCode).json({
    success: false,
    error: errorResponse.message,
    ...(errorResponse.details && { details: errorResponse.details }),
  });
};

/**
 * 404 Not Found handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.originalUrl}`,
  });
};

module.exports = {
  ApiError,
  asyncHandler,
  errorHandler,
  notFoundHandler,
  handleValidationError,
  handleDuplicateKeyError,
  handleJwtError,
};
