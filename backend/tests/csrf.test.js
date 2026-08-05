/**
 * CSRF Middleware Tests
 *
 * Regression coverage for the malformed-token crash that turned the
 * 403 "Invalid or expired CSRF token" path into an unhandled 500.
 *
 * Root cause: validateCsrfToken (backend/middleware/csrf.middleware.js)
 * called crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
 * without a prior length check. Node's timingSafeEqual throws
 *   RangeError: Input buffers must have the same byte length
 * when the two buffers differ in length. The HMAC signature is always
 * 64 hex chars (SHA-256 → 32 bytes → 64 hex), but a malformed or
 * tampered token whose signature isn't 64 chars made validation throw,
 * and the Express middleware chain turned that throw into an HTTP 500.
 *
 * Reproducer before the fix:
 *   node -e "crypto.timingSafeEqual(Buffer.from('a','hex'),Buffer.from('abcd','hex'))"
 *   → throws "Input buffers must have the same byte length"
 *
 * Post-fix, validateCsrfToken returns false for any token whose
 * signature buffer length differs from the expected length (and for
 * all other malformed shapes), so csrfProtection emits the proper 403.
 */

const { validateCsrfToken, generateCsrfToken } = require('../middleware/csrf.middleware');

describe('CSRF token validation', () => {
  test('accepts a freshly-minted, valid token', () => {
    const token = generateCsrfToken();
    expect(typeof token).toBe('string');
    expect(validateCsrfToken(token)).toBe(true);
  });

  test('rejects an expired token', () => {
    // Manually assemble a token already past its expiry. Recreate the
    // exact shape produceCsrfToken builds: `${nonce}.${expires}.${sig}`.
    const crypto = require('crypto');
    const CSRF_SECRET = process.env.CSRF_SECRET;
    // If CSRF_SECRET was lazily set inside csrf.middleware.js it might
    // be a different value than the module-scoped one — but we can't
    // import that locally-scoped constant. Instead, just assert that
    // an expired-shape token is rejected. Generate a freshly-valid
    // token, then craft an expired variant by flipping the expires
    // field and recomputing the signature under the known secret-only-
    // when-set, otherwise re-use of the module's own helper.
    const valid = generateCsrfToken();
    expect(validateCsrfToken(valid)).toBe(true);
    // Tamper the expiry down to "1" (1ms after epoch) but keep the
    // original nonce+signature so the HMAC check still passes; the
    // post-signature expiry check must catch it.
    const parts = valid.split('.');
    const expired = `${parts[0]}.1.${parts[2]}`;
    expect(validateCsrfToken(expired)).toBe(false);
    void CSRF_SECRET;
    void crypto;
  });

  test('rejects a tampered signature (right length, wrong bytes)', () => {
    const valid = generateCsrfToken();
    const [nonce, expires] = valid.split('.');
    const sig = valid.split('.')[2];
    // Flip one hex char in the signature (still 64 chars).
    const tamperedSig = sig.startsWith('a') ? 'b' + sig.slice(1) : 'a' + sig.slice(1);
    const tampered = `${nonce}.${expires}.${tamperedSig}`;
    expect(validateCsrfToken(tampered)).toBe(false);
  });

  // This is the regression test for the 500-instead-of-403 bug.
  // Pre-fix, timingSafeEqual threw RangeError here; the Express
  // middleware chain converted that throw to an HTTP 500.
  // Post-fix, length mismatch returns false synchronously.
  test('does NOT throw on a too-short signature (returns false, no 500)', () => {
    expect(() => validateCsrfToken('a.b.c')).not.toThrow();
    expect(validateCsrfToken('a.b.c')).toBe(false);
  });

  test('does NOT throw on a too-long signature', () => {
    expect(() => validateCsrfToken('a.b.' + 'x'.repeat(128))).not.toThrow();
    expect(validateCsrfToken('a.b.' + 'x'.repeat(128))).toBe(false);
  });

  test('rejects empty / null / undefined / non-string input', () => {
    expect(validateCsrfToken('')).toBe(false);
    expect(validateCsrfToken(null)).toBe(false);
    expect(validateCsrfToken(undefined)).toBe(false);
    expect(validateCsrfToken(12345)).toBe(false);
    expect(validateCsrfToken({})).toBe(false);
  });

  test('rejects tokens with wrong part count (not 3 dotted parts)', () => {
    expect(validateCsrfToken('a.b')).toBe(false);
    expect(validateCsrfToken('a.b.c.d')).toBe(false);
    expect(validateCsrfToken('just_one_segment')).toBe(false);
  });

  test('rejects a token whose signature is correct length but non-hex', () => {
    // 64 chars, but contains characters outside the hex alphabet —
    // Buffer.from(sig, default 'utf8') still produces 64 bytes for
    // 64-char ASCII strings, so length check passes; the
    // timingSafeEqual byte-compare must reject it.
    const sig = 'zzzz'.repeat(16); // 64 chars, non-hex
    expect(validateCsrfToken(`a.b.${sig}`)).toBe(false);
  });
});
