const crypto = require('crypto');

const csrfTokens = new Map();

const CSRF_TOKEN_EXPIRY = 2 * 60 * 60 * 1000;

function generateCsrfToken () {
  const token = crypto.randomBytes(32).toString('hex');
  return token;
}

function csrfTokenHandler (req, res, next) {
  if (req.method === 'GET' && req.path === '/api/auth/csrf-token') {
    const token = generateCsrfToken();
    csrfTokens.set(token, { createdAt: Date.now() });
    cleanExpiredTokens();
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

  const tokenData = csrfTokens.get(csrfToken);
  if (!tokenData) {
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token',
    });
  }

  if (Date.now() - tokenData.createdAt > CSRF_TOKEN_EXPIRY) {
    csrfTokens.delete(csrfToken);
    return res.status(403).json({
      success: false,
      error: 'CSRF token expired',
    });
  }

  next();
}

function cleanExpiredTokens () {
  const now = Date.now();
  for (const [token, data] of csrfTokens.entries()) {
    if (now - data.createdAt > CSRF_TOKEN_EXPIRY) {
      csrfTokens.delete(token);
    }
  }
}

module.exports = { csrfTokenHandler, csrfProtection, generateCsrfToken };
