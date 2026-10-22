const express = require('express');
const router = express.Router();
const feedbackController = require('./feedbackController');
const { roleCheck } = require('../roles/roleMiddleware');

router.post('/', roleCheck(['student']), feedbackController.submitFeedback);
router.get('/:eventId', roleCheck(['student', 'treasurer', 'admin']), feedbackController.getEventFeedback);

module.exports = router;
