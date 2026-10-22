const mongoose = require("mongoose");

const DEFAULT_CATEGORIES = [
  { name: "Food & Dining", slug: "food", icon: "Utensils", color: "#f97316", type: "expense" },
  { name: "Transport", slug: "transport", icon: "Car", color: "#06b6d4", type: "expense" },
  { name: "Shopping", slug: "shopping", icon: "ShoppingBag", color: "#ec4899", type: "expense" },
  { name: "Bills & Utilities", slug: "bills", icon: "Receipt", color: "#eab308", type: "expense" },
  { name: "Education", slug: "education", icon: "GraduationCap", color: "#3b82f6", type: "expense" },
  { name: "Healthcare", slug: "healthcare", icon: "HeartPulse", color: "#ef4444", type: "expense" },
  { name: "Entertainment", slug: "entertainment", icon: "Film", color: "#a855f7", type: "expense" },
  { name: "Salary & Wages", slug: "salary", icon: "DollarSign", color: "#10b981", type: "income" },
  { name: "Business Revenue", slug: "business", icon: "Briefcase", color: "#6366f1", type: "income" },
  { name: "Investment", slug: "investment", icon: "TrendingUp", color: "#14b8a6", type: "both" },
  { name: "Other / Misc", slug: "other", icon: "MoreHorizontal", color: "#64748b", type: "both" }
];

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, trim: true, lowercase: true },
    description: { type: String, trim: true, maxlength: 200 },
    icon: { type: String, default: "Tag", trim: true },
    color: { type: String, default: "#3b82f6", trim: true },
    type: {
      type: String,
      enum: ["income", "expense", "both"],
      default: "expense"
    },
    scope: {
      type: String,
      enum: ["system", "organization", "user"],
      default: "organization",
      index: true
    },
    organization: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Organization",
      index: true 
    },
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      index: true 
    },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

categorySchema.pre("validate", function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
  }
  next();
});

categorySchema.index({ scope: 1, organization: 1, name: 1 });
categorySchema.index({ organization: 1, isActive: 1 });

module.exports = mongoose.model("Category", categorySchema);
module.exports.DEFAULT_CATEGORIES = DEFAULT_CATEGORIES;
