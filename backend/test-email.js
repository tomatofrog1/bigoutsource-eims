import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

async function testEmail() {
  console.log('--- SMTP Connection Test ---');
  console.log('Host:', process.env.SMTP_HOST);
  console.log('Port:', process.env.SMTP_PORT);
  console.log('User:', process.env.SMTP_USER);

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('ERROR: SMTP_USER or SMTP_PASS is empty in .env');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false, 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      ciphers: 'SSLv3', 
      rejectUnauthorized: false
    }
  });

  try {
    console.log('\n[1/2] Verifying connection to Microsoft...');
    await transporter.verify();
    console.log('SUCCESS! Server accepted the credentials.');

    console.log(`\n[2/2] Sending test email to ${process.env.SMTP_USER}...`);
    const info = await transporter.sendMail({
      from: `"Test Server" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      subject: 'Test Email from Node.js',
      text: 'If you are reading this, the Outlook SMTP configuration is working perfectly!',
    });

    console.log('SUCCESS! Test email sent! Message ID:', info.messageId);
  } catch (error) {
    console.error('\nFAILED! Error details:');
    console.error(error.message);
  }
}

testEmail();
