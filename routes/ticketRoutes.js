import express from 'express';
import Ticket from '../models/Ticket.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendTicketNotification, sendTicketReplyNotification } from '../utils/emailService.js';

const router = express.Router();

// Create ticket (Contact form)
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message, userId } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const ticket = new Ticket({
      user: userId || null,
      name,
      email,
      subject,
      message,
      priority: 'medium'
    });

    const savedTicket = await ticket.save();

    // Send confirmation email
    try {
      await sendTicketNotification(email, name, subject);
    } catch (emailError) {
      console.log('Failed to send email, but ticket was created:', emailError);
    }

    res.status(201).json(savedTicket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all tickets (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const tickets = await Ticket.find({}).populate('user', 'name email').sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's tickets
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.params.userId }).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single ticket
router.get('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reply to ticket (admin only)
router.put('/:id/reply', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { message, reply, status } = req.body;
    const replyText = message || reply; // Accept both 'message' and 'reply' fields

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      {
        adminReply: replyText,
        adminRepliedAt: new Date(),
        status: status || 'in-progress'
      },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Send reply email
    try {
      await sendTicketReplyNotification(ticket.email, ticket.name, replyText);
    } catch (emailError) {
      console.log('Failed to send reply email:', emailError);
    }

    res.json(ticket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update ticket status
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status, priority } = req.body;
    const validStatuses = ['open', 'in-progress', 'resolved', 'closed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { status, priority },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
