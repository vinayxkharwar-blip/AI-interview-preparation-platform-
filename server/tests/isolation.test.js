import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Ensure required environment variables for test mode
process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.NO_AUTO_START = 'true';
process.env.JWT_SECRET = 'test_jwt_secret_super_secure_key_1234567890';

// Import app after env vars are set
const { default: app } = await import('../server.js');
const { default: User } = await import('../models/User.js');
const { default: Resume } = await import('../models/Resume.js');
const { default: Session } = await import('../models/Session.js');
const { default: Question } = await import('../models/Question.js');
const { default: Answer } = await import('../models/Answer.js');
const { default: Feedback } = await import('../models/Feedback.js');
const { default: SavedJob } = await import('../models/SavedJob.js');
const { default: Application } = await import('../models/Application.js');

let mongoServer;

beforeAll(async () => {
  let uri;
  if (process.env.USE_MEMORY_SERVER === 'true') {
    mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
  } else {
    const dotenv = (await import('dotenv')).default;
    const path = (await import('path')).default;
    dotenv.config({ path: path.join(process.cwd(), '.env') });

    const rawUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (rawUri && rawUri.includes('mongodb')) {
      uri = rawUri.replace(/\/[^/?]+(\?|$)/, '/ai-interview-prep-isolation-test$1');
    } else {
      mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
    }
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);

  // Clean test database before test suite runs
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
}, 60000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0 && mongoose.connection.db) {
    try {
      await mongoose.connection.db.dropDatabase();
    } catch (e) {}
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 30000);

