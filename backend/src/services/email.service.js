import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

// Setup transporter to use environment variables dynamically
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mailpit',
  port: parseInt(process.env.SMTP_PORT || '1025', 10),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports (like 587)
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
  tls: {
    ciphers: 'SSLv3', // Often required by Office365
    rejectUnauthorized: false
  }
});

export const EmailService = {
  async sendMfaOtpEmail(toEmail, code) {
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_USER ? `"BigOutsource EIMS" <${process.env.SMTP_USER}>` : '"BigOutsource EIMS" <no-reply@bigoutsource.com>',
        to: toEmail,
        subject: 'Your MFA Verification Code',
        text: `Your MFA verification code is: ${code}\nThis code is valid for 5 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>MFA Verification</h2>
            <p>Your verification code is:</p>
            <h1 style="color: #4F46E5; letter-spacing: 2px;">${code}</h1>
            <p>This code is valid for 5 minutes.</p>
          </div>
        `,
      });
      console.log('MFA email sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('Failed to send MFA email:', error);
      throw new Error('Failed to send verification email');
    }
  },
};
