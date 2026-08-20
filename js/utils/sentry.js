// Sentry Browser Instrumentation
// Initialize Sentry as early as possible

import * as Sentry from "@sentry/browser";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    console.log('Sentry: No VITE_SENTRY_DSN configured, skipping initialization');
    return false;
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    
    // Data collection
    dataCollection: {
      userInfo: true,
      httpHeaders: {
        request: true,
        response: true,
      },
    },

    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Tracing
    tracesSampleRate: import.meta.env.MODE === 'development' ? 1.0 : 0.1,
    tracePropagationTargets: ["localhost", /^https:\/\/uni-hub-bnxi\.onrender\.com/],

    // Session Replay
    replaysSessionSampleRate: import.meta.env.MODE === 'development' ? 1.0 : 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Logs
    enableLogs: true,

    // Debug in development
    debug: import.meta.env.MODE === 'development',
  });

  console.log('Sentry: Initialized successfully');
  return true;
}

export function captureException(error, context = {}) {
  if (!import.meta.env.VITE_SENTRY_DSN) { return; }
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(message, level = 'info', context = {}) {
  if (!import.meta.env.VITE_SENTRY_DSN) { return; }
  Sentry.captureMessage(message, { level, extra: context });
}

export function setUserContext(user) {
  if (!user) { return; }
  Sentry.setUser({
    id: user.id?.toString() || user._id?.toString(),
    email: user.email,
    username: user.fullName,
    university: user.university,
    role: user.role,
  });
}

export function clearUserContext() {
  Sentry.setUser(null);
}

export function addBreadcrumb(breadcrumb) {
  Sentry.addBreadcrumb(breadcrumb);
}

export function startTransaction(name, op) {
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
  sentry,
};