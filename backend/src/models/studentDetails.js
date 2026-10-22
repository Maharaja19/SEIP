const mongoose = require("mongoose");

const studentDetailSchema = new mongoose.Schema({
  registerNumber: { 
    type: String, 
    required: true, 
    unique: true, 
    ref: "Student",
    match: [/^[0-9]{13}$/, "Register number must be 13 digits"]
  },
  gender: { type: String, enum: ["Male", "Female", "Other"], maxlength: 10 },
  religion: { type: String, maxlength: 50 },
  quota: { type: String, maxlength: 50 },
  community: { type: String, maxlength: 50 },
  firstGraduate: { type: Boolean, default: false },
  otherState: { type: Boolean, default: false },
  contactNo: { 
    type: String,
    match: [/^[6-9]\d{9}$/, "Please enter a valid 10-digit phone number starting with 6-9"]
  }
}, { timestamps: true });

// Add indexes for better query performance
studentDetailSchema.index({ registerNumber: 1 });
studentDetailSchema.index({ community: 1 });
studentDetailSchema.index({ quota: 1 });
studentDetailSchema.index({ firstGraduate: 1 });
studentDetailSchema.index({ otherState: 1 });

module.exports = mongoose.model("StudentDetail", studentDetailSchema);