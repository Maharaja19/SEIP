import React from "react";
import { Download, Plus, Settings, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { cn } from "../utils/cn";

// Skeleton Loader Components
const StatCardSkeleton = () => (
  <div 
    className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 flex items-center gap-4 sm:gap-6 animate-pulse"
    role="status"
    aria-label="Loading statistics"
  >
    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-200 flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-4 w-24 bg-slate-200 rounded" />
      <div className="h-7 w-32 bg-slate-200 rounded" />
    </div>
  </div>
);

const CategoryCardSkeleton = () => (
  <div 
    className="p-5 sm:p-6 rounded-xl border border-slate-100 bg-slate-50 animate-pulse"
    role="status"
    aria-label="Loading category"
  >
    <div className="flex justify-between items-center mb-3">
      <div className="h-5 w-24 bg-slate-200 rounded" />
      <div className="h-4 w-28 bg-slate-200 rounded" />
    </div>
    <div className="w-full h-2.5 bg-slate-200 rounded-full mb-3" />
    <div className="flex justify-between">
      <div className="h-3 w-12 bg-slate-200 rounded" />
      <div className="h-3 w-32 bg-slate-200 rounded" />
    </div>
  </div>
);

export function BudgetDashboard({
  categories = [],
  transactions = [],
  totalBudget,
  totalIncome,
  onAddTransaction,
  onManageCategories,
  loading = false
}) {
  // Calculate total expenses
  const totalExpenses = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate balance
  const balance = totalIncome - totalExpenses;

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const StatCard = ({ title, value, icon: Icon, colorClass, type, ariaLabel }) => (
    <article 
      className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 flex items-center gap-4 sm:gap-6 transition-all hover:shadow-md"
      aria-label={ariaLabel}
    >
      <div 
        className={cn(
          "p-3 sm:p-4 rounded-full flex-shrink-0",
          colorClass,
          "bg-opacity-10"
        )}
        aria-hidden="true"
      >
        <Icon className={colorClass} size={24} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm sm:text-base font-medium text-slate-600 mb-1">
          {title}
        </p>
        <h3 
          className={cn(
            "text-xl sm:text-2xl lg:text-3xl font-bold break-words",
            type === 'balance' 
              ? (value >= 0 
                  ? "text-slate-900" 
                  : "text-rose-600") 
              : "text-slate-900"
          )}
        >
          {formatCurrency(value)}
        </h3>
      </div>
    </article>
  );

  return (
    <div className="space-y-6 sm:space-y-8" role="main" aria-label="Budget Dashboard">
      {/* Summary Cards */}
      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="sr-only">Financial Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {loading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard 
                title="Total Income" 
                value={totalIncome} 
                icon={TrendingUp} 
                colorClass="text-emerald-600" 
                ariaLabel={`Total Income: ${formatCurrency(totalIncome)}`}
              />
              <StatCard 
                title="Total Expenses" 
                value={totalExpenses} 
                icon={TrendingDown} 
                colorClass="text-rose-600" 
                ariaLabel={`Total Expenses: ${formatCurrency(totalExpenses)}`}
              />
              <StatCard 
                title="Current Balance" 
                value={balance} 
                icon={Wallet} 
                colorClass="text-blue-600" 
                type="balance"
                ariaLabel={`Current Balance: ${formatCurrency(balance)}`}
              />
            </>
          )}
        </div>
      </section>

      {/* Budget Categories */}
      <section aria-labelledby="categories-heading">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
            <h3 
              id="categories-heading" 
              className="text-lg sm:text-xl font-bold text-slate-900"
            >
              <span aria-hidden="true">📊</span> Budget Categories
            </h3>
            <button
              type="button"
              className="flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={onManageCategories}
              aria-label="Manage budget categories"
            >
              <Settings size={16} aria-hidden="true" /> 
              <span>Manage</span>
            </button>
          </div>

          {loading ? (
            <div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
              role="status"
              aria-label="Loading budget categories"
            >
              <CategoryCardSkeleton />
              <CategoryCardSkeleton />
              <CategoryCardSkeleton />
            </div>
          ) : categories.length === 0 ? (
            <div 
              className="text-center py-12 sm:py-16"
              role="status"
              aria-live="polite"
            >
              <p className="text-slate-500 text-sm sm:text-base">
                No budget categories available. Add categories to get started.
              </p>
            </div>
          ) : (
            <div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
              role="list"
              aria-label="Budget categories list"
            >
              {categories.map((category) => {
                const percentage = category.budgeted > 0 ? (category.spent / category.budgeted) * 100 : 0;
                const isOverBudget = category.spent > category.budgeted;
                const remaining = category.budgeted - category.spent;

                return (
                  <article 
                    key={category.id} 
                    className="p-5 sm:p-6 rounded-xl border border-slate-100 bg-slate-50 transition-all hover:shadow-md hover:border-slate-200"
                    role="listitem"
                    aria-label={`${category.name}: ${formatCurrency(category.spent)} spent of ${formatCurrency(category.budgeted)} budgeted`}
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <h4 className="font-semibold text-sm sm:text-base text-slate-900">
                        {category.name}
                      </h4>
                      <span className="text-xs sm:text-sm text-slate-600 font-medium">
                        {formatCurrency(category.spent)} / {formatCurrency(category.budgeted)}
                      </span>
                    </div>

                    <div 
                      className="w-full h-2.5 sm:h-3 bg-slate-200 rounded-full overflow-hidden mb-3 sm:mb-4"
                      role="progressbar"
                      aria-valuenow={Math.min(percentage, 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${category.name} budget usage: ${percentage.toFixed(1)}%`}
                    >
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isOverBudget 
                            ? "bg-rose-600" 
                            : "bg-blue-600"
                        )}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs sm:text-sm font-medium">
                      <span className="text-slate-600">
                        {percentage.toFixed(1)}% used
                      </span>
                      <span 
                        className={cn(
                          "font-semibold",
                          isOverBudget 
                            ? "text-rose-700" 
                            : "text-emerald-700"
                        )}
                      >
                        {isOverBudget ? 'Over Budget' : 'Remaining'}: {formatCurrency(remaining)}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Action Buttons */}
      <section aria-label="Budget actions">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            type="button"
            className="flex items-center justify-center gap-2 px-6 py-3 sm:px-8 sm:py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onAddTransaction}
            aria-label="Add a new transaction"
          >
            <Plus size={18} aria-hidden="true" /> 
            <span>Add Transaction</span>
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 px-6 py-3 sm:px-8 sm:py-3.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onManageCategories}
            aria-label="View all transactions"
          >
            <span>View All Transactions</span>
          </button>
        </div>
      </section>
    </div>
  );
}