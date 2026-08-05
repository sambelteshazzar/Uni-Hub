const crypto = require('crypto');

// Persist across restarts/deploys by setting CSRF_SECRET in env. Without
// it, every server (re)start mints a new secret, instantly invalidating
// every CSRF token still held in users' browsers — every mutation
// request then 403s with "Invalid or expired CSRF token". In production
// on Render's free tier, the server sleeps/wakes/redeploys constantly,
// so this fallback causes pervasive UX breakage. Set CSRF_SECRET to a
// 32+ char random string in the Render environment.
const CSRF_SECRET = process.env.CSRF_SECRET || (process.env.NODE_ENV === 'production'
  ? (() => { console.error('CSRF_SECRET not set — CSRF tokens will not survive restarts. Set CSRF_SECRET env var.'); return crypto.randomBytes(32).toString('hex'); })()
  : crypto.randomBytes(32).toString('hex'));
const CSRF_TOKEN_EXPIRY = 2 * 60 * 60 * 1000;
const COOKIE_NAME = '__Host-csrf';
const MAX_AGE_SECONDS = 7200;

function generateCsrfToken () {
  const nonce = crypto.randomBytes(16).toString('hex');
  const expires = Date.now() + CSRF_TOKEN_EXPIRY;
  const payload = `${nonce}.${expires}`;
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(payload)
    .digest('hex');
  return `${payload}.${signature}`;
}

function validateCsrfToken (token) {
  if (!token || typeof token !== 'string') {return false;}
  const parts = token.split('.');
  if (parts.length !== 3) {return false;}
  const payload = `${parts[0]}.${parts[1]}`;
  const signature = parts[2];
  const expected = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(payload)
    .digest('hex');
  // timingSafeEqual throws RangeError "Input buffers must have the same
  // byte length" when the two buffers differ in length. A malformed or
  // tampered token whose signature isn't exactly 64 hex chars (the
  // length of a hex-encoded SHA-256 digest) would crash here, and
  // because validateCsrfToken runs inside csrfProtection the throw
  // turned into an unhandled 500 instead of the intended 403. Compare
  // lengths first; if they differ the token is invalid (and not
  // constant-time-safe anyway — the secret is not what's leaking).
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) {return false;}
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) {return false;}
  const expires = parseInt(parts[1], 10);
  if (isNaN(expires) || Date.now() > expires) {return false;}
  return true;
}

function csrfTokenHandler (req, res, next) {
  if (req.method === 'GET' && req.path === '/api/auth/csrf-token') {
    const token = generateCsrfToken();
    res.cookie(COOKIE_NAME, token, {
      httpOnly: false,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: MAX_AGE_SECONDS * 1000,
    });
    return res.json({ success: true, csrfToken: token });
  }
  next();
}

function csrfProtection (req, res, next) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'];
  if (!csrfToken) {
    return res.status(403).json({
      success: false,
      error: 'CSRF token missing',
    });
  }

  if (!validateCsrfToken(csrfToken)) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired CSRF token',
    });
  }

  next();
}

module.exports = { csrfTokenHandler, csrfProtection, generateCsrfToken, validateCsrfToken };
