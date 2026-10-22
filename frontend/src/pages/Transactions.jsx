import React, { useState, useEffect } from "react";
import api from "../utils/api";
import ModernLayout from "../components/layout/Layout";
import { Search, Filter, RefreshCw, ArrowUp, ArrowDown, DollarSign, Calendar, Tag, CreditCard, FileText } from "lucide-react";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchTransactions();
  }, []);

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

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    const matchesFilter = filter === "all" || transaction.type === filter;
    const matchesSearch =
      (transaction.description && transaction.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (transaction.category && transaction.category.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  // Calculate totals
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  if (loading && transactions.length === 0) {
    return (
      <ModernLayout>
        <div className="flex justify-center items-center h-full min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
        </div>
      </ModernLayout>
    );
  }

  // Skeleton Loaders
  const StatCardSkeleton = () => (
    <div 
      className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden animate-pulse"
      role="status"
      aria-label="Loading statistics"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <div className="w-16 h-16 bg-slate-200 rounded"></div>
      </div>
      <div className="h-4 w-32 bg-slate-200 rounded mb-3"></div>
      <div className="h-8 w-40 bg-slate-200 rounded"></div>
    </div>
  );

  return (
    <ModernLayout>
      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" role="main" aria-label="All Transactions">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" aria-hidden="true" /> 
              All Transactions
            </h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">
              View and monitor all financial transactions
            </p>
          </div>
          <button
            type="button"
            onClick={fetchTransactions}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Refresh transactions"
          >
            <RefreshCw size={16} aria-hidden="true" /> 
            <span>Refresh</span>
          </button>
        </header>

        {/* Stats Cards */}
        <section aria-labelledby="transaction-stats-heading">
          <h2 id="transaction-stats-heading" className="sr-only">Transaction Statistics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {loading && transactions.length === 0 ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <article className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10" aria-hidden="true">
                    <DollarSign size={64} className="text-emerald-600" />
                  </div>
                  <p className="text-slate-600 text-xs sm:text-sm font-medium mb-2">
                    Total Income
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-2">
                    {formatCurrency(totalIncome)}
                  </h3>
                </article>
                <article className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10" aria-hidden="true">
                    <DollarSign size={64} className="text-rose-600" />
                  </div>
                  <p className="text-slate-600 text-xs sm:text-sm font-medium mb-2">
                    Total Expense
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-rose-600 mt-2">
                    {formatCurrency(totalExpense)}
                  </h3>
                </article>
                <article className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10" aria-hidden="true">
                    <DollarSign size={64} className="text-blue-600" />
                  </div>
                  <p className="text-slate-600 text-xs sm:text-sm font-medium mb-2">
                    Net Balance
                  </p>
                  <h3 className={`text-2xl sm:text-3xl font-bold mt-2 ${totalIncome - totalExpense >= 0 ? "text-blue-600" : "text-amber-600"}`}>
                    {formatCurrency(totalIncome - totalExpense)}
                  </h3>
                </article>
              </>
            )}
          </div>
        </section>

        {/* Filters & Search */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <label htmlFor="transaction-search" className="sr-only">Search transactions</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} aria-hidden="true" />
            <input
              id="transaction-search"
              type="text"
              placeholder="Search by description or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm sm:text-base"
              aria-label="Search transactions"
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Filter size={20} className="text-slate-400 hidden md:block" aria-hidden="true" />
            <label htmlFor="transaction-filter" className="sr-only">Filter transactions</label>
            <select
              id="transaction-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="flex-1 md:flex-none px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-sm sm:text-base"
              aria-label="Filter transaction type"
            >
              <option value="all">All Transactions</option>
              <option value="income">Income Only</option>
              <option value="expense">Expense Only</option>
            </select>
          </div>
        </div>

        {/* Transactions List */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {error && (
            <div 
              className="p-4 sm:p-5 bg-red-50 text-red-700 border-b border-red-100"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left" role="table" aria-label="All transactions">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-xs uppercase text-slate-600 font-semibold tracking-wider">
                    Description
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-xs uppercase text-slate-600 font-semibold tracking-wider">
                    Category
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-xs uppercase text-slate-600 font-semibold tracking-wider">
                    Date
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-xs uppercase text-slate-600 font-semibold tracking-wider">
                    Method
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-xs uppercase text-slate-600 font-semibold tracking-wider text-right">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && transactions.length === 0 ? (
                  <>
                    {[1, 2, 3, 4, 5].map(i => (
                      <tr key={i} className="animate-pulse" role="row">
                        <td className="px-4 sm:px-6 py-4"><div className="h-4 w-32 bg-slate-200 rounded"></div></td>
                        <td className="px-4 sm:px-6 py-4"><div className="h-5 w-20 bg-slate-200 rounded-full"></div></td>
                        <td className="px-4 sm:px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
                        <td className="px-4 sm:px-6 py-4"><div className="h-4 w-16 bg-slate-200 rounded"></div></td>
                        <td className="px-4 sm:px-6 py-4 text-right"><div className="h-4 w-20 bg-slate-200 rounded ml-auto"></div></td>
                      </tr>
                    ))}
                  </>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 sm:py-16 text-center text-slate-500" role="status">
                      <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <FileText className="text-slate-400" size={32} aria-hidden="true" />
                      </div>
                      <p className="text-sm sm:text-base">No transactions found matching your criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <tr key={transaction._id} className="hover:bg-slate-50 transition-colors group" role="row">
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="font-medium text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                          <div 
                            className={`p-1.5 rounded-full flex-shrink-0 ${transaction.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}
                            aria-hidden="true"
                          >
                            {transaction.type === 'income' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                          </div>
                          <span className="break-words">{transaction.description}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          <Tag size={12} aria-hidden="true" />
                          {transaction.category || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} aria-hidden="true" />
                          <span>{new Date(transaction.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-slate-600">
                        {transaction.paymentMethod || 'Manual'}
                      </td>
                      <td className={`px-4 sm:px-6 py-3 sm:py-4 text-right font-bold text-sm sm:text-base ${transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </ModernLayout>
  );
}