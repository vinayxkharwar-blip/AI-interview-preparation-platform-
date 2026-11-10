import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.warn('[DNS Warning] Failed to set custom DNS servers:', e.message);
}

import User from '../models/User.js';
import PlacementDrive from '../models/PlacementDrive.js';
import AptitudeAttempt from '../models/AptitudeAttempt.js';
import AptitudeQuestion from '../models/AptitudeQuestion.js';
import {
  getCurrentDrive,
  startDrive,
  startAptitudeTest,
  submitAptitudeTest,
  startTechnicalRound,
} from '../controllers/placementController.js';
import {
  startAptitudeTest as startPYQTest,
  submitAptitudeTest as submitPYQTest,
} from '../controllers/aptitudePYQController.js';

function mockReqRes(user, body = {}, params = {}, query = {}) {
  const req = {
    user,
    body,
    params,
    query,
    headers: {},
  };
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
  };
  return { req, res };
}

async function runProgressionVerification() {
  console.log('--- CONNECTING TO MONGODB ---');
  let connected = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
      console.log('MongoDB connection active. ReadyState:', mongoose.connection.readyState);
      connected = true;
      break;
    } catch (e) {
      console.warn(`[Mongo Retry] Attempt ${attempt} failed: ${e.message}`);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 2000));
    }
  }
  if (!connected) {
    throw new Error('Could not connect to MongoDB Atlas after 3 attempts');
  }

  let freshUser = null;
  let testDriveId = null;

  try {
    // =========================================================================
    // PART 1: FRESH ACCOUNT PROGRESSION TEST
    // =========================================================================
    console.log('\n=============================================================');
    console.log('PART 1: TESTING WITH A FRESH ACCOUNT');
    console.log('=============================================================');

    const freshEmail = `fresh_candidate_${Date.now()}@example.com`;
    freshUser = await User.create({
      name: 'Fresh Candidate',
      email: freshEmail,
      password: 'Password123!',
      targetRole: 'Full Stack Engineer',
    });
    console.log('1. Created fresh user:', freshUser._id, freshEmail);

    // 1.1 Fetch initial drive
    const { req: rInit, res: sInit } = mockReqRes(freshUser);
    await getCurrentDrive(rInit, sInit);
    const initialDrive = sInit.data.drive;
    testDriveId = initialDrive._id.toString();
    console.log('1.1 Initial Drive ID:', testDriveId);
    console.log('    - Round 1 Aptitude status:', initialDrive.rounds.round1_aptitude.status, '(Passed:', initialDrive.rounds.round1_aptitude.passed, ')');
    console.log('    - Round 2 Technical status:', initialDrive.rounds.round2_technical.status, '(Passed:', initialDrive.rounds.round2_technical.passed, ')');

    if (initialDrive.rounds.round1_aptitude.status !== 'unlocked') {
      throw new Error('Assertion Failed: Fresh drive Round 1 should be unlocked');
    }
    if (initialDrive.rounds.round2_technical.status !== 'locked') {
      throw new Error('Assertion Failed: Fresh drive Round 2 should be locked');
    }

    // 1.2 Server-side Security Guard: Try starting Round 2 while Round 1 is locked
    console.log('\n1.2 Server-side enforcement check: Attempting to start Round 2 before clearing Round 1...');
    const { req: rIllegalStart, res: sIllegalStart } = mockReqRes(freshUser, { difficulty: 'mid' }, { id: testDriveId });
    await startTechnicalRound(rIllegalStart, sIllegalStart);
    console.log('    - HTTP Status:', sIllegalStart.statusCode);
    console.log('    - Response message:', sIllegalStart.data?.message);
    if (sIllegalStart.statusCode !== 400) {
      throw new Error('Assertion Failed: Server should block Round 2 start with 400 when Round 1 not passed');
    }
    console.log('    ✓ Correctly rejected with 400 Bad Request!');

    // 1.3 Failed Round 1 Attempt (< 60% score)
    console.log('\n1.3 Round 1 Failed Attempt Check: Starting diagnostic test...');
    const { req: rDiag1, res: sDiag1 } = mockReqRes(freshUser, {}, { id: testDriveId });
    await startAptitudeTest(rDiag1, sDiag1);
    console.log('    - Start diagnostic test status:', sDiag1.statusCode);

    // Fetch questions to deliberately answer only 4 of 15 correctly (27% score < 60% cutoff)
    const driveDoc1 = await PlacementDrive.findById(testDriveId);
    const failingAnswers = {};
    driveDoc1.rounds.round1_aptitude.questions.forEach((q, idx) => {
      if (idx < 4) {
        failingAnswers[q.questionId] = q.correctOption; // 4 correct
      } else {
        failingAnswers[q.questionId] = 'WRONG_ANSWER'; // 11 wrong
      }
    });

    const { req: rSubFail, res: sSubFail } = mockReqRes(freshUser, { answers: failingAnswers, timeSpentSeconds: 90 }, { id: testDriveId });
    await submitAptitudeTest(rSubFail, sSubFail);
    console.log('    - Submit Status:', sSubFail.statusCode);
    console.log('    - Score:', sSubFail.data?.result?.score, '% | Passed:', sSubFail.data?.result?.passed);
    console.log('    - Round 1 status:', sSubFail.data?.drive?.rounds?.round1_aptitude?.status);
    console.log('    - Round 2 status:', sSubFail.data?.drive?.rounds?.round2_technical?.status);

    if (sSubFail.data?.result?.passed === true) {
      throw new Error('Assertion Failed: 4/15 score (27%) must not pass 60% threshold');
    }
    if (sSubFail.data?.drive?.rounds?.round2_technical?.status !== 'locked') {
      throw new Error('Assertion Failed: Round 2 must remain locked after failed attempt');
    }
    console.log('    ✓ Failed attempt correctly kept Round 2 locked!');

    // 1.4 Passing Round 1 Attempt (>= 60% score)
    console.log('\n1.4 Round 1 Passing Attempt Check: Retrying diagnostic test...');
    const { req: rDiag2, res: sDiag2 } = mockReqRes(freshUser, {}, { id: testDriveId });
    await startAptitudeTest(rDiag2, sDiag2);
    console.log('    - Retest start status:', sDiag2.statusCode);

    // Answer 11 of 15 correctly (73% score >= 60% cutoff)
    const driveDoc2 = await PlacementDrive.findById(testDriveId);
    const passingAnswers = {};
    driveDoc2.rounds.round1_aptitude.questions.forEach((q, idx) => {
      if (idx < 11) {
        passingAnswers[q.questionId] = q.correctOption; // 11 correct
      } else {
        passingAnswers[q.questionId] = 'WRONG_ANSWER';
      }
    });

    const { req: rSubPass, res: sSubPass } = mockReqRes(freshUser, { answers: passingAnswers, timeSpentSeconds: 150 }, { id: testDriveId });
    await submitAptitudeTest(rSubPass, sSubPass);
    console.log('    - Submit Status:', sSubPass.statusCode);
    console.log('    - Score:', sSubPass.data?.result?.score, '% | Passed:', sSubPass.data?.result?.passed);
    console.log('    - Round 1 status:', sSubPass.data?.drive?.rounds?.round1_aptitude?.status);
    console.log('    - Round 2 status:', sSubPass.data?.drive?.rounds?.round2_technical?.status);

    if (sSubPass.data?.result?.passed !== true) {
      throw new Error('Assertion Failed: 11/15 score (73%) should pass 60% cutoff');
    }
    if (sSubPass.data?.drive?.rounds?.round2_technical?.status !== 'unlocked') {
      throw new Error('Assertion Failed: Round 2 must be unlocked after passing Round 1');
    }
    console.log('    ✓ Round 1 passed and Round 2 automatically set to unlocked!');

    // 1.5 Fresh fetch verification (refreshing journey)
    console.log('\n1.5 Refresh placement journey check (GET /api/placement/current)...');
    const { req: rFreshFetch, res: sFreshFetch } = mockReqRes(freshUser);
    await getCurrentDrive(rFreshFetch, sFreshFetch);
    const refreshedDrive = sFreshFetch.data.drive;
    console.log('    - Refreshed Round 1 passed:', refreshedDrive.rounds.round1_aptitude.passed);
    console.log('    - Refreshed Round 1 status:', refreshedDrive.rounds.round1_aptitude.status);
    console.log('    - Refreshed Round 2 status:', refreshedDrive.rounds.round2_technical.status);
    console.log('    - Refreshed currentRound:', refreshedDrive.currentRound);

    if (refreshedDrive.rounds.round2_technical.status !== 'unlocked') {
      throw new Error('Assertion Failed: Refreshed drive Round 2 status must be unlocked in DB');
    }
    console.log('    ✓ Refreshed drive successfully returned Round 2 unlocked from MongoDB!');

    // 1.6 Server-side check: Start Round 2 now that Round 1 is passed
    console.log('\n1.6 Starting Round 2 Technical Interview (server validation)...');
    const { req: rTechStart, res: sTechStart } = mockReqRes(freshUser, { difficulty: 'mid' }, { id: testDriveId });
    await startTechnicalRound(rTechStart, sTechStart);
    console.log('    - Start Technical Round status:', sTechStart.statusCode);
    console.log('    - Session ID created:', sTechStart.data?.sessionId);
    console.log('    - Questions generated:', sTechStart.data?.questions?.length);
    console.log('    - Round 2 status in drive:', sTechStart.data?.drive?.rounds?.round2_technical?.status);

    if (sTechStart.statusCode !== 200 || !sTechStart.data?.sessionId) {
      throw new Error('Assertion Failed: Starting technical round should succeed with 200 and sessionId');
    }
    console.log('    ✓ Round 2 successfully launched and linked to interview session!');

    // =========================================================================
    // PART 2: EXISTING ACCOUNT TEST & COMPANY PYQ TEST SYNC
    // =========================================================================
    console.log('\n=============================================================');
    console.log('PART 2: TESTING WITH EXISTING ACCOUNT');
    console.log('=============================================================');

    // Find the real existing user in MongoDB who took the TCS test
    const existingUser = await User.findOne({ email: 'vinayxkharwar@gmail.com' }) ||
      await User.findById('6a6cb931bf352e29cea845d2');

    if (existingUser) {
      console.log('2.1 Loaded existing user:', existingUser._id, existingUser.email);

      // Call getCurrentDrive for this existing user
      const { req: rExist, res: sExist } = mockReqRes(existingUser);
      await getCurrentDrive(rExist, sExist);
      const existDrive = sExist.data.drive;

      console.log('    - Drive ID:', existDrive._id);
      console.log('    - Round 1 Aptitude status:', existDrive.rounds.round1_aptitude.status);
      console.log('    - Round 1 Aptitude passed:', existDrive.rounds.round1_aptitude.passed);
      console.log('    - Round 1 Aptitude score:', existDrive.rounds.round1_aptitude.score);
      console.log('    - Round 2 Technical status:', existDrive.rounds.round2_technical.status);
      console.log('    - Current Round:', existDrive.currentRound);

      if (!existDrive.rounds.round1_aptitude.passed) {
        throw new Error('Assertion Failed: Existing user with passed TCS attempt should have round1_aptitude.passed = true');
      }
      if (existDrive.rounds.round2_technical.status !== 'unlocked') {
        throw new Error('Assertion Failed: Existing user with passed attempt should have round2_technical.status = unlocked');
      }
      console.log('    ✓ Self-healing verified! Existing account automatically synchronized and Round 2 unlocked in MongoDB.');
    } else {
      console.log('2.1 Existing user not found by email, testing with another existing DB user...');
      const anyUser = await User.findOne();
      if (anyUser) {
        const { req: rExist, res: sExist } = mockReqRes(anyUser);
        await getCurrentDrive(rExist, sExist);
        console.log('    - User drive loaded successfully for:', anyUser.email);
      }
    }

    // =========================================================================
    // PART 3: COMPANY PYQ SUBMISSION DIRECT SYNC TEST
    // =========================================================================
    console.log('\n=============================================================');
    console.log('PART 3: TESTING COMPANY PYQ SUBMISSION AUTO-UNLOCK');
    console.log('=============================================================');

    // Create another candidate to test Company-Wise PYQ Arena directly
    const pyqEmail = `pyq_candidate_${Date.now()}@example.com`;
    const pyqUser = await User.create({
      name: 'PYQ Candidate',
      email: pyqEmail,
      password: 'Password123!',
      targetRole: 'Backend Engineer',
    });

    // Ensure PYQ candidate has an active drive where Round 2 is initially locked
    const { req: rPyqInit, res: sPyqInit } = mockReqRes(pyqUser);
    await getCurrentDrive(rPyqInit, sPyqInit);
    console.log('3.1 Initialized drive for PYQ Candidate. Round 2 status:', sPyqInit.data.drive.rounds.round2_technical.status);

    // Start a PYQ test
    const { req: rStartPyq, res: sStartPyq } = mockReqRes(pyqUser, {
      company: 'TCS',
      questionCount: 5,
      timeLimitMinutes: 10,
    });
    await startPYQTest(rStartPyq, sStartPyq);
    const testId = sStartPyq.data.testId;
    console.log('3.2 Started PYQ test. TestId:', testId, 'Questions:', sStartPyq.data.questions?.length);

    // Submit PYQ test with passing answers
    const attemptDoc = await AptitudeAttempt.findById(testId);
    const pyqAnswers = {};
    if (attemptDoc && attemptDoc.questions) {
      attemptDoc.questions.forEach((q) => {
        pyqAnswers[q.questionId] = q.correctAnswer; // 100% score
      });
    }

    const { req: rSubPyq, res: sSubPyq } = mockReqRes(pyqUser, { answers: pyqAnswers, timeSpentSeconds: 60 }, { testId: testId.toString() });
    await submitPYQTest(rSubPyq, sSubPyq);
    console.log('3.3 Submitted PYQ Test:');
    console.log('    - Attempt percentage:', sSubPyq.data?.result?.percentage, '% | Passed:', sSubPyq.data?.result?.passed);
    console.log('    - Drive synced Round 1 status:', sSubPyq.data?.drive?.rounds?.round1_aptitude?.status);
    console.log('    - Drive synced Round 1 passed:', sSubPyq.data?.drive?.rounds?.round1_aptitude?.passed);
    console.log('    - Drive synced Round 2 status:', sSubPyq.data?.drive?.rounds?.round2_technical?.status);

    if (sSubPyq.data?.drive?.rounds?.round2_technical?.status !== 'unlocked') {
      throw new Error('Assertion Failed: Company PYQ submission must automatically unlock Round 2 in Placement Drive');
    }
    console.log('    ✓ Company PYQ submission successfully synchronized to PlacementDrive and unlocked Round 2!');

    // Cleanup pyqUser
    await PlacementDrive.deleteMany({ user: pyqUser._id });
    await AptitudeAttempt.deleteMany({ user: pyqUser._id });
    await User.deleteOne({ _id: pyqUser._id });

    console.log('\n=============================================================');
    console.log('ALL TESTS PASSED WITH 100% SUCCESS!');
    console.log('=============================================================');

  } finally {
    if (freshUser) {
      await PlacementDrive.deleteMany({ user: freshUser._id });
      await User.deleteOne({ _id: freshUser._id });
    }
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runProgressionVerification().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
