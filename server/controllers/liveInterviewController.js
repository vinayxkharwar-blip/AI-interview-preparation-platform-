import { AccessToken } from 'livekit-server-sdk';
import Session from '../models/Session.js';
import Question from '../models/Question.js';
import Answer from '../models/Answer.js';
import Feedback from '../models/Feedback.js';
import ImprovementPlan from '../models/ImprovementPlan.js';
import { memorySessions, memoryQuestions, memoryAnswers, memoryFeedback, memoryImprovementPlans } from './sessionController.js';
import { generateLLMJson } from '../services/llmService.js';
import { buildImprovementPlanPrompt } from '../prompts/improvementPrompts.js';
import {
  isHeyGenConfigured,
  createHeyGenStream,
  submitHeyGenSdpAnswer,
  submitHeyGenIceCandidate,
  speakHeyGenStream,
  closeHeyGenStream,
} from '../services/heygenService.js';
import mongoose from 'mongoose';
import { checkOwnership } from '../utils/authz.js';

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

// @desc Handle conversational turn with AI Interviewer "Alex"
// @route POST /api/sessions/:id/live/turn
export const handleLiveTurn = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const { userTranscript = '', currentQuestionIndex = 0, conversationHistory = [] } = req.body;

    console.log(`[LiveInterview Turn] Session: ${sessionId} | Current Question Index: ${currentQuestionIndex}`);
    console.log(`[LiveInterview Turn] User Transcript: "${userTranscript.substring(0, 80)}..."`);

    // Fetch session and questions
    let session = null;
    let questions = [];

    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(sessionId)) {
      try {
        session = await Session.findById(sessionId);
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

    const currentQuestion = questions[currentQuestionIndex] || {
      questionText: 'Tell me about yourself and your technical background.',
      expectedKeyPoints: ['Technical stack', 'Recent projects', 'Role fit'],
      category: 'General',
    };

    const targetRole = session?.targetRole || 'Software Engineer';
    const interviewType = session?.interviewType || 'technical';

    // Construct LLM Prompt for AI Interviewer "Alex"
    const systemPrompt = `You are Alex, an expert, encouraging, yet rigorous technical interviewer conducting a live video-call interview for a ${targetRole} role (${interviewType} focus).
Your tone is professional, conversational, concise (2-4 sentences max per spoken line), and human-like.
Analyze the candidate's spoken response against the current question and its expected key concepts.

Current Question: "${currentQuestion.questionText}"
Expected Key Concepts: ${JSON.stringify(currentQuestion.expectedKeyPoints || [])}
Candidate Spoken Response: "${userTranscript || '[No audio response heard]'}"

Conversation History so far:
${JSON.stringify(conversationHistory.slice(-4))}

Formulate your spoken response as Alex.
Return your answer exclusively as a JSON object with this structure:
{
  "interviewerLine": "Your exact spoken response to the candidate as Alex.",
  "keyPointsCovered": ["List of expected key points the candidate successfully mentioned"],
  "decision": "followup" or "next_question" or "complete",
  "nextQuestionIndex": number (same index if decision is followup, index + 1 if decision is next_question),
  "turnScore": number between 1 and 10 evaluating this turn's response quality
}`;

    let turnResult = null;
    try {
      turnResult = await generateLLMJson(systemPrompt, 'You are Alex, a live AI video interviewer.');
    } catch (llmErr) {
      console.error('[LiveInterview Turn LLM Error]', llmErr.message);
    }

    if (!turnResult || !turnResult.interviewerLine) {
      // High quality fallback response logic if LLM offline
      const wordCount = (userTranscript || '').split(/\s+/).filter(Boolean).length;
      let decision = 'next_question';
      let nextIndex = currentQuestionIndex + 1;
      let line = '';

      if (wordCount < 10) {
        decision = 'followup';
        nextIndex = currentQuestionIndex;
        line = `Thanks for starting off! Could you elaborate a bit more on how you handled the core technical trade-offs in ${currentQuestion.category || 'this scenario'}?`;
      } else if (currentQuestionIndex >= questions.length - 1) {
        decision = 'complete';
        nextIndex = currentQuestionIndex;
        line = `Excellent insights! That covers all our primary discussion topics for this session. I'm wrapping up our call now so you can review your complete performance analysis.`;
      } else {
        const nextQ = questions[currentQuestionIndex + 1];
        line = `Great explanation! That addresses the key points clearly. Let's move on to the next question: "${nextQ ? nextQ.questionText : 'What is your approach to system architecture?'}"`;
      }

      turnResult = {
        interviewerLine: line,
        keyPointsCovered: currentQuestion.expectedKeyPoints ? currentQuestion.expectedKeyPoints.slice(0, 2) : [],
        decision,
        nextQuestionIndex: nextIndex,
        turnScore: wordCount > 20 ? 8 : 6,
      };
    }

    // Automatically trigger real-time lip-syncing on HeyGen avatar stream
    const { heygenSessionId } = req.body;
    if (heygenSessionId && turnResult?.interviewerLine) {
      try {
        await speakHeyGenStream(heygenSessionId, turnResult.interviewerLine, 'repeat', session?.heygenToken);
        turnResult.heygenSpeaking = true;
      } catch (heygenErr) {
        console.warn('[LiveInterview HeyGen Auto-Speak Warning]', heygenErr.message);
      }
    }

    console.log(`[LiveInterview Turn Result] Decision: ${turnResult.decision} | Line: "${turnResult.interviewerLine.substring(0, 60)}..."`);

    res.json(turnResult);
  } catch (error) {
    console.error('[LiveInterview Turn Error]', error);
    res.status(500).json({ message: error.message || 'Failed to process live interview turn.' });
  }
};

