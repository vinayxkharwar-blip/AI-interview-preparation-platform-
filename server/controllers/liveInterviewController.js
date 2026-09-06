import { AccessToken } from 'livekit-server-sdk';
import Session from '../models/Session.js';
import Question from '../models/Question.js';
import Answer from '../models/Answer.js';
import Feedback from '../models/Feedback.js';
import ImprovementPlan from '../models/ImprovementPlan.js';
import Resume from '../models/Resume.js';
import { memorySessions, memoryQuestions, memoryAnswers, memoryFeedback, memoryImprovementPlans } from './sessionController.js';
import { generateLLMJson } from '../services/llmService.js';
import { buildImprovementPlanPrompt } from '../prompts/improvementPrompts.js';
import { buildLiveInterviewTurnPrompt } from '../prompts/liveInterviewPrompts.js';
import mongoose from 'mongoose';
import { checkOwnership } from '../utils/authz.js';
import { synthesizeGeminiSpeech } from '../services/ttsService.js';

// @desc Generate LiveKit WebRTC Access Token for live session
// @route POST /api/sessions/:id/live/token
export const createLiveKitToken = async (req, res) => {
  try {
    const { id: sessionId } = req.params;

    let session = null;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(sessionId)) {
      try {
        session = await Session.findById(sessionId);
      } catch (e) {
        console.log('[LiveKit Token DB Notice]', e.message);
      }
    }
    if (!session) {
      session = memorySessions.find((s) => String(s._id) === String(sessionId) || String(s.id) === String(sessionId));
    }
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (!checkOwnership(session, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this session' });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    const isSecretPlaceholder = Boolean(apiSecret && (apiSecret.includes('••••') || apiSecret === 'your_livekit_secret'));
    const isLiveKitConfigured = Boolean(apiKey && apiSecret && !isSecretPlaceholder && apiKey !== 'your_livekit_api_key' && livekitUrl);

    console.log(`[LiveKit Token] Session: ${sessionId} | Configured: ${isLiveKitConfigured} | URL: ${livekitUrl || 'missing'}`);

    if (isSecretPlaceholder) {
      console.warn(`[LiveKit Token Warning] LIVEKIT_API_SECRET in .env contains placeholder bullet characters (••••). Replace with your actual LiveKit API Secret from LiveKit Cloud Dashboard.`);
      return res.json({
        isFallback: true,
        roomName: `session_${sessionId}`,
        participantName: req.user?.name || 'Candidate',
        message: 'LIVEKIT_API_SECRET in .env contains bullet placeholders. Using local media stream fallback mode.',
      });
    }

    if (!isLiveKitConfigured) {
      return res.json({
        isFallback: true,
        roomName: `session_${sessionId}`,
        participantName: req.user?.name || 'Candidate',
        message: 'LiveKit server keys or URL not configured in .env. Using local media stream fallback mode.',
      });
    }

    const roomName = `session_${sessionId}`;
    const participantName = req.user?.name || `user_${req.user?._id || 'candidate'}`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName,
      ttl: '2h',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    res.json({
      isFallback: false,
      token,
      url: livekitUrl,
      roomName,
      participantName,
    });
  } catch (error) {
    console.error('[LiveKit Token Error] Failed to create LiveKit token:', error.stack || error.message);
    res.json({
      isFallback: true,
      roomName: `session_${req.params.id}`,
      message: 'LiveKit server token fallback mode activated: ' + error.message,
    });
  }
};

// @desc Handle conversational turn with AI Interviewer "Alex" — evaluates the candidate's
// current answer AND generates exactly ONE dynamic, personalized follow-up/next question.
// @route POST /api/sessions/:id/live/turn
export const handleLiveTurn = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const {
      userTranscript = '',
      currentQuestionIndex = 0,
      currentQuestionText = '',
      conversationHistory = [],
    } = req.body;

    console.log(`[LiveInterview Turn] Session: ${sessionId} | Turn #: ${currentQuestionIndex + 1}`);
    console.log(`[LiveInterview Turn] User Transcript: "${(userTranscript || '').substring(0, 80)}..."`);

    // Fetch session (and resume for personalization context)
    let session = null;
    let questions = [];
    let parsedResume = null;

    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(sessionId)) {
      try {
        session = await Session.findById(sessionId).populate('resume');
        questions = await Question.find({ session: sessionId }).sort({ questionNumber: 1 });
      } catch (e) {
        console.log('[LiveInterview Turn DB Notice]', e.message);
      }
    }

    if (!session) {
      session = memorySessions.find((s) => String(s._id) === String(sessionId) || String(s.id) === String(sessionId));
    }
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (!checkOwnership(session, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this session' });
    }
    if (questions.length === 0) {
      questions = memoryQuestions.filter((q) => String(q.session) === String(sessionId));
    }

    // Resolve resume context gracefully: populated doc, memory session ref, or absent entirely.
    if (session?.resume && typeof session.resume === 'object' && session.resume.parsedData) {
      parsedResume = session.resume.parsedData;
    } else if (session?.resume && mongoose.Types.ObjectId.isValid(session.resume)) {
      try {
        const resumeDoc = await Resume.findById(session.resume);
        if (resumeDoc) parsedResume = resumeDoc.parsedData;
      } catch (e) {
        console.log('[LiveInterview Turn Resume Notice]', e.message);
      }
    }

    const targetRole = session?.targetRole || 'Software Engineer';
    const interviewType = session?.interviewType || 'technical';
    const difficulty = session?.difficulty || 'mid';
    const totalQuestions = Number(session?.totalQuestions) || 5;
    const questionsAskedSoFar = currentQuestionIndex + 1;

    // The question the candidate just answered: prefer explicit text sent from frontend
    // (dynamic questions aren't stored in the pre-generated Question list), fall back to
    // the pre-generated list for question #1, then a safe generic opener.
    const currentQuestion = currentQuestionText
      ? { questionText: currentQuestionText }
      : (questions[currentQuestionIndex] || {
        questionText: 'Tell me about yourself and your technical background.',
        category: 'General',
      });

    const previousQuestions = conversationHistory.map((t) => t.questionText).filter(Boolean);
    const previousAnswers = conversationHistory.map((t) => t.userTranscript).filter(Boolean);

    const prompt = buildLiveInterviewTurnPrompt({
      parsedResume,
      targetRole,
      company: session?.company,
      jobDescription: session?.jobDescription,
      interviewType,
      difficulty,
      requiredSkills: parsedResume?.skills,
      previousQuestions,
      previousAnswers,
      currentQuestionText: currentQuestion.questionText,
      currentAnswer: userTranscript,
      questionsAskedSoFar,
      totalQuestions,
    });

    let turnResult = null;
    try {
      turnResult = await generateLLMJson(prompt, 'You are Alex, a warm but rigorous live AI voice interviewer. Return only valid JSON.');
    } catch (llmErr) {
      console.error('[LiveInterview Turn LLM Error]', llmErr.message);
    }

    if (!turnResult || !turnResult.interviewerLine) {
      // High quality fallback response logic if LLM offline / malformed response
      const wordCount = (userTranscript || '').split(/\s+/).filter(Boolean).length;
      let decision = 'next_question';
      let nextQuestionText = '';
      let line = '';
      const isFinal = questionsAskedSoFar >= totalQuestions;

      if (!userTranscript || wordCount === 0) {
        decision = 'followup';
        line = `I didn't quite catch that — could you repeat or expand on your answer to: "${currentQuestion.questionText}"?`;
        nextQuestionText = currentQuestion.questionText;
      } else if (wordCount < 10) {
        decision = 'followup';
        line = `Thanks for starting off! Could you elaborate a bit more on that, especially around ${currentQuestion.category || 'the core technical details'}?`;
        nextQuestionText = currentQuestion.questionText;
      } else if (isFinal) {
        decision = 'complete';
        line = `Great, thank you for your thoughtful answers! That wraps up our questions for this session — I'm putting together your performance review now.`;
        nextQuestionText = '';
      } else {
        decision = 'next_question';
        nextQuestionText = `Building on your experience with ${targetRole}, can you walk me through a recent technical challenge you solved and the trade-offs you considered?`;
        line = `Great explanation! Let's move to the next question: "${nextQuestionText}"`;
      }

      turnResult = {
        interviewerLine: line,
        nextQuestionText,
        keyPointsCovered: [],
        decision,
        turnScore: wordCount === 0 ? 2 : wordCount < 10 ? 4 : wordCount > 20 ? 8 : 6,
      };
    }

    // Normalize/guard fields so the frontend never receives an unusable shape.
    const decision = ['followup', 'next_question', 'complete'].includes(turnResult.decision)
      ? turnResult.decision
      : (questionsAskedSoFar >= totalQuestions ? 'complete' : 'next_question');

    const safeResult = {
      interviewerLine: turnResult.interviewerLine || 'Thank you for that answer. Let\'s continue.',
      questionText: currentQuestion.questionText,
      nextQuestionText: decision === 'complete' ? '' : (turnResult.nextQuestionText || ''),
      keyPointsCovered: Array.isArray(turnResult.keyPointsCovered) ? turnResult.keyPointsCovered : [],
      strengths: Array.isArray(turnResult.strengths) ? turnResult.strengths : [],
      weaknesses: Array.isArray(turnResult.weaknesses) ? turnResult.weaknesses : [],
      category: turnResult.category || currentQuestion.category || 'General',
      decision,
      turnScore: typeof turnResult.turnScore === 'number' ? turnResult.turnScore : 6,
      totalQuestions,
      questionsAskedSoFar,
    };

    console.log(`[LiveInterview Turn Result] Decision: ${safeResult.decision} | Line: "${safeResult.interviewerLine.substring(0, 60)}..."`);

    res.json(safeResult);
  } catch (error) {
    console.error('[LiveInterview Turn Error]', error);
    res.status(500).json({ message: error.message || 'Failed to process live interview turn.' });
  }
};

