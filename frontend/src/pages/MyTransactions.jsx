import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { getApiData, getApiErrorMessage } from "../utils/apiHelpers";
import { motion } from "framer-motion";
import {
  FileText,
  Search,
  Calendar,
  Filter,
  Download,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Receipt
} from "lucide-react";
import ModernLayout from "../components/layout/Layout";
import { useAuth } from "../context/AuthContext";

export default function MyTransactions() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/transactions/me");
      const raw = getApiData(response);
      const normalized = (Array.isArray(raw) ? raw : []).map((tx) => ({
        ...tx,
        id: tx.id || tx.transactionRef || tx._id,
        description: tx.description || tx.reason || "Transaction",
        amount: Number(tx.amount || 0),
        date: tx.date || tx.createdAt,
        type: String(tx.type || "expense").toLowerCase(),
        status: String(tx.status || "success").toLowerCase(),
        category: tx.category || tx.paymentMethod || "General",
      }));
      setTransactions(normalized);
    } catch (err) {
      setTransactions([]);
      setError(getApiErrorMessage(err, "Failed to load transactions"));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'success': return 'bg-emerald-100 text-emerald-700 text-emerald-600';
      case 'pending': return 'bg-amber-100 text-amber-700 text-amber-600';
      case 'failed': return 'bg-red-100 text-red-700 text-red-600';
      default: return 'bg-slate-100 text-slate-700 text-slate-600';
    }
  };

  const filteredTransactions = transactions.filter(t =>
    String(t.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(t.id || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSpent = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalCredits = transactions
    .filter((t) => t.type === "income")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const handleExportCsv = () => {
    if (!filteredTransactions.length) return;
    const rows = [
      ["ID", "Description", "Date", "Category", "Status", "Type", "Amount"],
      ...filteredTransactions.map((t) => [
        t.id || "",
        t.description || "",
        t.date ? new Date(t.date).toISOString() : "",
        t.category || "",
        t.status || "",
        t.type || "",
        t.amount || 0,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `my-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Skeleton Loaders
  const StatCardSkeleton = () => (
    <div 
      className="bg-white bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 border-slate-200 shadow-sm animate-pulse"
      role="status"
      aria-label="Loading statistics"
    >
      <div className="float-right p-3 bg-slate-200 rounded-xl w-12 h-12"></div>
      <div className="h-4 w-32 bg-slate-200 rounded mb-3"></div>
      <div className="h-8 w-40 bg-slate-200 rounded mb-2"></div>
      <div className="h-4 w-24 bg-slate-200 rounded"></div>
    </div>
  );

  const TableRowSkeleton = () => (
    <tr className="animate-pulse">
      <td className="px-4 sm:px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
      <td className="px-4 sm:px-6 py-4"><div className="h-4 w-32 bg-slate-200 rounded"></div></td>
      <td className="px-4 sm:px-6 py-4"><div className="h-4 w-20 bg-slate-200 rounded"></div></td>
      <td className="px-4 sm:px-6 py-4"><div className="h-4 w-16 bg-slate-200 rounded"></div></td>
      <td className="px-4 sm:px-6 py-4"><div className="h-5 w-16 bg-slate-200 rounded-full mx-auto"></div></td>
      <td className="px-4 sm:px-6 py-4 text-right"><div className="h-4 w-20 bg-slate-200 rounded ml-auto"></div></td>
    </tr>
  );

  if (!user) {
    return (
      <ModernLayout>
        <div 
          className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 sm:px-6"
          role="alert"
          aria-live="polite"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
            <span aria-hidden="true">⚠️</span> Authentication Required
          </h2>
          <button 
            type="button"
            onClick={() => navigate("/login")} 
            className="mt-4 sm:mt-6 px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg sm:rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Navigate to login page"
          >
            Go to Login
          </button>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout>
      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" role="main" aria-label="My Transactions">
        {/* Header Stats */}
        <section aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="sr-only">Transaction Statistics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {loading ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <article className="bg-white bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 border-slate-200 shadow-sm">
                  <div className="float-right p-3 bg-blue-50 rounded-xl text-blue-600" aria-hidden="true">
                    <Receipt size={24} />
                  </div>
                  <p className="text-slate-600 text-slate-600 text-xs sm:text-sm font-medium mb-2">
                    Total Transactions
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 text-slate-900 mt-1">
                    {transactions.length}
                  </h3>
                  <div className="flex items-center gap-1 mt-2 sm:mt-3 text-emerald-600 text-xs sm:text-sm font-medium">
                    <ArrowUpRight size={16} aria-hidden="true" /> 
                    <span>12 new this month</span>
                  </div>
                </article>

                <article className="bg-white bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 border-slate-200 shadow-sm">
                  <div className="float-right p-3 bg-rose-50 rounded-xl text-rose-600" aria-hidden="true">
                    <TrendingDown size={24} />
                  </div>
                  <p className="text-slate-600 text-slate-600 text-xs sm:text-sm font-medium mb-2">
                    Total Spent
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 text-slate-900 mt-1">
                    {formatCurrency(totalSpent)}
                  </h3>
                  <div className="flex items-center gap-1 mt-2 sm:mt-3 text-rose-600 text-xs sm:text-sm font-medium">
                    <ArrowUpRight size={16} aria-hidden="true" /> 
                    <span>8% vs last month</span>
                  </div>
                </article>

                <article className="bg-white bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 border-slate-200 shadow-sm">
                  <div className="float-right p-3 bg-emerald-50 rounded-xl text-emerald-600" aria-hidden="true">
                    <TrendingUp size={24} />
                  </div>
                  <p className="text-slate-600 text-slate-600 text-xs sm:text-sm font-medium mb-2">
                    Refunds / Credits
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 text-slate-900 mt-1">
                    {formatCurrency(totalCredits)}
                  </h3>
                  <div className="text-slate-500 text-xs sm:text-sm mt-2 sm:mt-3">
                    {totalCredits > 0 ? "Credits received" : "No credits yet"}
                  </div>
                </article>
              </>
            )}
          </div>
        </section>

        {!loading && error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Main Content */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 sm:p-5 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-3 sm:gap-4">
            <div className="relative flex-1 max-w-md">
              <label htmlFor="transaction-search" className="sr-only">Search transactions</label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} aria-hidden="true" />
              <input
                id="transaction-search"
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm sm:text-base"
                aria-label="Search transactions by description or ID"
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                type="button"
                className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600 font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                aria-label="Filter transactions"
              >
                <Filter size={16} aria-hidden="true" />
                <span>Filter</span>
              </button>
              <button 
                type="button"
                onClick={handleExportCsv}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl transition-colors font-medium text-xs sm:text-sm shadow-lg shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Export transactions"
                disabled={!filteredTransactions.length}
              >
                <Download size={16} aria-hidden="true" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Table Header */}
          <div className="overflow-x-auto">
            <table className="w-full text-left" role="table" aria-label="Transaction history">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-xs uppercase text-slate-600 text-slate-600 font-semibold tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-xs uppercase text-slate-600 text-slate-600 font-semibold tracking-wider">
                    Description
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-xs uppercase text-slate-600 text-slate-600 font-semibold tracking-wider">
                    Date
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-xs uppercase text-slate-600 text-slate-600 font-semibold tracking-wider">
                    Category
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-xs uppercase text-slate-600 text-slate-600 font-semibold tracking-wider">
                    Status
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-xs uppercase text-slate-600 font-semibold tracking-wider text-right">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <>
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                  </>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 sm:py-16 text-center" role="status">
                      <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <FileText className="text-slate-400" size={32} aria-hidden="true" />
                      </div>
                      <h3 className="text-base sm:text-lg font-medium text-slate-900">No transactions found</h3>
                      <p className="text-slate-600 mt-1 text-sm sm:text-base">
                        Try adjusting your search or filters
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((t, idx) => (
                    <motion.tr
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group hover:bg-slate-50 transition-colors"
                      role="row"
                    >
                      <td className="px-4 sm:px-6 py-3 sm:py-4 font-mono text-xs sm:text-sm text-slate-600">
                        {t.id}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <p className="font-medium text-slate-900 text-sm sm:text-base">
                          {t.description}
                        </p>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-slate-600 text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} aria-hidden="true" />
                          <span>{formatDate(t.date)}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className="inline-block px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          {t.category}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(t.status)}`} aria-label={`Transaction status: ${t.status}`}>
                          {t.status === 'success' && '● Paid'}
                          {t.status === 'pending' && '● Pending'}
                          {t.status === 'failed' && '● Failed'}
                        </span>
                      </td>
                      <td className={`px-4 sm:px-6 py-3 sm:py-4 text-right font-bold text-sm sm:text-base ${t.type === 'income' ? 'text-emerald-600 text-emerald-600' : 'text-slate-900 text-slate-900'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer (Static for now) */}
          {!loading && filteredTransactions.length > 0 && (
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <p className="text-xs sm:text-sm text-slate-600 text-slate-600">
                Showing <span className="font-medium text-slate-900 text-slate-900">{filteredTransactions.length}</span> results
              </p>
              <div className="flex gap-2">
                <button 
                  type="button"
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-slate-200 border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-2"
                  disabled
                  aria-label="Previous page"
                >
                  Previous
                </button>
                <button 
                  type="button"
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-slate-200 border-slate-200 rounded-lg hover:bg-slate-50 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-2"
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </ModernLayout>
  );
}
