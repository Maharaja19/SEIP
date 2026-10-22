const Log = require('./Log');
const Transaction = require('../../src/models/transactions');
const Due = require('../../src/models/dues');
const Budget = require('../../src/models/budget');
const mongoose = require('mongoose');

exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await Log.find().sort({ createdAt: -1 }).populate('performedBy', 'name role');
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs', details: err.message });
  }
};

exports.getSystemAnalytics = async (req, res) => {
  try {
    // Get current month start
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

    // Total collections (income transactions)
    const collections = await Transaction.aggregate([
      { $match: { type: 'income', date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Pending dues
    const pendingDuesData = await Due.aggregate([
      { $match: { status: { $in: ['pending', 'Unpaid'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Event spending (transactions with category 'event')
    const eventSpending = await Transaction.aggregate([
      { $match: { type: 'expense', category: 'event' } },
      { $group: { _id: '$description', spent: { $sum: '$amount' } } },
      { $sort: { spent: -1 } },
      { $limit: 10 }
    ]);

    const totalCollections = collections[0]?.total || 0;
    const pendingDues = pendingDuesData[0]?.total || 0;
    const eventSpendingData = eventSpending.map(e => ({
      event: e._id || 'Unknown Event',
      spent: e.spent
    }));

    res.status(200).json({
      totalCollections,
      pendingDues,
      eventSpending: eventSpendingData,
      month: currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics', details: err.message });
  }
};
