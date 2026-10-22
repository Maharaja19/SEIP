const Due = require('../models/dues');
const Transaction = require('../models/transactions');
const User = require('../models/user');
const Student = require('../models/student');
const notificationService = require('./notificationService');

class UPIService {
  // Generate UPI payment link with enhanced parameters
  static generatePaymentLink(amount, studentRegNo, dueReason) {
    const upiId = process.env.UPI_ID || "8939811573@axl";
    const merchantName = process.env.UPI_MERCHANT_NAME || "Class Treasurer";
    // Create a cleaner description that's more compatible with UPI apps
    const description = `Payment for ${dueReason} - ${studentRegNo}`;

    // Enhanced UPI link with parameters optimized for compatibility
    // Removed transaction-specific parameters that may cause issues with some UPI apps
    return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(description)}`;
  }

  // Generate QR Code URL with better error handling
  static generateQRCode(amount, studentRegNo, dueReason) {
    try {
      const upiLink = this.generatePaymentLink(amount, studentRegNo, dueReason);
      // Use a more reliable QR code service with better error handling
      // Using api.qrserver.com as primary since it's more widely supported
      return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiLink)}`;
    } catch (error) {
      console.error('Error generating QR code:', error);
      // Fallback to quickchart.io
      const upiLink = this.generatePaymentLink(amount, studentRegNo, dueReason);
      return `https://quickchart.io/qr?text=${encodeURIComponent(upiLink)}&size=300`;
    }
  }

  // Process UPI payment submission with enhanced validation
  static async submitPayment(dueId, paymentData, studentRegNo, organizationId) {
    try {
      const { transactionRef, upiTransactionId, paymentScreenshot } = paymentData;

      // Validate required fields
      if (!transactionRef || !upiTransactionId) {
        throw new Error('Transaction reference and UPI transaction ID are required');
      }

      const dueQuery = { _id: dueId };
      if (organizationId) dueQuery.organization = organizationId;

      // Find the due
      const due = await Due.findOne(dueQuery).populate('student');
      if (!due) {
        throw new Error('Due not found');
      }

      // Due is payable when unpaid (legacy lowercase 'pending' also means not yet paid)
      const normalizedStatus = String(due.status || '').toLowerCase();
      if (normalizedStatus !== 'unpaid' && normalizedStatus !== 'pending') {
        throw new Error('Due is not in unpaid status');
      }

      // Check for duplicate transaction reference
      const existingPayment = await Due.findOne({
        $or: [
          { transactionRef },
          { upiTransactionId }
        ],
        status: { $in: ['Pending Verification', 'Paid'] },
        ...(organizationId ? { organization: organizationId } : {})
      });

      if (existingPayment) {
        throw new Error('Transaction reference or UPI transaction ID already used');
      }

      // Update due with payment information
      const updatedDue = await Due.findOneAndUpdate(
        dueQuery,
        {
          status: 'Pending Verification',
          paymentMethod: 'UPI',
          transactionRef,
          upiTransactionId,
          paymentScreenshot,
          paidDate: new Date()
        },
        { new: true }
      ).populate('student');

      const studentEmail = updatedDue.student?.email;
      const studentName = updatedDue.student?.fullName || updatedDue.student?.name || 'Student';
      if (studentEmail) {
        await notificationService.sendPaymentConfirmation(
          studentEmail,
          studentName,
          due.amount,
          transactionRef
        );
      }

      // Payment notification (no PII in logs)
      console.log(
        `UPI payment submitted: due ${due._id}, amount ₹${due.amount}, ref ${transactionRef}`
      );

      return {
        success: true,
        message: 'Payment submitted successfully! Waiting for treasurer verification.',
        due: updatedDue
      };

    } catch (error) {
      throw new Error(`Payment submission failed: ${error.message}`);
    }
  }

  // Verify payment (treasurer action) with enhanced logging
  static async verifyPayment(dueId, action, treasurerNotes, treasurerId, organizationId) {
    try {
      const dueQuery = { _id: dueId };
      if (organizationId) dueQuery.organization = organizationId;

      const due = await Due.findOne(dueQuery).populate('student');
      if (!due) {
        throw new Error('Due not found');
      }

      if (due.status !== 'Pending Verification') {
        throw new Error('Due is not pending verification');
      }

      const newStatus = action === 'approve' ? 'Paid' : 'Unpaid';
      const updateData = {
        status: newStatus,
        verifiedDate: new Date(),
        verifiedBy: treasurerId,
        treasurerNotes: treasurerNotes || ''
      };

      // If rejected, clear payment information
      if (action === 'reject') {
        updateData.paymentMethod = null;
        updateData.transactionRef = null;
        updateData.upiTransactionId = null;
        updateData.paidDate = null;
        updateData.paymentScreenshot = null;
      }

      const updatedDue = await Due.findOneAndUpdate(dueQuery, updateData, { new: true }).populate('student');

      // Create transaction record if approved
      if (action === 'approve') {
        await this.createTransactionRecord(due, treasurerId);
      }

      const studentEmail = updatedDue.student?.email;
      const studentName = updatedDue.student?.fullName || updatedDue.student?.name || 'Student';
      if (studentEmail) {
        await notificationService.sendPaymentVerificationNotification(
          studentEmail,
          studentName,
          due.amount,
          action === 'approve' ? 'approved' : 'rejected'
        );
      }

      // Log the verification action (no PII)
      console.log(
        `UPI payment ${action}: due ${due._id}, amount ₹${due.amount}, verified by ${treasurerId}`
      );

      return {
        success: true,
        message: `Payment ${action === 'approve' ? 'approved' : 'rejected'} successfully!`,
        due: updatedDue
      };

    } catch (error) {
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  // Create transaction record with enhanced data
  static async createTransactionRecord(due, treasurerId) {
    try {
      const user = await User.findOne({ registerNumber: due.student.registerNumber });

      const transaction = new Transaction({
        user: user?._id,
        student: due.student._id,
        due: due._id,
        organization: due.organization,
        type: 'income',
        category: 'dues',
        amount: due.amount,
        description: `${due.reason} - ${due.student.name}`,
        paymentMethod: due.paymentMethod,
        transactionRef: due.transactionRef,
        approvedBy: treasurerId
      });

      await transaction.save();
      return transaction;
    } catch (error) {
      console.error('Failed to create transaction record:', error);
      throw error;
    }
  }

  // Get payment statistics with enhanced data
  static async getPaymentStats(organizationId) {
    try {
      const orgMatch = organizationId ? { organization: organizationId } : {};
      const totalDues = await Due.countDocuments(orgMatch);
      const paidDues = await Due.countDocuments({ ...orgMatch, status: 'Paid' });
      const pendingVerification = await Due.countDocuments({ ...orgMatch, status: 'Pending Verification' });
      const unpaidDues = await Due.countDocuments({ ...orgMatch, status: 'Unpaid' });

      const totalAmount = await Due.aggregate([
        { $match: orgMatch },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const collectedAmount = await Due.aggregate([
        { $match: { ...orgMatch, status: 'Paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      // Get payment method distribution
      const paymentMethods = await Due.aggregate([
        { $match: { ...orgMatch, status: 'Paid' } },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$amount' } } }
      ]);

      return {
        totalDues,
        paidDues,
        pendingVerification,
        unpaidDues,
        totalAmount: totalAmount[0]?.total || 0,
        collectedAmount: collectedAmount[0]?.total || 0,
        collectionRate: totalAmount[0]?.total ?
          ((collectedAmount[0]?.total || 0) / totalAmount[0].total * 100).toFixed(2) : 0,
        paymentMethods
      };
    } catch (error) {
      throw new Error(`Failed to get payment statistics: ${error.message}`);
    }
  }

  // Validate UPI transaction ID format
  static validateUPITransactionId(transactionId) {
    // Basic validation for UPI transaction IDs
    // This can be enhanced based on specific UPI provider formats
    if (!transactionId || transactionId.length < 10) {
      return false;
    }
    return true;
  }
}

module.exports = UPIService;