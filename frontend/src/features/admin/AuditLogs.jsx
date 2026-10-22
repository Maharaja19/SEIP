import React, { useEffect, useState } from 'react';
import api from '../../utils/api';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventOnly, setEventOnly] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await api.get('/features/admin/logs');
        const data = response?.data?.data || response?.data || [];
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch logs", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6 border-b border-gray-700 pb-4">Audit Logs</h2>
      {loading ? (
        <p className="text-gray-400">Loading audit trail...</p>
      ) : (
        <div className="flex items-center justify-between gap-4 mb-4">
          <label className="text-sm text-gray-300 flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={eventOnly}
              onChange={(e) => setEventOnly(e.target.checked)}
              className="accent-sky-500"
            />
            Show only event/wallet actions
          </label>
        </div>
      )}

      {loading ? null : (
        <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700 shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="bg-gray-800 text-gray-400 uppercase font-medium">
                <tr>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Performed By</th>
                  <th className="px-6 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {(eventOnly
                  ? logs.filter((l) => String(l.action || "").toLowerCase().includes("event"))
                  : logs
                ).length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No logs found</td>
                  </tr>
                ) : (
                  (eventOnly
                    ? logs.filter((l) => String(l.action || "").toLowerCase().includes("event"))
                    : logs
                  ).map((log) => (
                    <tr key={log._id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-4 font-medium text-emerald-400 font-mono tracking-tight">{log.action}</td>
                      <td className="px-6 py-4">{log.performedBy ? log.performedBy.name : 'System'}</td>
                      <td className="px-6 py-4 truncate max-w-[200px]" title={JSON.stringify(log.details)}>
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
