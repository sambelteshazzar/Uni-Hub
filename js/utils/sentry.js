/* exported sentryManager */
class SentryManager {
  constructor () {
    this.initialized = false;
  }

  init () {
    const dsn = this._getDSN();
    if (!dsn) {
      console.log('Sentry: No DSN configured, skipping frontend init');
      return;
    }

    try {
      const Sentry = window.Sentry;
      if (!Sentry) { return; }

      Sentry.init({
        dsn,
        environment: this._getEnv(),
        tracesSampleRate: this._getEnv() === 'production' ? 0.2 : 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
      });

      this.initialized = true;
      console.log('Sentry: Frontend initialized');
    } catch (error) {
      console.error('Sentry: Failed to initialize', error);
    }
  }

  setUser (user) {
    if (!this.initialized || !window.Sentry) { return; }
    try {
      window.Sentry.setUser({
        id: user._id || user.id,
        email: user.email,
        username: user.fullName,
        university: user.university,
        role: user.role,
      });
    } catch (e) { /* ignore */ }
  }

  clearUser () {
    if (!this.initialized || !window.Sentry) { return; }
    try {
      window.Sentry.setUser(null);
    } catch (e) { /* ignore */ }
  }

  captureException (error, context) {
    if (!this.initialized || !window.Sentry) { return; }
    try {
      window.Sentry.captureException(error, { extra: context || {} });
    } catch (e) { /* ignore */ }
  }

  captureMessage (message, level) {
    if (!this.initialized || !window.Sentry) { return; }
    try {
      window.Sentry.captureMessage(message, level || 'info');
    } catch (e) { /* ignore */ }
  }

  _getDSN () {
    const meta = document.querySelector('meta[name="sentry-dsn"]');
    if (meta) { return meta.getAttribute('content'); }
    return window.__SENTRY_DSN__ || '';
  }

  _getEnv () {
    return window.__NODE_ENV__ || 'development';
  }
}

const sentryManager = new SentryManager();
window.sentryManager = sentryManager;
if (typeof dispatchEvent !== 'undefined') {
  dispatchEvent(new Event('module-loaded', { detail: 'SentryManager' }));
}
