const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, sparse: true },
    fullName: { type: String, required: true, trim: true, maxlength: 100 }, // Full Name ✅
    registerNumber: {
      type: String,
      required: true,
      unique: true,
      match: [/^[A-Za-z0-9_./-]{2,30}$/, "Identifier / register number must be 2-30 alphanumeric characters"]
    },
    dob: { type: Date, required: true }, // Date of Birth ✅
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true }, // Gender ✅
    department: { type: String, default: "General", maxlength: 50 }, // Department / Team
    year: { type: String, default: "Member", maxlength: 20 }, // Year / Level
    email: { 
      type: String, 
      required: true, 
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"], // Email validation
      unique: true,
      lowercase: true,
      trim: true
    },
    phoneNumber: { 
      type: String, 
      required: false, 
      match: [/^[6-9]\d{9}$/, "Please enter a valid 10-digit phone number starting with 6-9"] // Number validation
    },
    address: { type: String, maxlength: 500 }, // Paragraph text
    // Additional fields for student details
    religion: { type: String, maxlength: 50 },
    quota: { type: String, maxlength: 50 },
    community: { type: String, maxlength: 50 },
    firstGraduate: { type: Boolean, default: false },
    otherState: { type: Boolean, default: false },
    contactNo: { type: String, match: [/^[6-9]\d{9}$/, "Please enter a valid 10-digit phone number starting with 6-9"] },
    section: { type: String, maxlength: 10 },
    dues: { type: Number, default: 0, min: 0 },
    cgpa: { type: Number, min: 0, max: 10 }
  },
  { timestamps: true }
);

// Add a method to get installment dues for this student
studentSchema.methods.getInstallmentDues = async function() {
  const Due = require("./dues");
  return await Due.find({ student: this._id, reason: { $regex: /Semester [5-8] Installment/ } })
    .sort({ dueDate: 1 });
};

// Add virtual for calculating total paid dues
studentSchema.virtual('paidDuesAmount').get(async function() {
  const Due = require("./dues");
  const paidDues = await Due.find({ student: this._id, status: "Paid" });
  return paidDues.reduce((total, due) => total + due.amount, 0);
});

// Add virtual for calculating total pending dues
studentSchema.virtual('pendingDuesAmount').get(async function() {
  const Due = require("./dues");
  const pendingDues = await Due.find({ student: this._id, status: { $in: ["Unpaid", "Pending Verification"] } });
  return pendingDues.reduce((total, due) => total + due.amount, 0);
});

// Add compound indexes for common query patterns
studentSchema.index({ organization: 1 });
studentSchema.index({ department: 1, year: 1 });
studentSchema.index({ fullName: 1, registerNumber: 1 });
studentSchema.index({ createdAt: -1 });

// Ensure virtual fields are serialized
studentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model("Student", studentSchema);