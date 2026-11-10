import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/db.js';
import {
  getAvailableCompaniesMetadata,
  getAptitudeCategoriesMetadata,
  selectQuestionsForTest,
  gradeTestSubmission,
} from '../services/aptitudePYQService.js';

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const runIntegrationTest = async () => {
  console.log('====================================================');
  console.log('PrePilot AI - Aptitude Assessment Engine Verification');
  console.log('====================================================');

  await connectDB();
  console.log('✅ Connected to MongoDB Atlas\n');

  // Test 1: Company Metadata & Patterns
  console.log('--- 1. Testing Company Metadata & Patterns ---');
  const companies = await getAvailableCompaniesMetadata();
  console.log(`Loaded ${companies.length} companies.`);
  const expectedComps = ['TCS', 'Infosys', 'Accenture', 'Wipro', 'Capgemini', 'Cognizant', 'HCLTech', 'Tech Mahindra', 'Deloitte'];
  expectedComps.forEach((compName) => {
    const c = companies.find((x) => x.company === compName);
    if (!c) {
      throw new Error(`Missing expected company: ${compName}`);
    }
    console.log(`  ✓ [${compName}] Pattern: "${c.patternType}", Duration: ${c.expectedDurationMinutes}m, Total Qs: ${c.totalQuestions}`);
    if (!c.intro || !c.examTitle || !c.sections || !c.difficultyDistribution) {
      throw new Error(`Company ${compName} missing pattern details`);
    }
  });

  // Test 2: Category Taxonomy & Subtopics
  console.log('\n--- 2. Testing Category Taxonomy (72 Subtopics) ---');
  const categories = await getAptitudeCategoriesMetadata();
  console.log(`Loaded ${categories.length} core categories:`);
  categories.forEach((cat) => {
    console.log(`  ✓ ${cat.category}: ${cat.totalSubtopics} subtopics, ${cat.totalQuestions} questions available`);
  });

  // Test 3: The 2-Question Bug Elimination
  console.log('\n--- 3. Testing Test Generation (Must NEVER be capped at 2) ---');
  for (const compName of expectedComps) {
    // Quick Practice (10 Qs)
    const practice = await selectQuestionsForTest({
      company: compName,
      questionCount: 10,
    });
    console.log(`  ✓ ${compName} Quick Practice requested 10 -> Received: ${practice.selectedQuestions.length} questions (Available: ${practice.availableCount})`);
    if (practice.selectedQuestions.length !== 10) {
      throw new Error(`CRITICAL BUG DETECTED: ${compName} returned ${practice.selectedQuestions.length} instead of 10!`);
    }

    // Full Mock (20 Qs)
    const mock = await selectQuestionsForTest({
      company: compName,
      questionCount: 20,
    });
    console.log(`  ✓ ${compName} Full Mock requested 20 -> Received: ${mock.selectedQuestions.length} questions`);
    if (mock.selectedQuestions.length < 15) {
      throw new Error(`CRITICAL: Full Mock for ${compName} under-delivered (${mock.selectedQuestions.length} Qs)`);
    }
  }

  // Test 4: Subtopic Drill Launches
  console.log('\n--- 4. Testing Subtopic Drills ---');
  const subtopicTests = [
    { topic: 'Quantitative Aptitude', subtopic: 'Time and Work', count: 10 },
    { topic: 'Logical Reasoning', subtopic: 'Coding and Decoding', count: 10 },
    { topic: 'Verbal Ability', subtopic: 'Sentence Correction', count: 10 },
    { topic: 'Pseudocode', subtopic: 'Bitwise Operations', count: 5 },
    { topic: 'Programming', subtopic: 'Data Structures (Arrays, Stacks, Queues, Trees)', count: 5 },
  ];

  for (const st of subtopicTests) {
    const drill = await selectQuestionsForTest({
      topic: st.topic,
      subtopic: st.subtopic,
      questionCount: st.count,
    });
    console.log(`  ✓ Drill [${st.topic} -> ${st.subtopic}] requested ${st.count} -> Received: ${drill.selectedQuestions.length} Qs`);
    if (drill.selectedQuestions.length !== st.count) {
      throw new Error(`Drill under-delivered: ${st.subtopic}`);
    }
  }

  // Test 5: Server-side Grading & Negative Marking
  console.log('\n--- 5. Testing Grading Engine & Negative Marking ---');
  const sampleTest = await selectQuestionsForTest({
    company: 'TCS',
    questionCount: 10,
  });

  const mockAttempt = {
    marksPerQuestion: 1.0,
    negativeMarking: 0.25,
    passCutoffPercentage: 60,
    questions: sampleTest.selectedQuestions.map((q) => ({
      questionId: q._id,
      correctAnswer: q.correctAnswer,
      topic: q.topic,
      subtopic: q.subtopic,
    })),
  };

  // Simulate: 6 correct, 2 wrong, 2 unanswered
  const simulatedAnswers = {};
  sampleTest.selectedQuestions.slice(0, 6).forEach((q) => {
    simulatedAnswers[String(q._id)] = q.correctAnswer;
  });
  sampleTest.selectedQuestions.slice(6, 8).forEach((q) => {
    simulatedAnswers[String(q._id)] = 'COMPLETELY_WRONG_ANSWER';
  });

  const graded = gradeTestSubmission({
    attempt: mockAttempt,
    answers: simulatedAnswers,
    timeSpentSeconds: 420,
  });

  console.log(`  ✓ Evaluated 10 Questions:`);
  console.log(`    - Total Correct: ${graded.totalCorrect} (Expected: 6)`);
  console.log(`    - Total Incorrect: ${graded.totalIncorrect} (Expected: 2)`);
  console.log(`    - Total Unanswered: ${graded.totalUnanswered} (Expected: 2)`);
  console.log(`    - Raw Score: ${graded.rawScore} (Expected: 6 - 2*0.25 = 5.50)`);
  console.log(`    - Percentage: ${graded.percentage}%`);
  console.log(`    - Passed Cutoff: ${graded.passed}`);
  console.log(`    - Recommendations: ${graded.recommendations.length} tips provided`);

  if (graded.totalCorrect !== 6 || graded.totalIncorrect !== 2 || graded.rawScore !== 5.5) {
    throw new Error('Grading formula mismatch in test execution!');
  }

  console.log('\n====================================================');
  console.log('🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!');
  console.log('====================================================');
  process.exit(0);
};

runIntegrationTest().catch((err) => {
  console.error('\n❌ INTEGRATION TEST FAILED:', err);
  process.exit(1);
});

