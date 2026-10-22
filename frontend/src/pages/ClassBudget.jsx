import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  PieChart,
  Plus,
  RefreshCcw,
  FileText,
  Trash2,
  XCircle,
  AlertCircle
} from "lucide-react";
import api from "../utils/api";
import { getApiData, getApiErrorMessage } from "../utils/apiHelpers";
import { cn } from "../utils/cn";
import ModernLayout from "../components/layout/Layout";

export default function ClassBudget() {
  const [budgets, setBudgets] = useState([]);
  const [currentBudget, setCurrentBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newBudget, setNewBudget] = useState({
    title: "",
    description: "",
    items: [{ name: "", amount: 0 }],
    totalAmount: 0
  });

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const isTreasurer = user.role?.toLowerCase() === "treasurer";
  const isAdmin = user.role?.toLowerCase() === "admin";

  useEffect(() => {
    if (isTreasurer || isAdmin) {
      fetchBudgets();
    } else {
      fetchCurrentBudget();
    }
  }, [isTreasurer, isAdmin]);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/budgets");
      setBudgets(getApiData(response) || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to fetch budgets"));
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentBudget = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/budgets/current");
      setCurrentBudget(getApiData(response));
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to fetch current budget"));
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (items) => {
    return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = newBudget.items.map((item, i) =>
      i === index ? { ...item, [field]: field === 'amount' ? Number(value) || 0 : value } : item
    );
    const total = calculateTotal(updatedItems);
    setNewBudget({ ...newBudget, items: updatedItems, totalAmount: total });
  };

  const addItem = () => {
    const updatedItems = [...newBudget.items, { name: "", amount: 0 }];
    setNewBudget({ ...newBudget, items: updatedItems });
  };

  const removeItem = (index) => {
    const updatedItems = newBudget.items.filter((_, i) => i !== index);
    const total = calculateTotal(updatedItems);
    setNewBudget({ ...newBudget, items: updatedItems, totalAmount: total });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newBudget.title.trim()) {
      alert("Please enter a budget title");
      return;
    }

    try {
      const budgetData = {
        ...newBudget,
        budgetID: Date.now(),
        createdBy: user.name || "Unknown",
        status: "Pending"
      };

      await api.post("/budgets", budgetData);
      alert("Budget proposal submitted successfully!");
      setNewBudget({ title: "", description: "", items: [{ name: "", amount: 0 }], totalAmount: 0 });
      setShowForm(false);
      fetchBudgets();
    } catch (err) {
      alert("Failed to submit budget: " + (err.response?.data?.error || err.message));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) return (
    <ModernLayout>
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    </ModernLayout>
  );

  if (error) return (
    <ModernLayout>
      <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        {error}
      </div>
    </ModernLayout>
  );

  // VIEW: STUDENT (Read Only)
  if (!isTreasurer && !isAdmin) {
    const hasApprovedBudget = currentBudget && currentBudget.total_budget > 0;

    return (
      <ModernLayout>
        <div className="space-y-6">
          <header>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="w-6 h-6 text-blue-600" /> Organization Budget Report
            </h1>
            <p className="text-slate-500 mt-1">
              Transparency report for organization funds.
            </p>
          </header>

          {hasApprovedBudget ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                <div className="p-6">
                  <span className="text-sm font-medium text-slate-500 uppercase">Total Budget</span>
                  <div className="text-2xl font-bold text-slate-900 mt-2">
                    {formatCurrency(currentBudget.total_budget)}
                  </div>
                </div>
                <div className="p-6">
                  <span className="text-sm font-medium text-slate-500 uppercase">Amount Spent</span>
                  <div className="text-2xl font-bold text-rose-600 mt-2">
                    {formatCurrency(currentBudget.spent)}
                  </div>
                </div>
                <div className="p-6">
                  <span className="text-sm font-medium text-slate-500 uppercase">Remaining</span>
                  <div className={cn("text-2xl font-bold mt-2", currentBudget.remaining < 0 ? "text-rose-600" : "text-emerald-600")}>
                    {formatCurrency(currentBudget.remaining)}
                  </div>
                </div>
                <div className="p-6">
                  <span className="text-sm font-medium text-slate-500 uppercase">Last Updated</span>
                  <div className="text-lg font-medium text-slate-700 mt-2">
                    {currentBudget.last_updated || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Expenses Table */}
              {currentBudget.expenses && currentBudget.expenses.length > 0 && (
                <div className="border-t border-slate-200">
                  <div className="p-6 bg-slate-50">
                    <h3 className="font-semibold text-slate-900 mb-4">Expense Breakdown</h3>
                    <div className="space-y-2">
                      {currentBudget.expenses.map((expense, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-200">
                          <span className="font-medium text-slate-700">{expense.item}</span>
                          <span className="font-bold text-slate-900">{formatCurrency(expense.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <RefreshCcw className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Waiting for Report</h3>
              <p className="text-slate-500 max-w-sm mt-2">
                The treasurer has not yet published the budget report for this semester.
              </p>
            </div>
          )}
        </div>
      </ModernLayout>
    );
  }

  // VIEW: TREASURER/ADMIN (Management)
  return (
    <ModernLayout>
      <div className="space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" /> Budget Proposals
            </h2>
            <p className="text-slate-500 mt-1">Manage and propose organization budget allocations.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              {showForm ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? "Cancel" : "New Proposal"}
            </button>
            <button
              onClick={fetchBudgets}
              className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* New Budget Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-blue-100 shadow-lg overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 bg-blue-50/50">
              <h3 className="font-bold text-lg text-slate-900">Create New Proposal</h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Proposal Title *</label>
                  <input
                    type="text"
                    value={newBudget.title}
                    onChange={(e) => setNewBudget({ ...newBudget, title: e.target.value })}
                    placeholder="e.g. Annual Tech Symposium"
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    value={newBudget.description}
                    onChange={(e) => setNewBudget({ ...newBudget, description: e.target.value })}
                    placeholder="Explain the purpose and breakdown..."
                    rows="3"
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100 border-slate-200">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-slate-900">Budget Items</h4>
                    <span className="font-mono font-bold text-blue-600">
                      Total: {formatCurrency(newBudget.totalAmount)}
                    </span>
                  </div>

                  {newBudget.items.map((item, index) => (
                    <div key={index} className="flex gap-3">
                      <input
                        type="text"
                        placeholder="Item Name"
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50"
                      />
                      <input
                        type="number"
                        placeholder="Amount"
                        value={item.amount}
                        onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                        className="w-32 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50"
                      />
                      {newBudget.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(index)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button type="button" onClick={addItem} className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-2">
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md shadow-blue-500/20"
                >
                  Submit Proposal
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Existing Budgets List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-400">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-50 rounded-2xl flex items-center justify-center">
                <FileText className="w-8 h-8 opacity-50" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">No Proposals Yet</h3>
              <p className="text-sm">Create a new budget proposal to get started.</p>
            </div>
          ) : (
            budgets.map((budget) => (
              <motion.div
                key={budget._id || budget.budgetID}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col"
              >
                <div className="p-5 border-b border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg text-slate-900 line-clamp-1">{budget.title}</h4>
                    <span className={cn(
                      "px-2 py-0.5 text-xs font-semibold rounded-full border",
                      budget.status === 'Approved' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        budget.status === 'Rejected' ? "bg-rose-50 text-rose-700 border-rose-200" :
                          "bg-amber-50 text-amber-700 border-amber-200"
                    )}>
                      {budget.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2">{budget.description || "No description provided."}</p>
                </div>

                <div className="p-5 flex-1 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total Amount</span>
                      <span className="font-bold text-slate-900">{formatCurrency(budget.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Proposed By</span>
                      <span className="text-slate-700">{budget.createdBy}</span>
                    </div>
                  </div>

                  {budget.items && budget.items.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Top Items</h5>
                      <ul className="space-y-1">
                        {budget.items.slice(0, 3).map((item, idx) => (
                          <li key={idx} className="flex justify-between text-xs">
                            <span className="text-slate-600 truncate pr-2">{item.name}</span>
                            <span className="font-medium text-slate-900">{formatCurrency(item.amount)}</span>
                          </li>
                        ))}
                        {budget.items.length > 3 && (
                          <li className="text-xs text-blue-500 text-center pt-1">+{budget.items.length - 3} more items</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 flex justify-between items-center rounded-b-xl">
                  <span>Created: {new Date(budget.createdAt).toLocaleDateString()}</span>
                  <span>ID: {budget.budgetID}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </ModernLayout>
  );
}
