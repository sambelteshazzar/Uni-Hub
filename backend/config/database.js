/**
 * ============================================
 * Database Configuration
 * Dual-mode: Turso (libSQL) when TURSO_URL set,
 * otherwise local SQLite (better-sqlite3) fallback
 * ============================================
 */

const path = require('path');
const fs = require('fs');

const TURSO_URL = process.env.TURSO_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;
const IS_TURSO = !!(TURSO_URL && TURSO_AUTH_TOKEN);

let db = null;
let tursoClient = null;

// Single source of truth for the activity_logs action enum. Shared by the
// base schema and by rebuild migrations (existing DBs keep their original
// CHECK constraint — see migrateActivityLogs below).
const ACTIVITY_LOGS_ACTIONS_SQL = [
  'login', 'logout', 'signup', 'purchase',
  'product_create', 'product_update', 'product_delete',
  'review_create', 'message_send', 'wishlist_add',
  'profile_update', 'password_change',
  'admin_ban', 'admin_approve', 'admin_reject', 'search',
  // Server-side audit trail + payouts (2026-08-21):
  'admin_refund', 'payout_request', 'payout_approve', 'payout_reject',
  'admin_adjustment', 'admin_order_status',
  // Verification-document PII access (spec 2026-08-23):
  'verification_docs_viewed', 'verification_docs_purge',
].map(a => `'${a}'`).join(',');

