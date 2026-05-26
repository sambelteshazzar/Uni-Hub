const crypto = require('crypto');

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_LENGTH = 6;

const store = new Map();

function _key (phone) {
  return phone.replace(/[\s\-()]/g, '');
}

function generateCode () {
  const digits = crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, '0');
  return digits;
}

function createOtp (phone) {
  const k = _key(phone);
  const existing = store.get(k);

  if (existing && Date.now() < existing.sentAt + OTP_COOLDOWN_MS) {
    const remaining = Math.ceil((existing.sentAt + OTP_COOLDOWN_MS - Date.now()) / 1000);
    return { success: false, error: `Please wait ${remaining}s before requesting a new code`, cooldown: remaining };
  }

  const code = generateCode();
  const entry = {
    phone,
    code,
    attempts: 0,
    verified: false,
    sentAt: Date.now(),
    expiresAt: Date.now() + OTP_EXPIRY_MS,
  };

  store.set(k, entry);
  return { success: true, code, expiresAt: entry.expiresAt };
}

function verifyOtp (phone, code) {
  const k = _key(phone);
  const entry = store.get(k);

  if (!entry) {
    return { success: false, error: 'No OTP found for this phone number. Please request a new code.' };
  }

  if (entry.verified) {
    return { success: false, error: 'This code has already been used.' };
  }

  if (Date.now() > entry.expiresAt) {
    store.delete(k);
    return { success: false, error: 'Code has expired. Please request a new one.' };
  }

  if (entry.attempts >= OTP_MAX_ATTEMPTS) {
    store.delete(k);
    return { success: false, error: 'Too many failed attempts. Please request a new code.' };
  }

  entry.attempts++;

  if (entry.code !== code) {
    const remaining = OTP_MAX_ATTEMPTS - entry.attempts;
    return { success: false, error: `Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` };
  }

  entry.verified = true;
  return { success: true };
}

function isPhoneVerified (phone) {
  const k = _key(phone);
  const entry = store.get(k);
  return entry && entry.verified;
}

function clearOtp (phone) {
  store.delete(_key(phone));
}

setInterval(() => {
  const now = Date.now();
  for (const [k, entry] of store) {
    if (now > entry.expiresAt + 60000) {
      store.delete(k);
    }
  }
}, 120000);

module.exports = { createOtp, verifyOtp, isPhoneVerified, clearOtp };
