require('dotenv').config();
const sequelize = require('../config/database');
const { User } = require('../models/User');
const { List } = require('../models/List');
const setupAssociations = require('../models/associations');

async function initDb() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection successful');

    // Set up associations
    setupAssociations();

    // Drop and recreate tables
    await sequelize.query('DROP TABLE IF EXISTS "ListUpvotes" CASCADE');
    await sequelize.query('DROP TABLE IF EXISTS "messages" CASCADE');
    await sequelize.query('DROP TABLE IF EXISTS "lists" CASCADE');
    await sequelize.query('DROP TABLE IF EXISTS "users" CASCADE');

    // Create tables
    await sequelize.sync({ force: true });

    // Create test data
    const user = await User.create({
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/picture.jpg',
      googleId: 'test123'
    });

    const list = await List.create({
      title: 'Test List',
      description: 'A test list',
      items: [
        { id: '1', content: 'Item 1', isCompleted: false, completedBy: [] },
        { id: '2', content: 'Item 2', isCompleted: false, completedBy: [] }
      ],
      isPublic: true,
      ownerId: user.id
    });

    // Create ListUpvotes table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "ListUpvotes" (
        "userId" UUID NOT NULL,
        "listId" UUID NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("userId", "listId"),
        FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("listId") REFERENCES "lists" ("id") ON DELETE CASCADE
      );
    `);

    // Create ListEditors table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "ListEditors" (
        "userId" UUID NOT NULL,
        "listId" UUID NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("userId", "listId"),
        FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("listId") REFERENCES "lists" ("id") ON DELETE CASCADE
      );
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    console.error('Error details:', error.original || error);
  } finally {
    await sequelize.close();
  }
}

initDb(); 