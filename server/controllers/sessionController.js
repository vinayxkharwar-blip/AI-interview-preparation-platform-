import mongoose from 'mongoose';
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
import { checkOwnership } from '../utils/authz.js';

// In-memory fallback stores when MongoDB is offline/reconnecting
export const memorySessions = [];
export const memoryQuestions = [];
export const memoryAnswers = [];
export const memoryFeedback = [];
export const memoryImprovementPlans = [];

// @desc Start a new interview session
// @route POST /api/sessions/start
export const startSession = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(400).json({ message: 'Cannot generate questions: user profile data is missing' });
    }

    const { resumeId, targetRole, interviewType = 'technical', difficulty = 'mid', count = 5, focusTopic, previousScore } = req.body;

    const effectiveTargetRole = targetRole || req.user.targetRole;
    if (!effectiveTargetRole) {
      return res.status(400).json({ message: 'Cannot generate questions: user profile data is missing' });
    }

    const isValidResumeId = resumeId && mongoose.Types.ObjectId.isValid(resumeId);
    let parsedResume = null;
    if (isValidResumeId) {
      try {
        const resumeDoc = await Resume.findById(resumeId);
        if (resumeDoc) {
          parsedResume = resumeDoc.parsedData;
        }
      } catch (e) {
        console.log('[Session DB Notice] Could not fetch resume by ID:', e.message);
      }
    }

    const sessionId = new mongoose.Types.ObjectId().toString();
    const validUserId = req.user._id && mongoose.Types.ObjectId.isValid(req.user._id)
      ? req.user._id
      : new mongoose.Types.ObjectId().toString();

    // 1. Create Session DB record
    let session = null;
    if (mongoose.connection.readyState === 1) {
      try {
        session = await Session.create({
          _id: sessionId,
          user: validUserId,
          resume: isValidResumeId ? resumeId : null,
          targetRole: effectiveTargetRole,
          interviewType,
          difficulty,
          totalQuestions: Number(count) || 5,
          status: 'in_progress',
          focusTopic: focusTopic || null,
          previousScore: previousScore != null ? Number(previousScore) : null,
        });
      } catch (e) {
        console.log('[Session DB Notice] Session creation fallback:', e.message);
      }
    }

    if (!session) {
      session = {
        _id: sessionId,
        id: sessionId,
        user: req.user._id,
        resume: resumeId || null,
        targetRole: effectiveTargetRole,
        interviewType,
        difficulty,
        totalQuestions: Number(count) || 5,
        status: 'in_progress',
        focusTopic: focusTopic || null,
        previousScore: previousScore != null ? Number(previousScore) : null,
        createdAt: new Date(),
      };
    }
    memorySessions.push(session);

    // 2. Generate questions via LLM
    if (!req.user || !effectiveTargetRole) {
      return res.status(400).json({ message: 'Cannot generate questions: user profile data is missing' });
    }

    const prompt = buildQuestionGenerationPrompt({
      parsedResume,
      targetRole: effectiveTargetRole,
      interviewType,
      difficulty,
      count: session.totalQuestions,
      focusTopic,
    });

    let rawQuestions = [];
    try {
      const llmResult = await generateLLMJson(prompt, 'You are an expert interview question generator.');
      if (!llmResult) {
        throw new Error('Cannot generate questions: user profile data is missing or LLM failed to respond');
      }
      rawQuestions = Array.isArray(llmResult.questions) ? llmResult.questions : (llmResult.questions || []);
    } catch (llmErr) {
      console.error('[Session Controller] Question generation LLM error:', llmErr.message);
    }

    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      console.warn('[Session Controller] LLM returned 0 questions. Using fallback interview question set.');
      rawQuestions = [
        {
          questionNumber: 1,
          questionText: `Can you explain your background and key technical experience relevant to ${targetRole}?`,
          category: 'General / Background',
          expectedKeyPoints: ['Relevant technical experience', 'Key projects', 'Role fit'],
          hints: ['Focus on impactful projects and core strengths.'],
        },
        {
          questionNumber: 2,
          questionText: `Describe a challenging problem you solved in ${focusTopic || 'a recent project'} and how you handled technical trade-offs.`,
          category: 'Problem Solving',
          expectedKeyPoints: ['Problem description', 'Approach & Analysis', 'Results & Trade-offs'],
          hints: ['Use the STAR method.'],
        },
        {
          questionNumber: 3,
          questionText: 'How do you approach application performance, error handling, and system reliability?',
          category: 'Architecture & Quality',
          expectedKeyPoints: ['Monitoring & Logging', 'Resilience patterns', 'Testing strategy'],
          hints: ['Discuss real-world production practices.'],
        },
        {
          questionNumber: 4,
          questionText: 'Explain how asynchronous operations, event loops, and state management work in your primary tech stack.',
          category: 'Core Concepts',
          expectedKeyPoints: ['Event loop / Call stack', 'Asynchronous flow', 'State synchronization'],
          hints: ['Explain execution order clearly.'],
        },
        {
          questionNumber: 5,
          questionText: 'How do you prioritize technical debt vs feature delivery in a fast-paced environment?',
          category: 'Behavioral & Leadership',
          expectedKeyPoints: ['Pragmatic trade-offs', 'Team communication', 'Iterative refactoring'],
          hints: ['Balance long-term quality with short-term delivery.'],
        },
      ].slice(0, session.totalQuestions);
    }

    // 3. Save Questions to DB and memory store
    const questionsToSave = rawQuestions.map((q, idx) => {
      const qId = new mongoose.Types.ObjectId().toString();
      return {
        _id: qId,
        id: qId,
        session: session._id,
        questionNumber: q.questionNumber || idx + 1,
        questionText: q.questionText,
        category: q.category || 'General',
        expectedKeyPoints: q.expectedKeyPoints || [],
        hints: q.hints || [],
      };
    });

    let savedQuestions = [];
    if (mongoose.connection.readyState === 1) {
      try {
        savedQuestions = await Question.insertMany(questionsToSave);
      } catch (e) {
        console.log('[Session DB Notice] Question insertMany fallback:', e.message);
        savedQuestions = questionsToSave;
      }
    } else {
      savedQuestions = questionsToSave;
    }

    questionsToSave.forEach((q) => {
      if (!memoryQuestions.some((mq) => String(mq._id) === String(q._id))) {
        memoryQuestions.push(q);
      }
    });

    res.status(201).json({
      session,
      questions: questionsToSave,
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
    if (mongoose.connection.readyState === 1) {
      try {
        sessions = await Session.find({ user: req.user._id }).sort({ createdAt: -1 });
      } catch (e) {
        console.log('[Sessions List Fallback]', e.message);
      }
    }
    if (sessions.length === 0) {
      sessions = memorySessions.filter((s) => String(s.user) === String(req.user._id));
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

    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      try {
        session = await Session.findById(id);
        if (session) {
          questions = await Question.find({ session: id }).sort({ questionNumber: 1 });
          answers = await Answer.find({ session: id });
          feedback = await Feedback.find({ session: id });
          improvementPlan = await ImprovementPlan.findOne({ session: id });
        }
      } catch (e) {
        console.log('[Get Session DB Warning]', e.message);
      }
    }

    if (!session) {
      session = memorySessions.find((s) => String(s._id) === String(id) || String(s.id) === String(id));
    }

    if (questions.length === 0) {
      questions = memoryQuestions.filter((q) => String(q.session) === String(id));
    }

    if (answers.length === 0) {
      answers = memoryAnswers.filter((a) => String(a.session) === String(id));
    }

    if (feedback.length === 0) {
      feedback = memoryFeedback.filter((f) => String(f.session) === String(id));
    }

    if (!improvementPlan) {
      improvementPlan = memoryImprovementPlans.find((p) => String(p.session) === String(id)) || null;
    }

    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    if (!checkOwnership(session, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this session' });
    }

    res.json({
      session,
      questions,
      answers,
      feedback,
      improvementPlan,
    });
  } catch (error) {
    console.error('[Get Session Error]', error);
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

    if (!session) {
      session = memorySessions.find((s) => String(s._id) === String(id) || String(s.id) === String(id));
    }

    if (questions.length === 0) {
      questions = memoryQuestions.filter((q) => String(q.session) === String(id));
    }

    if (answers.length === 0) {
      answers = memoryAnswers.filter((a) => String(a.session) === String(id));
    }

    if (feedbackList.length === 0) {
      feedbackList = memoryFeedback.filter((f) => String(f.session) === String(id));
    }

    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    if (!checkOwnership(session, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this session' });
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
    if (session) {
      session.status = 'completed';
      session.overallScore = overallScore;
      session.categoryBreakdown = categoryBreakdown;
      if (typeof session.save === 'function') {
        await session.save();
      }
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
