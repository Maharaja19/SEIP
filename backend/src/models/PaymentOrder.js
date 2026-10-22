const mongoose = require("mongoose");

const paymentOrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true }, // razorpay_order_id
  amount: { type: Number, required: true }, // in paise
  currency: { type: String, default: "INR" },
  status: { type: String, default: "created" }, // created, paid, failed
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  due: { type: mongoose.Schema.Types.ObjectId, ref: "Due" }, // Linked Due
  receipt: { type: String },
  paymentId: { type: String }, // razorpay_payment_id from webhook
  method: { type: String }, // UPI, Card, etc.
  email: { type: String },
  contact: { type: String },
  notes: { type: Object },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("PaymentOrder", paymentOrderSchema);
