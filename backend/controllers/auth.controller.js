const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db, mapUserRow } = require('../utils/db');
const { generateToken, generateResetToken } = require('../utils/token.util');
const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { sendPasswordResetEmail, sendEmail, isEmailConfigured } = require('../utils/emailService');
const logActivity = require('../utils/logActivity');
const mfa = require('../utils/mfa');
const universities = require('../config/universities');
const { POLICY_VERSION } = require('../config/policies');

function getPublicProfile (user) {
  const { password: _, resetToken: __, resetTokenExpiry: ___, passwordChangedAt: ____, bannedBy: _____, ...profile } = user;
  profile._id = profile.id;
  return profile;
}

/**
 * Record a consent artifact for an account. Never throws: signup proceeds
 * even if the write fails (warning flags the gap; spec trade-off).
 */
async function recordConsent (userId, method, ip) {
  try {
    await db('consent_records').create({
      userId,
      documentType: 'terms_and_privacy',
      policyVersion: POLICY_VERSION,
      method,
      ipAddress: ip || null,
    });
  } catch (err) {
    console.warn('[consent] failed to record consent:', err.message);
  }
}
exports.recordConsentForTesting = recordConsent;

/**
 * @desc Register new user
 * @route POST /api/auth/register
 * @access Public
 */
exports.register = asyncHandler(async (req, res) => {
  // fullName is let (not const): clients may send firstName+lastName
  // instead of a combined name — reassigned below. Previously `const`,
  // which threw "Assignment to constant variable" (500) for split-name
  // signups.
  const { email, phone, password, university, level, hall } = req.body;
  let { fullName } = req.body;

  if (!fullName && req.body.firstName && req.body.lastName) {
    fullName = req.body.firstName + ' ' + req.body.lastName;
  }

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    throw new ApiError(400, 'Full name is required (at least 2 characters)');
  }

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'A valid email is required');
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters');
  }

  // Anchored regex — must contain upper, lower, digit, special, and only
  // those characters. Matches the reset-password regex exactly so the two
  // paths enforce identical rules.
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
    throw new ApiError(400, 'Password must contain uppercase, lowercase, number, and special character');
  }

  if (!university || typeof university !== 'string') {
    throw new ApiError(400, 'University is required');
  }
  // Validate against the active universities list. Reject placeholders
  // like 'Not Set' and ids whose active flag is false in data/config.json.
  if (!universities.isActiveId(university)) {
    throw new ApiError(400, 'University is not currently available. Please pick an active university.');
  }

  if (!phone || typeof phone !== 'string' || !/^[\d\s+\-()]{7,15}$/.test(phone)) {
    throw new ApiError(400, 'A valid phone number is required');
  }

  const existingUser = await db('users').findOne({ email });
  if (existingUser) {
    throw new ApiError(400, 'Email already registered');
  }

  const existingPhone = await db('users').findOne({ phone });
  if (existingPhone) {
    throw new ApiError(400, 'This phone number is already registered');
  }

  // Consent gate (spec 2026-08-23): server-side enforcement — the checkbox
  // alone is UX. Rejected BEFORE any user record exists.
  if (req.body.acceptedTerms !== true) {
    throw new ApiError(400, 'You must accept the Terms of Service and Privacy Policy to create an account');
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await db('users').create({
    fullName,
    email,
    phone,
    password: hashedPassword,
    university,
    level,
    hall,
    role: process.env.NODE_ENV === 'test' && req.body.role === 'admin' ? 'admin' : 'buyer',
    isVerified: 0,
  });

  const mappedUser = mapUserRow(user);

  const token = generateToken(mappedUser.id);

  await logActivity('signup', mappedUser, { email: mappedUser.email, university: mappedUser.university }, 'info', req);

  await recordConsent(mappedUser.id, 'email_signup', req.ip);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: {
      user: getPublicProfile(mappedUser),
      token,
    },
  });
});

/**
 * @desc Get the list of active universities for the picker.
 * Public so the registration page can render options without a session.
 * @route GET /api/auth/universities
 * @access Public
 */
exports.listUniversities = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      universities: universities.loadActive(),
    },
  });
});

