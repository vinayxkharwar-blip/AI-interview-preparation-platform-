import Feedback from '../models/Feedback.js';
import { memoryFeedback } from './sessionController.js';
import { checkSessionOwnership } from '../utils/authz.js';
import { generateLLMJson } from '../services/llmService.js';

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

// @desc Process AI Career Coach query via LLM
// @route POST /api/feedback/coach
export const handleCoachQuery = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ message: 'Prompt is required.' });
    }

    const systemPrompt = `You are a friendly, highly knowledgeable AI Career Coach guiding job candidates. 
Provide concise, highly actionable, encouraging advice (2-4 sentences max) for career strategies, interview preparation, resume optimization, and job search momentum.`;

    const llmPrompt = `Candidate Question / Goal: "${prompt.trim()}"

Provide a concise, direct, helpful career coaching response (return JSON matching schema: { "response": "string" }).`;

    const result = await generateLLMJson(llmPrompt, systemPrompt);
    const coachResponse =
      result.response ||
      result.suggestion ||
      result.message ||
      "Keep building your interview skills! Practice mock loops and tailor your resume for top match scores.";

    res.json({
      success: true,
      response: coachResponse,
      _meta: result._meta,
    });
  } catch (error) {
    console.error('[Career Coach Error]', error);
    res.status(500).json({ message: error.message || 'Failed to process career coach request.' });
  }
};
