const express = require('express');
const router = express.Router();
const adminController = require('./adminController');
const { roleCheck } = require('../roles/roleMiddleware');

router.get('/logs', roleCheck(['admin']), adminController.getAuditLogs);
router.get('/analytics', roleCheck(['admin']), adminController.getSystemAnalytics);

module.exports = router;
