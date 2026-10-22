import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/theme.service"; // Import ThemeProvider
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import GoogleCallback from "./components/GoogleCallback";
import Dashboard from "./components/Dashboard";
import Student from "./pages/Student";
import Admin from "./pages/Admin";
import Treasurer from "./pages/Treasurer";
import Dues from "./pages/Dues";
import MyTransactions from "./pages/MyTransactions";
import Transactions from "./pages/Transactions";
import CollectionReport from "./pages/CollectionReport";
import MarkDues from "./pages/MarkDues";
import ManageStudents from "./pages/ManageStudents";
import ManageDues from "./pages/ManageDues";
import MonthlyReport from "./pages/MonthlyReport";
import ViewProfile from "./pages/ViewProfile";
import ClassBudget from "./pages/ClassBudget";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import Analytics from "./pages/Analytics";
import EventTimeline from "./pages/EventTimeline";
import ManageEvents from "./pages/ManageEvents";
import Wallet from "./pages/Wallet";
import WalletLedger from "./pages/WalletLedger";
import Onboarding from "./pages/Onboarding";
import Members from "./pages/Members";
import OrganizationProfile from "./pages/OrganizationProfile";

// Remove any potential DatabaseExport reference
// import { DatabaseExport } from "./scripts/view_database"; // This was causing the error

function App() {
  return (
    <ThemeProvider> {/* Wrap entire app in ThemeProvider */}
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/auth/google/callback" element={<GoogleCallback />} />

            <Route
              path="/onboarding"
              element={
                <ProtectedRoute skipOnboardingCheck>
                  <Onboarding />
                </ProtectedRoute>
              }
            />

            {/* Protected routes - Role-based */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Student routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute>
                  <Student />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ViewProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dues"
              element={
                <ProtectedRoute>
                  <Dues />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-transactions"
              element={
                <ProtectedRoute>
                  <MyTransactions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/class-budget"
              element={
                <ProtectedRoute>
                  <ClassBudget />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />

            {/* Treasurer routes */}
            <Route
              path="/treasurer"
              element={
                <ProtectedRoute>
                  <Treasurer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <Transactions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/collection-report"
              element={
                <ProtectedRoute>
                  <CollectionReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mark-dues"
              element={
                <ProtectedRoute>
                  <MarkDues />
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-students"
              element={
                <ProtectedRoute>
                  <ManageStudents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-dues"
              element={
                <ProtectedRoute>
                  <ManageDues />
                </ProtectedRoute>
              }
            />
            <Route
              path="/monthly-report"
              element={
                <ProtectedRoute>
                  <MonthlyReport />
                </ProtectedRoute>
              }
            />

            {/* Common routes */}
            <Route
              path="/events"
              element={
                <ProtectedRoute>
                  <EventTimeline />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-events"
              element={
                <ProtectedRoute>
                  <ManageEvents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet"
              element={
                <ProtectedRoute>
                  <Wallet />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet-ledger"
              element={
                <ProtectedRoute>
                  <WalletLedger />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/members"
              element={
                <ProtectedRoute>
                  <Members />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organization"
              element={
                <ProtectedRoute>
                  <OrganizationProfile />
                </ProtectedRoute>
              }
            />

            {/* Redirect root to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Fallback for unknown routes */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1e293b",
              color: "#f1f5f9",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;