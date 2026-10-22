const Event = require('./Event');
const Student = require('../../src/models/student');
const EventParticipant = require('../../src/models/eventParticipant');
const EventBudgetVote = require('../../src/models/eventBudgetVote');
const EventPayment = require('../../src/models/eventPayment');
const Wallet = require('../../src/models/wallet');
const WalletLedger = require('../../src/models/walletLedger');
const User = require('../../src/models/user');
const Transaction = require('../../src/models/transactions');
const notificationService = require('../../src/services/notificationService');

const Log = require('../admin/Log');

const APIResponse = require('../../src/utils/apiResponse');
const CustomError = require('../../src/utils/CustomError');

const normalizeVote = (v) => {
  const s = String(v || "").toLowerCase();
  if (s === "approve") return "approve";
  if (s === "reject") return "reject";
  return null;
};

const { ensureStudentForUser } = require('../../src/services/userStudentService');
const { isStudent } = require('../../src/utils/roles');

const getStudentForUser = async (user) => {
  if (!user || !isStudent(user.role)) return null;
  try {
    return await ensureStudentForUser(user);
  } catch {
    return null;
  }
};

const ensureEventPayments = async (eventId) => {
  const event = await Event.findById(eventId);
  if (!event) throw new CustomError("Event not found", 404, "EVENT_NOT_FOUND");

  const participants = await EventParticipant.find({ event: event._id, participate: true })
    .populate("student", "_id registerNumber fullName gender department year")
    .lean();

  const participatingStudentIds = participants.map((p) => p.student?._id).filter(Boolean);
  const count = participatingStudentIds.length;
  if (count === 0) return { created: 0, total: 0 };

  // Idempotency: if payments already exist for all participating students, do nothing.
  const existing = await EventPayment.countDocuments({
    event: event._id,
    student: { $in: participatingStudentIds },
  });
  if (existing >= count && event.budgetExecutedAt) {
    return { created: 0, total: count };
  }

  let perStudentAmounts = new Map(); // studentId -> amountDue

  const totalBudgetInitial = Number(event.budgetAllocated) || 0;
  if (event.splitMode === "gender_custom") {
    const maleAmount = Number(event.genderSplitAmounts?.Male) || 0;
    const femaleAmount = Number(event.genderSplitAmounts?.Female) || 0;

    // If custom per-student amounts are not provided, fall back to equal.
    if (maleAmount <= 0 && femaleAmount <= 0) {
      event.splitMode = "equal";
    } else {
      const otherAmount = Math.floor(totalBudgetInitial / Math.max(1, count));
      let maleCount = 0;
      let femaleCount = 0;
      let otherCount = 0;

      for (const p of participants) {
        const g = p.gender;
        if (g === "Male") maleCount++;
        else if (g === "Female") femaleCount++;
        else otherCount++;
      }

      const computedTotal = maleAmount * maleCount + femaleAmount * femaleCount + otherAmount * otherCount;
      event.budgetAllocated = computedTotal;

      // Populate amounts.
      for (const p of participants) {
        let amt = otherAmount;
        if (p.gender === "Male") amt = maleAmount;
        else if (p.gender === "Female") amt = femaleAmount;
        perStudentAmounts.set(String(p.student?._id), amt);
      }
    }
  }

  if (event.splitMode === "equal") {
    const totalBudget = Number(event.budgetAllocated) || 0;
    const base = Math.floor(totalBudget / count);
    const remainder = totalBudget - base * count;

    // Stable ordering so remainder assignment is deterministic.
    const sortedParticipants = [...participants].sort((a, b) => {
      const ar = a.studentRegNo || "";
      const br = b.studentRegNo || "";
      return ar.localeCompare(br);
    });

    for (let i = 0; i < sortedParticipants.length; i++) {
      const amt = base + (i < remainder ? 1 : 0);
      perStudentAmounts.set(String(sortedParticipants[i].student?._id), amt);
    }
  }

  // Create/Upsert payment rows.
  let created = 0;
  for (const studentIdObj of participatingStudentIds) {
    const studentId = String(studentIdObj);
    const amountDue = perStudentAmounts.get(studentId);
    if (!amountDue && amountDue !== 0) continue;

    const existingPayment = await EventPayment.findOne({ event: event._id, student: studentIdObj });
    if (existingPayment) continue;

    await EventPayment.create({
      event: event._id,
      student: studentIdObj,
      amountDue,
      amountPaid: 0,
      status: "Unpaid",
      createdBy: null,
    });
    created++;
  }

  event.budgetExecutedAt = event.budgetExecutedAt || new Date();
  await event.save();

  return { created, total: count };
};

