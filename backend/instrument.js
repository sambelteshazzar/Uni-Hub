// instrument.js — must be loaded before all other modules
const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  
  // Capture local variable values in stack frames
  includeLocalVariables: true,
  
  // Enable Sentry Logs
  enableLogs: true,
  
  // Profiling
  profilesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  integrations: [
    nodeProfilingIntegration(),
  ],

  // Environment
  environment: process.env.NODE_ENV || "development",
  
  // Release tracking (set in production)
  release: process.env.SENTRY_RELEASE,
  
  // Error handling
  beforeSend(event, hint) {
    // Filter out known non-critical errors
    if (event.exception) {
      const error = hint.originalException;
      if (error && error.code === 'ECONNREFUSED') {
        return null; // Don't send connection refused errors
      }
    }
    return event;
  },
});

module.exports = Sentry;