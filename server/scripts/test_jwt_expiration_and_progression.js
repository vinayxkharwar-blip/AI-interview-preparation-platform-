import mongoose from 'mongoose';
import dns from 'dns';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.warn('[DNS Warning] Failed to set custom DNS servers:', e.message);
}

import User from '../models/User.js';
import PlacementDrive from '../models/PlacementDrive.js';
import { protect } from '../middleware/authMiddleware.js';
import { getCurrentDrive, startAptitudeTest, submitAptitudeTest, startTechnicalRound } from '../controllers/placementController.js';
import { refreshToken, generateToken } from '../controllers/authController.js';

// Mock Express req, res, next
function mockHttp(headers = {}, body = {}, params = {}) {
  const req = {
    headers,
    body,
    params,
    query: {},
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
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };
  return { req, res, next, getNextCalled: () => nextCalled };
}

// Client-side isTokenExpired implementation check
function clientIsTokenExpired(token, bufferSeconds = 10) {
  if (!token || typeof token !== 'string') return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      Buffer.from(base64, 'base64').toString('binary')
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000 - bufferSeconds * 1000;
  } catch (err) {
    return true;
  }
}

async function runJwtAndProgressionTest() {
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
  if (!connected) throw new Error('Could not connect to MongoDB');

  let testUser = null;

  try {
    // =========================================================================
    // 1. CREATE FRESH USER FOR JWT TESTS
    // =========================================================================
    const userEmail = `jwt_test_user_${Date.now()}@example.com`;
    testUser = await User.create({
      name: 'JWT Test User',
      email: userEmail,
      password: 'Password123!',
      targetRole: 'Full Stack Engineer',
    });
    console.log('\n1. Created test user:', testUser._id, testUser.email);

    // =========================================================================
    // 2. EXPIRED TOKEN TEST
    // =========================================================================
    console.log('\n=============================================================');
    console.log('2. EXPIRED TOKEN VERIFICATION');
    console.log('=============================================================');

    // Create an intentionally expired token (-10 seconds)
    const expiredToken = jwt.sign(
      { id: testUser._id.toString(), email: testUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '-10s' }
    );
    console.log('2.1 Generated expired token with past exp');

    // Check client-side detection
    const isExpiredDetected = clientIsTokenExpired(expiredToken);
    console.log('2.2 Client-side isTokenExpired check:', isExpiredDetected);
    if (!isExpiredDetected) {
      throw new Error('Assertion Failed: client-side isTokenExpired must return true for expired token');
    }
    console.log('    ✓ Client-side correctly identified token as expired!');

    // Check server-side protect middleware with expired token
    console.log('2.3 Sending request with expired token to server protect middleware...');
    const { req: reqExp, res: resExp, next: nextExp, getNextCalled: getNextExp } = mockHttp({
      authorization: `Bearer ${expiredToken}`,
    });
    await protect(reqExp, resExp, nextExp);

    console.log('    - Status Code:', resExp.statusCode);
    console.log('    - Response data:', resExp.data);
    console.log('    - Next called (bypassed?):', getNextExp());

    if (getNextExp()) {
      throw new Error('SECURITY VIOLATION: protect middleware allowed expired token to proceed!');
    }
    if (resExp.statusCode !== 401) {
      throw new Error('Assertion Failed: protect middleware must return 401 on expired token');
    }
    if (resExp.data?.code !== 'TOKEN_EXPIRED' || !resExp.data?.isExpired) {
      throw new Error('Assertion Failed: response must indicate TOKEN_EXPIRED and isExpired: true');
    }
    console.log('    ✓ Server protect middleware correctly rejected expired token with 401 and TOKEN_EXPIRED code!');

    // =========================================================================
    // 3. VALID TOKEN TEST
    // =========================================================================
    console.log('\n=============================================================');
    console.log('3. VALID TOKEN VERIFICATION');
    console.log('=============================================================');

    const validToken = generateToken(
      testUser._id.toString(),
      testUser.name,
      testUser.email,
      testUser.targetRole,
      testUser.role
    );
    console.log('3.1 Generated valid 7-day token');

    const isValidTokenValidOnClient = !clientIsTokenExpired(validToken);
    console.log('3.2 Client-side isTokenExpired check (should be false):', clientIsTokenExpired(validToken));
    if (!isValidTokenValidOnClient) {
      throw new Error('Assertion Failed: client-side isTokenExpired must return false for valid token');
    }
    console.log('    ✓ Client-side correctly identified token as valid!');

    // Check server protect middleware with valid token
    console.log('3.3 Sending request with valid token to server protect middleware...');
    const { req: reqVal, res: resVal, next: nextVal, getNextCalled: getNextVal } = mockHttp({
      authorization: `Bearer ${validToken}`,
    });
    await protect(reqVal, resVal, nextVal);

    console.log('    - Next called (authorized?):', getNextVal());
    console.log('    - Attached req.user:', reqVal.user?._id?.toString(), reqVal.user?.email);

    if (!getNextVal()) {
      throw new Error('Assertion Failed: protect middleware should call next() for valid token');
    }
    if (reqVal.user?._id?.toString() !== testUser._id.toString()) {
      throw new Error('Assertion Failed: attached req.user ID does not match token subject');
    }
    console.log('    ✓ Server protect middleware authorized valid token and attached req.user!');

    // 3.4 Test token renewal endpoint POST /api/auth/refresh
    console.log('\n3.4 Testing token refresh endpoint (POST /api/auth/refresh)...');
    const { req: reqRef, res: resRef } = mockHttp({ authorization: `Bearer ${validToken}` });
    reqRef.user = reqVal.user; // protect sets req.user
    await refreshToken(reqRef, resRef);

    console.log('    - Refresh status code:', resRef.statusCode);
    console.log('    - New token received:', Boolean(resRef.data?.token));
    if (resRef.statusCode !== 200 || !resRef.data?.token) {
      throw new Error('Assertion Failed: refreshToken should return 200 and a new token');
    }
    console.log('    ✓ Token refresh endpoint successfully returned fresh token!');

    // =========================================================================
    // 4. PLACEMENT JOURNEY ROUND 1 & ROUND 2 UNLOCK FLOW
    // =========================================================================
    console.log('\n=============================================================');
    console.log('4. PLACEMENT JOURNEY ROUND 1 TO ROUND 2 PROGRESSION');
    console.log('=============================================================');

    // 4.1 Fetch initial drive
    const { req: rInit, res: sInit } = mockHttp({}, {}, {});
    rInit.user = testUser;
    await getCurrentDrive(rInit, sInit);

    const drive = sInit.data.drive;
    const driveId = drive._id.toString();
    console.log('4.1 Initial Placement Drive ID:', driveId);
    console.log('    - Round 1 status:', drive.rounds.round1_aptitude.status, '(passed:', drive.rounds.round1_aptitude.passed, ')');
    console.log('    - Round 2 status:', drive.rounds.round2_technical.status, '(passed:', drive.rounds.round2_technical.passed, ')');

    if (drive.rounds.round1_aptitude.status !== 'unlocked') {
      throw new Error('Assertion Failed: Round 1 must be unlocked initially');
    }
    if (drive.rounds.round2_technical.status !== 'locked') {
      throw new Error('Assertion Failed: Round 2 must be locked initially');
    }

    // 4.2 Start Round 1 Aptitude Test
    const { req: rStartApt, res: sStartApt } = mockHttp({}, {}, { id: driveId });
    rStartApt.user = testUser;
    await startAptitudeTest(rStartApt, sStartApt);
    console.log('4.2 Started Round 1 Diagnostic Test. Questions count:', sStartApt.data.questions?.length);

    // 4.3 Submit Passing Answers (80% score >= 60% cutoff)
    const storedDrive = await PlacementDrive.findById(driveId);
    const answers = {};
    storedDrive.rounds.round1_aptitude.questions.forEach((q, idx) => {
      if (idx < 12) {
        answers[q.questionId] = q.correctOption; // 12/15 = 80%
      } else {
        answers[q.questionId] = 'WRONG_CHOICE';
      }
    });

    const { req: rSubApt, res: sSubApt } = mockHttp({}, { answers, timeSpentSeconds: 110 }, { id: driveId });
    rSubApt.user = testUser;
    await submitAptitudeTest(rSubApt, sSubApt);

    console.log('4.3 Submitted Round 1 Test Answers:');
    console.log('    - Status Code:', sSubApt.statusCode);
    console.log('    - Result score:', sSubApt.data?.result?.score, '%');
    console.log('    - Passed status:', sSubApt.data?.result?.passed);
    console.log('    - Round 1 status:', sSubApt.data?.drive?.rounds?.round1_aptitude?.status);
    console.log('    - Round 2 status:', sSubApt.data?.drive?.rounds?.round2_technical?.status);

    if (sSubApt.data?.result?.passed !== true) {
      throw new Error('Assertion Failed: 80% score must be passed');
    }
    if (sSubApt.data?.drive?.rounds?.round2_technical?.status !== 'unlocked') {
      throw new Error('Assertion Failed: Round 2 must be unlocked immediately upon passing Round 1');
    }
    console.log('    ✓ Round 1 completed and Round 2 status set to unlocked in API response!');

    // 4.4 Verify Persistence in MongoDB
    const persistedDrive = await PlacementDrive.findById(driveId);
    console.log('\n4.4 Querying MongoDB directly to verify persistence:');
    console.log('    - MongoDB round1_aptitude.passed:', persistedDrive.rounds.round1_aptitude.passed);
    console.log('    - MongoDB round1_aptitude.status:', persistedDrive.rounds.round1_aptitude.status);
    console.log('    - MongoDB round1_aptitude.score:', persistedDrive.rounds.round1_aptitude.score);
    console.log('    - MongoDB round2_technical.status:', persistedDrive.rounds.round2_technical.status);
    console.log('    - MongoDB currentRound:', persistedDrive.currentRound);

    if (persistedDrive.rounds.round1_aptitude.passed !== true) {
      throw new Error('Assertion Failed: round1_aptitude.passed was not persisted as true in MongoDB');
    }
    if (persistedDrive.rounds.round2_technical.status !== 'unlocked') {
      throw new Error('Assertion Failed: round2_technical.status was not persisted as unlocked in MongoDB');
    }
    console.log('    ✓ Verified MongoDB persistence: Round 1 passed & Round 2 unlocked stored in database!');

    // 4.5 Verify Start of Round 2
    console.log('\n4.5 Launching Round 2 Technical Interview...');
    const { req: rTech, res: sTech } = mockHttp({}, { difficulty: 'mid' }, { id: driveId });
    rTech.user = testUser;
    await startTechnicalRound(rTech, sTech);

    console.log('    - Technical Round HTTP Status:', sTech.statusCode);
    console.log('    - Technical Session ID:', sTech.data?.sessionId);
    console.log('    - Questions generated:', sTech.data?.questions?.length);
    if (sTech.statusCode !== 200 || !sTech.data?.sessionId) {
      throw new Error('Assertion Failed: startTechnicalRound should succeed with 200');
    }
    console.log('    ✓ Round 2 Technical Interview started successfully!');

    console.log('\n=============================================================');
    console.log('ALL JWT EXPIRATION AND PROGRESSION TESTS PASSED SUCCESSFULLY!');
    console.log('=============================================================');

  } finally {
    if (testUser) {
      await PlacementDrive.deleteMany({ user: testUser._id });
      await User.deleteOne({ _id: testUser._id });
    }
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runJwtAndProgressionTest().catch((err) => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  process.exit(1);
});

