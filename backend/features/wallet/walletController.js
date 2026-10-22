const WalletLedger = require("../../src/models/walletLedger");
const Wallet = require("../../src/models/wallet");
const User = require("../../src/models/user");
const Log = require("../admin/Log");
const APIResponse = require("../../src/utils/apiResponse");
const CustomError = require("../../src/utils/CustomError");
const { logAudit } = require("../../src/services/auditService");
const {
  resolveStudentContext,
  logUserAccess,
} = require("../../src/services/userStudentService");

exports.getBalance = async (req, res, next) => {
  try {
    logUserAccess(req, "wallet.getBalance");
    if (!req.user) throw new CustomError("Unauthorized", 401, "UNAUTHORIZED");

    const { wallet } = await resolveStudentContext(req);
    return res.json(APIResponse.success(wallet || { balance: 0 }));
  } catch (err) {
    return next(err);
  }
};

exports.topup = async (req, res, next) => {
  try {
    logUserAccess(req, "wallet.topup");
    if (!req.user) throw new CustomError("Unauthorized", 401, "UNAUTHORIZED");

    const { amount, note, reference } = req.body || {};
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return next(new CustomError("Amount must be a positive number", 400, "INVALID_AMOUNT"));
    }

    // Replay / duplicate transaction protection
    if (reference) {
      const existing = await WalletLedger.findOne({ reference });
      if (existing) {
        return res.json(APIResponse.success({ balance: existing.balanceAfter, duplicate: true }, "Transaction already processed"));
      }
    }

    const { student, wallet } = await resolveStudentContext(req);

    const balanceBefore = Number(wallet.balance) || 0;
    const balanceAfter = balanceBefore + amt;

    wallet.balance = balanceAfter;
    await wallet.save();

    const orgId = req.organizationId || req.user.organizationId;

    await WalletLedger.create({
      wallet: wallet._id,
      student: student?._id,
      user: req.user._id,
      organization: orgId,
      type: "TOPUP",
      amount: amt,
      balanceBefore,
      balanceAfter,
      note: note || undefined,
      reference: reference || undefined,
      createdBy: req.user._id,
    });

    await logAudit({
      action: "WALLET_TOPUP",
      entityType: "WALLET",
      entityId: wallet._id,
      organization: orgId,
      performedBy: req.user._id,
      details: { amount: amt, balanceAfter, reference },
      req
    });

    await Log.create({
      action: "Wallet Topup",
      performedBy: req.user._id,
      details: { memberId: student?.registerNumber || req.user.registerNumber || req.user._id, amount: amt },
    });

    return res.json(APIResponse.success({ balance: balanceAfter }, "Wallet topped up"));
  } catch (err) {
    return next(err);
  }
};

exports.debit = async (req, res, next) => {
  try {
    logUserAccess(req, "wallet.debit");
    if (!req.user) throw new CustomError("Unauthorized", 401, "UNAUTHORIZED");

    const { amount, note, reference } = req.body || {};
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return next(new CustomError("Amount must be a positive number", 400, "INVALID_AMOUNT"));
    }

    // Replay / duplicate transaction protection
    if (reference) {
      const existing = await WalletLedger.findOne({ reference });
      if (existing) {
        return res.json(APIResponse.success({ balance: existing.balanceAfter, duplicate: true }, "Transaction already processed"));
      }
    }

    const { student, wallet } = await resolveStudentContext(req);
    const balanceBefore = Number(wallet.balance) || 0;

    if (balanceBefore < amt) {
      return next(new CustomError("Insufficient wallet balance", 400, "INSUFFICIENT_FUNDS"));
    }

    const balanceAfter = balanceBefore - amt;
    wallet.balance = balanceAfter;
    await wallet.save();

    const orgId = req.organizationId || req.user.organizationId;

    await WalletLedger.create({
      wallet: wallet._id,
      student: student?._id,
      user: req.user._id,
      organization: orgId,
      type: "DEBIT",
      amount: amt,
      balanceBefore,
      balanceAfter,
      note: note || undefined,
      reference: reference || undefined,
      createdBy: req.user._id,
    });

    await logAudit({
      action: "WALLET_DEBIT",
      entityType: "WALLET",
      entityId: wallet._id,
      organization: orgId,
      performedBy: req.user._id,
      details: { amount: amt, balanceAfter, reference },
      req
    });

    return res.json(APIResponse.success({ balance: balanceAfter }, "Wallet debited successfully"));
  } catch (err) {
    return next(err);
  }
};

