import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Download,
  TrendingUp,
  PieChart,
  AlertTriangle,
  RefreshCcw,
  Calendar
} from "lucide-react";
import api from "../utils/api";
import { getApiData, getApiErrorMessage } from "../utils/apiHelpers";
import { cn } from "../utils/cn";
import ModernLayout from "../components/layout/Layout";

export default function Reports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await api.get("/reports");
      setReports(getApiData(response) || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to fetch reports"));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  // If loading
  if (loading) {
    return (
      <ModernLayout>
        <div className="flex flex-col items-center justify-center p-20 h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mb-4"></div>
          <p className="text-slate-500">Generating analytics...</p>
        </div>
      </ModernLayout>
    );
  }

  // Mock stats since the original file had hardcoded stats or undefined API behavior in parts.
  // We can calculate real stats if reports contain data, or keep placeholders if API isn't fully ready.
  // For now, let's try to derive some stats from the reports array if possible, or use safe defaults.
  const totalReports = reports.length;
  // This is illustrative, assuming reports have a 'total' field as per previous code
  const totalReportedFunds = reports.reduce((acc, r) => acc + (r.total || 0), 0);

  return (
    <ModernLayout>
      <div className="space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-7 h-7 text-blue-600" /> Financial Reports
            </h1>
            <p className="text-slate-500 mt-1">Detailed analytics and historical financial summaries.</p>
          </div>
          <button
            onClick={fetchReports}
            className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-slate-900 rounded-lg transition-colors"
          >
            <RefreshCcw className="w-5 h-5" />
          </button>
        </header>

        {error ? (
          <div className="p-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Total Reports</p>
                    <h3 className="text-2xl font-bold text-slate-900">{totalReports}</h3>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Total Reported Volume</p>
                    <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalReportedFunds)}</h3>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
                    <PieChart className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Report Frequency</p>
                    <h3 className="text-2xl font-bold text-slate-900">Monthly</h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Reports List */}
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-900">🗂 Archive</h2>

              {reports.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-slate-300">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">No Reports Available</h3>
                  <p className="text-slate-500 max-w-sm mt-1">
                    Financial reports generated by the treasurer will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {reports.map((report, index) => (
                    <div key={index} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                      <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                        <div>
                          <h3 className="font-bold text-slate-900 mb-1">{report.title}</h3>
                          <p className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {report.date}
                          </p>
                        </div>
                        <span className="p-2 bg-white rounded-lg shadow-sm text-slate-400">
                          <FileText className="w-5 h-5" />
                        </span>
                      </div>

                      <div className="p-6 flex-1 space-y-4">
                        <p className="text-sm text-slate-600 line-clamp-3">
                          {report.description}
                        </p>

                        <div className="space-y-2 pt-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Total Budget</span>
                            <span className="font-medium text-slate-700">{formatCurrency(report.total)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Expenditure</span>
                            <span className="font-medium text-rose-600">{formatCurrency(report.spent)}</span>
                          </div>
                          <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-sm font-semibold text-slate-900">Remaining</span>
                            <span className={cn(
                              "text-lg font-bold",
                              report.remaining < 0 ? "text-rose-600" : "text-emerald-600"
                            )}>
                              {formatCurrency(report.remaining)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 border-t border-slate-100">
                        <button className="w-full py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:text-blue-600 hover:border-blue-200 transition-colors flex items-center justify-center gap-2">
                          <Download className="w-4 h-4" /> Download Report
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ModernLayout>
  );
}