/**
 * Input Sanitization Middleware
 * Prevents NoSQL injection and XSS attacks
 */

function sanitizeQuery (req, res, next) {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const sanitized = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
      if (key.startsWith('$') || key.includes('.')) {
        continue;
      }
      sanitized[key] = typeof obj[key] === 'object' && obj[key] !== null
        ? sanitize(obj[key])
        : obj[key];
    }
    return sanitized;
  };

  if (req.body) { req.body = sanitize(req.body); }
  if (req.params) { req.params = sanitize(req.params); }
  if (req.query) { req.query = sanitize(req.query); }
  next();
}

function escapeHtml (str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

const SENSITIVE_FIELDS = new Set(['password', 'currentPassword', 'newPassword', 'confirmPassword', 'passwordConfirm', 'oldPassword']);

function sanitizeXss (req, res, next) {
  const sanitizeString = (obj, skipField) => {
    if (!obj) return obj;
    if (typeof obj === 'string') {
      if (skipField) return obj;
      return escapeHtml(obj);
    }
    if (Array.isArray(obj)) return obj.map(item => sanitizeString(item, false));
    if (typeof obj === 'object') {
      const sanitized = {};
      for (const key in obj) {
        sanitized[key] = sanitizeString(obj[key], SENSITIVE_FIELDS.has(key));
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) { req.body = sanitizeString(req.body, false); }
  next();
}

function validateObjectId (req, res, next) {
  const idParam = req.params.id;
  if (idParam && !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(idParam) && !/^[0-9a-fA-F]{24}$/.test(idParam)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format',
    });
  }
  next();
}

function escapeRegex (str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  sanitizeQuery,
  sanitizeMongoQuery: sanitizeQuery,
  sanitizeXss,
  validateObjectId,
  escapeRegex,
  // Exported so the Socket.io handler (which bypasses the Express
  // middleware chain) can reuse the same escape logic before persisting
  // user-supplied message content. See backend/config/socket.js.
  escapeHtml,
};
