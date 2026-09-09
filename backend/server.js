/**
 * ============================================
 * JERTS CART Backend API Server
 * ============================================
 * Main entry point for the Express server
 */

require('dotenv').config();

const {
  initSentry,
  requestHandler: sentryRequest,
  errorHandler: sentryError,
} = require('./utils/sentry');
initSentry();

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', error => {
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
const newsletterRoutes = require('./routes/newsletter.routes');
const ledgerRoutes = require('./routes/ledger.routes');
const couponRoutes = require('./routes/coupon.routes');
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

// Render sits behind Cloudflare, so the client's real IP traverses two
// proxy hops before reaching Express: Cloudflare → Render LB → app.
// trust proxy = 2 lets express-rate-limit key off the real client IP
// (one bucket per user) instead of the shared proxy IP, which would
// otherwise collapse all users into a single rate-limit counter and
// trip limits prematurely. If you remove Cloudflare, set this back to 1.
app.set('trust proxy', 2);

app.use(sentryRequest());

// Shared io instance — set during server startup
let io = null;

// ============================================
// Middleware
// ============================================

// Security headers
const crypto = require('crypto');

app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ['\'self\''],
        scriptSrc: [
          '\'self\'',
          (req, res) => `'nonce-${res.locals.cspNonce}'`,
          'https://fonts.googleapis.com',
          'https://browser.sentry-cdn.com',
          'https://cdn.socket.io',
          'https://cdn.jsdelivr.net',
          'https://accounts.google.com',
          'https://js.paystack.co',
        ],
        styleSrc: [
          '\'self\'',
          (req, res) => `'nonce-${res.locals.cspNonce}'`,
          'https://fonts.googleapis.com',
        ],
        fontSrc: ['\'self\'', 'https://fonts.gstatic.com'],
        imgSrc: ['\'self\'', 'data:', 'https:', 'blob:'],
        connectSrc: [
          '\'self\'',
          'http://localhost:5000',
          'ws://localhost:5000',
          'http://127.0.0.1:5000',
          'ws://127.0.0.1:5000',
          'https://*.sentry.io',
          'https://accounts.google.com',
          'https://www.googleapis.com',
          'https://uni-hub-bnxi.onrender.com',
          'wss://uni-hub-bnxi.onrender.com',
          'https://api.cloudinary.com',
          'https://api.paystack.co',
        ],
        frameAncestors: ['\'none\''],
        baseUri: ['\'self\''],
        formAction: ['\'self\''],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    crossOriginEmbedderPolicy: false,
  }),
);

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

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else if (
        origin &&
        allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')))
      ) {
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
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      // Sentry browser SDK injects these tracing headers on outgoing fetches
      // (js/utils/sentry.js tracePropagationTargets). Without them, preflight
      // fails and every sentry-traced request (e.g. Google sign-in) is blocked.
      'sentry-trace',
      'baggage',
    ],
  }),
);

// Rate limiting - SPECIFIC endpoints first (must come before general limiter)

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Production keeps the tight 20/15min guard. Development raises it so the
  // documented `npx playwright test` suite (which makes ~20 auth calls for
  // its login flows) can run against the local server without 429s.
  // TODO: security review — confirm the dev/prod split below is acceptable.
  max: process.env.NODE_ENV === 'production' ? 20 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
  },
});
app.use('/api/auth/', authLimiter);

// Rate limiting for verification endpoints. Goals:
//   - Stop a malicious actor from spamming POST /api/verification (real
//     submit abuse — burn our SQLite, fill up the audit log).
//   - NOT lock out a legitimate user who opens the status page a few
//     times while waiting for admin review. (Old: 5/hour for the whole
//     /api/verification/* namespace, which fired on the third page load.)
//   - NOT block admins who hit the admin endpoints frequently.
//   - NOT block the magic-link confirm path (email-client prefetching).
const verificationSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'You have submitted too many times. Please wait an hour and try again.',
  },
  // Only rate-limit the submit endpoint. GETs (status page, admin views)
  // are cheap and should be allowed freely.
  skip: (req) => req.method !== 'POST',
});
app.use('/api/verification/', verificationSubmitLimiter);

// Rate limiting for review endpoints
const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
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
  standardHeaders: true,
  legacyHeaders: false,
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
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many order requests, please try again later.',
  },
});
app.use('/api/orders/', orderLimiter);

// Rate limiting for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many payment requests, please try again later.',
  },
});
app.use('/api/payment/', paymentLimiter);

// Rate limiting for product write endpoints (create/update/delete)
const productWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many product changes, please try again later.',
  },
});
app.use('/api/admin/products', productWriteLimiter);

