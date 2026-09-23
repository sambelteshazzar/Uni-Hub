/**
 * Regression: @getbrevo/brevo is pinned at ^6.0.3, which no longer exports
 * TransactionalEmailsApi (v1/v2 API). The old
 *   new brevo.TransactionalEmailsApi()
 * threw "is not a constructor" at module load whenever BREVO_API_KEY was
 * set, the catch left the client null, and EVERY send silently skipped —
 * newsletter 201'd "Confirmation email sent" with nothing in Brevo's logs.
 *
 * This test uses the REAL package (no jest.mock): with the key set,
 * isEmailConfigured() must reach true via a successfully constructed
 * BrevoClient. It fails against the old constructor shape.
 */
describe('Brevo v6 SDK (real package)', () => {
  let prevKey;
  let prevHost;
  let prevUser;
  let prevPass;

  beforeAll(() => {
    prevKey = process.env.BREVO_API_KEY;
    prevHost = process.env.EMAIL_HOST;
    prevUser = process.env.EMAIL_USER;
    prevPass = process.env.EMAIL_PASS;
    process.env.BREVO_API_KEY = 'xkeysib-dummy-for-construction-only';
    delete process.env.EMAIL_HOST;
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
  });

  afterAll(() => {
    if (prevKey === undefined) {
      delete process.env.BREVO_API_KEY;
    } else {
      process.env.BREVO_API_KEY = prevKey;
    }
    if (prevHost === undefined) {
      delete process.env.EMAIL_HOST;
    } else {
      process.env.EMAIL_HOST = prevHost;
    }
    if (prevUser === undefined) {
      delete process.env.EMAIL_USER;
    } else {
      process.env.EMAIL_USER = prevUser;
    }
    if (prevPass === undefined) {
      delete process.env.EMAIL_PASS;
    } else {
      process.env.EMAIL_PASS = prevPass;
    }
  });

  test('isEmailConfigured() is true via BrevoClient construction, no SMTP', () => {
    let configured;
    let brevoWarn = null;
    const origWarn = console.warn;
    console.warn = (...args) => {
      if (String(args[0]).includes('Brevo not initialized')) {
        brevoWarn = args.join(' ');
      }
    };
    try {
      jest.isolateModules(() => {
        const { isEmailConfigured } = require('../utils/emailService');
        configured = isEmailConfigured();
      });
    } finally {
      console.warn = origWarn;
    }
    expect(brevoWarn).toBeNull();
    expect(configured).toBe(true);
  });

  test('newsletter module loads with a non-null Brevo client', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      jest.isolateModules(() => {
        require('../controllers/newsletter.controller');
      });
      const brevoWarns = warnSpy.mock.calls.filter(args =>
        String(args[0]).includes('Brevo not initialized'),
      );
      expect(brevoWarns).toEqual([]);
    } finally {
      warnSpy.mockRestore();
    }
  });
});
