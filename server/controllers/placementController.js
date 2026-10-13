import mongoose from 'mongoose';
import PlacementDrive from '../models/PlacementDrive.js';
import Session from '../models/Session.js';
import Resume from '../models/Resume.js';
import Question from '../models/Question.js';
import { checkOwnership } from '../utils/authz.js';
import { generateAptitudeTest, evaluateAptitudeAnswers } from '../services/aptitudeService.js';
import { initializeGDRound, generatePeerResponses, evaluateGDPerformance } from '../services/gdService.js';
import { generateLLMJson } from '../services/llmService.js';
import { buildQuestionGenerationPrompt } from '../prompts/questionPrompts.js';
import User from '../models/User.js';
import { memoryUsers } from './authController.js';
import { sanitizeRole } from '../utils/roleSanitizer.js';
import { memorySessions, memoryQuestions } from './sessionController.js';
import { memoryResumes } from './resumeController.js';

// In-memory store fallback when MongoDB Atlas is offline / reconnecting
export const memoryPlacementDrives = [];

/**
 * Helper to find drive by query in DB or memory fallback
 */
const findDrive = async (filter) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const doc = await PlacementDrive.findOne(filter).sort({ createdAt: -1 });
      if (doc) return doc;
    } catch (e) {
      console.log('[Placement DB Notice] findOne fallback:', e.message);
    }
  }

  // Memory fallback
  return memoryPlacementDrives.find((d) => {
    for (const [key, val] of Object.entries(filter)) {
      if (String(d[key]) !== String(val)) return false;
    }
    return true;
  }) || null;
};

/**
 * Helper to save or update drive in DB and memory
 */
const saveDrive = async (driveData) => {
  let savedDoc = null;
  if (mongoose.connection.readyState === 1) {
    try {
      if (driveData._id && mongoose.Types.ObjectId.isValid(driveData._id)) {
        savedDoc = await PlacementDrive.findByIdAndUpdate(
          driveData._id,
          { $set: driveData },
          { new: true, upsert: true, runValidators: false }
        );
      } else {
        savedDoc = await PlacementDrive.create(driveData);
      }
    } catch (e) {
      console.log('[Placement DB Notice] saveDrive error:', e.message);
    }
  }

  // Update in-memory fallback
  const idx = memoryPlacementDrives.findIndex((d) => String(d._id) === String(driveData._id));
  if (idx >= 0) {
    memoryPlacementDrives[idx] = savedDoc ? savedDoc.toObject() : { ...driveData, updatedAt: new Date() };
  } else {
    memoryPlacementDrives.push(savedDoc ? savedDoc.toObject() : { ...driveData, createdAt: new Date() });
  }

  return savedDoc || driveData;
};

/**
 * @desc Get the current active placement journey for authenticated user
 * @route GET /api/placement/current
 */
export const getCurrentDrive = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    let drive = await findDrive({ user: userId });

    if (!drive) {
      const newDriveId = new mongoose.Types.ObjectId().toString();
      const initialDrive = {
        _id: newDriveId,
        id: newDriveId,
        user: userId,
        targetRole: req.user.targetRole || 'Full Stack Engineer',
        status: 'in_progress',
        currentRound: 1,
        overallScore: 0,
        rounds: {
          round1_aptitude: {
            status: 'unlocked',
            attempts: 0,
            maxAttempts: 3,
            passThreshold: 60,
            score: 0,
            passed: false,
            breakdown: {
              quantitative: { score: 0, total: 5 },
              logical: { score: 0, total: 5 },
              verbal: { score: 0, total: 5 },
            },
            questions: [],
            feedback: '',
            completedAt: null,
          },
          round2_technical: {
            status: 'locked',
            attempts: 0,
            maxAttempts: 3,
            passThreshold: 60,
            sessionId: null,
            score: 0,
            passed: false,
            categoryBreakdown: [],
            feedback: { strengths: [], weaknesses: [], summary: '' },
            completedAt: null,
          },
          round3_gd: {
            status: 'locked',
            attempts: 0,
            maxAttempts: 3,
            passThreshold: 60,
            topic: '',
            discussionContext: '',
            transcript: [],
            score: 0,
            passed: false,
            rubrics: {
              clarityAndArticulation: 0,
              problemSolvingAndIdeas: 0,
              collaborationAndListening: 0,
              persuasionAndConfidence: 0,
            },
            feedback: { strengths: [], weaknesses: [], summary: '' },
            completedAt: null,
          },
          round4_resume: {
            status: 'locked',
            attempts: 0,
            maxAttempts: 3,
            passThreshold: 60,
            resumeId: null,
            sessionId: null,
            score: 0,
            passed: false,
            categoryBreakdown: [],
            feedback: { strengths: [], weaknesses: [], summary: '' },
            completedAt: null,
          },
        },
        finalReport: {
          verdict: 'IN_PROGRESS',
          readinessScore: 0,
          hiringRecommendation: '',
          executiveSummary: '',
          roundSummary: [],
          topStrengths: [],
          areasForImprovement: [],
          generatedAt: null,
        },
      };

      drive = await saveDrive(initialDrive);
    }

    res.json({ drive });
  } catch (error) {
    console.error('[Placement getCurrentDrive Error]', error);
    res.status(500).json({ message: error.message || 'Failed to fetch placement drive' });
  }
};

