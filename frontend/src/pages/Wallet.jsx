import React, { useEffect, useState } from "react";
import api from "../utils/api";
import { getApiData, getApiErrorMessage } from "../utils/apiHelpers";
import ModernLayout from "../components/layout/Layout";

export default function Wallet() {
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    const response = await api.get("/features/wallet/balance");
    const data = getApiData(response) || {};
    setBalance(Number(data.balance) || 0);
  };

  useEffect(() => {
    refresh().catch((e) => setError(getApiErrorMessage(e, "Failed to load wallet")));
  }, []);

  const onTopup = async (e) => {
    e.preventDefault();
    setError("");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid top-up amount.");
      return;
    }

    try {
      setLoading(true);
      await api.post("/features/wallet/topup", { amount: amt });
      setAmount("");
      await refresh();
      alert("✅ Wallet topped up successfully");
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || "Top-up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModernLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Student Wallet</h1>
          <p className="text-sm text-slate-600 mt-1">
            Add money once, then pay for multiple events easily (wallet debit).
          </p>
        </header>

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-100 rounded-2xl p-4" role="alert">
            {error}
          </div>
        )}

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide font-medium text-slate-500">Current Balance</div>
              <div className="text-3xl sm:text-4xl font-extrabold text-blue-700 mt-1">
                ₹{Number(balance).toLocaleString()}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">Top up</h2>
          <p className="text-sm text-slate-600 mt-1">MVP: immediate wallet credit.</p>

          <form onSubmit={onTopup} className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-slate-600 uppercase">Amount (INR)</label>
              <input
                type="number"
                min={0}
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="e.g. 500"
                aria-label="Top up amount"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : "Top up wallet"}
            </button>
          </form>
        </section>
      </div>
    </ModernLayout>
  );
}

