const mongoose = require("mongoose");

const eventPaymentSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },

    amountDue: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },

    status: { type: String, enum: ["Unpaid", "Paid"], default: "Unpaid", index: true },
    paidAt: { type: Date },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

eventPaymentSchema.index({ event: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("EventPayment", eventPaymentSchema);

