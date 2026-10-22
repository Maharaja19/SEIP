import { useState } from "react";
import { X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL } from "../utils/api";

export function AddTransactionDialog({ open, onOpenChange, categories, onAddTransaction }) {
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState(categories[0]?.name || "misc");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const user = JSON.parse(localStorage.getItem("user")) || {};

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (!description.trim()) {
      setError("Description is required");
      return;
    }

    const token = localStorage.getItem("token");

    const newTransaction = {
      type,
      category,
      amount: Number(amount),
      description: description.trim(),
      user: user._id || user.registerNumber,
    };

    try {
      setLoading(true);
      setError("");

      const apiUrl = API_BASE_URL;
      const res = await fetch(`${apiUrl}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(newTransaction),
      });

      const data = await res.json();

      if (res.ok) {
        setAmount("");
        setType("expense");
        setCategory(categories[0]?.name || "misc");
        setDescription("");
        onAddTransaction(data);
        onOpenChange(false);
      } else {
        const errorMsg = data?.message || data?.error || "Unknown error";
        setError(`Error: ${errorMsg}`);
      }
    } catch (err) {
      console.error("Error saving transaction:", err);
      const errorMsg = `Failed to save transaction: ${err.message || "Unknown error"}`;
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={(e) => {
        if (e.target === e.currentTarget) {
          onOpenChange(false);
          setError("");
        }
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        >
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="text-lg font-bold text-slate-900">💸 Add New Transaction</h3>
            <button
              className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
              onClick={() => {
                onOpenChange(false);
                setError("");
              }}
              disabled={loading}
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Transaction Type:</label>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${type === "expense" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-600"}`}
                  onClick={() => setType("expense")}
                  disabled={loading}
                >
                  📉 Expense
                </button>
                <button
                  className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${type === "income" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-600"}`}
                  onClick={() => setType("income")}
                  disabled={loading}
                >
                  📈 Income
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="transaction-category" className="text-sm font-medium text-slate-700">Category:</label>
              <select
                id="transaction-category"
                className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading}
              >
                {categories.map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
                <option value="misc">Miscellaneous</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="transaction-amount" className="text-sm font-medium text-slate-700">Amount (₹):</label>
              <input
                type="number"
                id="transaction-amount"
                className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                min="0.01"
                step="0.01"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="transaction-desc" className="text-sm font-medium text-slate-700">Description:</label>
              <textarea
                id="transaction-desc"
                className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 resize-none"
                placeholder="What was this for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                onKeyDown={handleKeyPress}
                rows="3"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                onClick={() => {
                  onOpenChange(false);
                  setError("");
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-colors flex items-center justify-center gap-2"
                onClick={handleAdd}
                disabled={loading}
              >
                {loading ? "Saving..." : <><Check size={16} /> Add Transaction</>}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}