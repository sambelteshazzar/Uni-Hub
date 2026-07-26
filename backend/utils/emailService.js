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
      from: `"JERTS CART" <${process.env.EMAIL_USER}>`,
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
      <h2 style="color: #0046be;">JERTS CART Password Reset</h2>
      <p>You requested a password reset for your JERTS CART account.</p>
      <p>Click the button below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #0046be; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
        Reset Password
      </a>
      <p>If you did not request this, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #6b7280; font-size: 13px;">JERTS CART — Student Marketplace for Ghanaian Universities</p>
    </div>
  `;

  return sendEmail(email, 'JERTS CART — Reset Your Password', html);
}

async function sendVerificationEmail (email, verificationCode, universityName) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0046be;">JERTS CART Student Verification</h2>
      <p>Verify your student status at <strong>${universityName}</strong>.</p>
      <p>Your verification code is:</p>
      <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 28px; letter-spacing: 4px; font-weight: bold; border-radius: 8px; margin: 16px 0;">
        ${verificationCode}
      </div>
      <p>Enter this code in the JERTS CART app to complete verification. This code expires in 24 hours.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #6b7280; font-size: 13px;">JERTS CART — Student Marketplace for Ghanaian Universities</p>
    </div>
  `;

  return sendEmail(email, 'JERTS CART — Verify Your Student Account', html);
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
  <p>You can track your order status in the JERTS CART app.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="color: #6b7280; font-size: 13px;">JERTS CART — Student Marketplace for Ghanaian Universities</p>
  </div>
  `;
  return sendEmail(email, `JERTS CART — Order #${order.orderNumber || order._id} Confirmed`, html);
}

async function sendOrderStatusEmail (email, order) {
  const statusLabels = {
    confirmed: 'Confirmed',
    'in-transit': 'In Transit',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  const statusLabel = statusLabels[order.status] || order.status;
  const statusColors = {
    confirmed: '#10b981',
    'in-transit': '#f59e0b',
    delivered: '#10b981',
    cancelled: '#ef4444',
  };
  const color = statusColors[order.status] || '#0046be';
  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: ${color};">Order ${statusLabel}</h2>
  <p>Your order <strong>#${order.orderNumber || order._id}</strong> status has been updated.</p>
  <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid ${color};">
  <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${color};">${statusLabel}</p>
  <p style="margin: 8px 0 0;">Total: GHS ${order.pricing?.grandTotal || order.totalAmount || 'N/A'}</p>
  </div>
  <p>Check the JERTS CART app for full details and tracking information.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="color: #6b7280; font-size: 13px;">JERTS CART — Student Marketplace for Ghanaian Universities</p>
  </div>
  `;
  return sendEmail(email, `JERTS CART — Order #${order.orderNumber || order._id} ${statusLabel}`, html);
}

async function sendPaymentVerifiedEmail (email, payment) {
  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #10b981;">Payment Verified</h2>
  <p>Your payment of <strong>GHS ${payment.amount}</strong> has been verified.</p>
  <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #10b981;">
  <p><strong>Amount:</strong> GHS ${payment.amount}</p>
  <p><strong>Mode:</strong> ${payment.mode || 'N/A'}</p>
  <p><strong>Transaction ID:</strong> ${payment.transactionId || 'N/A'}</p>
  </div>
  <p>Your order will be processed shortly. Track it in the JERTS CART app.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="color: #6b7280; font-size: 13px;">JERTS CART — Student Marketplace for Ghanaian Universities</p>
  </div>
  `;
  return sendEmail(email, 'JERTS CART — Payment Verified', html);
}

async function sendDeliveryStatusEmail (email, delivery) {
  const statusLabels = {
    pending: 'Pending',
    processing: 'Processing',
    'picked-up': 'Picked Up',
    'in-transit': 'In Transit',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    failed: 'Failed',
  };
  const statusLabel = statusLabels[delivery.status] || delivery.status;
  const statusColors = {
    pending: '#6b7280',
    processing: '#f59e0b',
    'picked-up': '#3b82f6',
    'in-transit': '#f59e0b',
    delivered: '#10b981',
    cancelled: '#ef4444',
    failed: '#ef4444',
  };
  const color = statusColors[delivery.status] || '#0046be';
  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: ${color};">Delivery ${statusLabel}</h2>
  <p>Your delivery <strong>#${delivery.deliveryNumber || delivery._id}</strong> has been updated.</p>
  <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid ${color};">
  <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${color};">${statusLabel}</p>
  <p style="margin: 8px 0 0;">Mode: ${delivery.mode || 'N/A'}</p>
  ${delivery.address ? `<p style="margin: 4px 0 0;">Address: ${delivery.address}</p>` : ''}
  </div>
  ${delivery.status === 'delivered' ? '<p style="color: #10b981; font-weight: bold;">Your order has been delivered! Enjoy your purchase.</p>' : ''}
  ${delivery.status === 'in-transit' ? '<p>Your order is on its way! Track it in the JERTS CART app.</p>' : ''}
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="color: #6b7280; font-size: 13px;">JERTS CART — Student Marketplace for Ghanaian Universities</p>
  </div>
  `;
  return sendEmail(email, `JERTS CART — Delivery ${statusLabel}`, html);
}

async function sendNewOrderEmail (email, order) {
  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #0046be;">You Have a New Order!</h2>
  <p>Someone just purchased your product on JERTS CART.</p>
  <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
  <p><strong>Order #:</strong> ${order.orderNumber || order._id}</p>
  <p><strong>Customer:</strong> ${order.customer_name || 'N/A'}</p>
  <p><strong>Total:</strong> GHS ${order.pricing?.grandTotal || order.totalAmount || 'N/A'}</p>
  <p><strong>Delivery Mode:</strong> ${order.delivery?.mode || order.deliveryMode || 'N/A'}</p>
  </div>
  <p>Please check the JERTS CART app to confirm and process this order.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="color: #6b7280; font-size: 13px;">JERTS CART — Student Marketplace for Ghanaian Universities</p>
  </div>
  `;
  return sendEmail(email, `JERTS CART — New Order #${order.orderNumber || order._id}`, html);
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendPaymentVerifiedEmail,
  sendDeliveryStatusEmail,
  sendNewOrderEmail,
};
