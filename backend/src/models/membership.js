const mongoose = require("mongoose");
const { USER_ROLES } = require("../utils/roles");

const membershipSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true,
      index: true 
    },
    organization: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Organization", 
      required: true,
      index: true 
    },
    role: {
      type: String,
      enum: [
        USER_ROLES.MEMBER,
        USER_ROLES.FINANCE_MANAGER,
        USER_ROLES.ORGANIZATION_ADMIN,
        USER_ROLES.SUPER_ADMIN
      ],
      default: USER_ROLES.MEMBER,
      required: true
    },
    status: {
      type: String,
      enum: ["active", "invited", "suspended", "left"],
      default: "active"
    },
    joinedAt: { 
      type: Date, 
      default: Date.now 
    },
    invitedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },
    permissions: [{ 
      type: String, 
      trim: true 
    }],
    title: { 
      type: String, 
      trim: true, 
      maxlength: 100 
    },
    department: { 
      type: String, 
      trim: true, 
      maxlength: 100, 
      default: "General" 
    }
  },
  { timestamps: true }
);

// Ensure a user can only have one active membership record per organization
membershipSchema.index({ organization: 1, user: 1 }, { unique: true });
membershipSchema.index({ organization: 1, role: 1 });
membershipSchema.index({ organization: 1, status: 1 });

module.exports = mongoose.model("Membership", membershipSchema);
