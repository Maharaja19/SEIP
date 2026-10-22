import React, { useState, useEffect } from "react";
import api from "../utils/api";
import ModernLayout from "../components/layout/Layout";
import {
  BarChart3,
  Wallet,
  CreditCard,
  Banknote,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  PieChart,
  Activity
} from "lucide-react";
import { motion } from "framer-motion";

export default function CollectionReport() {
  const [collectionReport, setCollectionReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCollectionReport();
  }, []);

  const fetchCollectionReport = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch dues summary and transactions summary
      const [duesResponse, transactionsResponse] = await Promise.all([
        api.get("/dues/summary/all").catch(() => ({ data: { data: {} } })),
        api.get("/transactions").catch(() => ({ data: { data: [] } }))
      ]);

      const duesSummary = duesResponse.data?.data || duesResponse.data || {};
      const allTransactions = transactionsResponse.data?.data || transactionsResponse.data || [];

      // Calculate monthly collections
      const monthlyData = {};
      allTransactions.forEach(transaction => {
        const date = new Date(transaction.createdAt);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { income: 0, expense: 0, count: 0 };
        }

        if (transaction.type === 'income') {
          monthlyData[monthKey].income += transaction.amount;
        } else {
          monthlyData[monthKey].expense += transaction.amount;
        }
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
      setError("Failed to fetch collection report: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Helper for stat cards
  const StatCard = ({ title, value, icon: Icon, colorClass, subtitle }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden"
    >
      <div className={`absolute top-0 right-0 p-4 opacity-5 ${colorClass}`}>
        <Icon size={64} />
      </div>
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 text-current`}>
          <Icon size={20} />
        </div>
        <p className="text-slate-500 font-medium">{title}</p>
      </div>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
    </motion.div>
  );

  if (loading) {
    return (
      <ModernLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ModernLayout>
    );
  }

  if (error) {
    return (
      <ModernLayout>
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">
          {error}
        </div>
      </ModernLayout>
    );
  }

  const { dues, transactions, monthly } = collectionReport || { dues: {}, transactions: {}, monthly: {} };
  const collectionRate = dues.totalDues > 0 ? Math.round((dues.paidDues / dues.totalDues) * 100) : 0;
  const netBalance = transactions.totalIncome - transactions.totalExpense;

  return (
    <ModernLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-8 h-8 text-indigo-600" /> Collection Report
            </h1>
            <p className="text-slate-500 mt-1">Financial analytics and insights</p>
          </div>
          <button
            onClick={fetchCollectionReport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600 font-medium shadow-sm"
          >
            <RefreshCw size={16} /> Refresh Data
          </button>
        </header>

        {/* Dues Summary Section */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CreditCard size={20} className="text-blue-500" /> Dues Collection Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Dues Expected"
              value={formatCurrency(dues.totalAmount)}
              icon={Wallet}
              colorClass="text-slate-600"
            />
            <StatCard
              title="Collected Amount"
              value={formatCurrency(dues.paidAmount)}
              icon={Banknote}
              colorClass="text-emerald-600"
              subtitle={`${dues.paidDues} / ${dues.totalDues} students paid`}
            />
            <StatCard
              title="Pending Amount"
              value={formatCurrency(dues.totalAmount - dues.paidAmount)}
              icon={Activity}
              colorClass="text-amber-500"
              subtitle={`${dues.unpaidDues} students pending`}
            />
            <StatCard
              title="Collection Rate"
              value={`${collectionRate}%`}
              icon={PieChart}
              colorClass="text-blue-600"
              subtitle="Overall efficiency"
            />
          </div>
        </section>

        {/* Transaction Summary Section */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Activity size={20} className="text-purple-500" /> Transaction Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Income"
              value={formatCurrency(transactions.totalIncome)}
              icon={TrendingUp}
              colorClass="text-emerald-500"
            />
            <StatCard
              title="Total Expenses"
              value={formatCurrency(transactions.totalExpense)}
              icon={TrendingDown}
              colorClass="text-rose-500"
            />
            <StatCard
              title="Net Balance"
              value={formatCurrency(netBalance)}
              icon={Wallet}
              colorClass={netBalance >= 0 ? "text-blue-600" : "text-amber-500"}
            />
            <StatCard
              title="Total Transactions"
              value={transactions.total}
              icon={RefreshCw}
              colorClass="text-indigo-500"
            />
          </div>
        </section>

        {/* Monthly Breakdown (Simple Visual) */}
        {Object.keys(monthly).length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Monthly Breakdown</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(monthly).sort().reverse().map(([key, data]) => (
                <div key={key} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <h4 className="font-semibold text-slate-900 mb-3 text-lg border-b border-slate-200 pb-2">{key.replace('-', ' / ')}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Income</span>
                      <span className="font-medium text-emerald-600">+{formatCurrency(data.income)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Expense</span>
                      <span className="font-medium text-rose-600">-{formatCurrency(data.expense)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between font-bold">
                      <span className="text-slate-700">Net</span>
                      <span className={data.income - data.expense >= 0 ? "text-blue-600" : "text-amber-600"}>
                        {formatCurrency(data.income - data.expense)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </ModernLayout>
  );
}