import Feedback from '../models/Feedback.js';
import { memoryFeedback } from './sessionController.js';
import { checkSessionOwnership } from '../utils/authz.js';

// @desc Get feedback for a session
// @route GET /api/feedback/session/:sessionId
export const getFeedbackBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const ownership = await checkSessionOwnership(sessionId, req.user);
    if (!ownership.authorized) {
      return res.status(ownership.status).json({ message: ownership.message });
    }

    let feedback = [];
    try {
      feedback = await Feedback.find({ session: sessionId });
    } catch (e) {
      console.log('[Feedback DB Notice]', e.message);
    }

    if (feedback.length === 0) {
      feedback = memoryFeedback.filter((f) => String(f.session) === String(sessionId));
    }

    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