// @desc Complete live interview session & synthesize performance report
// @route POST /api/sessions/:id/live/complete
export const completeLiveSession = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const { liveTurns = [] } = req.body;

    console.log(`[LiveInterview Complete] Completing session ${sessionId} with ${liveTurns.length} live turns.`);

    let session = null;
    let questions = [];

    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(sessionId)) {
      try {
        session = await Session.findById(sessionId);
        questions = await Question.find({ session: sessionId });
      } catch (e) {
        console.log('[LiveInterview Complete DB Notice]', e.message);
      }
    }

    if (!session) {
      session = memorySessions.find((s) => String(s._id) === String(sessionId) || String(s.id) === String(sessionId));
    }
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (!checkOwnership(session, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this session' });
    }
    if (questions.length === 0) {
      questions = memoryQuestions.filter((q) => String(q.session) === String(sessionId));
    }

    // Process and store answers & feedback from live turns
    let totalScoreSum = 0;
    let turnCount = 0;

    for (let i = 0; i < liveTurns.length; i++) {
      const turn = liveTurns[i];
      const matchingQ = questions[turn.questionIndex] || questions[i] || { _id: new mongoose.Types.ObjectId().toString(), category: 'General' };
      const qId = matchingQ._id || matchingQ.id;

      const score = turn.turnScore || 8;
      totalScoreSum += score;
      turnCount++;

      const ansId = new mongoose.Types.ObjectId().toString();
      const fbId = new mongoose.Types.ObjectId().toString();

      const answerDoc = {
        _id: ansId,
        session: sessionId,
        question: qId,
        transcript: turn.userTranscript || 'Live audio turn completed',
        answerType: 'audio',
        audioUrl: '',
        user: req.user?._id,
      };

      const feedbackDoc = {
        _id: fbId,
        session: sessionId,
        answer: ansId,
        score,
        strengths: turn.keyPointsCovered?.length ? turn.keyPointsCovered : ['Active live verbal communication'],
        weaknesses: turn.keyPointsCovered?.length < (matchingQ.expectedKeyPoints?.length || 2) ? ['Could expand on advanced edge cases'] : [],
        suggestion: 'Focus on structured STAR framework during live verbal delivery.',
        category: matchingQ.category || 'Technical',
        user: req.user?._id,
      };

      if (mongoose.connection.readyState === 1) {
        try {
          await Answer.create(answerDoc);
          await Feedback.create(feedbackDoc);
        } catch (e) {
          console.log('[Live DB Save Notice]', e.message);
        }
      }
      memoryAnswers.push(answerDoc);
      memoryFeedback.push(feedbackDoc);
    }

    const overallScore = Number((totalScoreSum / Math.max(turnCount, 1)).toFixed(1));

    const categoryBreakdown = [
      { category: 'Live Communication', score: overallScore },
      { category: 'Technical Depth', score: Math.min(10, overallScore + 0.5) },
    ];

    if (session) {
      session.status = 'completed';
      session.overallScore = overallScore;
      session.categoryBreakdown = categoryBreakdown;
      if (typeof session.save === 'function') {
        await session.save();
      }
    }

    // Synthesize AI Improvement Plan
    const planPrompt = buildImprovementPlanPrompt({
      targetRole: session ? session.targetRole : 'Software Engineer',
      interviewType: session ? session.interviewType : 'technical',
      qnAHistory: liveTurns.map((t) => ({
        question: questions[t.questionIndex]?.questionText || 'Live Question',
        category: questions[t.questionIndex]?.category || 'General',
        answer: t.userTranscript,
        score: t.turnScore || 8,
        strengths: t.keyPointsCovered || [],
        weaknesses: [],
        suggestion: 'Continue practicing concise live responses.',
      })),
    });

    let planDoc = null;
    try {
      const planLLMResult = await generateLLMJson(planPrompt, 'You generate actionable improvement plans.');
      planDoc = await ImprovementPlan.create({
        session: sessionId,
        user: req.user?._id,
        focusAreas: planLLMResult.focusAreas || [],
        overallSummary: planLLMResult.overallSummary || 'Great job completing your live AI video-call interview!',
      });
    } catch (e) {
      planDoc = {
        _id: 'plan-live-' + Date.now(),
        session: sessionId,
        user: req.user?._id,
        focusAreas: [
          { area: 'Live Answer Structuring', recommendation: 'Use bulleted main points before elaborating.' },
          { area: 'Technical Terminology', recommendation: 'Clearly state system architecture trade-offs.' },
        ],
        overallSummary: 'Strong performance in live conversational video mode!',
      };
      memoryImprovementPlans.push(planDoc);
    }

    res.json({
      message: 'Live video interview completed successfully!',
      overallScore,
      categoryBreakdown,
      improvementPlan: planDoc,
    });
  } catch (error) {
    console.error('[LiveInterview Complete Error]', error);
    res.status(500).json({ message: error.message || 'Failed to complete live interview session.' });
  }
};

// @desc Synthesize live speech audio using Gemini TTS
// @route POST /api/sessions/:id/live/tts
export const streamLiveTts = async (req, res) => {
  try {
    const { text, voice = 'Puck' } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Text is required for TTS synthesis.' });
    }

    const ttsResult = await synthesizeGeminiSpeech(text, voice);
    res.json({
      audioUrl: `data:audio/wav;base64,${ttsResult.audioBase64}`,
      mimeType: ttsResult.mimeType,
      voice: ttsResult.voiceName,
    });
  } catch (error) {
    console.warn('[LiveInterview TTS Fallback Notice]', error.message);
    res.status(200).json({
      isFallback: true,
      message: 'Gemini TTS unavailable, fallback to browser speech synthesis.',
    });
  }
};