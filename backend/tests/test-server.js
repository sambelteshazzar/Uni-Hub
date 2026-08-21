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
const { sanitizeQuery, sanitizeXss } = require('../middleware/sanitize.middleware');
const { errorHandler } = require('../utils/errorHandler');

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
const ledgerRoutes = require('../routes/ledger.routes');

// Create test app
const createTestApp = () => {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(sanitizeQuery);
  app.use(sanitizeXss);
  app.use(compression());

  // Skip CSRF protection in tests - provide a test token endpoint
  app.get('/api/auth/csrf-token', (req, res) => {
    res.json({ success: true, csrfToken: 'test-csrf-token' });
  });
  app.use((req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {return next();}
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
      message: 'JERTS CART API Test Server',
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

  app.use('/api/ledger', ledgerRoutes);
  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });

  // Global error handler (centralized, handles SQLite + JWT + ApiError)
  app.use(errorHandler);

  return app;
};

module.exports = { createTestApp };
