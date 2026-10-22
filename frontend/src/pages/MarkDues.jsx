import React, { useState, useEffect } from "react";
import api from "../utils/api";
import ModernLayout from "../components/layout/Layout";
import { CheckCircle2, XCircle, AlertCircle, Clock, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MarkDues() {
  const [notifications, setNotifications] = useState([]);
  const [verificationLoading, setVerificationLoading] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get("/dues/pending-verification");
      setNotifications(response.data.data || []);
    } catch (err) {
      setError("Failed to fetch notifications: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (dueID, action, notes = "") => {
    if (!window.confirm(`Are you sure you want to ${action} this payment?`)) return;

    try {
      setVerificationLoading(prev => ({ ...prev, [dueID]: true }));
      await api.put(`/dues/${dueID}/verify`, { action, treasurerNotes: notes });

      // Remove from list locally to animate out
      setNotifications(prev => prev.filter(n => n._id !== dueID));
    } catch (err) {
      alert(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setVerificationLoading(prev => ({ ...prev, [dueID]: false }));
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  return (
    <ModernLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" /> Mark Dues
          </h1>
          <p className="text-slate-500 mt-1">Verify and approve student payment claims.</p>
        </header>

        {loading ? (
          <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 flex items-center gap-2">
            <AlertCircle size={20} /> {error}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 text-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
              <Check size={40} className="text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">All Caught Up!</h3>
            <p className="text-slate-500 mt-2 max-w-sm">There are no pending payments requiring verification at this time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm text-slate-500 px-2">
              <span>{notifications.length} pending requests</span>
            </div>
            <AnimatePresence mode="popLayout">
              {notifications.map((notification) => (
                <motion.div
                  key={notification._id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
                            {notification.studentName?.[0] || 'S'}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-lg">{notification.studentName}</h3>
                            <p className="text-sm text-slate-500">{notification.studentRegNo || 'Register No N/A'}</p>
                          </div>
                        </div>
                        <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                          <Clock size={12} /> Pending
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl">
                        <div>
                          <p className="text-slate-500 mb-1">Payment Amount</p>
                          <p className="font-bold text-slate-900 text-lg">{formatCurrency(notification.amount)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 mb-1">Submitted Date</p>
                          <p className="font-medium text-slate-900">{new Date(notification.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 mb-1">Transaction Ref</p>
                          <p className="font-mono text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 inline-block">
                            {notification.transactionRef || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 mb-1">UPI ID</p>
                          <p className="font-mono text-slate-900">
                            {notification.upiTransactionId || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center gap-3 min-w-[140px]">
                      <button
                        onClick={() => handleVerifyPayment(notification._id, "approve")}
                        disabled={verificationLoading[notification._id]}
                        className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        {verificationLoading[notification._id] ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 size={20} /> Approve
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleVerifyPayment(notification._id, "reject")}
                        disabled={verificationLoading[notification._id]}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <XCircle size={20} /> Reject
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </ModernLayout>
  );
}