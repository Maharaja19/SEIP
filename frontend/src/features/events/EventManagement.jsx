import React, { useMemo, useState } from "react";
import api from "../../utils/api";
import ModernLayout from "../../components/layout/Layout";
import ExcelUpload from "../treasurer/ExcelUpload";

const EventManagement = ({ onEventCreated }) => {
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    paymentDeadline: "",
    food: "",
    transport: "",
    misc: "",
    summary: "",
    splitMode: "equal",
    malePerStudent: "",
    femalePerStudent: "",
  });
  const [success, setSuccess] = useState(false);
  const [createdEvent, setCreatedEvent] = useState(null);
  const [executeLoading, setExecuteLoading] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);

  const totalBudget = useMemo(() => {
    const f = Number(formData.food) || 0;
    const t = Number(formData.transport) || 0;
    const m = Number(formData.misc) || 0;
    return f + t + m;
  }, [formData.food, formData.transport, formData.misc]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess(false);

    try {
      const payload = {
        name: formData.name,
        date: formData.date ? new Date(formData.date).toISOString() : undefined,
        paymentDeadline: formData.paymentDeadline
          ? new Date(formData.paymentDeadline).toISOString()
          : undefined,
        food: Number(formData.food) || 0,
        transport: Number(formData.transport) || 0,
        misc: Number(formData.misc) || 0,
        budgetAllocated: totalBudget,
        summary: formData.summary || "",
        status: "Open",
        splitMode: formData.splitMode,
        genderSplitAmounts:
          formData.splitMode === "gender_custom"
            ? {
                Male: Number(formData.malePerStudent) || 0,
                Female: Number(formData.femalePerStudent) || 0,
              }
            : undefined,
      };

      const response = await api.post("/features/events", payload);
      if (response?.data?.message) {
        setSuccess(true);
        setCreatedEvent(response?.data?.event || null);
        if (onEventCreated && response?.data?.event?._id) {
          onEventCreated(response.data.event);
        }
        setFormData({
          name: "",
          date: "",
          paymentDeadline: "",
          food: "",
          transport: "",
          misc: "",
          summary: "",
          splitMode: "equal",
          malePerStudent: "",
          femalePerStudent: "",
        });
      }
    } catch (err) {
      console.error("Failed to create event", err);
    }
  };

  const handleExecutePayments = async () => {
    if (!createdEvent?._id) return;
    setExecuteLoading(true);
    try {
      await api.post(`/features/events/${createdEvent._id}/execute`);
      alert("✅ Event execution started/completed. Payment shares generated (if roster is ready).");
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Execution failed");
    } finally {
      setExecuteLoading(false);
    }
  };

  const handleSendVotingReminders = async () => {
    if (!createdEvent?._id) return;
    setReminderLoading(true);
    try {
      const resp = await api.post(`/features/events/${createdEvent._id}/remind-voting`);
      alert(resp?.data?.message || "✅ Voting reminders sent");
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || err.message || "Failed to send reminders");
    } finally {
      setReminderLoading(false);
    }
  };

  const handleSendPaymentReminders = async () => {
    if (!createdEvent?._id) return;
    setReminderLoading(true);
    try {
      const resp = await api.post(`/features/events/${createdEvent._id}/remind-payment`);
      alert(resp?.data?.message || "✅ Payment reminders sent");
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || err.message || "Failed to send reminders");
    } finally {
      setReminderLoading(false);
    }
  };

  return (
    <ModernLayout>
      <div className="space-y-6 px-0">
        <header>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Event Budget Planner</h2>
          <p className="text-sm text-slate-600 mt-1">
            Create an event and enter transparent category-wise budget.
          </p>
        </header>

        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
            Event created successfully!
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5"
          aria-label="Create event form"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-slate-600 uppercase">Event Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-slate-600 uppercase">Event Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-slate-600 uppercase">Payment Deadline</label>
              <input
                type="date"
                required
                value={formData.paymentDeadline}
                onChange={(e) => setFormData({ ...formData, paymentDeadline: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-slate-600 uppercase">Total Budget (Auto)</label>
              <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-blue-50 text-sm font-bold text-blue-700">
                ₹{totalBudget.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-slate-600 uppercase">
                  Split Mode
                </label>
                <select
                  value={formData.splitMode}
                  onChange={(e) => setFormData({ ...formData, splitMode: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  aria-label="Split mode"
                >
                  <option value="equal">Equal Split</option>
                  <option value="gender_custom">Custom by Gender</option>
                </select>
              </div>

              {formData.splitMode === "gender_custom" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-slate-600 uppercase">
                      Boys (Male) per student
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.malePerStudent}
                      onChange={(e) => setFormData({ ...formData, malePerStudent: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-slate-600 uppercase">
                      Girls (Female) per student
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.femalePerStudent}
                      onChange={(e) => setFormData({ ...formData, femalePerStudent: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-600">
                  Equal split uses your total budget divided by participating students.
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-slate-600 uppercase">Food</label>
                <input
                  type="number"
                  min={0}
                  value={formData.food}
                  onChange={(e) => setFormData({ ...formData, food: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-slate-600 uppercase">Transport</label>
                <input
                  type="number"
                  min={0}
                  value={formData.transport}
                  onChange={(e) => setFormData({ ...formData, transport: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-slate-600 uppercase">Misc</label>
                <input
                  type="number"
                  min={0}
                  value={formData.misc}
                  onChange={(e) => setFormData({ ...formData, misc: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium text-slate-600 uppercase">Summary (Optional)</label>
            <textarea
              rows={3}
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Create Event
            </button>
          </div>
        </form>

        {createdEvent?._id && (
          <section className="space-y-4">
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Import Participants (Excel)</h3>
              <p className="text-sm text-slate-600">
                Upload `Name, reg no, dept, batch, gender, participate` to mark who participates in this event.
              </p>
            </div>
            <ExcelUpload eventId={createdEvent._id} />

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleExecutePayments}
                disabled={executeLoading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Execute approved event budget"
              >
                {executeLoading ? "Executing..." : "Execute Approved Budget"}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                type="button"
                onClick={handleSendVotingReminders}
                disabled={reminderLoading}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send voting reminders"
              >
                {reminderLoading ? "Sending..." : "Send Voting Reminders"}
              </button>

              <button
                type="button"
                onClick={handleSendPaymentReminders}
                disabled={reminderLoading}
                className="w-full sm:w-auto px-5 py-2.5 bg-orange-400 hover:bg-orange-500 active:bg-orange-600 text-white rounded-xl font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send payment reminders"
              >
                {reminderLoading ? "Sending..." : "Send Payment Reminders"}
              </button>
            </div>
          </section>
        )}
      </div>
    </ModernLayout>
  );
};

export default EventManagement;
