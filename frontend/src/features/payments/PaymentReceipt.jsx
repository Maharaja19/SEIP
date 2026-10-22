import React from 'react';
import { jsPDF } from 'jspdf';
import { toast } from 'react-toastify';

export const PaymentReceipt = ({ paymentDetails }) => {
  const downloadReceipt = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text("Payment Receipt", 20, 20);
      
      doc.setFontSize(14);
      doc.text(`Transaction ID: ${paymentDetails.transactionId || 'N/A'}`, 20, 40);
      doc.text(`Amount: $${paymentDetails.amount}`, 20, 50);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 60);
      doc.text(`Status: ${paymentDetails.status}`, 20, 70);
      
      doc.save(`receipt_${paymentDetails.transactionId || 'payment'}.pdf`);
      toast.success("Receipt downloaded successfully!");
    } catch (err) {
      toast.error("Failed to generate receipt.");
      console.error(err);
    }
  };

  return (
    <button 
      onClick={downloadReceipt}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded-lg font-medium transition-all shadow-md"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
      Download PDF Receipt
    </button>
  );
};

export const showPaymentNotification = (status, message) => {
  if (status === 'success') {
    toast.success(message || 'Payment completed successfully!');
  } else {
    toast.error(message || 'Payment failed. Please try again.');
  }
};
