const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  date: { type: Date, required: true },
  paymentDeadline: { type: Date, required: true },

  status: {
    type: String,
    enum: ['Open', 'Closed', 'Completed'],
    default: 'Open'
  },

  // Student-voted budget approval workflow
  budgetVoteStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  budgetVoteApprovedAt: { type: Date },
  budgetExecutedAt: { type: Date },

  // Split rules for per-student contribution
  splitMode: {
    type: String,
    enum: ['equal', 'gender_custom'],
    default: 'equal'
  },
  genderSplitAmounts: {
    // Per-student contribution. Used when splitMode === 'gender_custom'.
    Male: { type: Number, min: 0 },
    Female: { type: Number, min: 0 }
  },

  // Transparent planning breakdown (MVP requirement)
  expenses: {
    food: { type: Number, default: 0, min: 0 },
    transport: { type: Number, default: 0, min: 0 },
    misc: { type: Number, default: 0, min: 0 }
  },

  // Derived/legacy fields (still used by existing UI)
  budgetAllocated: { type: Number, default: 0, min: 0 },
  budgetUsed: { type: Number, default: 0, min: 0 },
  summary: { type: String, default: '' },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Assuming a User model reference
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
