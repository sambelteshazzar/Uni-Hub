const Sentry = require('@sentry/node');

function initSentry () {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    // eslint-disable-next-line no-console
    console.log('Sentry: No SENTRY_DSN configured, skipping initialization');
    return false;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: 0.1,
    enableLogs: true,
    integrations: [
      new (require('@sentry/profiling-node')).nodeProfilingIntegration(),
    ],
  });

  // eslint-disable-next-line no-console
  console.log('Sentry: Initialized successfully');
  return true;
}

function captureException (error, context = {}) {
  if (!process.env.SENTRY_DSN) { return; }
  const Sentry = require('@sentry/node');
  Sentry.captureException(error, {
    extra: context,
  });
}

function captureMessage (message, level = 'info', context = {}) {
  if (!process.env.SENTRY_DSN) { return; }
  const Sentry = require('@sentry/node');
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

function setUserContext (user) {
  if (!process.env.SENTRY_DSN || !user) { return; }
  const Sentry = require('@sentry/node');
  Sentry.setUser({
    id: user._id?.toString() || user.id?.toString(),
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
  const Sentry = require('@sentry/node');
  return Sentry.setupExpressErrorHandler().requestHandler || ((req, res, next) => next());
}

function errorHandler () {
  if (!process.env.SENTRY_DSN) {
    return (err, req, res, next) => next(err);
  }
  const Sentry = require('@sentry/node');
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
