import mongoose from 'mongoose';
import AptitudeQuestion from '../models/AptitudeQuestion.js';
import AptitudeAttempt from '../models/AptitudeAttempt.js';
import { checkOwnership } from '../utils/authz.js';
import {
  getAvailableCompaniesMetadata,
  selectQuestionsForTest,
  gradeTestSubmission,
  memoryAptitudeQuestions,
  memoryAptitudeAttempts,
} from '../services/aptitudePYQService.js';

/**
 * @desc Get companies that have verified question data in MongoDB
 * @route GET /api/aptitude/companies
 */
export const getAvailableCompanies = async (req, res) => {
  try {
    const metadata = await getAvailableCompaniesMetadata();
    res.json({
      companies: metadata,
      totalVerifiedCompanies: metadata.length,
    });
  } catch (error) {
    console.error('[PYQ Controller getAvailableCompanies Error]', error);
    res.status(500).json({ message: error.message || 'Failed to fetch companies metadata' });
  }
};

/**
 * @desc Get available question counts and filter options without exposing questions
 * @route GET /api/aptitude/questions
 */
export const getFilteredQuestionsInfo = async (req, res) => {
  try {
    const { company, examYear, topic, difficulty } = req.query;

    const { availableCount } = await selectQuestionsForTest({
      company,
      examYear,
      topic,
      difficulty,
      questionCount: 1, // just count availability
    });

    res.json({
      availableCount,
      filters: { company, examYear, topic, difficulty },
      isAvailable: availableCount > 0,
    });
  } catch (error) {
    console.error('[PYQ Controller getFilteredQuestionsInfo Error]', error);
    res.status(500).json({ message: error.message || 'Failed to fetch question info' });
  }
};

/**
 * @desc Start dynamic company PYQ test attempt
 * @route POST /api/aptitude/tests/start
 */
export const startAptitudeTest = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const {
      company,
      examYear,
      topic = 'All Topics',
      difficulty = 'All Difficulties',
      testMode = 'full_mock',
      questionCount = 10,
      negativeMarking = 0.25,
      timeLimitMinutes = 15,
    } = req.body;

    // Fetch verified questions dynamically
    const { availableCount, selectedQuestions } = await selectQuestionsForTest({
      company,
      examYear,
      topic,
      difficulty,
      questionCount: Number(questionCount) || 10,
      userId,
    });

    if (availableCount === 0 || selectedQuestions.length === 0) {
      return res.status(404).json({
        message: `No verified PYQ questions are currently available for ${company || 'selected filters'}. Please choose another company or topic.`,
        availableCount: 0,
      });
    }

    const testId = new mongoose.Types.ObjectId().toString();

    // Prepare question snapshots for attempt storage (keeps correct answer on server)
    const questionsSnapshot = selectedQuestions.map((q) => ({
      questionId: q._id || q.id,
      questionText: q.questionText,
      options: q.options,
      topic: q.topic,
      subtopic: q.subtopic || 'General',
      difficulty: q.difficulty || 'Medium',
      company: q.company,
      examYear: q.examYear,
      sourceUrl: q.sourceUrl || '',
      sourceTitle: q.sourceTitle || '',
      correctAnswer: q.correctAnswer, // Securely preserved for evaluation
      explanation: q.explanation || '',
      userAnswer: null,
      isAnswered: false,
      isFlagged: false,
      isCorrect: false,
    }));

    const attemptDoc = {
      _id: testId,
      id: testId,
      user: userId,
      company: company || 'General Aptitude',
      examYear: examYear ? Number(examYear) : null,
      examName: selectedQuestions[0]?.examName || `${company} Placement Test`,
      topic,
      difficulty,
      testMode,
      negativeMarking: Math.max(0, Number(negativeMarking) || 0),
      marksPerQuestion: 1.0,
      timeLimitMinutes: Number(timeLimitMinutes) || 15,
      status: 'in_progress',
      questions: questionsSnapshot,
      totalQuestions: questionsSnapshot.length,
      startedAt: new Date(),
    };

    let savedAttempt = null;
    if (mongoose.connection.readyState === 1) {
      try {
        savedAttempt = await AptitudeAttempt.create(attemptDoc);
      } catch (e) {
        console.warn('[PYQ DB Notice] Attempt create fallback:', e.message);
      }
    }

    if (!savedAttempt) {
      savedAttempt = attemptDoc;
    }
    memoryAptitudeAttempts.push(savedAttempt);

    // Sanitize questions for client: STRIP correctAnswer and explanation!
    const clientQuestions = questionsSnapshot.map((q, idx) => ({
      questionId: q.questionId,
      questionNumber: idx + 1,
      questionText: q.questionText,
      options: q.options,
      topic: q.topic,
      subtopic: q.subtopic,
      difficulty: q.difficulty,
      company: q.company,
      examYear: q.examYear,
    }));

    res.status(201).json({
      testId: savedAttempt._id,
      company: savedAttempt.company,
      examName: savedAttempt.examName,
      examYear: savedAttempt.examYear,
      topic: savedAttempt.topic,
      difficulty: savedAttempt.difficulty,
      testMode: savedAttempt.testMode,
      timeLimitMinutes: savedAttempt.timeLimitMinutes,
      negativeMarking: savedAttempt.negativeMarking,
      totalQuestions: clientQuestions.length,
      questions: clientQuestions,
    });
  } catch (error) {
    console.error('[PYQ Controller startAptitudeTest Error]', error);
    res.status(500).json({ message: error.message || 'Failed to start aptitude test' });
  }
};

