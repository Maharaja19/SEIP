const Feedback = require('./Feedback');

exports.submitFeedback = async (req, res) => {
  try {
    const { eventId, rating, comments } = req.body;
    const feedback = new Feedback({
      eventId,
      studentId: req.user?._id, // Assume populated from standard auth
      rating,
      comments
    });
    await feedback.save();
    res.status(201).json({ message: 'Feedback submitted successfully', feedback });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit feedback', details: err.message });
  }
};

exports.getEventFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ eventId: req.params.eventId }).populate('studentId', 'name email');
    res.status(200).json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feedback', details: err.message });
  }
};
