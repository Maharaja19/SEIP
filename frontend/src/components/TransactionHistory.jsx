import { useState } from "react";
import { Trash2, History, InboxIcon, Sparkles } from "lucide-react";
import { cn } from "../utils/cn";
import TransactionClassificationCard from "./ai/TransactionClassificationCard";

export function TransactionHistory({ transactions, categories, onDeleteTransaction, onTransactionUpdated }) {
  const [expandedAiId, setExpandedAiId] = useState(null);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get category color
  const getCategoryColor = (categoryName) => {
    const category = categories?.find((c) => c.name === categoryName);
    return category?.color || "#3b82f6"; // Default blue
  };

  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
        <History size={20} className="text-blue-500" /> Transaction History
      </h3>

      {sortedTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
            <InboxIcon size={32} />
          </div>
          <h4 className="font-medium text-slate-900">No Transactions Found</h4>
          <p className="text-sm mt-1">Start by adding your first transaction</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedTransactions.map((transaction) => {
            const txId = transaction._id || transaction.id;
            const hasPendingAi = transaction.AIClassification?.status === "SUGGESTED";
            const isExpanded = expandedAiId === txId || hasPendingAi;

            return (
              <div
                key={txId}
                className="p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors group relative overflow-hidden"
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ backgroundColor: getCategoryColor(transaction.category) }}
                />

                <div className="flex items-center justify-between">
                  <div className="flex-1 ml-3">
                    <div className="font-medium text-slate-900">{transaction.description}</div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                        {transaction.category}
                      </span>
                      <span>{new Date(transaction.date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="text-right mr-4">
                    <span className={cn(
                      "font-bold text-lg",
                      transaction.type === 'income' ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {transaction.type === "expense" && (
                      <button
                        className={cn(
                          "p-2 rounded-lg transition-colors text-slate-400 hover:text-blue-600 hover:bg-blue-50",
                          hasPendingAi && "text-blue-500 bg-blue-50/60"
                        )}
                        onClick={() => setExpandedAiId(expandedAiId === txId ? null : txId)}
                        title="AI Categorization"
                      >
                        <Sparkles size={16} />
                      </button>
                    )}

                    <button
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      onClick={() => onDeleteTransaction(txId)}
                      title="Delete Transaction"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 ml-3 pt-3 border-t border-slate-100">
                    <TransactionClassificationCard
                      transaction={transaction}
                      categories={categories}
                      onUpdated={(updated) => {
                        if (onTransactionUpdated) {
                          onTransactionUpdated(updated);
                        }
                      }}
                    />
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