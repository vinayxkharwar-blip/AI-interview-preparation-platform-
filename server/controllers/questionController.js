import Question from '../models/Question.js';
import { memoryQuestions } from './sessionController.js';
import { checkSessionOwnership } from '../utils/authz.js';

// @desc Get questions for a session
// @route GET /api/questions/session/:sessionId
export const getQuestionsBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const ownership = await checkSessionOwnership(sessionId, req.user);
    if (!ownership.authorized) {
      return res.status(ownership.status).json({ message: ownership.message });
    }

    let questions = [];
    try {
      questions = await Question.find({ session: sessionId }).sort({ questionNumber: 1 });
    } catch (e) {
      console.log('[Question DB Notice]', e.message);
    }

    if (questions.length === 0) {
      questions = memoryQuestions.filter((q) => String(q.session) === String(sessionId));
    }

    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
