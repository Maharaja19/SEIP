const mongoose = require("mongoose");

const LEDGER_ENTRY_TYPES = [
  "TOPUP",
  "EVENT_PAYMENT_DEBIT",
  "ADJUSTMENT",
  "CREDIT",
  "DEBIT",
  "TRANSFER_IN",
  "TRANSFER_OUT"
];

const walletLedgerSchema = new mongoose.Schema(
  {
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet", index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", sparse: true, index: true },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction", sparse: true, index: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    reference: { type: String, trim: true, sparse: true, index: true },

    type: {
      type: String,
      enum: LEDGER_ENTRY_TYPES,
      required: true,
      index: true
    },

    amount: { type: Number, required: true, min: 0 },
    balanceBefore: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true, min: 0 },

    note: { type: String, maxlength: 500, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

walletLedgerSchema.index({ organization: 1, createdAt: -1 });
walletLedgerSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("WalletLedger", walletLedgerSchema);
module.exports.LEDGER_ENTRY_TYPES = LEDGER_ENTRY_TYPES;
