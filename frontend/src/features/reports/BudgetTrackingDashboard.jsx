import React from 'react';

const BudgetTrackingDashboard = () => {
  // In a real app, these values would come from the backend.
  // Using static values here to demonstrate layout constraint adherence.
  const allTimeAllocated = 50000;
  const allTimeUsed = 23400;
  const remaining = allTimeAllocated - allTimeUsed;

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-white mb-8">Budget Tracking</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 rounded-xl bg-gradient-to-br from-indigo-900 to-indigo-600 shadow-xl border border-indigo-400/30">
          <h3 className="text-indigo-200 font-medium">Total Allocated Budget</h3>
          <p className="text-4xl font-bold text-white mt-2">${allTimeAllocated.toLocaleString()}</p>
        </div>
        <div className="p-6 rounded-xl bg-gradient-to-br from-rose-900 to-rose-600 shadow-xl border border-rose-400/30">
          <h3 className="text-rose-200 font-medium">Total Used Budget</h3>
          <p className="text-4xl font-bold text-white mt-2">${allTimeUsed.toLocaleString()}</p>
        </div>
        <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-900 to-emerald-600 shadow-xl border border-emerald-400/30">
          <h3 className="text-emerald-200 font-medium">Remaining Balance</h3>
          <p className="text-4xl font-bold text-white mt-2">${remaining.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-gray-900/50 backdrop-blur-md rounded-xl p-6 border border-white/5">
        <h3 className="text-xl text-white mb-4">Budget Progress</h3>
        <div className="w-full bg-gray-700 rounded-full h-6 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-rose-500 to-rose-400 h-6 transition-all duration-1000 ease-out" 
            style={{ width: `${(allTimeUsed / allTimeAllocated) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-400 font-medium">
          <span>0%</span>
          <span>{((allTimeUsed / allTimeAllocated) * 100).toFixed(1)}% Used</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
};

export default BudgetTrackingDashboard;
