const express = require("express");
const router = express.Router();
const walletController = require("./walletController");

// Wallet balance
router.get("/balance", walletController.getBalance);

// Wallet top-up / credit
router.post("/topup", walletController.topup);
router.post("/credit", walletController.topup);

// Wallet debit
router.post("/debit", walletController.debit);

// Wallet transfer
router.post("/transfer", walletController.transfer);

// Wallet ledger / activity
router.get("/ledger", walletController.getLedger);

module.exports = router;
