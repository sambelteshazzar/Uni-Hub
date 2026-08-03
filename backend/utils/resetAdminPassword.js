/**
 * One-off admin password reset.
 *
 * Re-hashes ADMIN_PASSWORD and writes it onto the existing admin row, so you
 * can change ADMIN_PASSWORD in Render and propagate it to the already-seeded
 * user (server.js only creates the admin if it does not already exist).
 *
 * Usage:
 *   # local SQLite
 *   cd backend && node utils/resetAdminPassword.js
 *
 *   # production Turso (reads TURSO_URL + TURSO_AUTH_TOKEN from .env or the
 *   # process environment; Render shell, your local .env, etc.)
 *   NODE_ENV=production node utils/resetAdminPassword.js
 *
 * Pass the new password via ADMIN_PASSWORD — it MUST be >= 12 chars and not
 * the default 'Admin123!' (matches the server.js:392-399 guard).
 */
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { connectDatabase, getDb, isTurso } = require('../config/database');
const { db } = require('../utils/db');

async function resetAdminPassword () {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@unihub.local';
  const newPassword = process.env.ADMIN_PASSWORD;

  if (!newPassword) {
    console.error('❌ ADMIN_PASSWORD env var not set');
    process.exit(1);
  }
  if (newPassword.length < 12 || newPassword === 'Admin123!') {
    console.error('❌ ADMIN_PASSWORD must be >= 12 chars and not the default Admin123!');
    process.exit(1);
  }

  await connectDatabase();
  // Touch getDb so the local sqlite handle is opened if we're not on Turso.
  if (!isTurso()) {
    getDb();
  }

  const existing = await db('users').findOne({ email: adminEmail });
  if (!existing) {
    console.error(`❌ No user found with email ${adminEmail}.`);
    console.error(
      '   Run `npm run seed` first (dev) or restart the server (prod) to seed the admin.',
    );
    process.exit(1);
  }

  if (existing.role !== 'admin') {
    console.error(`❌ User ${adminEmail} exists but has role "${existing.role}", not "admin".`);
    process.exit(1);
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await db('users').updateById(existing.id, {
    password: hashed,
    updatedAt: new Date().toISOString(),
  });

  console.log(`✅ Admin password updated for ${adminEmail} (id=${existing.id}).`);
  console.log('   You can now log in with the new ADMIN_PASSWORD.');
  process.exit(0);
}

resetAdminPassword().catch(err => {
  console.error('❌ Reset failed:', err.message || err);
  process.exit(1);
});