// ============================================================================
// HEYGEN STREAMING AVATAR API CONTROLLERS
// ============================================================================

// @desc Initialize HeyGen Real-Time WebRTC Avatar Stream Session
// @route POST /api/sessions/:id/live/heygen-stream
export const createHeyGenStreamSession = async (req, res) => {
  try {
    const { id: parentSessionId } = req.params;
    let session = null;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(parentSessionId)) {
      try {
        session = await Session.findById(parentSessionId);
      } catch (e) {
        console.log('[LiveInterview HeyGen Stream DB Notice]', e.message);
      }
    }
    if (!session) {
      session = memorySessions.find((s) => String(s._id) === String(parentSessionId) || String(s.id) === String(parentSessionId));
    }
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (!checkOwnership(session, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this session' });
    }

    if (!isHeyGenConfigured()) {
      return res.json({
        isFallback: true,
        message: 'HEYGEN_API_KEY is not configured in .env. Using high-performance animated visualizer mode.',
      });
    }

    const { avatarName, voiceId } = req.body || {};
    const streamData = await createHeyGenStream(avatarName, voiceId);

    if (streamData && streamData.sessionToken) {
      session.heygenToken = streamData.sessionToken;
      session.heygenSessionId = streamData.sessionId;
      if (typeof session.save === 'function') {
        try {
          await session.save();
        } catch (saveErr) {
          console.log('[LiveInterview HeyGen Token Save Notice]', saveErr.message);
        }
      }
    }

    res.json({
      isFallback: false,
      ...streamData,
    });
  } catch (error) {
    console.warn('[LiveInterview HeyGen Stream Notice]', error.message);
    res.json({
      isFallback: true,
      message: 'HeyGen WebRTC Avatar Stream fallback mode activated: ' + error.message,
    });
  }
};

// @desc Submit SDP Answer for HeyGen Stream Session
// @route POST /api/sessions/:id/live/heygen-sdp
export const sendHeyGenSdpAnswer = async (req, res) => {
  try {
    const { id: parentSessionId } = req.params;
    let session = null;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(parentSessionId)) {
      try {
        session = await Session.findById(parentSessionId);
      } catch (e) {
        console.log('[LiveInterview HeyGen SDP DB Notice]', e.message);
      }
    }
    if (!session) {
      session = memorySessions.find((s) => String(s._id) === String(parentSessionId) || String(s.id) === String(parentSessionId));
    }
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (!checkOwnership(session, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this session' });
    }

    // Note: req.body.sessionId is a HeyGen-specific WebRTC stream ID passed directly to HeyGen's API.
    const { sessionId, answer } = req.body;
    if (!sessionId || !answer) {
      return res.status(400).json({ message: 'sessionId and answer are required.' });
    }

    const result = await submitHeyGenSdpAnswer(sessionId, answer, session?.heygenToken);
    res.json(result);
  } catch (error) {
    console.error('[LiveInterview HeyGen SDP Error]', error.message);
    res.status(500).json({ message: 'Failed to submit SDP answer to HeyGen.' });
  }
};

