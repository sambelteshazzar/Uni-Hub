const Sentry = require('@sentry/node');

function initSentry () {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    // eslint-disable-next-line no-console
    console.log('Sentry: No SENTRY_DSN configured, skipping initialization');
    return false;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
  });

  // eslint-disable-next-line no-console
  console.log('Sentry: Initialized successfully');
  return true;
}

function captureException (error, context = {}) {
  if (!process.env.SENTRY_DSN) { return; }
  Sentry.captureException(error, {
    extra: context,
  });
}

function captureMessage (message, level = 'info', context = {}) {
  if (!process.env.SENTRY_DSN) { return; }
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

function setUserContext (user) {
  if (!process.env.SENTRY_DSN || !user) { return; }
  Sentry.setUser({
    id: user._id?.toString(),
    email: user.email,
    username: user.fullName,
    university: user.university,
    role: user.role,
  });
}

function requestHandler () {
  if (!process.env.SENTRY_DSN) {
    return (req, res, next) => next();
  }
  return Sentry.setupExpressErrorHandler().requestHandler || ((req, res, next) => next());
}

function errorHandler () {
  if (!process.env.SENTRY_DSN) {
    return (err, req, res, next) => next(err);
  }
  return Sentry.setupExpressErrorHandler().errorHandler || ((err, req, res, next) => next(err));
}

module.exports = {
  initSentry,
  captureException,
  captureMessage,
  setUserContext,
  requestHandler,
  errorHandler,
};
