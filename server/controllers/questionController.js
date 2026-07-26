import Question from '../models/Question.js';

// @desc Get questions for a session
// @route GET /api/questions/session/:sessionId
export const getQuestionsBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    let questions = [];
    try {
      questions = await Question.find({ session: sessionId }).sort({ questionNumber: 1 });
    } catch (e) {
      console.log('[Question DB Notice]', e.message);
    }
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
