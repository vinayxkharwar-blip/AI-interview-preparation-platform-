import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE_URL = 'http://127.0.0.1:5000/api';

async function runLiveInterviewFiveTurnTest() {
  console.log('===============================================================');
  console.log('Starting PrePilot AI 5-Turn Live Interview Audio & Flow Verification');
  console.log('===============================================================');

  // 1. Authenticate with test7@gmail.com
  console.log('\n[Step 1] Authenticating user test7@gmail.com...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test7@gmail.com', password: '123456' }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed: HTTP ${loginRes.status} ${await loginRes.text()}`);
  }
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log(`✅ Logged in successfully! User: ${loginData.user.name} (${loginData.user.email})`);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Create a fresh mock session
  console.log('\n[Step 2] Creating a fresh mock session for Full Stack Engineer (5 questions)...');
  const sessionRes = await fetch(`${BASE_URL}/sessions/start`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      targetRole: 'Full Stack Engineer',
      interviewType: 'technical',
      difficulty: 'mid',
      totalQuestions: 5,
    }),
  });

  if (!sessionRes.ok) {
    throw new Error(`Session creation failed: HTTP ${sessionRes.status} ${await sessionRes.text()}`);
  }
  const sessionData = await sessionRes.json();
  const sessionId = sessionData.session?._id || sessionData.session?.id || sessionData._id || sessionData.id;
  console.log(`✅ Session created successfully! ID: ${sessionId}`);

  // Fetch initial question
  let currentQuestion = sessionData.questions?.[0]?.questionText;
  if (!currentQuestion) {
    const sessionDetailRes = await fetch(`${BASE_URL}/sessions/${sessionId}`, { headers: authHeaders });
    const sessionDetail = await sessionDetailRes.json();
    currentQuestion = sessionDetail.questions?.[0]?.questionText ||
      'Can you tell me about yourself and your technical background?';
  }
  console.log(`\n🎤 Initial Question: "${currentQuestion}"`);

  // Test TTS on initial question
  console.log('[TTS Initial] Synthesizing TTS audio for Initial Question...');
  const tts0 = await fetch(`${BASE_URL}/sessions/${sessionId}/live/tts`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ text: currentQuestion, voice: 'alloy' }),
  });
  const tts0Data = await tts0.json();
  const hasAudio0 = Boolean(tts0Data.audioUrl && tts0Data.audioUrl.length > 500);
  console.log(`[TTS Initial] Received audio: hasAudioUrl=${hasAudio0}, audioLength=${tts0Data.audioUrl?.length || 0} bytes`);

  const answers = [
    'I have 3 years of full stack experience building web applications using React on the frontend and Node.js Express with MongoDB on the backend. In my last project, I built real-time notifications with WebSockets.',
    'For state management, I prefer Zustand or React Context for small apps, and Redux Toolkit for complex workflows. I always normalize state and memoize selectors with createSelector to avoid unnecessary re-renders.',
    'In Node.js, asynchronous operations run on the event loop. I structure my code with async/await, handle database queries through connection pooling, and use streams when processing large files to prevent memory bottlenecks.',
    'To optimize MongoDB queries, I use compound indexes matching our query patterns, project only required fields, and use aggregation pipelines with $match stages early to limit the working set.',
    'When handling authentication and security, I implement stateless JWTs with short-lived access tokens, secure HTTP-only cookies for refresh tokens, rate limiting via Redis, and bcrypt with 10 salt rounds for password hashing.',
  ];

  const conversationHistory = [];

  // 3. Loop through 5 consecutive turns
  for (let turnIndex = 0; turnIndex < 5; turnIndex++) {
    const turnNumber = turnIndex + 1;
    console.log(`\n---------------------------------------------------------------`);
    console.log(`▶ EXECUTING TURN ${turnNumber} OF 5`);
    console.log(`---------------------------------------------------------------`);
    console.log(`[Turn ${turnNumber}] Current Question: "${currentQuestion}"`);

    const answer = answers[turnIndex];
    console.log(`[Turn ${turnNumber}] Candidate Answer: "${answer.substring(0, 60)}..."`);

    // Submit answer to live turn endpoint
    const turnStart = Date.now();
    const turnRes = await fetch(`${BASE_URL}/sessions/${sessionId}/live/turn`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        userTranscript: answer,
        currentQuestionIndex: turnIndex,
        currentQuestionText: currentQuestion,
        conversationHistory,
      }),
    });

    if (!turnRes.ok) {
      throw new Error(`Turn ${turnNumber} failed: HTTP ${turnRes.status} ${await turnRes.text()}`);
    }

    const turnData = await turnRes.json();
    const turnDuration = Date.now() - turnStart;
    console.log(`✅ [Turn ${turnNumber}] Turn evaluation completed in ${turnDuration}ms!`);
    console.log(`   Decision: "${turnData.decision}"`);
    console.log(`   Turn Score: ${turnData.turnScore}/10`);
    console.log(`   AI Feedback/Line: "${turnData.interviewerLine}"`);
    console.log(`   Next Question Text: "${turnData.nextQuestionText || '(Session complete)'}"`);

    // Verify TTS synthesis on the returned interviewer line
    console.log(`[Turn ${turnNumber} TTS] Requesting OpenAI TTS for interviewer response...`);
    const ttsStart = Date.now();
    const ttsRes = await fetch(`${BASE_URL}/sessions/${sessionId}/live/tts`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ text: turnData.interviewerLine, voice: 'alloy' }),
    });

    if (!ttsRes.ok) {
      throw new Error(`TTS synthesis for turn ${turnNumber} failed: HTTP ${ttsRes.status}`);
    }

    const ttsData = await ttsRes.json();
    const ttsDuration = Date.now() - ttsStart;
    const base64Prefix = ttsData.audioUrl?.substring(0, 30) || '';
    const audioLen = ttsData.audioUrl?.length || 0;

    console.log(`✅ [Turn ${turnNumber} TTS] Synthesized in ${ttsDuration}ms!`);
    console.log(`   Audio URL Prefix: "${base64Prefix}..."`);
    console.log(`   Base64 Audio Length: ${audioLen} characters (~${Math.round(audioLen * 0.75 / 1024)} KB WAV)`);

    if (audioLen < 1000) {
      throw new Error(`TTS audio length is suspiciously small (${audioLen} chars)`);
    }

    // Update conversation history
    conversationHistory.push({
      questionIndex: turnIndex,
      questionText: currentQuestion,
      userTranscript: answer,
      interviewerLine: turnData.interviewerLine,
      turnScore: turnData.turnScore,
    });

    // Advance to next question
    if (turnData.nextQuestionText) {
      currentQuestion = turnData.nextQuestionText;
    } else if (turnIndex < 4) {
      currentQuestion = `Next technical question for Turn ${turnNumber + 1}`;
    }
  }

  // 4. Complete the session
  console.log(`\n===============================================================`);
  console.log(`[Step 4] Completing live interview session and generating report...`);
  const completeRes = await fetch(`${BASE_URL}/sessions/${sessionId}/live/complete`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ liveTurns: conversationHistory }),
  });

  if (!completeRes.ok) {
    throw new Error(`Complete failed: HTTP ${completeRes.status} ${await completeRes.text()}`);
  }

  const completeData = await completeRes.json();
  console.log(`✅ Live interview successfully completed!`);
  console.log(`   Overall Score: ${completeData.overallScore}/100`);
  console.log(`   Summary: "${completeData.improvementPlan?.overallSummary || 'Completed'}"`);
  console.log(`===============================================================`);
  console.log(`🎉 ALL 5 CONSECUTIVE TURNS VERIFIED WITH FULL AUDIO & EVALUATION!`);
  console.log(`===============================================================`);
}

runLiveInterviewFiveTurnTest().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