/**
 * @desc Set the current user's university (post-signup onboarding,
 * or to change an existing one). Validates against the active list.
 * @route POST /api/auth/me/university
 * @access Authenticated
 */
exports.setMyUniversity = asyncHandler(async (req, res) => {
  const { university } = req.body;
  if (!university || typeof university !== 'string') {
    throw new ApiError(400, 'University is required');
  }
  if (!universities.isActiveId(university)) {
    throw new ApiError(400, 'University is not currently available.');
  }
  const userId = req.user.id;
  const updated = await db('users').updateById(userId, {
    university,
    needsUniversityPick: 0,
  });
  const mapped = mapUserRow(updated);
  res.json({
    success: true,
    message: 'University updated',
    data: getPublicProfile(mapped),
  });
});

/**
 * @desc Login user
 * @route POST /api/auth/login
 * @access Public
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Please provide email and password');
  }

  const user = await db('users').findOne({ email });

  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const mappedUser = mapUserRow(user);

  if (!mappedUser.isActive) {
    throw new ApiError(401, 'Account is deactivated');
  }

  if (mappedUser.isSuspended) {
    throw new ApiError(
      403,
      mappedUser.banReason
        ? `Account suspended: ${mappedUser.banReason}`
        : 'Your account has been suspended. Contact support for more information.',
    );
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // MFA gate: privileged roles must complete an emailed one-time code
  // before a session token is issued. Buyers log in directly, unchanged.
  //
  // NO-MAILTRANSPORT BYPASS (2026-08-22): email OTP cannot be delivered
  // without a configured mail transport — requiring it would lock admins
  // out of the panel entirely (sendEmail skips silently, so the code
  // prompt becomes a dead end). In that exact case login proceeds
  // directly, with a loud warning on every use.
  // - test env keeps MFA ON regardless of mail config (suites assert
  //   the challenge flow)
  // - configuring EMAIL_* re-enables MFA automatically, no code change
  // TODO: security review — replace email OTP for privileged accounts with
  // TOTP (authenticator app) so no mailbox is needed at all.
  if (['admin', 'moderator'].includes(mappedUser.role)) {
    const mfaBypassed = process.env.NODE_ENV !== 'test' && !isEmailConfigured();
    if (mfaBypassed) {
      console.warn(
        `[SECURITY] MFA bypassed for "${mappedUser.email}" — no mail transport configured. ` +
        'Configure EMAIL_* to enforce email verification for privileged logins.',
      );
      await logActivity('login', mappedUser, { email: mappedUser.email, mfaBypassed: true }, 'warning', req);
    } else {
      const challenge = await mfa.createChallenge(user);
      await sendEmail(
        mappedUser.email,
        'JERTS CART admin login code',
        `<p>Your JERTS CART admin login code is:</p>
         <p style="font-size:28px;font-weight:700;letter-spacing:6px;">${challenge.devCode || '••••••'}</p>
         <p>This code expires in 5 minutes. If you did not attempt to log in, change your password immediately.</p>`,
      );
      return res.json({
        success: true,
        message: 'Verification code sent to your email',
        data: {
          mfaRequired: true,
          challengeId: challenge.id,
          ...(challenge.devCode ? { devCode: challenge.devCode } : {}),
        },
      });
    }
  }

  await db('users').updateById(user.id, { lastLogin: new Date().toISOString() });

  const token = generateToken(mappedUser.id);

  await logActivity('login', mappedUser, { email: mappedUser.email }, 'info', req);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: getPublicProfile(mappedUser),
      token,
    },
  });
});

/**
 * @desc Complete MFA for a privileged login
 * @route POST /api/auth/mfa/verify
 * @access Public (guarded by challengeId + code possession)
 */
