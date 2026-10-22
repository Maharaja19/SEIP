const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    balance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "INR", uppercase: true, trim: true },
    status: { 
      type: String, 
      enum: ["active", "frozen", "closed"], 
      default: "active",
      index: true 
    }
  },
  { timestamps: true }
);

walletSchema.index({ owner: 1, organization: 1 }, { sparse: true });
walletSchema.index({ student: 1 }, { sparse: true });

module.exports = mongoose.model("Wallet", walletSchema);
