const mongoose = require("mongoose");

const financialHealthSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    insights: [{
      type: { type: String, enum: ["spending", "savings", "budget", "general"], default: "general" },
      message: { type: String, required: true },
      impact: { type: String, enum: ["positive", "neutral", "negative"], default: "neutral" }
    }],
    recommendations: [{
      action: { type: String, required: true },
      estimatedSavings: { type: Number, default: 0 },
      priority: { type: String, enum: ["low", "medium", "high"], default: "medium" }
    }],
    factors: {
      budgetAdherence: { type: Number, min: 0, max: 40, default: 0 },
      savings: { type: Number, min: 0, max: 20, default: 0 },
      expenseStability: { type: Number, min: 0, max: 20, default: 0 },
      cashFlow: { type: Number, min: 0, max: 20, default: 0 }
    },
    explanation: { type: String, default: null },
    calculatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

financialHealthSchema.index({ organization: 1 });
financialHealthSchema.index({ user: 1 });
financialHealthSchema.index({ score: 1 });

module.exports = mongoose.model("FinancialHealth", financialHealthSchema);
