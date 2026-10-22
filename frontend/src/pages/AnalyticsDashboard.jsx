import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Target, BarChart3, Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';
import api from '../utils/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AnalyticsDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [efficiencyData, setEfficiencyData] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardRes, efficiencyRes, predictionsRes] = await Promise.all([
          api.get('/analytics/dashboard').catch(() => ({ data: { data: null } })),
          api.get('/analytics/efficiency-metrics').catch(() => ({ data: { data: null } })),
          api.get('/analytics/predictions').catch(() => ({ data: { data: null } }))
        ]);

        setDashboardData(dashboardRes.data.data);
        setEfficiencyData(efficiencyRes.data.data);
        setPredictions(predictionsRes.data.data);
      } catch (err) {
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-6 space-y-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-700/50 rounded-xl animate-pulse" />)}</div>;
  }

  if (error || !dashboardData) {
    return <div className="p-6 text-center text-slate-400">{error || 'No data available'}</div>;
  }

  const { financialSummary, spendingTrends, categoryBreakdown, budgetUtilization, collectionMetrics } = dashboardData;
  const trendChartData = spendingTrends.map(st => ({
    month: `${new Date(st.year, st.month - 1).toLocaleString('en-US', { month: 'short' })} ${st.year}`,
    expense: st.totalExpense
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-slate-400 mt-1">Comprehensive financial insights</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-lg">
          <Activity className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-300">Live</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl p-6">
          <DollarSign className="h-8 w-8 text-blue-400 mb-4" />
          <h3 className="text-slate-400 text-sm">Monthly Expenses</h3>
          <p className="text-3xl font-bold text-white mt-2">₹{financialSummary.totalExpenses.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-2">{financialSummary.transactionCount} transactions</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-6">
          <TrendingUp className="h-8 w-8 text-emerald-400 mb-4" />
          <h3 className="text-slate-400 text-sm">Monthly Income</h3>
          <p className="text-3xl font-bold text-white mt-2">₹{financialSummary.totalIncome.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-2">Net: ₹{financialSummary.netBalance.toLocaleString()}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-6">
          <Target className="h-8 w-8 text-purple-400 mb-4" />
          <h3 className="text-slate-400 text-sm">Collection Rate</h3>
          <p className="text-3xl font-bold text-white mt-2">{collectionMetrics.collectionRate}%</p>
          <p className="text-xs text-slate-500 mt-2">{collectionMetrics.paidDues}/{collectionMetrics.totalDues} dues</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-6">
          <BarChart3 className="h-8 w-8 text-amber-400 mb-4" />
          <h3 className="text-slate-400 text-sm">Daily Average</h3>
          <p className="text-3xl font-bold text-white mt-2">₹{financialSummary.avgDailyExpense.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-2">Projected: ₹{financialSummary.projectedMonthlyExpense.toLocaleString()}</p>
        </motion.div>
      </div>

      {/* Budget Utilization */}
      {budgetUtilization && (
        <div className="bg-white/10 border border-white/20 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Budget Utilization</h3>
          <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
            <div className={`h-4 rounded-full ${budgetUtilization.status === 'healthy' ? 'bg-emerald-500' : budgetUtilization.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, parseFloat(budgetUtilization.utilizationRate))}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 text-center">
            <div><p className="text-xs text-slate-400">Budget</p><p className="text-lg font-semibold text-white">₹{budgetUtilization.totalBudget.toLocaleString()}</p></div>
            <div><p className="text-xs text-slate-400">Spent</p><p className="text-lg font-semibold text-white">₹{budgetUtilization.spent.toLocaleString()}</p></div>
            <div><p className="text-xs text-slate-400">Remaining</p><p className="text-lg font-semibold text-white">₹{budgetUtilization.remaining.toLocaleString()}</p></div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/10 border border-white/20 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Spending Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
              <Line type="monotone" dataKey="expense" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/10 border border-white/20 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Category Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie data={categoryBreakdown.slice(0, 6)} dataKey="total" nameKey="category" outerRadius={100} label>
                {categoryBreakdown.slice(0, 6).map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
            </RePieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Predictions */}
      {predictions && (
        <div className="bg-gradient-to-br from-indigo-500/20 to-purple-600/10 border border-indigo-500/30 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Next Month Prediction</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-4xl font-bold text-white">₹{predictions.nextMonthPrediction.amount.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-2">{predictions.nextMonthPrediction.method}</p>
            </div>
            <div>
              <span className={`px-4 py-2 rounded-full text-lg font-semibold ${predictions.confidence.level === 'high' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>{predictions.confidence.level}</span>
              <p className="text-xs text-slate-500 mt-2">{predictions.confidence.explanation}</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-white">{predictions.nextMonthPrediction.dataPoints}</p>
              <p className="text-xs text-slate-500 mt-2">months analyzed</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
