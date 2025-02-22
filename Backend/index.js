require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const sequelize = require('./config/database');
const setupAssociations = require('./models/associations');

// Set up associations
setupAssociations();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect to PostgreSQL and sync models
sequelize.authenticate()
  .then(() => {
    console.log('Connected to PostgreSQL');
    return sequelize.sync({ alter: true }); // This will update tables if they exist
  })
  .catch(err => console.error('PostgreSQL connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/lists', require('./routes/lists'));
app.use('/api/users', require('./routes/users'));

// Initialize Telegram bot (commented out for now)
// require('./bot/telegram');

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-list', async (listId) => {
    try {
      if (!listId) {
        console.error('No list ID provided for join-list');
        return;
      }

      console.log('Join list request:', listId);

      // Get the list and check privacy
      const list = await List.findOne({
        where: { id: listId },
        include: [
          { model: User, as: 'owner' },
          { model: User, as: 'editors' }
        ]
      });

      if (!list) {
        console.error('List not found:', listId);
        return;
      }
      
      // Get the user ID from the socket handshake auth token
      const token = socket.handshake.auth.token;
      if (!token) {
        console.error('No auth token provided');
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;

      // Check if user can access the chat
      if (list.isPublic || 
          list.ownerId === userId || 
          list.editors.some(editor => editor.id === userId)) {
        console.log('User joined list:', listId);
        socket.join(listId);
      } else {
        console.error('User not authorized to join list:', listId);
      }
    } catch (error) {
      console.error('Error joining list room:', error);
    }
  });

  socket.on('leave-list', (listId) => {
    socket.leave(listId);
  });

  socket.on('send-message', async (data) => {
    io.to(data.listId).emit('receive-message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Basic test route
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Log environment variables at startup (excluding sensitive ones)
console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  GOOGLE_CLIENT_ID_LENGTH: process.env.GOOGLE_CLIENT_ID?.length,
  HAS_JWT_SECRET: !!process.env.JWT_SECRET
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 