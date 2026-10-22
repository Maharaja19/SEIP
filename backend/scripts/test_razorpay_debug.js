
require('dotenv').config();
const RazorpayService = require('../services/razorpayService');
const mongoose = require('mongoose');

async function testRazorpay() {
    try {
        console.log("Testing Razorpay Service...");
        console.log("RZP_KEY:", process.env.RZP_KEY ? "Set" : "Not Set");

        const result = await RazorpayService.createOrder(100, new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId());
        console.log("Result:", result);
    } catch (error) {
        console.error("Error:", error);
    }
}

testRazorpay();
