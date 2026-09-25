// Shared escape helpers — pure move of pages.js module-level wrappers.
// Behavior is intentionally identical to the original: guard first, coerce to
// String, fall back to the raw value if SecurityUtils is unavailable.
const escapeValue = v => {
  if (typeof SecurityUtils !== 'undefined' && SecurityUtils.escapeHtml) {
    return SecurityUtils.escapeHtml(String(v === null || v === undefined ? '' : v));
  }
  return String(v === null || v === undefined ? '' : v);
};

const safeUrlValue = url => {
  if (typeof SecurityUtils !== 'undefined' && SecurityUtils.sanitizeUrl) {
    return SecurityUtils.sanitizeUrl(url) || '';
  }
  return String(url === null || url === undefined ? '' : url);
};

export { escapeValue, safeUrlValue };
