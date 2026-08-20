// Sentry Browser Instrumentation - npm package approach
import * as Sentry from "@sentry/browser";

// Global initialization state
let sentryInitialized = false;

export function initSentry() {
  if (sentryInitialized) return true;
  
  const dsn = import.meta.env.VITE_SENTRY_DSN || "https://743b5f1f6b5912894bb3278e60f6b7b5@o4509421306052608.ingest.us.sentry.io/4511942433964032";
  
  if (!dsn) {
    console.log('Sentry: No DSN configured, skipping initialization');
    return false;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'development',
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    
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

    tracesSampleRate: import.meta.env.MODE === 'development' ? 1.0 : 0.1,
    tracePropagationTargets: ["localhost", /^https:\/\/uni-hub-bnxi\.onrender\.com/],

    replaysSessionSampleRate: import.meta.env.MODE === 'development' ? 1.0 : 0.1,
    replaysOnErrorSampleRate: 1.0,
    enableLogs: true,
    debug: import.meta.env.MODE === 'development',
  });

  sentryInitialized = true;
  console.log('Sentry: Initialized successfully');
  return true;
}

export function captureException(error, context = {}) {
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(message, level = 'info', context = {}) {
  Sentry.captureMessage(message, { level, extra: context });
}

export function setUserContext(user) {
  if (!user) return;
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

export function initSentry() {
  if (sentryInitialized) return true;
  return initSentryInternal();
}

function initSentryInternal() {
  if (sentryInitialized) return true;
  
  const dsn = import.meta.env.VITE_SENTRY_DSN || "https://743b5f1f6b5912894bb3278e60f6b7b5@o4509421306052608.ingest.us.sentry.io/4511942433964032";
  
  if (!dsn) {
    console.log('Sentry: No DSN configured, skipping initialization');
    return false;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'development',
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    
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

    tracesSampleRate: import.meta.env.MODE === 'development' ? 1.0 : 0.1,
    tracePropagationTargets: ["localhost", /^https:\/\/uni-hub-bnxi\.onrender\.com/],

    replaysSessionSampleRate: import.meta.env.MODE === 'development' ? 1.0 : 0.1,
    replaysOnErrorSampleRate: 1.0,
    enableLogs: true,
    debug: import.meta.env.MODE === 'development',
  });

  sentryInitialized = true;
  console.log('Sentry: Initialized successfully');
  return true;
}

export function captureException(error, context = {}) {
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(message, level = 'info', context = {}) {
  Sentry.captureMessage(message, { level, extra: context });
}

export function setUserContext(user) {
  if (!user) return;
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
};