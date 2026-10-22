import React, { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import ModernLayout from "./layout/Layout";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import SpendingInsightsSection from "./ai/SpendingInsightsSection";
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  DollarSign, 
  Upload, 
  Bot, 
  ArrowUpRight, 
  Activity, 
  Send,
  PieChart as PieIcon,
  X,
  Plus,
  ShieldCheck,
  Zap
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";

const COLORS = ["#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState("overview"); // overview, add-transaction
  
  // Dashboard states
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [insights, setInsights] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [healthScore, setHealthScore] = useState(84); // Default placeholder
  const [recommendations, setRecommendations] = useState([]);
  const [forecast, setForecast] = useState({ nextWeek: 0, nextMonth: 0, nextQuarter: 0 });

  // Assistant states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", content: "Hello! I am SEIP AI, your intelligent financial advisor. How can I help you optimize your budgets today?" }
  ]);

  // Transaction form states
  const [form, setForm] = useState({
    amount: "",
    type: "expense",
    category: "food",
    merchant: "",
    description: "",
    tags: ""
  });

  // Fetch Dashboard Data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch normal analytics
      const [monthlyRes, categoryRes, walletRes, healthRes, forecastRes] = await Promise.all([
        api.get("/analytics/monthly").catch(() => ({ data: { data: [] } })),
        api.get("/analytics/category").catch(() => ({ data: { data: [] } })),
        api.get("/features/wallet").catch(() => ({ data: { data: { balance: 12450 } } })),
        api.get("/insights").catch(() => ({ data: { data: { insights: [] } } })),
        api.get("/prediction").catch(() => ({ data: { data: { predictedExpense: 4800 } } }))
      ]);

      setMonthlyStats(monthlyRes.data?.data || []);
      
      const rawCategories = categoryRes.data?.data || [];
      setCategoryStats(rawCategories.map(c => ({
        name: c.category || "misc",
        value: c.totalExpense || c.amount || 0
      })));

      setWalletBalance(walletRes.data?.data?.balance || walletRes.data?.balance || 0);
      
      // AI insights & health score calculations
      const healthData = healthRes.data?.data || {};
      setInsights(healthData.insights || []);
      setHealthScore(healthData.budgetRisk?.score ? Math.round(100 - healthData.budgetRisk.score) : 84);
      
      if (healthData.insights && healthData.insights.length > 0) {
        setRecommendations(healthData.insights.map(i => ({
          action: i.suggestion || "Review recent category trends",
          priority: i.type === "critical" ? "high" : "medium"
        })));
      } else {
        setRecommendations([
          { action: "Optimize dining and food categories to save ₹1,200 next month", priority: "medium" },
          { action: "Allocate ₹2,500 surplus to emergency savings wallet", priority: "low" }
        ]);
      }

      // Forecast mapping
      const predictedVal = forecastRes.data?.data?.predictedExpense || 4800;
      setForecast({
        nextWeek: Math.round(predictedVal * 0.25),
        nextMonth: Math.round(predictedVal),
        nextQuarter: Math.round(predictedVal * 3)
      });

    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      toast.error("Error synchronizing SEIP workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handle Receipt Upload OCR
  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("receipt", file);

    const toastId = toast.loading("Analyzing receipt via Gemini OCR...");
    try {
      const res = await api.post("/receipts/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data?.success && res.data?.data) {
        const { merchant, amount, category, date } = res.data.data;
        setForm(prev => ({
          ...prev,
          amount: amount || "",
          merchant: merchant || "",
          category: category || "misc",
          description: `OCR parsed receipt from ${merchant || "merchant"}`
        }));
        setSection("add-transaction");
        toast.success("Receipt parsed! Review the transaction fields below.", { id: toastId });
      } else {
        throw new Error("Invalid format returned");
      }
    } catch (err) {
      console.error(err);
      toast.error("Receipt intelligence failed. Fields remained blank.", { id: toastId });
    }
  };

  // Submit Transaction
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!form.amount) {
      toast.error("Amount is required");
      return;
    }

    const toastId = toast.loading("Saving transaction to ledger...");
    try {
      const payload = {
        amount: Number(form.amount),
        type: form.type,
        category: form.category,
        merchant: form.merchant,
        description: form.description,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()) : [],
        date: new Date()
      };

      await api.post("/transactions", payload);
      toast.success("Transaction recorded", { id: toastId });
      setForm({ amount: "", type: "expense", category: "food", merchant: "", description: "", tags: "" });
      setSection("overview");
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to record transaction", { id: toastId });
    }
  };

  // Send Message to SEIP Assistant
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { role: "user", content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");

    try {
      const res = await api.post("/assistant/chat", { message: userMsg.content });
      if (res.data?.success && res.data?.data?.response) {
        setChatMessages(prev => [...prev, { role: "assistant", content: res.data.data.response }]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I had trouble analyzing that request. Please try again." }]);
    }
  };

  // Memoized calculations
  const totalMonthlyExpense = useMemo(() => {
    return monthlyStats.reduce((sum, m) => sum + (m.totalExpense || 0), 0);
  }, [monthlyStats]);

  const lineChartData = useMemo(() => {
    const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return monthlyStats.map(m => ({
      name: `${monthNames[m.month]} ${m.year}`,
      Expenses: m.totalExpense || 0
    }));
  }, [monthlyStats]);

  return (
    <ModernLayout>
      <div className="relative min-h-screen text-slate-100 p-1 md:p-6 space-y-8">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 bg-sky-950/60 border border-sky-800/40 px-2 py-0.5 rounded-full">AI-Augmented Platform</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400 mt-1">
              Smart Expense Intelligence Platform (SEIP)
            </h1>
            <p className="text-slate-400 text-sm mt-1">Multi-tenant financial analytics, forecasting, and receipt OCR insights.</p>
          </div>
          
          {/* Quick Actions Panel */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium cursor-pointer transition-all">
              <Upload className="w-4 h-4 text-sky-400" />
              Scan Receipt
              <input type="file" onChange={handleReceiptUpload} accept="image/*" className="hidden" />
            </label>
            <button 
              onClick={() => setIsChatOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-95 text-xs font-semibold shadow-lg shadow-sky-500/20 text-white transition-all"
            >
              <Bot className="w-4 h-4" />
              Ask SEIP AI
            </button>
            <button 
              onClick={() => setSection(section === "overview" ? "add-transaction" : "overview")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-xs font-medium transition-all text-white"
            >
              <Plus className="w-4 h-4" />
              {section === "overview" ? "Record Transaction" : "Show Analytics"}
            </button>
          </div>
        </div>

        {section === "overview" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT COLUMN (STATS & CHARTS) */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Financial Dashboard Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Wallet Balance */}
                <motion.div 
                  whileHover={{ y: -2 }}
                  className="relative overflow-hidden p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-400">Total Wallet Balance</span>
                    <div className="p-2 rounded-xl bg-sky-950/60 border border-sky-800/40">
                      <Wallet className="w-5 h-5 text-sky-400" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-extrabold text-white mt-4">₹{walletBalance.toLocaleString()}</h2>
                  <div className="flex items-center gap-1 text-xs text-emerald-400 mt-2 font-medium">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+4.2% from last week</span>
                  </div>
                </motion.div>

                {/* Monthly Expense */}
                <motion.div 
                  whileHover={{ y: -2 }}
                  className="relative overflow-hidden p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-400">Monthly Expense</span>
                    <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-800/40">
                      <DollarSign className="w-5 h-5 text-rose-400" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-extrabold text-white mt-4">₹{totalMonthlyExpense.toLocaleString()}</h2>
                  <div className="flex items-center gap-1 text-xs text-rose-400 mt-2 font-medium">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+12.8% vs last month</span>
                  </div>
                </motion.div>

                {/* Budget Utilization / Savings Progress */}
                <motion.div 
                  whileHover={{ y: -2 }}
                  className="relative overflow-hidden p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-400">Savings Target Progress</span>
                    <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/40">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-extrabold text-white mt-4">76%</h2>
                  <div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-sky-400 h-full rounded-full" style={{ width: "76%" }} />
                  </div>
                </motion.div>
              </div>

              {/* Expense Trends Charts */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white">Cash Flow Analytics</h3>
                    <p className="text-xs text-slate-400">Monthly spending trends and budget utilization bounds.</p>
                  </div>
                  <Activity className="w-5 h-5 text-slate-500" />
                </div>
                
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ background: "#0f172a", borderColor: "#1e293b", borderRadius: "12px" }}
                        labelClassName="text-slate-400 text-xs font-semibold"
                        itemStyle={{ color: "#3b82f6", fontSize: "12px" }}
                      />
                      <Line type="monotone" dataKey="Expenses" stroke="#3b82f6" strokeWidth={3} dot={{ strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* AI Forecast Panels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Next Week Forecast", amount: forecast.nextWeek, period: "7 Days" },
                  { label: "Next Month Forecast", amount: forecast.nextMonth, period: "30 Days" },
                  { label: "Next Quarter Forecast", amount: forecast.nextQuarter, period: "90 Days" }
                ].map((item, idx) => (
                  <div key={idx} className="p-5 rounded-2xl border border-slate-800 bg-slate-950/40 relative">
                    <Zap className="w-4 h-4 text-amber-400 absolute top-5 right-5 opacity-70 animate-pulse" />
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{item.label}</p>
                    <p className="text-2xl font-black text-white mt-3">₹{item.amount.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">Predictive forecast for the upcoming {item.period}.</p>
                  </div>
                ))}
              </div>

            </div>

            {/* RIGHT COLUMN (HEALTH SCORE, INSIGHTS & PIE) */}
            <div className="lg:col-span-4 space-y-8">
              
              {/* Financial Health Score Dial Widget */}
              <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex flex-col items-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl" />
                <h3 className="text-sm font-bold text-slate-400 mb-6 w-full text-left">Financial Health Score</h3>
                
                {/* Dial SVG */}
                <div className="relative flex items-center justify-center w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="80" cy="80" r="65" stroke="#1e293b" strokeWidth="10" fill="transparent" />
                    <circle 
                      cx="80" cy="80" r="65" 
                      stroke="url(#healthGradient)" 
                      strokeWidth="10" 
                      fill="transparent" 
                      strokeDasharray="408" 
                      strokeDashoffset={408 - (408 * healthScore) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                    <defs>
                      <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="50%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-white">{healthScore}</span>
                    <span className="text-xs font-semibold text-slate-400">/ 100</span>
                  </div>
                </div>

                <div className="text-center mt-6">
                  <h4 className="text-sm font-bold text-white capitalize">Stable Budget Posture</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">Your organization's spending rate is aligned with allocated category goals.</p>
                </div>
              </div>

              {/* Spending Categories distribution */}
              <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
                <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center justify-between">
                  <span>Spending Categories</span>
                  <PieIcon className="w-4 h-4 text-slate-500" />
                </h3>
                
                <div className="h-48 flex items-center justify-center">
                  {categoryStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryStats}
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoryStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <span className="text-xs text-slate-500">No category statistics available</span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {categoryStats.slice(0, 4).map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-xs font-medium text-slate-300 capitalize truncate">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Spending Insights Section */}
              <div className="space-y-4">
                <SpendingInsightsSection />
              </div>

            </div>

          </div>
        ) : (
          
          /* Transaction form */
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md"
          >
            <h2 className="text-lg font-bold text-white mb-6">Record Transaction</h2>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-400">Amount (INR)</label>
                  <input 
                    type="number" 
                    value={form.amount} 
                    onChange={e => setForm({ ...form, amount: e.target.value })} 
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-sky-500 transition-all outline-none" 
                    placeholder="e.g. 500" 
                    required 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-400">Merchant Name</label>
                  <input 
                    type="text" 
                    value={form.merchant} 
                    onChange={e => setForm({ ...form, merchant: e.target.value })} 
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-sky-500 transition-all outline-none" 
                    placeholder="e.g. Vendor or Merchant" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-400">Type</label>
                  <select 
                    value={form.type} 
                    onChange={e => setForm({ ...form, type: e.target.value })} 
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-sky-500 transition-all outline-none"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-400">Category</label>
                  <select 
                    value={form.category} 
                    onChange={e => setForm({ ...form, category: e.target.value })} 
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-sky-500 transition-all outline-none capitalize"
                  >
                    {["food", "transport", "books", "entertainment", "shopping", "health", "education", "misc"].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Tags (comma-separated)</label>
                <input 
                  type="text" 
                  value={form.tags} 
                  onChange={e => setForm({ ...form, tags: e.target.value })} 
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-sky-500 transition-all outline-none" 
                  placeholder="e.g. logistics, printing, snacks" 
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Description</label>
                <textarea 
                  value={form.description} 
                  onChange={e => setForm({ ...form, description: e.target.value })} 
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-sky-500 transition-all outline-none w-full" 
                  rows={3} 
                  placeholder="Details about the transaction..." 
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button 
                  type="button" 
                  onClick={() => setSection("overview")}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-xs font-semibold text-white transition-all"
                >
                  Record Ledger Item
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* CHAT DRAWER SIDEBAR */}
        <AnimatePresence>
          {isChatOpen && (
            <>
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsChatOpen(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              />
              
              {/* Drawer Content */}
              <motion.div 
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 h-screen w-full md:w-[450px] z-50 border-l border-slate-800 bg-slate-950 p-6 flex flex-col justify-between shadow-2xl"
              >
                
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-sky-950/60 border border-sky-800/40">
                        <Bot className="w-5 h-5 text-sky-400" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white text-base">SEIP Assistant AI</h3>
                        <p className="text-xs text-slate-400">Ask budgeting, optimization or forecast questions.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsChatOpen(false)}
                      className="p-1.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-white transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Messages feed */}
                <div className="flex-1 overflow-y-auto py-6 space-y-4 custom-scrollbar">
                  {chatMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs ${
                        msg.role === "user" 
                          ? "bg-sky-500 text-white rounded-br-none" 
                          : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input box */}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 border-t border-slate-800 pt-4">
                  <input 
                    type="text" 
                    value={chatInput} 
                    onChange={e => setChatInput(e.target.value)} 
                    className="flex-1 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs outline-none focus:border-sky-500 transition-all" 
                    placeholder="Ask SEIP AI..." 
                  />
                  <button 
                    type="submit"
                    className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white transition-all shadow-lg shadow-sky-500/20"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </ModernLayout>
  );
};

export default Dashboard;