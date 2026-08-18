const { db } = require('../utils/db');
const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { Resend } = require('resend');
const crypto = require('crypto');

let resend = null;
try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
} catch (err) {
  console.warn('Resend not initialized:', err.message);
}
const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || 'onboarding@resend.dev';
const FRONTEND_URL = process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'http://localhost:8000';

function generateVerificationToken () {
  return crypto.randomBytes(32).toString('hex');
}

async function sendVerificationEmail (email, token) {
  const verifyUrl = `${FRONTEND_URL}/#newsletter/confirm?token=${token}`;

  if (!resend) {
    console.info('[Newsletter] Resend not configured, skipping verification email');
    return;
  }
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Confirm your Uni-Hub newsletter subscription',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Uni-Hub! 🎓</h1>
          </div>
          <div style="background: #f9fafb; padding: 40px 20px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-bottom: 24px;">Thanks for subscribing to our newsletter! Please confirm your email address to start receiving updates.</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${verifyUrl}" style="display: inline-block; background: #667eea; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Confirm Subscription</a>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">Or copy this link:<br><a href="${verifyUrl}" style="color: #667eea; word-break: break-all;">${verifyUrl}</a></p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="font-size: 12px; color: #9ca3af;">If you didn't subscribe, you can safely ignore this email.</p>
          </div>
        </body>
      </html>
    `,
  });
}

async function sendWelcomeEmail (email) {
  if (!resend) {
    console.info('[Newsletter] Resend not configured, skipping welcome email');
    return;
  }
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'You\'re confirmed! 🎉 Welcome to Uni-Hub',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">You're In! 🎉</h1>
          </div>
          <div style="background: #f9fafb; padding: 40px 20px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-bottom: 24px;">Your subscription is confirmed. You'll now receive the best deals, selling tips, and campus marketplace updates.</p>
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #065f46;">Your welcome code:</p>
              <p style="margin: 0; font-size: 24px; font-weight: 700; color: #047857; letter-spacing: 2px;">WELCOME10</p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #065f46;">10% off your first purchase</p>
            </div>
            <p style="font-size: 14px; color: #6b7280;">Happy shopping (and selling)!<br>The Uni-Hub Team</p>
          </div>
        </body>
      </html>
    `,
  });
}

/**
 * @desc Subscribe to newsletter
 * @route POST /api/newsletter/subscribe
 * @access Public
 */
exports.subscribe = asyncHandler(async (req, res) => {
  const { email, source } = req.body;

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'A valid email is required');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedSource = source || 'unknown';

  const existing = await db('newsletter_subscribers').findOne({ email: normalizedEmail });

  if (existing) {
    if (existing.status === 'active') {
      return res.json({
        success: true,
        message: 'You\'re already subscribed!',
        data: { status: 'already_subscribed' },
      });
    }
    if (existing.status === 'pending') {
      return res.json({
        success: true,
        message: 'Confirmation email already sent. Please check your inbox.',
        data: { status: 'pending_confirmation' },
      });
    }
    if (existing.status === 'unsubscribed') {
      await db('newsletter_subscribers').updateById(existing.id, {
        status: 'pending',
        source: normalizedSource,
        verificationToken: generateVerificationToken(),
        updatedAt: new Date().toISOString(),
      });
      await sendVerificationEmail(normalizedEmail, existing.verificationToken);
      return res.json({
        success: true,
        message: 'Re-subscription initiated. Please check your email to confirm.',
        data: { status: 'resubscribed' },
      });
    }
  }

  const verificationToken = generateVerificationToken();
  const id = crypto.randomUUID();

  await db('newsletter_subscribers').create({
    id,
    email: normalizedEmail,
    source: normalizedSource,
    status: 'pending',
    verificationToken,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await sendVerificationEmail(normalizedEmail, verificationToken);

  res.status(201).json({
    success: true,
    message: 'Confirmation email sent! Please check your inbox to complete subscription.',
    data: { status: 'confirmation_sent' },
  });
});

/**
 * @desc Confirm newsletter subscription
 * @route GET /api/newsletter/confirm
 * @access Public
 */
exports.confirm = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    throw new ApiError(400, 'Verification token is required');
  }

  const subscriber = await db('newsletter_subscribers').findOne({ verificationToken: token });

  if (!subscriber) {
    throw new ApiError(404, 'Invalid or expired verification link');
  }

  if (subscriber.status === 'active') {
    return res.redirect(`${FRONTEND_URL}/#newsletter/confirmed?status=already_active`);
  }

  await db('newsletter_subscribers').updateById(subscriber.id, {
    status: 'active',
    verificationToken: null,
    verifiedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await sendWelcomeEmail(subscriber.email);

  res.redirect(`${FRONTEND_URL}/#newsletter/confirmed?status=success`);
});

