import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Smartphone,
  QrCode,
  Banknote,
  X,
  Copy,
  ExternalLink
} from "lucide-react";

import api from "../utils/api";
import { getApiData, getApiErrorMessage } from "../utils/apiHelpers";
import { cn } from "../utils/cn";
import ModernLayout from "../components/layout/Layout";
import { useAuth } from "../context/AuthContext";
import { isStudent } from "../utils/roles";

export default function Dues() {
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDue, setSelectedDue] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [paymentLoading, setPaymentLoading] = useState({});
  const [qrData, setQrData] = useState({});
  const [qrError, setQrError] = useState({});

  const { user } = useAuth();

  const fetchUPIQR = async (due) => {
    try {
      console.log("Fetching UPI QR for due:", due._id);
      console.log("Due object:", due);
      setPaymentLoading(prev => ({ ...prev, [due._id]: true }));
      setQrError(prev => ({ ...prev, [due._id]: null })); // Clear previous errors

      // Ensure user has valid register number
      if (!user || (!user.registerNumber && !user.rollNo)) {
        throw new Error("Student Register Number is missing in profile.");
      }

      const regNo = user.registerNumber || user.rollNo;
      console.log("User register number:", regNo);

      // Changed to use generic UPI Link generation instead of Razorpay Order
      console.log("Making request to /payments/generate-upi-link with:", {
        amount: due.amount,
        dueId: due._id,
        studentRegNo: regNo
      });
      
      const response = await api.post("/payments/generate-upi-link", {
        amount: due.amount,
        dueId: due._id,
        studentRegNo: regNo
      });

      if (response.data.success) {
        console.log("QR Data received:", response.data.data);
        // Map the generic UPI response to the expected state format
        setQrData(prev => ({
          ...prev,
          [due._id]: {
            qr: response.data.data.qrCodeUrl,
            upiLink: response.data.data.upiLink,
            // UPI Link doesn't have an orderId in the same way, but we pass something to avoid errors if referenced
            orderId: "static_upi_" + Date.now(),
            isMock: false // It's a real UPI link (but manual verification)
          }
        }));
      } else {
        // If success is false but no error thrown
        throw new Error(response.data.message || "Failed to generate UPI Link");
      }
    } catch (err) {
      console.error("Failed to generate QR code:", err);
      const errorMsg = err.response?.data?.error || err.message;
      setQrError(prev => ({ ...prev, [due._id]: errorMsg }));
    } finally {
      setPaymentLoading(prev => ({ ...prev, [due._id]: false }));
    }
  };

  const fetchDues = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!user || !isStudent(user.role)) {
        setError("Access denied: Only students can view their dues");
        return;
      }

      if (!user.registerNumber) {
        setError("Student registration number not found in profile");
        return;
      }

      const response = await api.get("/students/me/installment-dues");
      setDues(getApiData(response) || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to fetch dues"));
    } finally {
      setLoading(false);
    }
  }, [user?.registerNumber, user?.role]);

  useEffect(() => {
    fetchDues();
  }, [fetchDues]);

  const handlePayment = (due) => {
    setSelectedDue(due);
    setSelectedPaymentMethod("upi"); // Default to UPI
    setShowPaymentModal(true);
    // Clear previous QR data and errors
    setQrData(prev => ({ ...prev, [due._id]: undefined }));
    setQrError(prev => ({ ...prev, [due._id]: undefined }));
    // Trigger QR fetch immediately
    setTimeout(() => fetchUPIQR(due), 300); // Small delay to ensure state is set
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedDue(null);
    setSelectedPaymentMethod("");
    setMobileNumber("");
    setTransactionId("");
  };

  const submitManualPayment = async () => {
    if (!mobileNumber || !transactionId) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      setPaymentLoading(prev => ({ ...prev, [selectedDue.dueID]: true }));

      const response = await api.put(`/dues/${selectedDue.dueID}/pay-via-upi`, {
        transactionRef: transactionId,
        upiTransactionId: transactionId,
        studentRegNo: user.registerNumber
      });

      alert(response.data.message);
      closePaymentModal();
      fetchDues();
    } catch (err) {
      alert("Payment submission failed: " + (err.response?.data?.error || err.message));
    } finally {
      setPaymentLoading(prev => ({ ...prev, [selectedDue.dueID]: false }));
    }
  };

  const groupDuesBySemester = (duesList) => {
    const semesterDues = { 5: [], 6: [], 7: [], 8: [] };
    if (!duesList || !Array.isArray(duesList)) {
      return semesterDues;
    }
    duesList.forEach(due => {
      const match = due.reason.match(/Semester (\d+) Installment/);
      if (match) {
        const semester = parseInt(match[1]);
        if (semester >= 5 && semester <= 8) {
          semesterDues[semester].push(due);
        }
      }
    });
    return semesterDues;
  };

  const semesterDues = groupDuesBySemester(dues);

  // Status Badge Component
  const StatusBadge = ({ status }) => {
    const styles = {
      Paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
      "Pending Verification": "bg-amber-100 text-amber-700 border-amber-200",
      Unpaid: "bg-rose-100 text-rose-700 border-rose-200",
    };

    const icons = {
      Paid: <CheckCircle2 className="w-3.5 h-3.5" />,
      "Pending Verification": <Clock className="w-3.5 h-3.5" />,
      Unpaid: <AlertCircle className="w-3.5 h-3.5" />,
    };

    return (
      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5", styles[status] || styles.Unpaid)}>
        {icons[status] || icons.Unpaid}
        {status}
      </span>
    );
  };

  // Skeleton Loaders
  const DueCardSkeleton = () => (
    <div 
      className="group relative bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all animate-pulse"
      role="status"
      aria-label="Loading due information"
    >
      <div className="w-full flex justify-between items-start mb-4">
        <div className="w-12 h-12 rounded-xl bg-slate-200"></div>
        <div className="h-6 w-24 bg-slate-200 rounded-full"></div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-5 w-32 bg-slate-200 rounded"></div>
        <div className="h-4 w-40 bg-slate-200 rounded"></div>
      </div>
      <div className="h-10 w-24 bg-slate-200 rounded-lg"></div>
    </div>
  );

  return (
    <ModernLayout>
      <div className="space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8" role="main" aria-label="My Dues">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" aria-hidden="true" />
              My Dues
            </h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">
              Track and settle your semester payments securely.
            </p>
          </div>
        </header>

        {/* Content */}
        {loading ? (
          <div 
            className="flex items-center justify-center py-16 sm:py-20"
            role="status"
            aria-label="Loading dues information"
          >
            <div className="space-y-6 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                <DueCardSkeleton />
                <DueCardSkeleton />
                <DueCardSkeleton />
              </div>
            </div>
          </div>
        ) : error ? (
          <div 
            className="p-4 sm:p-5 rounded-xl bg-red-50 text-red-700 border border-red-100 flex items-center gap-3"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : dues.length === 0 ? (
          <div 
            className="text-center py-16 sm:py-20 bg-white rounded-2xl border border-slate-200 shadow-sm"
            role="status"
            aria-live="polite"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-blue-500" aria-hidden="true" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800">All Caught Up!</h3>
            <p className="text-slate-600 mt-2 max-w-sm mx-auto text-sm sm:text-base">
              You have no pending dues at the moment. Great job keeping your finances in order!
            </p>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {[5, 6, 7, 8].map(semester => {
              const semesterDuesList = semesterDues[semester];
              if (semesterDuesList.length === 0) return null;

              return (
                <section
                  key={semester}
                  className="space-y-4 sm:space-y-6"
                  aria-labelledby={`semester-${semester}-heading`}
                >
                  <div className="flex items-center gap-3 px-1">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm" aria-hidden="true">
                      S{semester}
                    </div>
                    <h2 id={`semester-${semester}-heading`} className="text-base sm:text-lg font-semibold text-slate-800">
                      Semester {semester}
                    </h2>
                    <div className="h-px flex-1 bg-slate-200" aria-hidden="true" />
                  </div>

                  <div 
                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6"
                    role="list"
                    aria-label={`Semester ${semester} dues`}
                  >
                    {semesterDuesList.map((due) => (
                      <article
                        key={due._id}
                        className="group relative bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-blue-200 flex flex-col items-start gap-4"
                        role="listitem"
                        aria-label={`${due.reason}: ${due.status}, Amount: ₹${due.amount.toLocaleString()}`}
                      >
                        <div className="w-full flex justify-between items-start">
                          <div className="p-2.5 sm:p-3 bg-slate-100 rounded-xl" aria-hidden="true">
                            <Banknote className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 group-hover:text-blue-600 transition-colors" />
                          </div>
                          <StatusBadge status={due.status} />
                        </div>

                        <div className="flex-1 w-full">
                          <h3 className="font-semibold text-slate-900 text-base sm:text-lg mb-2">
                            {due.reason}
                          </h3>
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
                            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                            <span>Due: {new Date(due.dueDate).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="w-full pt-4 border-t border-slate-100 mt-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                          <div>
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Amount
                            </span>
                            <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                              ₹{due.amount.toLocaleString()}
                            </div>
                          </div>
                          {due.status === "Unpaid" ? (
                            <button
                              type="button"
                              onClick={() => handlePayment(due)}
                              className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md hover:translate-y-[-1px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                              aria-label={`Pay ${due.reason} of ₹${due.amount.toLocaleString()}`}
                            >
                              Pay Now
                            </button>
                          ) : due.status === "Paid" ? (
                            <div className="text-left sm:text-right">
                              <span className="text-xs font-medium text-slate-500 block sm:inline">
                                Paid on
                              </span>
                              <div className="text-sm font-medium text-emerald-600 mt-0.5 sm:mt-0">
                                {due.paidDate ? new Date(due.paidDate).toLocaleDateString() : 'Verified'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs sm:text-sm text-amber-700 font-medium bg-amber-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg">
                              Processing
                            </span>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Payment Modal */}
        <AnimatePresence>
          {showPaymentModal && selectedDue && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="payment-modal-title"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closePaymentModal}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                aria-hidden="true"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 max-h-[90vh] overflow-y-auto"
              >
                {/* Modal Header */}
                <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
                  <h3 id="payment-modal-title" className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-blue-600" aria-hidden="true" />
                    Pay via UPI
                  </h3>
                  <button 
                    type="button"
                    onClick={closePaymentModal} 
                    className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                    aria-label="Close payment modal"
                  >
                    <X className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="p-5 sm:p-6 space-y-5 sm:space-y-6">

                  {/* Amount Display */}
                  <div className="text-center p-4 sm:p-5 bg-blue-50 rounded-xl border border-blue-100" role="note" aria-label="Payment amount">
                    <span className="text-xs sm:text-sm text-blue-600 font-medium">
                      Amount to Pay
                    </span>
                    <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
                      ₹{selectedDue.amount.toLocaleString()}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-600 mt-2">
                      For: {selectedDue.reason}
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="grid grid-cols-1 gap-3" role="radiogroup" aria-label="Payment method selection">
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('upi')}
                      role="radio"
                      aria-checked={selectedPaymentMethod === 'upi'}
                      aria-label="Pay with UPI - Scan QR code or use UPI link"
                      className={cn(
                        "p-4 sm:p-5 rounded-xl border-2 flex items-center gap-3 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                        selectedPaymentMethod === 'upi'
                          ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <QrCode className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" aria-hidden="true" />
                      <div className="text-left flex-1">
                        <div className="font-medium text-sm sm:text-base">Pay with UPI</div>
                        <div className="text-xs sm:text-sm opacity-75">Scan QR code or use UPI link</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('gpay')}
                      role="radio"
                      aria-checked={selectedPaymentMethod === 'gpay'}
                      aria-label="Manual Payment - Enter transaction details manually"
                      className={cn(
                        "p-4 sm:p-5 rounded-xl border-2 flex items-center gap-3 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                        selectedPaymentMethod === 'gpay'
                          ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" aria-hidden="true" />
                      <div className="text-left flex-1">
                        <div className="font-medium text-sm sm:text-base">Manual Payment</div>
                        <div className="text-xs sm:text-sm opacity-75">Enter transaction details manually</div>
                      </div>
                    </button>
                  </div>

                  {/* UPI / QR Section */}
                  {selectedPaymentMethod === 'upi' && (
                    <div className="space-y-4 sm:space-y-5">
                      {paymentLoading[selectedDue._id] ? (
                        <div 
                          className="flex flex-col items-center justify-center p-8 sm:p-10 space-y-4"
                          role="status"
                          aria-label="Generating QR code"
                        >
                          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600" aria-hidden="true"></div>
                          <p className="text-sm sm:text-base text-slate-600">Generating Secure QR Code...</p>
                          <p className="text-xs sm:text-sm text-slate-500">Please wait, this may take a few seconds</p>
                        </div>
                      ) : qrData[selectedDue._id] ? (
                        <>
                          <div className="flex flex-col items-center space-y-4 sm:space-y-5">
                            <div className="p-4 sm:p-5 bg-white rounded-xl shadow-lg border border-slate-100 relative">
                              <img
                                src={qrData[selectedDue._id]?.qr}
                                alt="UPI QR Code for payment"
                                className="w-40 h-40 sm:w-48 sm:h-48 object-contain"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  console.error("QR Image failed to load source");
                                }}
                              />
                            </div>

                            <div className="w-full max-w-xs">
                              <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 sm:px-4 py-2 border border-slate-200">
                                <span className="text-xs sm:text-sm font-mono truncate flex-1 mr-2 text-slate-700">
                                  {qrData[selectedDue._id]?.upiLink}
                                </span>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(qrData[selectedDue._id]?.upiLink);
                                    // Could add toast notification here
                                  }}
                                  className="p-1.5 sm:p-2 hover:bg-slate-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-shrink-0"
                                  aria-label="Copy UPI link to clipboard"
                                  title="Copy UPI Link"
                                >
                                  <Copy className="w-4 h-4 text-slate-600" aria-hidden="true" />
                                </button>
                              </div>
                              
                              <a 
                                href={qrData[selectedDue._id]?.upiLink}
                                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-sm font-medium transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                onClick={(e) => {
                                  // Only prevent default on desktop where UPI links might not work
                                  if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                                    e.preventDefault();
                                    alert('Please copy the UPI link and open it in your UPI app');
                                  }
                                }}
                                aria-label="Open UPI link in payment app"
                              >
                                Open in UPI App <ExternalLink className="w-4 h-4" aria-hidden="true" />
                              </a>
                            </div>
                          </div>

                          <div className="bg-blue-50 p-4 sm:p-5 rounded-xl border border-blue-100" role="note" aria-label="Payment instructions">
                            <h4 className="font-semibold text-blue-800 flex items-center gap-2 text-sm sm:text-base mb-3">
                              <QrCode className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                              How to Pay via UPI
                            </h4>
                            <ol className="mt-2 space-y-2 text-xs sm:text-sm text-blue-700 list-decimal list-inside">
                              <li>Open any UPI app (Google Pay, PhonePe, Paytm, etc.)</li>
                              <li>Select "Scan QR" or "Pay using QR" option</li>
                              <li>Scan the QR code shown above</li>
                              <li>Verify the amount is ₹{selectedDue.amount.toLocaleString()} and complete payment</li>
                              <li>Your payment will be automatically verified within minutes</li>
                            </ol>
                            <div className="mt-3 sm:mt-4 pt-3 border-t border-blue-100">
                              <p className="text-xs sm:text-sm text-blue-600">
                                <strong>Note:</strong> If scanning fails, you can copy the UPI link and paste it in your UPI app's "Send Money" section.
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              type="button"
                              onClick={() => { closePaymentModal(); fetchDues(); }}
                              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                              aria-label="Refresh payment status"
                            >
                              <span>Refresh Status</span>
                              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={closePaymentModal}
                              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                              aria-label="Cancel payment"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <div 
                          className="text-center bg-red-50 p-4 sm:p-5 rounded-xl border border-red-100"
                          role="alert"
                          aria-live="polite"
                        >
                          <div className="flex items-center justify-center gap-2 text-red-700 mb-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                            <p className="font-medium text-sm sm:text-base">Failed to load QR Code</p>
                          </div>
                          <p className="text-xs sm:text-sm mt-1 text-red-600">
                            {qrError[selectedDue._id] || "Unknown error occurred"}
                          </p>
                          <div className="mt-3 sm:mt-4 bg-yellow-50 p-3 sm:p-4 rounded-lg border border-yellow-100 text-left">
                            <h4 className="font-medium text-yellow-800 text-xs sm:text-sm mb-2">
                              Troubleshooting Tips:
                            </h4>
                            <ul className="mt-1 text-xs sm:text-sm text-yellow-700 list-disc list-inside space-y-1">
                              <li>Try refreshing the page and retrying</li>
                              <li>Contact treasurer if issue persists</li>
                              <li>Use "Manual Payment" option as alternative</li>
                            </ul>
                          </div>
                          <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                            <button 
                              type="button"
                              onClick={() => fetchUPIQR(selectedDue)} 
                              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                              aria-label="Retry QR code generation"
                            >
                              Retry Generation
                            </button>
                            <button 
                              type="button"
                              onClick={closePaymentModal}
                              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                              aria-label="Cancel payment"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual Entry Section */}
                  {selectedPaymentMethod === 'gpay' && (
                    <div className="space-y-4 sm:space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="space-y-2">
                        <label htmlFor="mobile-number" className="text-xs sm:text-sm font-semibold uppercase text-slate-600">
                          Mobile Number
                        </label>
                        <input
                          id="mobile-number"
                          type="tel"
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value)}
                          placeholder="Enter registered mobile number"
                          maxLength={10}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
                          aria-label="Mobile number for payment verification"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="transaction-id" className="text-xs sm:text-sm font-semibold uppercase text-slate-600">
                          Transaction ID
                        </label>
                        <input
                          id="transaction-id"
                          type="text"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          placeholder="Enter transaction ID"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
                          aria-label="Transaction ID from payment app"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={submitManualPayment}
                        disabled={paymentLoading[selectedDue.dueID]}
                        className="w-full py-3 sm:py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-label="Submit manual payment details"
                      >
                        {paymentLoading[selectedDue.dueID] ? (
                          <>
                            <span className="animate-pulse">Processing...</span>
                          </>
                        ) : (
                          'Submit Payment Details'
                        )}
                      </button>
                    </div>
                  )}

                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ModernLayout>
  );
}