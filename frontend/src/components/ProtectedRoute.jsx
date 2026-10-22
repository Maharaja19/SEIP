import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getPostAuthPath } from "../utils/authRouting";

import { isStudent } from "../utils/roles";

const ProtectedRoute = ({ children, skipOnboardingCheck = false }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 opacity-25"></div>
          <div className="absolute top-0 w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!skipOnboardingCheck && isStudent(user.role) && !user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  // Redirect completed students away from onboarding route
  if (skipOnboardingCheck && isStudent(user.role) && user.onboardingCompleted) {
    return <Navigate to={getPostAuthPath(user)} replace />;
  }

  return children;
};

export default ProtectedRoute;
