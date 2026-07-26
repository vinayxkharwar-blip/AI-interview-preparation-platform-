import Feedback from '../models/Feedback.js';

// @desc Get feedback for a session
// @route GET /api/feedback/session/:sessionId
export const getFeedbackBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    let feedback = [];
    try {
      feedback = await Feedback.find({ session: sessionId });
    } catch (e) {
      console.log('[Feedback DB Notice]', e.message);
    }
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
