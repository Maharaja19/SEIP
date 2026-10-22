import React, { useState } from "react";
import { Sparkles, Check, X, RefreshCw, AlertCircle, Edit2 } from "lucide-react";
import api from "../../utils/api";

const CONFIDENCE_BADGES = {
  HIGH: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  LOW: "bg-blue-500/10 text-blue-400 border-blue-500/30"
};

export default function TransactionClassificationCard({
  transaction,
  categories = [],
  onUpdated = () => {},
  className = ""
}) {
  const transactionId = transaction._id || transaction.id;
  const initialClassification = transaction.AIClassification || null;

  const [classification, setClassification] = useState(initialClassification);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusOverride, setStatusOverride] = useState(null);
  const [isChanging, setIsChanging] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(transaction.category || "");

  const currentStatus = statusOverride || classification?.status || "IDLE";
  const confidence = classification?.confidence;
  const confidencePercent = typeof confidence === "number" ? Math.round(confidence * 100) : null;
  const confidenceTier = confidence >= 0.85 ? "HIGH" : confidence >= 0.60 ? "MEDIUM" : "LOW";

  // Trigger classification
  const handleClassify = async (force = false) => {
    if (!transactionId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.post(`/ai/transactions/${transactionId}/classify${force ? "?force=true" : ""}`);
      const data = res.data?.data;
      if (data?.classification) {
        setClassification(data.classification);
        setStatusOverride(data.classification.status);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to classify transaction";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Accept suggested category
  const handleAccept = async () => {
    if (!transactionId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.post(`/ai/transactions/${transactionId}/classification/accept`);
      const updated = res.data?.data;
      setStatusOverride("ACCEPTED");
      if (updated?.classification) {
        setClassification(updated.classification);
      }
      onUpdated({ ...transaction, category: updated?.category || classification?.suggestedCategory });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to accept classification";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Reject / dismiss suggested category
  const handleReject = async () => {
    if (!transactionId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.post(`/ai/transactions/${transactionId}/classification/reject`, {
        reason: "User dismissed in UI"
      });
      setStatusOverride("REJECTED");
      onUpdated(transaction);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to reject suggestion";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Manual category override
  const handleManualChange = async () => {
    if (!selectedCategory || selectedCategory === transaction.category) {
      setIsChanging(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.put(`/transactions/${transactionId}`, {
        category: selectedCategory
      });
      setStatusOverride("MANUAL_OVERRIDE");
      setIsChanging(false);
      onUpdated({ ...transaction, category: selectedCategory });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to update category";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // 1. Idle state (no suggestion generated yet)
  if (currentStatus === "IDLE" || !classification || !classification.suggestedCategory) {
    return (
      <div className={`flex items-center gap-2 p-2 rounded-lg bg-slate-900/40 border border-slate-800 ${className}`}>
        <button
          onClick={() => handleClassify(false)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw size={12} className="animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles size={12} />
              <span>Categorize with AI</span>
            </>
          )}
        </button>
        {error && <span className="text-xs text-rose-400 truncate">{error}</span>}
      </div>
    );
  }

  // 2. Loading state
  if (loading && !classification) {
    return (
      <div className={`p-3 rounded-xl border border-slate-800 bg-slate-900/60 animate-pulse text-xs text-slate-400 flex items-center gap-2 ${className}`}>
        <RefreshCw size={14} className="animate-spin text-blue-400" />
        <span>Classifying transaction with Gemini AI...</span>
      </div>
    );
  }

  // 3. Accepted state
  if (currentStatus === "ACCEPTED") {
    return (
      <div className={`flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300 ${className}`}>
        <div className="flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />
          <span>Category confirmed: <strong>{classification.suggestedCategory}</strong></span>
        </div>
        <button
          onClick={() => handleClassify(true)}
          className="text-[11px] text-slate-400 hover:text-slate-200 underline"
          title="Re-run AI classification"
        >
          Re-analyze
        </button>
      </div>
    );
  }

  // 4. Rejected state
  if (currentStatus === "REJECTED") {
    return (
      <div className={`flex items-center justify-between p-2.5 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-slate-400 ${className}`}>
        <span>AI recommendation dismissed</span>
        <button
          onClick={() => handleClassify(true)}
          className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
        >
          <Sparkles size={11} /> Re-classify
        </button>
      </div>
    );
  }

  // 5. Error state
  if (error && !classification) {
    return (
      <div className={`p-3 rounded-lg bg-rose-950/20 border border-rose-900/40 text-xs text-rose-300 flex items-center justify-between gap-2 ${className}`}>
        <div className="flex items-center gap-2">
          <AlertCircle size={14} className="text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
        <button
          onClick={() => handleClassify(true)}
          className="px-2 py-0.5 rounded bg-rose-900/40 hover:bg-rose-900/60 text-rose-200 text-[11px]"
        >
          Retry
        </button>
      </div>
    );
  }

  // 6. Active SUGGESTED state
  return (
    <div className={`p-3.5 rounded-xl border border-slate-800 bg-slate-900/90 shadow-sm space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          <Sparkles size={13} className="text-blue-400" />
          <span>AI Suggested Category</span>
        </div>

        <div className="flex items-center gap-1.5">
          {confidencePercent !== null && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${CONFIDENCE_BADGES[confidenceTier]}`}>
              {confidencePercent}% confidence ({confidenceTier})
            </span>
          )}
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-sm font-bold text-white px-2.5 py-1 rounded-md bg-blue-950/60 border border-blue-800/40">
          {classification.suggestedCategory}
        </span>
        {confidenceTier === "LOW" && (
          <span className="text-[11px] text-amber-400 font-medium">
            (Low confidence - review carefully)
          </span>
        )}
      </div>

      {classification.reason && (
        <p className="text-xs text-slate-300 italic">
          "{classification.reason}"
        </p>
      )}

      {error && (
        <p className="text-xs text-rose-400">{error}</p>
      )}

      {/* Manual Change Dropdown */}
      {isChanging ? (
        <div className="flex items-center gap-2 pt-1">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 px-2.5 py-1 text-xs rounded-md bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">Select Category...</option>
            {categories.map((c) => (
              <option key={c.slug || c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleManualChange}
            disabled={loading}
            className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
          >
            Save
          </button>
          <button
            onClick={() => setIsChanging(false)}
            className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
          >
            Cancel
          </button>
        </div>
      ) : (
        /* Action buttons */
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <Check size={12} />
            <span>Accept</span>
          </button>

          <button
            onClick={() => setIsChanging(true)}
            disabled={loading}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            <Edit2 size={11} />
            <span>Change</span>
          </button>

          <button
            onClick={handleReject}
            disabled={loading}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800/60 hover:bg-rose-950/40 hover:text-rose-400 text-slate-400 text-xs transition-colors"
          >
            <X size={12} />
            <span>Dismiss</span>
          </button>
        </div>
      )}
    </div>
  );
}
