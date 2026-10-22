import React, { useState, useEffect } from "react";
import api from "../../services/api";

export default function AIStatusBadge({ className = "" }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchStatus() {
      try {
        const res = await api.get("/ai/status");
        if (isMounted && res.data?.success) {
          setStatus(res.data.data);
        }
      } catch (err) {
        if (isMounted) {
          setStatus({ available: false, provider: "none", model: "none" });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchStatus();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700 animate-pulse ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
        Checking AI...
      </span>
    );
  }

  const isAvailable = Boolean(status?.available);

  return (
    <span
      title={`Provider: ${status?.provider || 'none'} | Model: ${status?.model || 'none'}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
        isAvailable
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
          : "bg-slate-800/80 text-slate-400 border-slate-700/80"
      } ${className}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isAvailable ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-slate-500"
        }`}
      />
      {isAvailable ? "AI Intelligence Ready" : "AI Offline"}
    </span>
  );
}
