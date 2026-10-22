import React from "react";

const SEVERITY_STYLES = {
  critical: "bg-red-500/10 text-red-400 border-red-500/30",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  info: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
};

export default function AIInsightCard({
  insight,
  loading = false,
  error = null,
  className = ""
}) {
  if (loading) {
    return (
      <div className={`p-4 rounded-xl border border-slate-800 bg-slate-900/60 animate-pulse space-y-3 ${className}`}>
        <div className="h-4 w-28 bg-slate-800 rounded"></div>
        <div className="h-5 w-3/4 bg-slate-800 rounded"></div>
        <div className="h-4 w-full bg-slate-850 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 rounded-xl border border-red-900/30 bg-red-950/20 text-red-400 text-sm ${className}`}>
        <p className="font-semibold mb-1">Failed to load insight</p>
        <p className="text-xs text-red-400/80">{String(error)}</p>
      </div>
    );
  }

  if (!insight) {
    return (
      <div className={`p-6 rounded-xl border border-slate-800/80 bg-slate-900/40 text-center text-slate-500 text-sm ${className}`}>
        No insights generated for this selection.
      </div>
    );
  }

  const severityClass = SEVERITY_STYLES[insight.severity?.toLowerCase()] || SEVERITY_STYLES.info;

  return (
    <div className={`p-4 rounded-xl border border-slate-800 bg-slate-900/90 shadow-sm hover:border-slate-700 transition-colors ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider border ${severityClass}`}>
          {insight.severity || "info"}
        </span>

        {typeof insight.confidence === "number" && (
          <span className="text-[11px] text-slate-400 font-mono">
            {Math.round(insight.confidence * 100)}% confidence
          </span>
        )}
      </div>

      <h4 className="text-sm font-semibold text-slate-100 mb-1">{insight.title}</h4>
      <p className="text-xs text-slate-300 leading-relaxed mb-3">
        {insight.summary || insight.message}
      </p>

      {insight.suggestion && (
        <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs text-slate-300">
          <span className="font-semibold text-emerald-400 mr-1.5">Suggestion:</span>
          {insight.suggestion}
        </div>
      )}
    </div>
  );
}
