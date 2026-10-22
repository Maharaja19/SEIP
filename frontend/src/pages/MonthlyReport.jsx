import React, { useState, useEffect } from "react";
import api from "../utils/api";
import ModernLayout from "../components/layout/Layout";
import {
  BarChart3,
  Calendar,
  Printer,
  Download,
  RefreshCw,
  TrendingUp,
  Wallet,
  FileText,
  CreditCard,
  PieChart
} from "lucide-react";

export default function MonthlyReport() {
  const [reportData, setReportData] = useState({
    budgets: [],
    dues: [],
    transactions: [],
    summary: {
      totalBudgets: 0,
      approvedBudgets: 0,
      totalDues: 0,
      paidDues: 0,
      totalTransactions: 0,
      totalIncome: 0,
      totalExpense: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchReportData();
  }, [selectedMonth, selectedYear]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError("");

      const [budgetsRes, duesRes, transactionsRes] = await Promise.all([
        api.get("/budgets").catch(() => ({ data: { data: [] } })),
        api.get("/dues").catch(() => ({ data: { data: [] } })),
        api.get("/transactions").catch(() => ({ data: { data: [] } }))
      ]);

      const budgets = budgetsRes.data?.data || budgetsRes.data || [];
      const dues = duesRes.data?.data || duesRes.data || [];
      const transactions = transactionsRes.data?.data || transactionsRes.data || [];

      // Filter data by selected month/year
      const filterByMonth = (item) => {
        const itemDate = new Date(item.createdAt);
        return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
      };

      const filteredBudgets = budgets.filter(filterByMonth);
      const filteredDues = dues.filter(filterByMonth);
      const filteredTransactions = transactions.filter(filterByMonth);

      const summary = {
        totalBudgets: filteredBudgets.length,
        approvedBudgets: filteredBudgets.filter(b => b.status === 'Approved').length,
        totalDues: filteredDues.length,
        paidDues: filteredDues.filter(d => d.status === 'Paid').length,
        totalTransactions: filteredTransactions.length,
        totalIncome: filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        totalExpense: filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
      };

      setReportData({
        budgets: filteredBudgets,
        dues: filteredDues,
        transactions: filteredTransactions,
        summary
      });
    } catch (err) {
      setError("Failed to fetch report data: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    window.print();
  };

  const exportCSV = () => {
    const csvData = [
      ['Date', 'Type', 'Amount', 'Category', 'Description'],
      ...reportData.transactions.map(t => [
        new Date(t.createdAt).toLocaleDateString(),
        t.type,
        t.amount,
        t.category,
        t.description || ''
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${selectedYear}_${selectedMonth + 1}.csv`;
    a.click();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const StatItem = ({ label, value, colorClass }) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
      <span className="text-slate-500 text-sm">{label}</span>
      <span className={`font-semibold ${colorClass || "text-slate-900"}`}>{value}</span>
    </div>
  );

  return (
    <ModernLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-10 print:max-w-none print:p-0">
        {/* Hide header elements in print mode with simple CSS if needed, usually browser handles it if specific print styles exist. Here we use standard tailwind. */}
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-8 h-8 text-blue-600" /> Monthly Report
            </h1>
            <p className="text-slate-500 mt-1">
              Financial and activity overview for <span className="font-semibold text-blue-600">{monthNames[selectedMonth]} {selectedYear}</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 px-2">
              <Calendar size={18} className="text-slate-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-transparent border-none text-slate-700 text-slate-600 font-medium focus:ring-0 cursor-pointer"
              >
                {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-transparent border-none text-slate-700 text-slate-600 font-medium focus:ring-0 cursor-pointer"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex gap-2 border-l border-slate-200 pl-4">
              <button onClick={generatePDF} className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Print/PDF"><Printer size={20} /></button>
              <button onClick={exportCSV} className="p-2 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Export CSV"><Download size={20} /></button>
              <button onClick={fetchReportData} className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Refresh"><RefreshCw size={20} /></button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">{error}</div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">

            {/* Summary Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Financial Summary */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Wallet size={80} /></div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Wallet className="text-blue-500" size={20} /> Financials
                </h3>
                <div className="space-y-1">
                  <StatItem label="Total Income" value={formatCurrency(reportData.summary.totalIncome)} colorClass="text-emerald-600" />
                  <StatItem label="Total Expense" value={formatCurrency(reportData.summary.totalExpense)} colorClass="text-rose-600" />
                  <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-slate-900 font-bold">Net Balance</span>
                    <span className={`font-bold text-lg ${reportData.summary.totalIncome - reportData.summary.totalExpense >= 0 ? "text-blue-600" : "text-amber-600"}`}>
                      {formatCurrency(reportData.summary.totalIncome - reportData.summary.totalExpense)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Activity Summary */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><FileText size={80} /></div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText className="text-indigo-500" size={20} /> Activity
                </h3>
                <div className="space-y-1">
                  <StatItem label="Transactions" value={reportData.summary.totalTransactions} />
                  <StatItem label="Budgets Created" value={reportData.summary.totalBudgets} />
                  <StatItem label="Budgets Approved" value={reportData.summary.approvedBudgets} colorClass="text-emerald-600" />
                </div>
              </div>

              {/* Dues Summary */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><CreditCard size={80} /></div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <CreditCard className="text-purple-500" size={20} /> Dues
                </h3>
                <div className="space-y-1">
                  <StatItem label="Total Dues" value={reportData.summary.totalDues} />
                  <StatItem label="Paid Dues" value={reportData.summary.paidDues} colorClass="text-emerald-600" />
                  <StatItem label="Collection Rate"
                    value={reportData.summary.totalDues > 0 ? Math.round((reportData.summary.paidDues / reportData.summary.totalDues) * 100) + '%' : '0%'}
                    colorClass="text-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><TrendingUp size={18} /> Transactions</h3>
                <span className="text-xs bg-slate-200 px-2 py-1 rounded-full text-slate-600">{reportData.transactions.length} records</span>
              </div>
              <div className="overflow-x-auto">
                {reportData.transactions.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No transactions found for this month.</div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.transactions.slice(0, 15).map((t, i) => (
                        <tr key={t._id || i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-900">{new Date(t.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {t.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{t.category}</td>
                          <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={t.description}>{t.description || '-'}</td>
                          <td className={`px-4 py-3 text-right font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {reportData.transactions.length > 15 && <div className="p-2 text-center text-xs text-slate-400 bg-slate-50">Showing first 15 records</div>}
            </div>

            {/* Flex Container for Budgets and Dues */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Budgets List */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2"><PieChart size={18} /> Budgets</h3>
                  <span className="text-xs bg-slate-200 px-2 py-1 rounded-full text-slate-600">{reportData.budgets.length}</span>
                </div>
                <div className="overflow-x-auto">
                  {reportData.budgets.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No budgets found.</div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                          <th className="px-4 py-3">Title</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.budgets.map((b, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-900 font-medium">{b.title}</td>
                            <td className="px-4 py-3">{formatCurrency(b.totalAmount)}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-xs ${b.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Dues List */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2"><CreditCard size={18} /> Recent Dues</h3>
                  <span className="text-xs bg-slate-200 px-2 py-1 rounded-full text-slate-600">{reportData.dues.length}</span>
                </div>
                <div className="overflow-x-auto">
                  {reportData.dues.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No dues found.</div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                          <th className="px-4 py-3">Student</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.dues.slice(0, 10).map((d, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-900">{d.student?.fullName || 'Unknown'}</td>
                            <td className="px-4 py-3">{formatCurrency(d.amount)}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-xs ${d.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {d.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-slate-400 text-xs pt-8 pb-4 print:text-black">
              Report generated on {new Date().toLocaleString()}
            </div>

          </div>
        )}
      </div>
    </ModernLayout>
  );
}