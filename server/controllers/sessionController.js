import Session from '../models/Session.js';
import Resume from '../models/Resume.js';
import Question from '../models/Question.js';
import Answer from '../models/Answer.js';
import Feedback from '../models/Feedback.js';
import ImprovementPlan from '../models/ImprovementPlan.js';
import AnalyticsSnapshot from '../models/AnalyticsSnapshot.js';
import { generateLLMJson } from '../services/llmService.js';
import { buildQuestionGenerationPrompt } from '../prompts/questionPrompts.js';
import { buildImprovementPlanPrompt } from '../prompts/improvementPrompts.js';

// @desc Start a new interview session
// @route POST /api/sessions/start
export const startSession = async (req, res) => {
  try {
    const { resumeId, targetRole, interviewType = 'technical', difficulty = 'mid', count = 5 } = req.body;

    if (!targetRole) {
      return res.status(400).json({ message: 'Target role is required.' });
    }

    let parsedResume = null;
    if (resumeId) {
      try {
        const resumeDoc = await Resume.findById(resumeId);
        if (resumeDoc) {
          parsedResume = resumeDoc.parsedData;
        }
      } catch (e) {
        console.log('[Session DB Notice] Could not fetch resume by ID:', e.message);
      }
    }

    // 1. Create Session DB record
    let session;
    try {
      session = await Session.create({
        user: req.user._id,
        resume: resumeId || null,
        targetRole,
        interviewType,
        difficulty,
        totalQuestions: Number(count) || 5,
        status: 'in_progress',
      });
    } catch (e) {
      session = {
        _id: 'session-' + Date.now(),
        user: req.user._id,
        resume: resumeId || null,
        targetRole,
        interviewType,
        difficulty,
        totalQuestions: Number(count) || 5,
        status: 'in_progress',
        createdAt: new Date(),
      };
    }

    // 2. Generate questions via LLM
    console.log('[Session Controller] Generating personalized interview questions via LLM...');
    const prompt = buildQuestionGenerationPrompt({
      parsedResume,
      targetRole,
      interviewType,
      difficulty,
      count: session.totalQuestions,
    });

    const llmResult = await generateLLMJson(prompt, 'You are an expert interview question generator.');
    const rawQuestions = llmResult.questions || [];

    // 3. Save Questions to DB
    const questionsToSave = rawQuestions.map((q, idx) => ({
      session: session._id,
      questionNumber: q.questionNumber || idx + 1,
      questionText: q.questionText,
      category: q.category || 'General',
      expectedKeyPoints: q.expectedKeyPoints || [],
      hints: q.hints || [],
    }));

    let savedQuestions = [];
    try {
      savedQuestions = await Question.insertMany(questionsToSave);
    } catch (e) {
      savedQuestions = questionsToSave.map((q, idx) => ({
        ...q,
        _id: `q-${session._id}-${idx + 1}`,
      }));
    }

    res.status(201).json({
      session,
      questions: savedQuestions,
    });
  } catch (error) {
    console.error('[Start Session Error]', error);
    res.status(500).json({ message: error.message || 'Failed to start interview session.' });
  }
};

// @desc Get user sessions
// @route GET /api/sessions
export const getUserSessions = async (req, res) => {
  try {
    let sessions = [];
    try {
      sessions = await Session.find({ user: req.user._id }).sort({ createdAt: -1 });
    } catch (e) {
      console.log('[Sessions List Fallback]', e.message);
    }
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get session details by ID
// @route GET /api/sessions/:id
export const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    let session = null;
    let questions = [];
    let answers = [];
    let feedback = [];
    let improvementPlan = null;

    try {
      session = await Session.findById(id);
      if (session) {
        questions = await Question.find({ session: id }).sort({ questionNumber: 1 });
        answers = await Answer.find({ session: id });
        feedback = await Feedback.find({ session: id });
        improvementPlan = await ImprovementPlan.findOne({ session: id });
      }
    } catch (e) {
      console.log('[Get Session Fallback]', e.message);
    }

    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    res.json({
      session,
      questions,
      answers,
      feedback,
      improvementPlan,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Complete session & synthesize improvement plan
// @route POST /api/sessions/:id/complete
export const completeSession = async (req, res) => {
  try {
    const { id } = req.params;
    let session = null;
    let questions = [];
    let answers = [];
    let feedbackList = [];

    try {
      session = await Session.findById(id);
      if (session) {
        questions = await Question.find({ session: id });
        answers = await Answer.find({ session: id });
        feedbackList = await Feedback.find({ session: id });
      }
    } catch (e) {
      console.log('[Complete Session DB Lookup]', e.message);
    }

    // Calculate aggregated overall score & category breakdown
    let totalScoreSum = 0;
    const categoryScores = {};

    feedbackList.forEach((fb) => {
      totalScoreSum += fb.score;
      const cat = fb.category || 'General';
      if (!categoryScores[cat]) {
        categoryScores[cat] = { sum: 0, count: 0 };
      }
      categoryScores[cat].sum += fb.score;
      categoryScores[cat].count += 1;
    });

    const totalCount = feedbackList.length || 1;
    const overallScore = Number((totalScoreSum / totalCount).toFixed(1));

    const categoryBreakdown = Object.keys(categoryScores).map((cat) => ({
      category: cat,
      score: Number((categoryScores[cat].sum / categoryScores[cat].count).toFixed(1)),
    }));

    // Update Session status & score
    if (session && typeof session.save === 'function') {
      session.status = 'completed';
      session.overallScore = overallScore;
      session.categoryBreakdown = categoryBreakdown;
      await session.save();
    }

    // Build Q&A transcript history for Improvement Plan LLM Synthesis
    const qnAHistory = questions.map((q) => {
      const ans = answers.find((a) => String(a.question) === String(q._id));
      const fb = feedbackList.find((f) => String(f.answer) === String(ans?._id));
      return {
        question: q.questionText,
        category: q.category,
        answer: ans ? ans.transcript : 'No answer provided',
        score: fb ? fb.score : 0,
        strengths: fb ? fb.strengths : [],
        weaknesses: fb ? fb.weaknesses : [],
        suggestion: fb ? fb.suggestion : '',
      };
    });

    console.log('[Complete Session] Generating AI Improvement Plan...');
    const planPrompt = buildImprovementPlanPrompt({
      targetRole: session ? session.targetRole : 'Software Engineer',
      interviewType: session ? session.interviewType : 'technical',
      qnAHistory,
    });

    const planLLMResult = await generateLLMJson(planPrompt, 'You generate actionable improvement plans.');

    let improvementPlanDoc;
    try {
      improvementPlanDoc = await ImprovementPlan.create({
        session: id,
        user: req.user._id,
        focusAreas: planLLMResult.focusAreas || [],
        overallSummary: planLLMResult.overallSummary || '',
      });
    } catch (e) {
      improvementPlanDoc = {
        _id: 'plan-' + Date.now(),
        session: id,
        user: req.user._id,
        focusAreas: planLLMResult.focusAreas || [],
        overallSummary: planLLMResult.overallSummary || '',
      };
    }

    res.json({
      message: 'Session completed successfully!',
      overallScore,
      categoryBreakdown,
      improvementPlan: improvementPlanDoc,
    });
  } catch (error) {
    console.error('[Complete Session Error]', error);
    res.status(500).json({ message: error.message || 'Failed to complete session.' });
  }
};
