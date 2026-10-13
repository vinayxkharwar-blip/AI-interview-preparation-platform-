import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.NO_AUTO_START = 'true';
process.env.JWT_SECRET = 'test_jwt_secret_super_secure_key_1234567890';

const { default: app } = await import('../server.js');
const { default: User } = await import('../models/User.js');
const { default: Resume } = await import('../models/Resume.js');
const { default: Session } = await import('../models/Session.js');
const { memoryUsers, generateToken } = await import('../controllers/authController.js');
const { memoryResumes } = await import('../controllers/resumeController.js');
const { memorySessions } = await import('../controllers/sessionController.js');

describe('Mock Interview & Dashboard Integration Suite', () => {
  let userA, userAToken;
  let userB, userBToken;
  let userAResumeId;

let mongoServer;

beforeAll(async () => {
  const dotenv = (await import('dotenv')).default;
  const path = (await import('path')).default;
  dotenv.config({ path: path.join(process.cwd(), '.env') });

  const rawUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  let uri;
  if (rawUri && rawUri.includes('mongodb')) {
    uri = rawUri.replace(/\/[^/?]+(\?|$)/, '/ai-interview-prep-dashboard-test$1');
  } else {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);

  // Register Account A
  const resA = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Dashboard Tester A',
      email: `dash_a_${Date.now()}@example.com`,
      password: 'Password123!',
      targetRole: 'Full Stack Engineer',
    });

  userAToken = `Bearer ${resA.body.token}`;
  userA = resA.body.user;

  // Register Account B
  const resB = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Dashboard Tester B',
      email: `dash_b_${Date.now()}@example.com`,
      password: 'Password123!',
      targetRole: 'Data Analyst',
    });

  userBToken = `Bearer ${resB.body.token}`;
  userB = resB.body.user;

  // Create a Resume for User A
  userAResumeId = new mongoose.Types.ObjectId().toString();
  const resumeData = {
    _id: userAResumeId,
    user: userA.id || userA._id,
    fileName: 'Alice_Senior_FullStack.pdf',
    fileType: 'pdf',
    rawText: 'Alice Full Stack Engineer with React, Node.js and AWS',
    parsedData: {
      skills: ['React', 'Node.js', 'AWS', 'Docker'],
      atsScore: 88,
      targetRole: 'Full Stack Engineer',
    },
    createdAt: new Date(),
  };
  memoryResumes.push(resumeData);

  try {
    await Resume.create(resumeData);
  } catch (e) {}
});

afterAll(async () => {
  try {
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (e) {}
});

  describe('1. Mock Interview Creation & Configuration', () => {
    test('creates technical interview with predefined role and valid resumeId', async () => {
      const res = await request(app)
        .post('/api/sessions/start')
        .set('Authorization', userAToken)
        .send({
          resumeId: userAResumeId,
          targetRole: 'Full Stack Engineer',
          interviewType: 'technical',
          difficulty: 'mid',
          count: 5,
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('session');
      expect(res.body.session).toHaveProperty('_id');
      expect(res.body.session.targetRole).toBe('Full Stack Engineer');
      expect(res.body.session.interviewType).toBe('technical');
      expect(res.body.session.status).toBe('in_progress');
      expect(Array.isArray(res.body.questions)).toBe(true);
      expect(res.body.questions.length).toBeGreaterThan(0);
    });

    test('creates behavioral interview with custom target role (e.g. Cybersecurity Analyst)', async () => {
      const res = await request(app)
        .post('/api/sessions/start')
        .set('Authorization', userAToken)
        .send({
          targetRole: 'Cybersecurity Analyst',
          interviewType: 'behavioral',
          difficulty: 'senior',
          count: 5,
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('session');
      expect(res.body.session.targetRole).toBe('Cybersecurity Analyst');
      expect(res.body.session.interviewType).toBe('behavioral');
      expect(res.body.session.difficulty).toBe('senior');
    });

    test('creates HR & cultural screen interview without resume', async () => {
      const res = await request(app)
        .post('/api/sessions/start')
        .set('Authorization', userAToken)
        .send({
          targetRole: 'QA Engineer',
          interviewType: 'hr',
          difficulty: 'mid',
          count: 5,
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.session.interviewType).toBe('hr');
      expect(res.body.session.resume).toBeNull();
    });
  });

  describe('2. Security & Cross-Account Isolation', () => {
    test('User B is forbidden (403) from creating session referencing User A resumeId', async () => {
      const res = await request(app)
        .post('/api/sessions/start')
        .set('Authorization', userBToken)
        .send({
          resumeId: userAResumeId, // User A's private resume
          targetRole: 'Data Analyst',
          interviewType: 'technical',
          difficulty: 'mid',
          count: 5,
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/forbidden|permission/i);
    });

    test('User B only sees their own sessions when fetching /api/sessions', async () => {
      // Create session for User B
      await request(app)
        .post('/api/sessions/start')
        .set('Authorization', userBToken)
        .send({
          targetRole: 'Data Analyst',
          interviewType: 'technical',
          difficulty: 'junior',
          count: 5,
        });

      const resA = await request(app)
        .get('/api/sessions')
        .set('Authorization', userAToken);

      const resB = await request(app)
        .get('/api/sessions')
        .set('Authorization', userBToken);

      expect(resA.status).toBe(200);
      expect(resB.status).toBe(200);

      const aSessionIds = resA.body.map((s) => String(s._id || s.id));
      const bSessionIds = resB.body.map((s) => String(s._id || s.id));

      // No cross-contamination of sessions
      for (const id of bSessionIds) {
        expect(aSessionIds).not.toContain(id);
      }
    });
  });
});
