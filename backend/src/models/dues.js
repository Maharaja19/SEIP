const mongoose = require("mongoose");

const dueSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
    dueID: { type: Number, unique: true, sparse: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    studentRegNo: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true, maxlength: 200 },
    dueDate: { type: Date, required: true },
    status: { 
      type: String, 
      enum: ["Unpaid", "Paid", "Pending Verification", "pending", "paid", "Pending"], 
      default: "pending" 
    },
    // Payment information fields
    paymentMethod: { 
      type: String, 
      enum: ["UPI", "Cash", "Bank Transfer", null], 
      default: null 
    },
    transactionRef: { type: String, maxlength: 100 },
    paidDate: { type: Date },
    verifiedDate: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    treasurerNotes: { type: String, maxlength: 500 },
    // UPI specific fields
    upiTransactionId: { type: String, maxlength: 100 },
    paymentScreenshot: { type: String, maxlength: 500 } // URL to uploaded screenshot
  },
  { timestamps: true }
);

// Add indexes for better query performance
dueSchema.index({ organization: 1 });
dueSchema.index({ student: 1 });
dueSchema.index({ status: 1 });
dueSchema.index({ dueDate: 1 });
dueSchema.index({ createdAt: -1 });

// Add compound indexes for common query patterns
dueSchema.index({ student: 1, status: 1 });
dueSchema.index({ student: 1, dueDate: 1 });
dueSchema.index({ status: 1, dueDate: 1 });
dueSchema.index({ dueDate: 1, status: 1 });
dueSchema.index({ verifiedBy: 1, status: 1 });

// Add virtual for days until due
dueSchema.virtual('daysUntilDue').get(function() {
  if (this.dueDate) {
    const today = new Date();
    const due = new Date(this.dueDate);
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Add virtual for overdue status
dueSchema.virtual('isOverdue').get(function() {
  if (this.dueDate && this.status !== "Paid") {
    const today = new Date();
    const due = new Date(this.dueDate);
    return due < today;
  }
  return false;
});

// Pre-save hook to auto-populate dueID with a unique number and synchronize student references/register numbers
dueSchema.pre('save', async function(next) {
  if (this.dueID === undefined || this.dueID === null) {
    this.dueID = Math.floor(Math.random() * 100000000) + 1;
  }
  
  if (!this.studentRegNo && this.student) {
    try {
      const student = await mongoose.model('Student').findById(this.student);
      if (student) {
        this.studentRegNo = student.registerNumber;
      }
    } catch (err) {
      console.error('Error populating studentRegNo in pre-save:', err);
    }
  }
  
  if (!this.student && this.studentRegNo) {
    try {
      const student = await mongoose.model('Student').findOne({ registerNumber: this.studentRegNo });
      if (student) {
        this.student = student._id;
      }
    } catch (err) {
      console.error('Error populating student ref in pre-save:', err);
    }
  }
  
  next();
});

// Ensure virtual fields are serialized
dueSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model("Due", dueSchema);