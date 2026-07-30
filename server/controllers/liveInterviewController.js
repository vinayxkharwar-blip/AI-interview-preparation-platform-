import { AccessToken } from 'livekit-server-sdk';
import Session from '../models/Session.js';
import Question from '../models/Question.js';
import Answer from '../models/Answer.js';
import Feedback from '../models/Feedback.js';
import ImprovementPlan from '../models/ImprovementPlan.js';
import { memorySessions, memoryQuestions, memoryAnswers, memoryFeedback, memoryImprovementPlans } from './sessionController.js';
import { generateLLMJson } from '../services/llmService.js';
import { buildImprovementPlanPrompt } from '../prompts/improvementPrompts.js';
import mongoose from 'mongoose';

// @desc Generate LiveKit WebRTC Access Token for live session
// @route POST /api/sessions/:id/live/token
export const createLiveKitToken = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    const isLiveKitConfigured = Boolean(apiKey && apiSecret && apiKey !== 'your_livekit_api_key' && apiSecret !== 'your_livekit_secret');

    console.log(`[LiveInterview] Token request for session ${sessionId} | LiveKit Configured: ${isLiveKitConfigured}`);

    if (!isLiveKitConfigured) {
      return res.json({
        isFallback: true,
        roomName: `session_${sessionId}`,
        participantName: req.user?.name || 'Candidate',
        message: 'LiveKit server keys not configured in .env. Using high-performance browser WebRTC media stream fallback mode.',
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
    console.error('[LiveInterview Token Error]', error);
    res.status(500).json({ message: 'Failed to generate live interview room token.' });
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

    console.log(`[LiveInterview Turn Result] Decision: ${turnResult.decision} | Line: "${turnResult.interviewerLine.substring(0, 60)}..."`);

    res.json(turnResult);
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

    if (session && typeof session.save === 'function') {
      session.status = 'completed';
      session.overallScore = overallScore;
      session.categoryBreakdown = categoryBreakdown;
      await session.save();
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
