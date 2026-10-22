const mongoose = require("mongoose");

const eventParticipantSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    studentRegNo: { type: String, required: true, maxlength: 20 },

    name: { type: String, maxlength: 150 },
    department: { type: String, maxlength: 10 },
    batch: { type: String, maxlength: 20 },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },

    participate: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

eventParticipantSchema.index({ event: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("EventParticipant", eventParticipantSchema);

