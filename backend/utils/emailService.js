const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter () {
  if (transporter) {
    return transporter;
  }

  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS ||
      process.env.EMAIL_USER === 'your-email@gmail.com') {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: parseInt(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter;
}

async function sendEmail (to, subject, html) {
  const mailTransporter = getTransporter();

  if (!mailTransporter) {
    console.warn('Email not configured — skipping send. Configure EMAIL_HOST, EMAIL_USER, EMAIL_PASS in .env');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const info = await mailTransporter.sendMail({
      from: `"Uni-Hub" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error.message);
    return { success: false, error: error.message };
  }
}

async function sendPasswordResetEmail (email, resetToken) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8000';
  const resetUrl = `${frontendUrl}#/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0046be;">Uni-Hub Password Reset</h2>
      <p>You requested a password reset for your Uni-Hub account.</p>
      <p>Click the button below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #0046be; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
        Reset Password
      </a>
      <p>If you did not request this, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #6b7280; font-size: 13px;">Uni-Hub — Student Marketplace for Ghanaian Universities</p>
    </div>
  `;

  return sendEmail(email, 'Uni-Hub — Reset Your Password', html);
}

async function sendVerificationEmail (email, verificationCode, universityName) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0046be;">Uni-Hub Student Verification</h2>
      <p>Verify your student status at <strong>${universityName}</strong>.</p>
      <p>Your verification code is:</p>
      <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 28px; letter-spacing: 4px; font-weight: bold; border-radius: 8px; margin: 16px 0;">
        ${verificationCode}
      </div>
      <p>Enter this code in the Uni-Hub app to complete verification. This code expires in 24 hours.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #6b7280; font-size: 13px;">Uni-Hub — Student Marketplace for Ghanaian Universities</p>
    </div>
  `;

  return sendEmail(email, 'Uni-Hub — Verify Your Student Account', html);
}

async function sendOrderConfirmationEmail (email, order) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0046be;">Order Confirmed!</h2>
      <p>Your order <strong>#${order.orderNumber || order._id}</strong> has been placed successfully.</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Total:</strong> GHS ${order.pricing?.grandTotal || order.totalAmount}</p>
        <p><strong>Delivery:</strong> ${order.delivery?.mode || order.deliveryMode || 'N/A'}</p>
        <p><strong>Payment:</strong> ${order.payment?.mode || order.paymentMode || 'N/A'}</p>
      </div>
      <p>You can track your order status in the Uni-Hub app.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #6b7280; font-size: 13px;">Uni-Hub — Student Marketplace for Ghanaian Universities</p>
    </div>
  `;

  return sendEmail(email, `Uni-Hub — Order #${order.orderNumber || order._id} Confirmed`, html);
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendOrderConfirmationEmail,
};
