const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  action: { type: String, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  details: { type: mongoose.Schema.Types.Mixed }, // Accommodate varying payload details
}, { timestamps: true });

module.exports = mongoose.model('Log', logSchema);
