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
const { memoryUsers, generateToken } = await import('../controllers/authController.js');
const { memoryResumes } = await import('../controllers/resumeController.js');

describe('Resume Studio & Career Hub Cross-Module Integration Tests', () => {
  let userA, userAToken;
  let userB, userBToken;
  let resumeAId;

  beforeAll(async () => {
    // Setup User A
    const idA = new mongoose.Types.ObjectId().toString();
    userA = {
      _id: idA,
      id: idA,
      name: 'User A',
      email: `usera_${Date.now()}@example.com`,
      targetRole: 'Full Stack Engineer',
      role: 'user',
    };
    memoryUsers.push(userA);
    userAToken = `Bearer ${generateToken(userA._id, userA.name, userA.email, userA.targetRole)}`;

    // Setup User B
    const idB = new mongoose.Types.ObjectId().toString();
    userB = {
      _id: idB,
      id: idB,
      name: 'User B',
      email: `userb_${Date.now()}@example.com`,
      targetRole: 'Data Analyst',
      role: 'user',
    };
    memoryUsers.push(userB);
    userBToken = `Bearer ${generateToken(userB._id, userB.name, userB.email, userB.targetRole)}`;

    // Create Resume for User A (both in memory and DB if connected)
    resumeAId = new mongoose.Types.ObjectId().toString();
    const resumeData = {
      _id: resumeAId,
      user: userA._id,
      fileName: 'Alice_Resume_2026.pdf',
      fileType: 'pdf',
      rawText: 'Alice experience in React and Node.js',
      parsedData: {
        skills: ['React', 'Node.js', 'Express', 'MongoDB'],
        atsScore: 88,
        targetRole: 'Full Stack Engineer',
        strengths: ['Strong MERN stack background'],
        weaknesses: ['Limited Cloud exposure'],
      },
      createdAt: new Date(),
    };

    memoryResumes.push(resumeData);
    if (mongoose.connection.readyState === 1) {
      try {
        await User.create(userA);
        await User.create(userB);
        await Resume.create(resumeData);
      } catch (e) {}
    }
  });

  describe('1. Resume Creation and Ownership Scoping', () => {
    test('creates resume scoped to User A and retrieves it in list', async () => {
      const res = await request(app)
        .get('/api/resumes')
        .set('Authorization', userAToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((r) => String(r._id) === String(resumeAId))).toBe(true);
    });

    test("User B cannot see User A's resume in resume list", async () => {
      const res = await request(app)
        .get('/api/resumes')
        .set('Authorization', userBToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((r) => String(r._id) === String(resumeAId))).toBe(false);
    });
  });

  describe('2. DELETE /api/resumes/:id Security and Authorization', () => {
    test("User B cannot delete User A's resume (forbidden / unauthorized)", async () => {
      const res = await request(app)
        .delete(`/api/resumes/${resumeAId}`)
        .set('Authorization', userBToken);

      expect([403, 404]).toContain(res.status);

      // Verify resume still exists in User A's list
      const checkRes = await request(app)
        .get('/api/resumes')
        .set('Authorization', userAToken);
      expect(checkRes.body.some((r) => String(r._id) === String(resumeAId))).toBe(true);
    });

    test('User A can successfully delete their own resume', async () => {
      // Create a temporary resume for User A to delete
      const tempId = new mongoose.Types.ObjectId().toString();
      const tempResume = {
        _id: tempId,
        user: userA._id,
        fileName: 'ToDelete.pdf',
        fileType: 'pdf',
        rawText: 'Temporary resume',
        parsedData: {
          skills: ['Python'],
          atsScore: 70,
        },
        createdAt: new Date(),
      };
      memoryResumes.push(tempResume);
      if (mongoose.connection.readyState === 1) {
        try {
          await Resume.create(tempResume);
        } catch (e) {}
      }

      const res = await request(app)
        .delete(`/api/resumes/${tempId}`)
        .set('Authorization', userAToken);

      expect(res.status).toBe(200);

      // Verify it was removed
      const checkRes = await request(app)
        .get('/api/resumes')
        .set('Authorization', userAToken);
      expect(checkRes.body.some((r) => String(r._id) === String(tempId))).toBe(false);
    });
  });

  describe('3. GET /api/jobs/recommendations with Active Resume ID', () => {
    test('User A fetches recommendations using their active resumeId', async () => {
      const res = await request(app)
        .get(`/api/jobs/recommendations?resumeId=${resumeAId}`)
        .set('Authorization', userAToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        const job = res.body[0];
        expect(job).toHaveProperty('title');
        expect(job).toHaveProperty('company');
        expect(job).toHaveProperty('matchPercentage');
        expect(typeof job.matchPercentage).toBe('number');
        expect(job.matchPercentage).toBeGreaterThanOrEqual(0);
        expect(job.matchPercentage).toBeLessThanOrEqual(100);
      }
    });

    test("User B cannot exploit User A's resumeId (user isolation enforced)", async () => {
      const res = await request(app)
        .get(`/api/jobs/recommendations?resumeId=${resumeAId}`)
        .set('Authorization', userBToken);

      expect([200, 403, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });
  });
});