/**
 * @desc Start fresh or reset placement journey
 * @route POST /api/placement/start
 */
export const startDrive = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { targetRole } = req.body;
    const roleToUse = sanitizeRole(targetRole || req.user.targetRole || 'Full Stack Engineer');

    const newDriveId = new mongoose.Types.ObjectId().toString();
    const driveDoc = {
      _id: newDriveId,
      id: newDriveId,
      user: userId,
      targetRole: roleToUse,
      status: 'in_progress',
      currentRound: 1,
      overallScore: 0,
      rounds: {
        round1_aptitude: {
          status: 'unlocked',
          attempts: 0,
          maxAttempts: 3,
          passThreshold: 60,
          score: 0,
          passed: false,
          breakdown: {
            quantitative: { score: 0, total: 5 },
            logical: { score: 0, total: 5 },
            verbal: { score: 0, total: 5 },
          },
          questions: [],
          feedback: '',
          completedAt: null,
        },
        round2_technical: {
          status: 'locked',
          attempts: 0,
          maxAttempts: 3,
          passThreshold: 60,
          sessionId: null,
          score: 0,
          passed: false,
          categoryBreakdown: [],
          feedback: { strengths: [], weaknesses: [], summary: '' },
          completedAt: null,
        },
        round3_gd: {
          status: 'locked',
          attempts: 0,
          maxAttempts: 3,
          passThreshold: 60,
          topic: '',
          discussionContext: '',
          transcript: [],
          score: 0,
          passed: false,
          rubrics: {
            clarityAndArticulation: 0,
            problemSolvingAndIdeas: 0,
            collaborationAndListening: 0,
            persuasionAndConfidence: 0,
          },
          feedback: { strengths: [], weaknesses: [], summary: '' },
          completedAt: null,
        },
        round4_resume: {
          status: 'locked',
          attempts: 0,
          maxAttempts: 3,
          passThreshold: 60,
          resumeId: null,
          sessionId: null,
          score: 0,
          passed: false,
          categoryBreakdown: [],
          feedback: { strengths: [], weaknesses: [], summary: '' },
          completedAt: null,
        },
      },
      finalReport: {
        verdict: 'IN_PROGRESS',
        readinessScore: 0,
        hiringRecommendation: '',
        executiveSummary: '',
        roundSummary: [],
        topStrengths: [],
        areasForImprovement: [],
        generatedAt: null,
      },
    };

    const drive = await saveDrive(driveDoc);
    res.status(201).json({ drive });
  } catch (error) {
    console.error('[Placement startDrive Error]', error);
    res.status(500).json({ message: error.message || 'Failed to start placement drive' });
  }
};

/**
 * @desc Update target engineering role for the active placement drive and user profile
 * @route PATCH /api/placement/role
 */
export const updateDriveRole = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { targetRole } = req.body;

    if (!targetRole || typeof targetRole !== 'string' || !targetRole.trim()) {
      return res.status(400).json({ message: 'Target role is required and cannot be empty.' });
    }

    if (targetRole.trim().length > 100) {
      return res.status(400).json({ message: 'Target role must not exceed 100 characters.' });
    }

    const cleanRole = sanitizeRole(targetRole);

    let drive = await findDrive({ user: userId });
    if (drive) {
      drive.targetRole = cleanRole;
      await saveDrive(drive);
    }

    if (mongoose.connection.readyState === 1) {
      try {
        await User.findByIdAndUpdate(userId, { targetRole: cleanRole });
      } catch (e) {}
    }
    const memUser = memoryUsers.find((u) => String(u._id) === String(userId) || String(u.id) === String(userId));
    if (memUser) {
      memUser.targetRole = cleanRole;
    }

    res.json({
      success: true,
      message: 'Target role updated successfully.',
      targetRole: cleanRole,
      drive,
    });
  } catch (error) {
    console.error('[Placement updateDriveRole Error]', error);
    res.status(500).json({ message: error.message || 'Failed to update target role' });
  }
};

/**
 * @desc Get drive by ID with ownership verification
 * @route GET /api/placement/:id
 */
export const getDriveById = async (req, res) => {
  try {
    const { id } = req.params;
    let drive = null;

    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      try {
        drive = await PlacementDrive.findById(id);
      } catch (e) {
        console.log('[Placement DB Notice] getById fallback:', e.message);
      }
    }

    if (!drive) {
      drive = memoryPlacementDrives.find((d) => String(d._id) === String(id) || String(d.id) === String(id));
    }

    if (!drive) {
      return res.status(404).json({ message: 'Placement drive journey not found' });
    }

    if (!checkOwnership(drive, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this placement drive' });
    }

    res.json({ drive });
  } catch (error) {
    console.error('[Placement getDriveById Error]', error);
    res.status(500).json({ message: error.message || 'Failed to fetch drive' });
  }
};

// =========================================================================
// ROUND 1: APTITUDE TEST
// =========================================================================

/**
 * @desc Start Aptitude Test attempt (generates questions sanitized for client)
 * @route POST /api/placement/:id/aptitude/start
 */
