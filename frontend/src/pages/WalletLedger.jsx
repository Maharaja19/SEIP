import React, { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { getApiData, getApiErrorMessage } from "../utils/apiHelpers";
import ModernLayout from "../components/layout/Layout";

export default function WalletLedger() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState(0);
  const [ledgerItems, setLedgerItems] = useState([]);

  const totalTopups = useMemo(
    () => ledgerItems.filter((i) => i.type === "TOPUP").reduce((s, i) => s + (Number(i.amount) || 0), 0),
    [ledgerItems]
  );
  const totalDebits = useMemo(
    () => ledgerItems.filter((i) => i.type === "EVENT_PAYMENT_DEBIT").reduce((s, i) => s + (Number(i.amount) || 0), 0),
    [ledgerItems]
  );

  const fetchLedger = async () => {
    try {
      setLoading(true);
      setError("");
      const resp = await api.get("/features/wallet/ledger?limit=50");
      const payload = getApiData(resp) || {};
      setBalance(Number(payload.balance) || 0);
      setLedgerItems(Array.isArray(payload.ledgerItems) ? payload.ledgerItems : []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load ledger"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  return (
    <ModernLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Wallet Ledger</h1>
          <p className="text-sm text-slate-600 mt-1">Transparent top-ups and event wallet debits.</p>
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
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide font-medium text-slate-500">Last 50 items</div>
              <div className="text-sm text-slate-700 mt-2">
                Top-ups: <span className="font-bold text-emerald-700">₹{totalTopups.toLocaleString()}</span>
              </div>
              <div className="text-sm text-slate-700">
                Wallet debits: <span className="font-bold text-rose-700">₹{totalDebits.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Activity</h2>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-600">Loading...</div>
          ) : ledgerItems.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">No wallet activity yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-600">Date</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Type</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Note</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-right">Amount</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerItems.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            "px-2 py-1 rounded-lg border text-xs font-semibold",
                            item.type === "TOPUP"
                              ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                              : item.type === "EVENT_PAYMENT_DEBIT"
                              ? "bg-rose-50 border-rose-100 text-rose-700"
                              : "bg-slate-50 border-slate-200 text-slate-700",
                          ].join(" ")}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[260px] truncate" title={item.note || ""}>
                        {item.note || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        ₹{Number(item.amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-blue-700">
                        ₹{Number(item.balanceAfter).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </ModernLayout>
  );
}

