import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.NO_AUTO_START = 'true';
process.env.JWT_SECRET = 'test_jwt_secret_super_secure_key_1234567890';

const { default: app } = await import('../server.js');
const { default: User } = await import('../models/User.js');
const { default: Session } = await import('../models/Session.js');
const { default: Question } = await import('../models/Question.js');
const { memoryUsers, generateToken } = await import('../controllers/authController.js');
const { verifyDocumentMagicBytes } = await import('../middleware/uploadMiddleware.js');
const { shouldSkipRateLimit } = await import('../middleware/rateLimiter.js');

describe('Security & Data Integrity Regression Test Suite', () => {
  let regularToken, testUserId, testUserDoc;

  beforeAll(async () => {
    const dotenv = (await import('dotenv')).default;
    dotenv.config({ path: path.join(process.cwd(), '.env') });

    const rawUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (mongoose.connection.readyState === 0 && rawUri) {
      await mongoose.connect(rawUri);
    }

    // Create a verified test user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('CorrectPassword123!', salt);

    testUserDoc = await User.create({
      name: 'Regression Tester',
      email: `regtester_${Date.now()}@example.com`,
      password: hashedPassword,
      targetRole: 'Full Stack Engineer',
      role: 'user',
    });

    testUserId = testUserDoc._id.toString();
    regularToken = `Bearer ${generateToken(testUserId, testUserDoc.name, testUserDoc.email, testUserDoc.targetRole, 'user')}`;
  }, 30000);

  afterAll(async () => {
    if (testUserId && mongoose.connection.readyState === 1) {
      await User.deleteOne({ _id: testUserId });
      await Session.deleteMany({ user: testUserId });
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('1. Registration Role Escalation Prevention', () => {
    test('public registration with role:"admin" forces role to "user"', async () => {
      const email = `attacker_${Date.now()}@test.com`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Privilege Escalation Tester',
          email,
          password: 'Password123!',
          targetRole: 'Full Stack Engineer',
          role: 'admin', // Malicious attempt to self-promote to admin
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('user');

      // Verify database record
      if (mongoose.connection.readyState === 1) {
        const savedUser = await User.findOne({ email });
        expect(savedUser).not.toBeNull();
        expect(savedUser.role).toBe('user');
        await User.deleteOne({ email });
      }
    });

    test('regular user cannot access admin-only aptitude management endpoints', async () => {
      const res = await request(app)
        .get('/api/admin/aptitude/questions')
        .set('Authorization', regularToken);

      // Must be rejected with 403 Forbidden
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/admin.*required/i);
    });
  });

  describe('2. Rate Limiting Header Bypass Prevention', () => {
    test('production mode strictly rejects client-supplied x-test-mode header', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';

        const mockReqWithHeader = {
          headers: { 'x-test-mode': 'true' },
        };

        // In production, skip must return false even if x-test-mode: true is present
        const isSkipped = shouldSkipRateLimit(mockReqWithHeader);
        expect(isSkipped).toBe(false);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });

    test('test mode permits skip when NODE_ENV is test', () => {
      const isSkipped = shouldSkipRateLimit({ headers: {} });
      expect(isSkipped).toBe(true);
    });
  });

  describe('3. Account Deletion Reauthentication & Cascade Cleanup', () => {
    test('account deletion requires password confirmation', async () => {
      // 1. Missing password
      const noPassRes = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', regularToken)
        .send({});

      expect(noPassRes.status).toBe(400);
      expect(noPassRes.body.message).toMatch(/password confirmation is required/i);

      // 2. Incorrect password
      const wrongPassRes = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', regularToken)
        .send({ password: 'WrongPassword999!' });

      expect(wrongPassRes.status).toBe(400);
      expect(wrongPassRes.body.message).toMatch(/incorrect password/i);
    });
  });

  describe('4. Answer Submission Validation & Security', () => {
    test('rejects transcript exceeding length limits', async () => {
      const sessionId = new mongoose.Types.ObjectId().toString();
      const questionId = new mongoose.Types.ObjectId().toString();

      // Giant transcript > 8000 characters
      const oversizedTranscript = 'A'.repeat(8500);

      const res = await request(app)
        .post('/api/answers/submit')
        .set('Authorization', regularToken)
        .send({
          sessionId,
          questionId,
          transcript: oversizedTranscript,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/maximum allowed length/i);
    });

    test('rejects answer submission for non-existent question', async () => {
      const sessionId = new mongoose.Types.ObjectId().toString();
      const nonExistentQuestionId = new mongoose.Types.ObjectId().toString();

      // Create valid session owned by user
      const sessDoc = await Session.create({
        _id: sessionId,
        user: testUserId,
        targetRole: 'Full Stack Engineer',
        interviewType: 'technical',
        status: 'in_progress',
      });

      const res = await request(app)
        .post('/api/answers/submit')
        .set('Authorization', regularToken)
        .send({
          sessionId,
          questionId: nonExistentQuestionId,
          transcript: 'Here is my valid candidate answer text.',
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/question not found/i);

      await Session.deleteOne({ _id: sessionId });
    });
  });

  describe('5. Upload Magic Byte Verification', () => {
    const tempDir = path.resolve('tests/fixtures');

    beforeAll(() => {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
    });

    afterAll(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('validates genuine PDF magic bytes (%PDF)', async () => {
      const pdfPath = path.join(tempDir, 'valid.pdf');
      fs.writeFileSync(pdfPath, Buffer.from('%PDF-1.4 test document content'));

      const isValid = await verifyDocumentMagicBytes(pdfPath, '.pdf');
      expect(isValid).toBe(true);
    });

    test('rejects disguised executable or script named as .pdf', async () => {
      const fakePdfPath = path.join(tempDir, 'fake.pdf');
      fs.writeFileSync(fakePdfPath, Buffer.from('#!/bin/bash\necho "malicious script"'));

      const isValid = await verifyDocumentMagicBytes(fakePdfPath, '.pdf');
      expect(isValid).toBe(false);
    });

    test('validates genuine DOCX magic bytes (PK\\x03\\x04)', async () => {
      const docxPath = path.join(tempDir, 'valid.docx');
      fs.writeFileSync(docxPath, Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]));

      const isValid = await verifyDocumentMagicBytes(docxPath, '.docx');
      expect(isValid).toBe(true);
    });
  });
});
