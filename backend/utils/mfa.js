// ============================================
// MFA SERVICE - Email OTP for privileged logins
// ============================================
// Admin and moderator logins require a 6-digit one-time code emailed to the
// account address after password verification. Codes are CSPRNG-derived,
// hashed at rest (SHA-256 with a server-side pepper), expire in 5 minutes,
// allow max 3 attempts, and are single-use.
//
// TODO: security review — consider TOTP (RFC-6238) as a follow-up; email
// OTP inherits the mailbox's security. Never log or email-back the code.

const crypto = require('crypto');
const { db, generateId } = require('./db');

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;

function hashCode (userId, code) {
  const pepper = process.env.JWT_SECRET || 'uni-hub-dev-pepper';
  return crypto.createHash('sha256').update(`${userId}:${code}:${pepper}`).digest('hex');
}

function generateCode () {
  // CSPRNG: 6 decimal digits, uniformly mapped.
  return String(crypto.randomBytes(4).readUInt32BE(0) % 1000000).padStart(6, '0');
}

/**
 * Create an MFA challenge for a verified-password login.
 * @returns {{ id: string, code?: string }} code is present ONLY when
 *   NODE_ENV=test so e2e suites can complete the flow without a mailbox.
 */
async function createChallenge (user) {
  const code = generateCode();
  // Generate the id here and use it directly: looking the row back up by
  // `ORDER BY createdAt DESC LIMIT 1` is ambiguous when two logins for the
  // SAME account land within the same second (datetime('now') granularity),
  // which cross-wires challenge ids and codes under concurrent logins.
  const id = generateId();
  await db('admin_mfa_challenges').rawRun(
    'INSERT INTO admin_mfa_challenges (id, userId, codeHash, expiresAt) VALUES (?, ?, ?, ?)',
    [id, user.id, hashCode(user.id, code), new Date(Date.now() + CODE_TTL_MS).toISOString()],
  );
  const result = { id };
  if (process.env.NODE_ENV === 'test') {
    result.devCode = code;
  }
  return result;
}

/**
 * Verify a challenge. Timing-safe comparison; single-use; max 3 attempts.
 */
async function verifyChallenge (challengeId, userId, providedCode) {
  if (!providedCode || !/^\d{6}$/.test(String(providedCode))) {
    return { ok: false, reason: 'invalid_format' };
  }

  const row = await db('admin_mfa_challenges').rawGet(
    'SELECT * FROM admin_mfa_challenges WHERE id = ? AND userId = ?',
    [challengeId, userId],
  );
  if (!row) {
    return { ok: false, reason: 'not_found' };
  }
  if (row.consumedAt) {
    return { ok: false, reason: 'already_used' };
  }
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: 'too_many_attempts' };
  }

  const providedHash = Buffer.from(hashCode(userId, String(providedCode)), 'hex');
  const storedHash = Buffer.from(row.codeHash, 'hex');
  const matches = crypto.timingSafeEqual(providedHash, storedHash);

  if (!matches) {
    await db('admin_mfa_challenges').rawRun(
      'UPDATE admin_mfa_challenges SET attempts = attempts + 1 WHERE id = ?',
      [row.id],
    );
    return { ok: false, reason: 'wrong_code' };
  }

  await db('admin_mfa_challenges').rawRun(
    'UPDATE admin_mfa_challenges SET consumedAt = ? WHERE id = ?',
    [new Date().toISOString(), row.id],
  );
  return { ok: true };
}

module.exports = { createChallenge, verifyChallenge };
