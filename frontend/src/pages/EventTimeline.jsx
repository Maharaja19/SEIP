import React, { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import ModernLayout from "../components/layout/Layout";
import { isStudent } from "../utils/roles";

const formatCountdown = (targetIso, nowTs) => {
  const target = targetIso ? new Date(targetIso) : null;
  if (!target || Number.isNaN(target.getTime())) return null;
  const diffMs = target.getTime() - nowTs;
  if (diffMs <= 0) return "Deadline passed";
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  if (hours > 0) return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
  return `${pad(minutes)}m ${pad(seconds)}s`;
};

const toDateKey = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
    dt.getDate()
  ).padStart(2, "0")}`;
};

const StatusBadge = ({ status }) => {
  const styles = {
    Open: "bg-blue-50 text-blue-700 border-blue-100",
    Closed: "bg-amber-50 text-amber-700 border-amber-100",
    Completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center`}
    >
      <span className={`inline-flex items-center ${styles[status] || styles.Open}`}>
        {status}
      </span>
    </span>
  );
};

const EventCard = ({ event, onVote, onPay, actionLoading, nowTs }) => {
  const food = event?.expenses?.food ?? 0;
  const transport = event?.expenses?.transport ?? 0;
  const misc = event?.expenses?.misc ?? 0;
  const total =
    (Number(food) || 0) + (Number(transport) || 0) + (Number(misc) || 0) || event?.budgetAllocated || 0;

  const voteStatus = event?.budgetVoteStatus || "pending";
  const voteCounts = event?.voteCounts || { approveCount: 0, rejectCount: 0, totalVotes: 0 };
  const countdownText = event?.votingOpen
    ? formatCountdown(event.paymentDeadline, nowTs)
    : null;

  return (
    <article className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-slate-900 truncate">{event.name}</h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Event Date:{" "}
            <span className="font-medium text-slate-900">
              {new Date(event.date).toLocaleDateString()}
            </span>
          </p>
        </div>
        <div className="shrink-0">
          <StatusBadge status={event.status || "Open"} />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs sm:text-sm text-slate-600">Votes</span>
          <span className="text-xs px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
            Approve {voteCounts.approveCount} / Reject {voteCounts.rejectCount}
          </span>
        </div>

        {countdownText && (
          <div className="text-xs sm:text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            Voting closes in: <span className="font-semibold">{countdownText}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm text-slate-600">Budget Vote</span>
          <span
            className={[
              "px-2.5 py-1 rounded-full text-xs font-medium border",
              voteStatus === "approved"
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : voteStatus === "rejected"
                ? "bg-rose-50 text-rose-700 border-rose-100"
                : "bg-amber-50 text-amber-700 border-amber-100",
            ].join(" ")}
          >
            {voteStatus}
          </span>
        </div>

        <div className="text-xs sm:text-sm text-slate-600">
          Payment Deadline:{" "}
          <span className="font-medium text-slate-900">
            {event.paymentDeadline ? new Date(event.paymentDeadline).toLocaleDateString() : "N/A"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <div className="text-[11px] uppercase font-medium text-blue-700">Food</div>
            <div className="font-bold text-slate-900">₹{Number(food).toLocaleString()}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="text-[11px] uppercase font-medium text-slate-600">Transport</div>
            <div className="font-bold text-slate-900">₹{Number(transport).toLocaleString()}</div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
            <div className="text-[11px] uppercase font-medium text-amber-700">Misc</div>
            <div className="font-bold text-slate-900">₹{Number(misc).toLocaleString()}</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-xs sm:text-sm font-medium text-slate-600">Total</span>
          <span className="text-base sm:text-lg font-bold text-blue-700">₹{Number(total).toLocaleString()}</span>
        </div>

        {/* Voting + Wallet actions */}
        <div className="pt-3 border-t border-slate-100">
          {event?.canVote && !event?.myVote && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!!actionLoading?.[event._id]}
                onClick={() => onVote(event._id, "approve")}
                className="py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-400"
                aria-label="Approve budget"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={!!actionLoading?.[event._id]}
                onClick={() => onVote(event._id, "reject")}
                className="py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-rose-300"
                aria-label="Reject budget"
              >
                Reject
              </button>
            </div>
          )}

          {!event?.canVote && event?.myVote && (
            <div className="text-xs text-slate-600">
              Your vote:{" "}
              <span className="font-semibold text-slate-900">{event.myVote}</span>
            </div>
          )}

          {event?.canPay && (
            <button
              type="button"
              disabled={!!actionLoading?.[event._id]}
              onClick={() => onPay(event._id)}
              className="mt-3 w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Pay from wallet"
            >
              {actionLoading?.[event._id] ? "Processing..." : `Pay ₹${event?.myPayment?.amountDue?.toLocaleString() || "0"} from Wallet`}
            </button>
          )}

          {event?.myPayment?.status === "Paid" && (
            <div className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 font-medium">
              Paid from wallet
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default function EventTimeline() {
  const [nowTs, setNowTs] = useState(Date.now());
  const localUser = (() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const isStudentUser = isStudent(localUser?.role);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [actionLoading, setActionLoading] = useState({});
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState(null);

  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDayKey, setSelectedDayKey] = useState(toDateKey(new Date()));

  const refreshWalletBalance = async () => {
    const response = await api.get("/features/wallet/balance");
    const data = response?.data?.data || response?.data;
    setWalletBalance(Number(data?.balance) || 0);
  };

  const refreshEvents = async () => {
    const response = await api.get("/features/events");
    const list = response?.data?.data ? response.data.data : response.data || [];
    return Array.isArray(list) ? list : [];
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const list = await refreshEvents();
        setEvents(list);

        if (isStudentUser) {
          await refreshWalletBalance();
        }
      } catch (err) {
        setError(err.response?.data?.message || err.response?.data?.error || err.message || "Failed to load events");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleVote = async (eventId, voteValue) => {
    try {
      setActionLoading((prev) => ({ ...prev, [eventId]: true }));
      await api.post(`/features/events/${eventId}/vote`, { vote: voteValue });
      const list = await refreshEvents();
      setEvents(list);
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || err.message || "Vote failed");
    } finally {
      setActionLoading((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const handlePayFromWallet = async (eventId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [eventId]: true }));
      await api.post(`/features/events/${eventId}/pay-from-wallet`);
      const [list] = await Promise.all([refreshEvents(), refreshWalletBalance()]);
      setEvents(list);
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || err.message || "Payment failed");
    } finally {
      setActionLoading((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const eventsByDayKey = useMemo(() => {
    const map = new Map();
    for (const ev of events) {
      if (!ev?.date) continue;
      const key = toDateKey(ev.date);
      const arr = map.get(key) || [];
      arr.push(ev);
      map.set(key, arr);
    }
    for (const [key, arr] of map.entries()) {
      arr.sort((a, b) => new Date(a.date) - new Date(b.date));
      map.set(key, arr);
    }
    return map;
  }, [events]);

  useEffect(() => {
    const primary = selectedDayKey
      ? (eventsByDayKey.get(selectedDayKey) || [])[0]
      : null;

    const run = async () => {
      if (!primary || primary.budgetVoteStatus !== "approved" || !primary.budgetExecutedAt) {
        setLeaderboard(null);
        return;
      }
      try {
        setLeaderboardLoading(true);
        const response = await api.get(`/features/events/${primary._id}/leaderboard`);
        setLeaderboard(response?.data?.data || response?.data);
      } catch (err) {
        setLeaderboard(null);
      } finally {
        setLeaderboardLoading(false);
      }
    };

    run();
  }, [selectedDayKey, events]);

  const monthGrid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Make Monday the first column (0..6)
    const startCol = (first.getDay() + 6) % 7;
    const totalCells = 42; // 6 rows

    return Array.from({ length: totalCells }, (_, i) => {
      const dayNum = i - startCol + 1;
      if (dayNum < 1 || dayNum > daysInMonth) return null;
      const dt = new Date(year, month, dayNum);
      return { dt, key: toDateKey(dt) };
    });
  }, [viewDate]);

  const selectedEvents = selectedDayKey ? (eventsByDayKey.get(selectedDayKey) || []) : [];
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const list = [...events];
    list.sort((a, b) => new Date(a.date) - new Date(b.date));
    return list.filter((e) => new Date(e.date) >= new Date(now.toDateString())).slice(0, 6);
  }, [events]);

  const monthLabel = viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const goPrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const goNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  return (
    <ModernLayout>
      <div className="space-y-6">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Event Timeline</h1>
            <p className="text-sm text-slate-600 mt-1">
              Upcoming events, payment deadlines, and transparent category breakdown.
            </p>
            <div className="text-sm text-slate-700 mt-2 flex items-center gap-3">
              <span className="font-medium">Wallet:</span>
              <span className="font-bold text-blue-700">
                ₹{Number(walletBalance).toLocaleString()}
              </span>
              {isStudentUser && (
                <button
                  type="button"
                  onClick={() => (window.location.href = "/wallet")}
                  className="ml-auto px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Top up wallet"
                >
                  Top up
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrevMonth}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm"
              aria-label="Previous month"
            >
              Prev
            </button>
            <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-semibold">
              {monthLabel}
            </div>
            <button
              type="button"
              onClick={goNextMonth}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm"
              aria-label="Next month"
            >
              Next
            </button>
          </div>
        </header>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">Loading events...</div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 border border-red-100 rounded-2xl p-5">
            {error}
          </div>
        ) : (
          <>
            {/* Calendar Grid */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
              <div className="grid grid-cols-7 gap-2 mb-3 text-xs font-semibold text-slate-600">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="text-center">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {monthGrid.map((cell, idx) => {
                  if (!cell) return <div key={`empty-${idx}`} className="h-20 sm:h-24" />;
                  const dayEvents = eventsByDayKey.get(cell.key) || [];
                  const isSelected = cell.key === selectedDayKey;
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => setSelectedDayKey(cell.key)}
                      className={[
                        "h-20 sm:h-24 rounded-2xl border text-left px-2 py-2 transition-colors",
                        isSelected
                          ? "border-blue-200 bg-blue-50"
                          : "border-slate-200 hover:border-blue-200 hover:bg-slate-50",
                      ].join(" ")}
                      aria-label={`Select day ${cell.key}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900">{cell.dt.getDate()}</span>
                        {dayEvents.length > 0 ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold">
                            {dayEvents.length}
                          </span>
                        ) : null}
                      </div>
                      {dayEvents.length > 0 ? (
                        <div className="mt-1 space-y-0.5">
                          {dayEvents.slice(0, 2).map((ev) => (
                            <div key={ev._id || ev.id} className="text-[11px] text-slate-700 truncate">
                              {ev.name}
                            </div>
                          ))}
                          {dayEvents.length > 2 ? (
                            <div className="text-[11px] text-slate-500">+{dayEvents.length - 2} more</div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-1 text-[11px] text-slate-400"> </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Day details */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Events on{" "}
                    {selectedDayKey ? new Date(selectedDayKey).toLocaleDateString() : "Selected day"}
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Click any date cell to see the timeline + expense breakdown.
                  </p>
                </div>
                {selectedEvents.length > 0 ? (
                  <div className="text-sm text-slate-700 font-medium">{selectedEvents.length} event(s)</div>
                ) : (
                  <div className="text-sm text-slate-500 font-medium">No events</div>
                )}
              </div>

              {leaderboardLoading ? (
                <div className="text-sm text-slate-600">Loading leaderboard...</div>
              ) : leaderboard && leaderboard.topContributors?.length >= 0 ? (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 sm:p-5">
                  <h3 className="font-bold text-slate-900">Contribution Leaderboard</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Active participants: <span className="font-medium">{leaderboard.activeParticipants}</span> • Active voters:{" "}
                    <span className="font-medium">{leaderboard.activeVoters}</span>
                  </p>
                  <div className="mt-3 space-y-2">
                    {(leaderboard.topContributors || []).slice(0, 5).map((c, idx) => (
                      <div key={`${c.studentRegNo}-${idx}`} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-slate-700 truncate">{c.name}</span>
                        <span className="font-bold text-blue-700">₹{Number(c.amountPaid).toLocaleString()}</span>
                      </div>
                    ))}
                    {(leaderboard.topContributors || []).length === 0 && (
                      <div className="text-sm text-slate-500">No payments yet.</div>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="space-y-4">
                {selectedEvents.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">No events on this day.</div>
                ) : (
                  selectedEvents.map((ev) => (
                    <EventCard
                      key={ev._id || ev.id}
                      event={ev}
                      onVote={handleVote}
                      onPay={handlePayFromWallet}
                      actionLoading={actionLoading}
                      nowTs={nowTs}
                    />
                  ))
                )}
              </div>
            </section>

            {/* Upcoming */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">Upcoming Events</h2>
              <p className="text-sm text-slate-600 mt-1">Sorted by event date (shows payment deadlines + breakdown).</p>
              <div className="mt-4 space-y-4">
                {upcomingEvents.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">No upcoming events.</div>
                ) : (
                  upcomingEvents.map((ev) => (
                    <EventCard
                      key={ev._id || ev.id}
                      event={ev}
                      onVote={handleVote}
                      onPay={handlePayFromWallet}
                      actionLoading={actionLoading}
                      nowTs={nowTs}
                    />
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </ModernLayout>
  );
}

