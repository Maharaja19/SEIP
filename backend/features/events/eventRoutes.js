const express = require('express');
const router = express.Router();
const eventController = require('./eventController');
const { roleCheck } = require('../roles/roleMiddleware');

// Route for creating a new event (Treasurer, Admin)
router.post('/', roleCheck(['Treasurer', 'Admin']), eventController.createEvent);

// Route for getting all events (Public / Any Role)
router.get('/', eventController.getEvents);

// Student voting on event budget
router.post('/:id/vote', roleCheck(['Student']), eventController.voteOnBudget);

// Treasurer/Admin executes approved budget (generates per-student payment shares)
router.post('/:id/execute', roleCheck(['Treasurer', 'Admin']), eventController.executeEventPayments);

// Student pays event share from wallet
router.post('/:id/pay-from-wallet', roleCheck(['Student']), eventController.payEventFromWallet);

// Contribution leaderboard
router.get('/:id/leaderboard', eventController.getEventLeaderboard);

// Treasurer/Admin sends reminders (email MVP)
router.post('/:id/remind-voting', roleCheck(['Treasurer', 'Admin']), eventController.remindVoting);
router.post('/:id/remind-payment', roleCheck(['Treasurer', 'Admin']), eventController.remindPayment);

module.exports = router;
