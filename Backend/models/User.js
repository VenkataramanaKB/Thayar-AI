const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  picture: {
    type: DataTypes.STRING,
    allowNull: true
  },
  googleId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
}, {
  timestamps: true,
  tableName: 'users'
});

// Note: The reverse associations will be created by List model
// User.hasMany(List, { as: 'authoredLists', foreignKey: 'ownerId' });
// User.belongsToMany(List, { as: 'editableLists', through: 'ListEditors' });
// User.belongsToMany(List, { as: 'upvotedLists', through: 'ListUpvotes' });

module.exports = { User }; 