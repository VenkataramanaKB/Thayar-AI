const { User } = require('./User');
const { List, Message } = require('./List');

function setupAssociations() {
  // Clear any existing associations
  if (User.associations) {
    Object.keys(User.associations).forEach(key => {
      delete User.associations[key];
    });
  }
  if (List.associations) {
    Object.keys(List.associations).forEach(key => {
      delete List.associations[key];
    });
  }

  // Owner relationship
  List.belongsTo(User, {
    as: 'owner',
    foreignKey: 'ownerId'
  });
  User.hasMany(List, {
    as: 'ownedLists',
    foreignKey: 'ownerId'
  });

  // Upvote relationship
  List.belongsToMany(User, {
    through: 'ListUpvotes',
    as: 'upvoters',
    foreignKey: 'listId',
    otherKey: 'userId',
    unique: true
  });
  User.belongsToMany(List, {
    through: 'ListUpvotes',
    as: 'upvotedLists',
    foreignKey: 'userId',
    otherKey: 'listId',
    unique: true
  });

  // Message relationship
  Message.belongsTo(User, {
    as: 'sender',
    foreignKey: 'senderId'
  });
  Message.belongsTo(List, {
    foreignKey: 'listId'
  });
  List.hasMany(Message, {
    foreignKey: 'listId'
  });
}

module.exports = setupAssociations; 