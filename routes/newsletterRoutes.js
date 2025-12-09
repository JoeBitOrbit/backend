import express from 'express';
import User from '../models/User.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { sendEmail } from '../utils/emailService.js';

const router = express.Router();

// Store for OTPs (in production, use database)
const otpStore = new Map();

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// @route   POST /api/newsletter/send-otp
// @desc    Send OTP to email for newsletter subscription
// @access  Public
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Generate and store OTP (valid for 10 minutes)
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    
    otpStore.set(email, { otp, expiresAt });

    // Send OTP via email
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Newsletter Subscription</h2>
        <p>Hi there,</p>
        <p>Thank you for subscribing to the Nikola Newsletter! Please use the OTP below to verify your email:</p>
        <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h1 style="color: #007bff; margin: 0; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p style="color: #666; font-size: 14px;">This OTP is valid for 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br/>Nikola Team</p>
      </div>
    `;

    await sendEmail(email, 'Nikola Newsletter - Verify Your Email', html);

    res.json({ message: 'OTP sent to email', email });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP: ' + error.message });
  }
});

// @route   POST /api/newsletter/verify
// @desc    Verify OTP and subscribe to newsletter
// @access  Public
router.post('/verify', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Check if OTP exists and is valid
    const storedOTP = otpStore.get(email);
    if (!storedOTP) {
      return res.status(400).json({ message: 'OTP expired or not found' });
    }

    if (storedOTP.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (Date.now() > storedOTP.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: 'OTP expired' });
    }

    // Update or create user subscription
    let user = await User.findOne({ email });
    
    if (!user) {
      user = new User({
        name: email.split('@')[0],
        email,
        password: Math.random().toString(36),
        role: 'user',
        isNewsletterSubscribed: true
      });
    } else {
      user.isNewsletterSubscribed = true;
    }

    await user.save();
    otpStore.delete(email);

    res.json({ message: 'Successfully subscribed to newsletter', email });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/newsletter/subscribers
// @desc    Get all newsletter subscribers
// @access  Admin
router.get('/subscribers', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const subscribers = await User.find(
      { isNewsletterSubscribed: true },
      'email name'
    );

    res.json({
      count: subscribers.length,
      subscribers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/newsletter/promos
// @desc    Create a promo
// @access  Admin
router.post('/promos', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { title, description, discountCode, discountPercent, validTill } = req.body;

    if (!title || !discountCode) {
      return res.status(400).json({ message: 'Title and discount code are required' });
    }

    // TODO: Store promos in database
    const promo = {
      id: Date.now().toString(),
      title,
      description,
      discountCode,
      discountPercent: discountPercent || 0,
      validTill,
      createdAt: new Date()
    };

    res.status(201).json({ message: 'Promo created', promo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/newsletter/promos
// @desc    Get all promos
// @access  Public
router.get('/promos', async (req, res) => {
  try {
    // TODO: Fetch from database
    const promos = [];
    res.json(promos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/newsletter/broadcast
// @desc    Send broadcast to all subscribers
// @access  Admin
router.post('/broadcast', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { subject, message, type } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' });
    }

    // Get all subscribers
    const subscribers = await User.find(
      { isNewsletterSubscribed: true },
      'email'
    );

    // Send emails to all subscribers
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${subject}</h2>
        <div style="line-height: 1.6; color: #555;">
          ${message}
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">© Nikola Fashion. All rights reserved.</p>
      </div>
    `;

    let sentCount = 0;
    const errors = [];

    for (const subscriber of subscribers) {
      try {
        await sendEmail(subscriber.email, subject, html);
        sentCount++;
      } catch (error) {
        errors.push({ email: subscriber.email, error: error.message });
      }
    }

    res.json({
      message: 'Broadcast sent',
      recipientCount: subscribers.length,
      sentCount,
      failedCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      subject,
      type: type || 'general'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
