import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getPostAuthPath } from "../utils/authRouting";
import { getAuthErrorMessage } from "../utils/authUser";
import toast from "react-hot-toast";
import api from "../utils/api";
import { motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";

const GoogleCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const handled = useRef(false);
  const [steps, setSteps] = useState({
    googleAuth: false,
    userVerification: false,
    dashboardLoad: false,
  });

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");
        const error = urlParams.get("error");
        const message = urlParams.get("message");

        if (error) {
          const errorMessage = message || "Google authentication failed";
          toast.error(errorMessage);
          navigate("/login?error=true&message=" + encodeURIComponent(errorMessage));
          return;
        }

        if (!token) {
          toast.error("No authentication token received");
          navigate(
            "/login?error=true&message=" +
              encodeURIComponent("No authentication token received")
          );
          return;
        }

        setSteps((prev) => ({ ...prev, googleAuth: true }));
        localStorage.setItem("token", token);

        setSteps((prev) => ({ ...prev, userVerification: true }));
        const response = await api.get("/auth/me");
        const userData = response.data?.user;

        if (!response.data?.success || !userData?._id) {
          throw new Error("Invalid user data from server");
        }

        login(userData, token);

        setSteps((prev) => ({ ...prev, dashboardLoad: true }));

        if (!userData.onboardingCompleted) {
          toast.success("Welcome! Let's set up your profile.");
          navigate("/onboarding", { replace: true });
          return;
        }

        toast.success("Welcome back!");
        navigate(getPostAuthPath(userData), { replace: true });
      } catch (e) {
        console.error("Error in Google callback:", e);
        const errorMsg = getAuthErrorMessage(e);
        toast.error(errorMsg);
        navigate("/login?error=true&message=" + encodeURIComponent(errorMsg));
      }
    };

    handleCallback();
  }, [navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full mix-blend-screen filter blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-sky-600/20 rounded-full mix-blend-screen filter blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center max-w-md"
      >
        <div className="mb-8">
          <img
            src="/logo.png"
            alt="SEIP Logo"
            className="w-16 h-16 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          />
          <h1 className="text-3xl font-black text-white mb-2">
            Smart Expense
            <span className="block bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              Intelligence Platform
            </span>
          </h1>
          <p className="text-slate-300 text-sm">Verifying your account...</p>
        </div>

        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <div className="relative w-16 h-16">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-400 border-r-sky-400"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 rounded-full border-2 border-transparent border-b-indigo-400"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 text-left bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <StepIndicator complete={steps.googleAuth} label="Google Authentication" />
          <StepIndicator complete={steps.userVerification} label="User Verification" />
          <StepIndicator complete={steps.dashboardLoad} label="Loading Dashboard" />
        </div>

        <p className="text-slate-400 text-xs mt-6">Please don't close this window</p>
      </motion.div>
    </div>
  );
};

const StepIndicator = ({ complete, label }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-center gap-3"
  >
    {complete ? (
      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
    ) : (
      <Loader2 className="w-5 h-5 text-sky-400 animate-spin flex-shrink-0" />
    )}
    <span className={`text-sm ${complete ? "text-green-300" : "text-slate-300"}`}>
      {label}
    </span>
  </motion.div>
);

export default GoogleCallback;
