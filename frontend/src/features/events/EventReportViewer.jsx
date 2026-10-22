import React, { useEffect, useState } from "react";
import api from "../../utils/api";

const EventReportViewer = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await api.get("/features/events");
        const list = response?.data?.data ? response.data.data : response.data || [];
        setEvents(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Failed to fetch events", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto rounded-lg shadow-xl bg-gray-900/40 backdrop-blur-md border border-white/10">
      <h2 className="text-3xl font-bold text-white mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
        Event Reports
      </h2>
      {loading ? (
        <p className="text-gray-400 text-center animate-pulse">Loading reports...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.length === 0 ? (
            <p className="text-gray-400 col-span-2 text-center py-10">No events found.</p>
          ) : (
            events.map((event) => (
              <div key={event._id || event.id} className="p-5 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors border border-gray-700/50 shadow-lg">
                <h3 className="text-xl font-semibold text-white mb-4">{event.name}</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-300 flex justify-between">
                    <span className="text-gray-400">Date:</span> 
                    <span className="font-medium text-white">{new Date(event.date).toLocaleDateString()}</span>
                  </p>
                  <p className="text-gray-300 flex justify-between">
                    <span className="text-gray-400">Payment Deadline:</span>
                    <span className="font-medium text-emerald-300">
                      {event.paymentDeadline ? new Date(event.paymentDeadline).toLocaleDateString() : "N/A"}
                    </span>
                  </p>
                  <p className="text-gray-300 flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="font-medium text-white">{event.status || "Open"}</span>
                  </p>
                  <p className="text-gray-300 flex justify-between">
                    <span className="text-gray-400">Budget Allocated:</span> 
                    <span className="font-medium text-emerald-400">₹{event.budgetAllocated}</span>
                  </p>
                  <p className="text-gray-300 flex justify-between">
                    <span className="text-gray-400">Food / Transport / Misc:</span>
                    <span className="font-medium text-slate-200">
                      ₹{event?.expenses?.food || 0} / ₹{event?.expenses?.transport || 0} / ₹{event?.expenses?.misc || 0}
                    </span>
                  </p>
                  <p className="text-gray-300 flex justify-between">
                    <span className="text-gray-400">Budget Used:</span> 
                    <span className="font-medium text-rose-400">₹{event.budgetUsed || 0}</span>
                  </p>
                </div>
                {event.summary && (
                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <p className="text-gray-400 text-sm leading-relaxed">{event.summary}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default EventReportViewer;
