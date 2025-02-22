const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { List, Message } = require('../models/List');
const { User } = require('../models/User');
const { Op } = require('sequelize');
const { Mistral } = require('@mistralai/mistralai');
const crypto = require('crypto');

// Initialize Mistral client
const client = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY
});

// Get all public lists (For You page)
router.get('/public', async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    // Base query for public lists
    const where = { 
      isPublic: true,
      ...(search && {
        [Op.or]: [
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ]
      })
    };

    const lists = await List.findAndCountAll({
      where,
      include: [
        { 
          model: User, 
          as: 'owner',
          attributes: ['id', 'name', 'picture']
        }
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit
    });

    res.json({
      lists: lists.rows,
      totalPages: Math.ceil(lists.count / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching public lists:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's lists (for Dashboard)
router.get('/my-lists', auth, async (req, res) => {
  try {
    const lists = await List.findAll({
      where: { ownerId: req.user.userId },
      include: [
        { 
          model: User, 
          as: 'owner',
          attributes: ['id', 'name', 'picture']
        },
        {
          model: User,
          as: 'upvoters',
          attributes: ['id', 'name', 'picture'],
          through: { attributes: [] }
        }
      ]
    });

    const transformedLists = lists.map(list => ({
      ...list.toJSON(),
      items: list.items.map(item => ({
        ...item,
        isCompleted: (item.completedBy || []).includes(req.user.userId)
      }))
    }));

    res.json(transformedLists);
  } catch (error) {
    console.error('Error fetching user lists:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create list using Mistral
router.post('/generate', auth, async (req, res) => {
  try {
    const { prompt, title, isPublic = false } = req.body;

    console.log('Generate request:', {
      title,
      prompt,
      isPublic,
      userId: req.user.userId
    });

    if (!prompt || !title) {
      return res.status(400).json({ error: 'Title and prompt are required' });
    }

    // Generate content with Mistral
    let chatResponse;
    try {
      chatResponse = await client.chat.complete({
        model: 'mistral-tiny',
        messages: [{ 
          role: 'user', 
          content: `Create a detailed list for: ${prompt}.
          Important: Return ONLY the list items, one per line.
          - No numbers or bullets
          - No explanations before or after
          - No extra formatting
          Example format:
          First item
          Second item
          Third item`
        }]
      });
    } catch (mistralError) {
      console.error('Mistral API error:', mistralError);
      throw new Error(`Mistral API error: ${mistralError.message}`);
    }

    const text = chatResponse.choices[0].message.content;
    const items = text
      .split('\n')
      .filter(item => item.trim())
      .map(content => ({
        id: crypto.randomUUID(),
        content: content.trim(),
        isCompleted: false,
        completedBy: []
      }));

    // Create the list with the properly structured items
    const list = await List.create({
      title,
      description: prompt,
      items,
      isPublic,
      ownerId: req.user.userId
    });

    // Fetch the created list with all necessary associations
    const populatedList = await List.findByPk(list.id, {
      include: [
        { 
          model: User, 
          as: 'owner',
          attributes: ['id', 'name', 'picture']
        },
        {
          model: User,
          as: 'upvoters',
          attributes: ['id', 'name', 'picture'],
          through: { attributes: [] }
        },
        {
          model: Message,
          include: [
            { 
              model: User, 
              as: 'sender', 
              attributes: ['id', 'name', 'picture']
            }
          ]
        }
      ]
    });

    if (!populatedList) {
      throw new Error('Failed to fetch created list');
    }

    // Transform the list to include completion status
    const transformedList = {
      ...populatedList.toJSON(),
      items: populatedList.items.map(item => ({
        ...item,
        isCompleted: (item.completedBy || []).includes(req.user.userId)
      }))
    };

    console.log('Created list with ID:', populatedList.id);
    res.json(transformedList);

  } catch (error) {
    console.error('List generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate list',
      details: error.message 
    });
  }
});

// Update list
router.patch('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const list = await List.findOne({
      where: { id },
      include: [
        { model: User, as: 'owner' },
        { model: User, as: 'editors' }
      ]
    });

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    if (list.ownerId !== req.user.userId && 
        !list.editors.some(editor => editor.id === req.user.userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await list.update(req.body);
    await list.reload();
    res.json(list);
  } catch (error) {
    console.error('Error updating list:', error);
    res.status(500).json({ error: error.message });
  }
});

// Toggle list item
router.patch('/:id/toggle/:itemId', auth, async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const userId = req.user.userId;

    console.log('\n=== Toggle Item Request ===');
    console.log('List ID:', id);
    console.log('Item ID:', itemId);
    console.log('User ID:', userId);

    const list = await List.findByPk(id);
    if (!list) {
      console.log('List not found');
      return res.status(404).json({ error: 'List not found' });
    }

    // Ensure items is an array
    const currentItems = Array.isArray(list.items) ? list.items : [];
    
    // Find the item to toggle
    const itemIndex = currentItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Create new items array with toggled completion for this user
    const updatedItems = currentItems.map((item, index) => {
      if (index === itemIndex) {
        const completedBy = new Set(item.completedBy || []);
        if (completedBy.has(userId)) {
          completedBy.delete(userId);
        } else {
          completedBy.add(userId);
        }
        return {
          ...item,
          completedBy: Array.from(completedBy)
        };
      }
      return item;
    });

    // Update the list
    await list.update({ items: updatedItems });
    
    // Fetch fresh list with associations
    const updatedList = await List.findByPk(id, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'picture'] },
        { model: User, as: 'editors', attributes: ['id', 'name', 'picture'] },
        { model: Message, include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'picture'] }] },
        { model: User, as: 'upvoters', attributes: ['id', 'name', 'picture'] }
      ]
    });

    // Transform items to show user-specific completion status
    const transformedList = {
      ...updatedList.toJSON(),
      items: updatedList.items.map(item => ({
        ...item,
        isCompleted: (item.completedBy || []).includes(userId)
      }))
    };

    res.json(transformedList);

  } catch (error) {
    console.error('Error toggling item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add editor to list
router.post('/:id/editors', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    const list = await List.findOne({
      where: { id },
      include: [{ model: User, as: 'editors' }]
    });

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    if (list.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const editor = await User.findOne({ where: { email } });
    if (!editor) {
      return res.status(404).json({ error: 'User not found' });
    }

    await list.addEditor(editor);
    await list.reload({ include: [{ model: User, as: 'editors' }] });

    res.json(list);
  } catch (error) {
    console.error('Error adding editor:', error);
    res.status(500).json({ error: error.message });
  }
});

// Toggle upvote
router.post('/:id/upvote', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const list = await List.findOne({
      where: { id },
      include: [
        { model: User, as: 'owner' },
        { model: User, as: 'upvoters' }
      ]
    });

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    // Prevent self-upvoting
    if (list.ownerId === req.user.userId) {
      return res.status(403).json({ error: "You can't upvote your own list" });
    }

    const hasUpvoted = list.upvoters.some(upvoter => upvoter.id === req.user.userId);
    
    if (hasUpvoted) {
      await list.removeUpvoter(req.user.userId);
    } else {
      await list.addUpvoter(req.user.userId);
    }

    await list.reload({
      include: [
        { model: User, as: 'owner' },
        { model: User, as: 'upvoters' }
      ]
    });

    res.json(list);
  } catch (error) {
    console.error('Error toggling upvote:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's upvoted lists
router.get('/upvoted', auth, async (req, res) => {
  try {
    const lists = await List.findAll({
      include: [
        { 
          model: User, 
          as: 'owner',
          attributes: ['id', 'name', 'picture']
        },
        { 
          model: User, 
          as: 'upvoters',
          attributes: ['id', 'name', 'picture'],
          through: { attributes: [] },
          where: { id: req.user.userId }
        }
      ]
    });

    const transformedLists = lists.map(list => ({
      ...list.toJSON(),
      items: list.items.map(item => ({
        ...item,
        isCompleted: (item.completedBy || []).includes(req.user.userId)
      }))
    }));

    res.json(transformedLists);
  } catch (error) {
    console.error('Error fetching upvoted lists:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single list
router.get('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('Fetching list:', req.params.id, 'for user:', userId);

    // First check if list exists
    const list = await List.findByPk(req.params.id);
    if (!list) {
      console.log('List not found:', req.params.id);
      return res.status(404).json({ error: 'List not found' });
    }

    // Then fetch with associations
    const populatedList = await List.findOne({
      where: { id: req.params.id },
      include: [
        { 
          model: User, 
          as: 'owner',
          attributes: ['id', 'name', 'picture']
        },
        {
          model: User,
          as: 'upvoters',
          attributes: ['id', 'name', 'picture'],
          through: { attributes: [] }
        },
        {
          model: Message,
          include: [
            { 
              model: User, 
              as: 'sender', 
              attributes: ['id', 'name', 'picture']
            }
          ],
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!populatedList) {
      throw new Error('Failed to fetch list with associations');
    }

    // Transform list to show user-specific completion status
    const transformedList = {
      ...populatedList.toJSON(),
      items: (populatedList.items || []).map(item => ({
        ...item,
        isCompleted: Array.isArray(item.completedBy) && item.completedBy.includes(userId)
      }))
    };

    console.log('Successfully fetched list:', populatedList.id);
    res.json(transformedList);

  } catch (error) {
    console.error('Error fetching list:', error);
    console.error('Error details:', error.message);
    if (error.original) {
      console.error('Original error:', error.original);
    }
    res.status(500).json({ 
      error: 'Failed to fetch list',
      details: error.message 
    });
  }
});

// Toggle list visibility
router.patch('/:id/visibility', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const list = await List.findOne({
      where: { id },
      include: [
        { model: User, as: 'owner' },
        { model: User, as: 'editors' },
        { model: User, as: 'upvoters' }
      ]
    });

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    if (list.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Only the owner can change list visibility' });
    }

    await list.update({ isPublic: !list.isPublic });
    await list.reload();

    res.json(list);
  } catch (error) {
    console.error('Error toggling visibility:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 