describe('Cross-Account Isolation and Security Suite', () => {
  let userAToken, userAId;
  let userBToken, userBId;
  let resumeAId, sessionAId, savedJobAId, applicationAId;

  // 1. SIGNUP & IDENTITY INTEGRITY
  test('Signup creates distinct users and /me returns each token\'s own user', async () => {
    // Register Account A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Account Alice',
        email: 'alice@example.com',
        password: 'Password123!',
        targetRole: 'Full Stack Engineer',
      });

    expect(resA.status).toBe(201);
    expect(resA.body.token).toBeDefined();
    expect(resA.body.user.email).toBe('alice@example.com');
    expect(resA.body.user.name).toBe('Account Alice');
    expect(resA.body.user.password).toBeUndefined(); // Security: No password exposed
    userAToken = resA.body.token;
    userAId = resA.body.user.id || resA.body.user._id;

    // Register Account B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Account Bob',
        email: 'bob@example.com',
        password: 'Password123!',
        targetRole: 'Cyber Security Engineer',
      });

    expect(resB.status).toBe(201);
    expect(resB.body.token).toBeDefined();
    expect(resB.body.user.email).toBe('bob@example.com');
    expect(resB.body.user.name).toBe('Account Bob');
    expect(resB.body.user.password).toBeUndefined(); // Security: No password exposed
    userBToken = resB.body.token;
    userBId = resB.body.user.id || resB.body.user._id;

    // Verify A != B
    expect(userAId).not.toBe(userBId);
    expect(userAToken).not.toBe(userBToken);

    // Verify /api/auth/me resolves own user for A
    const meA = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(meA.status).toBe(200);
    expect(meA.body.user.email).toBe('alice@example.com');
    expect(meA.body.user.name).toBe('Account Alice');
    expect(meA.body.user.password).toBeUndefined();

    // Verify /api/auth/me resolves own user for B
    const meB = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userBToken}`);
    expect(meB.status).toBe(200);
    expect(meB.body.user.email).toBe('bob@example.com');
    expect(meB.body.user.name).toBe('Account Bob');
    expect(meB.body.user.password).toBeUndefined();
  });

  // 2. AUTHENTICATION GUARDS (401 on Missing/Invalid/Expired Token)
  test('Missing, invalid, or forged token returns 401', async () => {
    // Missing token
    const resMissing = await request(app).get('/api/auth/me');
    expect(resMissing.status).toBe(401);

    // Invalid token
    const resInvalid = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid_signature_token');
    expect(resInvalid.status).toBe(401);

    // Forged token signed with wrong secret
    const jwt = (await import('jsonwebtoken')).default;
    const forgedToken = jwt.sign(
      { id: userAId, email: 'alice@example.com' },
      'wrong_unauthorized_secret_key'
    );
    const resForged = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${forgedToken}`);
    expect(resForged.status).toBe(401);
  });

  // 3. SEED USER A RECORDS FOR CROSS-ACCOUNT ISOLATION CHECKS
  test('Setup: Create user A personal records (Resume, Session, Application, Saved Job)', async () => {
    // Create Resume for A
    const resumeDoc = await Resume.create({
      user: userAId,
      fileName: 'alice_resume.pdf',
      fileType: 'pdf',
      rawText: 'Alice Full Stack Developer with React, Node, MongoDB',
      parsedData: {
        atsScore: 92,
        targetRole: 'Full Stack Engineer',
        skills: ['React', 'Node.js', 'MongoDB'],
      },
    });
    resumeAId = resumeDoc._id.toString();

    // Create Session for A
    const sessionDoc = await Session.create({
      user: userAId,
      resume: resumeDoc._id,
      targetRole: 'Full Stack Engineer',
      interviewType: 'technical',
      difficulty: 'senior',
      totalQuestions: 3,
      status: 'in_progress',
    });
    sessionAId = sessionDoc._id.toString();

    // Create Question for A's session
    const questionDoc = await Question.create({
      session: sessionAId,
      questionNumber: 1,
      questionText: 'Explain React reconciliation algorithm.',
      category: 'Frontend',
    });

    // Create Saved Job for A
    const savedJobDoc = await SavedJob.create({
      user: userAId,
      jobId: 'job-stripe-101',
      title: 'Senior Engineer',
      company: 'Stripe',
      matchPercentage: 90,
    });
    savedJobAId = savedJobDoc._id.toString();

    // Create Application for A
    const appDoc = await Application.create({
      user: userAId,
      jobId: 'job-stripe-101',
      title: 'Senior Engineer',
      company: 'Stripe',
      status: 'interview',
    });
    applicationAId = appDoc._id.toString();

    expect(resumeAId).toBeDefined();
    expect(sessionAId).toBeDefined();
    expect(savedJobAId).toBeDefined();
    expect(applicationAId).toBeDefined();
  });

  // 4. RESUMES ISOLATION
  test('User B cannot list or read User A resumes', async () => {
    // B lists resumes -> must be empty
    const listRes = await request(app)
      .get('/api/resumes')
      .set('Authorization', `Bearer ${userBToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body).toEqual([]);

    // B attempts to read A's resume by ID -> 403 or 404
    const getRes = await request(app)
      .get(`/api/resumes/${resumeAId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect([403, 404]).toContain(getRes.status);
  });

  // 5. INTERVIEW SESSIONS ISOLATION
  test('User B cannot list, read, complete, or invoke live actions on User A sessions', async () => {
    // B lists sessions -> must be empty
    const listRes = await request(app)
      .get('/api/sessions')
      .set('Authorization', `Bearer ${userBToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body).toEqual([]);

    // B attempts to read A's session by ID -> 403 or 404
    const getRes = await request(app)
      .get(`/api/sessions/${sessionAId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect([403, 404]).toContain(getRes.status);

    // B attempts to complete A's session -> 403 or 404
    const completeRes = await request(app)
      .post(`/api/sessions/${sessionAId}/complete`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect([403, 404]).toContain(completeRes.status);

    // B attempts to get live token for A's session -> 403 or 404
    const liveTokenRes = await request(app)
      .post(`/api/sessions/${sessionAId}/live/token`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect([403, 404]).toContain(liveTokenRes.status);

    // B attempts to take live turn on A's session -> 403 or 404
    const liveTurnRes = await request(app)
      .post(`/api/sessions/${sessionAId}/live/turn`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ userTranscript: 'Unauthorized turn' });
    expect([403, 404]).toContain(liveTurnRes.status);

    // B attempts to synthesize TTS on A's session -> 403 or 404
    const liveTtsRes = await request(app)
      .post(`/api/sessions/${sessionAId}/live/tts`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ text: 'Hello' });
    expect([403, 404]).toContain(liveTtsRes.status);

    // B attempts to complete live session for A -> 403 or 404
    const liveCompleteRes = await request(app)
      .post(`/api/sessions/${sessionAId}/live/complete`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect([403, 404]).toContain(liveCompleteRes.status);
  });

  // 6. QUESTIONS, ANSWERS & FEEDBACK ISOLATION
  test('User B cannot read questions, submit answers, or read feedback for User A session', async () => {
    // B attempts to get questions for A's session -> 403 or 404
    const qRes = await request(app)
      .get(`/api/questions/session/${sessionAId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect([403, 404]).toContain(qRes.status);

    // B attempts to submit answer to A's session -> 403 or 404
    const ansRes = await request(app)
      .post('/api/answers/submit')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        sessionId: sessionAId,
        questionId: new mongoose.Types.ObjectId().toString(),
        transcript: 'Hacked answer',
      });
    expect([403, 404]).toContain(ansRes.status);

    // B attempts to read feedback for A's session -> 403 or 404
    const fbRes = await request(app)
      .get(`/api/feedback/session/${sessionAId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect([403, 404]).toContain(fbRes.status);
  });

  // 7. SAVED JOBS & APPLICATIONS ISOLATION
  test('User B cannot list or delete User A saved jobs, nor list or update User A applications', async () => {
    // B lists saved jobs -> empty
    const listJobs = await request(app)
      .get('/api/jobs/saved')
      .set('Authorization', `Bearer ${userBToken}`);
    expect(listJobs.status).toBe(200);
    expect(listJobs.body).toEqual([]);

    // B attempts to delete A's saved job -> 403 or 404
    const delJob = await request(app)
      .delete(`/api/jobs/save/${savedJobAId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect([403, 404]).toContain(delJob.status);

    // B lists applications -> empty
    const listApps = await request(app)
      .get('/api/applications')
      .set('Authorization', `Bearer ${userBToken}`);
    expect(listApps.status).toBe(200);
    expect(listApps.body).toEqual([]);

    // B attempts to update A's application status -> 403 or 404
    const updateApp = await request(app)
      .patch(`/api/applications/${applicationAId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ status: 'rejected' });
    expect([403, 404]).toContain(updateApp.status);
  });

  // 8. COVER LETTER GENERATION WITH ANOTHER USER'S RESUME
  test('User B cannot generate cover letter referencing User A resumeId', async () => {
    const clRes = await request(app)
      .post('/api/cover-letter')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        company: 'Target Corp',
        role: 'Security Engineer',
        resumeId: resumeAId,
      });
    expect([403, 404]).toContain(clRes.status);
  });

  // 9. DASHBOARD ANALYTICS ISOLATION (NO GHOST / DEMO DATA INHERITANCE)
  test('User B gets honest empty analytics (0 sessions, 0 answers, empty charts)', async () => {
    const analyticsRes = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.summary.totalSessions).toBe(0);
    expect(analyticsRes.body.summary.totalAnswers).toBe(0);
    expect(analyticsRes.body.summary.avgScore).toBe(0);
    expect(analyticsRes.body.scoreTrend).toEqual([]);
    expect(analyticsRes.body.skillScores).toEqual([]);
    expect(analyticsRes.body.weakTopics).toEqual([]);
  });

  // 10. SENSITIVE CREDENTIALS INTEGRITY
  test('No password or secret appears in user profile or API responses', async () => {
    const meA = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userAToken}`);

    const userJson = JSON.stringify(meA.body);
    expect(userJson).not.toMatch(/"password"/i);
    expect(userJson).not.toMatch(/\$2[aby]\$/i); // Bcrypt hash signature
  });
});