exports.createEvent = async (req, res) => {
  try {
    const {
      name,
      date,
      paymentDeadline,
      food = 0,
      transport = 0,
      misc = 0,
      summary = ''
    } = req.body;

    // Allow either the new category inputs or legacy budgetAllocated.
    const foodNum = Number(food) || 0;
    const transportNum = Number(transport) || 0;
    const miscNum = Number(misc) || 0;
    const budgetAllocated = (foodNum + transportNum + miscNum) || Number(req.body.budgetAllocated) || 0;

    if (!paymentDeadline) {
      return res.status(400).json({ error: 'paymentDeadline is required' });
    }

    const splitMode = req.body.splitMode || "equal";
    const genderSplitAmounts = req.body.genderSplitAmounts || {};

    const event = new Event({
      name,
      date,
      paymentDeadline,
      status: req.body.status || 'Open',
      expenses: { food: foodNum, transport: transportNum, misc: miscNum },
      budgetAllocated,
      summary,
      splitMode,
      genderSplitAmounts: {
        Male: Number(genderSplitAmounts.Male ?? genderSplitAmounts.male ?? 0) || 0,
        Female: Number(genderSplitAmounts.Female ?? genderSplitAmounts.female ?? 0) || 0,
      },
      createdBy: req.user?._id // Assumes req.user is set by auth middleware
    });
    await event.save();
    return res.status(201).json({ message: 'Event successfully created', event });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create event', details: err.message });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ date: -1 });

    // Enrich for Student view only (avoid N+1 queries with batching).
    if (req.user?.role && isStudent(req.user.role)) {
      const student = await getStudentForUser(req.user);
      if (student) {
        const eventIds = events.map((e) => e._id);
        const [myVotes, allVotes, payments, roster] = await Promise.all([
          EventBudgetVote.find({ event: { $in: eventIds }, student: student._id }).lean(),
          EventBudgetVote.find({ event: { $in: eventIds } }).lean(),
          EventPayment.find({ event: { $in: eventIds }, student: student._id }).lean(),
          EventParticipant.find({
            event: { $in: eventIds },
            student: student._id,
            participate: true,
          }).lean(),
        ]);

        const voteMap = new Map(myVotes.map((v) => [String(v.event), v.vote]));
        const paymentMap = new Map(payments.map((p) => [String(p.event), p]));
        const participateSet = new Set(roster.map((r) => String(r.event)));

        const voteCounts = {};
        for (const v of allVotes) {
          const key = String(v.event);
          if (!voteCounts[key]) voteCounts[key] = { approveCount: 0, rejectCount: 0, totalVotes: 0 };
          voteCounts[key].totalVotes += 1;
          if (v.vote === "approve") voteCounts[key].approveCount += 1;
          if (v.vote === "reject") voteCounts[key].rejectCount += 1;
        }

        const enriched = events.map((ev) => {
          const vote = voteMap.get(String(ev._id)) || null;
          const payment = paymentMap.get(String(ev._id)) || null;
          const canVote =
            ev.budgetVoteStatus === "pending" &&
            participateSet.has(String(ev._id)) &&
            !voteMap.has(String(ev._id));
          const canPay =
            ev.budgetVoteStatus === "approved" &&
            participateSet.has(String(ev._id)) &&
            payment &&
            payment.status === "Unpaid";
          return {
            ...ev.toObject(),
            myVote: vote,
            myPayment: payment,
            canVote,
            canPay,
            voteCounts: voteCounts[String(ev._id)] || { approveCount: 0, rejectCount: 0, totalVotes: 0 },
            votingOpen: ev.budgetVoteStatus === "pending",
          };
        });

        return res.status(200).json(enriched);
      }
    }

    return res.status(200).json(events);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch events', details: err.message });
  }
};

