const mongoose = require("mongoose");

const INSIGHT_TYPES = [
  "EXPENSE_CLASSIFICATION",
  "SPENDING_INSIGHT",
  "SPENDING_SUMMARY",
  "CATEGORY_TREND",
  "SPENDING_CHANGE",
  "BUDGET_PROGRESS",
  "TOP_CATEGORY",
  "SAVING_OPPORTUNITY",
  "SPENDING_RECOMMENDATION",
  "BUDGET_RECOMMENDATION",
  "FINANCIAL_HEALTH",
  "FORECAST",
  "ANOMALY",
  "GENERAL",
  // Legacy compatibility types
  "trend",
  "alert",
  "budget_adherence",
  "forecast",
  "anomaly",
  "pattern",
  "positive",
  "opportunity"
];

const INSIGHT_SEVERITIES = ["info", "notice", "warning", "critical", "low", "medium", "high"];

const aiInsightSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

    type: { 
      type: String, 
      enum: INSIGHT_TYPES, 
      required: true,
      index: true
    },
    severity: { 
      type: String, 
      enum: INSIGHT_SEVERITIES, 
      default: "info",
      index: true
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    summary: { type: String, trim: true, maxlength: 500 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    details: { type: String, trim: true, maxlength: 5000 },

    confidence: { type: Number, min: 0, max: 1, default: 1 },
    source: { 
      type: String, 
      enum: ["rules", "gemini", "openai", "system", "ai"], 
      default: "system" 
    },

    cause: { type: String, trim: true, maxlength: 500 },
    suggestion: { type: String, trim: true, maxlength: 1000 },

    relatedEntity: {
      entityType: { 
        type: String, 
        enum: ["TRANSACTION", "BUDGET", "ORGANIZATION", "WALLET", "OTHER"] 
      },
      entityId: { type: mongoose.Schema.Types.ObjectId }
    },

    forecastData: {
      nextWeek: { type: Number },
      nextMonth: { type: Number },
      nextQuarter: { type: Number }
    },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    rawAIResponse: { type: String },

    isRead: { type: Boolean, default: false },
    isDismissed: { type: Boolean, default: false },
    expiresAt: { type: Date, index: true },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

aiInsightSchema.pre("validate", function(next) {
  if (!this.organization && this.organizationId) {
    this.organization = this.organizationId;
  }
  if (!this.organizationId && this.organization) {
    this.organizationId = this.organization;
  }
  if (!this.message && this.summary) {
    this.message = this.summary;
  }
  if (!this.summary && this.message) {
    this.summary = this.message.length > 500 ? this.message.substring(0, 497) + "..." : this.message;
  }
  next();
});

aiInsightSchema.index({ organization: 1, createdAt: -1 });
aiInsightSchema.index({ organization: 1, type: 1 });
aiInsightSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("AIInsight", aiInsightSchema);
module.exports.INSIGHT_TYPES = INSIGHT_TYPES;
module.exports.INSIGHT_SEVERITIES = INSIGHT_SEVERITIES;
