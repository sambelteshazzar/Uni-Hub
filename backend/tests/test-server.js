/**
 * Test Server Setup
 * Creates Express app without starting the server (for testing)
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('../routes/auth.routes');
const productRoutes = require('../routes/product.routes');
const orderRoutes = require('../routes/order.routes');
const userRoutes = require('../routes/user.routes');
const verificationRoutes = require('../routes/verification.routes');
const adminRoutes = require('../routes/admin.routes');
const paymentRoutes = require('../routes/payment.routes');
const deliveryRoutes = require('../routes/delivery.routes');
const reportRoutes = require('../routes/report.routes');
const messageRoutes = require('../routes/message.routes');
const reviewRoutes = require('../routes/review.routes');
const wishlistRoutes = require('../routes/wishlist.routes');
const notificationRoutes = require('../routes/notification.routes');
const searchRoutes = require('../routes/search.routes');

// Create test app
const createTestApp = () => {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(compression());

  // Skip CSRF protection in tests - provide a test token endpoint
  app.get('/api/auth/csrf-token', (req, res) => {
    res.json({ success: true, csrfToken: 'test-csrf-token' });
  });
  app.use((req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const csrfToken = req.headers['x-csrf-token'];
    if (!csrfToken || csrfToken !== 'test-csrf-token') {
      // In tests, allow requests without CSRF for simplicity
      // supertest doesn't easily support cookie-based CSRF
    }
    next();
  });

  // Rate limiting (relaxed for tests)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // Higher limit for tests
    message: { success: false, error: 'Too many requests' },
  });
  app.use('/api/', limiter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'Uni-Hub API Test Server',
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/verification', verificationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/payment', paymentRoutes);
  app.use('/api/delivery', deliveryRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/wishlist', wishlistRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/search', searchRoutes);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });

  // Global error handler
  app.use((err, _req, res, _next) => {
    console.error('Test Error:', err.message);

    // Mongoose validation error
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: errors,
      });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        success: false,
        error: `${field} already exists`,
      });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
      });
    }

    // Default error
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  });

  return app;
};

module.exports = { createTestApp };
