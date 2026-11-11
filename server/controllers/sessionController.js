import mongoose from 'mongoose';
import Session from '../models/Session.js';
import Resume from '../models/Resume.js';
import Question from '../models/Question.js';
import Answer from '../models/Answer.js';
import Feedback from '../models/Feedback.js';
import ImprovementPlan from '../models/ImprovementPlan.js';
import AnalyticsSnapshot from '../models/AnalyticsSnapshot.js';
import PlacementDrive from '../models/PlacementDrive.js';
import { generateLLMJson } from '../services/llmService.js';
import { buildQuestionGenerationPrompt } from '../prompts/questionPrompts.js';
import { buildImprovementPlanPrompt } from '../prompts/improvementPrompts.js';
import { buildAnswerFeedbackPrompt } from '../prompts/feedbackPrompts.js';
import { checkOwnership } from '../utils/authz.js';
import { memoryResumes } from './resumeController.js';
import { sanitizeRole } from '../utils/roleSanitizer.js';
import { selectTechnicalQuestions } from '../services/technicalQuestionService.js';
import { memoryPlacementDrives } from './placementController.js';

// In-memory fallback stores when MongoDB is offline/reconnecting
export const memorySessions = [];
export const memoryQuestions = [];
export const memoryAnswers = [];
export const memoryFeedback = [];
export const memoryImprovementPlans = [];

