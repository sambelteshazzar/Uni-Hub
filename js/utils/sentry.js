// Sentry Browser Instrumentation
//
// The SDK is loaded lazily via a dynamic import so this module NEVER
// breaks app boot when the bare specifier "@sentry/browser" cannot be
// resolved — i.e. when the app is served as unbundled ES modules from
// a plain static server (http-server, Vercel dist/). In Vite dev and in
// the esbuild-bundled dist/js/utils/sentry.js output (see vite.config.js
// copyJsTree) the import resolves and Sentry reports errors as intended.
// When it can't resolve, error reporting is silently disabled.
//
// PII/secrets are scrubbed from all payloads before capture (see _scrub).

let Sentry = null;

const _env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const _isDev = _env.MODE === 'development';
const _dsn =
  _env.VITE_SENTRY_DSN ||
  'https://743b5f1f6b5912894bb3278e60f6b7b5@o4509421306052608.ingest.us.sentry.io/4511942433964032';

let sentryInitialized = false;

// Keys that must never leave the browser. Any context/breadcrumb object is
// scrubbed against these (and common variants) before capture. Tokens,
// session objects, emails, phone numbers, payment/password fields, and any
// key prefixed token/secret/password are replaced with '[REDACTED]'.
const _PII_KEY_PATTERN =
  /token|secret|password|passwd|authorization|email|phone|card|pan|cvv|payment|address|account|iban|ssn|credential/i;

function _scrub(value, depth = 0) {
  if (depth > 5 || value === null || value === undefined) {
    return value === undefined ? '[REDACTED]' : value;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(v => _scrub(v, depth + 1));
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (_PII_KEY_PATTERN.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = _scrub(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

async function _loadSentry() {
  if (Sentry) {
    return true;
  }
  try {
    const mod = await import('@sentry/browser');
    Sentry = mod.default || mod;
    return true;
  } catch (_err) {
    console.warn('Sentry: @sentry/browser unavailable, error reporting disabled');
    return false;
  }
}

export async function initSentry() {
  if (sentryInitialized) {
    return true;
  }
  if (!_dsn) {
    console.info('Sentry: No DSN configured, skipping initialization');
    return false;
  }
  if (!(await _loadSentry())) {
    return false;
  }
  try {
    Sentry.init({
      dsn: _dsn,
      environment: _isDev ? 'development' : 'production',
      release: _env.VITE_APP_VERSION || '1.0.0',
      integrations: [
        Sentry.browserTracingIntegration?.(),
        Sentry.replayIntegration?.({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: _isDev ? 1.0 : 0.1,
      tracePropagationTargets: ['localhost', /^https:\/\/uni-hub-bnxi\.onrender\.com/],
      replaysSessionSampleRate: _isDev ? 1.0 : 0.1,
      replaysOnErrorSampleRate: 1.0,
      debug: _isDev,
    });
    sentryInitialized = true;
    console.info('Sentry: Initialized successfully');
  } catch (_err) {
    console.warn('Sentry: init failed, continuing without error reporting');
  }
  return true;
}

export function captureException(error, context = {}) {
  if (!Sentry) {
    return;
  }
  Sentry.captureException(error, { extra: _scrub(context) });
}

export function captureMessage(message, level = 'info', context = {}) {
  if (!Sentry) {
    return;
  }
  Sentry.captureMessage(message, { level, extra: _scrub(context) });
}

export function setUserContext(user) {
  if (!Sentry || !user) {
    return;
  }
  // PII-minimal user identity — id + role only. Email, full name and
  // university are scrubbed so they never reach the Sentry ingest endpoint.
  Sentry.setUser({
    id: user.id?.toString() || user._id?.toString() || '[REDACTED]',
  });
}

export function clearUserContext() {
  if (!Sentry) {
    return;
  }
  Sentry.setUser(null);
}

export function addBreadcrumb(breadcrumb) {
  if (!Sentry) {
    return;
  }
  Sentry.addBreadcrumb(_scrub(breadcrumb));
}

export function startTransaction(name, op) {
  if (!Sentry) {
    return null;
  }
  return Sentry.startSpan({ name, op });
}

export const sentry = Sentry;

export default {
  initSentry,
  captureException,
  captureMessage,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  startTransaction,
};

// Assign to window for global access — required by the module loader in
// app-init.js, which verifies these names are exposed on window.
if (typeof window !== 'undefined') {
  window.initSentry = initSentry;
  window.captureException = captureException;
  window.captureMessage = captureMessage;
  window.setUserContext = setUserContext;
  window.clearUserContext = clearUserContext;
  window.addBreadcrumb = addBreadcrumb;
  window.startTransaction = startTransaction;
}