// Role tiers (2026-08-21): buyer < moderator < admin. Moderators handle
// product moderation and verification queues; bans/refunds/payouts stay
// admin-only. Shared by users + activity_logs schemas and rebuilds.
const USER_ROLES_SQL = ['buyer', 'moderator', 'admin'].map(r => `'${r}'`).join(',');

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  fullName TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  university TEXT NOT NULL,
  studentId TEXT,
  level TEXT,
  hall TEXT,
  password TEXT NOT NULL,
  avatar TEXT DEFAULT '',
  bio TEXT,
  isVerified INTEGER DEFAULT 0,
  verificationMethod TEXT,
  isPending INTEGER DEFAULT 0,
  rating REAL DEFAULT 0,
  totalOrders INTEGER DEFAULT 0,
  totalSales INTEGER DEFAULT 0,
  totalReviews INTEGER DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'buyer' CHECK(role IN (${USER_ROLES_SQL})),
  isActive INTEGER DEFAULT 1,
  isSuspended INTEGER DEFAULT 0,
  banReason TEXT,
  bannedAt TEXT,
  bannedBy TEXT REFERENCES users(id),
  lastLogin TEXT,
  isOnline INTEGER DEFAULT 0,
  passwordChangedAt TEXT,
  resetToken TEXT,
  resetTokenExpiry INTEGER,
  googleId TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price REAL NOT NULL CHECK(price >= 0),
  currency TEXT DEFAULT 'GHS',
  category TEXT NOT NULL CHECK(category IN ('appliances','hostel-items','accessories','textbooks','electronics','fashion','thrifts')),
  condition TEXT NOT NULL CHECK(condition IN ('new','like-new','fair','good','excellent')),
  gender TEXT,
  subcategory TEXT,
  variants TEXT DEFAULT '[]',
  images TEXT DEFAULT '[]',
  seller TEXT NOT NULL REFERENCES users(id),
  sellerName TEXT NOT NULL,
  sellerRating REAL DEFAULT 0,
  university TEXT NOT NULL,
  deliveryModes TEXT DEFAULT '[]',
  paymentModes TEXT DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK(status IN ('active','pending','sold','inactive','reserved','rejected','approved')),
  approvedBy TEXT REFERENCES users(id),
  moderationNote TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  orderNumber TEXT UNIQUE,
  trackingNumber TEXT UNIQUE,
  userId TEXT NOT NULL REFERENCES users(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_university TEXT NOT NULL,
  pricing_subtotal REAL NOT NULL,
  pricing_deliveryFee REAL DEFAULT 0,
  pricing_grandTotal REAL NOT NULL,
  pricing_currency TEXT DEFAULT 'GHS',
  delivery_mode TEXT NOT NULL CHECK(delivery_mode IN ('bolt','yango','inperson')),
  delivery_address TEXT NOT NULL,
  delivery_instructions TEXT,
  delivery_status TEXT DEFAULT 'pending' CHECK(delivery_status IN ('pending','processing','in-transit','delivered','cancelled')),
  payment_mode TEXT NOT NULL CHECK(payment_mode IN ('momo','telecel','bank','cash')),
  payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending','completed','failed','refunded')),
  payment_transactionId TEXT,
  payment_paidAt TEXT,
  status TEXT DEFAULT 'placed' CHECK(status IN ('placed','confirmed','in-transit','delivered','cancelled','refunded')),
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS product_colors (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_name TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  image_url TEXT DEFAULT '',
  stock INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  productId TEXT NOT NULL REFERENCES products(id),
  title TEXT NOT NULL,
  price REAL NOT NULL,
  quantity INTEGER DEFAULT 1,
  seller TEXT NOT NULL REFERENCES users(id),
  sellerName TEXT,
  image TEXT,
  variant TEXT
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  timestamp TEXT DEFAULT (datetime('now')),
  note TEXT,
  updatedBy TEXT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  reviewer TEXT NOT NULL REFERENCES users(id),
  seller TEXT NOT NULL REFERENCES users(id),
  product TEXT REFERENCES products(id),
  "order" TEXT REFERENCES orders(id),
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  detailedRatings_accuracy INTEGER CHECK(detailedRatings_accuracy >= 1 AND detailedRatings_accuracy <= 5),
  detailedRatings_communication INTEGER CHECK(detailedRatings_communication >= 1 AND detailedRatings_communication <= 5),
  detailedRatings_value INTEGER CHECK(detailedRatings_value >= 1 AND detailedRatings_value <= 5),
  comment TEXT,
  status TEXT DEFAULT 'approved' CHECK(status IN ('pending','approved','rejected')),
  helpfulVotes TEXT DEFAULT '[]',
  reportCount INTEGER DEFAULT 0,
  sellerResponse_comment TEXT,
  sellerResponse_respondedAt TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  paymentNumber TEXT UNIQUE,
  orderId TEXT NOT NULL REFERENCES orders(id),
  userId TEXT NOT NULL REFERENCES users(id),
  amount REAL NOT NULL CHECK(amount >= 0),
  currency TEXT DEFAULT 'GHS',
  mode TEXT NOT NULL CHECK(mode IN ('momo','telecel','bank','cash')),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','failed','refunded')),
  transactionId TEXT UNIQUE,
  providerReference TEXT,
  paidAt TEXT,
  verifiedAt TEXT,
  refundedAt TEXT,
  refundReason TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  product TEXT REFERENCES products(id),
  "order" TEXT REFERENCES orders(id),
  lastMessage TEXT REFERENCES messages(id),
  lastActivity TEXT DEFAULT (datetime('now')),
  status TEXT DEFAULT 'active' CHECK(status IN ('active','archived','closed')),
  createdBy TEXT NOT NULL REFERENCES users(id),
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  userId TEXT NOT NULL REFERENCES users(id),
  unreadCount INTEGER DEFAULT 0,
  UNIQUE(conversationId, userId)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL REFERENCES conversations(id),
  sender TEXT NOT NULL REFERENCES users(id),
  receiver TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK(type IN ('text','image','system')),
  imageUrl TEXT,
  isRead INTEGER DEFAULT 0,
  readAt TEXT,
  product TEXT REFERENCES products(id),
  "order" TEXT REFERENCES orders(id),
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS message_deleted_by (
  id TEXT PRIMARY KEY,
  messageId TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  userId TEXT NOT NULL REFERENCES users(id),
  UNIQUE(messageId, userId)
);

CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  deliveryNumber TEXT UNIQUE,
  orderId TEXT NOT NULL REFERENCES orders(id),
  userId TEXT NOT NULL REFERENCES users(id),
  mode TEXT NOT NULL CHECK(mode IN ('bolt','yango','inperson')),
  address TEXT NOT NULL,
  instructions TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','processing','picked-up','in-transit','delivered','cancelled','failed')),
  location_latitude REAL,
  location_longitude REAL,
  location_lastUpdated TEXT,
  agentId TEXT REFERENCES users(id),
  agentName TEXT,
  agentPhone TEXT,
  pickedUpAt TEXT,
  deliveredAt TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_status_history (
  id TEXT PRIMARY KEY,
  deliveryId TEXT NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  timestamp TEXT DEFAULT (datetime('now')),
  note TEXT,
  location_latitude REAL,
  location_longitude REAL
);

CREATE TABLE IF NOT EXISTS wishlists (
  id TEXT PRIMARY KEY,
  user TEXT NOT NULL REFERENCES users(id),
  product TEXT NOT NULL REFERENCES products(id),
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  UNIQUE(user, product)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user TEXT NOT NULL REFERENCES users(id),
  type TEXT DEFAULT 'info' CHECK(type IN ('info','success','error','warning','order','payment','delivery','message','system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT,
  read INTEGER DEFAULT 0,
  expiresAt TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS search_history (
  id TEXT PRIMARY KEY,
  user TEXT NOT NULL REFERENCES users(id),
  query TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  UNIQUE(user, query)
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  user TEXT REFERENCES users(id),
  userEmail TEXT,
  userName TEXT,
  userRole TEXT CHECK(userRole IN ('buyer','admin')),
  action TEXT NOT NULL CHECK(action IN (${ACTIVITY_LOGS_ACTIONS_SQL})),
  details TEXT,
  ipAddress TEXT,
  userAgent TEXT,
  university TEXT,
  severity TEXT DEFAULT 'info' CHECK(severity IN ('info','warning','critical')),
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS student_verifications (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  studentId TEXT NOT NULL,
  fullName TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  university TEXT NOT NULL,
  level TEXT NOT NULL CHECK(level IN ('100','200','300','400','500','postgrad','phd')),
  hall TEXT,
  verificationMethod TEXT NOT NULL CHECK(verificationMethod IN ('email','document')),
  universityEmail TEXT,
  verificationCode TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  reviewedBy TEXT REFERENCES users(id),
  reviewedAt TEXT,
  reviewNotes TEXT,
  documentsPurgeAt TEXT,
  documentsPurgedAt TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS verification_documents (
  id TEXT PRIMARY KEY,
  verificationId TEXT NOT NULL REFERENCES student_verifications(id) ON DELETE CASCADE,
  fileName TEXT,
  fileUrl TEXT,
  fileType TEXT,
  cloudinaryPublicId TEXT,
  sizeBytes INTEGER,
  mimeType TEXT,
  uploadedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES users(id),
  endpoint TEXT NOT NULL,
  responseStatus INTEGER,
  responseBody TEXT,
  status TEXT DEFAULT 'processing' CHECK(status IN ('processing','completed')),
  createdAt TEXT DEFAULT (datetime('now')),
  UNIQUE(key, userId, endpoint)
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  sellerId TEXT NOT NULL REFERENCES users(id),
  orderId TEXT REFERENCES orders(id),
  type TEXT NOT NULL CHECK(type IN ('sale','commission','payout','clawback','adjustment')),
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'GHS',
  status TEXT DEFAULT 'released' CHECK(status IN ('escrowed','released','reversed')),
  note TEXT,
  createdAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  sellerId TEXT NOT NULL REFERENCES users(id),
  amount REAL NOT NULL CHECK(amount > 0),
  method TEXT NOT NULL CHECK(method IN ('momo','bank')),
  destination TEXT NOT NULL,
  paystackRecipientCode TEXT,
  paystackTransferRef TEXT UNIQUE,
  status TEXT DEFAULT 'requested' CHECK(status IN ('requested','approved','processing','paid','failed')),
  failureReason TEXT,
  requestedAt TEXT DEFAULT (datetime('now')),
  processedAt TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_mfa_challenges (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  codeHash TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  consumedAt TEXT,
  createdAt TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_university ON users(university);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_isSuspended ON users(isSuspended);

CREATE INDEX IF NOT EXISTS idx_products_category_status ON products(category, status);
CREATE INDEX IF NOT EXISTS idx_products_university_status ON products(university, status);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller);
CREATE INDEX IF NOT EXISTS idx_products_createdAt ON products(createdAt DESC);

CREATE INDEX IF NOT EXISTS idx_orders_userId ON orders(userId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_orderNumber ON orders(orderNumber);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_order_items_orderId ON order_items(orderId);

CREATE INDEX IF NOT EXISTS idx_reviews_seller ON reviews(seller, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product);
CREATE INDEX IF NOT EXISTS idx_reviews_unique ON reviews(reviewer, seller, "order");

CREATE INDEX IF NOT EXISTS idx_payments_orderId ON payments(orderId);
CREATE INDEX IF NOT EXISTS idx_payments_userId ON payments(userId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE INDEX IF NOT EXISTS idx_conversations_lastActivity ON conversations(lastActivity DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_product ON conversations(product);

CREATE INDEX IF NOT EXISTS idx_messages_conversationId ON messages(conversationId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_read ON messages(receiver, isRead);

CREATE INDEX IF NOT EXISTS idx_deliveries_orderId ON deliveries(orderId);
CREATE INDEX IF NOT EXISTS idx_deliveries_userId ON deliveries(userId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);

CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user, createdAt DESC);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user, createdAt DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_createdAt ON activity_logs(createdAt);
CREATE INDEX IF NOT EXISTS idx_activity_logs_severity ON activity_logs(severity);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON activity_logs(user, createdAt DESC);

CREATE INDEX IF NOT EXISTS idx_verifications_studentId ON student_verifications(studentId, university);
CREATE INDEX IF NOT EXISTS idx_verifications_email ON student_verifications(email);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON student_verifications(status, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_verifications_userId ON student_verifications(userId);

CREATE INDEX IF NOT EXISTS idx_idempotency_user_created ON idempotency_keys(userId, createdAt);

CREATE INDEX IF NOT EXISTS idx_ledger_seller_status ON ledger_entries(sellerId, status);
CREATE INDEX IF NOT EXISTS idx_ledger_order ON ledger_entries(orderId);
CREATE INDEX IF NOT EXISTS idx_payouts_seller ON payouts(sellerId, requestedAt DESC);
CREATE INDEX IF NOT EXISTS idx_mfa_user ON admin_mfa_challenges(userId, createdAt DESC);

CREATE INDEX IF NOT EXISTS idx_product_colors_product_id ON product_colors(product_id);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'unknown',
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','active','unsubscribed','bounced')),
  verificationToken TEXT UNIQUE,
  verifiedAt TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  htmlContent TEXT NOT NULL,
  sentAt TEXT,
  recipientCount INTEGER DEFAULT 0,
  resendId TEXT,
  createdAt TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_source ON newsletter_subscribers(source);
CREATE INDEX IF NOT EXISTS idx_newsletter_token ON newsletter_subscribers(verificationToken);
`;

async function connectTurso () {
  const { createClient } = require('@libsql/client');
  tursoClient = createClient({
    url: TURSO_URL,
    authToken: TURSO_AUTH_TOKEN,
  });

  await tursoClient.execute('SELECT 1');

  const schemaStatements = SCHEMA_SQL.split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of schemaStatements) {
    try {
      await tursoClient.execute(stmt);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.warn('Schema warning:', err.message);
      }
    }
  }

  // Advisory lock so concurrent server boots (e.g. Render rolling deploys
  // or preview + main instance racing) don't both try to ALTER tables
  // at once — that race can leave half-migrated schemas. We use a
  // migrations_log row with a unique constraint on a locked-flag column.
  // Inserting a row with lock=1 succeeds only once; the loser gets a
  // UNIQUE constraint violation and skips migration.
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS migrations_log (
      id TEXT PRIMARY KEY,
      locked INTEGER DEFAULT 0,
      ran_at TEXT DEFAULT (datetime('now'))
    )
  `);
  // Add UNIQUE constraint on locked=1 via partial index — allows many
  // rows with locked=0 but only one with locked=1, so first INSERT
  // wins and subsequent inserts fail.
  try {
    await tursoClient.execute(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_migrations_lock ON migrations_log(locked) WHERE locked = 1',
    );
  } catch (_e) {
    /* older sqlite/turso may not support partial unique — fall back to app-level guard */
  }

  const lockId = require('crypto').randomUUID();
  let acquired = false;
  try {
    await tursoClient.execute({
      sql: 'INSERT INTO migrations_log (id, locked) VALUES (?, 1)',
      args: [lockId],
    });
    acquired = true;
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      console.log('ℹ️ Another instance is running migrations — skipping.');
    } else {
      // If the lock table doesn't exist yet (cold start) or another race
      // happened, fall through and run migrations anyway.
      acquired = true;
    }
  }

  try {
    if (acquired) {
      await runTursoMigrations();
    }
  } finally {
    if (acquired) {
      try {
        await tursoClient.execute({
          sql: 'DELETE FROM migrations_log WHERE id = ?',
          args: [lockId],
        });
      } catch (_e) {
        /* release best-effort */
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Turso Connected: ${TURSO_URL.replace(/\/\/.*@/, '//***@')}`);
  return tursoClient;
}

async function runTursoMigrations () {
  const migrations = [
    {
      check: 'PRAGMA table_info(products)',
      find: 'variants',
      alter: 'ALTER TABLE products ADD COLUMN variants TEXT DEFAULT \'[]\'',
    },
    {
      check: 'PRAGMA table_info(order_items)',
      find: 'variant',
      alter: 'ALTER TABLE order_items ADD COLUMN variant TEXT',
    },
    {
      check: 'PRAGMA table_info(student_verifications)',
      find: 'userId',
      alter: 'ALTER TABLE student_verifications ADD COLUMN userId TEXT REFERENCES users(id)',
    },
    {
      check: 'PRAGMA table_info(order_status_history)',
      find: 'updatedBy',
      alter: 'ALTER TABLE order_status_history ADD COLUMN updatedBy TEXT REFERENCES users(id)',
    },
    {
      check: 'PRAGMA table_info(users)',
      find: 'googleId',
      alter: 'ALTER TABLE users ADD COLUMN googleId TEXT',
    },
    {
      check: 'PRAGMA table_info(reviews)',
      find: 'detailedRatings_accuracy',
      alter: 'ALTER TABLE reviews ADD COLUMN detailedRatings_accuracy INTEGER',
    },
    {
      check: 'PRAGMA table_info(reviews)',
      find: 'detailedRatings_communication',
      alter: 'ALTER TABLE reviews ADD COLUMN detailedRatings_communication INTEGER',
    },
    {
      check: 'PRAGMA table_info(reviews)',
      find: 'detailedRatings_value',
      alter: 'ALTER TABLE reviews ADD COLUMN detailedRatings_value INTEGER',
    },
    {
      check: 'PRAGMA table_info(reviews)',
      find: 'helpfulVotes',
      alter: 'ALTER TABLE reviews ADD COLUMN helpfulVotes TEXT DEFAULT \'[]\'',
    },
    {
      check: 'PRAGMA table_info(reviews)',
      find: 'reportCount',
      alter: 'ALTER TABLE reviews ADD COLUMN reportCount INTEGER DEFAULT 0',
    },
    {
      check: 'PRAGMA table_info(reviews)',
      find: 'sellerResponse_comment',
      alter: 'ALTER TABLE reviews ADD COLUMN sellerResponse_comment TEXT',
    },
    {
      check: 'PRAGMA table_info(reviews)',
      find: 'sellerResponse_respondedAt',
      alter: 'ALTER TABLE reviews ADD COLUMN sellerResponse_respondedAt TEXT',
    },
    {
      check: 'PRAGMA table_info(products)',
      find: 'gender',
      alter: 'ALTER TABLE products ADD COLUMN gender TEXT',
    },
    {
      check: 'PRAGMA table_info(products)',
      find: 'subcategory',
      alter: 'ALTER TABLE products ADD COLUMN subcategory TEXT',
    },
    {
      check: 'SELECT 1 FROM sqlite_master WHERE name=\'products\' AND sql LIKE \'%approved%\'',
      find: '__status_check_has_approved__',
      alter: null,
    },
  ];

  for (const m of migrations) {
    try {
      if (m.alter === null) {continue;}
      const result = await tursoClient.execute(m.check);
      const has = result.rows.some(r => {
        const vals = Object.values(r);
        return vals.some(v => String(v) === m.find);
      });
      if (!has) {
        await tursoClient.execute(m.alter);
      }
    } catch (err) {
      console.warn('Migration warning:', err.message);
    }
  }

  try {
    const checkResult = await tursoClient.execute(
      'SELECT sql FROM sqlite_master WHERE name=\'products\'',
    );
    const schemaSql = checkResult.rows[0]?.sql || '';
    if (schemaSql && !schemaSql.includes('\'approved\'')) {
      console.log('Migrating products table to add approved status...');
      await tursoClient.execute('ALTER TABLE products RENAME TO products_old');
      await tursoClient.execute(`CREATE TABLE products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price REAL NOT NULL CHECK(price >= 0),
  currency TEXT DEFAULT 'GHS',
  category TEXT NOT NULL CHECK(category IN ('appliances','hostel-items','accessories','textbooks','electronics','fashion','thrifts')),
  condition TEXT NOT NULL CHECK(condition IN ('new','like-new','fair','good','excellent')),
  gender TEXT,
  subcategory TEXT,
  variants TEXT DEFAULT '[]',
  images TEXT DEFAULT '[]',
  seller TEXT NOT NULL REFERENCES users(id),
  sellerName TEXT NOT NULL,
  sellerRating REAL DEFAULT 0,
  university TEXT NOT NULL,
  deliveryModes TEXT DEFAULT '[]',
  paymentModes TEXT DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK(status IN ('active','pending','sold','inactive','reserved','rejected','approved')),
  approvedBy TEXT REFERENCES users(id),
  moderationNote TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
)`);
      await tursoClient.execute('INSERT INTO products SELECT * FROM products_old');
      await tursoClient.execute('DROP TABLE products_old');
      console.log('Products table migration complete.');
    }
  } catch (err) {
    console.warn('Products status migration warning:', err.message);
    try {
      const hasOld = await tursoClient.execute(
        'SELECT name FROM sqlite_master WHERE name=\'products_old\'',
      );
      if (hasOld.rows.length > 0) {
        await tursoClient.execute('ALTER TABLE products_old RENAME TO products');
        console.log('Rolled back products table rename.');
      }
    } catch (rollbackErr) {
      console.error('Products migration rollback failed:', rollbackErr.message);
    }
  }

  // Repair reviews table if its product FK was rewritten to point to
  // the (now-dropped) products_old orphan by a prior products migration.
  // SQLite rewrites FK references when ALTER TABLE RENAME runs, so the
  // earlier "products status migration" could leave reviews.product →
  // products_old(id) even though products_old no longer exists. Every
  // INSERT into reviews then fails FK validation with
  //   "no such table: main.products_old".
  // Fix: drop the orphaned FK by recreating the reviews table with the
  // correct FK reference (back to products). Preserves existing rows
  // via INSERT...SELECT.
  try {
    const fkList = await tursoClient.execute('PRAGMA foreign_key_list(reviews)');
    const hasBrokenFk = fkList.rows.some(r => r.table === 'products_old');
    if (hasBrokenFk) {
      console.log(
        'Repairing reviews table: product FK points to dropped products_old, recreating table...',
      );
      await tursoClient.execute('ALTER TABLE reviews RENAME TO reviews_broken');
      await tursoClient.execute(`CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  reviewer TEXT NOT NULL REFERENCES users(id),
  seller TEXT NOT NULL REFERENCES users(id),
  product TEXT REFERENCES products(id),
  "order" TEXT REFERENCES orders(id),
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  detailedRatings_accuracy INTEGER CHECK(detailedRatings_accuracy >= 1 AND detailedRatings_accuracy <= 5),
  detailedRatings_communication INTEGER CHECK(detailedRatings_communication >= 1 AND detailedRatings_communication <= 5),
  detailedRatings_value INTEGER CHECK(detailedRatings_value >= 1 AND detailedRatings_value <= 5),
  comment TEXT,
  status TEXT DEFAULT 'approved' CHECK(status IN ('pending','approved','rejected')),
  helpfulVotes TEXT DEFAULT '[]',
  reportCount INTEGER DEFAULT 0,
  sellerResponse_comment TEXT,
  sellerResponse_respondedAt TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
)`);
      await tursoClient.execute('INSERT INTO reviews SELECT * FROM reviews_broken');
      await tursoClient.execute('DROP TABLE reviews_broken');
      console.log('Reviews table repair complete.');
    }
  } catch (repairErr) {
    console.error('Reviews FK repair failed:', repairErr.message);
    try {
      const hasBroken = await tursoClient.execute(
        'SELECT name FROM sqlite_master WHERE name=\'reviews_broken\'',
      );
      if (hasBroken.rows.length > 0) {
        await tursoClient.execute('ALTER TABLE reviews_broken RENAME TO reviews');
        console.log('Rolled back reviews table rename.');
      }
    } catch (rollbackErr) {
      console.error('Reviews repair rollback failed:', rollbackErr.message);
    }
  }

  // Migrate orders.status CHECK constraint to include 'refunded' so the
  // new refund flow can write status='refunded' without a CHECK failure.
  // Idempotent: only re-creates the table if the existing schema lacks
  // 'refunded' in the status CHECK.
  try {
    const checkResult = await tursoClient.execute(
      'SELECT sql FROM sqlite_master WHERE name=\'orders\'',
    );
    const ordersSchemaSql = checkResult.rows[0]?.sql || '';
    if (ordersSchemaSql && !ordersSchemaSql.includes('\'refunded\'')) {
      console.log('Migrating orders table to include "refunded" in status CHECK...');
      await tursoClient.execute('ALTER TABLE orders RENAME TO orders_old');
      await tursoClient.execute(`CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  orderNumber TEXT UNIQUE,
  trackingNumber TEXT UNIQUE,
  userId TEXT NOT NULL REFERENCES users(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_university TEXT NOT NULL,
  pricing_subtotal REAL NOT NULL,
  pricing_deliveryFee REAL DEFAULT 0,
  pricing_grandTotal REAL NOT NULL,
  pricing_currency TEXT DEFAULT 'GHS',
  delivery_mode TEXT NOT NULL CHECK(delivery_mode IN ('bolt','yango','inperson')),
  delivery_address TEXT NOT NULL,
  delivery_instructions TEXT,
  delivery_status TEXT DEFAULT 'pending' CHECK(delivery_status IN ('pending','processing','in-transit','delivered','cancelled')),
  payment_mode TEXT NOT NULL CHECK(payment_mode IN ('momo','telecel','bank','cash')),
  payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending','completed','failed','refunded')),
  payment_transactionId TEXT,
  payment_paidAt TEXT,
  status TEXT DEFAULT 'placed' CHECK(status IN ('placed','confirmed','in-transit','delivered','cancelled','refunded')),
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
)`);
      await tursoClient.execute('INSERT INTO orders SELECT * FROM orders_old');
      await tursoClient.execute('DROP TABLE orders_old');
      console.log('Orders "refunded" status migration complete.');
    }
  } catch (ordersMigrateErr) {
    console.error('Orders refunded-status migration failed:', ordersMigrateErr.message);
    try {
      const hasOld = await tursoClient.execute(
        'SELECT name FROM sqlite_master WHERE name=\'orders_old\'',
      );
      if (hasOld.rows.length > 0) {
        await tursoClient.execute('ALTER TABLE orders_old RENAME TO orders');
        console.log('Rolled back orders table rename.');
      }
    } catch (rollbackErr) {
      console.error('Orders migration rollback failed:', rollbackErr.message);
    }
  }

  // Migrate activity_logs for the extended audit-trail action enum.
  // Same rebuild pattern as orders above (CHECK cannot be ALTERed).
  try {
    const activityResult = await tursoClient.execute(
      'SELECT sql FROM sqlite_master WHERE name=\'activity_logs\'',
    );
    const activitySchemaSql = activityResult.rows[0]?.sql || '';
    if (activitySchemaSql && (!activitySchemaSql.includes('\'moderator\'') ||
      !activitySchemaSql.includes('\'verification_docs_viewed\'') ||
      !activitySchemaSql.includes('\'verification_docs_purge\''))) {
      console.log('Migrating activity_logs table for extended audit actions...');
      await tursoClient.execute('ALTER TABLE activity_logs RENAME TO activity_logs_old');
      await tursoClient.execute(`CREATE TABLE activity_logs (
  id TEXT PRIMARY KEY,
  user TEXT REFERENCES users(id),
  userEmail TEXT,
  userName TEXT,
  userRole TEXT CHECK(userRole IN (${USER_ROLES_SQL})),
  action TEXT NOT NULL CHECK(action IN (${ACTIVITY_LOGS_ACTIONS_SQL})),
  details TEXT,
  ipAddress TEXT,
  userAgent TEXT,
  university TEXT,
  severity TEXT DEFAULT 'info' CHECK(severity IN ('info','warning','critical')),
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
)`);
      await tursoClient.execute('INSERT INTO activity_logs SELECT * FROM activity_logs_old');
      await tursoClient.execute('DROP TABLE activity_logs_old');
      console.log('Activity logs migration complete.');
    }
  } catch (activityMigrateErr) {
    console.error('Activity logs migration failed:', activityMigrateErr.message);
    try {
      const hasOld = await tursoClient.execute(
        'SELECT name FROM sqlite_master WHERE name=\'activity_logs_old\'',
      );
      if (hasOld.rows.length > 0) {
        await tursoClient.execute('ALTER TABLE activity_logs_old RENAME TO activity_logs');
        console.log('Rolled back activity_logs rename.');
      }
    } catch (rollbackErr) {
      console.error('Activity logs rollback failed:', rollbackErr.message);
    }
  }

  // Migrate users for the moderator role tier.
  try {
    const usersResult = await tursoClient.execute(
      'SELECT sql FROM sqlite_master WHERE name=\'users\'',
    );
    const usersSchemaSql = usersResult.rows[0]?.sql || '';
    if (usersSchemaSql && !usersSchemaSql.includes('\'moderator\'')) {
      console.log('Migrating users table for moderator role...');
      await tursoClient.execute('ALTER TABLE users RENAME TO users_old');
      await tursoClient.execute(`CREATE TABLE users (
  id TEXT PRIMARY KEY,
  fullName TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  university TEXT NOT NULL,
  studentId TEXT,
  level TEXT,
  hall TEXT,
  password TEXT NOT NULL,
  avatar TEXT DEFAULT '',
  bio TEXT,
  isVerified INTEGER DEFAULT 0,
  verificationMethod TEXT,
  isPending INTEGER DEFAULT 0,
  rating REAL DEFAULT 0,
  totalOrders INTEGER DEFAULT 0,
  totalSales INTEGER DEFAULT 0,
  totalReviews INTEGER DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'buyer' CHECK(role IN (${USER_ROLES_SQL})),
  isActive INTEGER DEFAULT 1,
  isSuspended INTEGER DEFAULT 0,
  banReason TEXT,
  bannedAt TEXT,
  bannedBy TEXT REFERENCES users(id),
  lastLogin TEXT,
  isOnline INTEGER DEFAULT 0,
  passwordChangedAt TEXT,
  resetToken TEXT,
  resetTokenExpiry INTEGER,
  googleId TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
)`);
      await tursoClient.execute('INSERT INTO users SELECT * FROM users_old');
      await tursoClient.execute('DROP TABLE users_old');
      console.log('Users role migration complete.');
    }
  } catch (usersMigrateErr) {
    console.error('Users role migration failed:', usersMigrateErr.message);
    try {
      const hasOld = await tursoClient.execute(
        'SELECT name FROM sqlite_master WHERE name=\'users_old\'',
      );
      if (hasOld.rows.length > 0) {
        await tursoClient.execute('ALTER TABLE users_old RENAME TO users');
        console.log('Rolled back users rename.');
      }
    } catch (rollbackErr) {
      console.error('Users rollback failed:', rollbackErr.message);
    }
  }

  // Payouts timestamp columns for existing deployments — updateById()
  // stamps updatedAt, so the column must exist.
  try {
    const payoutCols = await tursoClient.execute('PRAGMA table_info(payouts)');
    const names = payoutCols.rows.map(r => r.name);
    if (names.length > 0) {
      if (!names.includes('createdAt')) {
        await tursoClient.execute('ALTER TABLE payouts ADD COLUMN createdAt TEXT DEFAULT (datetime(\'now\'))');
      }
      if (!names.includes('updatedAt')) {
        await tursoClient.execute('ALTER TABLE payouts ADD COLUMN updatedAt TEXT DEFAULT (datetime(\'now\'))');
      }
    }
  } catch (payoutColErr) {
    console.error('Payouts timestamp migration failed:', payoutColErr.message);
  }

  // Doc-retention columns (spec 2026-08-23): real uploads record the
  // Cloudinary public id, byte size and MIME type per document; decisions
  // stamp purge bookkeeping on the parent row.
  try {
    const docCols = await tursoClient.execute('PRAGMA table_info(verification_documents)');
    const docNames = docCols.rows.map(r => r.name);
    if (docNames.length > 0) {
      if (!docNames.includes('cloudinaryPublicId')) {
        await tursoClient.execute('ALTER TABLE verification_documents ADD COLUMN cloudinaryPublicId TEXT');
      }
      if (!docNames.includes('sizeBytes')) {
        await tursoClient.execute('ALTER TABLE verification_documents ADD COLUMN sizeBytes INTEGER');
      }
      if (!docNames.includes('mimeType')) {
        await tursoClient.execute('ALTER TABLE verification_documents ADD COLUMN mimeType TEXT');
      }
      // One-time cleanup: rows without an asset are dead weight from the
      // old metadata-only flow.
      await tursoClient.execute('DELETE FROM verification_documents WHERE cloudinaryPublicId IS NULL');
    }
    const parentCols = await tursoClient.execute('PRAGMA table_info(student_verifications)');
    const parentNames = parentCols.rows.map(r => r.name);
    if (parentNames.length > 0) {
      if (!parentNames.includes('documentsPurgeAt')) {
        await tursoClient.execute('ALTER TABLE student_verifications ADD COLUMN documentsPurgeAt TEXT');
      }
      if (!parentNames.includes('documentsPurgedAt')) {
        await tursoClient.execute('ALTER TABLE student_verifications ADD COLUMN documentsPurgedAt TEXT');
      }
    }
  } catch (docRetentionErr) {
    console.error('Doc retention migration failed:', docRetentionErr.message);
  }
}

/**
 * Doc-retention migration (spec 2026-08-23): add retention columns and
 * delete legacy asset-less rows once — they predate real uploads and hold
 * nothing reviewable (fileName/size stubs).
 */
async function runDocRetentionMigration (handle) {
  try {
    const target = handle || db;
    const docCols = target.prepare('PRAGMA table_info(verification_documents)').all();
    if (docCols.length > 0) {
      if (!docCols.find(c => c.name === 'cloudinaryPublicId')) {
        target.prepare('ALTER TABLE verification_documents ADD COLUMN cloudinaryPublicId TEXT').run();
      }
      if (!docCols.find(c => c.name === 'sizeBytes')) {
        target.prepare('ALTER TABLE verification_documents ADD COLUMN sizeBytes INTEGER').run();
      }
      if (!docCols.find(c => c.name === 'mimeType')) {
        target.prepare('ALTER TABLE verification_documents ADD COLUMN mimeType TEXT').run();
      }
    }
    const parentCols = target.prepare('PRAGMA table_info(student_verifications)').all();
    if (parentCols.length > 0) {
      if (!parentCols.find(c => c.name === 'documentsPurgeAt')) {
        target.prepare('ALTER TABLE student_verifications ADD COLUMN documentsPurgeAt TEXT').run();
      }
      if (!parentCols.find(c => c.name === 'documentsPurgedAt')) {
        target.prepare('ALTER TABLE student_verifications ADD COLUMN documentsPurgedAt TEXT').run();
      }
    }
    // One-time cleanup: rows without an asset are dead weight from the old
    // metadata-only flow.
    target.prepare('DELETE FROM verification_documents WHERE cloudinaryPublicId IS NULL').run();
  } catch (err) {
    console.error('Doc retention migration failed:', err.message);
  }
}

function connectLocal () {
  const Database = require('better-sqlite3');
  const DB_PATH = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'unihub.db');
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(SCHEMA_SQL);

  // Rebuild activity_logs if an existing DB predates the audit-trail action
  // enum extension (CHECK constraints cannot be ALTERed in SQLite).
  try {
    const activityTbl = db.prepare('SELECT sql FROM sqlite_master WHERE name = \'activity_logs\'').get();
    if (activityTbl && activityTbl.sql && (!activityTbl.sql.includes('\'moderator\'') ||
      !activityTbl.sql.includes('\'verification_docs_viewed\'') ||
      !activityTbl.sql.includes('\'verification_docs_purge\''))) {
      console.log('Migrating activity_logs table for extended audit actions...');
      db.exec('ALTER TABLE activity_logs RENAME TO activity_logs_old');
      db.exec(`CREATE TABLE activity_logs (
        id TEXT PRIMARY KEY,
        user TEXT REFERENCES users(id),
        userEmail TEXT,
        userName TEXT,
        userRole TEXT CHECK(userRole IN (${USER_ROLES_SQL})),
        action TEXT NOT NULL CHECK(action IN (${ACTIVITY_LOGS_ACTIONS_SQL})),
        details TEXT,
        ipAddress TEXT,
        userAgent TEXT,
        university TEXT,
        severity TEXT DEFAULT 'info' CHECK(severity IN ('info','warning','critical')),
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now'))
      )`);
      db.exec('INSERT INTO activity_logs SELECT * FROM activity_logs_old');
      db.exec('DROP TABLE activity_logs_old');
      console.log('Activity logs migration complete.');
    }
  } catch (activityMigrateErr) {
    console.error('Activity logs migration failed:', activityMigrateErr.message);
    try {
      const hasOld = db.prepare('SELECT name FROM sqlite_master WHERE name = \'activity_logs_old\'').get();
      if (hasOld) {
        db.exec('ALTER TABLE activity_logs_old RENAME TO activity_logs');
        console.log('Rolled back activity_logs rename.');
      }
    } catch (rollbackErr) {
      console.error('Activity logs rollback failed:', rollbackErr.message);
    }
  }

  // Rebuild users if an existing DB predates the moderator role tier.
  try {
    const usersTbl = db.prepare('SELECT sql FROM sqlite_master WHERE name = \'users\'').get();
    if (usersTbl && usersTbl.sql && !usersTbl.sql.includes('\'moderator\'')) {
      console.log('Migrating users table for moderator role...');
      db.exec('ALTER TABLE users RENAME TO users_old');
      db.exec(`CREATE TABLE users (
        id TEXT PRIMARY KEY,
        fullName TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL,
        university TEXT NOT NULL,
        studentId TEXT,
        level TEXT,
        hall TEXT,
        password TEXT NOT NULL,
        avatar TEXT DEFAULT '',
        bio TEXT,
        isVerified INTEGER DEFAULT 0,
        verificationMethod TEXT,
        isPending INTEGER DEFAULT 0,
        rating REAL DEFAULT 0,
        totalOrders INTEGER DEFAULT 0,
        totalSales INTEGER DEFAULT 0,
        totalReviews INTEGER DEFAULT 0,
        role TEXT NOT NULL DEFAULT 'buyer' CHECK(role IN (${USER_ROLES_SQL})),
        isActive INTEGER DEFAULT 1,
        isSuspended INTEGER DEFAULT 0,
        banReason TEXT,
        bannedAt TEXT,
        bannedBy TEXT REFERENCES users(id),
        lastLogin TEXT,
        isOnline INTEGER DEFAULT 0,
        passwordChangedAt TEXT,
        resetToken TEXT,
        resetTokenExpiry INTEGER,
        googleId TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now'))
      )`);
      db.exec('INSERT INTO users SELECT * FROM users_old');
      db.exec('DROP TABLE users_old');
      console.log('Users role migration complete.');
    }
  } catch (usersMigrateErr) {
    console.error('Users role migration failed:', usersMigrateErr.message);
    try {
      const hasOld = db.prepare('SELECT name FROM sqlite_master WHERE name = \'users_old\'').get();
      if (hasOld) {
        db.exec('ALTER TABLE users_old RENAME TO users');
        console.log('Rolled back users rename.');
      }
    } catch (rollbackErr) {
      console.error('Users rollback failed:', rollbackErr.message);
    }
  }

  try {
    const productCols = db.prepare('PRAGMA table_info(products)').all();
    if (!productCols.find(c => c.name === 'variants')) {
      db.prepare('ALTER TABLE products ADD COLUMN variants TEXT DEFAULT \'[]\'').run();
    }
    const orderItemCols = db.prepare('PRAGMA table_info(order_items)').all();
    if (!orderItemCols.find(c => c.name === 'variant')) {
      db.prepare('ALTER TABLE order_items ADD COLUMN variant TEXT').run();
    }
    const verificationCols = db.prepare('PRAGMA table_info(student_verifications)').all();
    if (!verificationCols.find(c => c.name === 'userId')) {
      db.prepare(
        'ALTER TABLE student_verifications ADD COLUMN userId TEXT REFERENCES users(id)',
      ).run();
    }
    const statusHistCols = db.prepare('PRAGMA table_info(order_status_history)').all();
    if (!statusHistCols.find(c => c.name === 'updatedBy')) {
      db.prepare(
        'ALTER TABLE order_status_history ADD COLUMN updatedBy TEXT REFERENCES users(id)',
      ).run();
    }
    const userCols = db.prepare('PRAGMA table_info(users)').all();
    if (!userCols.find(c => c.name === 'googleId')) {
      db.prepare('ALTER TABLE users ADD COLUMN googleId TEXT').run();
    }
    // gender + subcategory columns power the Fashion and Gadgets
    // sub-options on the admin product form. Both are nullable.
    const productColsAll = db.prepare('PRAGMA table_info(products)').all();
    if (!productColsAll.find(c => c.name === 'gender')) {
      db.prepare('ALTER TABLE products ADD COLUMN gender TEXT').run();
    }
    if (!productColsAll.find(c => c.name === 'subcategory')) {
      db.prepare('ALTER TABLE products ADD COLUMN subcategory TEXT').run();
    }
    // Payouts timestamps (2026-08-22): updateById() stamps updatedAt, so the
    // columns must exist on pre-existing payouts tables.
    try {
      const payoutCols = db.prepare('PRAGMA table_info(payouts)').all();
      if (payoutCols.length > 0) {
        if (!payoutCols.find(c => c.name === 'createdAt')) {
          db.prepare('ALTER TABLE payouts ADD COLUMN createdAt TEXT DEFAULT (datetime(\'now\'))').run();
        }
        if (!payoutCols.find(c => c.name === 'updatedAt')) {
          db.prepare('ALTER TABLE payouts ADD COLUMN updatedAt TEXT DEFAULT (datetime(\'now\'))').run();
        }
      }
    } catch (payoutColErr) {
      console.error('Payouts timestamp migration failed:', payoutColErr.message);
    }

    // Doc-retention migration (spec 2026-08-23). connectLocal is sync (getDb
    // hands the handle straight to callers), but every statement in the
    // migration body is a synchronous better-sqlite3 call, so this completes
    // before connectLocal returns despite the async signature.
    runDocRetentionMigration();

    // Newsletter tables
    const newsletterCols = db.prepare('PRAGMA table_info(newsletter_subscribers)').all();
    if (newsletterCols.length === 0) {
      db.exec(`
        CREATE TABLE newsletter_subscribers (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          source TEXT DEFAULT 'unknown',
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending','active','unsubscribed','bounced')),
          verificationToken TEXT UNIQUE,
          verifiedAt TEXT,
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE email_campaigns (
          id TEXT PRIMARY KEY,
          subject TEXT NOT NULL,
          htmlContent TEXT NOT NULL,
          sentAt TEXT,
          recipientCount INTEGER DEFAULT 0,
          resendId TEXT,
          createdAt TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
        CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscribers(status);
        CREATE INDEX IF NOT EXISTS idx_newsletter_source ON newsletter_subscribers(source);
        CREATE INDEX IF NOT EXISTS idx_newsletter_token ON newsletter_subscribers(verificationToken);
      `);
    }
  } catch (migrationErr) {
    console.warn('Migration warning:', migrationErr.message);
  }

  // eslint-disable-next-line no-console
  console.log(`✅ SQLite Connected: ${DB_PATH}`);
  return db;
}

async function connectDatabase () {
  if (IS_TURSO) {
    return connectTurso();
  }
  return connectLocal();
}

function getDb () {
  if (!db && !IS_TURSO) {
    db = connectLocal();
  }
  return db;
}

function getTursoClient () {
  return tursoClient;
}

function isTurso () {
  return IS_TURSO;
}

module.exports = { connectDatabase, getDb, getTursoClient, isTurso };
module.exports.runDocRetentionMigration = runDocRetentionMigration;