exports.voteOnBudget = async (req, res, next) => {
  try {
    const { vote } = req.body;
    const normalized = normalizeVote(vote);
    if (!["approve", "reject"].includes(normalized)) {
      return next(new CustomError("Vote must be approve or reject", 400, "INVALID_VOTE"));
    }

    const event = await Event.findById(req.params.id);
    if (!event) return next(new CustomError("Event not found", 404, "EVENT_NOT_FOUND"));

    if (event.budgetVoteStatus !== "pending") {
      return next(new CustomError("Budget voting is closed for this event", 400, "VOTING_CLOSED"));
    }

    const student = await getStudentForUser(req.user);
    if (!student) return next(new CustomError("Student not found", 404, "STUDENT_NOT_FOUND"));

    const participant = await require("../../src/models/eventParticipant").findOne({
      event: event._id,
      student: student._id,
      participate: true,
    });
    if (!participant) {
      return next(new CustomError("You are not marked as participating in this event", 403, "NOT_PARTICIPATING"));
    }

    const existing = await EventBudgetVote.findOne({ event: event._id, student: student._id });
    if (existing) {
      existing.vote = normalized;
      existing.createdBy = req.user?._id;
      await existing.save();
    } else {
      await EventBudgetVote.create({
        event: event._id,
        student: student._id,
        vote: normalized,
        createdBy: req.user?._id,
      });
    }

    await Log.create({
      action: "Event budget vote",
      performedBy: req.user._id,
      details: { eventId: event._id, studentRegNo: student.registerNumber, vote: normalized },
    });

    // Recompute counts
    const allVotes = await EventBudgetVote.find({ event: event._id }).lean();
    const approveCount = allVotes.filter((v) => v.vote === "approve").length;
    const rejectCount = allVotes.filter((v) => v.vote === "reject").length;
    const totalVotes = allVotes.length;

    const decided = approveCount > rejectCount && totalVotes > 0;
    if (decided) {
      if (event.budgetVoteStatus !== "approved") {
        event.budgetVoteStatus = "approved";
        event.budgetVoteApprovedAt = new Date();
        await event.save();

        // Auto-execute if roster is ready.
        await ensureEventPayments(event._id);
      }
    } else if (rejectCount >= approveCount && totalVotes > 0) {
      // If reject is at least tied and votes exist, close as rejected.
      // (MVP rule; can be adjusted later.)
      if (event.budgetVoteStatus !== "rejected") {
        event.budgetVoteStatus = "rejected";
        event.budgetVoteApprovedAt = new Date();
        await event.save();
      }
    }

    return res.json(APIResponse.success({ approveCount, rejectCount, totalVotes }, "Vote saved"));
  } catch (err) {
    return next(err);
  }
};

exports.executeEventPayments = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return next(new CustomError("Event not found", 404, "EVENT_NOT_FOUND"));

    if (event.budgetVoteStatus !== "approved") {
      return next(new CustomError("Budget must be approved before execution", 400, "BUDGET_NOT_APPROVED"));
    }

    const result = await ensureEventPayments(event._id);
    await Log.create({
      action: "Event payments executed",
      performedBy: req.user?._id,
      details: { eventId: event._id, splitMode: event.splitMode },
    });
    return res.json(APIResponse.success(result, "Event payments generated"));
  } catch (err) {
    return next(err);
  }
};

exports.payEventFromWallet = async (req, res, next) => {
  try {
    if (!isStudent(req.user?.role)) return next(new CustomError("Only students can pay", 403, "FORBIDDEN"));

    const event = await Event.findById(req.params.id);
    if (!event) return next(new CustomError("Event not found", 404, "EVENT_NOT_FOUND"));
    if (event.budgetVoteStatus !== "approved") {
      return next(new CustomError("Budget is not approved yet", 400, "BUDGET_NOT_APPROVED"));
    }
    if (!event.budgetExecutedAt) {
      return next(new CustomError("Event execution is not completed yet", 400, "EVENT_NOT_EXECUTED"));
    }

    const student = await getStudentForUser(req.user);
    if (!student) return next(new CustomError("Student not found", 404, "STUDENT_NOT_FOUND"));

    const payment = await EventPayment.findOne({ event: event._id, student: student._id });
    if (!payment) return next(new CustomError("No payment share found for you", 404, "PAYMENT_NOT_FOUND"));
    if (payment.status !== "Unpaid") return next(new CustomError("Payment already completed", 400, "PAYMENT_ALREADY_DONE"));

    const wallet = await Wallet.findOne({ student: student._id });
    const balanceBefore = Number(wallet?.balance) || 0;
    const amountDue = Number(payment.amountDue) || 0;
    if (balanceBefore < amountDue) {
      return next(new CustomError("Insufficient wallet balance", 400, "INSUFFICIENT_WALLET_BALANCE"));
    }

    // Atomic wallet debit to prevent negative balances.
    const updatedWallet = await Wallet.findOneAndUpdate(
      { student: student._id, balance: { $gte: amountDue } },
      { $inc: { balance: -amountDue } },
      { new: true }
    );

    if (!updatedWallet) {
      return next(new CustomError("Wallet debit failed (insufficient balance)", 400, "INSUFFICIENT_WALLET_BALANCE"));
    }

    const paidAt = new Date();
    payment.status = "Paid";
    payment.amountPaid = amountDue;
    payment.paidAt = paidAt;
    payment.createdBy = req.user._id;
    await payment.save();

    const balanceAfter = Number(updatedWallet.balance) || 0;
    await WalletLedger.create({
      student: student._id,
      event: event._id,
      type: "EVENT_PAYMENT_DEBIT",
      amount: amountDue,
      balanceBefore,
      balanceAfter,
      note: `Event payment: ${event.name}`,
      createdBy: req.user._id,
    });

    await Transaction.create({
      student: student._id,
      user: req.user._id,
      due: null,
      budget: null,
      type: "income",
      category: "budget",
      amount: amountDue,
      description: `Event payment: ${event.name}`,
      isStudentEntry: false,
      paymentMethod: "Cash",
      transactionRef: `wallet_${payment._id}`,
    });

    await Log.create({
      action: "Event payment (wallet)",
      performedBy: req.user._id,
      details: { eventId: event._id, studentRegNo: student.registerNumber, amount: amountDue },
    });

    return res.json(APIResponse.success({ payment, walletBalance: balanceAfter }, "Payment done from wallet"));
  } catch (err) {
    return next(err);
  }
};

