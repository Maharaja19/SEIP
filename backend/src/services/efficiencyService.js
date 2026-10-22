const Transaction = require("../models/transactions");
const Due = require("../models/dues");
const User = require("../models/user");

const monthStart = (offset = 0) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
};

const orgMatch = (orgId, extra = {}) => {
  const match = { ...extra };
  if (orgId) match.organization = orgId;
  return match;
};

/**
 * Get operational efficiency metrics
 * Calculates collection rates, processing times, and performance indicators
 */
const getEfficiencyMetrics = async (orgId) => {
  const currentMonth = new Date();
  const startOfMonth = monthStart(0);
  const startOfLastMonth = monthStart(-1);

  const dueQuery = orgId ? { organization: orgId } : {};

  // 1. Collection Rate Analysis
  const totalDues = await Due.find(dueQuery);
  const paidDues = totalDues.filter(d => d.status === "paid");
  const pendingDues = totalDues.filter(d => d.status === "pending" || d.status === "Pending");

  const totalAmount = totalDues.reduce((sum, d) => sum + d.amount, 0);
  const collectedAmount = paidDues.reduce((sum, d) => sum + d.amount, 0);
  const pendingAmount = pendingDues.reduce((sum, d) => sum + d.amount, 0);

  const collectionRate = totalAmount > 0 ? (collectedAmount / totalAmount) * 100 : 0;

  // 2. Transaction Processing Metrics
  const thisMonthTransactions = await Transaction.find(
    orgMatch(orgId, { date: { $gte: startOfMonth } })
  );

  const lastMonthTransactions = await Transaction.find(
    orgMatch(orgId, { date: { $gte: startOfLastMonth, $lt: startOfMonth } })
  );

  const avgTransactionValue = thisMonthTransactions.length > 0
    ? thisMonthTransactions.reduce((sum, t) => sum + t.amount, 0) / thisMonthTransactions.length
    : 0;

  const transactionGrowth = lastMonthTransactions.length > 0
    ? ((thisMonthTransactions.length - lastMonthTransactions.length) / lastMonthTransactions.length) * 100
    : 0;

  // 3. Payment Method Distribution
  const paymentMethodDistribution = await Transaction.aggregate([
    { $match: orgMatch(orgId, { date: { $gte: startOfMonth } }) },
    {
      $group: {
        _id: "$paymentMethod",
        count: { $sum: 1 },
        total: { $sum: "$amount" }
      }
    },
    { $sort: { total: -1 } }
  ]);

  // 4. Category Efficiency (top performing categories)
  const categoryEfficiency = await Transaction.aggregate([
    { $match: orgMatch(orgId, { type: "expense", date: { $gte: startOfMonth } }) },
    {
      $group: {
        _id: "$category",
        totalSpent: { $sum: "$amount" },
        transactionCount: { $sum: 1 },
        avgTransaction: { $avg: "$amount" }
      }
    },
    { $sort: { totalSpent: -1 } },
    { $limit: 5 }
  ]);

  // 5. User Activity Metrics
  const activeUsers = await Transaction.distinct("user",
    orgMatch(orgId, { date: { $gte: startOfMonth } })
  );

  const userQuery = orgId ? { organizationId: orgId } : {};
  const totalUsers = await User.countDocuments(userQuery);
  const activeRate = totalUsers > 0 ? (activeUsers.length / totalUsers) * 100 : 0;

  // 6. Verification Turnaround (for treasurers) - real average from records
  const pendingVerification = await Due.countDocuments({ ...dueQuery, status: "pending" });
  const verifiedDues = await Due.find(
    orgMatch(orgId, { verifiedDate: { $ne: null }, paidDate: { $ne: null } })
  ).select("paidDate verifiedDate").lean();

  const turnaroundHours = verifiedDues
    .filter(d => d.paidDate && d.verifiedDate)
    .map(d => (new Date(d.verifiedDate) - new Date(d.paidDate)) / (60 * 60 * 1000))
    .filter(h => h >= 0);

  const avgVerificationTime = turnaroundHours.length > 0
    ? Math.round(turnaroundHours.reduce((s, h) => s + h, 0) / turnaroundHours.length)
    : null;

  return {
    collectionMetrics: {
      totalDues: totalDues.length,
      paidDues: paidDues.length,
      pendingDues: pendingDues.length,
      collectionRate: collectionRate.toFixed(1),
      totalAmount: totalAmount,
      collectedAmount: collectedAmount,
      pendingAmount: pendingAmount
    },
    transactionMetrics: {
      thisMonthCount: thisMonthTransactions.length,
      lastMonthCount: lastMonthTransactions.length,
      transactionGrowth: transactionGrowth.toFixed(1),
      avgTransactionValue: Math.round(avgTransactionValue),
      totalVolume: thisMonthTransactions.reduce((sum, t) => sum + t.amount, 0)
    },
    paymentMethodDistribution: paymentMethodDistribution.map(pm => ({
      method: pm._id || "Unspecified",
      count: pm.count,
      total: pm.total
    })),
    categoryEfficiency: categoryEfficiency.map(ce => ({
      category: ce._id,
      totalSpent: ce.totalSpent,
      transactionCount: ce.transactionCount,
      avgTransaction: Math.round(ce.avgTransaction)
    })),
    userActivity: {
      totalUsers,
      activeUsers: activeUsers.length,
      activeRate: activeRate.toFixed(1)
    },
    operationalMetrics: {
      pendingVerifications: pendingVerification,
      avgVerificationTimeHours: avgVerificationTime
    }
  };
};

module.exports = {
  getEfficiencyMetrics
};
