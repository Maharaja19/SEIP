const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Student = require("../models/student");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
// Import API response utility
const APIResponse = require('../utils/apiResponse');
// Import custom error class
const CustomError = require('../utils/CustomError');

// In-memory store for OTPs (in production, use Redis or database)
const otpStore = new Map();

// Generate a random OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
}

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "your_email@gmail.com",
    pass: process.env.SMTP_PASS || "your_app_password"
  }
});

// Send OTP via SMS (placeholder - implement with actual SMS service like Twilio)
async function sendOTPviaSMS(phoneNumber, otp) {
  // In a real implementation, you would integrate with an SMS service like Twilio
  if (process.env.NODE_ENV !== "production") {
    // The OTP is stored in-memory (otpStore); nothing PII-bearing is logged here.
    console.log("OTP generated for SMS delivery (development only)");
  }
  
  // Example Twilio integration (uncomment and configure when needed):
  /*
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = require('twilio')(accountSid, authToken);
  
  await client.messages.create({
    body: `Your OTP for password reset is: ${otp}. This OTP will expire in 5 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber
  });
  */
  
  // For now, we'll just return true to simulate successful sending
  return true;
}

// Forgot password - generate and send OTP
router.post("/forgot-password", async (req, res, next) => {
  const { email, phoneNumber } = req.body; // Accept either email or phone number

  try {
    let user;
    
    // Find user by email or phone number
    if (email) {
      user = await User.findOne({ email });
    } else if (phoneNumber) {
      // For phone number, we need to find the user through the Student model
      const student = await Student.findOne({ phoneNumber });
      if (student) {
        user = await User.findOne({ registerNumber: student.registerNumber });
      }
    } else {
      return next(new CustomError("Email or phone number is required", 400, 'MISSING_CONTACT_INFO'));
    }

    if (!user) {
      return next(new CustomError("User not found", 404, 'USER_NOT_FOUND'));
    }

    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP with expiration (5 minutes)
    const contact = email || user.email || phoneNumber;
    otpStore.set(contact, {
      otp,
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    let message = "";
    
    // Send OTP via email or SMS
    if (email || user.email) {
      // Send OTP via email
      const mailOptions = {
        from: process.env.SMTP_USER || "your_email@gmail.com",
        to: email || user.email,
        subject: "Password Reset OTP",
        text: `Your OTP for password reset is: ${otp}. This OTP will expire in 5 minutes.`
      };

      await transporter.sendMail(mailOptions);
      message = "OTP sent to your email";
    } else if (phoneNumber) {
      // Send OTP via SMS
      await sendOTPviaSMS(phoneNumber, otp);
      message = "OTP sent to your phone number";
    } else {
      return next(new CustomError("No contact method available", 400, 'NO_CONTACT_METHOD'));
    }

    res.json(APIResponse.success({ contact }, message));
  } catch (err) {
    console.error("Error in forgot password:", err);
    next(err);
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res, next) => {
  const { contact, otp } = req.body; // contact can be email or phone number

  try {
    const storedOtp = otpStore.get(contact);
    
    if (!storedOtp) {
      return next(new CustomError("OTP not found or expired", 400, 'INVALID_OTP'));
    }

    if (Date.now() > storedOtp.expires) {
      otpStore.delete(contact);
      return next(new CustomError("OTP has expired", 400, 'EXPIRED_OTP'));
    }

    if (storedOtp.otp !== otp) {
      return next(new CustomError("Invalid OTP", 400, 'INVALID_OTP'));
    }

    // OTP is valid, remove it from store
    otpStore.delete(contact);

    res.json(APIResponse.success(null, "OTP verified successfully"));
  } catch (err) {
    console.error("Error in verify OTP:", err);
    next(err);
  }
});

// Reset password
router.post("/reset-password", async (req, res, next) => {
  const { contact, newPassword } = req.body; // contact can be email or phone number

  try {
    // Validate password strength
    if (newPassword.length < 6) {
      return next(new CustomError("Password must be at least 6 characters", 400, 'WEAK_PASSWORD'));
    }

    // Find user by email or phone number
    let user;
    if (contact && contact.includes("@")) {
      // It's an email
      user = await User.findOne({ email: contact });
    } else if (contact) {
      // It's a phone number
      const student = await Student.findOne({ phoneNumber: contact });
      if (student) {
        user = await User.findOne({ registerNumber: student.registerNumber });
      }
    }

    if (!user) {
      return next(new CustomError("User not found", 404, 'USER_NOT_FOUND'));
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user's password
    const result = await User.updateOne(
      { _id: user._id },
      { password: hashedPassword }
    );

    if (result.modifiedCount === 0) {
      return next(new CustomError("User not found", 404, 'USER_NOT_FOUND'));
    }

    res.json(APIResponse.success(null, "Password reset successfully"));
  } catch (err) {
    console.error("Error in reset password:", err);
    next(err);
  }
});

module.exports = router;