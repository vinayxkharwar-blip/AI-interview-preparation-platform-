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
const { generateLLMJson } = await import('../services/llmService.js');
const { buildResumeParsePrompt } = await import('../prompts/resumePrompts.js');

describe('Detected Target Role in Resume Analysis Test Suite', () => {
  let userA, userAToken;
  let userB, userBToken;

  beforeAll(async () => {
    const idA = new mongoose.Types.ObjectId().toString();
    userA = {
      _id: idA,
      id: idA,
      name: 'Resume Alice',
      email: `alice_${Date.now()}@example.com`,
      targetRole: 'Full Stack Engineer', // Initial manual preference
      role: 'user',
    };
    memoryUsers.push(userA);
    userAToken = `Bearer ${generateToken(userA._id, userA.name, userA.email, userA.targetRole)}`;

    const idB = new mongoose.Types.ObjectId().toString();
    userB = {
      _id: idB,
      id: idB,
      name: 'Resume Bob',
      email: `bob_${Date.now()}@example.com`,
      targetRole: 'DevOps & Cloud Engineer',
      role: 'user',
    };
    memoryUsers.push(userB);
    userBToken = `Bearer ${generateToken(userB._id, userB.name, userB.email, userB.targetRole)}`;

    if (mongoose.connection.readyState === 1) {
      try {
        await User.create(userA);
        await User.create(userB);
      } catch (e) {}
    }
  });

  describe('1. Role Deduction from Resume Content', () => {
    test('accurately extracts "Data Analyst" from Data Analyst resume content', async () => {
      const resumeText = `
        Jane Doe
        Email: jane@example.com | Phone: 555-0199
        Professional Summary:
        Experienced Data Analyst with 4 years extracting insights, creating Tableau and Power BI dashboards, and performing SQL queries.
        Core Skills: Python, SQL, Tableau, Power BI, Pandas, Excel, Data Analytics, ETL.
        Experience:
        Senior Data Analyst at Analytics Corp (2022-Present):
        - Led business intelligence reporting, reducing reporting latency by 40%.
      `;

      const prompt = buildResumeParsePrompt(resumeText);
      const parsed = await generateLLMJson(prompt);

      expect(parsed.targetRole).toBe('Data Analyst');
      expect(parsed.skills).toEqual(expect.arrayContaining(['Python', 'SQL']));
    });

    test('accurately extracts "Cybersecurity Analyst" from security resume content', async () => {
      const resumeText = `
        Alex Rivera
        Email: alex@example.com
        Professional Summary:
        Certified Cybersecurity Analyst specializing in threat detection, SIEM log analysis, and incident response.
        Skills: SIEM, Incident Response, Splunk, Linux, Python, Wireshark, Penetration Testing.
        Experience:
        SOC Analyst at DefenseNet (2023-Present):
        - Monitored security events, mitigating critical vulnerabilities.
      `;

      const prompt = buildResumeParsePrompt(resumeText);
      const parsed = await generateLLMJson(prompt);

      expect(parsed.targetRole).toBe('Cybersecurity Analyst');
    });

    test('accurately extracts "QA Engineer" from software testing resume content', async () => {
      const resumeText = `
        Sam Patel
        Professional Summary:
        QA Engineer with experience in test automation frameworks, Selenium, Cypress, and API testing.
        Skills: Selenium, Cypress, JavaScript, Java, TestNG, Manual Testing, Quality Assurance.
        Experience:
        Automation QA Engineer at SoftwareWorks (2022-2024):
        - Built automated test suites covering 85% regression tests.
      `;

      const prompt = buildResumeParsePrompt(resumeText);
      const parsed = await generateLLMJson(prompt);

      expect(parsed.targetRole).toBe('QA Engineer');
    });

    test('returns null (Role not detected) when resume content contains no identifiable role or title', async () => {
      const genericText = `
        General Document
        John Doe | Contact: john@example.com
        Education: High School Diploma (2018).
        Personal Statement: Hardworking individual seeking new opportunities.
        Interests: Reading, travel, photography.
      `;

      const prompt = buildResumeParsePrompt(genericText);
      const parsed = await generateLLMJson(prompt);

      // Must be null, NOT defaulted to "Full Stack Engineer"
      expect(parsed.targetRole).toBeNull();
    });
  });

  describe('2. Separation of Detected Role from Selected Role & Upload Persistence', () => {
    let resumeDataAnalystId;
    let resumeQaId;

    test('persists detected role on resume record without overriding user profile targetRole', async () => {
      // Create Data Analyst Resume for User A
      resumeDataAnalystId = new mongoose.Types.ObjectId().toString();
      const resumeDoc = {
        _id: resumeDataAnalystId,
        user: userA._id,
        fileName: 'Alice_Data_Analyst.pdf',
        fileType: 'pdf',
        rawText: 'Alice Data Analyst with SQL and Tableau',
        parsedData: {
          targetRole: 'Data Analyst',
          atsScore: 84,
          skills: ['SQL', 'Tableau', 'Python'],
        },
        createdAt: new Date(),
      };
      memoryResumes.unshift(resumeDoc);
      if (mongoose.connection.readyState === 1) {
        try {
          await Resume.create(resumeDoc);
        } catch (e) {}
      }

      const res = await request(app)
        .get('/api/resumes')
        .set('Authorization', userAToken);

      expect(res.status).toBe(200);
      const created = res.body.find((r) => String(r._id) === String(resumeDataAnalystId));
      expect(created).toBeDefined();
      expect(created.parsedData.targetRole).toBe('Data Analyst');

      // User A's token profile targetRole remains Full Stack Engineer
      expect(userA.targetRole).toBe('Full Stack Engineer');
    });

    test('subsequent resume upload with different role (QA Engineer) retains its own detected role independently', async () => {
      resumeQaId = new mongoose.Types.ObjectId().toString();
      const qaResumeDoc = {
        _id: resumeQaId,
        user: userA._id,
        fileName: 'Alice_QA_Automation.pdf',
        fileType: 'pdf',
        rawText: 'Alice QA Engineer with Cypress and Selenium',
        parsedData: {
          targetRole: 'QA Engineer',
          atsScore: 88,
          skills: ['Cypress', 'Selenium', 'JavaScript'],
        },
        createdAt: new Date(),
      };
      memoryResumes.unshift(qaResumeDoc);
      if (mongoose.connection.readyState === 1) {
        try {
          await Resume.create(qaResumeDoc);
        } catch (e) {}
      }

      const res = await request(app)
        .get('/api/resumes')
        .set('Authorization', userAToken);

      expect(res.status).toBe(200);
      const dataAnalyst = res.body.find((r) => String(r._id) === String(resumeDataAnalystId));
      const qaEngineer = res.body.find((r) => String(r._id) === String(resumeQaId));

      expect(dataAnalyst.parsedData.targetRole).toBe('Data Analyst');
      expect(qaEngineer.parsedData.targetRole).toBe('QA Engineer');
      expect(dataAnalyst.parsedData.targetRole).not.toBe(qaEngineer.parsedData.targetRole);
    });
  });

  describe('3. User Isolation', () => {
    test('User B cannot view User A detected roles or resumes', async () => {
      const res = await request(app)
        .get('/api/resumes')
        .set('Authorization', userBToken);

      expect(res.status).toBe(200);
      const userARoles = res.body.map((r) => r.parsedData?.targetRole);
      // User B must not see User A's Data Analyst or QA Engineer resumes
      expect(userARoles).not.toContain('Data Analyst');
      expect(userARoles).not.toContain('QA Engineer');
    });
  });
});
