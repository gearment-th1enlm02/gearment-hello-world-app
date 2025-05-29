const mongoose = require('mongoose');

const userDataSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  fullname: { type: String, default: '' },
  email: { type: String, default: '' },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  phone: { type: String, default: '' },
  bio: { type: String, default: '' },
  avatar: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('UserData', userDataSchema);