// Sentry Browser Instrumentation using Loader Script
// This approach works without a bundler by using Sentry's Loader Script

// Global state for initialization
let sentryCallbacks = [];

// Called when Sentry Loader Script finishes loading
window.sentryOnLoad = function () {
  initSentryInternal();
};

function initSentryInternal() {
  if (typeof Sentry === 'undefined') {
    console.warn('Sentry: SDK not loaded yet');
    return false;
  }

  const dsn = window.SENTRY_DSN || window.VITE_SENTRY_DSN;
  if (!dsn) {
    console.log('Sentry: No SENTRY_DSN configured, skipping initialization');
    return false;
  }

  Sentry.init({
    dsn: window.SENTRY_DSN || window.VITE_SENTRY_DSN,
    environment: window.ENVIRONMENT || (window.location.hostname === 'localhost' ? 'development' : 'production'),
    release: window.APP_VERSION || '1.0.0',
    
    dataCollection: {
      userInfo: true,
      httpHeaders: {
        request: true,
        response: true,
      },
    },

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    tracesSampleRate: window.location.hostname === 'localhost' ? 1.0 : 0.1,
    tracePropagationTargets: ["localhost", /^https:\/\/uni-hub-bnxi\.onrender\.com/],

    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    enableLogs: true,
  });

  console.log('Sentry: Initialized successfully');
  return true;
}

function initSentry() {
  if (typeof Sentry !== 'undefined') {
    return initSentryInternal();
  }
  return false;
}

function captureException(error, context = {}) {
  if (typeof Sentry === 'undefined') return;
  Sentry.captureException(error, { extra: context });
}

function captureMessage(message, level = 'info', context = {}) {
  if (typeof Sentry === 'undefined') return;
  Sentry.captureMessage(message, { level, extra: context });
}

function setUserContext(user) {
  if (typeof Sentry === 'undefined' || !user) return;
  Sentry.setUser({
    id: user.id?.toString() || user._id?.toString(),
    email: user.email,
    username: user.fullName,
    university: user.university,
    role: user.role,
  });
}

function clearUserContext() {
  if (typeof Sentry === 'undefined') return;
  Sentry.setUser(null);
}

function addBreadcrumb(breadcrumb) {
  if (typeof Sentry === 'undefined') return;
  Sentry.addBreadcrumb(breadcrumb);
}

function startTransaction(name, op) {
  if (typeof Sentry === 'undefined') return null;
  return Sentry.startSpan({ name, op });
}

// Export functions for use by other modules
export { 
  initSentry,
  captureException,
  captureMessage,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  startTransaction
};

export const sentry = typeof Sentry !== 'undefined' ? Sentry : null;

export default {
  initSentry,
  captureException,
  captureMessage,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  startTransaction,
};