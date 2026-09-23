/**
 * Regression: FRONTEND_URL is a CSV (CORS allowlist — see server.js:159).
 * sendPasswordResetEmail used the RAW value, so a CSV produced a malformed
 * reset URL like
 *   https://jertscart.com,http://localhost:8000#/reset-password?token=...
 * Every other FRONTEND_URL consumer splits to the first origin. Assert the
 * reset link uses only the first origin and a / before the hash route.
 *
 * Mocks the Brevo transport (not the module's sendEmail export — that is a
 * same-module closure and is invisible to jest). SDK shape mirrors
 * @getbrevo/brevo v6: BrevoClient -> transactionalEmails.sendTransacEmail.
 */
const mockSendTransacEmail = jest.fn(async () => ({ messageId: 'msg-1' }));

jest.mock('@getbrevo/brevo', () => ({
  BrevoClient: jest.fn(() => ({
    transactionalEmails: {
      sendTransacEmail: (...args) => mockSendTransacEmail(...args),
    },
  })),
}));

describe('sendPasswordResetEmail link building', () => {
  let sendPasswordResetEmail;
  let prevBrevo;
  let prevFrontend;

  beforeAll(() => {
    prevBrevo = process.env.BREVO_API_KEY;
    prevFrontend = process.env.FRONTEND_URL;
    process.env.BREVO_API_KEY = 'xkeysib-test-key';
    process.env.FRONTEND_URL = 'https://jertscart.com,http://localhost:8000';
    ({ sendPasswordResetEmail } = require('../utils/emailService'));
  });

  afterAll(() => {
    if (prevBrevo === undefined) {
      delete process.env.BREVO_API_KEY;
    } else {
      process.env.BREVO_API_KEY = prevBrevo;
    }
    if (prevFrontend === undefined) {
      delete process.env.FRONTEND_URL;
    } else {
      process.env.FRONTEND_URL = prevFrontend;
    }
  });

  beforeEach(() => {
    mockSendTransacEmail.mockClear();
  });

  test('uses only the first FRONTEND_URL origin in the reset link', async () => {
    const result = await sendPasswordResetEmail('user@example.com', 'jwt.token.value123');
    expect(result.success).toBe(true);
    expect(mockSendTransacEmail).toHaveBeenCalledTimes(1);

    const { htmlContent } = mockSendTransacEmail.mock.calls[0][0];
    expect(htmlContent).toContain(
      'https://jertscart.com/#/reset-password?token=jwt.token.value123',
    );
    // The CSV tail must not leak into the URL.
    expect(htmlContent).not.toContain('localhost');
    expect(htmlContent).not.toMatch(/jertscart\.com,/);
  });
});
