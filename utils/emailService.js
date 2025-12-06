import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter error:', error);
  } else {
    console.log('Email transporter ready');
  }
});

export const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Nikola" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: html.replace(/<[^>]*>/g, '') // Strip HTML tags for text version
    });
    console.log(`Email sent successfully to ${to}. Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export const sendTicketNotification = async (email, name, subject) => {
  const html = `
    <h2>We received your message!</h2>
    <p>Hi ${name},</p>
    <p>Thank you for contacting Nikola. We've received your inquiry about: <strong>${subject}</strong></p>
    <p>Our team will respond to you shortly.</p>
    <p>Best regards,<br/>Nikola Team</p>
  `;
  await sendEmail(email, 'We received your message - Nikola Support', html);
};

export const sendTicketReplyNotification = async (email, name, reply) => {
  const html = `
    <h2>New Reply to Your Support Ticket</h2>
    <p>Hi ${name},</p>
    <p>Our support team has replied to your inquiry:</p>
    <div style="border-left: 4px solid #ff0000; padding: 10px; margin: 10px 0;">
      <p>${reply}</p>
    </div>
    <p>Best regards,<br/>Nikola Team</p>
  `;
  await sendEmail(email, 'Your Nikola Support Ticket - New Reply', html);
};