// Rate limiting for search endpoints
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many search requests, please slow down.',
  },
});
app.use('/api/search/', searchLimiter);

// Rate limiting for newsletter endpoints
const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many subscription attempts, please try again later.',
  },
});
app.use('/api/newsletter/subscribe', newsletterLimiter);

// Rate limiting for admin endpoints (stricter)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many admin requests, please try again later.',
  },
});
app.use('/api/admin/', adminLimiter);

// Rate limiting for upload/file endpoints
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many uploads, please try again later.',
  },
});
app.use('/api/upload', uploadLimiter);

// Rate limiting - GENERAL (applied last, catches everything else)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  // Production keeps a strict cap. Development relaxes it so the documented
  // `npx playwright test` suite (which makes well over 100 /api calls) can
  // run against the local server without tripping 429s.
  // TODO: security review — confirm the dev/prod split below is acceptable.
  max: process.env.NODE_ENV === 'production'
    ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session + Passport (for Google OAuth redirect flow)
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && !SESSION_SECRET) {
  console.error('FATAL: no SESSION_SECRET/JWT_SECRET set — refusing to start with an insecure session signing key.');
  process.exit(1);
}
app.use(
  session({
    secret: SESSION_SECRET || 'dev-only-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);
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
    message: 'JERTS CART API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '20250617c',
    deployId: process.env.RAILWAY_DEPLOYMENT_ID || 'local',
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

// Newsletter routes
app.use('/api/newsletter', newsletterRoutes);

// Ledger routes (seller escrow balance)
app.use('/api/ledger', ledgerRoutes);

// Coupon routes — POST /api/coupons/validate (buyer), admin CRUD via /api/admin/coupons
app.use('/api/coupons', couponRoutes);

// Verification-document retention sweep (spec 2026-08-23): destroys assets
// 30 days after decision. Hourly; failures retry next pass.
const { purgeExpiredVerificationDocs } = require('./services/docRetention');
setInterval(() => {
  purgeExpiredVerificationDocs().catch(err =>
    console.error('[docRetention] sweep failed:', err.message));
}, 60 * 60 * 1000).unref();

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

    if (
      process.env.NODE_ENV === 'production' &&
      (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
    ) {
      console.error('JWT_SECRET must be at least 32 characters in production');
      process.exit(1);
    }

    // Refuse to boot in production with the documented default / weak
    // admin password. The fallback below creates an admin with
    // ADMIN_PASSWORD (or 'Admin123!' if unset) — silently seeding a
    // known-weak admin credential in prod is a remote-takeover vector.
    if (process.env.NODE_ENV === 'production') {
      const adminPw = process.env.ADMIN_PASSWORD || '';
      if (adminPw.length < 12 || adminPw === 'Admin123!') {
        console.error(
          'ADMIN_PASSWORD must be set to a strong, unique value (>=12 chars, not the default) in production',
        );
        process.exit(1);
      }
    }

    await connectDatabase();

    // Ensure admin user exists, and keep its password in sync with
    // ADMIN_PASSWORD so that rotating the env var on Render takes effect
    // without a manual DB update (the prior create-only logic meant the
    // first-seeded hash stuck forever and rotating ADMIN_PASSWORD did nothing).
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@unihub.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
    const bcrypt = require('bcryptjs');
    const { db } = require('./utils/db');
    // TODO: security review — admin password sync-on-boot is a behavior change
    // to a security-sensitive path. If ADMIN_PASSWORD is ever leaked, rotating
    // it now actually takes effect (previously it did not). Re-validate that
    // the env-var source on the deploy target is the only place this is set.
    const existingAdmin = await db('users').findOne({ email: adminEmail });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      await db('users').create({
        fullName: 'Admin',
        email: adminEmail,
        phone: '+233000000000',
        university: 'JERTS CART',
        level: 'Admin',
        hall: 'System',
        password: hashedPassword,
        role: 'admin',
        isVerified: 1,
      });
      console.log(`✅ Admin user created: ${adminEmail}`);
    } else if (process.env.NODE_ENV === 'production' && adminPassword !== 'Admin123!') {
      const matches = await bcrypt.compare(adminPassword, existingAdmin.password);
      if (!matches) {
        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        await db('users').updateById(existingAdmin.id, {
          password: hashedPassword,
        });
        console.log(`🔄 Admin password synced from ADMIN_PASSWORD env var for ${adminEmail}`);
      }
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
║   🎓 JERTS CART Backend API                                  ║
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
