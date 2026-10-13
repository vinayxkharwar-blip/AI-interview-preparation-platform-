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
const { default: PlacementDrive } = await import('../models/PlacementDrive.js');
const { memoryUsers, generateToken } = await import('../controllers/authController.js');
const { sanitizeRole, isValidRole } = await import('../utils/roleSanitizer.js');
const { fetchJobRecommendations } = await import('../services/jobService.js');

describe('Target Engineering Role & Custom Role Test Suite', () => {
  let userToken, userId;

  beforeAll(async () => {
    userId = new mongoose.Types.ObjectId().toString();
    const testUser = {
      _id: userId,
      id: userId,
      name: 'Role Tester',
      email: `roletester_${Date.now()}@example.com`,
      targetRole: 'Full Stack Engineer',
      role: 'user',
    };

    memoryUsers.push(testUser);
    if (mongoose.connection.readyState === 1) {
      try {
        await User.create(testUser);
      } catch (e) {}
    }

    userToken = `Bearer ${generateToken(userId, testUser.name, testUser.email, testUser.targetRole)}`;
  });

  describe('1. Role Sanitizer & Validation Unit Tests', () => {
    test('preserves all 5 predefined engineering roles', () => {
      const predefined = [
        'Full Stack Engineer',
        'Backend Engineer',
        'Frontend Engineer',
        'DevOps & Cloud Engineer',
        'AI / Machine Learning Engineer',
      ];
      predefined.forEach((role) => {
        expect(isValidRole(role)).toBe(true);
        expect(sanitizeRole(role)).toBe(role);
      });
    });

    test('validates and sanitizes standard custom roles', () => {
      const customRoles = [
        'QA Engineer',
        'SOC Analyst',
        'SAP Consultant',
        'Cybersecurity Analyst',
        'Data Analyst',
        'Software Tester',
        'Technical Support Engineer',
        'C++ / Embedded Developer',
        'DevOps & SRE',
      ];
      customRoles.forEach((role) => {
        expect(isValidRole(role)).toBe(true);
        expect(sanitizeRole(role)).toBe(role);
      });
    });

    test('trims leading and trailing whitespace', () => {
      expect(sanitizeRole('   QA Engineer   ')).toBe('QA Engineer');
      expect(isValidRole('   QA Engineer   ')).toBe(true);
    });

    test('rejects empty strings and whitespace-only strings', () => {
      expect(isValidRole('')).toBe(false);
      expect(isValidRole('    ')).toBe(false);
      expect(isValidRole(null)).toBe(false);
      expect(isValidRole(undefined)).toBe(false);
      expect(sanitizeRole('')).toBe('Full Stack Engineer');
      expect(sanitizeRole('   ')).toBe('Full Stack Engineer');
    });

    test('enforces maximum length of 100 characters', () => {
      const longString = 'A'.repeat(120);
      expect(isValidRole(longString)).toBe(false);
      const sanitized = sanitizeRole(longString);
      expect(sanitized.length).toBe(100);
      expect(sanitized).toBe('A'.repeat(100));
    });

    test('strips dangerous injection tokens and control characters', () => {
      const malicious = 'QA Engineer\r\n\t<script>alert(1)</script>';
      const sanitized = sanitizeRole(malicious);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('\r');
      expect(sanitized).not.toContain('\n');
      expect(sanitized).not.toContain('\t');
      expect(sanitized).toContain('QA Engineer');
    });
  });

  describe('2. Backend PATCH /api/placement/role API Tests', () => {
    test('successfully updates target role when no active drive exists yet', async () => {
      const res = await request(app)
        .patch('/api/placement/role')
        .set('Authorization', userToken)
        .send({ targetRole: 'Cybersecurity Analyst' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.targetRole).toBe('Cybersecurity Analyst');
    });

    test('updates drive role when an active placement drive exists', async () => {
      // Start drive
      await request(app)
        .post('/api/placement/start')
        .set('Authorization', userToken)
        .send({ targetRole: 'Full Stack Engineer' });

      const res = await request(app)
        .patch('/api/placement/role')
        .set('Authorization', userToken)
        .send({ targetRole: 'QA Engineer' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.targetRole).toBe('QA Engineer');
      expect(res.body.drive).toBeDefined();
      expect(res.body.drive.targetRole).toBe('QA Engineer');
    });

    test('trims whitespace when saving custom role', async () => {
      const res = await request(app)
        .patch('/api/placement/role')
        .set('Authorization', userToken)
        .send({ targetRole: '   SOC Analyst   ' });

      expect(res.status).toBe(200);
      expect(res.body.targetRole).toBe('SOC Analyst');
    });

    test('rejects empty role with 400', async () => {
      const res = await request(app)
        .patch('/api/placement/role')
        .set('Authorization', userToken)
        .send({ targetRole: '' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('cannot be empty');
    });

    test('rejects whitespace-only role with 400', async () => {
      const res = await request(app)
        .patch('/api/placement/role')
        .set('Authorization', userToken)
        .send({ targetRole: '     ' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('cannot be empty');
    });

    test('rejects role exceeding 100 characters with 400', async () => {
      const res = await request(app)
        .patch('/api/placement/role')
        .set('Authorization', userToken)
        .send({ targetRole: 'X'.repeat(101) });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('100 characters');
    });

    test('rejects unauthenticated requests with 401', async () => {
      const res = await request(app)
        .patch('/api/placement/role')
        .send({ targetRole: 'QA Engineer' });

      expect(res.status).toBe(401);
    });
  });

  describe('3. Downstream Feature Integration (Job Recommendations)', () => {
    test('fetches job recommendations matching custom Cybersecurity Analyst role', async () => {
      const jobs = await fetchJobRecommendations({
        targetRole: 'Cybersecurity Analyst',
      });

      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeGreaterThan(0);
      const hasSecurityJob = jobs.some(
        (j) =>
          j.title.toLowerCase().includes('security') ||
          j.title.toLowerCase().includes('soc')
      );
      expect(hasSecurityJob).toBe(true);
    });

    test('fetches job recommendations matching custom QA Engineer role', async () => {
      const jobs = await fetchJobRecommendations({
        targetRole: 'QA Engineer',
      });

      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeGreaterThan(0);
      const hasQAJob = jobs.some(
        (j) =>
          j.title.toLowerCase().includes('qa') ||
          j.title.toLowerCase().includes('test')
      );
      expect(hasQAJob).toBe(true);
    });

    test('fetches job recommendations matching custom Data Analyst role', async () => {
      const jobs = await fetchJobRecommendations({
        targetRole: 'Data Analyst',
      });

      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeGreaterThan(0);
      const hasDataJob = jobs.some((j) => j.title.toLowerCase().includes('data'));
      expect(hasDataJob).toBe(true);
    });
  });
});