exports.verifyMfa = asyncHandler(async (req, res) => {
  const { challengeId, code } = req.body;

  if (!challengeId || !code) {
    throw new ApiError(400, 'Challenge ID and code are required');
  }

  const challenge = await db('admin_mfa_challenges').rawGet(
    'SELECT * FROM admin_mfa_challenges WHERE id = ?',
    [challengeId],
  );
  if (!challenge) {
    throw new ApiError(404, 'Verification session not found — please log in again');
  }

  const result = await mfa.verifyChallenge(challengeId, challenge.userId, code);
  if (!result.ok) {
    const messages = {
      wrong_code: 'Invalid verification code',
      expired: 'Code expired — please log in again',
      already_used: 'Code already used — please log in again',
      too_many_attempts: 'Too many attempts — please log in again',
      invalid_format: 'Code must be 6 digits',
      not_found: 'Verification session not found — please log in again',
    };
    throw new ApiError(401, messages[result.reason] || 'Verification failed');
  }

  const user = await db('users').findById(challenge.userId);
  if (!user || !user.isActive || user.isSuspended) {
    throw new ApiError(403, 'Account is not permitted to log in');
  }
  const mappedUser = mapUserRow(user);

  await db('users').updateById(user.id, { lastLogin: new Date().toISOString() });
  const token = generateToken(mappedUser.id);
  await logActivity('login', mappedUser, { email: mappedUser.email, mfa: true }, 'info', req);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: getPublicProfile(mappedUser),
      token,
    },
  });
});

/**
 * @desc Get current user profile
 * @route GET /api/auth/me
 * @access Private
 */
exports.getMe = asyncHandler(async (req, res) => {
  const user = await db('users').findById(req.user.id);
  const mappedUser = mapUserRow(user);

  if (!user) {throw new ApiError(404, 'User not found');}

  res.json({
    success: true,
    data: getPublicProfile(mappedUser),
  });
});

/**
 * @desc Update user profile
 * @route PUT /api/auth/profile
 * @access Private
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phone, bio, hall, level } = req.body;

  const user = await db('users').findById(req.user.id);

  if (!user) {throw new ApiError(404, 'User not found');}

  const updates = {};
  if (fullName) {updates.fullName = fullName;}
  if (phone) {updates.phone = phone;}
  if (bio) {updates.bio = bio;}
  if (hall) {updates.hall = hall;}
  if (level) {updates.level = level;}

  const updatedUser = await db('users').updateById(user.id, updates);
  const mappedUser = mapUserRow(updatedUser);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: getPublicProfile(mappedUser),
  });
});

/**
 * @desc Change password
 * @route PUT /api/auth/change-password
 * @access Private
 */
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Please provide current and new password');
  }

  const user = await db('users').findById(req.user.id);

  const isMatch = await bcrypt.compare(currentPassword, user.password);

  if (!isMatch) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await db('users').updateById(user.id, {
    password: hashedPassword,
    passwordChangedAt: new Date().toISOString(),
  });

  const mappedUser = mapUserRow(user);
  await logActivity('password_change', mappedUser, { email: mappedUser.email }, 'warning', req);

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});

/**
 * @desc Request password reset (sends email with reset link)
 * @route POST /api/auth/forgot-password
 * @access Public
 */
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  const user = await db('users').findOne({ email });

  if (!user) {
    return res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  }

  const resetToken = generateResetToken(user.id);
  await db('users').updateById(user.id, {
    resetToken,
    resetTokenExpiry: Date.now() + 3600000,
  });

  if (process.env.NODE_ENV === 'production' || process.env.EMAIL_USER) {
    await sendPasswordResetEmail(user.email, resetToken);
  }

  res.json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.',
  });
});

/**
 * @desc Reset password using token
 * @route POST /api/auth/reset-password
 * @access Public
 */
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new ApiError(400, 'Token and new password are required');
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters with uppercase, lowercase, number, and special character');
  }

  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(newPassword)) {
    throw new ApiError(400, 'Password must contain uppercase, lowercase, number, and special character');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired reset token');
  }

  if (decoded.type !== 'reset') {
    throw new ApiError(401, 'Invalid token type');
  }

  const user = await db('users').findById(decoded.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.resetToken !== token) {
    throw new ApiError(401, 'Reset token has already been used or is invalid');
  }

  if (user.resetTokenExpiry && Date.now() > user.resetTokenExpiry) {
    throw new ApiError(401, 'Reset token has expired');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await db('users').updateById(user.id, {
    password: hashedPassword,
    passwordChangedAt: new Date().toISOString(),
    resetToken: null,
    resetTokenExpiry: null,
  });

  res.json({
    success: true,
    message: 'Password reset successfully. You can now log in with your new password.',
  });
});

