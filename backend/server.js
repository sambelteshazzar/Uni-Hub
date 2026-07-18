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
const session = require('express-session');
const passport = require('passport');

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
scriptSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://browser.sentry-cdn.com', 'https://cdn.socket.io', 'https://cdn.jsdelivr.net', 'https://accounts.google.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", 'http://localhost:5000', 'ws://localhost:5000', 'http://127.0.0.1:5000', 'ws://127.0.0.1:5000', 'https://*.sentry.io', 'https://accounts.google.com', 'https://www.googleapis.com', 'https://uni-hub-bnxi.onrender.com', 'wss://uni-hub-bnxi.onrender.com', 'https://api.cloudinary.com'],
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
      if (process.env.NODE_ENV === 'production') {
        callback(new Error('CORS not allowed'));
      } else {
        callback(null, true);
      }
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

// Session + Passport (for Google OAuth redirect flow)
app.use(session({
  secret: process.env.JWT_SECRET || 'fallback-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 24 * 60 * 60 * 1000 },
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const { db, mapUserRow } = require('./utils/db');
    const user = await db('users').findById(id);
    done(null, user ? mapUserRow(user) : null);
  } catch (err) {
    done(err, null);
  }
});

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
    version: '20250617c',
    deployId: process.env.RAILWAY_DEPLOYMENT_ID || 'local',
  });
});

// TEMPORARY diagnostic endpoint — kept for now to verify the FK repair migration worked
app.get('/api/diagnostics/reviews-schema', async (req, res) => {
  const { getTursoClient, getDb, isTurso } = require('./config/database');
  const out = { isTurso: isTurso(), fkList: [], selectOk: null, insertTest: null, pathTest: null };

  try {
    if (isTurso()) {
      const client = getTursoClient();
      const fk = await client.execute('PRAGMA foreign_key_list(reviews)');
      out.fkList = fk.rows;
    } else {
      const localDb = getDb();
      out.fkList = localDb.prepare('PRAGMA foreign_key_list(reviews)').all();
    }
  } catch (e) { out.fkError = e.message; }

  try {
    if (isTurso()) {
      await getTursoClient().execute('SELECT * FROM reviews LIMIT 1');
    } else {
      getDb().prepare('SELECT * FROM reviews LIMIT 1').all();
    }
    out.selectOk = true;
  } catch (e) { out.selectError = e.message; }

  try {
    if (isTurso()) {
      const client = getTursoClient();
      const r = await client.execute({
        sql: "INSERT INTO reviews (id, reviewer, seller, rating, comment) VALUES (?, ?, ?, ?, ?)",
        args: ['__diag_test__', '__diag_test__', '__diag_test__', 5, 'diag'],
      });
      out.insertTest = { ok: true, rowsAffected: r.rowsAffected };
      await client.execute({ sql: "DELETE FROM reviews WHERE id = ?", args: ['__diag_test__'] });
    } else {
      const localDb = getDb();
      localDb.prepare('INSERT INTO reviews (id, reviewer, seller, rating, comment) VALUES (?, ?, ?, ?, ?)').run('__diag_test__','__diag_test__','__diag_test__',5,'diag');
      localDb.prepare("DELETE FROM reviews WHERE id = ?").run('__diag_test__');
      out.insertTest = { ok: true };
    }
  } catch (e) { out.insertTest = { ok: false, error: e.message, code: e.code }; }

  // Reproduce the actual getSellerReviews code path with a known seller ID
  try {
    const { db, mapReviewRow } = require('./utils/db');
    const sellerId = '949cc9ef-bba3-43d4-a0d1-9dad0b1c3815';
    const seller = await db('users').findById(sellerId);
    out.pathTest = { sellerFound: !!seller, sellerName: seller?.fullName };
    if (seller) {
      const reviews = await db('reviews').find(
        { seller: sellerId },
        { sort: { createdAt: -1 }, limit: 10, skip: 0 },
      );
      out.pathTest.reviewsFound = reviews.length;
      const total = await db('reviews').countDocuments({ seller: sellerId });
      out.pathTest.total = total;
      const row = await db('reviews').rawGet(
        `SELECT AVG(rating) as averageRating, COUNT(*) as totalReviews FROM reviews WHERE seller = ?`,
        sellerId,
      );
      out.pathTest.avg = row;
    }
  } catch (e) { out.pathTest = { ...(out.pathTest || {}), error: e.message, code: e.code, stack: e.stack }; }

  res.json(out);
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

// Sentry error handler (must be before other error handlers)
app.use(sentryError());

// 404 handler
app.use(notFoundHandler);

// Global error handler (uses errorHandler from utils/errorHandler.js)
app.use(errorHandler);

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

    await connectDatabase();

  // Ensure admin user exists
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@unihub.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
  const bcrypt = require('bcryptjs');
  const { db } = require('./utils/db');
  const existingAdmin = await db('users').findOne({ email: adminEmail });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    await db('users').create({
      fullName: 'Admin',
      email: adminEmail,
      phone: '+233000000000',
      university: 'Uni-Hub',
      level: 'Admin',
      hall: 'System',
      password: hashedPassword,
      role: 'admin',
      isVerified: 1,
    });
    console.log(`✅ Admin user created: ${adminEmail}`);
  }

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

if (require.main === module) {
  startServer();
}

module.exports = { app, getIo: () => io, startServer };
