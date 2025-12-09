import express from 'express';
import ChristmasMode from '../models/ChristmasMode.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Initialize Christmas Mode collection if it doesn't exist
async function getOrCreateChristmasMode() {
  let mode = await ChristmasMode.findOne();
  if (!mode) {
    mode = new ChristmasMode({
      enabled: false,
      discount: 25,
      snowflakesEnabled: true
    });
    await mode.save();
  }
  return mode;
}

// @route   GET /api/christmas/status
// @desc    Get current Christmas mode status (public)
// @access  Public
router.get('/status', async (req, res) => {
  try {
    const mode = await getOrCreateChristmasMode();
    res.json({
      enabled: mode.enabled,
      discount: mode.discount,
      snowflakesEnabled: mode.snowflakesEnabled,
      updatedAt: mode.updatedAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/christmas/toggle
// @desc    Toggle Christmas mode ON/OFF
// @access  Admin only
router.post('/toggle', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { enabled, discount, snowflakesEnabled } = req.body;

    let mode = await ChristmasMode.findOne();
    if (!mode) {
      mode = new ChristmasMode();
    }

    if (enabled !== undefined) mode.enabled = enabled;
    if (discount !== undefined) mode.discount = discount;
    if (snowflakesEnabled !== undefined) mode.snowflakesEnabled = snowflakesEnabled;
    
    mode.updatedBy = req.user.email || req.user.id;
    mode.updatedAt = new Date();

    await mode.save();

    res.json({
      message: 'Christmas mode updated',
      mode: {
        enabled: mode.enabled,
        discount: mode.discount,
        snowflakesEnabled: mode.snowflakesEnabled,
        updatedAt: mode.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/christmas/discount
// @desc    Update Christmas discount percentage
// @access  Admin only
router.put('/discount', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { discount } = req.body;

    if (discount === undefined || discount < 0 || discount > 100) {
      return res.status(400).json({ message: 'Discount must be between 0 and 100' });
    }

    let mode = await ChristmasMode.findOne();
    if (!mode) {
      mode = new ChristmasMode();
    }

    mode.discount = discount;
    mode.updatedBy = req.user.email || req.user.id;
    mode.updatedAt = new Date();

    await mode.save();

    res.json({
      message: 'Discount updated',
      discount: mode.discount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