// @desc Start a new interview session
// @route POST /api/sessions/start
export const startSession = async (req, res) => {
  const t0_handlerStart = Date.now();
  console.log(`⏱️ [START SESSION TRACE] Handler initiated at t=0ms`);
  try {
    if (req.dbAvailable === false || mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database connection unavailable. Please check MongoDB Atlas network access settings.' });
    }

    if (!req.user || !req.user._id) {
      return res.status(400).json({ message: 'Cannot generate questions: user profile data is missing' });
    }

    const { resumeId, targetRole, interviewType = 'technical', difficulty = 'mid', count = 5, focusTopic, previousScore } = req.body;

    const rawTargetRole = targetRole || req.user.targetRole;
    if (!rawTargetRole || (typeof rawTargetRole === 'string' && !rawTargetRole.trim())) {
      return res.status(400).json({ message: 'Cannot generate questions: user profile data is missing' });
    }
    const effectiveTargetRole = sanitizeRole(rawTargetRole);

    const isValidResumeId = resumeId && mongoose.Types.ObjectId.isValid(resumeId);
    let parsedResume = null;
    let validatedResumeId = null;

    const t_resumeStart = Date.now();
    if (isValidResumeId) {
      let resumeDoc = null;
      if (mongoose.connection.readyState === 1) {
        try {
          resumeDoc = await Resume.findById(resumeId);
        } catch (e) {
          console.log('[Session DB Notice] Could not fetch resume by ID:', e.message);
        }
      }

      if (!resumeDoc) {
        resumeDoc = memoryResumes.find(
          (r) => String(r._id) === String(resumeId) || String(r.id) === String(resumeId)
        );
      }

      if (resumeDoc) {
        if (!checkOwnership(resumeDoc, req.user)) {
          return res.status(403).json({ message: 'Forbidden: You do not have permission to access this resume' });
        }
        parsedResume = resumeDoc.parsedData;
        validatedResumeId = resumeDoc._id;
      }
    }
    const t_resumeEnd = Date.now();
    console.log(`⏱️ [START SESSION TRACE] 1. Resume lookup: ${t_resumeEnd - t_resumeStart}ms`);

    const sessionId = new mongoose.Types.ObjectId().toString();
    const validUserId = req.user._id && mongoose.Types.ObjectId.isValid(req.user._id)
      ? req.user._id
      : new mongoose.Types.ObjectId().toString();

    // 1. Create Session DB record
    const t_sessionDbStart = Date.now();
    let session = null;
    if (mongoose.connection.readyState === 1) {
      try {
        session = await Session.create({
          _id: sessionId,
          user: validUserId,
          resume: validatedResumeId || null,
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
        resume: validatedResumeId || null,
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
    if (memorySessions.length >= 100) {
      memorySessions.shift();
    }
    memorySessions.push(session);
    const t_sessionDbEnd = Date.now();
    console.log(`⏱️ [START SESSION TRACE] 2. MongoDB Session creation: ${t_sessionDbEnd - t_sessionDbStart}ms`);

    // 2. Select optimized technical questions
    if (!req.user || !effectiveTargetRole) {
      return res.status(400).json({ message: 'Cannot generate questions: user profile data is missing' });
    }

    const t_qSelectionStart = Date.now();
    const rawQuestions = selectTechnicalQuestions({
      targetRole: effectiveTargetRole,
      interviewType,
      difficulty,
      count: session.totalQuestions,
      focusTopic,
      parsedResume,
    });
    const t_qSelectionEnd = Date.now();
    console.log(`⏱️ [START SESSION TRACE] 3. Technical question selection (Optimized Engine): ${t_qSelectionEnd - t_qSelectionStart}ms`);

    // 3. Save Questions to DB and memory store
    const t_questionsDbStart = Date.now();
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
        if (memoryQuestions.length >= 500) {
          memoryQuestions.shift();
        }
        memoryQuestions.push(q);
      }
    });
    const t_questionsDbEnd = Date.now();
    console.log(`⏱️ [START SESSION TRACE] 4. MongoDB Question insertion: ${t_questionsDbEnd - t_questionsDbStart}ms`);

    const t_totalElapsed = Date.now() - t0_handlerStart;
    console.log(`⏱️ [START SESSION TRACE] 5. Total handler execution time: ${t_totalElapsed}ms`);

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
    let sessions = null;
    if (mongoose.connection.readyState === 1) {
      try {
        sessions = await Session.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
      } catch (e) {
        console.log('[Sessions List Fallback]', e.message);
      }
    }
    if (sessions === null) {
      sessions = memorySessions.filter((s) => String(s.user) === String(req.user._id));
    }
    res.json(sessions || []);
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
        session = await Session.findById(id).lean();
        if (session) {
          questions = await Question.find({ session: id }).sort({ questionNumber: 1 }).lean();
          answers = await Answer.find({ session: id }).lean();
          feedback = await Feedback.find({ session: id }).lean();
          improvementPlan = await ImprovementPlan.findOne({ session: id }).lean();
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

    // Auto-sync completed session with any active PlacementDrive
    try {
      const scaledScore = overallScore <= 10 && overallScore > 0 ? Math.round(overallScore * 10) : overallScore;
      let drive = null;
      if (mongoose.connection.readyState === 1) {
        drive = await PlacementDrive.findOne({
          user: req.user._id,
          $or: [
            { 'rounds.round2_technical.sessionId': id },
            { 'rounds.round4_resume.sessionId': id }
          ]
        });
      }
      if (!drive) {
        drive = memoryPlacementDrives.find(
          (d) => String(d.user) === String(req.user._id) &&
            (String(d.rounds?.round2_technical?.sessionId) === String(id) ||
              String(d.rounds?.round4_resume?.sessionId) === String(id))
        );
      }
      if (drive) {
        if (String(drive.rounds?.round2_technical?.sessionId) === String(id)) {
          const passThresh = drive.rounds.round2_technical.passThreshold || 60;
          drive.rounds.round2_technical.score = scaledScore;
          drive.rounds.round2_technical.categoryBreakdown = categoryBreakdown;
          drive.rounds.round2_technical.completedAt = new Date();
          if (scaledScore >= passThresh) {
            drive.rounds.round2_technical.passed = true;
            drive.rounds.round2_technical.status = 'completed';
            if (drive.rounds.round3_gd.status === 'locked') {
              drive.rounds.round3_gd.status = 'unlocked';
            }
            drive.currentRound = Math.max(drive.currentRound || 1, 3);
          }
        } else if (String(drive.rounds?.round4_resume?.sessionId) === String(id)) {
          const passThresh = drive.rounds.round4_resume.passThreshold || 60;
          drive.rounds.round4_resume.score = scaledScore;
          drive.rounds.round4_resume.categoryBreakdown = categoryBreakdown;
          drive.rounds.round4_resume.completedAt = new Date();
          if (scaledScore >= passThresh) {
            drive.rounds.round4_resume.passed = true;
            drive.rounds.round4_resume.status = 'completed';
            drive.currentRound = 5;
            drive.status = 'completed';
          }
        }
        if (typeof drive.save === 'function') {
          await drive.save();
        }
      }
    } catch (syncErr) {
      console.warn('[Session Complete Notice] Auto-sync with placement drive:', syncErr.message);
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

// @desc Retry failed AI evaluation for an interview session
// @route POST /api/sessions/:id/retry-evaluation
export const retrySessionEvaluation = async (req, res) => {
  try {
    const { id } = req.params;

    let session = null;
    let questions = [];
    let answers = [];
    let feedbackList = [];

    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      try {
        session = await Session.findById(id);
        questions = await Question.find({ session: id });
        answers = await Answer.find({ session: id });
        feedbackList = await Feedback.find({ session: id });
      } catch (e) {
        console.log('[Retry Session DB Lookup]', e.message);
      }
    }

    if (!session) {
      session = memorySessions.find((s) => String(s._id) === String(id) || String(s.id) === String(id));
    }
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    if (!checkOwnership(session, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this session' });
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

    let retryCount = 0;
    for (const ans of answers) {
      let fb = feedbackList.find((f) => String(f.answer) === String(ans._id));
      if (!fb || fb.evaluationStatus === 'FAILED' || fb.score == null) {
        const question = questions.find((q) => String(q._id) === String(ans.question));
        const feedbackPrompt = buildAnswerFeedbackPrompt({
          questionText: question ? question.questionText : 'Technical Question',
          category: question ? question.category : 'General',
          expectedKeyPoints: question ? question.expectedKeyPoints : [],
          candidateAnswer: ans.transcript,
        });

        const fbLLMResult = await generateLLMJson(feedbackPrompt, 'You are an AI interview grading assistant.');
        const isAiSuccess = Boolean(fbLLMResult && fbLLMResult._meta?.source === 'openai');
        const evaluationStatus = isAiSuccess ? 'COMPLETED' : 'FAILED';
        const evaluationSource = isAiSuccess ? 'openai' : (fbLLMResult?._meta?.source || 'mock');
        const evaluationError = isAiSuccess ? '' : (fbLLMResult?._meta?.reason || 'AI evaluation service temporarily unavailable');
        const scoreToSave = isAiSuccess && typeof fbLLMResult?.score === 'number'
          ? Math.min(10, Math.max(1, fbLLMResult.score))
          : null;

        if (mongoose.connection.readyState === 1 && ans._id) {
          try {
            await Answer.findByIdAndUpdate(ans._id, { evaluationStatus });
          } catch (e) {}
        }
        ans.evaluationStatus = evaluationStatus;

        if (fb) {
          fb.score = scoreToSave;
          fb.evaluationStatus = evaluationStatus;
          fb.evaluationSource = evaluationSource;
          fb.evaluationError = evaluationError;
          if (isAiSuccess) {
            fb.strengths = Array.isArray(fbLLMResult.strengths) ? fbLLMResult.strengths : fb.strengths;
            fb.weaknesses = Array.isArray(fbLLMResult.weaknesses) ? fbLLMResult.weaknesses : fb.weaknesses;
            fb.suggestion = fbLLMResult.suggestion || fb.suggestion;
          }
          if (mongoose.connection.readyState === 1 && fb._id) {
            try {
              await Feedback.findByIdAndUpdate(fb._id, {
                score: fb.score,
                evaluationStatus: fb.evaluationStatus,
                evaluationSource: fb.evaluationSource,
                evaluationError: fb.evaluationError,
                strengths: fb.strengths,
                weaknesses: fb.weaknesses,
                suggestion: fb.suggestion,
              });
            } catch (e) {}
          }
        } else {
          const newFb = {
            _id: new mongoose.Types.ObjectId().toString(),
            answer: ans._id,
            session: id,
            score: scoreToSave,
            evaluationStatus,
            evaluationSource,
            evaluationError,
            strengths: isAiSuccess && Array.isArray(fbLLMResult.strengths) ? fbLLMResult.strengths : [],
            weaknesses: isAiSuccess && Array.isArray(fbLLMResult.weaknesses) ? fbLLMResult.weaknesses : [],
            suggestion: isAiSuccess ? (fbLLMResult.suggestion || '') : 'AI grading preserved for retry.',
            category: question ? question.category : 'General',
          };
          if (mongoose.connection.readyState === 1) {
            try {
              await Feedback.create(newFb);
            } catch (e) {}
          }
          feedbackList.push(newFb);
        }
        retryCount++;
      }
    }

    return res.json({
      message: retryCount > 0 ? `Successfully retried evaluation for ${retryCount} answer(s).` : 'All answers in this session are already evaluated.',
      session,
      answers,
      feedback: feedbackList,
    });
  } catch (error) {
    console.error('[Retry Session Evaluation Error]', error);
    return res.status(500).json({ message: error.message || 'Failed to retry session evaluation.' });
  }
};
