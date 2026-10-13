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
const { default: AptitudeQuestion } = await import('../models/AptitudeQuestion.js');
const { default: AptitudeAttempt } = await import('../models/AptitudeAttempt.js');
const {
  validateQuestionPayload,
  checkIsDuplicate,
  getAvailableCompaniesMetadata,
  selectQuestionsForTest,
  gradeTestSubmission,
  memoryAptitudeQuestions,
  memoryAptitudeAttempts
} = await import('../services/aptitudePYQService.js');
const { memoryUsers, generateToken } = await import('../controllers/authController.js');

describe('Company-Wise Aptitude PYQ Engine Suite', () => {
  let studentToken, studentId;
  let otherStudentToken, otherStudentId;
  let adminToken, adminId;

  beforeAll(async () => {
    studentId = new mongoose.Types.ObjectId().toString();
    otherStudentId = new mongoose.Types.ObjectId().toString();
    adminId = new mongoose.Types.ObjectId().toString();

    const studentUser = {
      _id: studentId,
      id: studentId,
      name: 'Student Candidate',
      email: `student_${Date.now()}@example.com`,
      role: 'user',
      targetRole: 'Full Stack Engineer',
    };

    const otherUser = {
      _id: otherStudentId,
      id: otherStudentId,
      name: 'Other Student',
      email: `other_${Date.now()}@example.com`,
      role: 'user',
      targetRole: 'Backend Engineer',
    };

    const adminUser = {
      _id: adminId,
      id: adminId,
      name: 'System Admin',
      email: `admin_${Date.now()}@example.com`,
      role: 'admin',
      targetRole: 'Admin',
    };

    memoryUsers.push(studentUser, otherUser, adminUser);

    studentToken = `Bearer ${generateToken(studentId, studentUser.name, studentUser.email, studentUser.targetRole, 'user')}`;
    otherStudentToken = `Bearer ${generateToken(otherStudentId, otherUser.name, otherUser.email, otherUser.targetRole, 'user')}`;
    adminToken = `Bearer ${generateToken(adminId, adminUser.name, adminUser.email, adminUser.targetRole, 'admin')}`;

    // Clear test memory caches
    memoryAptitudeQuestions.length = 0;
    memoryAptitudeAttempts.length = 0;
  });

  describe('1. Question Validation & Schema Integrity', () => {
    test('rejects question with missing required fields (questionText, options)', () => {
      const invalidQ = {
        company: 'TCS',
        topic: 'Quantitative Aptitude',
      };
      const result = validateQuestionPayload(invalidQ);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('Question text must be at least'))).toBe(true);
    });

    test('rejects question where options count is less than 2', () => {
      const singleOptionQ = {
        company: 'TCS',
        examName: 'TCS NQT',
        examYear: 2024,
        topic: 'Quantitative Aptitude',
        questionText: 'What is 5 + 5 in decimal notation?',
        options: ['10'],
        correctAnswer: '10',
        explanation: '5 + 5 = 10',
        sourceUrl: 'https://example.com/tcs',
      };
      const result = validateQuestionPayload(singleOptionQ);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('At least two non-empty options'))).toBe(true);
    });

    test('rejects question where correctAnswer does not match any provided option', () => {
      const mismatchQ = {
        company: 'Infosys',
        examName: 'INFYTQ 2024',
        examYear: 2024,
        topic: 'Logical Reasoning',
        questionText: 'Find the odd one out among the listed fruits and vegetables.',
        options: ['Apple', 'Banana', 'Carrot', 'Grape'],
        correctAnswer: 'Orange',
        explanation: 'Carrot is a root vegetable.',
        sourceUrl: 'https://example.com/infosys',
      };
      const result = validateQuestionPayload(mismatchQ);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('does not match any of the provided options'))).toBe(true);
    });

    test('validates and sanitizes a verified question with authentic source attribution', () => {
      const validQ = {
        company: 'TCS',
        examName: 'TCS NQT 2024',
        examYear: 2024,
        topic: 'Quantitative Aptitude',
        subtopic: 'Time and Work',
        difficulty: 'Medium',
        questionText: 'A can do a work in 15 days and B in 20 days. If they work on it together for 4 days, what fraction of work is left?',
        options: ['7/15', '8/15', '1/10', '1/15'],
        correctAnswer: '8/15',
        explanation: 'In 4 days together they do 4*(1/15 + 1/20) = 7/15. Fraction left = 1 - 7/15 = 8/15.',
        sourceUrl: 'https://learning.tcsion.com/hub/nqt-sample-questions',
        sourceTitle: 'TCS iON NQT Official Sample',
        sourceType: 'Official Sample Paper',
      };
      const result = validateQuestionPayload(validQ);
      expect(result.isValid).toBe(true);
      expect(result.sanitized.company).toBe('TCS');
      expect(result.sanitized.examYear).toBe(2024);
      expect(result.sanitized.correctAnswer).toBe('8/15');
    });
  });

  describe('2. Batch Import & Duplicate Detection via Admin Endpoint', () => {
    test('successfully imports valid questions and flags duplicates via POST /api/admin/aptitude/import', async () => {
      const questionsToImport = [
        {
          company: 'Accenture',
          examName: 'Cognitive Assessment 2024',
          examYear: 2024,
          topic: 'Logical Reasoning',
          subtopic: 'Coding-Decoding',
          difficulty: 'Easy',
          questionText: 'If CERTAIN is coded as XVIGZRM, how is MUNDANE coded in that code format?',
          options: ['NFMWZMX', 'NFMWZMV', 'VMZWMFN', 'NFMZWMV'],
          correctAnswer: 'NFMWZMV',
          explanation: 'Each letter is substituted by its opposite letter in the alphabet (A<->Z, C<->X, etc.).',
          sourceUrl: 'https://www.accenture.com/careers/sample-tests',
          sourceTitle: 'Accenture Cognitive Prep',
          sourceType: 'Candidate Memory Recall',
        },
        {
          company: 'Accenture',
          examName: 'Cognitive Assessment 2024',
          examYear: 2024,
          topic: 'Logical Reasoning',
          subtopic: 'Coding-Decoding',
          difficulty: 'Easy',
          questionText: 'If CERTAIN is coded as XVIGZRM, how is MUNDANE coded in that code format?', // Duplicate!
          options: ['NFMWZMX', 'NFMWZMV', 'VMZWMFN', 'NFMZWMV'],
          correctAnswer: 'NFMWZMV',
          explanation: 'Opposite letters.',
          sourceUrl: 'https://www.accenture.com/careers/sample-tests',
          sourceTitle: 'Accenture Cognitive Prep',
          sourceType: 'Candidate Memory Recall',
        }
      ];

      const res = await request(app)
        .post('/api/admin/aptitude/import')
        .set('Authorization', adminToken)
        .send({ questions: questionsToImport, autoVerify: true });

      expect(res.status).toBe(201);
      expect(res.body.report.totalProcessed).toBe(2);
      expect(res.body.report.importedCount).toBe(1);
      expect(res.body.report.duplicateCount).toBe(1);
      expect(res.body.report.duplicates.length).toBe(1);
    });

    test('supports importing questions directly via csvContent with commas inside quotes', async () => {
      const csvData = `company,exam_year,topic,difficulty,question_text,options,correct_answer,explanation,source_reference
TCS,2024,Quantitative Aptitude,Medium,"A pipe can fill a reservoir in 15 hours, while another empties it in 20 hours. How long to fill together?","60 hours | 45 hours | 30 hours | 25 hours",60 hours,"Net rate = 1/15 - 1/20 = 1/60. Hence 60 hours.",https://www.tcs.com/careers
Accenture,2024,Logical Reasoning,Easy,"Find the odd one out among these data structures: Array, Stack, Queue, Compiler","Array | Stack | Queue | Compiler",Compiler,"Compiler is a translator, others are data structures.",Accenture Model Paper`;

      const res = await request(app)
        .post('/api/admin/aptitude/import')
        .set('Authorization', adminToken)
        .send({ csvContent: csvData, autoVerify: true });

      expect(res.status).toBe(201);
      expect(res.body.report.totalProcessed).toBe(2);
      expect(res.body.report.importedCount).toBe(2);
      expect(res.body.report.failedCount).toBe(0);
    });

    test('normalizes field aliases such as sourceReference, exam_year, option letters', async () => {
      const aliasedQ = {
        company_name: 'Infosys',
        exam_year: '2024',
        category: 'Quantitative Aptitude',
        level: 'medium',
        question_text: 'If 3x + 7 = 22, what is the value of 2x + 1?',
        options: ['9', '11', '13', '15'],
        answer: 'B', // Maps letter B to '11'
        solution: '3x = 15 => x = 5. Therefore 2(5) + 1 = 11.',
        sourceReference: 'https://infosys.com/sample',
      };

      const res = await request(app)
        .post('/api/admin/aptitude/import')
        .set('Authorization', adminToken)
        .send({ questions: [aliasedQ], autoVerify: true });

      expect(res.status).toBe(201);
      expect(res.body.report.importedCount).toBe(1);
      expect(res.body.report.importedItems[0].company).toBe('Infosys');
      expect(res.body.report.importedItems[0].examYear).toBe(2024);
    });
  });

  describe('3. Empty Database vs Verified Company & Year Metadata', () => {
    test('only returns companies that have genuine verified questions; excludes unverified questions', async () => {
      // 1. Import an unverified question for Capgemini
      const unverifiedQ = {
        company: 'Capgemini',
        examName: 'Capgemini Excellence',
        examYear: 2024,
        topic: 'Verbal Ability',
        difficulty: 'Medium',
        questionText: 'Select the primary synonym for the word: ADVERSITY in context',
        options: ['Misfortune', 'Prosperity', 'Friendship', 'Harmony'],
        correctAnswer: 'Misfortune',
        explanation: 'Adversity denotes difficult or unpleasant situations (misfortune).',
        sourceUrl: 'https://capgemini.com/careers',
        sourceTitle: 'Capgemini Campus',
        sourceType: 'Candidate Memory Recall',
        verificationStatus: 'unverified',
      };

      await request(app)
        .post('/api/admin/aptitude/import')
        .set('Authorization', adminToken)
        .send({ questions: [unverifiedQ], autoVerify: false });

      // Check available companies for students
      const metaRes1 = await request(app)
        .get('/api/aptitude/companies')
        .set('Authorization', studentToken);

      const capgemini1 = (metaRes1.body.companies || []).find((c) => c.company === 'Capgemini');
      expect(capgemini1).toBeUndefined(); // Must NOT show unverified records

      // 2. Now import a verified question for Capgemini
      const verifiedQ = {
        ...unverifiedQ,
        questionText: 'Select the primary antonym for the word: EXPAND in English vocabulary',
        options: ['Contract', 'Extend', 'Enlarge', 'Broaden'],
        correctAnswer: 'Contract',
      };

      await request(app)
        .post('/api/admin/aptitude/import')
        .set('Authorization', adminToken)
        .send({ questions: [verifiedQ], autoVerify: true });

      const metaRes2 = await request(app)
        .get('/api/aptitude/companies')
        .set('Authorization', studentToken);

      const capgemini2 = (metaRes2.body.companies || []).find((c) => c.company === 'Capgemini');
      expect(capgemini2).toBeDefined();
      expect(capgemini2.totalQuestions).toBeGreaterThanOrEqual(1);
      expect(capgemini2.examYears).toContain(2024);
    });
  });

  describe('4. Dynamic Test Start & Answer Concealment', () => {
    test('starts test dynamically, concealing correctAnswer and explanation before submission', async () => {
      // Import 2 verified TCS questions
      const tcsQuestions = [
        {
          company: 'TCS',
          examName: 'TCS NQT 2024',
          examYear: 2024,
          topic: 'Quantitative Aptitude',
          difficulty: 'Easy',
          questionText: 'What is exactly 15 percent of 240 in elementary mathematics?',
          options: ['36', '32', '38', '40'],
          correctAnswer: '36',
          explanation: '0.15 * 240 = 36.',
          sourceUrl: 'https://learning.tcsion.com/hub/nqt-sample-questions',
          sourceTitle: 'TCS NQT',
          sourceType: 'Official Sample Paper',
        },
        {
          company: 'TCS',
          examName: 'TCS NQT 2024',
          examYear: 2024,
          topic: 'Logical Reasoning',
          difficulty: 'Easy',
          questionText: 'Which number continues the sequence: 2, 6, 12, 20, 30, and next?',
          options: ['42', '40', '44', '38'],
          correctAnswer: '42',
          explanation: '+4, +6, +8, +10, +12 -> 30 + 12 = 42.',
          sourceUrl: 'https://learning.tcsion.com/hub/nqt-sample-questions',
          sourceTitle: 'TCS NQT',
          sourceType: 'Official Sample Paper',
        }
      ];

      await request(app)
        .post('/api/admin/aptitude/import')
        .set('Authorization', adminToken)
        .send({ questions: tcsQuestions, autoVerify: true });

      // Student starts test
      const startRes = await request(app)
        .post('/api/aptitude/tests/start')
        .set('Authorization', studentToken)
        .send({
          company: 'TCS',
          examYear: 2024,
          questionCount: 2,
          negativeMarking: 0.25,
          timeLimitMinutes: 15,
        });

      expect(startRes.status).toBe(201);
      expect(startRes.body.testId).toBeDefined();
      expect(startRes.body.questions.length).toBe(2);

      // Verify that NO correctAnswer or explanation is leaked to the student!
      startRes.body.questions.forEach((q) => {
        expect(q.correctAnswer).toBeUndefined();
        expect(q.explanation).toBeUndefined();
        expect(q.options).toBeDefined();
        expect(q.options.length).toBe(4);
      });
    });
  });

  describe('5. Scoring & Negative Marking Engine', () => {
    test('accurately calculates score with positive credit and negative penalties upon submission', async () => {
      // Start test session
      const startRes = await request(app)
        .post('/api/aptitude/tests/start')
        .set('Authorization', studentToken)
        .send({
          company: 'TCS',
          examYear: 2024,
          questionCount: 2,
          negativeMarking: 0.25,
        });

      const { testId, questions } = startRes.body;
      const q1Id = questions[0].questionId;
      const q2Id = questions[1].questionId;

      // Find the stored attempt in memory to know correct answers for testing
      const attemptDoc = memoryAptitudeAttempts.find((a) => String(a._id) === String(testId));
      const q1Doc = attemptDoc.questions.find((q) => String(q.questionId) === String(q1Id));
      const q2Doc = attemptDoc.questions.find((q) => String(q.questionId) === String(q2Id));

      const wrongOptionQ2 = q2Doc.options.find((o) => o !== q2Doc.correctAnswer);

      // Submit 1 correct (+1.0) and 1 incorrect (-0.25)
      const submitRes = await request(app)
        .post(`/api/aptitude/tests/${testId}/submit`)
        .set('Authorization', studentToken)
        .send({
          answers: {
            [q1Id]: q1Doc.correctAnswer,
            [q2Id]: wrongOptionQ2,
          },
          timeSpentSeconds: 150,
        });

      expect(submitRes.status).toBe(200);
      const resData = submitRes.body.result;
      expect(resData.totalQuestions).toBe(2);
      expect(resData.totalCorrect).toBe(1);
      expect(resData.totalIncorrect).toBe(1);
      expect(resData.totalUnanswered).toBe(0);

      // Raw score = 1.0 - 0.25 = 0.75 out of 2.0 => 38% (Math.round(37.5))
      expect(resData.rawScore).toBe(0.75);
      expect(resData.percentage).toBe(38);

      // Post-submission: Solutions and explanations are now revealed
      resData.questions.forEach((q) => {
        expect(q.correctAnswer).toBeDefined();
        expect(q.explanation).toBeDefined();
      });
    });

    test('unanswered questions receive zero marks without applying negative penalty', async () => {
      const startRes = await request(app)
        .post('/api/aptitude/tests/start')
        .set('Authorization', studentToken)
        .send({
          company: 'TCS',
          questionCount: 2,
          negativeMarking: 0.25,
        });

      const { testId, questions } = startRes.body;
      const q1Id = questions[0].questionId;
      const attemptDoc = memoryAptitudeAttempts.find((a) => String(a._id) === String(testId));
      const q1Doc = attemptDoc.questions.find((q) => String(q.questionId) === String(q1Id));

      // Submit only Q1 correct; leave Q2 completely blank
      const submitRes = await request(app)
        .post(`/api/aptitude/tests/${testId}/submit`)
        .set('Authorization', studentToken)
        .send({
          answers: {
            [q1Id]: q1Doc.correctAnswer,
          },
          timeSpentSeconds: 90,
        });

      expect(submitRes.status).toBe(200);
      const resData = submitRes.body.result;
      expect(resData.totalCorrect).toBe(1);
      expect(resData.totalIncorrect).toBe(0);
      expect(resData.totalUnanswered).toBe(1);
      expect(resData.rawScore).toBe(1.0); // 1.0 out of 2.0 => 50%
      expect(resData.percentage).toBe(50);
    });
  });

  describe('6. Security & Anti-Cheating Controls', () => {
    test('prevents duplicate submissions on already completed test sessions', async () => {
      const startRes = await request(app)
        .post('/api/aptitude/tests/start')
        .set('Authorization', studentToken)
        .send({
          company: 'TCS',
          questionCount: 1,
        });

      const { testId } = startRes.body;

      // Submit first time
      const firstSubmit = await request(app)
        .post(`/api/aptitude/tests/${testId}/submit`)
        .set('Authorization', studentToken)
        .send({ answers: {}, timeSpentSeconds: 30 });

      expect(firstSubmit.status).toBe(200);

      // Repeated submission attempt
      const secondSubmit = await request(app)
        .post(`/api/aptitude/tests/${testId}/submit`)
        .set('Authorization', studentToken)
        .send({ answers: {}, timeSpentSeconds: 35 });

      expect(secondSubmit.status).toBe(400);
      expect(secondSubmit.body.message).toMatch(/already been submitted/i);
    });

    test('cross-account isolation: Candidate B cannot submit or inspect Candidate A test session', async () => {
      const startRes = await request(app)
        .post('/api/aptitude/tests/start')
        .set('Authorization', studentToken)
        .send({
          company: 'TCS',
          questionCount: 1,
        });

      const { testId } = startRes.body;

      // Other student tries to submit User A's test
      const unauthorizedSubmit = await request(app)
        .post(`/api/aptitude/tests/${testId}/submit`)
        .set('Authorization', otherStudentToken)
        .send({ answers: {}, timeSpentSeconds: 20 });

      expect(unauthorizedSubmit.status).toBe(403);
      expect(unauthorizedSubmit.body.message).toMatch(/Forbidden/i);

      // Other student tries to view User A's result
      const unauthorizedResult = await request(app)
        .get(`/api/aptitude/tests/${testId}/result`)
        .set('Authorization', otherStudentToken);

      expect(unauthorizedResult.status).toBe(403);
    });
  });

  describe('7. Admin Access Control & Verification Pipeline', () => {
    test('denies question import to non-admin student with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/admin/aptitude/import')
        .set('Authorization', studentToken)
        .send({ questions: [] });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Admin access required/i);
    });

    test('allows admin to import questions, review unverified items, and mark them verified', async () => {
      const wiproQ = {
        company: 'Wipro',
        examName: 'Elite NTH 2024',
        examYear: 2024,
        topic: 'Verbal Ability',
        difficulty: 'Medium',
        questionText: 'Identify the grammatically correct sentence in formal English writing:',
        options: [
          'Neither the teacher nor the students were present.',
          'Neither the teacher nor the students was present.',
          'Neither the teacher or the students was present.',
          'Neither the teacher nor the student were present.'
        ],
        correctAnswer: 'Neither the teacher nor the students were present.',
        explanation: 'In neither...nor constructions, the verb agrees with the nearer subject (students -> were).',
        sourceUrl: 'https://careers.wipro.com/elite-prep',
        sourceTitle: 'Wipro Elite NTH',
        sourceType: 'Official Sample Paper',
      };

      // 1. Admin imports without autoVerify
      const importRes = await request(app)
        .post('/api/admin/aptitude/import')
        .set('Authorization', adminToken)
        .send({
          questions: [wiproQ],
          autoVerify: false,
        });

      expect(importRes.status).toBe(201);
      expect(importRes.body.report.importedCount).toBe(1);

      // 2. Fetch question in admin listing
      const listRes = await request(app)
        .get('/api/admin/aptitude/questions?company=Wipro&status=unverified')
        .set('Authorization', adminToken);

      expect(listRes.status).toBe(200);
      expect(listRes.body.questions.length).toBeGreaterThanOrEqual(1);

      const targetQ = listRes.body.questions.find((q) => q.company === 'Wipro');
      expect(targetQ.verificationStatus).toBe('unverified');

      // 3. Admin verifies the question
      const verifyRes = await request(app)
        .post(`/api/admin/aptitude/questions/${targetQ._id}/verify`)
        .set('Authorization', adminToken)
        .send({ verificationNotes: 'Audited against authentic 2024 placement paper.' });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.question.verificationStatus).toBe('verified');
      expect(verifyRes.body.question.verifiedBy).toBeDefined();
    });
  });

  describe('8. Student History Isolation', () => {
    test('GET /api/aptitude/attempts returns authenticated user history only', async () => {
      const res = await request(app)
        .get('/api/aptitude/attempts')
        .set('Authorization', studentToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.attempts)).toBe(true);
      // All returned attempts must belong to studentId
      res.body.attempts.forEach((att) => {
        const attUserId = String(att.user?._id || att.user);
        expect(attUserId).toBe(String(studentId));
      });
    });
  });
});
