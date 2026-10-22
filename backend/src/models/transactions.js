const mongoose = require("mongoose");

const TRANSACTION_TYPES = ["income", "expense", "transfer"];

const transactionSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", index: true },
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet", index: true },
    due: { type: mongoose.Schema.Types.ObjectId, ref: "Due", index: true },
    budget: { type: mongoose.Schema.Types.ObjectId, ref: "Budget", index: true },

    type: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", uppercase: true, trim: true },
    category: {
      type: String,
      default: "misc",
      trim: true,
      maxlength: 50,
      index: true
    },
    merchant: { type: String, trim: true, maxlength: 100 },
    payee: { type: String, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500 },
    date: { type: Date, default: Date.now, index: true },
    paymentMethod: { 
      type: String, 
      trim: true,
      maxlength: 50
    },
    status: {
      type: String,
      enum: ["completed", "pending", "failed", "voided"],
      default: "completed",
      index: true
    },
    reference: { type: String, trim: true, maxlength: 100 },
    transactionRef: { type: String, trim: true, maxlength: 100 },
    notes: { type: String, trim: true, maxlength: 1000 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    tags: [{ type: String, trim: true }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    department: { type: String, trim: true, maxlength: 100, default: "General" },
    isStudentEntry: { type: Boolean, default: false },

    // AI categorization sub-document
    AIClassification: {
      suggestedCategory: { type: String, trim: true, maxlength: 60 },
      category: { type: String, trim: true, maxlength: 60 },
      confidence: { type: Number, min: 0, max: 1 },
      reason: { type: String, trim: true, maxlength: 500 },
      provider: { type: String, trim: true },
      model: { type: String, trim: true },
      status: {
        type: String,
        enum: ["PENDING", "SUGGESTED", "ACCEPTED", "REJECTED", "FAILED"],
        default: "PENDING"
      },
      classifiedAt: { type: Date }
    }
  },
  { timestamps: true }
);

// Pre-validate synchronization
transactionSchema.pre("validate", function(next) {
  // Normalize type
  if (this.type) {
    this.type = String(this.type).toLowerCase().trim();
  }
  // Sync organization fields
  if (!this.organization && this.organizationId) {
    this.organization = this.organizationId;
  }
  if (!this.organizationId && this.organization) {
    this.organizationId = this.organization;
  }
  // Sync payee/merchant
  if (!this.payee && this.merchant) {
    this.payee = this.merchant;
  }
  if (!this.merchant && this.payee) {
    this.merchant = this.payee;
  }
  // Sync references
  if (!this.reference && this.transactionRef) {
    this.reference = this.transactionRef;
  }
  if (!this.transactionRef && this.reference) {
    this.transactionRef = this.reference;
  }
  // Sync AIClassification category aliases
  if (this.AIClassification) {
    if (!this.AIClassification.suggestedCategory && this.AIClassification.category) {
      this.AIClassification.suggestedCategory = this.AIClassification.category;
    }
    if (!this.AIClassification.category && this.AIClassification.suggestedCategory) {
      this.AIClassification.category = this.AIClassification.suggestedCategory;
    }
  }
  next();
});

// Indexes for query performance
transactionSchema.index({ organization: 1, date: -1 });
transactionSchema.index({ organization: 1, type: 1 });
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1 });
transactionSchema.index({ user: 1, category: 1 });

// Virtuals
transactionSchema.virtual('typeDescription').get(function() {
  const descriptions = {
    'income': 'Money received',
    'expense': 'Money spent',
    'transfer': 'Fund transfer'
  };
  return descriptions[this.type] || this.type;
});

transactionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model("Transaction", transactionSchema);
module.exports.TRANSACTION_TYPES = TRANSACTION_TYPES;
module.exports.CLASSIFICATION_STATUS = ["PENDING", "SUGGESTED", "ACCEPTED", "REJECTED", "FAILED"];