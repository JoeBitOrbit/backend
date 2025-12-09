import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// In-memory theme storage (would be in MongoDB in production)
let themes = {
  default: {
    name: 'Default',
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
    accentColor: '#3b82f6',
    enableSnow: false,
    enableParticles: false,
    backgroundImage: '',
    description: 'Default theme'
  }
};

// Get all themes
router.get('/', async (req, res) => {
  try {
    res.json(themes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single theme
router.get('/:id', async (req, res) => {
  try {
    const theme = themes[req.params.id];
    if (!theme) {
      return res.status(404).json({ message: 'Theme not found' });
    }
    res.json(theme);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create/Update theme (admin only)
router.post('/', [authenticateToken, authorizeRole(['admin'])], async (req, res) => {
  try {
    const { id, name, primaryColor, secondaryColor, accentColor, enableSnow, enableParticles, backgroundImage, description } = req.body;

    if (!id || !name) {
      return res.status(400).json({ message: 'Theme ID and name are required' });
    }

    themes[id] = {
      name,
      primaryColor: primaryColor || '#dc2626',
      secondaryColor: secondaryColor || '#ffffff',
      accentColor: accentColor || '#3b82f6',
      enableSnow: enableSnow || false,
      enableParticles: enableParticles || false,
      backgroundImage: backgroundImage || '',
      description: description || `${name} themed store`,
      updatedAt: new Date()
    };

    res.status(201).json({
      message: 'Theme saved successfully',
      theme: themes[id]
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete theme (admin only)
router.delete('/:id', [authenticateToken, authorizeRole(['admin'])], async (req, res) => {
  try {
    if (req.params.id === 'default') {
      return res.status(400).json({ message: 'Cannot delete default theme' });
    }

    if (!themes[req.params.id]) {
      return res.status(404).json({ message: 'Theme not found' });
    }

    delete themes[req.params.id];
    res.json({ message: 'Theme deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Set active theme (admin only)
router.post('/:id/activate', [authenticateToken, authorizeRole(['admin'])], async (req, res) => {
  try {
    if (!themes[req.params.id]) {
      return res.status(404).json({ message: 'Theme not found' });
    }

    // In production, this would update a database
    res.json({
      message: `Theme ${req.params.id} activated`,
      theme: themes[req.params.id]
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
