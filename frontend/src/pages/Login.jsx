import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Loader2, 
  Mail, 
  Moon, 
  Sun, 
  Monitor, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  Wallet, 
  CheckCircle2, 
  BrainCircuit,
  Lock
} from "lucide-react";
import toast from "react-hot-toast";
import { getPostAuthPath } from "../utils/authRouting";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../utils/api";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const [theme, setTheme] = useState("system");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Show OAuth error messages from redirect
  useEffect(() => {
    const hasError = searchParams.get("error") === "true";
    const message = searchParams.get("message");
    if (hasError && message) {
      toast.error(decodeURIComponent(message));
    }
  }, [searchParams]);

  // Redirect if session was restored by AuthProvider
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getPostAuthPath(user), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Handle Google OAuth login
  const handleGoogleLogin = () => {
    setIsLoading(true);
    window.location.assign(`${API_BASE_URL}/auth/google`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-[#0B0F19] relative overflow-hidden text-slate-100 selection:bg-sky-500 selection:text-white">
      {/* Background Gradients & Mesh Glows */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-500/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-indigo-500/15 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-purple-500/15 rounded-full blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
      </div>

      {/* Floating Header & Theme Switcher */}
      <header className="w-full max-w-7xl mx-auto px-6 pt-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800 shadow-sm backdrop-blur-md">
            <img 
              src="/logo.png" 
              alt="SEIP Logo" 
              className="w-7 h-7 object-contain" 
              style={{ maxWidth: "28px", maxHeight: "28px" }}
            />
          </div>
          <span className="text-sm font-bold tracking-wider text-slate-300 uppercase">SEIP Treasury</span>
        </div>

        <div className="flex items-center p-1.5 rounded-full bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-lg">
          <button
            onClick={() => setTheme("light")}
            title="Light Mode"
            className={`p-2 rounded-full transition-all duration-200 ${
              theme === "light" 
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/25" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Sun size={15} />
          </button>
          <button
            onClick={() => setTheme("dark")}
            title="Dark Mode"
            className={`p-2 rounded-full transition-all duration-200 ${
              theme === "dark" 
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/25" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Moon size={15} />
          </button>
          <button
            onClick={() => setTheme("system")}
            title="System Preference"
            className={`p-2 rounded-full transition-all duration-200 ${
              theme === "system" 
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/25" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Monitor size={15} />
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 p-4 sm:p-6 lg:p-8 z-10 my-auto">
        {/* Left Branding Section (Visible on LG screens) */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden lg:flex lg:col-span-7 flex-col justify-between pr-4"
        >
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs font-semibold tracking-wide backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              Next-Gen Treasury Management System
            </div>

            <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              Smart Expense <br />
              <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-teal-300 bg-clip-text text-transparent">
                Intelligence Platform
              </span>
            </h1>

            <p className="text-base lg:text-lg text-slate-400 font-normal max-w-lg leading-relaxed">
              Automated budget tracking, real-time analytics, and AI-driven expense intelligence for organizations, clubs, startups, and institutions.
            </p>

            {/* Feature List */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              {[
                { icon: BrainCircuit, title: "AI Expense Insights", desc: "Automated pattern detection" },
                { icon: TrendingUp, title: "Budget Forecasting", desc: "Predictive financial planning" },
                { icon: Wallet, title: "Dues & Treasury", desc: "Real-time payment tracking" },
                { icon: ShieldCheck, title: "Audit Verification", desc: "Role-based security controls" },
              ].map((feat) => (
                <div 
                  key={feat.title} 
                  className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-sky-500/40 transition-all duration-300 group backdrop-blur-sm"
                >
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-2 group-hover:scale-110 transition-transform">
                    <feat.icon size={18} />
                  </div>
                  <h4 className="text-sm font-semibold text-white">{feat.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3 pt-6 border-t border-slate-800/80">
            {[
              { value: "₹3.2L+", label: "Managed Dues" },
              { value: "500+", label: "Active Members" },
              { value: "98.5%", label: "Collection Rate" },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3 text-center">
                <span className="text-lg font-bold text-sky-400">{stat.value}</span>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right Side: High-End Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-5 flex items-center justify-center"
        >
          <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-2xl rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
            {/* Top Glowing Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-teal-400" />

            {/* Mobile Header */}
            <div className="text-center lg:hidden pb-2 border-b border-slate-800/60">
              <img 
                src="/logo.png" 
                alt="SEIP Logo" 
                className="w-12 h-12 mx-auto mb-3 drop-shadow-[0_0_20px_rgba(56,189,248,0.3)] object-contain" 
                style={{ maxWidth: "48px", maxHeight: "48px" }}
              />
              <h2 className="text-lg font-bold text-white tracking-tight">Smart Expense Intelligence Platform</h2>
              <p className="text-xs text-slate-400 mt-1">Universal Financial Management & Analytics</p>
            </div>

            {/* Card Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
                <Sparkles size={13} />
                <span>AI Powered Portal</span>
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Welcome to SEIP AI</h2>
              <p className="text-slate-400 text-xs sm:text-sm max-w-xs mx-auto leading-relaxed">
                Sign in with your authorized Google account to access your dashboard.
              </p>
            </div>

            {/* Google OAuth Login Button */}
            <div className="space-y-4 pt-1">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                aria-label={isLoading ? "Redirecting to Google..." : "Sign in with Google"}
                className="w-full py-3.5 px-5 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-2xl shadow-lg hover:shadow-sky-500/10 transition-all duration-200 flex items-center justify-center gap-3 border border-slate-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed group focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
                    <span className="text-sm">Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span className="text-sm font-semibold tracking-tight text-slate-800 group-hover:text-slate-950">
                      Sign in with Google
                    </span>
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative py-1 flex items-center justify-center">
                <div className="w-full border-t border-slate-800" />
                <span className="absolute px-3 bg-slate-900 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Institutional Access
                </span>
              </div>

              {/* Feature Checklist */}
              <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
                {[
                  "Google SSO Enabled",
                  "AI Budget Forecasts",
                  "Real-Time Analytics",
                  "Role-Based Security"
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 size={14} className="text-sky-400 flex-shrink-0" />
                    <span className="font-medium text-slate-300">{item}</span>
                  </div>
                ))}
              </div>

              {/* Institutional / Organization Mail Callout Box */}
              <div className="bg-sky-950/30 border border-sky-500/20 rounded-2xl p-4 flex gap-3.5 items-start">
                <div className="p-2 bg-sky-500/10 rounded-xl text-sky-400 flex-shrink-0 border border-sky-500/20">
                  <Mail size={16} />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white tracking-wide uppercase">
                    Authorized Sign-In
                  </h4>
                  <p className="text-xs text-slate-400 leading-snug">
                    Access is enabled for registered organization members and teams.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="pt-2 text-center border-t border-slate-800/60 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <Lock size={12} className="text-slate-500" />
              <span>256-bit Encrypted Session Management</span>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-slate-500 text-xs font-medium border-t border-slate-900 bg-slate-950/40 z-10">
        <p>&copy; {new Date().getFullYear()} Smart Expense Intelligence Platform (SEIP). All rights reserved.</p>
      </footer>
    </div>
  );
}
