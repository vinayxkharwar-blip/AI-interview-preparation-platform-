import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/db.js';
import AptitudeQuestion, {
  QUANTITATIVE_SUBTOPICS,
  LOGICAL_SUBTOPICS,
  VERBAL_SUBTOPICS,
  PSEUDOCODE_SUBTOPICS,
  PROGRAMMING_SUBTOPICS,
} from '../models/AptitudeQuestion.js';

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const runMongoAudit = async () => {
  console.log('===========================================================');
  console.log('1. MONGODB ATLAS PRODUCTION VERIFICATION & INTEGRITY AUDIT');
  console.log('===========================================================');

  await connectDB();
  console.log('✅ Connected to MongoDB Atlas successfully.\n');

  // 1. Total Count
  const totalCount = await AptitudeQuestion.countDocuments({ isArchived: false });
  console.log(`Total Active Questions in MongoDB Atlas: ${totalCount}`);

  // 2. Company-Wise Distribution
  const companyCounts = await AptitudeQuestion.aggregate([
    { $match: { isArchived: false } },
    { $group: { _id: '$company', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  console.log('\n--- Company-Wise Question Counts in MongoDB Atlas ---');
  companyCounts.forEach((c) => {
    console.log(`  - ${c._id.padEnd(20)}: ${c.count} questions`);
  });

  const requiredCompanies = [
    'TCS',
    'Infosys',
    'Accenture',
    'Wipro',
    'Capgemini',
    'Cognizant',
    'HCLTech',
    'Tech Mahindra',
    'Deloitte',
  ];
  const missingCompanies = requiredCompanies.filter(
    (rc) => !companyCounts.some((c) => c._id.toLowerCase() === rc.toLowerCase() && c.count > 0)
  );
  if (missingCompanies.length > 0) {
    console.error('❌ Missing companies in MongoDB:', missingCompanies);
  } else {
    console.log('✅ All 9 required IT recruitment companies verified present in MongoDB Atlas.');
  }

  // 3. Category-Wise Distribution
  const topicCounts = await AptitudeQuestion.aggregate([
    { $match: { isArchived: false } },
    { $group: { _id: '$topic', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  console.log('\n--- Category-Wise Question Counts in MongoDB Atlas ---');
  topicCounts.forEach((t) => {
    console.log(`  - ${t._id.padEnd(25)}: ${t.count} questions`);
  });

  // 4. Subtopics Audit (All 72 Subtopics)
  console.log('\n--- Subtopic Coverage Audit (All 72 Placement Subtopics) ---');
  const allSubtopics = [
    ...QUANTITATIVE_SUBTOPICS.map((st) => ({ topic: 'Quantitative Aptitude', subtopic: st })),
    ...LOGICAL_SUBTOPICS.map((st) => ({ topic: 'Logical Reasoning', subtopic: st })),
    ...VERBAL_SUBTOPICS.map((st) => ({ topic: 'Verbal Ability', subtopic: st })),
    ...PSEUDOCODE_SUBTOPICS.map((st) => ({ topic: 'Pseudocode', subtopic: st })),
    ...PROGRAMMING_SUBTOPICS.map((st) => ({ topic: 'Programming', subtopic: st })),
  ];
  console.log(`Checking all ${allSubtopics.length} official subtopics across MongoDB Atlas...`);

  const dbSubtopics = await AptitudeQuestion.aggregate([
    { $match: { isArchived: false } },
    { $group: { _id: { topic: '$topic', subtopic: '$subtopic' }, count: { $sum: 1 } } },
  ]);
  const subtopicMap = new Map();
  dbSubtopics.forEach((s) => {
    subtopicMap.set(`${s._id.topic}:::${s._id.subtopic}`, s.count);
  });

  let coveredCount = 0;
  const missingSubtopics = [];
  allSubtopics.forEach(({ topic, subtopic }) => {
    const key = `${topic}:::${subtopic}`;
    const count = subtopicMap.get(key) || 0;
    if (count > 0) {
      coveredCount++;
    } else {
      missingSubtopics.push(`${topic} -> ${subtopic}`);
    }
  });

  console.log(`Subtopics with questions in MongoDB: ${coveredCount} / ${allSubtopics.length}`);
  if (missingSubtopics.length > 0) {
    console.warn(`⚠️ ${missingSubtopics.length} subtopics currently have 0 questions in DB:`, missingSubtopics);
  } else {
    console.log('✅ 100% of all 72 subtopics have active questions in MongoDB Atlas.');
  }

  // 5. Duplicate Questions Check
  console.log('\n--- Duplicate Hash & Text Verification ---');
  const duplicates = await AptitudeQuestion.aggregate([
    { $match: { isArchived: false } },
    { $group: { _id: '$contentHash', count: { $sum: 1 }, texts: { $push: '$questionText' } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  if (duplicates.length === 0) {
    console.log('✅ ZERO duplicate questions found in MongoDB Atlas. Content hash uniqueness: 100%.');
  } else {
    console.warn(`⚠️ Found ${duplicates.length} duplicate content hashes:`, duplicates);
  }

  // 6. Data Integrity & Answer Alignment Audit
  console.log('\n--- Answer Key & Option Alignment Audit ---');
  const allDocs = await AptitudeQuestion.find({ isArchived: false }).lean();
  let answerMismatchCount = 0;
  let missingExplanationCount = 0;
  let invalidOptionsCount = 0;

  allDocs.forEach((doc) => {
    if (!Array.isArray(doc.options) || doc.options.length < 2) {
      invalidOptionsCount++;
      console.error(`Invalid options array on QID: ${doc._id}`);
    }

    const trimmedOptions = (doc.options || []).map((o) => String(o).trim().toLowerCase());
    const trimmedAnswer = String(doc.correctAnswer || '').trim().toLowerCase();

    if (!trimmedOptions.includes(trimmedAnswer)) {
      answerMismatchCount++;
      console.error(
        `❌ Mismatch on QID: ${doc._id} [${doc.company} - ${doc.subtopic}]\n` +
          `   Question: "${doc.questionText.substring(0, 50)}..."\n` +
          `   Answer: "${doc.correctAnswer}"\n` +
          `   Options: [${doc.options.join(', ')}]`
      );
    }

    if (!doc.explanation || doc.explanation.trim().length < 5) {
      missingExplanationCount++;
    }
  });

  console.log(`Total inspected questions: ${allDocs.length}`);
  console.log(`- Options validity errors: ${invalidOptionsCount}`);
  console.log(`- Answer-to-options mismatch errors: ${answerMismatchCount}`);
  console.log(`- Missing or trivial explanation errors: ${missingExplanationCount}`);

  if (answerMismatchCount === 0 && missingExplanationCount === 0 && invalidOptionsCount === 0) {
    console.log('✅ 100% of all questions in MongoDB Atlas have valid options, verified matching answers, and detailed explanations.');
  }

  console.log('\n===========================================================');
  console.log('MONGODB AUDIT SUMMARY: ALL CHECKS COMPLETED.');
  console.log('===========================================================');
  process.exit(0);
};

runMongoAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});

