import React, { useState, useEffect } from "react";
import { Sparkles, RefreshCw, AlertCircle, Info, AlertTriangle, ArrowUpRight, TrendingUp, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import api from "../../utils/api";

const SEVERITY_STYLES = {
  critical: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  notice: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  info: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  high: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  low: "bg-sky-500/10 text-sky-400 border-sky-500/30"
};

export default function SpendingInsightsSection({ className = "" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null);

  const fetchInsights = async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/ai/insights/spending${force ? "?force=true" : ""}`);
      setData(res.data?.data || null);
    } catch (err) {
      console.error("Failed to load spending insights:", err);
      setError(err.response?.data?.message || err.message || "Failed to load spending insights");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights(false);
  }, []);

  const insights = data?.insights || [];
  const periodLabel = data?.period?.current?.label || "Current Period";
  const isInsufficient = data?.dataSufficiency?.insufficientData;

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              AI Spending Insights
            </h3>
            <p className="text-[11px] text-slate-400">{periodLabel}</p>
          </div>
        </div>

        <button
          onClick={() => fetchInsights(true)}
          disabled={loading}
          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition-colors disabled:opacity-50"
          title="Regenerate insights"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-400" : ""}`} />
        </button>
      </div>

      {/* Loading state */}
      {loading && !data && (
        <div className="space-y-2.5 animate-pulse">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
            <div className="h-4 w-32 bg-slate-800 rounded"></div>
            <div className="h-3 w-full bg-slate-850 rounded"></div>
            <div className="h-3 w-4/5 bg-slate-850 rounded"></div>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
            <div className="h-4 w-28 bg-slate-800 rounded"></div>
            <div className="h-3 w-3/4 bg-slate-850 rounded"></div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !data && (
        <div className="p-3.5 rounded-xl border border-rose-900/40 bg-rose-950/20 text-xs text-rose-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchInsights(true)}
            className="px-2.5 py-1 rounded bg-rose-900/40 hover:bg-rose-900/60 text-[11px] font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Insufficient Data state */}
      {!loading && isInsufficient && (
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 text-center space-y-1.5">
          <Info className="w-5 h-5 text-slate-500 mx-auto" />
          <p className="text-xs font-semibold text-slate-300">Not Enough Spending Data</p>
          <p className="text-[11px] text-slate-500">
            {data?.dataSufficiency?.notice || "Record transactions to receive personalized spending insights and trends."}
          </p>
        </div>
      )}

      {/* Insights List */}
      {!loading && insights.length > 0 && (
        <div className="space-y-2.5">
          {insights.map((item, idx) => {
            const severityClass = SEVERITY_STYLES[item.severity?.toLowerCase()] || SEVERITY_STYLES.info;
            const isExpanded = expandedIndex === idx;

            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all text-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${severityClass}`}>
                        {item.severity || "info"}
                      </span>
                      {typeof item.confidence === "number" && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {Math.round(item.confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-slate-100 text-sm mt-1">{item.title}</h4>
                  </div>

                  <button
                    onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                    className="p-1 text-slate-400 hover:text-slate-200"
                    title="Toggle details"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <p className="text-slate-300 leading-relaxed">
                  {item.summary || item.message}
                </p>

                {(item.recommendation || item.suggestion) && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/30 text-emerald-300 text-[11px] flex items-start gap-1.5">
                    <span className="font-bold text-emerald-400 shrink-0">💡 Advice:</span>
                    <span>{item.recommendation || item.suggestion}</span>
                  </div>
                )}

                {/* Expanded deterministic facts view */}
                {isExpanded && data?.summary && (
                  <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 grid grid-cols-2 gap-2 bg-slate-950/40 p-2 rounded-lg">
                    <div>
                      <span className="text-slate-500 block">Total Expenses:</span>
                      <strong className="text-slate-200">₹{(data.summary.totalExpense || 0).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Net Cash Flow:</span>
                      <strong className={data.summary.netCashFlow >= 0 ? "text-emerald-400" : "text-rose-400"}>
                        ₹{(data.summary.netCashFlow || 0).toLocaleString()}
                      </strong>
                    </div>
                    {data.rankings?.topCategory && (
                      <div className="col-span-2">
                        <span className="text-slate-500 block">Top Category:</span>
                        <strong className="text-slate-200">
                          {data.rankings.topCategory.category} (₹{data.rankings.topCategory.current.toLocaleString()})
                        </strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
