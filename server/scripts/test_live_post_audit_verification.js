import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import PlacementDrive from '../models/PlacementDrive.js';
import Session from '../models/Session.js';
import Question from '../models/Question.js';
import Answer from '../models/Answer.js';
import Feedback from '../models/Feedback.js';
import Resume from '../models/Resume.js';
import AptitudeAttempt from '../models/AptitudeAttempt.js';
import { generateLLMJson } from '../services/llmService.js';
import { APTITUDE_QUESTION_BANK } from '../services/aptitudeService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_BASE = 'http://127.0.0.1:5000/api';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;
const failures = [];

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
    failures.push(message);
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const mergedHeaders = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const res = await fetch(url, {
    ...options,
    headers: mergedHeaders
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, headers: res.headers, data };
}

async function runLivePostAuditVerification() {
  console.log('================================================================');
  console.log('🧪 PREPILOT AI – FINAL POST-AUDIT LIVE VERIFICATION SUITE');
  console.log('================================================================\n');

  // Connect to DB directly for cleanup and assertions
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas for verification assertions.\n');

  const testTimestamp = Date.now();
  const testUserA_Email = `postaudit_user_a_${testTimestamp}@preppilot.test`;
  const testUserB_Email = `postaudit_user_b_${testTimestamp}@preppilot.test`;
  const testPassword = 'Password123!';

  let tokenA = null;
  let userA_Id = null;
  let tokenB = null;
  let userB_Id = null;

  try {
    // -------------------------------------------------------------------------
    // 1. HEALTH CHECK & API ACCESSIBILITY (Directive 4)
    // -------------------------------------------------------------------------
    console.log('--- 1. API HEALTH CHECK (/api/health) ---');
    const health = await request('/health');
    assert(health.status === 200, 'GET /api/health returned HTTP 200');
    assert(health.data?.status === 'ok', 'Health status is "ok"');
    assert(Boolean(health.data?.service), `Service name: "${health.data?.service}"`);

    // -------------------------------------------------------------------------
    // 2. REGISTRATION, LOGIN, LOGOUT & /api/auth/me (Directive 5 & 4)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. AUTHENTICATION LIFECYCLE (REGISTER, LOGIN, ME) ---');

    // 2.1 Unauthenticated /me must return 401
    const unauthMe = await request('/auth/me');
    assert(unauthMe.status === 401, 'GET /api/auth/me without token returns HTTP 401 Unauthorized');

    // 2.2 Register User A
    const regA = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'PostAudit Candidate Alpha',
        email: testUserA_Email,
        password: testPassword,
        targetRole: 'Full Stack Engineer'
      })
    });
    assert(regA.status === 201, 'POST /api/auth/register for User A returned HTTP 201');
    assert(Boolean(regA.data?.token), 'JWT Token generated on registration');
    tokenA = regA.data?.token;
    userA_Id = regA.data?.user?.id || regA.data?.user?._id;
    assert(Boolean(userA_Id), `User A ID created: ${userA_Id}`);

    // 2.3 Register User B (for IDOR tests)
    const regB = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'PostAudit Candidate Beta',
        email: testUserB_Email,
        password: testPassword,
        targetRole: 'DevOps & Cloud Engineer'
      })
    });
    assert(regB.status === 201, 'POST /api/auth/register for User B returned HTTP 201');
    tokenB = regB.data?.token;
    userB_Id = regB.data?.user?.id || regB.data?.user?._id;
    assert(Boolean(userB_Id), `User B ID created: ${userB_Id}`);

    // 2.4 Duplicate Registration must be rejected with 400
    const dupReg = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Duplicate Alpha',
        email: testUserA_Email,
        password: testPassword
      })
    });
    assert(dupReg.status === 400, 'Duplicate registration with same email returns HTTP 400');

    // 2.5 Login with invalid credentials returns 401
    const badLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testUserA_Email,
        password: 'WrongPassword999'
      })
    });
    assert(badLogin.status === 401, 'Login with incorrect password returns HTTP 401');

    // 2.6 Login with valid credentials returns 200
    const goodLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testUserA_Email,
        password: testPassword
      })
    });
    assert(goodLogin.status === 200, 'Login with valid credentials returns HTTP 200');
    assert(Boolean(goodLogin.data?.token), 'Valid JWT token returned on login');

    // 2.7 Verify /api/auth/me with User A's token
    const meA = await request('/auth/me', {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(meA.status === 200, 'GET /api/auth/me with Bearer token returns HTTP 200');
    assert(meA.data?.user?.email === testUserA_Email, `Authenticated user matches: ${meA.data?.user?.email}`);

    // -------------------------------------------------------------------------
    // 3. IDOR & MULTI-TENANT USER DATA ISOLATION (Directive 6)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. DATA ISOLATION & IDOR PROTECTION ---');

    // User A initializes a Placement Drive
    const driveA_Res = await request('/placement/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        targetRole: 'Full Stack Engineer',
        preferredCompany: 'TCS'
      })
    });
    assert(driveA_Res.status === 201, 'User A creates Placement Drive with HTTP 201');
    const driveA_Id = driveA_Res.data?.drive?._id;
    assert(Boolean(driveA_Id), `Drive A ID created: ${driveA_Id}`);

    // IDOR Check 1: User B tries to access User A's Placement Drive
    const idorDrive = await request(`/placement/${driveA_Id}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert([403, 404].includes(idorDrive.status), `User B accessing User A Placement Drive returns HTTP ${idorDrive.status} (Forbidden/Not Found)`);

    // User A creates a Mock Resume with all required schema attributes
    const resumeA_Doc = await Resume.create({
      user: new mongoose.Types.ObjectId(userA_Id),
      fileName: 'alpha_resume.pdf',
      fileType: 'pdf',
      rawText: 'Confidential Resume of User A with extensive React, Node.js, and MongoDB engineering practice.',
      targetRole: 'Full Stack Engineer',
      skills: ['React', 'Node.js', 'MongoDB', 'Express'],
      projects: [{ name: 'Project Alpha', description: 'Real-time collaboration app' }],
      atsScore: 82
    });
    const resumeA_Id = resumeA_Doc._id.toString();

    // IDOR Check 2: User B tries to access User A's Resume
    const idorResume = await request(`/resumes/${resumeA_Id}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert([403, 404].includes(idorResume.status), `User B accessing User A Resume returns HTTP ${idorResume.status} (Forbidden/Not Found)`);

    // -------------------------------------------------------------------------
    // 4. ALL 4 PLACEMENT ROUNDS & AUTO-RECONCILIATION (Directive 7 & 8)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. PLACEMENT DRIVE WORKFLOW: ROUNDS 1 TO 4 ---');

    // 4.1 Anti-skipping check: Attempt to start Round 2 before clearing Round 1
    const skipRound2 = await request(`/placement/${driveA_Id}/technical/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({})
    });
    assert(skipRound2.status === 400, 'Anti-skipping: Starting Round 2 before clearing Round 1 rejected with HTTP 400');

    // 4.2 Start Round 1 Aptitude
    const startApt = await request(`/placement/${driveA_Id}/aptitude/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({})
    });
    assert(startApt.status === 200, 'Round 1 Aptitude started with HTTP 200');
    const aptQuestions = startApt.data?.questions || [];
    assert(aptQuestions.length === 15, `Loaded 15 Aptitude questions (got ${aptQuestions.length})`);
    assert(aptQuestions.every(q => !q.correctOption && !q.explanation), 'Correct answers stripped on client questions');

    // 4.3 Submit Round 1 with Passing Score
    const aptAnswers = {};
    aptQuestions.forEach((q, idx) => {
      const bankItem = APTITUDE_QUESTION_BANK.find((b) => b.id === q.questionId || b.questionText === q.questionText);
      const correct = bankItem ? bankItem.correctOption : (q.options ? q.options[0] : 'Correct Option');
      aptAnswers[q.questionId] = idx < 12 ? correct : 'Incorrect Option';
    });

    const submitApt = await request(`/placement/${driveA_Id}/aptitude/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ answers: aptAnswers, timeSpentSeconds: 300 })
    });
    assert(submitApt.status === 200, 'Round 1 Aptitude submitted with HTTP 200');
    assert(submitApt.data?.result?.passed === true, `Round 1 marked passed: ${submitApt.data?.result?.score}%`);
    assert(submitApt.data?.drive?.rounds?.round2_technical?.status === 'unlocked', 'Round 2 Technical unlocked automatically');

    // 4.4 Start Round 2 Technical
    const startTech = await request(`/placement/${driveA_Id}/technical/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ difficulty: 'mid' })
    });
    assert(startTech.status === 200, 'Round 2 Technical started with HTTP 200');
    const techSessionId = startTech.data?.sessionId;
    const techQuestions = startTech.data?.questions || [];
    assert(Boolean(techSessionId), `Linked Technical session created: ${techSessionId}`);
    assert(techQuestions.length === 5, `5 curated technical questions provided (got ${techQuestions.length})`);

    // Anti-skipping check: Attempt to start Round 3 before completing Round 2
    const skipRound3 = await request(`/placement/${driveA_Id}/gd/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({})
    });
    assert(skipRound3.status === 400, 'Anti-skipping: Starting Round 3 before clearing Round 2 rejected with HTTP 400');

    // Submit substantive technical answers addressing expectedKeyPoints via /api/answers/submit
    for (let i = 0; i < techQuestions.length; i++) {
      const q = techQuestions[i];
      const keyPoints = Array.isArray(q.expectedKeyPoints) ? q.expectedKeyPoints.join(', ') : (q.expectedKeyPoints || 'architecture, performance trade-offs, and scalability');
      const submitAns = await request('/answers/submit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({
          sessionId: techSessionId,
          questionId: q._id || q.id,
          transcript: `Regarding the question "${q.questionText}": In production engineering for ${q.category}, we solve this by focusing directly on ${keyPoints}. Concretely, we resolved scaling bottlenecks by implementing clean modular separation, asynchronous worker queues, structured database indexing, and circuit breaker patterns. In evaluating trade-offs, we balanced eventual consistency against high write availability, successfully reducing p99 latency by 65% and eliminating connection pool saturation in production load tests.`,
          answerType: 'text'
        })
      });
      assert(submitAns.status === 201, `Technical Question ${i + 1} scored and answered with HTTP 201`);
      assert(submitAns.data?.feedback?.evaluationStatus === 'COMPLETED', `Technical Question ${i + 1} has explicit evaluationStatus = 'COMPLETED'`);
      assert(submitAns.data?.feedback?.evaluationSource === 'openai', `Technical Question ${i + 1} evaluationSource = 'openai' (genuine AI evaluation)`);
      assert(typeof submitAns.data?.feedback?.score === 'number', `Technical Question ${i + 1} score is genuine numeric: ${submitAns.data?.feedback?.score}`);
    }

    // -------------------------------------------------------------------------
    // 4.4.1 AI FALLBACK SAFETY AUDIT: Ensure failed AI evaluation blocks completion & preserves retry
    // -------------------------------------------------------------------------
    console.log('\n--- 4.4.1 AI FALLBACK SAFETY AUDIT (FAILED STATUS & RETRY) ---');
    const safetySess = await Session.create({
      user: userA_Id,
      targetRole: 'Full Stack Engineer',
      interviewType: 'technical',
      difficulty: 'mid',
      totalQuestions: 1,
      status: 'in_progress',
    });
    const safetyQ = await Question.create({
      session: safetySess._id,
      questionNumber: 1,
      questionText: 'Explain database sharding strategies.',
      category: 'Architecture',
      expectedKeyPoints: ['Partitioning keys', 'Horizontal scaling', 'Cross-shard queries'],
      hints: ['Mention consistent hashing.'],
    });
    const safetyAns = await Answer.create({
      session: safetySess._id,
      question: safetyQ._id,
      user: userA_Id,
      transcript: 'Consistent hashing partitions keys evenly across multiple shards.',
      evaluationStatus: 'FAILED',
    });
    const safetyFb = await Feedback.create({
      answer: safetyAns._id,
      session: safetySess._id,
      score: null, // MOCK SAFETY: score is null, never a fake passing number!
      evaluationStatus: 'FAILED',
      evaluationSource: 'mock',
      evaluationError: 'AI rate limit exceeded during test simulation',
      strengths: [],
      weaknesses: ['AI evaluation service was temporarily unavailable.'],
      suggestion: 'Please retry evaluation.',
      category: 'Architecture',
    });

    // Attempting to complete a session with FAILED evaluation MUST return HTTP 422
    const completeFailedSess = await request(`/sessions/${safetySess._id}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({})
    });
    assert(completeFailedSess.status === 422, 'Session completion rejected with HTTP 422 when answer has evaluationStatus = "FAILED"');
    assert(completeFailedSess.data?.evaluationStatus === 'FAILED', 'Response confirms evaluationStatus = "FAILED"');

    // Test retry endpoint: /api/sessions/:id/retry-evaluation
    const retrySess = await request(`/sessions/${safetySess._id}/retry-evaluation`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({})
    });
    assert(retrySess.status === 200, 'POST /api/sessions/:id/retry-evaluation returned HTTP 200');
    assert(retrySess.data?.evaluationStatus === 'COMPLETED', 'Retry successfully evaluated answer via live AI engine (status = "COMPLETED")');
    assert(retrySess.data?.recoveredCount === 1, 'Retry successfully recovered 1 failed evaluation');

    // Clean up temporary safety session
    await Feedback.deleteOne({ _id: safetyFb._id });
    await Answer.deleteOne({ _id: safetyAns._id });
    await Question.deleteOne({ _id: safetyQ._id });
    await Session.deleteOne({ _id: safetySess._id });
    console.log('Temporary safety test session safely cleaned up.\n');

    // Complete Technical Session
    const completeTech = await request(`/sessions/${techSessionId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({})
    });
    assert(completeTech.status === 200, 'Technical Session completed with HTTP 200');

    // Auto-reconciliation check: getCurrentDrive detects completed session and unlocks Round 3
    const driveAfterTech = await request('/placement/current', {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(driveAfterTech.data?.drive?.rounds?.round2_technical?.passed === true, 'Round 2 Technical marked passed via auto-reconciliation');
    assert(driveAfterTech.data?.drive?.rounds?.round3_gd?.status === 'unlocked', 'Round 3 Group Discussion unlocked automatically');

    // 4.5 Start Round 3 Group Discussion
    const startGD = await request(`/placement/${driveA_Id}/gd/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ topicIndex: 0 })
    });
    assert(startGD.status === 200, 'Round 3 Group Discussion started with HTTP 200');
    assert(Boolean(startGD.data?.topic), `GD Topic selected: "${startGD.data?.topic}"`);

    // Candidate speaks in GD
    const speakGD = await request(`/placement/${driveA_Id}/gd/message`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        message: 'I agree with the importance of security and developer velocity. Finding a balanced hybrid approach where automated static analysis and unit testing validate AI-generated code allows engineering teams to maximize productivity while protecting production systems.'
      })
    });
    assert(speakGD.status === 200, 'Candidate intervention accepted with HTTP 200');
    assert(speakGD.data?.peerResponses?.length >= 1, 'AI peers generated dynamic discussion response');

    // Complete GD
    const completeGD = await request(`/placement/${driveA_Id}/gd/evaluate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({})
    });
    assert(completeGD.status === 200, 'Round 3 Group Discussion completed and evaluated with HTTP 200');
    assert(completeGD.data?.evaluation?.evaluationStatus === 'COMPLETED', 'GD evaluationStatus is "COMPLETED"');
    assert(completeGD.data?.evaluation?.evaluationSource === 'openai', 'GD evaluationSource is "openai"');
    assert(typeof completeGD.data?.evaluation?.score === 'number', `GD evaluation score is genuine numeric: ${completeGD.data?.evaluation?.score}`);
    assert(completeGD.data?.drive?.rounds?.round3_gd?.evaluationStatus === 'COMPLETED', 'Round 3 drive evaluationStatus is "COMPLETED"');
    assert(completeGD.data?.drive?.rounds?.round4_resume?.status === 'unlocked', 'Round 4 Resume Interview unlocked automatically');

    // 4.6 Start Round 4 Resume-Based Interview
    const startResume = await request(`/placement/${driveA_Id}/resume-round/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ resumeId: resumeA_Id })
    });
    assert(startResume.status === 200, 'Round 4 Resume Interview started with HTTP 200');
    const resumeSessionId = startResume.data?.sessionId;
    const resumeQuestions = startResume.data?.questions || [];
    assert(Boolean(resumeSessionId), `Linked Resume session created: ${resumeSessionId}`);
    assert(resumeQuestions.length === 5, '5 project-specific interview questions generated');

    // Answer resume questions via /api/answers/submit
    for (let i = 0; i < resumeQuestions.length; i++) {
      const q = resumeQuestions[i];
      const keyPoints = Array.isArray(q.expectedKeyPoints) ? q.expectedKeyPoints.join(', ') : (q.expectedKeyPoints || 'trade-offs, scalability, and clean modular code');
      const submitAns = await request('/answers/submit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({
          sessionId: resumeSessionId,
          questionId: q._id || q.id,
          transcript: `In our Full Stack Web Platform project regarding "${q.questionText}": we directly addressed ${keyPoints}. We chose React on the frontend with TanStack Query for server-side state synchronization and optimistic updates, paired with Node.js and Express microservices. We integrated MongoDB with compound indexing on critical query paths, designed a RESTful API layer with token-based authentication and refresh token rotation, and structured schema validation with Zod. In our internships, we adopted strict code review practices and automated CI/CD pipelines, which increased our team velocity and reduced regression defects by 40%.`,
          answerType: 'text'
        })
      });
      assert(submitAns.status === 201, `Resume Question ${i + 1} scored and answered with HTTP 201`);
    }

    // Complete Resume Session
    const completeResume = await request(`/sessions/${resumeSessionId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({})
    });
    assert(completeResume.status === 200, 'Resume Session completed with HTTP 200');

    // Auto-reconciliation check: Drive marked completed, currentRound = 5
    const driveFinal = await request('/placement/current', {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(driveFinal.data?.drive?.rounds?.round4_resume?.passed === true, 'Round 4 marked passed via auto-reconciliation');
    assert(driveFinal.data?.drive?.status === 'completed', 'Placement Drive marked completed (all 4 rounds cleared)');
    assert(driveFinal.data?.drive?.currentRound === 5, 'Placement Drive progressed to final round status (5)');

    // -------------------------------------------------------------------------
    // 5. FINAL PLACEMENT REPORT VERIFICATION (Directive 8)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. FINAL PLACEMENT READINESS REPORT ---');
    const finalReport = await request(`/placement/${driveA_Id}/report`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(finalReport.status === 200, 'GET /placement/:id/report returned HTTP 200');
    const rep = finalReport.data?.finalReport;
    assert(['RECOMMENDED', 'SELECTED'].includes(rep?.verdict), `Final Verdict produced: "${rep?.verdict}"`);
    assert(typeof rep?.readinessScore === 'number' && rep?.readinessScore >= 60, `Overall readiness score: ${rep?.readinessScore}%`);
    assert(rep?.roundSummary?.length === 4, `All 4 rounds present in Round Summary (got ${rep?.roundSummary?.length})`);
    assert(rep?.roundSummary?.every(r => r.passed === true), 'All 4 rounds in report summary marked passed');
    assert(rep?.topStrengths?.length >= 4, 'Top strengths compiled across all rounds');
    assert(rep?.areasForImprovement?.length >= 4, 'Areas for improvement compiled across all rounds');

    // -------------------------------------------------------------------------
    // 6. AI INTEGRATION INDEPENDENT TESTING (Directive 9)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. INDEPENDENT AI / LLM INTEGRATION TEST ---');
    const testPrompt = `Evaluate this candidate answer for a Junior Engineer interview:
Question: "What is an index in MongoDB and why is it useful?"
Candidate's Answer: "An index is a specialized data structure, like a B-tree, that stores a small portion of the collection's data in an ordered form to facilitate fast query lookups without performing a full collection scan."
Format strictly as JSON:
{
  "score": 9,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "suggestion": "..."
}`;

    const aiResult = await generateLLMJson(testPrompt, 'You are an expert technical interviewer.');
    assert(typeof aiResult?.score === 'number', `AI parsed numeric score: ${aiResult?.score}`);
    assert(Array.isArray(aiResult?.strengths), 'AI returned strengths array');
    assert(Boolean(aiResult?._meta?.source), `AI response source identified: ${aiResult?._meta?.source} (${aiResult?._meta?.model || aiResult?._meta?.reason})`);

    if (aiResult?._meta?.source === 'openai') {
      console.log('  ℹ️  [AI Note] External OpenAI live network connection ACTIVE and operational.');
    } else {
      console.log(`  ℹ️  [AI Note] Operating on graceful fallback (${aiResult?._meta?.reason}). Distinguishing external network/quota limits from application logic.`);
    }

  } finally {
    // -------------------------------------------------------------------------
    // 7. CLEANUP OF TEST ACCOUNTS (Directive 11)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. TEST DATA CLEANUP (SAFEGUARDING REAL USER DATA) ---');
    if (userA_Id || userB_Id) {
      const userIdsToDelete = [
        userA_Id ? new mongoose.Types.ObjectId(userA_Id) : null,
        userB_Id ? new mongoose.Types.ObjectId(userB_Id) : null
      ].filter(Boolean);

      console.log(`Deleting test records strictly for test accounts: [${testUserA_Email}, ${testUserB_Email}]...`);

      const delDrives = await PlacementDrive.deleteMany({ user: { $in: userIdsToDelete } });
      const delSessions = await Session.deleteMany({ user: { $in: userIdsToDelete } });
      const delQuestions = await Question.deleteMany({ user: { $in: userIdsToDelete } });
      const delAnswers = await Answer.deleteMany({ user: { $in: userIdsToDelete } });
      const delFeedbacks = await Feedback.deleteMany({ user: { $in: userIdsToDelete } });
      const delResumes = await Resume.deleteMany({ user: { $in: userIdsToDelete } });
      const delAttempts = await AptitudeAttempt.deleteMany({ user: { $in: userIdsToDelete } });
      const delUsers = await User.deleteMany({ _id: { $in: userIdsToDelete } });

      console.log(`Cleaned up:
      - Placement Drives: ${delDrives.deletedCount}
      - Sessions: ${delSessions.deletedCount}
      - Answers: ${delAnswers.deletedCount}
      - Resumes: ${delResumes.deletedCount}
      - Aptitude Attempts: ${delAttempts.deletedCount}
      - Users: ${delUsers.deletedCount}`);

      assert(delUsers.deletedCount > 0, 'Test accounts safely removed from database without touching production users.');
    }

    await mongoose.disconnect();
  }

  console.log('\n================================================================');
  console.log(`POST-AUDIT RESULTS: ${passedTests} Passed, ${failedTests} Failed, ${skippedTests} Skipped (Total: ${totalTests})`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runLivePostAuditVerification().catch(err => {
  console.error('Fatal Post-Audit Verification Error:', err);
  process.exit(1);
});
