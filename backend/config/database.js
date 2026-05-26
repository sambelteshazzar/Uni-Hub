/**
 * ============================================
 * Database Configuration
 * SQLite Connection Setup
 * ============================================
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'unihub.db');

let db = null;

function connectDatabase () {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  initializeSchema();

  // eslint-disable-next-line no-console
  console.log(`✅ SQLite Connected: ${DB_PATH}`);

  return db;
}

function getDb () {
  if (!db) {
    db = connectDatabase();
  }
  return db;
}

function initializeSchema () {
  db.exec(`
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
      role TEXT NOT NULL DEFAULT 'buyer' CHECK(role IN ('buyer','admin')),
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
variants TEXT DEFAULT '[]',
images TEXT DEFAULT '[]',
seller TEXT NOT NULL REFERENCES users(id),
sellerName TEXT NOT NULL,
sellerRating REAL DEFAULT 0,
university TEXT NOT NULL,
deliveryModes TEXT DEFAULT '[]',
paymentModes TEXT DEFAULT '[]',
status TEXT DEFAULT 'pending' CHECK(status IN ('active','pending','sold','inactive','reserved','rejected')),
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
            status TEXT DEFAULT 'placed' CHECK(status IN ('placed','confirmed','in-transit','delivered','cancelled')),
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
      note TEXT
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
      action TEXT NOT NULL CHECK(action IN ('login','logout','signup','purchase','product_create','product_update','product_delete','review_create','message_send','wishlist_add','profile_update','password_change','admin_ban','admin_approve','admin_reject','search')),
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
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

    CREATE TABLE IF NOT EXISTS verification_documents (
      id TEXT PRIMARY KEY,
      verificationId TEXT NOT NULL REFERENCES student_verifications(id) ON DELETE CASCADE,
      fileName TEXT,
      fileUrl TEXT,
      fileType TEXT,
      uploadedAt TEXT DEFAULT (datetime('now'))
    );

    -- Indexes
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

  CREATE INDEX IF NOT EXISTS idx_product_colors_product_id ON product_colors(product_id);
 `);

  try {
    const productCols = db.prepare("PRAGMA table_info(products)").all();
    if (!productCols.find(c => c.name === 'variants')) {
      db.prepare('ALTER TABLE products ADD COLUMN variants TEXT DEFAULT \'[]\'').run();
    }
    const orderItemCols = db.prepare("PRAGMA table_info(order_items)").all();
    if (!orderItemCols.find(c => c.name === 'variant')) {
      db.prepare('ALTER TABLE order_items ADD COLUMN variant TEXT').run();
    }
    const verificationCols = db.prepare("PRAGMA table_info(student_verifications)").all();
    if (!verificationCols.find(c => c.name === 'userId')) {
      db.prepare('ALTER TABLE student_verifications ADD COLUMN userId TEXT REFERENCES users(id)').run();
    }
    const userCols = db.prepare("PRAGMA table_info(users)").all();
    if (!userCols.find(c => c.name === 'phoneVerified')) {
      db.prepare('ALTER TABLE users ADD COLUMN phoneVerified INTEGER DEFAULT 0').run();
    }
  } catch (migrationErr) {
    console.warn('Migration warning:', migrationErr.message);
  }
}

module.exports = { connectDatabase, getDb };
