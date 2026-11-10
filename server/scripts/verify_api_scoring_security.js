import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import aptitudePYQRoutes from '../routes/aptitudePYQRoutes.js';
import AptitudeAttempt from '../models/AptitudeAttempt.js';

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const runVerification = async () => {
  console.log('===========================================================');
  console.log('2. API, SCORING & SECURITY PRODUCTION VERIFICATION AUDIT');
  console.log('===========================================================');

  await connectDB();
  console.log('✅ Connected to MongoDB Atlas.\n');

  // Set up test server
  const app = express();
  app.use(express.json());
  app.use('/api/aptitude', aptitudePYQRoutes);

  const server = app.listen(5099);
  const BASE_URL = 'http://localhost:5099/api/aptitude';

  // Create or retrieve 2 test users for security ownership checks
  let testUserA = await User.findOne({ email: 'audit_student_a@prepilot.ai' });
  if (!testUserA) {
    testUserA = await User.create({
      name: 'Audit Student A',
      email: 'audit_student_a@prepilot.ai',
      password: 'AuditPassword123!',
      role: 'user',
    });
  }

  let testUserB = await User.findOne({ email: 'audit_student_b@prepilot.ai' });
  if (!testUserB) {
    testUserB = await User.create({
      name: 'Audit Student B',
      email: 'audit_student_b@prepilot.ai',
      password: 'AuditPassword123!',
      role: 'user',
    });
  }

  const tokenA = jwt.sign({ id: testUserA._id, email: testUserA.email }, JWT_SECRET, { expiresIn: '1h' });
  const tokenB = jwt.sign({ id: testUserB._id, email: testUserB.email }, JWT_SECRET, { expiresIn: '1h' });
  const expiredToken = jwt.sign({ id: testUserA._id, email: testUserA.email }, JWT_SECRET, { expiresIn: '-1s' });

  console.log('--- A. Testing Public Metadata Endpoints ---');
  // 1. GET /companies
  const compRes = await fetch(`${BASE_URL}/companies`);
  const compData = await compRes.json();
  console.log(`GET /api/aptitude/companies -> Status: ${compRes.status}, Returned: ${compData.companies?.length} companies`);
  if (compRes.status !== 200 || !compData.companies || compData.companies.length < 9) {
    throw new Error('Failed to retrieve companies metadata');
  }

  // 2. GET /categories
  const catRes = await fetch(`${BASE_URL}/categories`);
  const catData = await catRes.json();
  console.log(`GET /api/aptitude/categories -> Status: ${catRes.status}, Returned: ${catData.categories?.length} categories`);
  if (catRes.status !== 200 || !catData.categories || catData.categories.length < 5) {
    throw new Error('Failed to retrieve categories metadata');
  }

  // 3. GET /companies/:company/pattern for each company
  const companiesList = ['TCS', 'Infosys', 'Accenture', 'Wipro', 'Capgemini', 'Cognizant', 'HCLTech', 'Tech Mahindra', 'Deloitte'];
  for (const c of companiesList) {
    const patRes = await fetch(`${BASE_URL}/companies/${encodeURIComponent(c)}/pattern`);
    const patData = await patRes.json();
    if (patRes.status !== 200 || !patData.pattern?.sections || patData.pattern.sections.length === 0) {
      throw new Error(`Pattern endpoint failed for ${c}`);
    }
  }
  console.log('✅ Pattern endpoint verified for all 9 companies.');

  console.log('\n--- B. Testing Test Generation for Every Company ---');
  // Test Quick Practice (10 Qs) and Full Mock (20 Qs) for all 9 companies
  for (const company of companiesList) {
    // 10-Q Quick Practice
    const start10Res = await fetch(`${BASE_URL}/tests/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        company,
        questionCount: 10,
        testMode: 'topic_practice',
      }),
    });
    const start10Data = await start10Res.json();
    if (start10Res.status !== 201 || start10Data.questions?.length !== 10) {
      throw new Error(`10-Q Quick Practice failed for ${company}: received ${start10Data.questions?.length}`);
    }

    // 20-Q Full Mock
    const start20Res = await fetch(`${BASE_URL}/tests/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        company,
        questionCount: 20,
        testMode: 'full_mock',
      }),
    });
    const start20Data = await start20Res.json();
    if (start20Res.status !== 201 || start20Data.questions?.length !== 20) {
      throw new Error(`20-Q Full Mock failed for ${company}: received ${start20Data.questions?.length}`);
    }

    // Easy, Medium, Hard Filtering
    for (const diff of ['Easy', 'Medium', 'Hard']) {
      const diffRes = await fetch(`${BASE_URL}/tests/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          company,
          difficulty: diff,
          questionCount: 5,
        }),
      });
      const diffData = await diffRes.json();
      if (diffRes.status !== 201 || diffData.questions?.length !== 5) {
        throw new Error(`Difficulty filter (${diff}) failed for ${company}`);
      }
    }

    console.log(`  ✓ [${company.padEnd(14)}]: 10-Q practice, 20-Q mock, and Easy/Med/Hard filters verified.`);
  }

  console.log('\n--- C. Testing Topic & Subtopic Practice ---');
  const topicsToTest = [
    { topic: 'Quantitative Aptitude', subtopic: 'Time and Work', count: 10 },
    { topic: 'Logical Reasoning', subtopic: 'Blood Relations', count: 10 },
    { topic: 'Verbal Ability', subtopic: 'Sentence Correction', count: 10 },
    { topic: 'Pseudocode', subtopic: 'Bitwise Operations', count: 5 },
    { topic: 'Programming', subtopic: 'Data Structures (Arrays, Stacks, Queues, Trees)', count: 5 },
  ];

  for (const t of topicsToTest) {
    const drillRes = await fetch(`${BASE_URL}/tests/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        company: 'General Aptitude',
        topic: t.topic,
        subtopic: t.subtopic,
        questionCount: t.count,
        testMode: 'topic_practice',
      }),
    });
    const drillData = await drillRes.json();
    if (drillRes.status !== 201 || drillData.questions?.length !== t.count) {
      throw new Error(`Topic drill failed for ${t.subtopic}: received ${drillData.questions?.length}`);
    }
    console.log(`  ✓ Drill [${t.topic} -> ${t.subtopic}]: returned exact ${drillData.questions?.length} Qs.`);
  }

  console.log('\n--- D. Testing Security & Answer-Key Leak Prevention ---');
  // 1. Unauthorized request
  const unauthRes = await fetch(`${BASE_URL}/tests/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company: 'TCS', questionCount: 5 }),
  });
  console.log(`Unauthorized request -> Status: ${unauthRes.status} (Expected: 401)`);
  if (unauthRes.status !== 401) throw new Error('Unauthenticated request was not blocked!');

  // 2. Expired JWT request
  const expiredRes = await fetch(`${BASE_URL}/tests/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${expiredToken}`,
    },
    body: JSON.stringify({ company: 'TCS', questionCount: 5 }),
  });
  console.log(`Expired JWT request -> Status: ${expiredRes.status} (Expected: 401)`);
  if (expiredRes.status !== 401) throw new Error('Expired token request was not blocked!');

  // 3. Verify answer keys and explanations are NEVER sent to the student before submission
  const secureStartRes = await fetch(`${BASE_URL}/tests/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ company: 'TCS', questionCount: 5 }),
  });
  const secureStartData = await secureStartRes.json();
  const testId = secureStartData.testId;

  let leakedAnswers = false;
  secureStartData.questions.forEach((q) => {
    if (q.correctAnswer !== undefined || q.explanation !== undefined) {
      leakedAnswers = true;
    }
  });

  if (leakedAnswers) {
    throw new Error('SECURITY VIOLATION: correctAnswer or explanation leaked in test payload!');
  }
  console.log('✅ Client Question Payload Sanitize Check: ZERO answers/explanations leaked before submit.');

  console.log('\n--- E. Testing Scoring Engine, Negative Marking & Persistence ---');
  // Fetch the attempt from DB to get the actual correct answers for simulation
  const dbAttempt = await AptitudeAttempt.findById(testId);
  const qList = dbAttempt.questions;

  // Let's answer:
  // Q0: correct
  // Q1: correct
  // Q2: correct
  // Q3: incorrect
  // Q4: unanswered (omit from answers map)
  const answersMap = {};
  answersMap[String(qList[0].questionId)] = qList[0].correctAnswer;
  answersMap[String(qList[1].questionId)] = qList[1].correctAnswer;
  answersMap[String(qList[2].questionId)] = qList[2].correctAnswer;
  answersMap[String(qList[3].questionId)] = 'INCORRECT_CHOICE_XYZ';

  // 1. User B tries to submit User A's test (Forbidden)
  const hijackRes = await fetch(`${BASE_URL}/tests/${testId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`,
    },
    body: JSON.stringify({ answers: answersMap, timeSpentSeconds: 180 }),
  });
  console.log(`Cross-user attempt hijacking test -> Status: ${hijackRes.status} (Expected: 403)`);
  if (hijackRes.status !== 403) throw new Error('Cross-user submission was not blocked with 403!');

  // 2. User A legitimately submits
  const submitRes = await fetch(`${BASE_URL}/tests/${testId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ answers: answersMap, timeSpentSeconds: 215 }),
  });
  const submitData = await submitRes.json();
  console.log(`Legitimate submission -> Status: ${submitRes.status}`);
  if (submitRes.status !== 200) throw new Error('Submission failed');

  const resObj = submitData.result;
  console.log(`Scoring details for 5-question test:`);
  console.log(`  - Total Correct: ${resObj.totalCorrect} (Expected: 3)`);
  console.log(`  - Total Incorrect: ${resObj.totalIncorrect} (Expected: 1)`);
  console.log(`  - Total Unanswered: ${resObj.totalUnanswered} (Expected: 1)`);
  // Raw score: 3 * 1.0 - 1 * 0.25 = 2.75
  console.log(`  - Raw Score: ${resObj.rawScore} (Expected: 2.75)`);
  // Percentage: (2.75 / 5.0) * 100 = 55%
  console.log(`  - Percentage: ${resObj.percentage}% (Expected: 55%)`);
  console.log(`  - Passed Cutoff: ${resObj.passed} (Cutoff is 60%, Expected: false)`);

  if (resObj.totalCorrect !== 3 || resObj.totalIncorrect !== 1 || resObj.totalUnanswered !== 1 || resObj.rawScore !== 2.75) {
    throw new Error('Mathematical scoring error in test evaluation!');
  }
  console.log('✅ Scoring calculation and negative marking verified with 100% mathematical accuracy.');

  // 3. Duplicate submission prevention
  const resubmitRes = await fetch(`${BASE_URL}/tests/${testId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ answers: answersMap }),
  });
  console.log(`Duplicate submission prevention -> Status: ${resubmitRes.status} (Expected: 400)`);
  if (resubmitRes.status !== 400) throw new Error('Duplicate submission was not prevented!');

  // 4. Persistence verification in DB
  const persistedAttempt = await AptitudeAttempt.findById(testId);
  if (persistedAttempt.status !== 'completed' || persistedAttempt.percentage !== 55) {
    throw new Error(`Database persistence mismatch for scored attempt! status=${persistedAttempt.status}, percentage=${persistedAttempt.percentage}`);
  }
  console.log('✅ Attempt result verified successfully persisted in MongoDB Atlas.');

  // Clean up server
  server.close();
  console.log('\n===========================================================');
  console.log('ALL API, SCORING & SECURITY TESTS PASSED PERFECTLY!');
  console.log('===========================================================');
  process.exit(0);
};

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
