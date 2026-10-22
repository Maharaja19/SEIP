import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin,
  Calendar,
  Phone,
  Mail,
  BookOpen,
  GraduationCap,
  CreditCard,
  FileText,
  PieChart,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  DollarSign,
  Target
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, PieChart as RePieChart, Pie, Cell } from "recharts";
import ModernLayout from "../components/layout/Layout";
import api from "../utils/api";
import { getApiData, getApiErrorMessage } from "../utils/apiHelpers";

export default function Student() {
  const navigate = useNavigate();
  const [completeUser, setCompleteUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [intelligenceData, setIntelligenceData] = useState({
    insights: [],
    budgetRisk: null,
    prediction: { predictedExpense: 0 },
    monthlyExpenses: [],
    categoryExpenses: [],
    walletBalance: 0,
    monthlySpent: 0,
    budgetRemaining: 0
  });

  const [localUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const fetchFullProfile = async () => {
      if (!localUser?.email && !localUser?._id) return;

      try {
        setLoading(true);
        const response = await api.get("/users/profile");
        const freshUser = { ...localUser, ...getApiData(response) };
        setCompleteUser(freshUser);
        localStorage.setItem("user", JSON.stringify(freshUser));
        await fetchIntelligenceData(freshUser);
      } catch (err) {
        console.warn("Profile fetch failed, using cached user", err);
        setCompleteUser(localUser);
        await fetchIntelligenceData(localUser);
      } finally {
        setLoading(false);
      }
    };

    if (localUser) {
      fetchFullProfile();
    }
  }, [localUser?.email, localUser?._id]);

  const fetchIntelligenceData = async (userContext = localUser) => {
    try {
      const registerNumber = userContext?.registerNumber;
      const [insightsRes, predictionRes, analyticsRes, walletRes, transactionsRes] = await Promise.all([
        api.get("/insights").catch(() => ({ data: { data: { insights: [], budgetRisk: null } } })),
        api.get("/prediction").catch(() => ({ data: { data: { predictedExpense: 0 } } })),
        api.get("/analytics/student").catch(() => ({ data: { data: { monthly: [], category: [] } } })),
        api.get("/features/wallet/balance").catch(() => ({ data: { data: { balance: 0 } } })),
        registerNumber
          ? api.get(`/transactions/user/${registerNumber}?limit=100`).catch(() => ({ data: { data: [] } }))
          : Promise.resolve({ data: { data: [] } })
      ]);

      const analyticsPayload = getApiData(analyticsRes) || {};
      const monthlyData = analyticsPayload.monthly || [];
      const transactions = getApiData(transactionsRes) || [];
      const currentMonthTx = transactions.filter(tx => {
        const txDate = new Date(tx.date || tx.createdAt);
        const now = new Date();
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear() && tx.type === "expense";
      });
      const monthlySpent = currentMonthTx.reduce((sum, tx) => sum + tx.amount, 0);

      const insightsData = getApiData(insightsRes) || {};
      const budgetInfo = insightsData.budgetRisk || {};

      setIntelligenceData({
        insights: insightsData.insights || [],
        budgetRisk: insightsData.budgetRisk,
        prediction: getApiData(predictionRes) || { predictedExpense: 0 },
        monthlyExpenses: monthlyData,
        categoryExpenses: analyticsPayload.category || [],
        walletBalance: getApiData(walletRes)?.balance || 0,
        monthlySpent,
        budgetRemaining: budgetInfo.remaining || 0
      });
    } catch (error) {
      console.error("Failed to fetch intelligence data:", error);
    }
  };

  // Skeleton Loader Components
  const ProfileItemSkeleton = () => (
    <div 
      className="flex items-center gap-3 p-4 sm:p-5 rounded-xl border border-slate-100 animate-pulse"
      role="status"
      aria-label="Loading profile information"
    >
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-slate-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-20 bg-slate-200 rounded" />
        <div className="h-4 w-32 bg-slate-200 rounded" />
      </div>
    </div>
  );

  const ActionCardSkeleton = () => (
    <div 
      className="w-full p-6 rounded-2xl border border-slate-200 bg-white animate-pulse"
      role="status"
      aria-label="Loading action card"
    >
      <div className="w-12 h-12 rounded-xl bg-slate-200 mb-4" />
      <div className="h-5 w-32 bg-slate-200 rounded mb-2" />
      <div className="h-4 w-full bg-slate-200 rounded mb-4" />
      <div className="h-4 w-24 bg-slate-200 rounded" />
    </div>
  );

  if (!localUser) {
    return (
      <ModernLayout>
        <div 
          className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 sm:px-6"
          role="alert"
          aria-live="polite"
        >
          <div className="glass-card p-12 rounded-3xl border border-white/10 shadow-glass animate-fadeIn scale-up">
            <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-500 tracking-wide flex items-center justify-center gap-3">
              <span aria-hidden="true">⚠️</span> No user data found
            </h2>
            <p className="text-slate-300 mt-4 text-sm sm:text-base font-medium">
              Please log in first to access your dashboard.
            </p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="mt-6 sm:mt-8 px-6 sm:px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 focus:outline-none ring-2 ring-transparent focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              aria-label="Navigate to login page"
            >
              Go to Login
            </button>
          </div>
        </div>
      </ModernLayout>
    );
  }

  // Get value from completeUser (API) with fallback
  const getUserField = (field) => {
    if (completeUser && completeUser[field] !== undefined && completeUser[field] !== null) {
      return completeUser[field];
    }
    return localUser?.[field];
  };

  // Format DOB safely
  const formatDOB = (dob) => {
    if (!dob) return "Not Provided";
    try {
      const dateObj = new Date(dob);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    } catch (e) {
      console.error("Date parse error", e);
    }
    return dob; // Return raw string if parse fails
  };

  const ProfileItem = ({ icon: Icon, label, value }) => (
    <article 
      className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl glass-card border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:-translate-y-1 group"
      aria-label={`${label}: ${value || 'Not provided'}`}
    >
      <div 
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] group-hover:shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-shadow"
        aria-hidden="true"
      >
        <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-sky-400 group-hover:scale-110 transition-transform duration-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-semibold text-sky-200/70 uppercase tracking-widest mb-1.5">
          {label}
        </p>
        <div className="text-sm sm:text-base font-bold text-white capitalize break-words">
          {loading && !value ? (
            <div 
              className="h-4 w-24 bg-white/20 rounded animate-pulse mt-0.5"
              aria-hidden="true"
            />
          ) : (
            value || "Not Provided"
          )}
        </div>
      </div>
    </article>
  );

  const ActionCard = ({ title, description, icon: Icon, action, primary = false }) => (
    <motion.button
      type="button"
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={action}
      aria-label={`${title}: ${description}`}
      className={`relative overflow-hidden text-left w-full p-5 sm:p-7 rounded-[2rem] border transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-[rgba(15,23,42,1)] ${primary ? "bg-gradient-to-br from-blue-600/90 to-indigo-700/90 text-white border-white/20 shadow-[0_8px_30px_rgba(59,130,246,0.3)] backdrop-blur-md" : "glass-card border-white/10 hover:border-white/30 hover:shadow-glass hover:bg-white/10"}`}
    >
      <div className="relative z-10 flex flex-col h-full">
        <div 
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-4 sm:mb-5 flex-shrink-0 border shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] ${primary ? "bg-white/20 text-white border-white/30" : "bg-white/5 text-sky-400 border-white/10 group-hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] transition-shadow"}`}
          aria-hidden="true"
        >
          <Icon className="w-7 h-7 sm:w-8 sm:h-8 group-hover:scale-110 transition-transform duration-300" />
        </div>
        <h3 className={`text-lg sm:text-xl font-bold tracking-wide mb-2 sm:mb-3 ${primary ? "text-white" : "text-white group-hover:text-sky-300 transition-colors"}`}>
          {title}
        </h3>
        <p className={`text-sm sm:text-base mb-5 sm:mb-8 flex-grow leading-relaxed ${primary ? "text-blue-100/90" : "text-slate-300 group-hover:text-slate-200 transition-colors"}`}>
          {description}
        </p>
        <div className="flex items-center gap-2 font-bold tracking-wide text-sm sm:text-base mt-auto uppercase">
          <span className={primary ? "text-white" : "text-sky-400"}>{primary ? "Pay Now" : "Explore"}</span>
          <ChevronRight className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-2 ${primary ? "text-white" : "text-sky-400"}`} aria-hidden="true" />
        </div>
      </div>

      {/* Background decoration */}
      <div 
        className={`absolute -bottom-6 -right-6 w-40 h-40 rounded-full blur-3xl opacity-40 ${primary ? "bg-white/30" : "bg-sky-500/20 group-hover:opacity-60 transition-opacity"}`}
        aria-hidden="true"
      />
    </motion.button>
  );

  const RiskBadge = ({ level, score }) => {
    const config = {
      Safe: { icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/30" },
      Warning: { icon: ShieldAlert, color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30" },
      Critical: { icon: ShieldAlert, color: "text-rose-400", bg: "bg-rose-500/20", border: "border-rose-500/30" }
    };
    const { icon: Icon, color, bg, border } = config[level] || config.Safe;
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${bg} border ${border}`}>
        <Icon className={`h-5 w-5 ${color}`} />
        <span className={`text-sm font-bold ${color}`}>Budget Health: {level} ({score}%)</span>
      </div>
    );
  };

  const COLORS = ["#3b82f6", "#0d9488", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <ModernLayout>
      <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-10" role="main" aria-label="Student Dashboard">
        {/* Header Section */}
        {loading ? (
          <div 
            className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-sm animate-pulse"
            role="status"
            aria-label="Loading profile"
          >
            <div className="h-24 sm:h-32 bg-slate-200"></div>
            <div className="px-6 sm:px-8 pb-6 sm:pb-8">
              <div className="relative flex flex-col md:flex-row items-end -mt-10 sm:-mt-12 mb-6 gap-4 sm:gap-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-200"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-7 w-48 bg-slate-200 rounded"></div>
                  <div className="h-5 w-32 bg-slate-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <section className="relative rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden glass-panel border border-white/10 shadow-glass mb-10 pb-[28rem] sm:pb-0">
            <div className="h-32 sm:h-48 bg-gradient-to-r from-sky-600/60 via-indigo-600/60 to-purple-600/60 backdrop-blur-md border-b border-white/10 relative overflow-hidden" aria-hidden="true">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay opacity-30"></div>
            </div>
            <div className="px-6 sm:px-10 pb-8 sm:pb-12 h-6 sm:h-auto">
              <div className="relative flex flex-col md:flex-row items-end -mt-16 sm:-mt-20 mb-8 sm:mb-12 gap-5 sm:gap-8">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-white/5 p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] ring-4 ring-white/10 shrink-0 backdrop-blur-sm z-10">
                  <div className="w-full h-full rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center text-3xl sm:text-5xl font-black text-white" aria-label="Profile avatar">
                    {getUserField("name")?.[0]?.toUpperCase() || "U"}
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left mb-3 w-full backdrop-blur-sm bg-black/20 p-4 rounded-xl border border-white/10 md:bg-transparent md:border-transparent md:backdrop-blur-none md:p-0 z-10">
                  <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 tracking-wide drop-shadow-sm">
                    {getUserField("name") || "Student"}
                  </h1>
                  <p className="text-sky-300 font-bold text-sm sm:text-lg mt-2 tracking-wide uppercase">
                    {getUserField("role") || "Student"} • <span className="text-white bg-white/10 px-2 py-0.5 rounded-md ml-1 border border-white/5">{getUserField("registerNumber") || "N/A"}</span>
                  </p>
                  
                  {/* Data-driven profile stats */}
                  <div className="flex flex-wrap gap-3 mt-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/10">
                      <Wallet className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">Wallet: ₹{intelligenceData.walletBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/10">
                      <DollarSign className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-bold text-white">Spent: ₹{intelligenceData.monthlySpent.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/10">
                      <Target className="h-4 w-4 text-blue-400" />
                      <span className="text-xs font-bold text-white">Budget Left: ₹{intelligenceData.budgetRemaining.toLocaleString()}</span>
                    </div>
                    {intelligenceData.budgetRisk && (
                      <div className="hidden md:block">
                        <RiskBadge level={intelligenceData.budgetRisk.level} score={intelligenceData.budgetRisk.score} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 sm:gap-3 w-full md:w-auto z-10">
                  <button
                    type="button"
                    onClick={() => navigate('/profile')}
                    className="w-full md:w-auto px-6 py-3 rounded-xl bg-white/10 text-white font-bold tracking-wide hover:bg-white/20 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(255,255,255,0.1)] transition-all duration-300 border border-white/20 focus:outline-none focus:ring-2 focus:ring-sky-500 flex items-center justify-center gap-2"
                    aria-label="Edit profile"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>

              {/* Profile Fields Grid - Populated from DB */}
              <div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
                role="list"
                aria-label="Profile information"
              >
                {loading ? (
                  <>
                    <ProfileItemSkeleton />
                    <ProfileItemSkeleton />
                    <ProfileItemSkeleton />
                    <ProfileItemSkeleton />
                    <ProfileItemSkeleton />
                    <ProfileItemSkeleton />
                  </>
                ) : (
                  <>
                    <ProfileItem icon={Mail} label="Email" value={getUserField("email")} />
                    <ProfileItem icon={GraduationCap} label="Department" value={getUserField("department") || "Computer Science"} />
                    <ProfileItem icon={Calendar} label="Date of Birth" value={formatDOB(getUserField("dob"))} />
                    <ProfileItem icon={Phone} label="Phone" value={getUserField("contactNo") || getUserField("phone")} />
                    <ProfileItem icon={MapPin} label="Address" value={getUserField("address")} />
                    <ProfileItem icon={BookOpen} label="Batch" value={getUserField("batch") || "2023 - 2027"} />
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 🧠 SMART INTELLIGENCE LAYER */}
        <section className="space-y-6" aria-label="Smart Intelligence">
          {/* Intelligence Header */}
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.5)]"></div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide drop-shadow-md flex items-center gap-2">
              <Lightbulb className="h-7 w-7 text-amber-400" />
              Smart Intelligence
            </h2>
          </div>

          {/* Budget Risk Score - Prominent Display */}
          {intelligenceData.budgetRisk && (
            <div className="glass-card border border-white/10 p-6 rounded-2xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Budget Health Score</h3>
                  <RiskBadge level={intelligenceData.budgetRisk.level} score={intelligenceData.budgetRisk.score} />
                  <p className="text-sm text-slate-300 mt-2">{intelligenceData.budgetRisk.message}</p>
                </div>
                <div className="flex gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-400">Spent</p>
                    <p className="text-xl font-bold text-amber-400">₹{intelligenceData.budgetRisk.spent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Budget</p>
                    <p className="text-xl font-bold text-white">₹{intelligenceData.budgetRisk.total.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Smart Insights Cards */}
          {intelligenceData.insights.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {intelligenceData.insights.slice(0, 4).map((insight, idx) => {
                const typeConfig = {
                  alert: { icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
                  warning: { icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
                  critical: { icon: ShieldAlert, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30" },
                  positive: { icon: TrendingDown, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
                  pattern: { icon: Lightbulb, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
                  opportunity: { icon: Lightbulb, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
                  info: { icon: AlertTriangle, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" }
                };
                const { icon: Icon, color, bg, border } = typeConfig[insight.type] || typeConfig.info;

                return (
                  <div key={idx} className={`rounded-xl ${bg} border ${border} p-4 space-y-2`}>
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 mt-0.5 ${color}`} />
                      <div className="flex-1 space-y-1">
                        <h4 className={`font-bold text-sm ${color}`}>{insight.title}</h4>
                        <p className="text-xs text-slate-200">{insight.message}</p>
                        {insight.suggestion && (
                          <p className="text-xs text-emerald-300 font-semibold mt-2">
                            💡 {insight.suggestion}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mini Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly Trend Chart */}
            <div className="glass-card border border-white/10 p-5 rounded-2xl">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-400" />
                Spending Trend
              </h3>
              {intelligenceData.monthlyExpenses.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={intelligenceData.monthlyExpenses.slice(-6).map(item => ({
                    month: new Date(2026, item.month - 1, 1).toLocaleString('en-US', { month: 'short' }),
                    expense: item.totalExpense
                  }))}>
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px'
                      }} 
                    />
                    <Line type="monotone" dataKey="expense" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">
                  No spending data available
                </div>
              )}
            </div>

            {/* Category Breakdown Pie Chart */}
            <div className="glass-card border border-white/10 p-5 rounded-2xl">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <PieChart className="h-5 w-5 text-purple-400" />
                Category Breakdown
              </h3>
              {intelligenceData.categoryExpenses.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <RePieChart>
                    <Pie 
                      data={intelligenceData.categoryExpenses.slice(0, 5)} 
                      dataKey="totalExpense" 
                      nameKey="category" 
                      outerRadius={70}
                      label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                    >
                      {intelligenceData.categoryExpenses.slice(0, 5).map((entry, index) => (
                        <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px'
                      }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">
                  No category data available
                </div>
              )}
            </div>
          </div>

          {/* Prediction Card */}
          {intelligenceData.prediction.predictedExpense > 0 && (
            <div className="glass-card border border-white/10 p-5 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                  <TrendingUp className="h-7 w-7 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold mb-1">Next Month Prediction</h3>
                  <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    ₹{intelligenceData.prediction.predictedExpense.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Based on 3-month spending average</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Quick Actions Grid */}
        <section aria-labelledby="quick-actions-heading" className="relative z-20 mt-8 sm:mt-12">
          <div className="flex items-center gap-3 mb-6 sm:mb-8 md:pl-2">
            <div className="w-2 h-8 bg-sky-400 rounded-full shadow-[0_0_10px_rgba(56,189,248,0.5)]"></div>
            <h2 id="quick-actions-heading" className="text-2xl sm:text-3xl font-black text-white tracking-wide drop-shadow-md">
              Quick Actions
            </h2>
          </div>
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
            role="list"
            aria-label="Quick action cards"
          >
            {loading ? (
              <>
                <ActionCardSkeleton />
                <ActionCardSkeleton />
                <ActionCardSkeleton />
                <ActionCardSkeleton />
              </>
            ) : (
              <>
                <ActionCard
                  title="Pending Dues"
                  description="You have unpaid dues for this month. Clear them to avoid penalties."
                  icon={CreditCard}
                  action={() => navigate("/dues")}
                  primary={true}
                />
                <ActionCard
                  title="Analyze Spending"
                  description="View current budget allocation and submit new proposals."
                  icon={PieChart}
                  action={() => navigate("/class-budget")}
                />
                <ActionCard
                  title="Track Trends"
                  description="Track your complete payment history and download receipts."
                  icon={FileText}
                  action={() => navigate("/my-transactions")}
                />
                <ActionCard
                  title="View Insights"
                  description="View analytics on your spending and class fund utilization."
                  icon={BookOpen}
                  action={() => navigate("/reports")}
                />
              </>
            )}
          </div>
        </section>
      </div>
    </ModernLayout>
  );
}