// @desc Submit ICE Candidate for HeyGen Stream Session
// @route POST /api/sessions/:id/live/heygen-ice
export const sendHeyGenIceCandidate = async (req, res) => {
  try {
    const { id: parentSessionId } = req.params;
    let session = null;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(parentSessionId)) {
      try {
        session = await Session.findById(parentSessionId);
      } catch (e) {
        console.log('[LiveInterview HeyGen ICE DB Notice]', e.message);
      }
    }
    if (!session) {
      session = memorySessions.find((s) => String(s._id) === String(parentSessionId) || String(s.id) === String(parentSessionId));
    }
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (!checkOwnership(session, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this session' });
    }

    // Note: req.body.sessionId is a HeyGen-specific WebRTC stream ID passed directly to HeyGen's API.
    const { sessionId, candidate } = req.body;
    if (!sessionId || !candidate) {
      return res.status(400).json({ message: 'sessionId and candidate are required.' });
    }

    const result = await submitHeyGenIceCandidate(sessionId, candidate, session?.heygenToken);
    res.json(result);
  } catch (error) {
    console.error('[LiveInterview HeyGen ICE Error]', error.message);
    res.status(500).json({ message: 'Failed to submit ICE candidate to HeyGen.' });
  }
};

// @desc Submit Script Text to Speak on HeyGen Avatar Stream
// @route POST /api/sessions/:id/live/heygen-speak
export const speakHeyGenTurn = async (req, res) => {
  try {
    const { id: parentSessionId } = req.params;
    let session = null;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(parentSessionId)) {
      try {
        session = await Session.findById(parentSessionId);
      } catch (e) {
        console.log('[LiveInterview HeyGen Speak DB Notice]', e.message);
      }
    }
    if (!session) {
      session = memorySessions.find((s) => String(s._id) === String(parentSessionId) || String(s.id) === String(parentSessionId));
    }
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (!checkOwnership(session, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this session' });
    }

    // Note: req.body.sessionId is a HeyGen-specific WebRTC stream ID passed directly to HeyGen's API.
    const { sessionId, text, taskType } = req.body;
    if (!sessionId || !text) {
      return res.status(400).json({ message: 'sessionId and text are required.' });
    }

    const result = await speakHeyGenStream(sessionId, text, taskType, session?.heygenToken);
    res.json(result);
  } catch (error) {
    console.error('[LiveInterview HeyGen Speak Error]', error.message);
    res.status(500).json({ message: 'Failed to submit speak task to HeyGen avatar stream.' });
  }
};

// @desc Close HeyGen Stream Session
// @route POST /api/sessions/:id/live/heygen-stop
export const stopHeyGenStreamSession = async (req, res) => {
  try {
    const { id: parentSessionId } = req.params;
    let session = null;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(parentSessionId)) {
      try {
        session = await Session.findById(parentSessionId);
      } catch (e) {
        console.log('[LiveInterview HeyGen Stop DB Notice]', e.message);
      }
    }
    if (!session) {
      session = memorySessions.find((s) => String(s._id) === String(parentSessionId) || String(s.id) === String(parentSessionId));
    }
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (!checkOwnership(session, req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this session' });
    }

    // Note: req.body.sessionId is a HeyGen-specific WebRTC stream ID passed directly to HeyGen's API.
    const { sessionId } = req.body;
    if (sessionId) {
      await closeHeyGenStream(sessionId, session?.heygenToken);
    }
    res.json({ message: 'HeyGen avatar stream session stopped successfully.' });
  } catch (error) {
    console.warn('[LiveInterview HeyGen Stop Notice]', error.message);
    res.json({ message: 'HeyGen session stop notice.' });
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
