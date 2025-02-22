const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { User } = require('../models/User');
const { List } = require('../models/List');

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findOne({
      where: { id: req.user.userId },
      include: [
        { model: List, as: 'ownedLists' },
        { model: List, as: 'upvotedLists' }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Link Telegram account
router.post('/link-telegram', auth, async (req, res) => {
  try {
    const { telegramId } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { telegramId },
      { new: true }
    );
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 