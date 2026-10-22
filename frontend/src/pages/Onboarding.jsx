import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Tag,
  CheckCircle,
  ArrowRight,
  User,
  Sparkles,
  Shield,
  PiggyBank,
  Brain,
  BarChart3,
  Lightbulb,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { getPostAuthPath } from "../utils/authRouting";
import { normalizeUserFromApi } from "../utils/authUser";

const STEPS = [
  { id: 1, label: "Profile" },
  { id: 2, label: "Organization" },
  { id: 3, label: "Financial" },
  { id: 4, label: "AI" },
  { id: 5, label: "Consent" },
];

const CATEGORY_OPTIONS = [
  "Food & Dining",
  "Transport",
  "Shopping",
  "Entertainment",
  "Books & Study",
  "Health & Fitness",
  "Events & Activities",
  "Miscellaneous",
];

const SAVINGS_PRESETS = [1000, 2000, 5000];

const IDENTIFIER_PATTERN = /^[A-Za-z0-9_./-]{2,30}$/;

const COMPLETION_ITEMS = [
  { label: "Profile Configured", icon: User },
  { label: "AI Insights Enabled", icon: Brain },
  { label: "Wallet Ready", icon: Wallet },
  { label: "Dashboard Ready", icon: BarChart3 },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [visibleCompletionItems, setVisibleCompletionItems] = useState(0);

  const [formData, setFormData] = useState({
    registerNumber: "",
    branch: "",
    batch: "",
    year: "1st Year",
    hasWallet: false,
    monthlyIncome: "",
    monthlyExpense: "",
    savingsGoal: "",
    spendingCategories: [],
    aiInsights: true,
    aiForecasting: true,
    aiRecommendations: true,
    termsAccepted: false,
    privacyAccepted: false,
    analyticsConsent: false,
  });

  useEffect(() => {
    if (!completed) return;

    const timers = COMPLETION_ITEMS.map((_, i) =>
      setTimeout(() => setVisibleCompletionItems(i + 1), (i + 1) * 600)
    );

    const redirectTimer = setTimeout(() => {
      const storedUser = (() => {
        try {
          return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
          return null;
        }
      })();
      navigate(getPostAuthPath(storedUser || user));
    }, 4000);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(redirectTimer);
    };
  }, [completed, navigate, user]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleCategory = (category) => {
    setFormData((prev) => {
      const categories = prev.spendingCategories.includes(category)
        ? prev.spendingCategories.filter((c) => c !== category)
        : [...prev.spendingCategories, category];
      return { ...prev, spendingCategories: categories };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        registerNumber: formData.registerNumber.trim().toUpperCase(),
        branch: formData.branch,
        batch: formData.batch,
        year: formData.year,
        hasWallet: formData.hasWallet,
        monthlyIncome: parseFloat(formData.monthlyIncome) || 0,
        monthlyExpense: parseFloat(formData.monthlyExpense) || 0,
        savingsGoal: parseFloat(formData.savingsGoal) || 0,
        spendingCategories: formData.spendingCategories,
        aiPreferences: {
          insights: formData.aiInsights,
          forecasting: formData.aiForecasting,
          recommendations: formData.aiRecommendations,
        },
        termsAccepted: formData.termsAccepted,
        privacyAccepted: formData.privacyAccepted,
        analyticsConsent: formData.analyticsConsent,
      };

      const response = await api.post("/auth/onboarding", payload);

      if (response.data.success) {
        const updatedUser = normalizeUserFromApi(response.data.user);
        const token = response.data.token || localStorage.getItem("token");

        login(updatedUser, token);
        toast.success("Profile setup complete!");
        setCompleted(true);
      } else {
        throw new Error(response.data.message || "Onboarding failed");
      }
    } catch (error) {
      console.error("Onboarding failed:", error);
      const message =
        error.response?.data?.message ||
        "Failed to complete onboarding. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return true;
      case 2:
        return (
          !formData.registerNumber.trim() ||
          IDENTIFIER_PATTERN.test(formData.registerNumber.trim())
        );
      case 3:
        return formData.spendingCategories.length > 0;
      case 4:
        return true;
      case 5:
        return (
          formData.termsAccepted &&
          formData.privacyAccepted &&
          formData.analyticsConsent
        );
      default:
        return false;
    }
  };

  const profileUser = user;
  const firstName = profileUser?.name?.split(" ")[0] || "there";

  const profilePicture =
    profileUser?.profilePicture ||
    profileUser?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser?.name || "User")}&background=0ea5e9&color=fff`;

  if (completed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="text-6xl mb-6"
          >
            🎉
          </motion.div>
          <h1 className="text-3xl font-black text-white mb-2">Setup Complete</h1>
          <p className="text-slate-300 mb-8">Your SEIP profile is ready</p>

          <div className="space-y-3 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
            {COMPLETION_ITEMS.map((item, i) => {
              const Icon = item.icon;
              const visible = i < visibleCompletionItems;
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={visible ? { opacity: 1, x: 0 } : {}}
                  className={`flex items-center gap-3 ${visible ? "text-green-300" : "text-slate-500"}`}
                >
                  {visible ? (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  ) : (
                    <Icon className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium">{item.label}</span>
                </motion.div>
              );
            })}
          </div>

          <p className="text-slate-400 text-sm mt-6">Redirecting to your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white mb-2">Welcome to SEIP</h1>
          <p className="text-slate-300 text-lg">
            Let's set up your profile in {STEPS.length} quick steps
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-2 overflow-x-auto gap-1 pb-2">
            {STEPS.map((s) => (
              <div key={s.id} className="flex flex-col items-center gap-1 min-w-0 flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    step >= s.id ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {step > s.id ? <CheckCircle className="w-5 h-5" /> : s.id}
                </div>
                <span
                  className={`text-xs font-medium truncate ${
                    step >= s.id ? "text-white" : "text-slate-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              initial={{ width: "0%" }}
              animate={{ width: `${(step / STEPS.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 shadow-2xl">
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {/* Step 1: Google Profile Preview */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Welcome {firstName} 👋
                  </h2>
                  <p className="text-slate-300 text-sm mb-6">
                    Your Google account is connected. Confirm your details below.
                  </p>

                  <div className="flex flex-col items-center gap-5 p-6 bg-slate-800/50 rounded-xl border border-slate-600">
                    <img
                      src={profilePicture}
                      alt={profileUser?.name || "Profile"}
                      className="w-24 h-24 rounded-full border-4 border-blue-500/50 object-cover shadow-lg"
                    />

                    <div className="w-full space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-700">
                        <span className="text-slate-400 text-sm">Name</span>
                        <span className="text-white font-semibold">{profileUser?.name || "—"}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-700">
                        <span className="text-slate-400 text-sm">Email</span>
                        <span className="text-white font-medium text-sm">{profileUser?.email || "—"}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-slate-400 text-sm">Role</span>
                        <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm font-semibold">
                          {profileUser?.role || "Student"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-sky-500/10 border border-sky-500/30 rounded-lg text-sm text-slate-300">
                    Continue to add your academic details, financial profile, and AI preferences.
                  </div>
                </motion.div>
              )}

              {/* Step 2: Organization / Academic */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Organization & Identity</h2>
                    <p className="text-slate-300 text-sm">
                      Optional member identifier and organizational details for role-tailored tracking.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Member / Student / Employee ID (Optional)
                    </label>
                    <input
                      type="text"
                      name="registerNumber"
                      value={formData.registerNumber}
                      onChange={handleInputChange}
                      placeholder="e.g., 23CS101, EMP-1042, or 727823TUEE001"
                      className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    />
                    {formData.registerNumber &&
                      !IDENTIFIER_PATTERN.test(formData.registerNumber.trim()) && (
                        <p className="text-amber-400 text-xs mt-1">
                          Format: 2 to 30 alphanumeric characters (symbols . _ / - allowed)
                        </p>
                      )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Department / Branch / Team (Optional)
                    </label>
                    <input
                      type="text"
                      name="branch"
                      value={formData.branch}
                      onChange={handleInputChange}
                      placeholder="e.g., Engineering, Operations, or Computer Science"
                      className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Batch / Cohort / Cycle (Optional)
                    </label>
                    <input
                      type="text"
                      name="batch"
                      value={formData.batch}
                      onChange={handleInputChange}
                      placeholder="e.g., 2023 - 2027 or 2026"
                      className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Level / Tier
                    </label>
                    <select
                      name="year"
                      value={formData.year}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1st Year">1st Year / Associate</option>
                      <option value="2nd Year">2nd Year / Specialist</option>
                      <option value="3rd Year">3rd Year / Senior</option>
                      <option value="4th Year">4th Year / Lead</option>
                    </select>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Financial */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold text-white mb-6">Financial Profile</h2>

                  <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Wallet className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div>
                        <h3 className="text-blue-300 font-semibold mb-1">Digital Wallet</h3>
                        <p className="text-sm text-slate-300">
                          SEIP includes a built-in wallet for tracking expenses and budget.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-600">
                    <input
                      type="checkbox"
                      name="hasWallet"
                      checked={formData.hasWallet}
                      onChange={handleInputChange}
                      className="w-5 h-5 rounded border-slate-600 text-blue-500 focus:ring-blue-500"
                    />
                    <label className="text-white font-medium cursor-pointer">
                      Enable wallet features for expense tracking
                    </label>
                  </div>

                  {formData.hasWallet && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                          <TrendingUp className="w-4 h-4 inline mr-1" />
                          Monthly Income (₹)
                        </label>
                        <input
                          type="number"
                          name="monthlyIncome"
                          value={formData.monthlyIncome}
                          onChange={handleInputChange}
                          placeholder="e.g., 5000"
                          min="0"
                          className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                          <TrendingDown className="w-4 h-4 inline mr-1" />
                          Monthly Expense Budget (₹)
                        </label>
                        <input
                          type="number"
                          name="monthlyExpense"
                          value={formData.monthlyExpense}
                          onChange={handleInputChange}
                          placeholder="e.g., 3000"
                          min="0"
                          className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </motion.div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      <PiggyBank className="w-4 h-4 inline mr-1" />
                      Monthly Savings Goal (₹)
                    </label>
                    <div className="flex gap-2 mb-3">
                      {SAVINGS_PRESETS.map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              savingsGoal: String(amount),
                            }))
                          }
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold border transition-all ${
                            formData.savingsGoal === String(amount)
                              ? "bg-blue-500/30 border-blue-500 text-white"
                              : "bg-slate-800/50 border-slate-600 text-slate-300 hover:border-slate-500"
                          }`}
                        >
                          ₹{amount.toLocaleString("en-IN")}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      name="savingsGoal"
                      value={formData.savingsGoal}
                      onChange={handleInputChange}
                      placeholder="Custom amount"
                      min="0"
                      className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-600">
                    <h3 className="text-lg font-bold text-white mb-2">Spending Categories</h3>
                    <p className="text-slate-300 text-sm mb-4">
                      Select categories you spend on (choose at least one)
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {CATEGORY_OPTIONS.map((category) => {
                        const isSelected = formData.spendingCategories.includes(category);
                        return (
                          <button
                            key={category}
                            type="button"
                            onClick={() => toggleCategory(category)}
                            className={`p-3 rounded-lg border-2 transition-all duration-200 flex items-center gap-2 ${
                              isSelected
                                ? "bg-blue-500/30 border-blue-500 text-white"
                                : "bg-slate-800/50 border-slate-600 text-slate-300 hover:border-slate-500"
                            }`}
                          >
                            <Tag className="w-4 h-4" />
                            <span className="text-sm font-medium">{category}</span>
                          </button>
                        );
                      })}
                    </div>
                    {formData.spendingCategories.length === 0 && (
                      <p className="text-amber-400 text-sm text-center mt-3">
                        Please select at least one category
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 4: AI Preferences */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                    AI Preferences
                  </h2>
                  <p className="text-slate-300 text-sm mb-6">
                    Choose which AI-powered features you'd like enabled on your dashboard
                  </p>

                  <div className="space-y-3">
                    {[
                      { name: "aiInsights", label: "AI Insights", desc: "Personalised spending analysis and tips", icon: Lightbulb },
                      { name: "aiForecasting", label: "Expense Forecasting", desc: "Predict upcoming expenses based on patterns", icon: BarChart3 },
                      { name: "aiRecommendations", label: "Budget Recommendations", desc: "Smart suggestions to improve your savings", icon: Brain },
                    ].map(({ name, label, desc, icon: Icon }) => (
                      <div
                        key={name}
                        className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-600"
                      >
                        <input
                          type="checkbox"
                          name={name}
                          checked={formData[name]}
                          onChange={handleInputChange}
                          className="w-5 h-5 rounded border-slate-600 text-purple-500 focus:ring-purple-500"
                        />
                        <Icon className="w-5 h-5 text-purple-400 flex-shrink-0" />
                        <div>
                          <label className="text-white font-semibold cursor-pointer block">{label}</label>
                          <p className="text-slate-400 text-xs mt-0.5">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 5: Privacy & Consent */}
              {step === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-6 h-6 text-green-400" />
                    <h2 className="text-2xl font-bold text-white">Privacy & Consent</h2>
                  </div>
                  <p className="text-slate-300 text-sm mb-6">
                    Please review and accept the following before completing setup
                  </p>

                  <div className="space-y-4">
                    {[
                      { name: "termsAccepted", label: "I accept the Terms of Service" },
                      { name: "privacyAccepted", label: "I accept the Privacy Policy" },
                      {
                        name: "analyticsConsent",
                        label: "I consent to analytics processing of my financial data",
                      },
                    ].map(({ name, label }) => (
                      <div
                        key={name}
                        className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-600"
                      >
                        <input
                          type="checkbox"
                          name={name}
                          checked={formData[name]}
                          onChange={handleInputChange}
                          className="w-5 h-5 mt-0.5 rounded border-slate-600 text-green-500 focus:ring-green-500"
                          required
                        />
                        <label className="text-white font-medium cursor-pointer text-sm leading-relaxed">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>

                  {!canProceed() && (
                    <p className="text-amber-400 text-sm text-center">
                      All consent checkboxes must be checked to continue
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex gap-4 mt-8">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex-1 py-3 px-6 rounded-lg bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  Back
                </button>
              )}

              {step < STEPS.length ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="flex-1 py-3 px-6 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Next
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !canProceed()}
                  className="flex-1 py-3 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      Completing...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <CheckCircle className="w-5 h-5" />
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        <p className="text-center text-slate-400 text-sm mt-6">
          You can update these details later in your profile settings
        </p>
      </motion.div>
    </div>
  );
};

export default Onboarding;
