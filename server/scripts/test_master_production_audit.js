import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';
process.env.DISABLE_RATE_LIMIT = 'true';

const { app, startServer } = await import('../server.js');
const { default: User } = await import('../models/User.js');
const { default: Resume } = await import('../models/Resume.js');
const { default: Session } = await import('../models/Session.js');
const { default: Question } = await import('../models/Question.js');
const { default: Answer } = await import('../models/Answer.js');
const { default: Feedback } = await import('../models/Feedback.js');
const { default: PlacementDrive } = await import('../models/PlacementDrive.js');
const { default: AptitudeQuestion } = await import('../models/AptitudeQuestion.js');
const { default: AptitudeAttempt } = await import('../models/AptitudeAttempt.js');
const { default: SavedJob } = await import('../models/SavedJob.js');
const { default: Application } = await import('../models/Application.js');

const { generateToken } = await import('../controllers/authController.js');
const { getCurrentDrive, startDrive, startAptitudeTest, submitAptitudeTest, startTechnicalRound, startGDRound, sendGDMessage, evaluateGDRound, startResumeRound, getFinalReport } = await import('../controllers/placementController.js');
const { startSession, getSessionById, completeSession, getUserSessions } = await import('../controllers/sessionController.js');
const { submitAnswer } = await import('../controllers/answerController.js');
const { getDashboardAnalytics } = await import('../controllers/analyticsController.js');
const { startAptitudeTest: startPYQTest, submitAptitudeTest: submitPYQTest } = await import('../controllers/aptitudePYQController.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

const mockReqRes = (user = null, body = {}, params = {}, query = {}, headers = {}) => {
  const req = {
    user,
    body,
    params,
    query,
    headers: { ...headers },
    dbAvailable: mongoose.connection.readyState === 1,
  };

  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
    set(key, val) {
      this.headers[key] = val;
      return this;
    },
  };

  return { req, res };
};

