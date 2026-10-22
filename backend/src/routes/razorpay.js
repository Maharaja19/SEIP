const express = require("express");
const router = express.Router();
const RazorpayService = require("../services/razorpayService");

// Razorpay Webhook
// This route must be public (no auth middleware)
router.post("/webhook", async (req, res) => {
    try {
        const signature = req.headers["x-razorpay-signature"];
        const result = await RazorpayService.handleWebhook(req.body, signature);
        res.status(200).send(result);
    } catch (error) {
        console.error("Webhook Error:", error.message);
        res.status(400).send("Webhook Error");
    }
});
// Simulation endpoint — NEVER enabled in production.
// Bypasses webhook signature verification and credits fake payments.
router.post("/simulate-success", async (req, res) => {
    try {
        if (process.env.NODE_ENV === "production") {
            return res.status(404).json({ success: false, message: "Not found" });
        }

        const { orderId } = req.body;
        // Construct a fake webhook payload
        const fakePayload = {
            event: "payment.captured",
            payload: {
                payment: {
                    entity: {
                        id: "pay_mock_" + Date.now(),
                        order_id: orderId,
                        amount: 50000, // Dummy
                        method: "upi",
                        email: "mock@student.com",
                        contact: "9999999999",
                        notes: {
                            // We need to fetch the order to get these notes? 
                            // Or we rely on the DB lookup in handleWebhook?
                            // handleWebhook uses payload.payment.entity.notes
                            // If we don't send notes here, handleWebhook might fail if it uses them.
                            // Let's check RazorpayService.handleWebhook
                        }
                    }
                }
            }
        };

        // We need to fetch the PaymentOrder to get the CORRECT studentId and dueId notes
        // Because handleWebhook relies on them.
        const PaymentOrder = require("../models/PaymentOrder");
        const order = await PaymentOrder.findOne({ orderId: orderId });

        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        // Populate notes from DB order (Razorpay puts order notes in payment notes usually)
        fakePayload.payload.payment.entity.notes = {
            studentId: order.student.toString(),
            dueId: order.due ? order.due.toString() : null
        };
        fakePayload.payload.payment.entity.amount = order.amount;

        // Bypass signature verification for simulation
        // We'll modify handleWebhook to accept a flag, or we just call the logic directly.
        // Better: Make handleWebhook accept 'skipSignature' param or split logic.
        // For now, let's just make sure signature check passes.
        // But we can't easily forge signature without secret.

        // Hack: We will add a method in RazorpayService 'processSuccess(paymentEntity)' 
        // and call it directly.
        await RazorpayService.processPaymentSuccess(fakePayload.payload.payment.entity);

        res.json({ success: true, message: "Mock Payment Simulated" });
    } catch (error) {
        console.error("Simulation Error", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
