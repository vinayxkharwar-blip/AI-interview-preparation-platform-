import Answer from '../models/Answer.js';
import Question from '../models/Question.js';
import Feedback from '../models/Feedback.js';
import { transcribeAudio } from '../services/sttService.js';
import { generateLLMJson } from '../services/llmService.js';
import { buildAnswerFeedbackPrompt } from '../prompts/feedbackPrompts.js';

// @desc Transcribe audio before user confirmation
// @route POST /api/answers/transcribe
export const transcribeAnswerAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided for transcription.' });
    }

    console.log(`[Answer Controller] Transcribing audio file: ${req.file.originalname}`);
    const transcript = await transcribeAudio(req.file.path);

    res.json({
      transcript,
      audioUrl: `/uploads/${req.file.filename}`,
    });
  } catch (error) {
    console.error('[Transcribe Error]', error);
    res.status(500).json({ message: error.message || 'Failed to transcribe audio file.' });
  }
};

// @desc Submit answer & trigger LLM feedback grading
// @route POST /api/answers/submit
export const submitAnswer = async (req, res) => {
  try {
    const { sessionId, questionId, transcript, answerType = 'text', audioUrl = '' } = req.body;

    if (!sessionId || !questionId || !transcript) {
      return res.status(400).json({ message: 'Session ID, Question ID, and transcript text are required.' });
    }

    // 1. Fetch Question details
    let question = null;
    try {
      question = await Question.findById(questionId);
    } catch (e) {
      console.log('[Answer Controller DB Notice] Question lookup fallback:', e.message);
    }

    const questionText = question ? question.questionText : 'Interview Question';
    const category = question ? question.category : 'General';
    const expectedKeyPoints = question ? question.expectedKeyPoints : [];

    // 2. Save Answer
    let savedAnswer;
    try {
      savedAnswer = await Answer.create({
        session: sessionId,
        question: questionId,
        user: req.user._id,
        transcript,
        answerType,
        audioUrl,
      });
    } catch (e) {
      savedAnswer = {
        _id: 'ans-' + Date.now(),
        session: sessionId,
        question: questionId,
        user: req.user._id,
        transcript,
        answerType,
        audioUrl,
        createdAt: new Date(),
      };
    }

    // 3. Call LLM for 1-10 scoring & feedback evaluation
    console.log('[Answer Controller] Evaluating candidate answer with LLM rubric...');
    const feedbackPrompt = buildAnswerFeedbackPrompt({
      questionText,
      category,
      expectedKeyPoints,
      candidateAnswer: transcript,
    });

    const fbLLMResult = await generateLLMJson(feedbackPrompt, 'You are an AI interview grading assistant.');

    // 4. Save Feedback
    let savedFeedback;
    try {
      savedFeedback = await Feedback.create({
        answer: savedAnswer._id,
        session: sessionId,
        score: fbLLMResult.score || 7,
        strengths: fbLLMResult.strengths || [],
        weaknesses: fbLLMResult.weaknesses || [],
        suggestion: fbLLMResult.suggestion || 'Keep practicing clear technical articulation.',
        category: fbLLMResult.category || category,
      });
    } catch (e) {
      savedFeedback = {
        _id: 'fb-' + Date.now(),
        answer: savedAnswer._id,
        session: sessionId,
        score: fbLLMResult.score || 7,
        strengths: fbLLMResult.strengths || [],
        weaknesses: fbLLMResult.weaknesses || [],
        suggestion: fbLLMResult.suggestion || 'Keep practicing clear technical articulation.',
        category: fbLLMResult.category || category,
      };
    }

    res.status(201).json({
      answer: savedAnswer,
      feedback: savedFeedback,
    });
  } catch (error) {
    console.error('[Submit Answer Error]', error);
    res.status(500).json({ message: error.message || 'Failed to analyze candidate answer.' });
  }
};
