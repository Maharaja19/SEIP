const mongoose = require("mongoose");

const ORGANIZATION_TYPES = [
  "INDIVIDUAL",
  "STUDENT_GROUP",
  "CLUB",
  "NGO",
  "STARTUP",
  "SMALL_BUSINESS",
  "COMPANY",
  "ASSOCIATION",
  "OTHER",
  // Legacy compatibility types
  "College",
  "Department",
  "Community",
  "Personal"
];

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    legalName: { type: String, trim: true, maxlength: 150 },
    displayName: { type: String, trim: true, maxlength: 100 },
    type: { 
      type: String, 
      enum: ORGANIZATION_TYPES,
      default: "CLUB"
    },
    description: { type: String, trim: true, maxlength: 500 },
    industry: { type: String, trim: true, maxlength: 100 },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    logo: { type: String },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true, default: "India" },
      postalCode: { type: String, trim: true }
    },
    currency: { type: String, default: "INR", uppercase: true, trim: true },
    timezone: { type: String, default: "Asia/Kolkata", trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["active", "suspended", "archived", "pending"],
      default: "active"
    },
    subscriptionPlan: { 
      type: String, 
      enum: ["Free", "Growth", "Enterprise"], 
      default: "Free" 
    },
    settings: {
      theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
      accentColor: { type: String, default: "#0f172a" },
      allowMemberSubmission: { type: Boolean, default: true },
      currency: { type: String, default: "INR" },
      fiscalYearStartMonth: { type: Number, default: 4, min: 1, max: 12 }
    }
  },
  { timestamps: true }
);

organizationSchema.pre("validate", function(next) {
  if (!this.owner && this.createdBy) {
    this.owner = this.createdBy;
  }
  if (!this.createdBy && this.owner) {
    this.createdBy = this.owner;
  }
  if (!this.displayName && this.name) {
    this.displayName = this.name;
  }
  next();
});

organizationSchema.index({ name: 1 });
organizationSchema.index({ createdBy: 1 });
organizationSchema.index({ owner: 1 });
organizationSchema.index({ status: 1 });
organizationSchema.index({ type: 1 });

module.exports = mongoose.model("Organization", organizationSchema);
module.exports.ORGANIZATION_TYPES = ORGANIZATION_TYPES;
