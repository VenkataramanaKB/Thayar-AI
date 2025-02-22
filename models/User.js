const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  picture: String,
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  createdLists: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List'
  }],
  upvotedLists: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema); 