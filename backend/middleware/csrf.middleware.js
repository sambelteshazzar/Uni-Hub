const crypto = require('crypto');

const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');
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
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const signature = parts[2];
  const expected = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(payload)
    .digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  const expires = parseInt(parts[1], 10);
  if (isNaN(expires) || Date.now() > expires) return false;
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