exports.transfer = async (req, res, next) => {
  try {
    logUserAccess(req, "wallet.transfer");
    if (!req.user) throw new CustomError("Unauthorized", 401, "UNAUTHORIZED");

    const { recipientId, amount, note, reference } = req.body || {};
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return next(new CustomError("Amount must be a positive number", 400, "INVALID_AMOUNT"));
    }

    if (!recipientId) {
      return next(new CustomError("Recipient ID is required", 400, "MISSING_RECIPIENT"));
    }

    if (String(recipientId) === String(req.user._id)) {
      return next(new CustomError("Cannot transfer funds to yourself", 400, "SELF_TRANSFER_PROHIBITED"));
    }

    // Replay protection
    if (reference) {
      const existing = await WalletLedger.findOne({ reference });
      if (existing) {
        return res.json(APIResponse.success({ duplicate: true }, "Transfer already processed"));
      }
    }

    // Find recipient user
    const recipientUser = await User.findById(recipientId);
    if (!recipientUser) {
      return next(new CustomError("Recipient user not found", 404, "USER_NOT_FOUND"));
    }

    // Organization Isolation Check
    const orgId = req.organizationId || req.user.organizationId;
    const recipientOrgId = recipientUser.organizationId;
    if (orgId && recipientOrgId && String(orgId) !== String(recipientOrgId)) {
      return next(new CustomError("Cross-organization transfer prohibited", 403, "CROSS_ORG_PROHIBITED"));
    }

    const { student: senderStudent, wallet: senderWallet } = await resolveStudentContext(req);
    const senderBalanceBefore = Number(senderWallet.balance) || 0;

    if (senderBalanceBefore < amt) {
      return next(new CustomError("Insufficient wallet balance", 400, "INSUFFICIENT_FUNDS"));
    }

    // Ensure recipient wallet
    let recipientWallet = await Wallet.findOne({ owner: recipientUser._id });
    if (!recipientWallet) {
      recipientWallet = await Wallet.create({
        owner: recipientUser._id,
        organization: recipientOrgId || orgId,
        balance: 0,
      });
    }

    const recipientBalanceBefore = Number(recipientWallet.balance) || 0;

    // Balance mutations
    senderWallet.balance = senderBalanceBefore - amt;
    await senderWallet.save();

    recipientWallet.balance = recipientBalanceBefore + amt;
    await recipientWallet.save();

    const senderBalanceAfter = senderWallet.balance;
    const recipientBalanceAfter = recipientWallet.balance;

    // Double-entry ledger records
    await WalletLedger.create({
      wallet: senderWallet._id,
      student: senderStudent?._id,
      user: req.user._id,
      organization: orgId,
      type: "TRANSFER_OUT",
      amount: amt,
      balanceBefore: senderBalanceBefore,
      balanceAfter: senderBalanceAfter,
      note: note || `Transfer to ${recipientUser.name || recipientUser.email}`,
      reference: reference ? `${reference}_OUT` : undefined,
      createdBy: req.user._id,
    });

    await WalletLedger.create({
      wallet: recipientWallet._id,
      user: recipientUser._id,
      organization: recipientOrgId || orgId,
      type: "TRANSFER_IN",
      amount: amt,
      balanceBefore: recipientBalanceBefore,
      balanceAfter: recipientBalanceAfter,
      note: note || `Transfer from ${req.user.name || req.user.email}`,
      reference: reference ? `${reference}_IN` : undefined,
      createdBy: req.user._id,
    });

    await logAudit({
      action: "WALLET_TRANSFER",
      entityType: "WALLET",
      entityId: senderWallet._id,
      organization: orgId,
      performedBy: req.user._id,
      details: {
        recipientId: recipientUser._id,
        amount: amt,
        senderBalanceAfter,
        recipientBalanceAfter
      },
      req
    });

    return res.json(APIResponse.success({
      balance: senderBalanceAfter,
      transferredAmount: amt,
      recipient: recipientUser.name || recipientUser.email
    }, "Transfer completed successfully"));
  } catch (err) {
    return next(err);
  }
};

exports.getLedger = async (req, res, next) => {
  try {
    logUserAccess(req, "wallet.getLedger");
    if (!req.user) throw new CustomError("Unauthorized", 401, "UNAUTHORIZED");

    const { student, wallet } = await resolveStudentContext(req);
    const { limit } = req.query || {};
    const lim = Math.min(Number(limit) || 30, 100);
    const balance = Number(wallet?.balance) || 0;

    const ledgerQuery = student
      ? { $or: [{ student: student._id }, { user: req.user._id }] }
      : { user: req.user._id };

    if (req.organizationId) {
      ledgerQuery.organization = req.organizationId;
    }

    const ledgerItems = await WalletLedger.find(ledgerQuery)
      .sort({ createdAt: -1 })
      .limit(lim)
      .lean();

    return res.json(APIResponse.success({ balance, ledgerItems }, "Wallet ledger fetched"));
  } catch (err) {
    return next(err);
  }
};
