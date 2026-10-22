const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true, index: true },
    entityType: {
      type: String,
      enum: [
        "TRANSACTION",
        "BUDGET",
        "ORGANIZATION",
        "MEMBERSHIP",
        "WALLET",
        "USER",
        "CATEGORY",
        "AUTH",
        "OTHER"
      ],
      default: "OTHER",
      index: true
    },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", index: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    details: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true }
  },
  { timestamps: true }
);

auditLogSchema.index({ organization: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
