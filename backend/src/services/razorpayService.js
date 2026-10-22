const Razorpay = require("razorpay");
const crypto = require("crypto");
const PaymentOrder = require("../models/PaymentOrder");
const Due = require("../models/dues");
const Transaction = require("../models/transactions");
const Student = require("../models/student");
const User = require("../models/user");

// Initialize Razorpay
// Note: ENV variables must be set
// Initialize Razorpay
const getRazorpayInstance = () => {
    if (!process.env.RZP_KEY || !process.env.RZP_SECRET) {
        console.warn("⚠️ Razorpay keys missing. Using MOCK MODE.");
        return null; // Signals Mock Mode
    }
    return new Razorpay({
        key_id: process.env.RZP_KEY,
        key_secret: process.env.RZP_SECRET
    });
};

class RazorpayService {

    static async createOrder(amount, studentId, dueId) {
        try {
            const razorpay = getRazorpayInstance();

            // --- MOCK MODE ---
            if (!razorpay) {
                console.log("Creating MOCK Razorpay Order");
                const mockOrderId = "order_" + Date.now();
                // Generate a dummy QR that contains data
                // We'll point this QR to a deep link or just text for testing
                const mockUpiLink = `upi://pay?pa=mock@razorpay&pn=CollegeFee&am=${amount}&tr=${mockOrderId}`;
                const mockQr = `https://quickchart.io/qr?text=${encodeURIComponent(mockUpiLink)}&size=300`;

                // Save Mock Order
                const paymentOrder = new PaymentOrder({
                    orderId: mockOrderId,
                    amount: Math.round(amount * 100),
                    student: studentId,
                    due: dueId,
                    receipt: "mock_receipt",
                    status: "created",
                    notes: { isMock: true }
                });
                await paymentOrder.save();

                return {
                    orderId: mockOrderId,
                    qr: mockQr,
                    link: "http://mock-link",
                    paymentLinkId: "plink_" + Date.now(),
                    isMock: true
                };
            }
            // ----------------

            // 1. Create Razorpay Order
            // Amount is in rupees in arguments, convert to paise
            const amountPaise = Math.round(amount * 100);

            const order = await razorpay.orders.create({
                amount: amountPaise,
                currency: "INR",
                receipt: `receipt_${Date.now()}`,
                notes: {
                    studentId: studentId.toString(),
                    dueId: dueId ? dueId.toString() : null
                }
            });

            // 2. Create Razorpay Payment Link (includes UPI QR)
            const referenceId = `PAY_${order.id}`;

            const paymentLink = await razorpay.paymentLink.create({
                amount: amountPaise,
                currency: "INR",
                description: "Student Fee Payment",
                reference_id: referenceId,
                notes: {
                    studentId: studentId.toString(),
                    dueId: dueId ? dueId.toString() : null
                },
                accept_partial: false
            });

            // 3. Save to DB
            const paymentOrder = new PaymentOrder({
                orderId: order.id,
                amount: amountPaise,
                student: studentId,
                due: dueId,
                receipt: order.receipt,
                status: "created",
                notes: order.notes
            });
            await paymentOrder.save();

            return {
                orderId: order.id,
                qr: paymentLink.upi_qr, // QR IMAGE URL
                link: paymentLink.short_url,
                paymentLinkId: paymentLink.id
            };

        } catch (error) {
            console.error("Razorpay Create Order Error:", error);
            throw error;
        }
    }

    static async handleWebhook(reqBody, signature) {
        const webhookSecret = process.env.RZP_WEBHOOK_SECRET;
        // We assume reqBody is the parsed JSON body, but verification needs string.
        // Following User's pattern: JSON.stringify(req.body)
        const bodyString = JSON.stringify(reqBody);

        // 1. Validate Signature
        const expected = crypto
            .createHmac("sha256", webhookSecret)
            .update(bodyString)
            .digest("hex");

        if (signature !== expected) {
            console.error("Invalid Razorpay Signature");
            console.error("Expected:", expected);
            console.error("Received:", signature);
            throw new Error("Invalid signature");
        }


        const event = reqBody.event;

        if (event === "payment.captured") {
            const payment = reqBody.payload.payment.entity;
            await this.processPaymentSuccess(payment);
            return "Payment updated";
        } else if (event === "payment.failed") {
            return "Payment failed";
        }

        return "Event ignored";
    }

    static async processPaymentSuccess(payment) {
        const orderId = payment.order_id;
        const studentId = payment.notes.studentId;
        const dueId = payment.notes.dueId;

        console.log("Processing payment capture for Order:", orderId);

        // Update PaymentOrder
        const paymentOrder = await PaymentOrder.findOne({ orderId: orderId });
        if (paymentOrder) {
            paymentOrder.status = "paid";
            paymentOrder.paymentId = payment.id;
            paymentOrder.method = payment.method;
            paymentOrder.email = payment.email;
            paymentOrder.contact = payment.contact;
            await paymentOrder.save();
        } else {
            console.warn(`PaymentOrder not found for orderId: ${orderId}`);
        }

        // Update Due if exists
        if (dueId) {
            const due = await Due.findById(dueId);
            if (due) {
                if (due.status === "Paid") {
                    console.log("Due already marked as paid.");
                    return;
                }

                due.status = "Paid";
                due.paymentMethod = "UPI (Razorpay)";
                due.transactionRef = payment.id;
                due.paidDate = new Date();
                due.verifiedDate = new Date();
                due.verifiedBy = "SYSTEM";
                await due.save();

                // Create Transaction
                const student = await Student.findById(studentId);
                let userId = null;
                if (student) {
                    const User = require("../models/user"); // Ensure User is loaded
                    const user = await User.findOne({ registerNumber: student.registerNumber });
                    if (user) userId = user._id;
                }
            }

            // If no user found, we might still want to record transaction but 'user' is required in Transaction schema.
            // We'll need a fallback or check schema requirements. Transaction user is required.
            // If userId is missing, we might fail to create transaction.

            if (userId) {
                const transaction = new Transaction({
                    user: userId,
                    student: studentId,
                    due: dueId,
                    type: 'income',
                    category: 'dues',
                    amount: payment.amount / 100, // back to rupees
                    description: `Razorpay Payment: ${due.reason}`,
                    paymentMethod: 'UPI',
                    transactionRef: payment.id,
                    isStudentEntry: false
                });
                await transaction.save();
                console.log("Transaction created successfully");
            } else {
                console.warn("Could not find User for student, skipping transaction creation.");
            }
        }
    }
}



module.exports = RazorpayService;
