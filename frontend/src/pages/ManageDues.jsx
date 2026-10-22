import React, { useState, useEffect } from "react";
import api from "../utils/api";
import ModernLayout from "../components/layout/Layout";
import {
  CreditCard,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Trash2,
  Check,
  X,
  Calendar,
  FileText,
  PieChart,
  Smartphone
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../utils/cn";

export default function ManageDues() {
  const [dues, setDues] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("dues"); // 'dues' or 'payments' or 'overview'
  const [verificationLoading, setVerificationLoading] = useState({});
  const [newDue, setNewDue] = useState({
    studentRegNo: "",
    amount: "",
    reason: "",
    dueDate: ""
  });

  const user = JSON.parse(localStorage.getItem("user")) || {};

  useEffect(() => {
    const userRole = user.role?.toLowerCase();
    if (userRole !== "treasurer" && userRole !== "admin") {
      setError("Unauthorized access. Only admins and treasurers can access this page.");
      setLoading(false);
      return;
    }

    fetchDues();
    fetchStudents();
    fetchPendingPayments();
  }, [user.role]);

  const fetchDues = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/dues");
      setDues(response.data.data || []);
    } catch (err) {
      setError("Failed to fetch dues: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get("/students");
      setStudents(response.data?.data || response.data || []);
    } catch (err) {
      console.error("Failed to fetch students:", err);
    }
  };

  const fetchPendingPayments = async () => {
    try {
      const response = await api.get("/dues/pending-payments");
      setPendingPayments(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch pending payments:", err);
    }
  };

  const handleAddDue = async (e) => {
    e.preventDefault();
    try {
      await api.post("/dues", { ...newDue, dueID: Date.now() });
      alert("✅ Due added successfully!");
      setNewDue({ studentRegNo: "", amount: "", reason: "", dueDate: "" });
      setShowAddForm(false);
      fetchDues();
    } catch (err) {
      alert("❌ Failed to add due: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteDue = async (dueID) => {
    if (!window.confirm("Are you sure you want to delete this due?")) return;
    try {
      await api.delete(`/dues/${dueID}`);
      fetchDues();
    } catch (err) {
      alert("❌ Failed to delete due: " + (err.response?.data?.error || err.message));
    }
  };

  const handleVerifyPayment = async (dueID, action, notes = "") => {
    if (!window.confirm(`Are you sure you want to ${action} this payment?`)) return;
    try {
      setVerificationLoading(prev => ({ ...prev, [dueID]: true }));
      await api.put(`/dues/${dueID}/verify`, { action, treasurerNotes: notes });
      alert(`✅ Payment ${action}d successfully!`);
      fetchPendingPayments();
      fetchDues();
    } catch (err) {
      alert(`❌ Failed to ${action} payment: ` + (err.response?.data?.error || err.message));
    } finally {
      setVerificationLoading(prev => ({ ...prev, [dueID]: false }));
    }
  };

  const handleGenerateInstallmentDues = async () => {
    if (!window.confirm("Generate installment dues (Sem 5-8, ₹150) for all students?")) return;
    try {
      setLoading(true);
      const response = await api.post("/dues/generate-installment-dues");
      alert(response.data.message);
      fetchDues();
    } catch (err) {
      alert("Failed to generate installment dues: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const groupDuesByStudent = (duesList) => {
    const studentDues = {};
    duesList.forEach(due => {
      const studentId = due.student?._id || due.student;
      if (!studentDues[studentId]) studentDues[studentId] = { student: due.student, dues: [] };
      studentDues[studentId].dues.push(due);
    });
    return studentDues;
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
        if (semester >= 5 && semester <= 8) semesterDues[semester].push(due);
      }
    });
    return semesterDues;
  };

  const filteredDues = dues.filter(due => {
    const matchesFilter = filter === "all" || due.status === filter;
    const matchesSearch =
      due.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      due.student?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      due.student?.registerNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  if (error && !loading) return <ModernLayout><div className="p-8 text-center text-red-600 font-bold">{error}</div></ModernLayout>;

  const studentDues = groupDuesByStudent(filteredDues);
  const semesterOverview = groupDuesBySemester(dues);

  return (
    <ModernLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-8 h-8 text-blue-600" /> Manage Dues
            </h1>
            <p className="text-slate-500 mt-1">Create and manage student fee payments</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md transition-colors font-medium">
              <Plus size={18} /> Add Due
            </button>
            <button onClick={handleGenerateInstallmentDues} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md transition-colors font-medium disabled:opacity-50">
              <RefreshCw size={18} /> Gen. Sem Dues
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex space-x-1 p-1 bg-slate-100 rounded-xl max-w-fit">
          {[
            { id: 'dues', label: 'Manage Dues', icon: FileText },
            { id: 'payments', label: `Pending Payments (${pendingPayments.length})`, icon: Smartphone },
            { id: 'overview', label: 'Semester Overview', icon: PieChart }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        {activeTab === 'dues' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search student or due reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={20} className="text-slate-400" />
                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
                  <option value="all">All Status</option>
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Pending Verification">Pending Verification</option>
                </select>
              </div>
              <button onClick={fetchDues} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50"><RefreshCw size={20} /></button>
            </div>

            {/* Dues List */}
            <div className="space-y-4">
              {Object.keys(studentDues).length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200">
                  No dues found matching criteria.
                </div>
              ) : (
                Object.values(studentDues).map(({ student, dues: list }) => (
                  <div key={student?._id || 'unknown'} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          {student?.fullName?.[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{student?.fullName}</h3>
                          <p className="text-xs text-slate-500">{student?.registerNumber}</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-600">{list.length} dues</span>
                    </div>
                    <div className="grid gap-3">
                      {list.map(due => (
                        <div key={due._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div>
                            <p className="font-medium text-slate-900">{due.reason}</p>
                            <div className="flex gap-4 text-sm text-slate-500 mt-1">
                              <span className="flex items-center gap-1"><CreditCard size={14} /> {formatCurrency(due.amount)}</span>
                              <span className="flex items-center gap-1"><Calendar size={14} /> Due: {new Date(due.dueDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-3 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-medium",
                              due.status === 'Paid' ? "bg-emerald-100 text-emerald-700" :
                                due.status === 'Unpaid' ? "bg-rose-100 text-rose-700" :
                                  "bg-amber-100 text-amber-700"
                            )}>
                              {due.status}
                            </span>
                            {due.status === "Unpaid" && (
                              <button onClick={() => handleDeleteDue(due.dueID)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Pending Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            {pendingPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
                <Check className="w-16 h-16 text-emerald-400 mb-4" />
                <h3 className="text-xl font-bold text-slate-900">All Caught Up!</h3>
                <p className="text-slate-500">No pending payments to verify.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingPayments.map(payment => (
                  <div key={payment._id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm border-l-4 border-l-amber-400">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-slate-900 text-lg">{payment.student?.fullName}</h4>
                        <p className="text-sm text-slate-500">{payment.student?.registerNumber}</p>
                      </div>
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded">Pending</span>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-500 text-sm">Amount</span>
                        <span className="font-bold text-slate-900">{formatCurrency(payment.amount)}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-500 text-sm">Reason</span>
                        <span className="text-sm font-medium text-right">{payment.reason}</span>
                      </div>
                      {payment.transactionRef && (
                        <div className="flex justify-between border-b border-slate-100 pb-2">
                          <span className="text-slate-500 text-sm">Ref ID</span>
                          <span className="text-sm font-mono">{payment.transactionRef}</span>
                        </div>
                      )}
                      <div className="text-xs text-slate-400 pt-1">
                        Paid on {new Date(payment.paidDate || payment.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleVerifyPayment(payment._id, "approve")}
                        disabled={verificationLoading[payment._id]}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2"
                      >
                        {verificationLoading[payment._id] ? '...' : <><Check size={16} /> Approve</>}
                      </button>
                      <button
                        onClick={() => handleVerifyPayment(payment._id, "reject")}
                        disabled={verificationLoading[payment._id]}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2"
                      >
                        {verificationLoading[payment._id] ? '...' : <><X size={16} /> Reject</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[5, 6, 7, 8].map(sem => {
              const list = semesterOverview[sem] || [];
              const total = list.length;
              const paid = list.filter(d => d.status === 'Paid').length;
              const unpaid = list.filter(d => d.status === 'Unpaid').length;
              const percent = total > 0 ? Math.round((paid / total) * 100) : 0;

              return (
                <div key={sem} className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      Semester {sem}
                    </h3>
                    <span className="text-2xl font-bold text-slate-700">{percent}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-3 bg-slate-100 rounded-full mb-6 overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Total</p>
                      <p className="text-lg font-bold text-slate-900">{total}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl">
                      <p className="text-xs text-emerald-600 uppercase tracking-wider">Paid</p>
                      <p className="text-lg font-bold text-emerald-700">{paid}</p>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-xl">
                      <p className="text-xs text-rose-600 uppercase tracking-wider">Unpaid</p>
                      <p className="text-lg font-bold text-rose-700">{unpaid}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Due Modal */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Add New Due</h2>
                <button onClick={() => setShowAddForm(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
              </div>

              <form onSubmit={handleAddDue} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Student</label>
                  <select
                    value={newDue.studentRegNo}
                    onChange={e => setNewDue({ ...newDue, studentRegNo: e.target.value })}
                    className="w-full mt-1 p-2 rounded-lg border bg-slate-50"
                    required
                  >
                    <option value="">Select Student</option>
                    {students.map(s => <option key={s._id} value={s.registerNumber}>{s.fullName} ({s.registerNumber})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Amount</label>
                    <input type="number" required value={newDue.amount} onChange={e => setNewDue({ ...newDue, amount: e.target.value })} className="w-full mt-1 p-2 rounded-lg border bg-slate-50" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Due Date</label>
                    <input type="date" required value={newDue.dueDate} onChange={e => setNewDue({ ...newDue, dueDate: e.target.value })} className="w-full mt-1 p-2 rounded-lg border bg-slate-50" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Reason</label>
                  <input type="text" required value={newDue.reason} onChange={e => setNewDue({ ...newDue, reason: e.target.value })} className="w-full mt-1 p-2 rounded-lg border bg-slate-50" placeholder="e.g. Semester 5 Fee" />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg border hover:bg-slate-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Due</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

      </div>
    </ModernLayout>
  );
}