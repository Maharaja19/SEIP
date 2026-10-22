const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    sNo: { type: Number, required: true, unique: true },
    rollNo: { type: String, unique: true, sparse: true, maxlength: 20 }, // optional for Admin/Treasurer
    registerNumber: {
      type: String,
      unique: true,
      sparse: true,
      match: [/^[A-Za-z0-9_./-]{2,30}$/, "Organization identifier / register number must be 2-30 alphanumeric characters"]
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { 
      type: String, 
      required: true, 
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
      lowercase: true,
      trim: true
    },
    contactNo: { 
      type: String,
      match: [/^[6-9]\d{9}$/, "Please enter a valid 10-digit phone number starting with 6-9"]
    },
    dob: { type: Date },
    role: {
      type: String,
      enum: ["Organization Admin", "Finance Manager", "Member", "Super Admin", "Admin", "Treasurer", "Student"],
      default: "Member"
    },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
    permissions: { type: [String], default: [] },
    password: { type: String, minlength: 6 },
    lastLogin: { type: Date },
    lastPasswordChange: { type: Date },
    isActive: { type: Boolean, default: true },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    avatar: { type: String },
    profilePicture: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    
    // Onboarding fields
    onboarding: {
      academic: {
        branch: { type: String, trim: true },
        batch: { type: String, trim: true },
        year: { type: String, trim: true }
      },
      financial: {
        hasWallet: { type: Boolean, default: false },
        monthlyIncome: { type: Number, default: 0 },
        monthlyExpense: { type: Number, default: 0 },

        savingsGoal: {
          type: Number,
          default: 0
        },

        emergencyFundTarget: {
          type: Number,
          default: 0
        }
      },
      preferences: {
        spendingCategories: { type: [String], default: [] },
        aiPreferences: {
          insights: { type: Boolean, default: true },
          forecasting: { type: Boolean, default: true },
          recommendations: { type: Boolean, default: true }
        }
      },
      consent: {
        termsAccepted: { type: Boolean, default: false },
        privacyAccepted: { type: Boolean, default: false },
        analyticsConsent: { type: Boolean, default: false },
        acceptedAt: { type: Date }
      }
    },
    onboardingCompleted: { type: Boolean, default: false },

    settings: {
      notifications: {
        emailNotifications: { type: Boolean, default: true },
        pushNotifications: { type: Boolean, default: true },
        smsNotifications: { type: Boolean, default: false },
        dueReminders: { type: Boolean, default: true },
        budgetAlerts: { type: Boolean, default: true },
      },
      privacy: {
        profileVisibility: {
          type: String,
          enum: ['public', 'private', 'friends'],
          default: 'public',
        },
        showTransactions: { type: Boolean, default: false },
        showEmail: { type: Boolean, default: true },
      },
      appearance: {
        theme: {
          type: String,
          enum: ['light', 'dark', 'system'],
          default: 'system',
        },
      },
    },
  },
  { timestamps: true }
);

// Add indexes for better query performance
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// Add virtual for full name (if needed for consistency)
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Add method to check if account is locked
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Add method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If first failed attempt, set lockUntil to current time
  if (this.failedLoginAttempts === 0) {
    this.lockUntil = Date.now();
  }
  
  // Increment failed attempts
  this.failedLoginAttempts++;
  
  // If failed attempts exceed threshold, lock account for 15 minutes
  if (this.failedLoginAttempts >= 5) {
    this.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
  }
  
  return this.save();
};

// Add method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  this.failedLoginAttempts = 0;
  this.lockUntil = undefined;
  return this.save();
};

// Add method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  this.passwordResetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetExpires = Date.now() + 3600000; // 1 hour
  return this.passwordResetToken;
};

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model("User", userSchema);