export const startAptitudeTest = async (req, res) => {
  try {
    const { id } = req.params;
    const drive = await findDrive({ _id: id });

    if (!drive) return res.status(404).json({ message: 'Placement drive not found' });
    if (!checkOwnership(drive, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this drive' });
    }

    const round1 = drive.rounds.round1_aptitude;

    // Check retry limits
    if (round1.attempts >= round1.maxAttempts && !round1.passed) {
      return res.status(400).json({
        message: `Maximum retry limit of ${round1.maxAttempts} attempts reached for Aptitude Test. You may restart the Placement Drive.`,
      });
    }

    // Generate randomized 15-question test
    const { fullQuestions, clientQuestions } = generateAptitudeTest();

    // Securely cache the full questions in drive for verification on submit
    round1.status = 'in_progress';
    round1.questions = fullQuestions.map((q) => ({
      questionId: q.id,
      section: q.section,
      questionText: q.questionText,
      options: q.options,
      correctOption: q.correctOption,
      explanation: q.explanation,
      userSelectedOption: null,
      isCorrect: false,
    }));

    await saveDrive(drive);

    res.json({
      message: 'Aptitude test started successfully',
      currentAttempt: round1.attempts + 1,
      maxAttempts: round1.maxAttempts,
      durationMinutes: 15,
      questions: clientQuestions,
    });
  } catch (error) {
    console.error('[startAptitudeTest Error]', error);
    res.status(500).json({ message: error.message || 'Failed to start aptitude test' });
  }
};

/**
 * @desc Submit Aptitude Test answers, score server-side, unlock Round 2 if passed
 * @route POST /api/placement/:id/aptitude/submit
 */
export const submitAptitudeTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers = {}, timeSpentSeconds = 0 } = req.body;

    const drive = await findDrive({ _id: id });
    if (!drive) return res.status(404).json({ message: 'Placement drive not found' });
    if (!checkOwnership(drive, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this drive' });
    }

    const round1 = drive.rounds.round1_aptitude;

    // Concurrency guard: reject if already completed or locked
    if (round1.status === 'completed' && round1.passed) {
      return res.status(400).json({ message: 'Aptitude test has already been passed.' });
    }

    const fullQuestions = round1.questions || [];
    if (fullQuestions.length === 0) {
      return res.status(400).json({ message: 'No active aptitude test found. Please start the test first.' });
    }

    // Evaluate answers server-side
    const evaluation = evaluateAptitudeAnswers(fullQuestions, answers);

    round1.attempts += 1;
    round1.score = evaluation.score;
    round1.passed = evaluation.passed;
    round1.breakdown = evaluation.breakdown;
    round1.questions = evaluation.questions;
    round1.feedback = evaluation.feedback;
    round1.timeSpentSeconds = Number(timeSpentSeconds) || 0;
    round1.completedAt = new Date();

    if (evaluation.passed) {
      round1.status = 'completed';
      drive.currentRound = 2;
      // Unlock Round 2
      if (drive.rounds.round2_technical.status === 'locked') {
        drive.rounds.round2_technical.status = 'unlocked';
      }
    } else {
      if (round1.attempts >= round1.maxAttempts) {
        round1.status = 'failed';
        drive.status = 'failed';
      } else {
        round1.status = 'unlocked'; // Can retry
      }
    }

    await saveDrive(drive);

    res.json({
      message: evaluation.passed ? 'Congratulations! You passed the Aptitude Test.' : 'Aptitude test not cleared.',
      result: {
        score: evaluation.score,
        passed: evaluation.passed,
        passThreshold: round1.passThreshold,
        totalCorrect: evaluation.totalCorrect,
        totalQuestions: evaluation.totalQuestions,
        breakdown: evaluation.breakdown,
        attempts: round1.attempts,
        maxAttempts: round1.maxAttempts,
        feedback: evaluation.feedback,
        questions: evaluation.questions,
      },
      drive,
    });
  } catch (error) {
    console.error('[submitAptitudeTest Error]', error);
    res.status(500).json({ message: error.message || 'Failed to submit aptitude test' });
  }
};

// =========================================================================
// ROUND 2: TECHNICAL INTERVIEW INTEGRATION
// =========================================================================

/**
 * @desc Start Round 2 Technical Interview (reuses existing interview engine)
 * @route POST /api/placement/:id/technical/start
 */