/**
 * @desc Unsubscribe from newsletter
 * @route POST /api/newsletter/unsubscribe
 * @access Public
 */
exports.unsubscribe = asyncHandler(async (req, res) => {
  const { email, token } = req.body;

  if (!email || !token) {
    throw new ApiError(400, 'Email and verification token are required');
  }

  const subscriber = await db('newsletter_subscribers').findOne({
    email: email.toLowerCase().trim(),
    verificationToken: token,
  });

  if (!subscriber) {
    throw new ApiError(404, 'Invalid unsubscribe request');
  }

  await db('newsletter_subscribers').updateById(subscriber.id, {
    status: 'unsubscribed',
    verificationToken: null,
    updatedAt: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'You have been unsubscribed successfully.',
  });
});

/**
 * @desc Get newsletter stats (admin)
 * @route GET /api/newsletter/stats
 * @access Private (Admin)
 */
exports.getStats = asyncHandler(async (req, res) => {
  const total = await db('newsletter_subscribers').count();
  const active = await db('newsletter_subscribers').count({ status: 'active' });
  const pending = await db('newsletter_subscribers').count({ status: 'pending' });
  const unsubscribed = await db('newsletter_subscribers').count({ status: 'unsubscribed' });
  const bounced = await db('newsletter_subscribers').count({ status: 'bounced' });

  const bySource = await db('newsletter_subscribers').groupBy('source').count();

  res.json({
    success: true,
    data: {
      total,
      active,
      pending,
      unsubscribed,
      bounced,
      bySource,
    },
  });
});

/**
 * @desc Send campaign to all active subscribers (admin)
 * @route POST /api/newsletter/campaign
 * @access Private (Admin)
 */
exports.sendCampaign = asyncHandler(async (req, res) => {
  const { subject, htmlContent, testEmail } = req.body;

  if (!subject || !htmlContent) {
    throw new ApiError(400, 'Subject and HTML content are required');
  }

  if (!resend) {
    throw new ApiError(503, 'Email service not configured. Please set RESEND_API_KEY.');
  }

  if (testEmail) {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: testEmail,
      subject: `[TEST] ${subject}`,
      html: htmlContent,
    });
    return res.json({ success: true, message: 'Test email sent', data: { testEmail } });
  }

  const subscribers = await db('newsletter_subscribers').findAll({ status: 'active' });
  const emails = subscribers.map(s => s.email);

  if (emails.length === 0) {
    return res.json({ success: true, message: 'No active subscribers', data: { sent: 0 } });
  }

  const BATCH_SIZE = 50;
  let sent = 0;
  const errors = [];

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);
    try {
      const _result = await resend.emails.send({
        from: FROM_EMAIL,
        to: batch,
        subject,
        html: htmlContent,
      });
      sent += batch.length;
    } catch (err) {
      errors.push({ batch: i / BATCH_SIZE + 1, error: err.message });
    }
  }

  const campaignId = crypto.randomUUID();
  await db('email_campaigns').create({
    id: campaignId,
    subject,
    htmlContent,
    sentAt: new Date().toISOString(),
    recipientCount: sent,
    resendId: null,
    createdAt: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: `Campaign sent to ${sent} subscribers`,
    data: { sent, errors, campaignId },
  });
});

/**
 * @desc Get campaign history (admin)
 * @route GET /api/newsletter/campaigns
 * @access Private (Admin)
 */
exports.getCampaigns = asyncHandler(async (req, res) => {
  const campaigns = await db('email_campaigns').findAll();
  res.json({ success: true, data: campaigns.reverse() });
});
