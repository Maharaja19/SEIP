const nodemailer = require('nodemailer');
const CustomError = require('../utils/CustomError');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Mock transporter.sendMail in test environment to avoid slow connections and race conditions
if (process.env.NODE_ENV === 'test') {
  transporter.sendMail = async (mailOptions) => {
    return { messageId: `mock-id-${Date.now()}` };
  };
}

// Verify connection configuration
if (process.env.NODE_ENV === "production") {
  transporter.verify((error, success) => {
    if (error) {
      console.log("SMTP connection error:", error);
    } else {
      console.log("SMTP server ready to send emails");
    }
  });
}

const SENDER_NAME = process.env.APP_NAME || 'SEIP Treasury';
const APP_LABEL = process.env.APP_NAME || 'SEIP';

/**
 * Send payment confirmation email
 */
const sendPaymentConfirmation = async (studentEmail, studentName, amount, transactionRef) => {
  try {
    const mailOptions = {
      from: `"${SENDER_NAME}" <${process.env.SMTP_USER}>`,
      to: studentEmail,
      subject: `Payment Confirmation - ${APP_LABEL}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">Payment Received</h2>
          <p>Dear ${studentName},</p>
          <p>Your payment has been successfully submitted and is pending verification.</p>
          
          <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Amount:</strong> ₹${amount}</p>
            <p><strong>Transaction Reference:</strong> ${transactionRef}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
          </div>
          
          <p>The treasurer will verify your payment shortly. You will receive another confirmation once verified.</p>
          
          <p style="color: #6B7280; font-size: 14px;">If you have any questions, please contact the treasury department.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Payment confirmation email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending payment confirmation:', error);
    return false;
  }
};

/**
 * Send payment verification notification
 */
const sendPaymentVerificationNotification = async (studentEmail, studentName, amount, status) => {
  try {
    const mailOptions = {
      from: `"${SENDER_NAME}" <${process.env.SMTP_USER}>`,
      to: studentEmail,
      subject: `Payment ${status === 'approved' ? 'Verified' : 'Rejected'} - ${APP_LABEL}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${status === 'approved' ? '#10B981' : '#EF4444'};">
            Payment ${status === 'approved' ? 'Verified Successfully' : 'Update Required'}
          </h2>
          <p>Dear ${studentName},</p>
          <p>Your payment of ₹${amount} has been ${status === 'approved' ? 'verified and confirmed' : 'reviewed and requires attention'}.</p>
          
          ${status === 'rejected' ? '<p>Please check your dashboard for more details and resubmit if necessary.</p>' : ''}
          
          <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Amount:</strong> ₹${amount}</p>
            <p><strong>Status:</strong> <span style="color: ${status === 'approved' ? '#10B981' : '#EF4444'};">${status.toUpperCase()}</span></p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
          </div>
          
          <p>Thank you for your prompt payment.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Payment verification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending verification notification:', error);
    return false;
  }
};

/**
 * Send due reminder email
 */
const sendDueReminder = async (studentEmail, studentName, amount, reason, dueDate) => {
  try {
    const mailOptions = {
      from: `"${SENDER_NAME}" <${process.env.SMTP_USER}>`,
      to: studentEmail,
      subject: `Payment Reminder - ${APP_LABEL}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #F59E0B;">Payment Reminder</h2>
          <p>Dear ${studentName},</p>
          <p>This is a friendly reminder about your upcoming payment.</p>
          
          <div style="background-color: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Amount Due:</strong> ₹${amount}</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString('en-IN')}</p>
          </div>
          
          <p>Please make the payment before the due date to avoid any inconvenience.</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dues" 
               style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Pay Now
            </a>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Due reminder email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending due reminder:', error);
    return false;
  }
};

/**
 * Send budget approval notification
 */
const sendBudgetApprovalNotification = async (userEmail, userName, budgetTitle, status) => {
  try {
    const mailOptions = {
      from: `"${SENDER_NAME}" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `Budget ${status} - ${APP_LABEL}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${status === 'Approved' ? '#10B981' : '#EF4444'};">Budget ${status}</h2>
          <p>Dear ${userName},</p>
          <p>Your budget proposal "${budgetTitle}" has been ${status.toLowerCase()}.</p>
          
          <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Budget Title:</strong> ${budgetTitle}</p>
            <p><strong>Status:</strong> <span style="color: ${status === 'Approved' ? '#10B981' : '#EF4444'};">${status}</span></p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
          </div>
          
          <p>Please login to your dashboard to view more details.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Budget approval email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending budget approval notification:', error);
    return false;
  }
};

/**
 * Send event budget voting reminder
 */
const sendEventVoteReminder = async (
  studentEmail,
  studentName,
  eventName,
  paymentDeadline
) => {
  try {
    const mailOptions = {
      from: `"${SENDER_NAME}" <${process.env.SMTP_USER}>`,
      to: studentEmail,
      subject: `Action Required: Vote for "${eventName}" - ${APP_LABEL}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563EB;">Event Budget Voting</h2>
          <p>Dear ${studentName},</p>
          <p>Please vote to approve/reject the budget for the event below:</p>
          
          <div style="background-color: #EFF6FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Event:</strong> ${eventName}</p>
            <p><strong>Payment deadline:</strong> ${
              paymentDeadline ? new Date(paymentDeadline).toLocaleDateString('en-IN') : "N/A"
            }</p>
          </div>
          
          <p style="color: #6B7280; font-size: 14px;">
            Open the Event Timeline to cast your vote before the deadline.
          </p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events" 
               style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Vote Now
            </a>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Event vote reminder email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending event vote reminder:", error);
    return false;
  }
};

/**
 * Send event payment reminder for unpaid shares
 */
const sendEventPaymentReminder = async (
  studentEmail,
  studentName,
  eventName,
  amountDue,
  paymentDeadline
) => {
  try {
    const mailOptions = {
      from: `"${SENDER_NAME}" <${process.env.SMTP_USER}>`,
      to: studentEmail,
      subject: `Reminder: Pay for "${eventName}" - ${APP_LABEL}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #F59E0B;">Payment Reminder</h2>
          <p>Dear ${studentName},</p>
          <p>Your event payment share is pending for:</p>

          <div style="background-color: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Event:</strong> ${eventName}</p>
            <p><strong>Amount due:</strong> ₹${amountDue}</p>
            <p><strong>Payment deadline:</strong> ${
              paymentDeadline ? new Date(paymentDeadline).toLocaleDateString('en-IN') : "N/A"
            }</p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events" 
               style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Pay Now
            </a>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Event payment reminder email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending event payment reminder:", error);
    return false;
  }
};

module.exports = {
  sendPaymentConfirmation,
  sendPaymentVerificationNotification,
  sendDueReminder,
  sendBudgetApprovalNotification,
  sendEventVoteReminder,
  sendEventPaymentReminder,
};
if (process.env.NODE_ENV === 'development') {
  console.log("SMTP configured:", !!process.env.SMTP_USER, "pass:", !!process.env.SMTP_PASS);
}