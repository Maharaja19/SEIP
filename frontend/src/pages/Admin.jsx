import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  BarChart,
  History,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Briefcase
} from "lucide-react";
import api from "../utils/api";
import { cn } from "../utils/cn";
import ModernLayout from "../components/layout/Layout";
import AuditLogs from "../features/admin/AuditLogs";

export default function Admin() {
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New transaction state
  const [newTransaction, setNewTransaction] = useState({
    description: "",
    amount: "",
    type: "expense",
    category: "misc"
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [budgetRes, transactionRes] = await Promise.all([
        api.get("/budgets").catch(() => ({ data: { data: [] } })),
        api.get("/transactions").catch(() => ({ data: { data: [] } }))
      ]);

      const budgetData = budgetRes.data.data || budgetRes.data || [];
      const transactionData = transactionRes.data.data || transactionRes.data || [];

      // Process Categories
      if (Array.isArray(budgetData)) {
        const loadedCategories = budgetData.map((b, idx) => ({
          id: (b._id || idx).toString(),
          name: b.title,
          budgeted: Number(b.totalAmount) || 0,
          spent: 0,
          color: b.color || "bg-blue-500",
        }));

        // Calculate spent per category based on transactions
        if (Array.isArray(transactionData)) {
          const processedTransactions = transactionData.map(t => ({
            ...t,
            amount: Number(t.amount) || 0,
            date: new Date(t.createdAt).toLocaleDateString()
          }));

          loadedCategories.forEach(cat => {
            cat.spent = processedTransactions
              .filter(t => t.type === "expense" && t.category === cat.name)
              .reduce((sum, t) => sum + t.amount, 0);
          });

          setCategories(loadedCategories);
          setTransactions(processedTransactions);
        }
      }
    } catch (err) {
      setError("Failed to load admin data: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async (e) => {
    e.preventDefault();
    if (!newTransaction.amount || !newTransaction.description) return;

    try {
      const payload = {
        ...newTransaction,
        amount: Number(newTransaction.amount),
        user: user?._id || user?.id || JSON.parse(localStorage.getItem("user") || "{}")._id,
        paymentMethod: "Cash"
      };

      const res = await api.post("/transactions", payload);

      // Optimistic update
      const savedTransaction = res.data || payload;
      setTransactions(prev => [savedTransaction, ...prev]); // Add to top

      // Update categories if expense
      if (savedTransaction.type === "expense") {
        setCategories(prev => prev.map(cat =>
          cat.name === savedTransaction.category
            ? { ...cat, spent: cat.spent + savedTransaction.amount }
            : cat
        ));
      }

      setIsAddTransactionOpen(false);
      setNewTransaction({ description: "", amount: "", type: "expense", category: "misc" });
      alert("✅ Transaction added successfully!");
    } catch (err) {
      alert("Failed to save transaction: " + (err.response?.data?.error || err.message));
    }
  };

  const deleteTransaction = async (id) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;

    const transaction = transactions.find((t) => (t._id || t.id) === id);
    if (!transaction) return;

    try {
      await api.delete(`/transactions/${id}`);

      setTransactions(prev => prev.filter(t => (t._id || t.id) !== id));

      if (transaction.type === "expense") {
        setCategories(prev => prev.map(cat =>
          cat.name === transaction.category
            ? { ...cat, spent: Math.max(0, cat.spent - transaction.amount) }
            : cat
        ));
      }
    } catch (err) {
      alert("Failed to delete transaction: " + (err.message));
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const totalBudget = categories.reduce((sum, cat) => sum + cat.budgeted, 0);
  const totalIncome = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

  // Skeleton Loaders
  const KPICardSkeleton = () => (
    <div 
      className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm animate-pulse"
      role="status"
      aria-label="Loading statistics"
    >
      <div className="h-4 w-32 bg-slate-200 rounded mb-3"></div>
      <div className="h-8 w-40 bg-slate-200 rounded"></div>
    </div>
  );

  const CategoryProgressSkeleton = () => (
    <div className="space-y-3 animate-pulse">
      <div className="flex justify-between">
        <div className="h-4 w-24 bg-slate-200 rounded"></div>
        <div className="h-4 w-28 bg-slate-200 rounded"></div>
      </div>
      <div className="h-2.5 w-full bg-slate-200 rounded-full"></div>
    </div>
  );

  return (
    <ModernLayout>
      <div className="space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8" role="main" aria-label="Admin Console">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500" aria-hidden="true" /> 
              Admin Console
            </h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">
              Superuser controls and financial oversight.
            </p>
          </div>

          <div className="flex bg-white p-1 rounded-xl border border-slate-200" role="tablist" aria-label="Navigation tabs">
            <button
              type="button"
              onClick={() => setActivePage("dashboard")}
              role="tab"
              aria-selected={activePage === "dashboard"}
              aria-controls="dashboard-panel"
              className={cn(
                "px-3 sm:px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                activePage === "dashboard" 
                  ? "bg-slate-100 text-slate-900" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <BarChart className="w-4 h-4" aria-hidden="true" /> 
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePage("history")}
              role="tab"
              aria-selected={activePage === "history"}
              aria-controls="history-panel"
              className={cn(
                "px-3 sm:px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                activePage === "history" 
                  ? "bg-slate-100 text-slate-900" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <History className="w-4 h-4" aria-hidden="true" /> 
              <span>Transactions</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePage("audit")}
              role="tab"
              aria-selected={activePage === "audit"}
              aria-controls="audit-panel"
              className={cn(
                "px-3 sm:px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                activePage === "audit"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <History className="w-4 h-4" aria-hidden="true" /> 
              <span>Audit Trail</span>
            </button>
          </div>
        </header>

        {loading ? (
          <div 
            className="space-y-6 sm:space-y-8"
            role="status"
            aria-label="Loading admin data"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <KPICardSkeleton />
              <KPICardSkeleton />
              <KPICardSkeleton />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
              <div className="h-6 w-40 bg-slate-200 rounded mb-6"></div>
              <div className="space-y-4">
                <CategoryProgressSkeleton />
                <CategoryProgressSkeleton />
                <CategoryProgressSkeleton />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <section aria-labelledby="kpi-heading">
              <h2 id="kpi-heading" className="sr-only">Key Performance Indicators</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <article className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-slate-600 text-slate-600 text-xs sm:text-sm font-medium uppercase tracking-wider">
                    Total Allocated Budget
                  </span>
                  <div className="mt-3 sm:mt-4 flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-bold text-slate-900">
                      {formatCurrency(totalBudget)}
                    </span>
                  </div>
                </article>
                <article className="bg-white bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute right-0 top-0 p-4 opacity-5 opacity-5" aria-hidden="true">
                    <TrendingUp className="w-20 h-20 text-emerald-600" />
                  </div>
                  <span className="text-slate-600 text-slate-600 text-xs sm:text-sm font-medium uppercase tracking-wider">
                    Total Income
                  </span>
                  <div className="mt-3 sm:mt-4 flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-bold text-emerald-600">
                      {formatCurrency(totalIncome)}
                    </span>
                  </div>
                </article>
                <article className="bg-white bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute right-0 top-0 p-4 opacity-5 opacity-5" aria-hidden="true">
                    <TrendingDown className="w-20 h-20 text-rose-600" />
                  </div>
                  <span className="text-slate-600 text-slate-600 text-xs sm:text-sm font-medium uppercase tracking-wider">
                    Total Expenses
                  </span>
                  <div className="mt-3 sm:mt-4 flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-bold text-rose-600">
                      {formatCurrency(totalExpenses)}
                    </span>
                  </div>
                </article>
              </div>
            </section>

            {/* Content Switcher */}
            {activePage === "dashboard" && (
              <div 
                id="dashboard-panel"
                role="tabpanel"
                aria-labelledby="dashboard-tab"
                className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8"
              >
                {/* Category Progress */}
                <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
                  <h3 className="font-bold text-lg sm:text-xl text-slate-900 mb-6 sm:mb-8">
                    Budget vs Actuals
                  </h3>
                  <div className="space-y-5 sm:space-y-6" role="list" aria-label="Budget categories">
                    {categories.map((cat, idx) => {
                      const percent = Math.min(100, Math.round((cat.spent / cat.budgeted) * 100)) || 0;
                      return (
                        <article key={idx} role="listitem" aria-label={`${cat.name}: ${percent}% used`}>
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2 sm:mb-3">
                            <span className="font-medium text-sm sm:text-base text-slate-700">
                              {cat.name}
                            </span>
                            <span className="text-xs sm:text-sm text-slate-600">
                              {formatCurrency(cat.spent)} / {formatCurrency(cat.budgeted)}
                            </span>
                          </div>
                          <div 
                            className="h-2.5 sm:h-3 w-full bg-slate-100 bg-slate-100 rounded-full overflow-hidden"
                            role="progressbar"
                            aria-valuenow={percent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${cat.name} budget usage: ${percent}%`}
                          >
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500", 
                                percent > 100 
                                  ? "bg-rose-600" 
                                  : "bg-blue-600"
                              )}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </article>
                      );
                    })}
                    {categories.length === 0 && (
                      <p className="text-slate-500 text-center py-8 text-sm sm:text-base" role="status">
                        No budget categories defined.
                      </p>
                    )}
                  </div>
                </section>

                {/* Operational Tools */}
                <section className="space-y-6">
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-8 shadow-xl">
                    <h3 className="font-bold text-lg sm:text-xl mb-2 sm:mb-3 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" /> 
                      Admin Actions
                    </h3>
                    <p className="text-slate-300 text-sm sm:text-base mb-6 sm:mb-8">
                      Quickly record ad-hoc transactions used for class activities.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAddTransactionOpen(true)}
                      aria-label="Open dialog to record new transaction"
                      className="w-full py-3 sm:py-3.5 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900"
                    >
                      <Plus className="w-5 h-5" aria-hidden="true" /> 
                      <span>Record New Transaction</span>
                    </button>
                  </div>
                </section>
              </div>
            )}

            {activePage === "history" && (
              <div 
                id="history-panel"
                role="tabpanel"
                aria-labelledby="history-tab"
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
              >
                <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                  <h3 className="font-bold text-lg sm:text-xl text-slate-900">Transaction Logs</h3>
                  <button 
                    type="button"
                    onClick={() => setIsAddTransactionOpen(true)} 
                    className="text-sm sm:text-base text-blue-600 font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                    aria-label="Add new transaction"
                  >
                    + Add New
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm" role="table" aria-label="Transaction history">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-slate-600 uppercase font-semibold text-xs">
                          Date
                        </th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-slate-600 text-slate-600 uppercase font-semibold text-xs">
                          Description
                        </th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-slate-600 text-slate-600 uppercase font-semibold text-xs">
                          Category
                        </th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-right text-slate-600 uppercase font-semibold text-xs">
                          Amount
                        </th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-center text-slate-600 uppercase font-semibold text-xs">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.map((tx, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-slate-600 whitespace-nowrap text-xs sm:text-sm">
                            {tx.date}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 font-medium text-slate-900 text-sm sm:text-base">
                            {tx.description}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            <span className="px-2 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-600">
                              {tx.category || 'General'}
                            </span>
                          </td>
                          <td className={cn(
                            "px-4 sm:px-6 py-3 sm:py-4 text-right font-bold text-sm sm:text-base", 
                            tx.type === 'income' 
                              ? "text-emerald-600" 
                              : "text-rose-600"
                          )}>
                            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                            <button
                              type="button"
                              onClick={() => deleteTransaction(tx._id || tx.id)}
                              aria-label={`Delete transaction: ${tx.description}`}
                              className="p-2 text-slate-400 hover:text-rose-600 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-6 py-10 sm:py-12 text-center text-slate-500" role="status">
                            No transactions found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activePage === "audit" && (
              <div
                id="audit-panel"
                role="tabpanel"
                aria-labelledby="audit-tab"
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
              >
                <div className="p-4 sm:p-6 border-b border-slate-100">
                  <h3 className="font-bold text-lg sm:text-xl text-slate-900">Event Audit Trail</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Filters to event/wallet actions (vote, execute, wallet debit, reminders).
                  </p>
                </div>
                <AuditLogs />
              </div>
            )}

            {/* Add Transaction Modal */}
            <AnimatePresence>
              {isAddTransactionOpen && (
                <div 
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="transaction-modal-title"
                >
                  <motion.div
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    onClick={() => setIsAddTransactionOpen(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    aria-hidden="true"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
                  >
                    <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50">
                      <h3 id="transaction-modal-title" className="font-bold text-lg sm:text-xl text-slate-900">
                        Record Transaction
                      </h3>
                    </div>
                    <form onSubmit={addTransaction} className="p-5 sm:p-6 space-y-4 sm:space-y-5">
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1.5 sm:space-y-2">
                          <label htmlFor="transaction-type" className="text-xs sm:text-sm font-semibold text-slate-600 uppercase">
                            Type
                          </label>
                          <select
                            id="transaction-type"
                            value={newTransaction.type}
                            onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value })}
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 border-slate-200 bg-white bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            aria-label="Transaction type"
                          >
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                          </select>
                        </div>
                        <div className="space-y-1.5 sm:space-y-2">
                          <label htmlFor="transaction-amount" className="text-xs sm:text-sm font-semibold text-slate-600 uppercase">
                            Amount
                          </label>
                          <input
                            id="transaction-amount"
                            type="number"
                            placeholder="0.00"
                            value={newTransaction.amount}
                            onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 border-slate-200 bg-white bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            required
                            aria-label="Transaction amount"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <label htmlFor="transaction-description" className="text-xs sm:text-sm font-semibold text-slate-600 uppercase">
                          Description
                        </label>
                        <input
                          id="transaction-description"
                          type="text"
                          placeholder="What was this for?"
                          value={newTransaction.description}
                          onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 border-slate-200 bg-white bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          required
                          aria-label="Transaction description"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <label htmlFor="transaction-category" className="text-xs sm:text-sm font-semibold text-slate-600 uppercase">
                          Category
                        </label>
                        <input
                          id="transaction-category"
                          type="text"
                          placeholder="e.g. Events, Logistics"
                          value={newTransaction.category}
                          onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 border-slate-200 bg-white bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          aria-label="Transaction category"
                        />
                      </div>

                      <div className="pt-4 sm:pt-5 flex gap-3 sm:gap-4">
                        <button 
                          type="button" 
                          onClick={() => setIsAddTransactionOpen(false)} 
                          className="flex-1 py-2.5 sm:py-3 text-slate-700 hover:bg-slate-50 rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                          aria-label="Cancel transaction"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="flex-1 py-2.5 sm:py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 shadow-lg shadow-slate-900/10 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                          aria-label="Save transaction record"
                        >
                          Save Record
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </ModernLayout>
  );
}