async function runMasterAudit() {
  console.log('================================================================');
  console.log('🚀 PREPILOT AI – MASTER PRODUCTION AUDIT & END-TO-END VERIFICATION');
  console.log('================================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (mongoUri && mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
      console.log('Connected to MongoDB Atlas successfully.\n');
    } catch (e) {
      console.warn('MongoDB Atlas connection notice:', e.message, '\nRunning in memory fallback mode.\n');
    }
  }

  const testTimestamp = Date.now();
  const userA_Id = new mongoose.Types.ObjectId().toString();
  const userB_Id = new mongoose.Types.ObjectId().toString();

  const userA = {
    _id: userA_Id,
    id: userA_Id,
    name: 'Candidate Alpha',
    email: `candidate.alpha.${testTimestamp}@preppilot.test`,
    role: 'user',
    targetRole: 'Full Stack Engineer',
  };

  const userB = {
    _id: userB_Id,
    id: userB_Id,
    name: 'Candidate Beta',
    email: `candidate.beta.${testTimestamp}@preppilot.test`,
    role: 'user',
    targetRole: 'Frontend Engineer',
  };

  const tokenA = generateToken(userA._id, userA.name, userA.email, userA.targetRole, userA.role);
  const tokenB = generateToken(userB._id, userB.name, userB.email, userB.targetRole, userB.role);

  // ---------------------------------------------------------------------------
  // SECTION 1: AUTHENTICATION & SECURITY
  // ---------------------------------------------------------------------------
  console.log('--- 1. AUTHENTICATION & USER SECURITY ---');
  assert(Boolean(tokenA) && typeof tokenA === 'string', 'JWT generation creates valid token string');
  
  const decodedA = jwt.verify(tokenA, process.env.JWT_SECRET);
  assert(decodedA.id === userA._id, 'JWT payload contains correct user id');
  assert(decodedA.email === userA.email, 'JWT payload contains correct user email');

  // Verify expired token behavior
  const expiredToken = jwt.sign(
    { id: userA._id, email: userA.email },
    process.env.JWT_SECRET,
    { expiresIn: '0s' }
  );

  let expiredCaught = false;
  try {
    jwt.verify(expiredToken, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') expiredCaught = true;
  }
  assert(expiredCaught, 'Expired JWT token is rejected with TokenExpiredError');

  // ---------------------------------------------------------------------------
  // SECTION 2: PLACEMENT WORKFLOW - ROUND 1 (APTITUDE ASSESSMENT)
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. PLACEMENT WORKFLOW - ROUND 1: APTITUDE TEST ---');

  // 2.1 Start placement drive for User A
  const startDriveCall = mockReqRes(userA, { targetRole: 'Full Stack Engineer' });
  await startDrive(startDriveCall.req, startDriveCall.res);
  assert(startDriveCall.res.statusCode === 201, 'Fresh placement drive created with HTTP 201');
  const drive = startDriveCall.res.data?.drive;
  assert(Boolean(drive?._id), 'Drive doc initialized with unique _id');
  assert(drive?.rounds?.round1_aptitude?.status === 'unlocked', 'Round 1 Aptitude is unlocked by default');
  assert(drive?.rounds?.round2_technical?.status === 'locked', 'Round 2 Technical is initially locked');

  // 2.2 Anti-skipping check: Attempt to start Round 2 before clearing Round 1
  const skipRoundCall = mockReqRes(userA, {}, { id: drive._id });
  await startTechnicalRound(skipRoundCall.req, skipRoundCall.res);
  assert(skipRoundCall.res.statusCode === 400, 'Attempting to skip to Round 2 before clearing Round 1 returns HTTP 400');
  assert(skipRoundCall.res.data?.message?.includes('Round 1'), 'Proper error message explains Round 1 prerequisite');

  // 2.3 IDOR check: User B cannot access User A's placement drive
  const idorDriveCall = mockReqRes(userB, {}, { id: drive._id });
  await startAptitudeTest(idorDriveCall.req, idorDriveCall.res);
  assert(idorDriveCall.res.statusCode === 403, 'Cross-user IDOR attempt on Placement Drive returns HTTP 403 Forbidden');

  // 2.4 User A starts Aptitude test
  const startAptCall = mockReqRes(userA, {}, { id: drive._id });
  await startAptitudeTest(startAptCall.req, startAptCall.res);
  assert(startAptCall.res.statusCode === 200, 'Aptitude test started with HTTP 200');
  const clientQuestions = startAptCall.res.data?.questions || [];
  assert(clientQuestions.length === 15, `Generated 15 aptitude questions (got ${clientQuestions.length})`);
  assert(clientQuestions.every((q) => !q.correctOption && !q.explanation), 'Correct answers and explanations are stripped from client questions');

  // 2.5 Submit answers with passing score
  // Fetch full stored questions from drive to build valid answers
  const currDriveCall1 = mockReqRes(userA);
  await getCurrentDrive(currDriveCall1.req, currDriveCall1.res);
  const activeDrive1 = currDriveCall1.res.data?.drive;
  const storedQuestions = activeDrive1?.rounds?.round1_aptitude?.questions || [];

  const answersMap = {};
  storedQuestions.forEach((q, idx) => {
    // Answer at least 80% correctly to pass 60% threshold
    answersMap[q.questionId] = idx < 12 ? q.correctOption : 'Wrong Option';
  });

  const submitAptCall = mockReqRes(userA, { answers: answersMap, timeSpentSeconds: 420 }, { id: drive._id });
  await submitAptitudeTest(submitAptCall.req, submitAptCall.res);
  assert(submitAptCall.res.statusCode === 200, 'Aptitude test submitted with HTTP 200');
  const aptResult = submitAptCall.res.data?.result;
  assert(aptResult?.passed === true, `Aptitude test passed successfully with score: ${aptResult?.score}%`);
  assert(aptResult?.score >= 60, `Score ${aptResult?.score}% meets or exceeds 60% cutoff`);

  // Verify Round 2 unlocked automatically
  const updatedDrive1 = submitAptCall.res.data?.drive;
  assert(updatedDrive1?.rounds?.round2_technical?.status === 'unlocked', 'Round 2 Technical automatically unlocked after passing Round 1');
  assert(updatedDrive1?.currentRound >= 2, 'Current round progressed to Round 2');

  // ---------------------------------------------------------------------------
  // SECTION 3: PLACEMENT WORKFLOW - ROUND 2 (TECHNICAL INTERVIEW & AUTO-SYNC)
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. PLACEMENT WORKFLOW - ROUND 2: TECHNICAL INTERVIEW ---');

  // 3.1 Start Round 2 Technical session
  const startTechCall = mockReqRes(userA, { difficulty: 'mid' }, { id: drive._id });
  await startTechnicalRound(startTechCall.req, startTechCall.res);
  assert(startTechCall.res.statusCode === 200, 'Round 2 Technical started with HTTP 200');
  const techSessionId = startTechCall.res.data?.sessionId;
  const techQuestions = startTechCall.res.data?.questions || [];
  assert(Boolean(techSessionId), 'Linked Technical session ID created');
  assert(techQuestions.length === 5, `Selected 5 optimized technical questions (got ${techQuestions.length})`);

  // 3.2 Anti-skipping check: Attempt to start Round 3 before completing Round 2
  const skipToGDCall = mockReqRes(userA, {}, { id: drive._id });
  await startGDRound(skipToGDCall.req, skipToGDCall.res);
  assert(skipToGDCall.res.statusCode === 400, 'Attempting to skip to Round 3 before clearing Round 2 returns HTTP 400');

  // 3.3 Candidate submits answers to questions
  for (let i = 0; i < techQuestions.length; i++) {
    const q = techQuestions[i];
    const keyPoints = Array.isArray(q.expectedKeyPoints) ? q.expectedKeyPoints.join(', ') : (q.expectedKeyPoints || 'clean architecture, modular decoupling, and scalable design');
    const ansCall = mockReqRes(userA, {
      sessionId: techSessionId,
      questionId: q._id || q.id,
      transcript: `Regarding the question "${q.questionText}": In production engineering for ${q.category}, we solve this by focusing directly on ${keyPoints}. Concretely, we resolved scaling bottlenecks by implementing clean modular separation, asynchronous worker queues, structured database indexing, and circuit breaker patterns. In evaluating trade-offs, we balanced eventual consistency against high write availability, successfully reducing p99 latency by 65% and eliminating connection pool saturation in production load tests.`,
      answerType: 'text',
    });
    await submitAnswer(ansCall.req, ansCall.res);
    assert(ansCall.res.statusCode === 201, `Answer to Question ${i + 1} evaluated and scored server-side`);
  }

  // 3.4 Complete session
  const completeTechCall = mockReqRes(userA, {}, { id: techSessionId });
  await completeSession(completeTechCall.req, completeTechCall.res);
  assert(completeTechCall.res.statusCode === 200, 'Technical interview session completed with HTTP 200');
  const techScore = completeTechCall.res.data?.overallScore;
  assert(typeof techScore === 'number' && techScore > 0, `Session overall score calculated: ${techScore}`);

  // 3.5 Verify auto-reconciliation: getCurrentDrive automatically detects completed session and unlocks Round 3!
  const currDriveCall2 = mockReqRes(userA);
  await getCurrentDrive(currDriveCall2.req, currDriveCall2.res);
  const reconciledDrive2 = currDriveCall2.res.data?.drive;
  assert(reconciledDrive2?.rounds?.round2_technical?.passed === true, 'Round 2 Technical marked passed via auto-reconciliation');
  assert(reconciledDrive2?.rounds?.round2_technical?.status === 'completed', 'Round 2 status is completed');
  assert(reconciledDrive2?.rounds?.round3_gd?.status === 'unlocked', 'Round 3 Group Discussion automatically unlocked');
  assert(reconciledDrive2?.currentRound >= 3, 'Drive currentRound progressed to 3');

  // ---------------------------------------------------------------------------
  // SECTION 4: PLACEMENT WORKFLOW - ROUND 3 (GROUP DISCUSSION SIMULATION)
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. PLACEMENT WORKFLOW - ROUND 3: GROUP DISCUSSION (GD) ---');

  // 4.1 Anti-skipping check: Attempt to start Round 4 before completing Round 3
  const skipToResumeCall = mockReqRes(userA, {}, { id: drive._id });
  await startResumeRound(skipToResumeCall.req, skipToResumeCall.res);
  assert(skipToResumeCall.res.statusCode === 400, 'Attempting to skip to Round 4 before clearing Round 3 returns HTTP 400');

  // 4.2 Start GD simulation
  const startGDCall = mockReqRes(userA, { topicIndex: 0 }, { id: drive._id });
  await startGDRound(startGDCall.req, startGDCall.res);
  assert(startGDCall.res.statusCode === 200, 'Round 3 Group Discussion started with HTTP 200');
  assert(Boolean(startGDCall.res.data?.topic), `GD Topic selected: "${startGDCall.res.data?.topic}"`);
  assert(startGDCall.res.data?.transcript?.length >= 3, 'Opening moderator and peer arguments initialized');

  // 4.3 Candidate sends constructive intervention
  const msgCall = mockReqRes(userA, {
    message: 'I agree with the importance of security and developer velocity. Finding a balanced hybrid approach where automated static analysis and unit testing validate AI-generated code allows engineering teams to maximize productivity while protecting production systems.',
  }, { id: drive._id });
  await sendGDMessage(msgCall.req, msgCall.res);
  assert(msgCall.res.statusCode === 200, 'Candidate intervention accepted and processed');
  assert(msgCall.res.data?.peerResponses?.length >= 1, 'AI peers and moderator generated natural responses to candidate input');

  // 4.4 Evaluate GD performance across rubrics
  const evalGDCall = mockReqRes(userA, {}, { id: drive._id });
  await evaluateGDRound(evalGDCall.req, evalGDCall.res);
  assert(evalGDCall.res.statusCode === 200, 'GD session evaluated across rubrics with HTTP 200');
  const gdEval = evalGDCall.res.data?.evaluation;
  assert(gdEval?.passed === true, `Candidate passed GD with communication score: ${gdEval?.score}%`);
  assert(Boolean(gdEval?.rubrics?.clarityAndArticulation), 'Rubric clarityAndArticulation scored');
  assert(Boolean(gdEval?.rubrics?.problemSolvingAndIdeas), 'Rubric problemSolvingAndIdeas scored');
  assert(Boolean(gdEval?.rubrics?.collaborationAndListening), 'Rubric collaborationAndListening scored');
  assert(Boolean(gdEval?.rubrics?.persuasionAndConfidence), 'Rubric persuasionAndConfidence scored');

  // Verify Round 4 unlocked
  const updatedDrive3 = evalGDCall.res.data?.drive;
  assert(updatedDrive3?.rounds?.round4_resume?.status === 'unlocked', 'Round 4 Resume Interview automatically unlocked after passing GD');
  assert(updatedDrive3?.currentRound >= 4, 'Drive currentRound progressed to 4');

  // ---------------------------------------------------------------------------
  // SECTION 5: PLACEMENT WORKFLOW - ROUND 4 (RESUME-BASED INTERVIEW)
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. PLACEMENT WORKFLOW - ROUND 4: RESUME-BASED INTERVIEW ---');

  // 5.1 Start Round 4 session
  const startResumeCall = mockReqRes(userA, {}, { id: drive._id });
  await startResumeRound(startResumeCall.req, startResumeCall.res);
  assert(startResumeCall.res.statusCode === 200, 'Round 4 Resume Interview started with HTTP 200');
  const resumeSessionId = startResumeCall.res.data?.sessionId;
  const resumeQuestions = startResumeCall.res.data?.questions || [];
  assert(Boolean(resumeSessionId), 'Linked Resume session ID created');
  assert(resumeQuestions.length === 5, 'Selected 5 project-focused technical questions');

  // 5.2 Submit answers to resume questions
  for (let i = 0; i < resumeQuestions.length; i++) {
    const q = resumeQuestions[i];
    const keyPoints = Array.isArray(q.expectedKeyPoints) ? q.expectedKeyPoints.join(', ') : (q.expectedKeyPoints || 'robust full-stack development, trade-offs, and team practices');
    const ansCall = mockReqRes(userA, {
      sessionId: resumeSessionId,
      questionId: q._id || q.id,
      transcript: `In our Full Stack Web Platform project regarding "${q.questionText}": we directly addressed ${keyPoints}. We chose React on the frontend with TanStack Query for server-side state synchronization and optimistic updates, paired with Node.js and Express microservices. We integrated MongoDB with compound indexing on critical query paths, designed a RESTful API layer with token-based authentication and refresh token rotation, and structured schema validation with Zod. In our internships, we adopted strict code review practices and automated CI/CD pipelines, which increased our team velocity and reduced regression defects by 40%.`,
      answerType: 'text',
    });
    await submitAnswer(ansCall.req, ansCall.res);
    assert(ansCall.res.statusCode === 201, `Resume Question ${i + 1} answered and scored`);
  }

  // 5.3 Complete resume session
  const completeResumeCall = mockReqRes(userA, {}, { id: resumeSessionId });
  await completeSession(completeResumeCall.req, completeResumeCall.res);
  assert(completeResumeCall.res.statusCode === 200, 'Resume interview session completed with HTTP 200');

  // 5.4 Verify auto-reconciliation: Final Report compilation & Drive completion
  const currDriveCall4 = mockReqRes(userA);
  await getCurrentDrive(currDriveCall4.req, currDriveCall4.res);
  const finalDrive = currDriveCall4.res.data?.drive;

  assert(finalDrive?.rounds?.round4_resume?.passed === true, 'Round 4 Resume Interview marked passed via auto-reconciliation');
  assert(finalDrive?.status === 'completed', 'Placement Drive marked completed (all 4 rounds cleared)');
  assert(finalDrive?.currentRound === 5, 'Drive currentRound reached final stage (5)');

  // ---------------------------------------------------------------------------
  // SECTION 6: FINAL PLACEMENT READINESS REPORT
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. FINAL PLACEMENT READINESS REPORT ---');

  const reportCall = mockReqRes(userA, {}, { id: drive._id });
  await getFinalReport(reportCall.req, reportCall.res);
  assert(reportCall.res.statusCode === 200, 'Final Report generated with HTTP 200');
  const report = reportCall.res.data?.finalReport;
  assert(['SELECTED', 'RECOMMENDED'].includes(report?.verdict), `Final Verdict generated: "${report?.verdict}"`);
  assert(typeof report?.readinessScore === 'number' && report?.readinessScore >= 60, `Overall readiness score: ${report?.readinessScore}%`);
  assert(Boolean(report?.hiringRecommendation), `Hiring Recommendation provided: "${report?.hiringRecommendation}"`);
  assert(report?.roundSummary?.length === 4, `All 4 rounds present in Round Summary (got ${report?.roundSummary?.length})`);
  assert(report?.roundSummary?.every((r) => r.passed === true), 'All 4 rounds in report summary marked passed');
  assert(report?.topStrengths?.length >= 4, 'Top strengths compiled across all 4 rounds');
  assert(report?.areasForImprovement?.length >= 4, 'Targeted areas for improvement compiled');

  // ---------------------------------------------------------------------------
  // SECTION 7: COMPANY-WISE APTITUDE PYQ ENGINE
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. COMPANY-WISE APTITUDE PYQ ENGINE ---');

  const companiesToTest = ['TCS', 'Infosys', 'Accenture', 'Capgemini'];
  for (const comp of companiesToTest) {
    const pyqStartCall = mockReqRes(userA, {
      company: comp,
      questionCount: 10,
      testMode: 'full_mock',
    });
    await startPYQTest(pyqStartCall.req, pyqStartCall.res);
    assert(pyqStartCall.res.statusCode === 201, `${comp} PYQ test started with HTTP 201`);
    const pyqTest = pyqStartCall.res.data;
    assert(pyqTest?.questions?.length === 10, `${comp} loaded exactly 10 questions for quick practice`);
    assert(pyqTest?.questions?.every((q) => !q.correctAnswer && !q.explanation), `${comp} answers and explanations stripped on start`);

    // Submit test
    const userAnswers = {};
    pyqTest.questions.forEach((q) => {
      userAnswers[q.questionId] = q.options[0] || 'A';
    });
    const pyqSubmitCall = mockReqRes(
      userA,
      {
        testId: pyqTest.testId,
        answers: userAnswers,
        timeSpentSeconds: 300,
      },
      { testId: pyqTest.testId }
    );
    await submitPYQTest(pyqSubmitCall.req, pyqSubmitCall.res);
    assert(pyqSubmitCall.res.statusCode === 200, `${comp} test evaluated and submitted with HTTP 200`);
    const compPct = pyqSubmitCall.res.data?.percentage ?? pyqSubmitCall.res.data?.result?.percentage;
    assert(typeof compPct === 'number', `${comp} score percentage computed: ${compPct}%`);
  }

  // ---------------------------------------------------------------------------
  // SECTION 8: PERFORMANCE ANALYTICS
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. PERFORMANCE ANALYTICS & DASHBOARD METRICS ---');

  const analyticsCall = mockReqRes(userA);
  await getDashboardAnalytics(analyticsCall.req, analyticsCall.res);
  assert(analyticsCall.res.statusCode === 200, 'Dashboard analytics pipeline returned HTTP 200');
  const analyticsData = analyticsCall.res.data;
  const totalSessions = analyticsData?.totalSessions ?? analyticsData?.summary?.totalSessions;
  assert(typeof totalSessions === 'number', `Total completed sessions aggregated: ${totalSessions}`);
  assert(Array.isArray(analyticsData?.scoreTrend), 'Score trend line array populated');
  assert(Array.isArray(analyticsData?.skillScores), 'Skill category radar scores populated');
  const totalAnswers = analyticsData?.totalAnswers ?? analyticsData?.summary?.totalAnswers;
  assert(typeof totalAnswers === 'number', `Total answers count: ${totalAnswers}`);

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`AUDIT RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runMasterAudit().catch((err) => {
  console.error('Fatal Master Audit Error:', err);
  process.exit(1);
});