/**
 * @desc Google OAuth token login (frontend sends access_token from GIS SDK)
 * @route POST /api/auth/google/token
 * @access Public
 *
 * Intent handling: the frontend passes `intent: 'signup' | 'login'` so we
 * can tell the user the truth on a duplicate email. Without intent, we
 * default to login (the historical OAuth behavior) but the frontend should
 * always pass one. 'signup' on an existing email is a 409 (we will NOT
 * link silently — that was an account-takeover vector). 'login' on a
 * missing email is a 404.
 */
exports.googleTokenLogin = asyncHandler(async (req, res) => {
  const { access_token, intent } = req.body;

  if (!access_token) {
    throw new ApiError(400, 'Google access token is required');
  }

  const fetch = (await import('node-fetch')).default;

  const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userinfoRes.ok) {
    throw new ApiError(401, 'Invalid Google access token');
  }

  const googleUser = await userinfoRes.json();

  const email = googleUser.email;
  const googleId = googleUser.sub;
  const fullName = googleUser.name || googleUser.given_name || 'Google User';
  const avatar = googleUser.picture || null;

  if (!email) {
    throw new ApiError(400, 'Google account has no email address');
  }

  let user = await db('users').findOne({ email });
  const normalizedIntent = intent === 'signup' || intent === 'login' ? intent : null;

  if (user && normalizedIntent === 'signup') {
    // Refuse to silently link — see comment above.
    throw new ApiError(
      409,
      'An account with this email already exists. Please sign in with your password or use "Sign in with Google" instead.'
    );
  }

  if (!user && normalizedIntent === 'login') {
    throw new ApiError(
      404,
      'No account found for this email. Please create an account first.'
    );
  }

  if (!user) {
    const hashedPassword = await bcrypt.hash(Math.random().toString(36).slice(2) + '!Aa1', 12);

    // Phone format for Google users is synthetic (no real number captured
    // by the OAuth flow). Use a stable, schema-compliant placeholder so
    // the NOT NULL column is satisfied without confusing the phone-
    // uniqueness check on subsequent normal signups.
    const syntheticPhone = `gg-${googleId}`;

    user = await db('users').create({
      fullName,
      email,
      phone: syntheticPhone,
      password: hashedPassword,
      // No university chosen yet. The user will be routed to
      // /#/onboarding after this response so they can pick one.
      university: '',
      needsUniversityPick: 1,
      role: 'buyer',
      isVerified: googleUser.email_verified ? 1 : 0,
      avatar,
      googleId,
    });

    await logActivity('signup', mapUserRow(user), { email, method: 'google', phone: syntheticPhone }, 'info', req);

    await recordConsent(user.id, 'google', req.ip);
  } else {
    const mapped = mapUserRow(user);
    if (mapped.isSuspended) {
      throw new ApiError(403, mapped.banReason || 'Account suspended');
    }
    if (!mapped.isActive) {
      throw new ApiError(401, 'Account is deactivated');
    }

    if (!user.googleId) {
      // Linking an existing email-password account to a Google identity.
      // Only reached when intent='login' (or legacy callers without
      // intent). For high-trust apps you'd gate this behind a confirmation
      // email; the prior account-takeover risk on a silent link is
      // reduced by the per-intent branch above.
      await db('users').updateById(user.id, { googleId });
    }

    await db('users').updateById(user.id, { lastLogin: new Date().toISOString() });
  }

  const mappedUser = mapUserRow(user);
  const token = generateToken(mappedUser.id);

  await logActivity('login', mappedUser, { email, method: 'google' }, 'info', req);

  res.json({
    success: true,
    message: 'Google login successful',
    user: getPublicProfile(mappedUser),
    token,
  });
});

/**
 * @desc Google OAuth redirect login (Passport-based, for redirect flow)
 * @route GET /api/auth/google
 * @access Public
 */
exports.googleRedirect = (req, res) => {
  const mappedUser = mapUserRow(req.user);
  const token = generateToken(mappedUser.id);
  const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:8000';
  res.redirect(`${frontendUrl}/#/browse?google_token=${token}&google_user=${encodeURIComponent(JSON.stringify(getPublicProfile(mappedUser)))}`);
};