export const startTechnicalRound = async (req, res) => {
  try {
    const { id } = req.params;
    const { difficulty = 'mid' } = req.body;

    const drive = await findDrive({ _id: id });
    if (!drive) return res.status(404).json({ message: 'Placement drive not found' });
    if (!checkOwnership(drive, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this drive' });
    }

    // SERVER-SIDE ROUND UNLOCK CHECK: Round 1 must be passed
    if (!drive.rounds.round1_aptitude.passed) {
      return res.status(400).json({
        message: 'Round 1 (Aptitude Test) must be successfully passed before unlocking Round 2 (Technical Interview).',
      });
    }

    const round2 = drive.rounds.round2_technical;
    if (round2.attempts >= round2.maxAttempts && !round2.passed) {
      return res.status(400).json({
        message: `Maximum retry limit of ${round2.maxAttempts} attempts reached for Technical Interview.`,
      });
    }

    const targetRole = drive.targetRole || req.user.targetRole || 'Full Stack Engineer';
    const sessionId = new mongoose.Types.ObjectId().toString();
    const userId = req.user._id || req.user.id;

    // 1. Create linked Session record
    let session = null;
    if (mongoose.connection.readyState === 1) {
      try {
        session = await Session.create({
          _id: sessionId,
          user: userId,
          targetRole,
          interviewType: 'technical',
          difficulty,
          totalQuestions: 5,
          status: 'in_progress',
          focusTopic: 'Placement Drive Technical Assessment',
        });
      } catch (e) {
        console.log('[Technical Session DB Notice]', e.message);
      }
    }

    if (!session) {
      session = {
        _id: sessionId,
        id: sessionId,
        user: userId,
        targetRole,
        interviewType: 'technical',
        difficulty,
        totalQuestions: 5,
        status: 'in_progress',
        focusTopic: 'Placement Drive Technical Assessment',
        createdAt: new Date(),
      };
    }
    memorySessions.push(session);

    // 2. Generate questions via existing LLM service
    const prompt = buildQuestionGenerationPrompt({
      targetRole,
      interviewType: 'technical',
      difficulty,
      count: 5,
      focusTopic: 'Placement Drive Core Engineering & Architecture',
    });

    let rawQuestions = [];
    try {
      const llmResult = await generateLLMJson(prompt, 'You are an expert technical interview question generator.');
      rawQuestions = Array.isArray(llmResult.questions) ? llmResult.questions : [];
    } catch (llmErr) {
      console.warn('[Technical LLM Warning]', llmErr.message);
    }

    if (!rawQuestions || rawQuestions.length === 0) {
      rawQuestions = [
        {
          questionNumber: 1,
          questionText: `Explain how you design scalable backend architectures and manage database concurrency in ${targetRole} systems.`,
          category: 'System Architecture',
          expectedKeyPoints: ['Horizontal scaling', 'Connection pooling', 'Transaction isolation & ACID'],
          hints: ['Discuss microservices vs monolithic trade-offs.'],
        },
        {
          questionNumber: 2,
          questionText: 'How do you optimize asynchronous event loops, API latency, and caching strategies under heavy loads?',
          category: 'Performance Engineering',
          expectedKeyPoints: ['Event loop non-blocking I/O', 'Redis / Memcached caching', 'Database indexing'],
          hints: ['Detail real-world metrics and benchmarks.'],
        },
        {
          questionNumber: 3,
          questionText: 'Describe how you handle state synchronization, race conditions, and error recovery across distributed services.',
          category: 'Distributed Systems',
          expectedKeyPoints: ['Idempotency keys', 'Eventual consistency', 'Dead-letter queues'],
          hints: ['Focus on resilience patterns like circuit breakers.'],
        },
        {
          questionNumber: 4,
          questionText: 'What strategies do you employ for comprehensive test automation, CI/CD pipelines, and zero-downtime deployments?',
          category: 'DevOps & Quality',
          expectedKeyPoints: ['Unit/Integration/E2E test pyramid', 'Blue-Green / Canary releases', 'Rollback strategies'],
          hints: ['Emphasize release confidence.'],
        },
        {
          questionNumber: 5,
          questionText: 'Walk through a complex technical bug or production outage you diagnosed and resolved.',
          category: 'Debugging & Reliability',
          expectedKeyPoints: ['Root cause analysis', 'Telemetry & APM logs', 'Preventive post-mortem actions'],
          hints: ['Use the STAR methodology.'],
        },
      ];
    }

    // Save Questions to DB/memory
    const questionsToSave = rawQuestions.map((q, idx) => {
      const qId = new mongoose.Types.ObjectId().toString();
      return {
        _id: qId,
        id: qId,
        session: sessionId,
        questionNumber: q.questionNumber || idx + 1,
        questionText: q.questionText,
        category: q.category || 'Technical',
        expectedKeyPoints: q.expectedKeyPoints || [],
        hints: q.hints || [],
      };
    });

    if (mongoose.connection.readyState === 1) {
      try {
        await Question.insertMany(questionsToSave);
      } catch (e) {
        console.log('[Question insert fallback]', e.message);
      }
    }
    questionsToSave.forEach((q) => memoryQuestions.push(q));

    // Update drive with linked session
    round2.sessionId = sessionId;
    round2.status = 'in_progress';
    await saveDrive(drive);

    res.json({
      message: 'Technical round session initialized',
      sessionId,
      session,
      questions: questionsToSave,
      drive,
    });
  } catch (error) {
    console.error('[startTechnicalRound Error]', error);
    res.status(500).json({ message: error.message || 'Failed to start technical round' });
  }
};

/**
 * @desc Sync completed interview session score with Round 2 Technical assessment
 * @route POST /api/placement/:id/technical/sync
 */
export const syncTechnicalRound = async (req, res) => {
  try {
    const { id } = req.params;
    const drive = await findDrive({ _id: id });
    if (!drive) return res.status(404).json({ message: 'Placement drive not found' });
    if (!checkOwnership(drive, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this drive' });
    }

    const round2 = drive.rounds.round2_technical;
    if (!round2.sessionId) {
      return res.status(400).json({ message: 'No linked technical session found. Start Round 2 first.' });
    }

    // Lookup session
    let session = null;
    if (mongoose.connection.readyState === 1) {
      try {
        session = await Session.findById(round2.sessionId);
      } catch (e) {}
    }
    if (!session) {
      session = memorySessions.find((s) => String(s._id) === String(round2.sessionId) || String(s.id) === String(round2.sessionId));
    }

    if (!session) {
      return res.status(404).json({ message: 'Linked technical interview session not found.' });
    }

    // Convert session score (1-10 or 0-100) to 0-100 scale
    let score = Number(session.overallScore) || 0;
    if (score <= 10 && score > 0) {
      score = Math.round(score * 10);
    }

    const passed = score >= round2.passThreshold;
    round2.attempts += 1;
    round2.score = score;
    round2.passed = passed;
    round2.categoryBreakdown = session.categoryBreakdown || [];
    round2.completedAt = new Date();

    if (passed) {
      round2.status = 'completed';
      drive.currentRound = 3;
      if (drive.rounds.round3_gd.status === 'locked') {
        drive.rounds.round3_gd.status = 'unlocked';
      }
    } else {
      if (round2.attempts >= round2.maxAttempts) {
        round2.status = 'failed';
        drive.status = 'failed';
      } else {
        round2.status = 'unlocked';
      }
    }

    await saveDrive(drive);

    res.json({
      message: passed ? 'Technical Interview passed!' : 'Technical Interview did not meet 60% cutoff.',
      passed,
      score,
      drive,
    });
  } catch (error) {
    console.error('[syncTechnicalRound Error]', error);
    res.status(500).json({ message: error.message || 'Failed to sync technical round' });
  }
};

// =========================================================================
// ROUND 3: GROUP DISCUSSION (GD) SIMULATION
// =========================================================================

/**
 * @desc Start Round 3 Group Discussion simulation
 * @route POST /api/placement/:id/gd/start
 */
export const startGDRound = async (req, res) => {
  try {
    const { id } = req.params;
    const { topicIndex = 0 } = req.body;

    const drive = await findDrive({ _id: id });
    if (!drive) return res.status(404).json({ message: 'Placement drive not found' });
    if (!checkOwnership(drive, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this drive' });
    }

    // SERVER-SIDE UNLOCK CHECK: Round 2 must be passed
    if (!drive.rounds.round2_technical.passed) {
      return res.status(400).json({
        message: 'Round 2 (Technical Interview) must be successfully passed before unlocking Round 3 (Group Discussion).',
      });
    }

    const round3 = drive.rounds.round3_gd;
    if (round3.attempts >= round3.maxAttempts && !round3.passed) {
      return res.status(400).json({
        message: `Maximum retry limit of ${round3.maxAttempts} attempts reached for Group Discussion.`,
      });
    }

    const initialGD = initializeGDRound(topicIndex);

    round3.status = 'in_progress';
    round3.topic = initialGD.topic;
    round3.discussionContext = initialGD.discussionContext;
    round3.transcript = initialGD.transcript;

    await saveDrive(drive);

    res.json({
      message: 'Group discussion initiated',
      topic: initialGD.topic,
      discussionContext: initialGD.discussionContext,
      transcript: initialGD.transcript,
      drive,
    });
  } catch (error) {
    console.error('[startGDRound Error]', error);
    res.status(500).json({ message: error.message || 'Failed to start GD round' });
  }
};

/**
 * @desc Add candidate message and generate AI peer responses
 * @route POST /api/placement/:id/gd/message
 */
export const sendGDMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message text is required.' });
    }

    const drive = await findDrive({ _id: id });
    if (!drive) return res.status(404).json({ message: 'Placement drive not found' });
    if (!checkOwnership(drive, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this drive' });
    }

    const round3 = drive.rounds.round3_gd;
    const candidateMsg = {
      speaker: `${req.user.name || 'Candidate'} (You)`,
      role: 'candidate',
      text: message.trim(),
      timestamp: new Date(),
    };

    round3.transcript.push(candidateMsg);

    // Generate AI peer and moderator responses
    const peerResponses = await generatePeerResponses(
      candidateMsg.text,
      round3.transcript,
      round3.topic
    );

    peerResponses.forEach((m) => round3.transcript.push(m));
    await saveDrive(drive);

    res.json({
      candidateMessage: candidateMsg,
      peerResponses,
      transcript: round3.transcript,
    });
  } catch (error) {
    console.error('[sendGDMessage Error]', error);
    res.status(500).json({ message: error.message || 'Failed to post GD message' });
  }
};

/**
 * @desc Complete & evaluate Group Discussion performance across rubrics
 * @route POST /api/placement/:id/gd/evaluate
 */
export const evaluateGDRound = async (req, res) => {
  try {
    const { id } = req.params;
    const drive = await findDrive({ _id: id });
    if (!drive) return res.status(404).json({ message: 'Placement drive not found' });
    if (!checkOwnership(drive, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this drive' });
    }

    const round3 = drive.rounds.round3_gd;
    const evaluation = await evaluateGDPerformance(round3.transcript, round3.topic);

    round3.attempts += 1;
    round3.score = evaluation.score;
    round3.passed = evaluation.passed;
    round3.rubrics = evaluation.rubrics;
    round3.feedback = evaluation.feedback;
    round3.completedAt = new Date();

    if (evaluation.passed) {
      round3.status = 'completed';
      drive.currentRound = 4;
      if (drive.rounds.round4_resume.status === 'locked') {
        drive.rounds.round4_resume.status = 'unlocked';
      }
    } else {
      if (round3.attempts >= round3.maxAttempts) {
        round3.status = 'failed';
        drive.status = 'failed';
      } else {
        round3.status = 'unlocked';
      }
    }

    await saveDrive(drive);

    res.json({
      message: evaluation.passed ? 'Group Discussion passed!' : 'Group Discussion communication cutoff not met.',
      evaluation,
      drive,
    });
  } catch (error) {
    console.error('[evaluateGDRound Error]', error);
    res.status(500).json({ message: error.message || 'Failed to evaluate GD' });
  }
};

// =========================================================================
// ROUND 4: RESUME-BASED INTERVIEW INTEGRATION
// =========================================================================

/**
 * @desc Start Round 4 Resume-based interview (extracts candidate projects/skills)
 * @route POST /api/placement/:id/resume-round/start
 */
export const startResumeRound = async (req, res) => {
  try {
    const { id } = req.params;
    const { resumeId } = req.body;

    const drive = await findDrive({ _id: id });
    if (!drive) return res.status(404).json({ message: 'Placement drive not found' });
    if (!checkOwnership(drive, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this drive' });
    }

    // SERVER-SIDE UNLOCK CHECK: Round 3 must be passed
    if (!drive.rounds.round3_gd.passed) {
      return res.status(400).json({
        message: 'Round 3 (Group Discussion) must be successfully passed before unlocking Round 4 (Resume-Based Interview).',
      });
    }

    const round4 = drive.rounds.round4_resume;
    if (round4.attempts >= round4.maxAttempts && !round4.passed) {
      return res.status(400).json({
        message: `Maximum retry limit of ${round4.maxAttempts} attempts reached for Resume-Based Interview.`,
      });
    }

    const userId = req.user._id || req.user.id;

    // Fetch candidate resume
    let targetResume = null;
    if (resumeId && mongoose.Types.ObjectId.isValid(resumeId)) {
      try {
        targetResume = await Resume.findById(resumeId);
      } catch (e) {}
    }
    if (!targetResume) {
      // Find latest resume for user
      if (mongoose.connection.readyState === 1) {
        try {
          targetResume = await Resume.findOne({ user: userId }).sort({ createdAt: -1 });
        } catch (e) {}
      }
    }
    if (!targetResume) {
      targetResume = memoryResumes.find((r) => String(r.user) === String(userId));
    }

    const parsedData = targetResume?.parsedData || {
      skills: ['JavaScript', 'React', 'Node.js', 'Express', 'MongoDB'],
      projects: [{ name: 'Full Stack Web Platform', description: 'Interactive application with REST API' }],
      experience: [{ title: 'Software Engineering Project', company: 'Academic / Internship' }],
    };

    const targetRole = drive.targetRole || targetResume?.parsedData?.targetRole || 'Full Stack Engineer';
    const sessionId = new mongoose.Types.ObjectId().toString();

    // Create session
    let session = null;
    if (mongoose.connection.readyState === 1) {
      try {
        session = await Session.create({
          _id: sessionId,
          user: userId,
          resume: targetResume?._id || null,
          targetRole,
          interviewType: 'technical',
          difficulty: 'mid',
          totalQuestions: 5,
          status: 'in_progress',
          focusTopic: 'Resume Deep Dive: Projects, Architecture & Personal Contributions',
        });
      } catch (e) {
        console.log('[Resume Session DB Notice]', e.message);
      }
    }

    if (!session) {
      session = {
        _id: sessionId,
        id: sessionId,
        user: userId,
        resume: targetResume?._id || null,
        targetRole,
        interviewType: 'technical',
        difficulty: 'mid',
        totalQuestions: 5,
        status: 'in_progress',
        focusTopic: 'Resume Deep Dive: Projects, Architecture & Personal Contributions',
        createdAt: new Date(),
      };
    }
    memorySessions.push(session);

    // Generate resume-focused questions
    const projectNames = (parsedData.projects || []).map((p) => p.name).join(', ') || 'your primary engineering project';
    const skillsList = (parsedData.skills || []).slice(0, 8).join(', ') || 'core stack technologies';

    const resumePrompt = `
You are an expert interviewer conducting a Round 4 Resume-Based Final Interview for the role of ${targetRole}.
Candidate's parsed resume projects: ${projectNames}
Candidate's listed skills: ${skillsList}

Generate exactly 5 deep, personalized interview questions probing their listed projects, architecture decisions, trade-offs, and internship/academic achievements.

Format strictly as JSON:
{
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "...",
      "category": "Project Architecture",
      "expectedKeyPoints": ["...", "..."],
      "hints": ["..."]
    }
  ]
}
`;

    let rawQuestions = [];
    try {
      const llmResult = await generateLLMJson(resumePrompt, 'You are an executive hiring interviewer.');
      rawQuestions = Array.isArray(llmResult.questions) ? llmResult.questions : [];
    } catch (llmErr) {
      console.warn('[Resume LLM Warning]', llmErr.message);
    }

    if (!rawQuestions || rawQuestions.length === 0) {
      const primaryProject = parsedData.projects?.[0]?.name || 'your major project';
      rawQuestions = [
        {
          questionNumber: 1,
          questionText: `On your resume, you highlighted "${primaryProject}". Walk me through the architecture and why you selected your tech stack over alternatives.`,
          category: 'Project Architecture',
          expectedKeyPoints: ['System overview', 'Technology selection rationale', 'Personal engineering contribution'],
          hints: ['Detail database schema and data flow.'],
        },
        {
          questionNumber: 2,
          questionText: `What was the most challenging technical obstacle or bug you encountered in "${primaryProject}", and how did you resolve it?`,
          category: 'Problem Solving & Resilience',
          expectedKeyPoints: ['Obstacle diagnosis', 'Root cause', 'Resolution steps & validation'],
          hints: ['Highlight debugging tools or Profiling.'],
        },
        {
          questionNumber: 3,
          questionText: `How did you handle security, authentication, and user data privacy across the projects listed on your resume?`,
          category: 'Security & Quality',
          expectedKeyPoints: ['JWT/Session security', 'Input validation', 'Sanitization & OWASP defense'],
          hints: ['Mention CORS, encryption, and token handling.'],
        },
        {
          questionNumber: 4,
          questionText: `Given your skills in ${skillsList}, how do you evaluate performance bottlenecks when scaling APIs to thousands of concurrent users?`,
          category: 'Scalability & Engineering Depth',
          expectedKeyPoints: ['Query optimization', 'Indexing', 'Caching layer and async workers'],
          hints: ['Use quantitative benchmarks.'],
        },
        {
          questionNumber: 5,
          questionText: 'Looking back at the projects on your resume, if you had to rebuild one from scratch today, what architectural decisions would you change?',
          category: 'Reflection & Engineering Maturity',
          expectedKeyPoints: ['Architectural trade-offs', 'Lessons learned', 'Modern best practices'],
          hints: ['Demonstrate critical thinking and continuous learning.'],
        },
      ];
    }

    const questionsToSave = rawQuestions.map((q, idx) => {
      const qId = new mongoose.Types.ObjectId().toString();
      return {
        _id: qId,
        id: qId,
        session: sessionId,
        questionNumber: q.questionNumber || idx + 1,
        questionText: q.questionText,
        category: q.category || 'Resume Assessment',
        expectedKeyPoints: q.expectedKeyPoints || [],
        hints: q.hints || [],
      };
    });

    if (mongoose.connection.readyState === 1) {
      try {
        await Question.insertMany(questionsToSave);
      } catch (e) {}
    }
    questionsToSave.forEach((q) => memoryQuestions.push(q));

    round4.sessionId = sessionId;
    round4.resumeId = targetResume?._id || null;
    round4.status = 'in_progress';
    await saveDrive(drive);

    res.json({
      message: 'Resume-based interview session initiated',
      sessionId,
      session,
      resume: targetResume,
      questions: questionsToSave,
      drive,
    });
  } catch (error) {
    console.error('[startResumeRound Error]', error);
    res.status(500).json({ message: error.message || 'Failed to start resume round' });
  }
};

/**
 * @desc Sync completed interview session score with Round 4 Resume assessment
 * @route POST /api/placement/:id/resume-round/sync
 */
export const syncResumeRound = async (req, res) => {
  try {
    const { id } = req.params;
    const drive = await findDrive({ _id: id });
    if (!drive) return res.status(404).json({ message: 'Placement drive not found' });
    if (!checkOwnership(drive, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this drive' });
    }

    const round4 = drive.rounds.round4_resume;
    if (!round4.sessionId) {
      return res.status(400).json({ message: 'No linked resume interview session found. Start Round 4 first.' });
    }

    let session = null;
    if (mongoose.connection.readyState === 1) {
      try {
        session = await Session.findById(round4.sessionId);
      } catch (e) {}
    }
    if (!session) {
      session = memorySessions.find((s) => String(s._id) === String(round4.sessionId) || String(s.id) === String(round4.sessionId));
    }

    if (!session) {
      return res.status(404).json({ message: 'Linked resume session not found.' });
    }

    let score = Number(session.overallScore) || 0;
    if (score <= 10 && score > 0) {
      score = Math.round(score * 10);
    }

    const passed = score >= round4.passThreshold;
    round4.attempts += 1;
    round4.score = score;
    round4.passed = passed;
    round4.categoryBreakdown = session.categoryBreakdown || [];
    round4.completedAt = new Date();

    if (passed) {
      round4.status = 'completed';
      drive.currentRound = 5;
      drive.status = 'completed';

      // Compute final 4-round report
      await generateFinalReportHelper(drive);
    } else {
      if (round4.attempts >= round4.maxAttempts) {
        round4.status = 'failed';
        drive.status = 'failed';
      } else {
        round4.status = 'unlocked';
      }
    }

    await saveDrive(drive);

    res.json({
      message: passed ? 'Resume-Based Interview cleared!' : 'Resume Interview did not meet cutoff.',
      passed,
      score,
      drive,
    });
  } catch (error) {
    console.error('[syncResumeRound Error]', error);
    res.status(500).json({ message: error.message || 'Failed to sync resume round' });
  }
};

// =========================================================================
// FINAL 4-ROUND COMPREHENSIVE REPORT
// =========================================================================

/**
 * Helper to calculate aggregate weighted readiness score and compile final report
 */
const generateFinalReportHelper = async (drive) => {
  const r1 = drive.rounds.round1_aptitude.score || 0;
  const r2 = drive.rounds.round2_technical.score || 0;
  const r3 = drive.rounds.round3_gd.score || 0;
  const r4 = drive.rounds.round4_resume.score || 0;

  // Weighted formulation: Aptitude 20%, Technical 35%, GD 20%, Resume 25%
  const readinessScore = Math.round(r1 * 0.2 + r2 * 0.35 + r3 * 0.2 + r4 * 0.25);
  drive.overallScore = readinessScore;

  let verdict = 'IN_PROGRESS';
  let hiringRecommendation = '';
  let executiveSummary = '';

  const allPassed =
    drive.rounds.round1_aptitude.passed &&
    drive.rounds.round2_technical.passed &&
    drive.rounds.round3_gd.passed &&
    drive.rounds.round4_resume.passed;

  if (allPassed) {
    if (readinessScore >= 85) {
      verdict = 'SELECTED';
      hiringRecommendation = 'Strong Hire - Top Tier Candidate with elite technical depth and high communication agility.';
      executiveSummary = `The candidate demonstrated outstanding proficiency across all 4 stages of the placement drive. Scored exceptionally high in technical architecture (${r2}/100) and resume validation (${r4}/100). Ready for senior technical responsibilities and high-impact project ownership.`;
    } else if (readinessScore >= 65) {
      verdict = 'RECOMMENDED';
      hiringRecommendation = 'Hire - Solid Candidate meeting industry engineering benchmarks.';
      executiveSummary = `The candidate cleared all 4 rounds successfully with a composite readiness score of ${readinessScore}%. Showed reliable analytical abilities in Aptitude (${r1}/100), sound fundamentals in Technical (${r2}/100), collaborative presence in Group Discussion (${r3}/100), and credible hands-on experience in Resume-based questioning (${r4}/100).`;
    } else {
      verdict = 'RECOMMENDED';
      hiringRecommendation = 'Conditional Hire - Recommend targeted onboarding mentorship in core systems.';
      executiveSummary = `The candidate successfully met the passing thresholds across each round with an aggregate score of ${readinessScore}%. Recommended for placement with mentorship in advanced distributed concepts.`;
    }
  } else {
    verdict = drive.status === 'failed' ? 'FAILED' : 'NEEDS_REFINEMENT';
    hiringRecommendation = 'Did not clear all 4 rounds. Further practice recommended.';
    executiveSummary = `The candidate completed part of the placement drive with a current composite score of ${readinessScore}%. Certain rounds require further review before meeting placement benchmarks.`;
  }

  const topStrengths = [
    r1 >= 70 ? 'High quantitative precision & logical reasoning under strict time limits.' : 'Consistent problem-solving attitude in aptitude benchmarks.',
    r2 >= 70 ? 'Deep grasp of backend architecture, API resilience, and async runtimes.' : 'Clear structured answers during technical questioning.',
    r3 >= 70 ? 'Constructive collaborative voice and active listening in group discussion.' : 'Engaged participation with diverse team perspectives.',
    r4 >= 70 ? 'Comprehensive mastery of personal projects and architectural trade-offs.' : 'Familiarity with core tech stack components.',
  ];

  const areasForImprovement = [
    r1 < 75 ? 'Sharpen speed-math shortcuts and syllogism deduction strategies.' : 'Maintain practice on complex permutation-combination problems.',
    r2 < 75 ? 'Elaborate on production failure modes, concurrency, and DB indexing.' : 'Include more live metric benchmarks during architecture discussions.',
    r3 < 75 ? 'Increase frequency of intervention and cite industry data in group discussions.' : 'Take proactive leadership roles in steering discussion consensus.',
    r4 < 75 ? 'Quantify business impacts and latency reductions in resume project explanations.' : 'Deepen familiarity with edge-case scalability in listed projects.',
  ];

  drive.finalReport = {
    verdict,
    readinessScore,
    hiringRecommendation,
    executiveSummary,
    roundSummary: [
      {
        roundName: 'Round 1: Aptitude Test',
        score: r1,
        status: drive.rounds.round1_aptitude.status,
        passed: drive.rounds.round1_aptitude.passed,
      },
      {
        roundName: 'Round 2: Technical Interview',
        score: r2,
        status: drive.rounds.round2_technical.status,
        passed: drive.rounds.round2_technical.passed,
      },
      {
        roundName: 'Round 3: Group Discussion',
        score: r3,
        status: drive.rounds.round3_gd.status,
        passed: drive.rounds.round3_gd.passed,
      },
      {
        roundName: 'Round 4: Resume-Based Interview',
        score: r4,
        status: drive.rounds.round4_resume.status,
        passed: drive.rounds.round4_resume.passed,
      },
    ],
    topStrengths,
    areasForImprovement,
    generatedAt: new Date(),
  };

  return drive.finalReport;
};

/**
 * @desc Explicitly compile / refresh Final Report
 * @route GET /api/placement/:id/report
 */
export const getFinalReport = async (req, res) => {
  try {
    const { id } = req.params;
    const drive = await findDrive({ _id: id });
    if (!drive) return res.status(404).json({ message: 'Placement drive not found' });
    if (!checkOwnership(drive, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this drive' });
    }

    await generateFinalReportHelper(drive);
    await saveDrive(drive);

    res.json({
      finalReport: drive.finalReport,
      overallScore: drive.overallScore,
      drive,
    });
  } catch (error) {
    console.error('[getFinalReport Error]', error);
    res.status(500).json({ message: error.message || 'Failed to generate final report' });
  }
};
