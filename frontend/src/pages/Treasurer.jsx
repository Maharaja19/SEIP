import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Wallet,
  Bell,
  FileText,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import api from "../utils/api";
import { cn } from "../utils/cn";
import ModernLayout from "../components/layout/Layout";

export default function Treasurer() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [transactions, setTransactions] = useState([]);
  const [collectionReport, setCollectionReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationLoading, setVerificationLoading] = useState({});
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedDueAmount, setSelectedDueAmount] = useState(0);

  // Budget state
  const [budget, setBudget] = useState({
    total_budget: 0, spent: 0, remaining: 0, last_updated: "", expenses: []
  });

  // Form state
  const [form, setForm] = useState({
    total_budget: "", spent: "", remaining: "", last_updated: "", expenses: [{ item: "", amount: "" }]
  });

  // Summary state
  const [summary, setSummary] = useState({ expenseTotal: 0, remaining: 0 });
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchBudget();
    fetchNotifications();
    if (activeTab === "transactions") fetchTransactions();
    else if (activeTab === "dues") fetchNotifications();
    else if (activeTab === "report") fetchCollectionReport();
  }, [activeTab]);

  useEffect(() => {
    const expenseTotal = (form.expenses || []).reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    const remaining = (parseFloat(form.total_budget) || 0) - expenseTotal;
    setSummary({ expenseTotal, remaining });
  }, [form]);

  const fetchBudget = async () => {
    try {
      const response = await api.get("/budgets/current");
      const budgetData = response.data?.data || response.data || {};
      if (budgetData) {
        setBudget(budgetData);
        setForm({
          total_budget: budgetData.total_budget || "",
          spent: budgetData.spent || "",
          remaining: budgetData.remaining || "",
          last_updated: budgetData.last_updated || "",
          expenses: budgetData.expenses && Array.isArray(budgetData.expenses) ? budgetData.expenses : [{ item: "", amount: "" }]
        });
      }
    } catch (err) {
      console.error("Failed to fetch budget:", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get("/dues/pending-verification");
      setNotifications(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/transactions");
      setTransactions(response.data.data || []);
    } catch (err) {
      setError("Failed to fetch transactions: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectionReport = async () => {
    try {
      setLoading(true);
      setError("");
      const [duesResponse, transactionsResponse] = await Promise.all([
        api.get("/dues/summary/all").catch(() => ({ data: { data: {} } })),
        api.get("/transactions").catch(() => ({ data: { data: [] } }))
      ]);

      const duesSummary = duesResponse.data?.data || duesResponse.data || {};
      const allTransactions = transactionsResponse.data?.data || transactionsResponse.data || [];
      const monthlyData = {};

      allTransactions.forEach(transaction => {
        const date = new Date(transaction.createdAt);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expense: 0, count: 0 };
        if (transaction.type === 'income') monthlyData[monthKey].income += transaction.amount;
        else monthlyData[monthKey].expense += transaction.amount;
        monthlyData[monthKey].count++;
      });

      setCollectionReport({
        dues: duesSummary,
        transactions: {
          total: allTransactions.length,
          totalIncome: allTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
          totalExpense: allTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
        },
        monthly: monthlyData
      });
    } catch (err) {
      setError("Failed to fetch report: " + (err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleExpenseChange = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      expenses: prev.expenses.map((exp, idx) => idx === index ? { ...exp, [field]: value } : exp)
    }));
  };

  const addExpense = () => setForm(prev => ({ ...prev, expenses: [...prev.expenses, { item: "", amount: "" }] }));

  const removeExpense = (index) => setForm(prev => ({ ...prev, expenses: prev.expenses.filter((_, idx) => idx !== index) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await api.post("/budgets", form);
      setBudget(response.data.data);
      alert("✅ Budget updated successfully!");
      fetchBudget();
    } catch (err) {
      alert("❌ Failed to update budget");
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = (amount) => {
    const upiId = (typeof process !== "undefined" && process.env && process.env.REACT_APP_UPI_ID) || "8939811573@axl";
    const upiLink = `upi://pay?pa=${upiId}&pn=Class Treasurer&am=${amount}&cu=INR`;
    return `https://quickchart.io/qr?text=${encodeURIComponent(upiLink)}&size=300`;
  };

  const handleVerifyPayment = async (dueID, action, notes = "") => {
    if (!window.confirm(`Are you sure you want to ${action} this payment?`)) return;
    try {
      setVerificationLoading(prev => ({ ...prev, [dueID]: true }));
      await api.put(`/dues/${dueID}/verify`, { action, treasurerNotes: notes });
      alert(`✅ Payment ${action}d successfully!`);
      fetchNotifications();
    } catch (err) {
      alert(`❌ Failed to ${action} payment`);
    } finally {
      setVerificationLoading(prev => ({ ...prev, [dueID]: false }));
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  const calculateBudgetPercentage = () => !budget.total_budget ? 0 : Math.min(100, Math.round((budget.spent / budget.total_budget) * 100));

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "transactions", label: "Transactions", icon: <Wallet className="w-4 h-4" /> },
    { id: "dues", label: `Verifications (${notifications.length})`, icon: <Bell className="w-4 h-4" /> },
    { id: "report", label: "Reports", icon: <FileText className="w-4 h-4" /> }
  ];


  return (
    <ModernLayout>
      <div className="space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8" role="main" aria-label="Treasurer Console">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" aria-hidden="true" />
              Treasurer Console
            </h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">
              Manage class funds, verify payments, and track budget.
            </p>
          </div>

          <div 
            className="flex flex-wrap gap-2 bg-slate-100 p-1 rounded-xl"
            role="tablist"
            aria-label="Navigation tabs"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`${tab.id}-panel`}
                className={cn(
                  "px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  activeTab === tab.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </header>

        {/* Dashboard Content */}
        {activeTab === "dashboard" && (
          <motion.div 
            id="dashboard-panel"
            role="tabpanel"
            aria-labelledby="dashboard-tab"
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="space-y-6 sm:space-y-8"
          >
            {/* Stats Cards */}
            <section aria-labelledby="budget-stats-heading">
              <h2 id="budget-stats-heading" className="sr-only">Budget Statistics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <article className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity" aria-hidden="true">
                    <Wallet className="w-20 h-20 sm:w-24 sm:h-24 text-blue-600" />
                  </div>
                  <h3 className="text-slate-600 text-xs sm:text-sm font-medium mb-2 sm:mb-3">
                    Total Budget
                  </h3>
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 sm:mt-3">
                    {formatCurrency(budget.total_budget)}
                  </div>
                  <div className="mt-4 sm:mt-5 w-full bg-slate-100 rounded-full h-2" aria-hidden="true">
                    <div className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </article>

                <article className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity" aria-hidden="true">
                    <TrendingDown className="w-20 h-20 sm:w-24 sm:h-24 text-rose-600" />
                  </div>
                  <h3 className="text-slate-600 text-xs sm:text-sm font-medium mb-2 sm:mb-3">
                    Expenses
                  </h3>
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 sm:mt-3">
                    {formatCurrency(budget.spent)}
                  </div>
                  <div 
                    className="mt-4 sm:mt-5 w-full bg-slate-100 rounded-full h-2"
                    role="progressbar"
                    aria-valuenow={calculateBudgetPercentage()}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Budget utilization: ${calculateBudgetPercentage()}%`}
                  >
                    <div className="bg-rose-500 h-2 rounded-full transition-all duration-500" style={{ width: `${calculateBudgetPercentage()}%` }}></div>
                  </div>
                  <p className="text-xs sm:text-sm text-rose-600 mt-2 sm:mt-3 font-medium">
                    {calculateBudgetPercentage()}% Utilized
                  </p>
                </article>

                <article className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity" aria-hidden="true">
                    <TrendingUp className="w-20 h-20 sm:w-24 sm:h-24 text-emerald-600" />
                  </div>
                  <h3 className="text-slate-600 text-xs sm:text-sm font-medium mb-2 sm:mb-3">
                    Remaining
                  </h3>
                  <div className={cn(
                    "text-2xl sm:text-3xl font-bold mt-2 sm:mt-3", 
                    budget.remaining < 0 
                      ? "text-rose-600" 
                      : "text-emerald-600"
                  )}>
                    {formatCurrency(budget.remaining)}
                  </div>
                  <div className="mt-4 sm:mt-5 flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setShowQRCode(true)} 
                      className="text-xs sm:text-sm bg-emerald-100 text-emerald-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-medium hover:bg-emerald-200 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                      aria-label="Generate QR code for payment"
                    >
                      Generate QR
                    </button>
                  </div>
                </article>
              </div>
            </section>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              {/* Left Column: Budget Form */}
              <div className="lg:col-span-2 space-y-6">
                <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900">Update Budget</h3>
                    <div className="text-xs sm:text-sm text-slate-600">
                      Last updated: {budget.last_updated || "Never"}
                    </div>
                  </div>
                  <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 sm:space-y-6" aria-label="Budget update form">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="space-y-1.5 sm:space-y-2">
                        <label htmlFor="total_budget" className="text-xs sm:text-sm font-medium text-slate-600 uppercase">
                          Total Budget
                        </label>
                        <input 
                          id="total_budget"
                          type="number" 
                          name="total_budget" 
                          value={form.total_budget} 
                          onChange={handleChange} 
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          aria-label="Total budget amount"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <label htmlFor="spent" className="text-xs sm:text-sm font-medium text-slate-600 uppercase">
                          Spent
                        </label>
                        <input 
                          id="spent"
                          type="number" 
                          name="spent" 
                          value={form.spent} 
                          onChange={handleChange} 
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          aria-label="Amount spent"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <label htmlFor="remaining" className="text-xs sm:text-sm font-medium text-slate-600 uppercase">
                          Remaining
                        </label>
                        <input 
                          id="remaining"
                          type="number" 
                          name="remaining" 
                          value={form.remaining} 
                          onChange={handleChange} 
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          aria-label="Remaining budget"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs sm:text-sm font-medium text-slate-600 uppercase">
                          Itemized Expenses
                        </label>
                        <button 
                          type="button" 
                          onClick={addExpense} 
                          className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                          aria-label="Add expense item"
                        >
                          <Plus className="w-3 h-3 sm:w-4 sm:h-4" aria-hidden="true" /> 
                          <span>Add Item</span>
                        </button>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar" role="list" aria-label="Expense items">
                        {(form.expenses || []).map((exp, idx) => (
                          <div key={idx} className="flex gap-2 sm:gap-3" role="listitem">
                            <input 
                              type="text" 
                              placeholder="Item Name" 
                              value={exp.item} 
                              onChange={(e) => handleExpenseChange(idx, "item", e.target.value)} 
                              className="flex-1 px-3 sm:px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                              aria-label={`Expense item ${idx + 1} name`}
                            />
                            <input 
                              type="number" 
                              placeholder="Amount" 
                              value={exp.amount} 
                              onChange={(e) => handleExpenseChange(idx, "amount", e.target.value)} 
                              className="w-28 sm:w-32 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                              aria-label={`Expense item ${idx + 1} amount`}
                            />
                            <button 
                              type="button" 
                              onClick={() => removeExpense(idx)} 
                              className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                              aria-label={`Remove expense item ${idx + 1}`}
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 sm:pt-5 border-t border-slate-100 flex justify-end">
                      <button 
                        type="submit" 
                        disabled={loading} 
                        className="px-5 sm:px-6 py-2.5 sm:py-3 bg-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-medium shadow-lg shadow-slate-900/10 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                        aria-label="Save budget changes"
                      >
                        {loading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Save className="w-4 h-4" aria-hidden="true" />
                        )}
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </form>
                </section>
              </div>

              {/* Right Column: Pending Verifications */}
              <div className="space-y-4 sm:space-y-6">
                {/* Live Summary Widget */}
                <section className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 sm:p-6 text-white shadow-xl">
                  <h3 className="font-semibold text-indigo-100 mb-4 sm:mb-5 text-sm sm:text-base">
                    Live Projection
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex justify-between items-center border-b border-white/20 pb-2 sm:pb-3">
                      <span className="text-indigo-100 text-xs sm:text-sm">Projected Expenses</span>
                      <span className="font-bold text-base sm:text-lg">{formatCurrency(summary.expenseTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-indigo-100 text-xs sm:text-sm">Projected Balance</span>
                      <span className={cn(
                        "font-bold text-lg sm:text-xl", 
                        summary.remaining < 0 
                          ? "text-rose-200" 
                          : "text-emerald-200"
                      )}>
                        {formatCurrency(summary.remaining)}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Notifications Widget */}
                <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden h-[400px] flex flex-col">
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm sm:text-base">
                      <Bell className="w-4 h-4 text-amber-500" aria-hidden="true" /> 
                      Pending ({notifications.length})
                    </h3>
                    <button 
                      type="button"
                      onClick={() => setActiveTab('dues')} 
                      className="text-xs sm:text-sm text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                      aria-label="View all pending verifications"
                    >
                      View All
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" role="list" aria-label="Pending payment verifications">
                    {notifications.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500" role="status">
                        <CheckCircle2 className="w-10 h-10 mb-2 opacity-20" aria-hidden="true" />
                        <p className="text-sm">No pending actions</p>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <article key={notif._id} className="p-3 sm:p-4 rounded-xl border border-slate-100 bg-slate-50" role="listitem">
                          <div className="flex justify-between items-start mb-2 sm:mb-3">
                            <span className="font-semibold text-sm sm:text-base text-slate-900">
                              {notif.studentName}
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-slate-700">
                              {formatCurrency(notif.amount)}
                            </span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button 
                              type="button"
                              onClick={() => handleVerifyPayment(notif._id, "approve")} 
                              className="flex-1 py-1.5 sm:py-2 bg-emerald-100 text-emerald-700 rounded-lg text-xs sm:text-sm font-semibold hover:bg-emerald-200 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                              aria-label={`Approve payment for ${notif.studentName}`}
                            >
                              Approve
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleVerifyPayment(notif._id, "reject")} 
                              className="flex-1 py-1.5 sm:py-2 bg-rose-100 text-rose-700 rounded-lg text-xs sm:text-sm font-semibold hover:bg-rose-200 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                              aria-label={`Reject payment for ${notif.studentName}`}
                            >
                              Reject
                            </button>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        )}

        {/* Transactions Tab Content */}
        {activeTab === "transactions" && (
          <motion.div 
            id="transactions-panel"
            role="tabpanel"
            aria-labelledby="transactions-tab"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" role="table" aria-label="Transaction history">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs">
                      Date
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs">
                      Description
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs">
                      Method
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs text-right">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-slate-600 whitespace-nowrap text-xs sm:text-sm">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 font-medium text-slate-900 text-sm sm:text-base">
                        {tx.description}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className="px-2 py-1 rounded text-xs bg-slate-100 text-slate-600 border border-slate-200">
                          {tx.paymentMethod}
                        </span>
                      </td>
                      <td className={cn(
                        "px-4 sm:px-6 py-3 sm:py-4 text-right font-bold text-sm sm:text-base", 
                        tx.type === 'income' 
                          ? 'text-emerald-600' 
                          : 'text-rose-600'
                      )}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-10 sm:py-12 text-center text-slate-500" role="status">
                        No transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Dues Tab Content */}
        {activeTab === "dues" && (
          <motion.div 
            id="dues-panel"
            role="tabpanel"
            aria-labelledby="dues-tab"
            initial={{ opacity: 1 }} 
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"
          >
            {notifications.map(notif => (
              <article key={notif._id} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base sm:text-lg text-slate-900 truncate">
                      {notif.studentName}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      {new Date(notif.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg sm:text-xl font-bold text-slate-900">
                      {formatCurrency(notif.amount)}
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      UPI
                    </span>
                  </div>
                </div>

                <div className="p-3 sm:p-4 bg-slate-50 rounded-xl space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Ref No:</span> 
                    <span className="font-mono text-slate-700 break-all text-right ml-2">
                      {notif.transactionRef || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">UPI ID:</span> 
                    <span className="font-mono text-slate-700 break-all text-right ml-2">
                      {notif.upiTransactionId || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-auto">
                  <button 
                    type="button"
                    onClick={() => handleVerifyPayment(notif._id, "approve")} 
                    disabled={verificationLoading[notif._id]} 
                    className="py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/20 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    aria-label={`Approve payment for ${notif.studentName}`}
                  >
                    {verificationLoading[notif._id] ? (
                      <span className="text-xs">...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> 
                        <span className="text-xs sm:text-sm">Approve</span>
                      </>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleVerifyPayment(notif._id, "reject")} 
                    disabled={verificationLoading[notif._id]} 
                    className="py-2.5 sm:py-3 bg-white border-2 border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl font-medium transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                    aria-label={`Reject payment for ${notif.studentName}`}
                  >
                    {verificationLoading[notif._id] ? (
                      <span className="text-xs">...</span>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" aria-hidden="true" /> 
                        <span className="text-xs sm:text-sm">Reject</span>
                      </>
                    )}
                  </button>
                </div>
              </article>
            ))}
            {notifications.length === 0 && (
              <div className="col-span-full py-16 sm:py-20 text-center text-slate-500" role="status">
                <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-20" aria-hidden="true" />
                <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                  All caught up! No pending verifications.
                </h3>
              </div>
            )}
          </motion.div>
        )}

        {/* QR Code Modal */}
        <AnimatePresence>
          {showQRCode && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="qr-modal-title"
            >
              <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                onClick={() => setShowQRCode(false)}
                aria-hidden="true"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center space-y-5 sm:space-y-6"
              >
                <h3 id="qr-modal-title" className="text-lg sm:text-xl font-bold text-slate-900">
                  Scan to Pay
                </h3>
                <div className="p-4 bg-white rounded-xl shadow border border-slate-100 mx-auto w-fit">
                  <img 
                    src={generateQRCode(selectedDueAmount || 100)} 
                    alt="UPI QR Code for payment" 
                    className="w-40 h-40 sm:w-48 sm:h-48"
                  />
                </div>
                <div className="space-y-3 sm:space-y-4">
                  <label htmlFor="qr-amount" className="sr-only">Enter payment amount</label>
                  <input 
                    id="qr-amount"
                    type="number" 
                    placeholder="Enter Amount" 
                    value={selectedDueAmount} 
                    onChange={(e) => setSelectedDueAmount(e.target.value)} 
                    className="w-full text-center text-xl sm:text-2xl font-bold py-2 border-b-2 border-slate-200 focus:border-blue-500 dark:focus:border-blue-400 outline-none bg-transparent text-slate-900"
                    aria-label="Payment amount for QR code"
                  />
                  <p className="text-xs sm:text-sm text-slate-600">
                    Enter amount to update QR code
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowQRCode(false)} 
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                  aria-label="Close QR code modal"
                >
                  Close
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ModernLayout>
  );
}