/**
 * @desc Submit test answers, score on server with negative marking
 * @route POST /api/aptitude/tests/:testId/submit
 */
export const submitAptitudeTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const { answers = {}, timeSpentSeconds = 0 } = req.body;
    const userId = req.user._id || req.user.id;

    if (!testId) {
      return res.status(400).json({ message: 'Test ID is required' });
    }

    let attempt = null;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(testId)) {
      try {
        attempt = await AptitudeAttempt.findById(testId);
      } catch (e) {
        console.warn('[PYQ DB Notice] Submit lookup fallback:', e.message);
      }
    }

    if (!attempt) {
      attempt = memoryAptitudeAttempts.find((a) => String(a._id) === String(testId) || String(a.id) === String(testId));
    }

    if (!attempt) {
      return res.status(404).json({ message: 'Aptitude test session not found' });
    }

    // Ownership validation
    if (!checkOwnership(attempt, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this test attempt' });
    }

    // Duplicate submission guard
    if (attempt.status === 'completed') {
      return res.status(400).json({ message: 'This test attempt has already been submitted and scored.' });
    }

    // Run grading engine
    const evaluation = gradeTestSubmission({
      attempt,
      answers,
      timeSpentSeconds,
    });

    // Update attempt record
    attempt.status = 'completed';
    attempt.completedAt = new Date();
    attempt.timeSpentSeconds = evaluation.timeSpentSeconds;
    attempt.questions = evaluation.questions;
    attempt.totalQuestions = evaluation.totalQuestions;
    attempt.totalAttempted = evaluation.totalAttempted;
    attempt.totalCorrect = evaluation.totalCorrect;
    attempt.totalIncorrect = evaluation.totalIncorrect;
    attempt.totalUnanswered = evaluation.totalUnanswered;
    attempt.rawScore = evaluation.rawScore;
    attempt.maxScore = evaluation.maxScore;
    attempt.percentage = evaluation.percentage;
    attempt.passed = evaluation.passed;
    attempt.topicBreakdown = evaluation.topicBreakdown;
    attempt.weakTopics = evaluation.weakTopics;
    attempt.strongTopics = evaluation.strongTopics;
    attempt.recommendations = evaluation.recommendations;

    if (mongoose.connection.readyState === 1 && typeof attempt.save === 'function') {
      await attempt.save();
    } else {
      const idx = memoryAptitudeAttempts.findIndex((a) => String(a._id) === String(testId) || String(a.id) === String(testId));
      if (idx >= 0) memoryAptitudeAttempts[idx] = attempt;
    }

    res.json({
      message: evaluation.passed ? 'Test submitted successfully! Cutoff benchmark cleared.' : 'Test submitted. Review weak areas for improvement.',
      result: {
        testId: attempt._id,
        company: attempt.company,
        examName: attempt.examName,
        examYear: attempt.examYear,
        topic: attempt.topic,
        difficulty: attempt.difficulty,
        totalQuestions: attempt.totalQuestions,
        totalAttempted: attempt.totalAttempted,
        totalCorrect: attempt.totalCorrect,
        totalIncorrect: attempt.totalIncorrect,
        totalUnanswered: attempt.totalUnanswered,
        rawScore: attempt.rawScore,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        passed: attempt.passed,
        negativeMarking: attempt.negativeMarking,
        timeSpentSeconds: attempt.timeSpentSeconds,
        topicBreakdown: attempt.topicBreakdown,
        weakTopics: attempt.weakTopics,
        strongTopics: attempt.strongTopics,
        recommendations: attempt.recommendations,
        questions: evaluation.questions, // Revealed after submission
      },
    });
  } catch (error) {
    console.error('[PYQ Controller submitAptitudeTest Error]', error);
    res.status(500).json({ message: error.message || 'Failed to submit test' });
  }
};

/**
 * @desc Get attempt result by testId with solutions & explanations
 * @route GET /api/aptitude/tests/:testId/result
 */
export const getAptitudeTestResult = async (req, res) => {
  try {
    const { testId } = req.params;

    let attempt = null;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(testId)) {
      try {
        attempt = await AptitudeAttempt.findById(testId);
      } catch (e) {}
    }

    if (!attempt) {
      attempt = memoryAptitudeAttempts.find((a) => String(a._id) === String(testId) || String(a.id) === String(testId));
    }

    if (!attempt) {
      return res.status(404).json({ message: 'Test attempt not found' });
    }

    if (!checkOwnership(attempt, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this test result' });
    }

    res.json({
      result: attempt,
    });
  } catch (error) {
    console.error('[PYQ Controller getAptitudeTestResult Error]', error);
    res.status(500).json({ message: error.message || 'Failed to fetch test result' });
  }
};

/**
 * @desc Get student's past attempt history
 * @route GET /api/aptitude/attempts
 */
export const getUserAttempts = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    let attempts = [];

    if (mongoose.connection.readyState === 1) {
      try {
        attempts = await AptitudeAttempt.find({ user: userId })
          .select('-questions.correctAnswer -questions.explanation')
          .sort({ createdAt: -1 })
          .limit(20);
      } catch (e) {
        console.warn('[PYQ DB Notice] Attempts query fallback:', e.message);
      }
    }

    if (attempts.length === 0) {
      attempts = memoryAptitudeAttempts
        .filter((a) => String(a.user) === String(userId))
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    res.json({
      attempts,
      totalAttempts: attempts.length,
    });
  } catch (error) {
    console.error('[PYQ Controller getUserAttempts Error]', error);
    res.status(500).json({ message: error.message || 'Failed to fetch user attempts' });
  }
};
