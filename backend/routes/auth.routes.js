const express = require('express');
const router = express.Router();
const passport = require('passport');
const { protect } = require('../middleware/auth.middleware');
const {
  register,
  login,
  verifyMfa,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  googleTokenLogin,
  googleRedirect,
  listUniversities,
  setMyUniversity,
} = require('../controllers/auth.controller');

// Google OAuth strategy — only register when env vars are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const GoogleStrategy = require('passport-google-oauth20').Strategy;

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback',
    passReqToCallback: true,
  }, async (req, accessToken, refreshToken, profile, done) => {
    try {
      const { db, mapUserRow } = require('../utils/db');
      const bcrypt = require('bcryptjs');
      const email = profile.emails?.[0]?.value;
      const googleId = profile.id;
      const fullName = profile.displayName || 'Google User';
      const avatar = profile.photos?.[0]?.value || null;

      if (!email) {return done(new Error('Google account has no email'), null);}

      let user = await db('users').findOne({ email });

      if (!user) {
        const hashedPassword = await bcrypt.hash(Math.random().toString(36).slice(2) + '!Aa1', 12);
        user = await db('users').create({
          fullName,
          email,
          phone: `google_${googleId}`,
          password: hashedPassword,
          university: 'Not Set',
          role: 'buyer',
          isVerified: profile.emails[0].verified ? 1 : 0,
          avatar,
          googleId,
        });
      } else if (!user.googleId) {
        await db('users').updateById(user.id, { googleId });
      }

      return done(null, mapUserRow(user));
    } catch (err) {
      return done(err, null);
    }
  }));

  router.get('/google', passport.authenticate('google', { scope: ['openid', 'email', 'profile'] }));
  router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/#login', session: false }),
    googleRedirect,
  );
}

// Public routes
router.post('/register', register);
router.post('/login', login);
router.get('/universities', listUniversities);
// MFA completion — guarded by challengeId + emailed code possession.
router.post('/mfa/verify', verifyMfa);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Google OAuth — token-based (frontend GIS SDK sends access_token)
router.post('/google/token', googleTokenLogin);

// Protected routes
router.get('/me', protect, getMe);
router.post('/me/university', protect, setMyUniversity);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;
