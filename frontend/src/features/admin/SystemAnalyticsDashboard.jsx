import React, { useEffect, useState } from 'react';
import api from '../../utils/api';

const SystemAnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get('/features/admin/analytics');
        const data = response?.data?.data || response?.data || null;
        setAnalytics(data);
      } catch (err) {
        console.error("Failed to fetch analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <div className="text-white p-6 animate-pulse">Loading system metrics...</div>;
  if (!analytics) return <div className="text-white p-6 text-red-400">Failed to load analytics data.</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">System Analytics Overview</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-md flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Total Collections</p>
            <h4 className="text-3xl font-bold text-emerald-400">₹{(analytics.totalCollections || 0).toLocaleString()}</h4>
          </div>
          <div className="p-3 bg-emerald-500/20 rounded-lg">
            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-md flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Pending Dues</p>
            <h4 className="text-3xl font-bold text-rose-400">₹{(analytics.pendingDues || 0).toLocaleString()}</h4>
          </div>
          <div className="p-3 bg-rose-500/20 rounded-lg">
            <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-md">
        <h3 className="text-lg font-semibold text-white mb-4 tracking-wide">Event-wise Spending</h3>
        <div className="space-y-4">
          {(analytics.eventSpending || []).map((item, idx) => (
            <div key={idx} className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">{item.event}</span>
                <span className="text-white font-medium">₹{item.spent.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${Math.min(100, (item.spent / 5000) * 100)}%` }} // Assumed max 5000 for relative width
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemAnalyticsDashboard;
