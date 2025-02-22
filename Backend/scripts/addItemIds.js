require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { List } = require('../models/List');
const { User } = require('../models/User');
const crypto = require('crypto');
const sequelize = require('../config/database');
const setupAssociations = require('../models/associations');

async function addItemIds() {
  try {
    // Set up associations
    setupAssociations();

    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Sync models (don't force in production!)
    await sequelize.sync();
    console.log('Database synced.');

    // Find all lists with their associations
    const lists = await List.findAll({
      include: [
        { model: User, as: 'owner' },
        { model: User, as: 'editors' },
        { model: User, as: 'upvoters' }
      ]
    });
    
    console.log(`Found ${lists.length} lists to update`);
    
    // Update each list
    for (const list of lists) {
      console.log(`Processing list: ${list.id}`);
      
      if (!Array.isArray(list.items)) {
        console.log(`List ${list.id} has no items, skipping`);
        continue;
      }

      const items = list.items.map(item => ({
        id: item.id || crypto.randomUUID(),
        content: item.content || '',
        isCompleted: Boolean(item.isCompleted)
      }));
      
      console.log(`Updating list ${list.id} with ${items.length} items`);
      await list.update({ items });
    }
    
    console.log('Successfully updated all lists');

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    console.log('Closing database connection...');
    await sequelize.close();
  }
}

// Run the script
addItemIds()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 