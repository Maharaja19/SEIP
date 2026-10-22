const mongoose = require("mongoose");

const BUDGET_PERIODS = ["MONTHLY", "WEEKLY", "YEARLY", "CUSTOM"];

const expenseSchema = new mongoose.Schema({
  item: { type: String, required: true, trim: true, maxlength: 100 },
  amount: { type: Number, required: true, min: 0 },
  category: { type: String, maxlength: 50 }
});

const budgetSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    proposedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    name: { type: String, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    category: { type: String, default: "General", trim: true },

    period: {
      type: String,
      enum: ["MONTHLY", "WEEKLY", "YEARLY", "CUSTOM", "monthly", "weekly", "yearly", "custom"],
      default: "MONTHLY",
      uppercase: true,
      trim: true
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },

    allocated: { type: Number, required: true, min: 0 },
    amount: { type: Number, min: 0 },
    total_budget: { type: Number, min: 0 },
    spent: { type: Number, default: 0, min: 0 },
    spentAmount: { type: Number, default: 0, min: 0 },
    remaining: { type: Number, required: true, min: 0 },

    alertThresholds: [{ type: Number, min: 0, max: 100 }], // e.g. [80, 100]

    budgetID: { type: String, unique: true, sparse: true },
    expenses: [expenseSchema],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true
    },
    last_updated: { type: Date, default: Date.now },
    approvedAt: { type: Date }
  },
  { timestamps: true }
);

// Indexes for query performance
budgetSchema.index({ organization: 1, status: 1 });
budgetSchema.index({ organization: 1, createdAt: -1 });

// Virtuals
budgetSchema.virtual('utilizationPercentage').get(function() {
  const total = this.allocated || this.total_budget || this.amount || 0;
  if (total > 0) {
    return Number(((this.spent / total) * 100).toFixed(2));
  }
  return 0;
});

budgetSchema.virtual('totalExpenses').get(function() {
  if (!this.expenses || !this.expenses.length) return 0;
  return this.expenses.reduce((total, expense) => total + expense.amount, 0);
});

// Deterministic calculations and field synchronization
budgetSchema.pre('validate', function(next) {
  this.last_updated = new Date();

  // Sync title and name
  if (!this.title && this.name) this.title = this.name;
  if (!this.name && this.title) this.name = this.title;

  // Sync owner and proposedBy
  if (!this.owner && this.proposedBy) this.owner = this.proposedBy;
  if (!this.proposedBy && this.owner) this.proposedBy = this.owner;

  // Sync organization fields
  if (!this.organization && this.organizationId) this.organization = this.organizationId;
  if (!this.organizationId && this.organization) this.organizationId = this.organization;

  // Normalize amount / allocated / total_budget
  const resolvedAmount = this.amount ?? this.allocated ?? this.total_budget ?? 0;
  this.amount = resolvedAmount;
  this.allocated = resolvedAmount;
  this.total_budget = resolvedAmount;

  // Synchronize spent and remaining deterministically
  this.spent = this.spent || 0;
  this.spentAmount = this.spent;
  this.remaining = Math.max(0, resolvedAmount - this.spent);

  // Set default alert thresholds if empty
  if (!this.alertThresholds || !this.alertThresholds.length) {
    this.alertThresholds = [80, 100];
  }

  // Update approvedAt
  if (this.isModified('status') && this.status === 'approved' && !this.approvedAt) {
    this.approvedAt = new Date();
  }

  next();
});

budgetSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model("Budget", budgetSchema);
module.exports.BUDGET_PERIODS = BUDGET_PERIODS;