// ============================================
// AUDIT MIDDLEWARE - Server-side admin action logging
// ============================================
// Writes privileged mutations to activity_logs AFTER the response finishes,
// capturing the real actor, route, sanitized payload, IP and user-agent.
// Replaces the spoofable client-side localStorage logger (js/admin/*).
//
// TODO: security review — audit logs are compliance-grade data. Consider
// append-only storage (no UPDATE/DELETE grants) and log shipping.

const { db, generateId } = require('../utils/db');

const SENSITIVE_KEYS = new Set([
  'password', 'currentpassword', 'newpassword', 'confirmpassword',
  'token', 'csrftoken', 'idempotencykey', 'secret', 'authorization',
]);
const MAX_DETAILS_LENGTH = 2000;
const MAX_USER_AGENT_LENGTH = 300;

function sanitizeDetails (body) {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const clean = {};
  for (const key of Object.keys(body)) {
    // Redact BOTH the key name and the value for sensitive fields.
    clean[SENSITIVE_KEYS.has(key.toLowerCase()) ? `${key}_redacted` : key] =
      SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : body[key];
  }
  let json;
  try {
    json = JSON.stringify(clean);
  } catch (_) {
    return '{"_error":"unserializable"}';
  }
  if (json.length > MAX_DETAILS_LENGTH) {
    return json.slice(0, MAX_DETAILS_LENGTH) + '...[truncated]';
  }
  return json;
}

// Router-relative path + method -> activity_logs enum value. Unmapped
// mutating routes are reported loudly (console.warn) instead of being
// silently dropped from the audit trail.
function deriveAction (req) {
  const p = req.path;
  // Normalize the trailing id segment FIRST, then compound-id routes;
  // doing both unconditionally corrupted /users/:id/ban -> /users/:id/:id.
  const normalized = /\/(approve|reject|ban)$/u.test(p)
    ? p.replace(/\/[^/]+\/(approve|reject|ban)$/u, '/:id/$1')
    : p.replace(/\/[^/]+$/u, '/:id');
  switch (`${req.method} ${normalized}`) {
  case 'POST /products': return 'product_create';
  case 'PUT /products/:id': return 'product_update';
  case 'DELETE /products/:id': return 'product_delete';
  case 'PUT /products/:id/approve': return 'admin_approve';
  case 'PUT /products/:id/reject': return 'admin_reject';
  case 'PUT /users/:id/ban': return 'admin_ban';
  default: return null;
  }
}

/**
 * Returns middleware that audits one mutating request.
 * @param {string} [actionOverride] - fixed enum action (e.g. 'admin_refund')
 */
function auditMutation (actionOverride) {
  return function audit (req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Capture request context NOW, while we are still inside the mounted
    // router: req.path here is router-relative. If an error propagates to
    // the app-level handler, Express restores req.url to the full original
    // path BEFORE 'finish' fires, which would break late derivation.
    const action = actionOverride || deriveAction(req);
    const actor = req.user
      ? { id: req.user.id, email: req.user.email, fullName: req.user.fullName, role: req.user.role }
      : null;
    const details = sanitizeDetails(req.body);
    const ipAddress = req.ip || null;
    const userAgent = (req.headers['user-agent'] || '').slice(0, MAX_USER_AGENT_LENGTH) || null;

    res.on('finish', () => {
      try {
        const statusCode = res.statusCode;
        // Failed authorization attempts are exactly what an audit trail is
        // for — record them, but unmapped routes must be visible in logs.
        if (!action) {
          console.warn(`Audit gap: no action mapping for ${req.method} ${req.originalUrl}`);
          return;
        }

        const severity = statusCode >= 500
          ? 'critical'
          : (statusCode >= 400 || req.method === 'DELETE' ? 'warning' : 'info');

        db('activity_logs').rawRun(
          `INSERT INTO activity_logs
            (id, user, userEmail, userName, userRole, action, details, ipAddress, userAgent, severity)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateId(),
            actor ? actor.id : null,
            actor ? actor.email : null,
            actor ? actor.fullName : null,
            actor ? actor.role : null,
            action,
            details,
            ipAddress,
            userAgent,
            severity,
          ],
        ).catch(err => console.error('Audit write failed:', err.message));
      } catch (err) {
        console.error('Audit hook failed:', err.message);
      }
    });

    return next();
  };
}

module.exports = { auditMutation };
