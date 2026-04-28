/**
 * ============================================
 * Uni-Hub Backend API Server
 * ============================================
 * Main entry point for the Express server
 */

require('dotenv').config();

const { initSentry, requestHandler: sentryRequest, errorHandler: sentryError } = require('./utils/sentry');
initSentry();

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

const http = require('http');
const { Server } = require('socket.io');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const userRoutes = require('./routes/user.routes');
const verificationRoutes = require('./routes/verification.routes');
const adminRoutes = require('./routes/admin.routes');
const paymentRoutes = require('./routes/payment.routes');
const deliveryRoutes = require('./routes/delivery.routes');
const reportRoutes = require('./routes/report.routes');
const messageRoutes = require('./routes/message.routes');
const reviewRoutes = require('./routes/review.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const notificationRoutes = require('./routes/notification.routes');
const searchRoutes = require('./routes/search.routes');

// Import database configuration
const { connectDatabase } = require('./config/database');

// Import Socket.io configuration
const { initializeSocket } = require('./config/socket');

// Import error handlers
const { errorHandler, notFoundHandler } = require('./utils/errorHandler');

const { sanitizeQuery, sanitizeXss } = require('./middleware/sanitize.middleware');
const { csrfTokenHandler, csrfProtection } = require('./middleware/csrf.middleware');

// Initialize Express app
const app = express();

app.use(sentryRequest());

// Shared io instance — set during server startup
let io = null;

// ============================================
// Middleware
// ============================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://browser.sentry-cdn.com', 'https://cdn.socket.io', 'http://localhost:5000'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'", 'http://localhost:5000', 'ws://localhost:5000', 'http://127.0.0.1:5000', 'ws://127.0.0.1:5000', 'https://*.sentry.io'],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'unsafe-none' },
  crossOriginEmbedderPolicy: false,
}));

// HTTPS enforcement in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    }
    next();
  });
}

// Enable CORS — support multiple origins from env
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:8000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else if (origin && allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')))) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

// Rate limiting - general
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
});
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
  },
});
app.use('/api/auth/', authLimiter);

// Rate limiting for verification endpoints
const verificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'Too many verification attempts, please try again later.',
  },
});
app.use('/api/verification/', verificationLimiter);

// Rate limiting for review endpoints
const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: 'Too many review submissions, please try again later.',
  },
});
app.use('/api/reviews/', reviewLimiter);

// Rate limiting for message endpoints
const messageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    error: 'Too many messages, please slow down.',
  },
});
app.use('/api/messages/', messageLimiter);

// Rate limiting for order endpoints
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: 'Too many order requests, please try again later.',
  },
});
app.use('/api/orders/', orderLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeQuery);
app.use(sanitizeXss);

// CSRF protection
app.use(csrfTokenHandler);
app.use(csrfProtection);

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ============================================
// API Routes
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Uni-Hub API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Product routes
app.use('/api/products', productRoutes);

// Order routes
app.use('/api/orders', orderRoutes);

// User routes
app.use('/api/users', userRoutes);

// Student verification routes
app.use('/api/verification', verificationRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Payment routes
app.use('/api/payment', paymentRoutes);

// Delivery routes
app.use('/api/delivery', deliveryRoutes);

// Report routes
app.use('/api/reports', reportRoutes);

// Message routes (in-app messaging)
app.use('/api/messages', messageRoutes);

// Review routes (seller ratings)
app.use('/api/reviews', reviewRoutes);

// Wishlist routes
app.use('/api/wishlist', wishlistRoutes);

// Notification routes
app.use('/api/notifications', notificationRoutes);

// Search routes (advanced search, suggestions, trending, history)
app.use('/api/search', searchRoutes);

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
  success: false,
  error: 'Route not found',
  });
});

// Sentry error handler (before custom error handler)
app.use(sentryError());

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Error:', err);

  // SQLite constraint error
  if (err.message && err.message.includes('UNIQUE constraint failed')) {
    return res.status(400).json({
      success: false,
      error: 'A record with this information already exists',
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
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

// ============================================
// Server Startup with Socket.io
// ============================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Validate critical environment variables
    const requiredEnvVars = ['JWT_SECRET'];
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
      console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
      process.exit(1);
    }

  if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
    console.error('JWT_SECRET must be at least 32 characters in production');
    process.exit(1);
  }

    connectDatabase();

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.io
    io = new Server(server, {
      cors: {
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST'],
      },
    });

    // Initialize Socket.io handlers
    initializeSocket(io);

    // Make io accessible to controllers
    app.set('io', io);

    // Start server
    server.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎓 Uni-Hub Backend API                                  ║
║                                                           ║
║   Server running on port ${PORT}                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}                            ║
║   API: http://localhost:${PORT}/api                       ║
║   Health: http://localhost:${PORT}/api/health             ║
║   WebSocket: ws://localhost:${PORT}                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = { app, getIo: () => io };
