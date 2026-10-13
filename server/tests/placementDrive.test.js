import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.NO_AUTO_START = 'true';
process.env.JWT_SECRET = 'test_jwt_secret_super_secure_key_1234567890';

// Import services and app
const { default: app } = await import('../server.js');
const { default: User } = await import('../models/User.js');
const { default: PlacementDrive } = await import('../models/PlacementDrive.js');
const { evaluateAptitudeAnswers, generateAptitudeTest } = await import('../services/aptitudeService.js');
const { evaluateGDPerformance, initializeGDRound, generatePeerResponses } = await import('../services/gdService.js');

const { memoryUsers, generateToken } = await import('../controllers/authController.js');

describe('AI Placement Drive Test Suite', () => {
  let userAToken, userAId;
  let userBToken, userBId;
  let userADriveId;

  beforeAll(async () => {
    userAId = new mongoose.Types.ObjectId().toString();
    userBId = new mongoose.Types.ObjectId().toString();

    const userA = {
      _id: userAId,
      id: userAId,
      name: 'Candidate Alice',
      email: `alice_${Date.now()}@example.com`,
      targetRole: 'Full Stack Engineer',
    };
    const userB = {
      _id: userBId,
      id: userBId,
      name: 'Candidate Bob',
      email: `bob_${Date.now()}@example.com`,
      targetRole: 'Backend Engineer',
    };

    memoryUsers.push(userA);
    memoryUsers.push(userB);

    if (mongoose.connection.readyState === 1) {
      try {
        await User.create(userA);
        await User.create(userB);
      } catch (e) {}
    }

    userAToken = `Bearer ${generateToken(userAId, userA.name, userA.email, userA.targetRole)}`;
    userBToken = `Bearer ${generateToken(userBId, userB.name, userB.email, userB.targetRole)}`;
  });

  // =========================================================================
  // 1. APTITUDE SERVICE UNIT TESTS (Scoring, Breakdowns, Validation)
  // =========================================================================
  describe('1. Aptitude Scoring & Answer Validation', () => {
    test('generateAptitudeTest creates 15 questions with 5 in each section', () => {
      const { fullQuestions, clientQuestions } = generateAptitudeTest();
      expect(fullQuestions).toHaveLength(15);
      expect(clientQuestions).toHaveLength(15);

      const quant = fullQuestions.filter((q) => q.section === 'quantitative');
      const logic = fullQuestions.filter((q) => q.section === 'logical');
      const verbal = fullQuestions.filter((q) => q.section === 'verbal');

      expect(quant).toHaveLength(5);
      expect(logic).toHaveLength(5);
      expect(verbal).toHaveLength(5);

      // Verify client questions do NOT expose correctOption or explanation
      clientQuestions.forEach((q) => {
        expect(q.correctOption).toBeUndefined();
        expect(q.explanation).toBeUndefined();
        expect(q.options).toBeDefined();
        expect(q.questionText).toBeDefined();
      });
    });

    test('evaluateAptitudeAnswers correctly scores 100% when all answers match', () => {
      const { fullQuestions } = generateAptitudeTest();
      const allCorrectAnswers = {};
      fullQuestions.forEach((q) => {
        allCorrectAnswers[q.id] = q.correctOption;
      });

      const result = evaluateAptitudeAnswers(fullQuestions, allCorrectAnswers);
      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.totalCorrect).toBe(15);
      expect(result.breakdown.quantitative.score).toBe(5);
      expect(result.breakdown.logical.score).toBe(5);
      expect(result.breakdown.verbal.score).toBe(5);
    });

    test('evaluateAptitudeAnswers correctly identifies failure when score < 60%', () => {
      const { fullQuestions } = generateAptitudeTest();
      // Only answer 5 out of 15 questions correctly (33.3% < 60%)
      const lowAnswers = {};
      fullQuestions.slice(0, 5).forEach((q) => {
        lowAnswers[q.id] = q.correctOption;
      });

      const result = evaluateAptitudeAnswers(fullQuestions, lowAnswers);
      expect(result.score).toBe(33);
      expect(result.passed).toBe(false);
      expect(result.totalCorrect).toBe(5);
    });
  });

  // =========================================================================
  // 2. GROUP DISCUSSION SERVICE UNIT TESTS (Rubrics & Peer Responses)
  // =========================================================================
  describe('2. GD Simulation & Rubric Evaluation', () => {
    test('initializeGDRound produces initial topic context and moderator opening', () => {
      const gd = initializeGDRound(0);
      expect(gd.topic).toBeDefined();
      expect(gd.discussionContext).toBeDefined();
      expect(gd.transcript.length).toBeGreaterThanOrEqual(3);
      expect(gd.transcript[0].speaker).toContain('Moderator');
    });

    test('generatePeerResponses produces Ananya and Moderator responses', async () => {
      const responses = await generatePeerResponses('I think AI requires balanced human review and continuous security checks.');
      expect(responses.length).toBeGreaterThanOrEqual(1);
      expect(responses[0].speaker).toContain('Ananya');
    });

    test('evaluateGDPerformance computes 4 rubrics with 0-25 scale and passes high quality answer', async () => {
      const transcript = [
        { speaker: 'Moderator', role: 'moderator', text: 'Welcome to the discussion.' },
        { speaker: 'Candidate', role: 'candidate', text: 'In my view, AI accelerates developer velocity, but we must balance this with strict code review and testing standards. We need human architectural oversight.' },
        { speaker: 'Ananya', role: 'participant', text: 'I agree with candidate points.' },
        { speaker: 'Candidate', role: 'candidate', text: 'Furthermore, junior mentorship must adapt so new engineers learn runtime internals and system reliability.' }
      ];

      const evaluation = await evaluateGDPerformance(transcript, 'AI in Engineering');
      expect(evaluation.score).toBeGreaterThanOrEqual(60);
      expect(evaluation.passed).toBe(true);
      expect(evaluation.rubrics.clarityAndArticulation).toBeGreaterThan(0);
      expect(evaluation.rubrics.problemSolvingAndIdeas).toBeGreaterThan(0);
      expect(evaluation.rubrics.collaborationAndListening).toBeGreaterThan(0);
      expect(evaluation.rubrics.persuasionAndConfidence).toBeGreaterThan(0);
    });

    test('evaluateGDPerformance fails candidate with insufficient participation', async () => {
      const emptyTranscript = [
        { speaker: 'Moderator', role: 'moderator', text: 'Welcome.' },
      ];
      const evaluation = await evaluateGDPerformance(emptyTranscript, 'AI');
      expect(evaluation.score).toBeLessThan(60);
      expect(evaluation.passed).toBe(false);
    });
  });

  // =========================================================================
  // 3. JOURNEY CREATION & INITIAL STATE
  // =========================================================================
  describe('3. Placement Drive Journey Initialization', () => {
    test('GET /api/placement/current initializes active drive for User A with Round 1 unlocked', async () => {
      const res = await request(app)
        .get('/api/placement/current')
        .set('Authorization', userAToken);

      expect(res.status).toBe(200);
      expect(res.body.drive).toBeDefined();
      userADriveId = res.body.drive._id || res.body.drive.id;

      const drive = res.body.drive;
      expect(drive.currentRound).toBe(1);
      expect(drive.status).toBe('in_progress');
      expect(drive.rounds.round1_aptitude.status).toBe('unlocked');
      expect(drive.rounds.round2_technical.status).toBe('locked');
      expect(drive.rounds.round3_gd.status).toBe('locked');
      expect(drive.rounds.round4_resume.status).toBe('locked');
    });

    test('GET /api/placement/:id retrieves drive for authorized owner', async () => {
      const res = await request(app)
        .get(`/api/placement/${userADriveId}`)
        .set('Authorization', userAToken);

      expect(res.status).toBe(200);
      expect(res.body.drive._id).toBe(userADriveId);
    });
  });

  // =========================================================================
  // 4. ROUND PROGRESSION & UNLOCK ENFORCEMENT
  // =========================================================================
  describe('4. Server-Side Round Unlocking & Progression Rules', () => {
    test('Reject starting Round 2 Technical when Round 1 Aptitude is NOT passed', async () => {
      const res = await request(app)
        .post(`/api/placement/${userADriveId}/technical/start`)
        .set('Authorization', userAToken)
        .send({ difficulty: 'mid' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Round 1');
      expect(res.body.message).toContain('must be successfully passed');
    });

    test('Reject starting Round 3 GD when Round 2 Technical is NOT passed', async () => {
      const res = await request(app)
        .post(`/api/placement/${userADriveId}/gd/start`)
        .set('Authorization', userAToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Round 2');
    });

    test('Reject starting Round 4 Resume when Round 3 GD is NOT passed', async () => {
      const res = await request(app)
        .post(`/api/placement/${userADriveId}/resume-round/start`)
        .set('Authorization', userAToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Round 3');
    });
  });

  // =========================================================================
  // 5. ROUND 1: APTITUDE TEST FLOW & UNLOCKING ROUND 2
  // =========================================================================
  describe('5. Round 1 Aptitude Execution & Progression', () => {
    let activeQuestions = [];

    test('POST /api/placement/:id/aptitude/start starts test and delivers sanitized questions', async () => {
      const res = await request(app)
        .post(`/api/placement/${userADriveId}/aptitude/start`)
        .set('Authorization', userAToken);

      expect(res.status).toBe(200);
      expect(res.body.questions).toHaveLength(15);
      activeQuestions = res.body.questions;

      // Ensure no answer leaks
      activeQuestions.forEach((q) => {
        expect(q.correctOption).toBeUndefined();
      });
    });

    test('POST /api/placement/:id/aptitude/submit evaluates answers and unlocks Round 2 when score >= 60%', async () => {
      // Find server drive to get correct answers for testing pass condition
      const driveRes = await request(app)
        .get(`/api/placement/${userADriveId}`)
        .set('Authorization', userAToken);

      const serverQuestions = driveRes.body.drive.rounds.round1_aptitude.questions || [];
      const answers = {};
      serverQuestions.forEach((q) => {
        answers[q.questionId] = q.correctOption;
      });

      const res = await request(app)
        .post(`/api/placement/${userADriveId}/aptitude/submit`)
        .set('Authorization', userAToken)
        .send({ answers, timeSpentSeconds: 120 });

      expect(res.status).toBe(200);
      expect(res.body.result.passed).toBe(true);
      expect(res.body.result.score).toBe(100);
      expect(res.body.drive.currentRound).toBe(2);
      expect(res.body.drive.rounds.round2_technical.status).toBe('unlocked');
    });

    test('Concurrent / duplicate submission after passing is rejected', async () => {
      const res = await request(app)
        .post(`/api/placement/${userADriveId}/aptitude/submit`)
        .set('Authorization', userAToken)
        .send({ answers: {} });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already been passed');
    });
  });

  // =========================================================================
  // 6. CROSS-ACCOUNT AUTHORIZATION ISOLATION
  // =========================================================================
  describe('6. Cross-Account Security & Access Control', () => {
    test('User B is FORBIDDEN from reading User A\'s placement drive (403)', async () => {
      const res = await request(app)
        .get(`/api/placement/${userADriveId}`)
        .set('Authorization', userBToken);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });

    test('User B is FORBIDDEN from starting aptitude test on User A\'s drive (403)', async () => {
      const res = await request(app)
        .post(`/api/placement/${userADriveId}/aptitude/start`)
        .set('Authorization', userBToken);

      expect(res.status).toBe(403);
    });

    test('User B is FORBIDDEN from submitting answers to User A\'s drive (403)', async () => {
      const res = await request(app)
        .post(`/api/placement/${userADriveId}/aptitude/submit`)
        .set('Authorization', userBToken)
        .send({ answers: {} });

      expect(res.status).toBe(403);
    });

    test('User B gets their own distinct placement drive on /api/placement/current', async () => {
      const res = await request(app)
        .get('/api/placement/current')
        .set('Authorization', userBToken);

      expect(res.status).toBe(200);
      expect(res.body.drive).toBeDefined();
      const userBDriveId = res.body.drive._id || res.body.drive.id;
      expect(userBDriveId).not.toBe(userADriveId);
      expect(res.body.drive.rounds.round1_aptitude.passed).toBe(false);
    });
  });

  // =========================================================================
  // 7. ROUND 2 TECHNICAL INTERVIEW INTEGRATION
  // =========================================================================
  describe('7. Round 2 Technical Integration & Sync', () => {
    let technicalSessionId;

    test('POST /api/placement/:id/technical/start creates linked Session and generates questions', async () => {
      const res = await request(app)
        .post(`/api/placement/${userADriveId}/technical/start`)
        .set('Authorization', userAToken)
        .send({ difficulty: 'mid' });

      expect(res.status).toBe(200);
      expect(res.body.sessionId).toBeDefined();
      expect(res.body.questions).toHaveLength(5);
      technicalSessionId = res.body.sessionId;
    });

    test('Simulate completing technical interview session and syncing Round 2', async () => {
      // Simulate session score in session
      const { memorySessions } = await import('../controllers/sessionController.js');
      const sess = memorySessions.find((s) => String(s._id) === String(technicalSessionId));
      if (sess) {
        sess.overallScore = 8.5; // 8.5 out of 10 => 85%
        sess.status = 'completed';
      }

      const res = await request(app)
        .post(`/api/placement/${userADriveId}/technical/sync`)
        .set('Authorization', userAToken);

      expect(res.status).toBe(200);
      expect(res.body.passed).toBe(true);
      expect(res.body.score).toBe(85);
      expect(res.body.drive.currentRound).toBe(3);
      expect(res.body.drive.rounds.round3_gd.status).toBe('unlocked');
    });
  });

  // =========================================================================
  // 8. ROUND 3 GROUP DISCUSSION SIMULATION
  // =========================================================================
  describe('8. Round 3 Group Discussion Flow', () => {
    test('POST /api/placement/:id/gd/start initializes topic and opening speeches', async () => {
      const res = await request(app)
        .post(`/api/placement/${userADriveId}/gd/start`)
        .set('Authorization', userAToken);

      expect(res.status).toBe(200);
      expect(res.body.topic).toBeDefined();
      expect(res.body.transcript.length).toBeGreaterThanOrEqual(3);
    });

    test('POST /api/placement/:id/gd/message posts candidate contribution and receives AI peer reactions', async () => {
      const res = await request(app)
        .post(`/api/placement/${userADriveId}/gd/message`)
        .set('Authorization', userAToken)
        .send({
          message: 'While AI enhances developer efficiency, security architecture and system reliability require human critical thinking and disciplined testing.',
        });

      expect(res.status).toBe(200);
      expect(res.body.candidateMessage.text).toContain('While AI enhances');
      expect(res.body.peerResponses.length).toBeGreaterThanOrEqual(1);
    });

    test('POST /api/placement/:id/gd/evaluate computes rubric scores and unlocks Round 4', async () => {
      const res = await request(app)
        .post(`/api/placement/${userADriveId}/gd/evaluate`)
        .set('Authorization', userAToken);

      expect(res.status).toBe(200);
      expect(res.body.evaluation.score).toBeGreaterThanOrEqual(60);
      expect(res.body.drive.currentRound).toBe(4);
      expect(res.body.drive.rounds.round4_resume.status).toBe('unlocked');
    });
  });

  // =========================================================================
  // 9. ROUND 4 RESUME INTERVIEW & FINAL REPORT
  // =========================================================================
  describe('9. Round 4 Resume-Based Interview & Final Scorecard', () => {
    let resumeSessionId;

    test('POST /api/placement/:id/resume-round/start creates personalized session', async () => {
      const res = await request(app)
        .post(`/api/placement/${userADriveId}/resume-round/start`)
        .set('Authorization', userAToken);

      expect(res.status).toBe(200);
      expect(res.body.sessionId).toBeDefined();
      expect(res.body.questions).toHaveLength(5);
      resumeSessionId = res.body.sessionId;
    });

    test('Simulate completing resume session and syncing final round', async () => {
      const { memorySessions } = await import('../controllers/sessionController.js');
      const sess = memorySessions.find((s) => String(s._id) === String(resumeSessionId));
      if (sess) {
        sess.overallScore = 9.0; // 90%
        sess.status = 'completed';
      }

      const res = await request(app)
        .post(`/api/placement/${userADriveId}/resume-round/sync`)
        .set('Authorization', userAToken);

      expect(res.status).toBe(200);
      expect(res.body.passed).toBe(true);
      expect(res.body.drive.status).toBe('completed');
      expect(res.body.drive.currentRound).toBe(5);
      expect(res.body.drive.finalReport).toBeDefined();
    });

    test('GET /api/placement/:id/report compiles comprehensive 4-round scorecard', async () => {
      const res = await request(app)
        .get(`/api/placement/${userADriveId}/report`)
        .set('Authorization', userAToken);

      expect(res.status).toBe(200);
      const report = res.body.finalReport;
      expect(report.verdict).toBe('SELECTED');
      expect(report.roundSummary).toHaveLength(4);
      expect(report.readinessScore).toBeGreaterThanOrEqual(80);
      expect(report.topStrengths.length).toBeGreaterThan(0);
      expect(report.areasForImprovement.length).toBeGreaterThan(0);
      expect(report.executiveSummary).toContain('candidate demonstrated outstanding proficiency');
    });
  });

  // =========================================================================
  // 10. RETRY LIMITS & FAILURE STATE
  // =========================================================================
  describe('10. Retry Limits & Attempt Counting', () => {
    test('Round status becomes failed when maxAttempts (3) is exceeded without passing', async () => {
      // Create new drive for user B
      const startRes = await request(app)
        .post('/api/placement/start')
        .set('Authorization', userBToken)
        .send({ targetRole: 'Backend Engineer' });

      const bDriveId = startRes.body.drive._id || startRes.body.drive.id;

      // Fail 3 times
      for (let attempt = 1; attempt <= 3; attempt++) {
        await request(app)
          .post(`/api/placement/${bDriveId}/aptitude/start`)
          .set('Authorization', userBToken);

        const subRes = await request(app)
          .post(`/api/placement/${bDriveId}/aptitude/submit`)
          .set('Authorization', userBToken)
          .send({ answers: {}, timeSpentSeconds: 10 });

        expect(subRes.status).toBe(200);
        expect(subRes.body.result.passed).toBe(false);
        expect(subRes.body.result.attempts).toBe(attempt);
      }

      // 4th attempt should be blocked by retry limit
      const blockedRes = await request(app)
        .post(`/api/placement/${bDriveId}/aptitude/start`)
        .set('Authorization', userBToken);

      expect(blockedRes.status).toBe(400);
      expect(blockedRes.body.message).toContain('Maximum retry limit');
    });
  });
});
