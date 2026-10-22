const mongoose = require("mongoose");

const eventBudgetVoteSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },

    vote: { type: String, enum: ["approve", "reject"], required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

eventBudgetVoteSchema.index({ event: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("EventBudgetVote", eventBudgetVoteSchema);