exports.getEventLeaderboard = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return next(new CustomError("Event not found", 404, "EVENT_NOT_FOUND"));

    const [paidPayments, activeRosterCount, votesCount] = await Promise.all([
      EventPayment.find({ event: event._id, status: "Paid" })
        .populate("student", "registerNumber fullName gender")
        .lean(),
      EventParticipant.countDocuments({ event: event._id, participate: true }),
      EventBudgetVote.countDocuments({ event: event._id }),
    ]);

    const topContributors = paidPayments
      .map((p) => ({
        studentRegNo: p.student?.registerNumber,
        name: p.student?.fullName || "Unknown",
        amountPaid: Number(p.amountPaid) || 0,
      }))
      .sort((a, b) => b.amountPaid - a.amountPaid)
      .slice(0, 10);

    const activePaidCount = paidPayments.length;

    return res.json(
      APIResponse.success(
        {
          activeParticipants: activeRosterCount,
          activeVoters: votesCount,
          activePaying: activePaidCount,
          topContributors,
        },
        "Leaderboard fetched"
      )
    );
  } catch (err) {
    return next(err);
  }
};

exports.remindVoting = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return next(new CustomError("Event not found", 404, "EVENT_NOT_FOUND"));
    if (event.budgetVoteStatus !== "pending") {
      return next(new CustomError("Voting is not pending for this event", 400, "VOTING_NOT_PENDING"));
    }

    const participants = await EventParticipant.find({ event: event._id, participate: true })
      .populate("student", "email fullName registerNumber")
      .lean();

    const studentIds = participants.map((p) => p.student?._id).filter(Boolean);
    const votes = await EventBudgetVote.find({ event: event._id }).lean();

    const votedSet = new Set(votes.map((v) => String(v.student)));

    const toRemind = participants.filter(
      (p) => p.student?.email && !votedSet.has(String(p.student?._id))
    );

    let successCount = 0;
    for (const p of toRemind) {
      const ok = await notificationService.sendEventVoteReminder(
        p.student.email,
        p.student.fullName,
        event.name,
        event.paymentDeadline
      );
      if (ok) successCount++;
    }

    await Log.create({
      action: "Event voting reminders sent",
      performedBy: req.user?._id,
      details: { eventId: event._id, reminded: toRemind.length, successCount },
    });

    return res.json(APIResponse.success({ reminded: toRemind.length, successCount }, "Voting reminders sent"));
  } catch (err) {
    return next(err);
  }
};

exports.remindPayment = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return next(new CustomError("Event not found", 404, "EVENT_NOT_FOUND"));
    if (event.budgetVoteStatus !== "approved") {
      return next(new CustomError("Budget must be approved before payment reminders", 400, "BUDGET_NOT_APPROVED"));
    }

    const unpaidPayments = await EventPayment.find({ event: event._id, status: "Unpaid" })
      .populate("student", "email fullName registerNumber")
      .lean();

    let successCount = 0;
    for (const p of unpaidPayments) {
      if (!p.student?.email) continue;
      const ok = await notificationService.sendEventPaymentReminder(
        p.student.email,
        p.student.fullName,
        event.name,
        p.amountDue,
        event.paymentDeadline
      );
      if (ok) successCount++;
    }

    await Log.create({
      action: "Event payment reminders sent",
      performedBy: req.user?._id,
      details: { eventId: event._id, reminded: unpaidPayments.length, successCount },
    });

    return res.json(APIResponse.success({ reminded: unpaidPayments.length, successCount }, "Payment reminders sent"));
  } catch (err) {
    return next(err);
  }
};
