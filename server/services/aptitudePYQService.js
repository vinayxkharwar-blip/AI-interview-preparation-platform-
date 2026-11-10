import mongoose from 'mongoose';
import AptitudeQuestion, {
  VALID_COMPANIES,
  VALID_TOPICS,
  VALID_DIFFICULTIES,
  QUANTITATIVE_SUBTOPICS,
  LOGICAL_SUBTOPICS,
  VERBAL_SUBTOPICS,
  PSEUDOCODE_SUBTOPICS,
  PROGRAMMING_SUBTOPICS,
  computeQuestionHash,
  normalizeQuestionContent,
} from '../models/AptitudeQuestion.js';
import AptitudeAttempt from '../models/AptitudeAttempt.js';
import { COMPANY_EXAM_PATTERNS, DEFAULT_COMPANY_PATTERN } from '../config/companyExamPatterns.js';
import { COMPREHENSIVE_QUESTION_BANK } from '../data/companyAptitudeQuestionBank.js';
import { TOPIC_QUESTION_CATALOG } from '../data/topicQuestionCatalog.js';

// In-memory fallback stores when MongoDB is offline / in test mode
export const memoryAptitudeQuestions = [];
export const memoryAptitudeAttempts = [];

/**
 * RFC-4180 compliant CSV parser that supports quoted values, commas within cells,
 * escaped quotes (""), and multiline content.
 */
export const parseCSVToObjects = (csvText) => {
  if (!csvText || typeof csvText !== 'string') return [];

  const normalized = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if (char === '\n' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.replace(/^["']|["']$/g, '').trim());
  const results = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx] !== undefined ? row[idx] : '';
    });
    results.push(obj);
  }

  return results;
};

/**
 * Validates incoming question row (from CSV or JSON) with alias normalization
 */
export const validateQuestionPayload = (raw = {}) => {
  const errors = [];
  if (!raw || typeof raw !== 'object') {
    return { isValid: false, errors: ['Question payload must be an object'], sanitized: null };
  }

  // Flexible alias extractor
  const getVal = (...keys) => {
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k] !== null && String(raw[k]).trim() !== '') {
        return raw[k];
      }
      const strippedKey = k.toLowerCase().replace(/[\s_-]/g, '');
      for (const [prop, val] of Object.entries(raw)) {
        if (
          prop.toLowerCase().replace(/[\s_-]/g, '') === strippedKey &&
          val !== undefined &&
          val !== null &&
          String(val).trim() !== ''
        ) {
          return val;
        }
      }
    }
    return undefined;
  };

  // 1. Company Name
  let company = getVal('company', 'company_name', 'companyName', 'target_company', 'Company');
  if (!company || typeof company !== 'string' || !company.trim()) {
    errors.push('Company name is required (e.g., TCS, Infosys, Accenture, etc.)');
  } else {
    company = company.trim();
    // Normalize casing for popular known companies
    const knownUpper = VALID_COMPANIES.find((c) => c.toLowerCase() === company.toLowerCase());
    if (knownUpper) company = knownUpper;
  }

  // 2. Exam Year
  const rawYear = getVal('examYear', 'exam_year', 'year', 'Exam Year', 'Year');
  let yearNum = Number(rawYear);
  if (!rawYear || isNaN(yearNum)) {
    yearNum = new Date().getFullYear();
  } else {
    yearNum = Math.floor(yearNum);
    if (yearNum < 2010 || yearNum > new Date().getFullYear() + 1) {
      errors.push(`Exam year must be between 2010 and ${new Date().getFullYear() + 1}`);
    }
  }

  // 3. Exam Name
  let examName = getVal('examName', 'exam_name', 'exam', 'Exam Name', 'Test Name');
  if (!examName || typeof examName !== 'string' || !examName.trim()) {
    examName = `${company} Campus Recruitment Exam`;
  } else {
    examName = examName.trim();
  }

  // 4. Topic
  let topic = getVal('topic', 'category', 'section', 'Topic', 'Category');
  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    errors.push(`Topic is required. Allowed topics: [${VALID_TOPICS.join(', ')}]`);
  } else {
    topic = topic.trim();
    const matchedTopic = VALID_TOPICS.find((t) => t.toLowerCase() === topic.toLowerCase());
    if (!matchedTopic) {
      const lower = topic.toLowerCase();
      if (lower.includes('quant') || lower.includes('math') || lower.includes('numerical')) {
        topic = 'Quantitative Aptitude';
      } else if (lower.includes('logic') || lower.includes('reason') || lower.includes('analytical')) {
        topic = 'Logical Reasoning';
      } else if (lower.includes('verb') || lower.includes('english') || lower.includes('reading')) {
        topic = 'Verbal Ability';
      } else if (lower.includes('pseudo') || lower.includes('code') && !lower.includes('program')) {
        topic = 'Pseudocode';
      } else if (lower.includes('program') || lower.includes('tech') || lower.includes('coding')) {
        topic = 'Programming';
      } else {
        errors.push(`Invalid topic "${topic}". Allowed topics: [${VALID_TOPICS.join(', ')}]`);
      }
    } else {
      topic = matchedTopic;
    }
  }

  // 5. Difficulty
  let difficulty = getVal('difficulty', 'level', 'Difficulty', 'Level');
  if (!difficulty || typeof difficulty !== 'string' || !difficulty.trim()) {
    difficulty = 'Medium';
  } else {
    difficulty = difficulty.trim();
    const matchedDiff = VALID_DIFFICULTIES.find((d) => d.toLowerCase() === difficulty.toLowerCase());
    if (!matchedDiff) {
      difficulty = 'Medium';
    } else {
      difficulty = matchedDiff;
    }
  }

  // 6. Question Text
  const questionText = getVal(
    'questionText',
    'question_text',
    'question',
    'Question Text',
    'Question',
    'problem'
  );
  if (!questionText || typeof questionText !== 'string' || !questionText.trim()) {
    errors.push('Question text is required');
  }

  // 7. Options (Array of at least 2)
  let options = [];
  const rawOptions = getVal('options', 'choices', 'Options', 'Choices');
  if (Array.isArray(rawOptions)) {
    options = rawOptions.map((o) => String(o).trim()).filter(Boolean);
  } else if (typeof rawOptions === 'string' && rawOptions.trim()) {
    try {
      const parsed = JSON.parse(rawOptions);
      if (Array.isArray(parsed)) {
        options = parsed.map((o) => String(o).trim()).filter(Boolean);
      }
    } catch {
      options = rawOptions
        .split(/[|;]/)
        .map((o) => o.trim())
        .filter(Boolean);
    }
  }

  // Fallback to optionA, optionB, etc.
  if (options.length < 2) {
    const individual = [
      getVal('optionA', 'option_a', 'option1', 'Option A', 'A'),
      getVal('optionB', 'option_b', 'option2', 'Option B', 'B'),
      getVal('optionC', 'option_c', 'option3', 'Option C', 'C'),
      getVal('optionD', 'option_d', 'option4', 'Option D', 'D'),
    ].filter((v) => v !== undefined && v !== null && String(v).trim() !== '');

    if (individual.length >= 2) {
      options = individual.map((o) => String(o).trim());
    }
  }

  if (options.length < 2) {
    errors.push('At least 2 non-empty options are required');
  }

  // 8. Correct Answer
  const rawAns = getVal(
    'correctAnswer',
    'correct_answer',
    'answer',
    'Correct Answer',
    'Answer',
    'key'
  );
  let correctAnswer = '';
  if (!rawAns || String(rawAns).trim() === '') {
    errors.push('Correct answer is required');
  } else {
    let clean = String(rawAns).trim();
    // Resolve letter keys like "A", "Option B", "1"
    const letterMatch = clean.match(/^(?:option\s+)?([a-d1-4])$/i);
    if (letterMatch && options.length >= 2) {
      const key = letterMatch[1].toUpperCase();
      const mapIndex = { A: 0, B: 1, C: 2, D: 3, '1': 0, '2': 1, '3': 2, '4': 3 };
      const idx = mapIndex[key];
      if (idx !== undefined && options[idx]) {
        clean = options[idx];
      }
    }

    // Verify option match
    const matchedOption = options.find((opt) => opt.toLowerCase() === clean.toLowerCase());
    if (!matchedOption) {
      errors.push(`Correct answer "${clean}" does not match any of the provided options: [${options.join(', ')}]`);
    } else {
      correctAnswer = matchedOption;
    }
  }

  // 9. Source Reference & Attribution
  const sourceRef = getVal('sourceReference', 'source_reference', 'source', 'Source Reference', 'Source');
  let sourceTitle = getVal('sourceTitle', 'source_title', 'sourceName', 'Source Title') || '';
  let sourceUrl = getVal('sourceUrl', 'source_url', 'sourceLink', 'Source URL', 'URL') || '';

  if (sourceRef && typeof sourceRef === 'string') {
    const trimmedRef = sourceRef.trim();
    if (trimmedRef.startsWith('http://') || trimmedRef.startsWith('https://')) {
      if (!sourceUrl) sourceUrl = trimmedRef;
      if (!sourceTitle) sourceTitle = `${company} ${yearNum} Official Paper Archive`;
    } else {
      if (!sourceTitle) sourceTitle = trimmedRef;
    }
  }

  const subtopic = getVal('subtopic', 'sub_topic', 'Subtopic') || 'General';
  const explanation = getVal('explanation', 'solution', 'rationale', 'Explanation') || '';
  const sourceType = getVal('sourceType', 'source_type') || 'authorized_curated';
  const verificationStatus = getVal('verificationStatus', 'verification_status', 'status') || 'verified';

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      company,
      examName,
      examYear: yearNum,
      topic,
      subtopic: String(subtopic).trim(),
      difficulty,
      questionText: questionText ? String(questionText).trim() : '',
      questionType: 'single_choice',
      options,
      correctAnswer,
      explanation: String(explanation).trim(),
      sourceUrl: String(sourceUrl).trim(),
      sourceTitle: String(sourceTitle).trim(),
      sourceType,
      verificationStatus,
    },
  };
};

/**
 * Checks if question is a duplicate in database or memory store
 */
export const checkIsDuplicate = async (company, questionText) => {
  const contentHash = computeQuestionHash(company, questionText);

  if (mongoose.connection.readyState === 1) {
    try {
      const existing = await AptitudeQuestion.findOne({ contentHash, isArchived: false });
      if (existing) return { isDuplicate: true, existingId: existing._id };
    } catch (e) {
      console.warn('[PYQ Service] Duplicate check DB notice:', e.message);
    }
  }

  const memoryDuplicate = memoryAptitudeQuestions.find(
    (q) => q.contentHash === contentHash && !q.isArchived
  );
  if (memoryDuplicate) {
    return { isDuplicate: true, existingId: memoryDuplicate._id };
  }

  return { isDuplicate: false, existingId: null };
};

/**
 * Retrieves metadata of companies with verified question counts and official patterns
 */
export const getAvailableCompaniesMetadata = async () => {
  let verifiedQuestions = [];

  if (mongoose.connection.readyState === 1) {
    try {
      verifiedQuestions = await AptitudeQuestion.find({
        verificationStatus: 'verified',
        isArchived: false,
      }).select('company examYear topic subtopic difficulty examName');
    } catch (e) {
      console.warn('[PYQ Service] Error fetching companies metadata:', e.message);
    }
  }

  if (verifiedQuestions.length === 0) {
    verifiedQuestions = COMPREHENSIVE_QUESTION_BANK;
  }

  // Aggregate by company
  const companyMap = {};

  verifiedQuestions.forEach((q) => {
    const compName = q.company?.trim();
    if (!compName || compName === 'General Aptitude') return;

    if (!companyMap[compName]) {
      companyMap[compName] = {
        company: compName,
        examNames: new Set(),
        examYears: new Set(),
        topics: new Set(),
        difficulties: new Set(),
        totalQuestions: 0,
      };
    }

    if (q.examName) companyMap[compName].examNames.add(q.examName);
    if (q.examYear) companyMap[compName].examYears.add(q.examYear);
    if (q.topic) companyMap[compName].topics.add(q.topic);
    if (q.difficulty) companyMap[compName].difficulties.add(q.difficulty);
    companyMap[compName].totalQuestions += 1;
  });

  // Ensure all 9 major recruitment companies are included with their exam patterns
  const allTargetCompanies = [
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

  const results = allTargetCompanies.map((compName) => {
    const pattern = COMPANY_EXAM_PATTERNS[compName] || DEFAULT_COMPANY_PATTERN;
    const dbData = companyMap[compName];

    const examYears = dbData ? Array.from(dbData.examYears).sort((a, b) => b - a) : [2024, 2023];
    const totalQuestions = dbData ? dbData.totalQuestions : 15;
    const topics = dbData ? Array.from(dbData.topics) : pattern.primaryCategories;
    const difficulties = dbData ? Array.from(dbData.difficulties) : ['Easy', 'Medium', 'Hard'];

    return {
      company: compName,
      fullName: pattern.fullName || compName,
      examTitle: pattern.examTitle,
      tagline: pattern.tagline,
      intro: pattern.intro,
      isVerifiedPattern: pattern.isVerifiedPattern,
      patternType: pattern.patternType,
      expectedDurationMinutes: pattern.expectedDurationMinutes,
      fullMockQuestionCount: pattern.fullMockQuestionCount,
      practiceQuestionCount: pattern.practiceQuestionCount,
      negativeMarking: pattern.negativeMarking,
      passCutoffPercentage: pattern.passCutoffPercentage,
      difficultyDistribution: pattern.difficultyDistribution,
      sections: pattern.sections,
      primaryCategories: pattern.primaryCategories,
      logoBadge: pattern.logoBadge,
      accentColor: pattern.accentColor,
      examYears,
      topics,
      difficulties,
      totalQuestions,
    };
  });

  // Add any additional custom companies found in DB
  Object.keys(companyMap).forEach((compName) => {
    if (!allTargetCompanies.includes(compName)) {
      const dbData = companyMap[compName];
      results.push({
        company: compName,
        fullName: compName,
        examTitle: `${compName} Placement Assessment`,
        tagline: 'Configured Campus Recruitment Assessment',
        intro: `Aptitude assessment customized for ${compName} campus hiring rounds.`,
        isVerifiedPattern: false,
        patternType: 'Configurable Practice Simulation',
        expectedDurationMinutes: 60,
        fullMockQuestionCount: 20,
        practiceQuestionCount: 10,
        negativeMarking: 0.25,
        passCutoffPercentage: 60,
        difficultyDistribution: { Easy: '30%', Medium: '50%', Hard: '20%' },
        sections: [
          { name: 'Quantitative Aptitude', category: 'Quantitative Aptitude', questions: 7, duration: 20 },
          { name: 'Logical Reasoning', category: 'Logical Reasoning', questions: 7, duration: 20 },
          { name: 'Verbal Ability', category: 'Verbal Ability', questions: 6, duration: 20 },
        ],
        primaryCategories: Array.from(dbData.topics),
        logoBadge: 'bg-slate-700 text-white',
        accentColor: 'border-slate-600 bg-slate-50/50',
        examYears: Array.from(dbData.examYears).sort((a, b) => b - a),
        topics: Array.from(dbData.topics),
        difficulties: Array.from(dbData.difficulties),
        totalQuestions: dbData.totalQuestions,
      });
    }
  });

  return results;
};

/**
 * Returns complete category taxonomy with subtopics and question counts
 */
export const getAptitudeCategoriesMetadata = async () => {
  const categoryStructure = [
    {
      category: 'Quantitative Aptitude',
      description: 'Numerical problem solving, business arithmetic, geometry, and data interpretation',
      subtopics: QUANTITATIVE_SUBTOPICS,
      icon: 'Calculator',
    },
    {
      category: 'Logical Reasoning',
      description: 'Analytical deduction, sequencing, spatial arrangements, and logical conclusions',
      subtopics: LOGICAL_SUBTOPICS,
      icon: 'BrainCircuit',
    },
    {
      category: 'Verbal Ability',
      description: 'Grammar mastery, reading comprehension, critical reasoning, and vocabulary',
      subtopics: VERBAL_SUBTOPICS,
      icon: 'BookOpen',
    },
    {
      category: 'Pseudocode',
      description: 'Bitwise algorithms, loop dry-runs, recursion tracing, and conditional branching',
      subtopics: PSEUDOCODE_SUBTOPICS,
      icon: 'Binary',
    },
    {
      category: 'Programming',
      description: 'Data structures, algorithm complexity, OOP fundamentals, and SQL queries',
      subtopics: PROGRAMMING_SUBTOPICS,
      icon: 'Code2',
    },
  ];

  // Aggregate counts by subtopic from MongoDB
  let subtopicCounts = {};
  if (mongoose.connection.readyState === 1) {
    try {
      const counts = await AptitudeQuestion.aggregate([
        { $match: { isArchived: false, verificationStatus: 'verified' } },
        { $group: { _id: { topic: '$topic', subtopic: '$subtopic' }, count: { $sum: 1 } } },
      ]);
      counts.forEach((c) => {
        const key = `${c._id.topic}_${c._id.subtopic}`;
        subtopicCounts[key] = c.count;
      });
    } catch (e) {
      console.warn('[PYQ Service] Subtopic count aggregation fallback:', e.message);
    }
  }

  const enriched = categoryStructure.map((cat) => {
    let catTotal = 0;
    const subtopicList = cat.subtopics.map((st) => {
      const count = subtopicCounts[`${cat.category}_${st}`] || 1;
      catTotal += count;
      return {
        name: st,
        availableQuestions: count,
      };
    });

    return {
      category: cat.category,
      description: cat.description,
      icon: cat.icon,
      totalSubtopics: cat.subtopics.length,
      totalQuestions: catTotal,
      subtopics: subtopicList,
    };
  });

  return enriched;
};

/**
 * Selects eligible questions for starting a test attempt
 * Never limits a test to 2 questions: seamlessly supplements with verified bank questions
 */
export const selectQuestionsForTest = async ({
  company,
  examYear,
  topic,
  subtopic,
  difficulty,
  questionCount = 10,
  userId,
}) => {
  const desiredCount = Math.max(1, Number(questionCount) || 10);
  const query = {
    verificationStatus: 'verified',
    isArchived: false,
  };

  const isCompanySpecific = company && company !== 'All Companies' && company !== 'General Aptitude';

  if (isCompanySpecific) {
    query.company = new RegExp(`^${company.trim()}$`, 'i');
  }

  if (examYear && !isNaN(Number(examYear)) && examYear !== 'all') {
    query.examYear = Number(examYear);
  }

  if (topic && topic !== 'All Topics') {
    query.topic = topic.trim();
  }

  if (subtopic && subtopic !== 'All Subtopics') {
    query.subtopic = subtopic.trim();
  }

  if (difficulty && difficulty !== 'All Difficulties') {
    query.difficulty = difficulty.trim();
  }

  let candidates = [];
  if (mongoose.connection.readyState === 1) {
    try {
      candidates = await AptitudeQuestion.find(query).lean();
    } catch (e) {
      console.warn('[PYQ Service] Candidate query error, falling back:', e.message);
    }
  }

  // Deduplication map by contentHash or normalized questionText
  const seenHashes = new Set();
  const pool = [];

  candidates.forEach((q) => {
    const hash = q.contentHash || computeQuestionHash(q.company || 'Gen', q.questionText);
    if (!seenHashes.has(hash)) {
      seenHashes.add(hash);
      pool.push(q);
    }
  });

  // Supplement if pool has fewer than desiredCount
  if (pool.length < desiredCount) {
    // 1. First supplement from COMPREHENSIVE_QUESTION_BANK matching company/topic
    const companyMatches = COMPREHENSIVE_QUESTION_BANK.filter((q) => {
      const hash = computeQuestionHash(q.company, q.questionText);
      if (seenHashes.has(hash)) return false;

      if (isCompanySpecific && q.company.toLowerCase() !== company.toLowerCase()) return false;
      if (topic && topic !== 'All Topics' && q.topic.toLowerCase() !== topic.toLowerCase()) return false;
      if (subtopic && subtopic !== 'All Subtopics' && q.subtopic?.toLowerCase() !== subtopic.toLowerCase()) return false;
      if (difficulty && difficulty !== 'All Difficulties' && q.difficulty !== difficulty) return false;
      return true;
    });

    companyMatches.forEach((q) => {
      const hash = computeQuestionHash(q.company, q.questionText);
      if (!seenHashes.has(hash) && pool.length < desiredCount) {
        seenHashes.add(hash);
        pool.push({
          ...q,
          _id: new mongoose.Types.ObjectId().toString(),
        });
      }
    });

    // 2. If still needed, relax difficulty filter for the same company and topic
    if (pool.length < desiredCount) {
      const relaxedCompanyMatches = COMPREHENSIVE_QUESTION_BANK.filter((q) => {
        const hash = computeQuestionHash(q.company, q.questionText);
        if (seenHashes.has(hash)) return false;
        if (isCompanySpecific && q.company.toLowerCase() !== company.toLowerCase()) return false;
        if (topic && topic !== 'All Topics' && q.topic.toLowerCase() !== topic.toLowerCase()) return false;
        return true;
      });

      relaxedCompanyMatches.forEach((q) => {
        const hash = computeQuestionHash(q.company, q.questionText);
        if (!seenHashes.has(hash) && pool.length < desiredCount) {
          seenHashes.add(hash);
          pool.push({
            ...q,
            _id: new mongoose.Types.ObjectId().toString(),
          });
        }
      });
    }

    // 3. If still needed, supplement from TOPIC_QUESTION_CATALOG for the requested topic/subtopic
    if (pool.length < desiredCount) {
      const targetCompName = isCompanySpecific ? company : 'General Aptitude';
      const topicMatches = TOPIC_QUESTION_CATALOG.filter((tq) => {
        const hash = computeQuestionHash(targetCompName, tq.questionText);
        if (seenHashes.has(hash)) return false;
        if (topic && topic !== 'All Topics' && tq.topic.toLowerCase() !== topic.toLowerCase()) return false;
        if (subtopic && subtopic !== 'All Subtopics' && tq.subtopic.toLowerCase() !== subtopic.toLowerCase()) return false;
        return true;
      });

      topicMatches.forEach((tq) => {
        const hash = computeQuestionHash(targetCompName, tq.questionText);
        if (!seenHashes.has(hash) && pool.length < desiredCount) {
          seenHashes.add(hash);
          pool.push({
            company: targetCompName,
            examName: `${targetCompName} Placement Assessment`,
            examYear: 2024,
            topic: tq.topic,
            subtopic: tq.subtopic,
            difficulty: tq.difficulty,
            questionText: tq.questionText,
            options: tq.options,
            correctAnswer: tq.correctAnswer,
            explanation: tq.explanation,
            sourceTitle: `${tq.topic} Practice Set`,
            sourceUrl: 'https://prepilot.ai',
            _id: new mongoose.Types.ObjectId().toString(),
          });
        }
      });
    }

    // 4. If still needed (e.g. for full 20-Q mock), pull from all TOPIC_QUESTION_CATALOG
    if (pool.length < desiredCount) {
      const targetCompName = isCompanySpecific ? company : 'General Aptitude';
      const remainingQuestions = TOPIC_QUESTION_CATALOG.filter((tq) => {
        const hash = computeQuestionHash(targetCompName, tq.questionText);
        return !seenHashes.has(hash);
      });

      remainingQuestions.forEach((tq) => {
        const hash = computeQuestionHash(targetCompName, tq.questionText);
        if (!seenHashes.has(hash) && pool.length < desiredCount) {
          seenHashes.add(hash);
          pool.push({
            company: targetCompName,
            examName: `${targetCompName} Placement Assessment`,
            examYear: 2024,
            topic: tq.topic,
            subtopic: tq.subtopic,
            difficulty: tq.difficulty,
            questionText: tq.questionText,
            options: tq.options,
            correctAnswer: tq.correctAnswer,
            explanation: tq.explanation,
            sourceTitle: `${tq.topic} Practice Set`,
            sourceUrl: 'https://prepilot.ai',
            _id: new mongoose.Types.ObjectId().toString(),
          });
        }
      });
    }
  }

  // Shuffle candidates randomly
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, Math.min(pool.length, desiredCount));

  return {
    availableCount: pool.length,
    selectedQuestions: selected,
  };
};

/**
 * Server-side evaluation of test submission with configurable negative marking
 */
export const gradeTestSubmission = ({
  attempt,
  answers = {},
  timeSpentSeconds = 0,
}) => {
  const marksPerQuestion = attempt.marksPerQuestion || 1.0;
  const negativeMarking = attempt.negativeMarking || 0; // e.g., 0.25

  let totalCorrect = 0;
  let totalIncorrect = 0;
  let totalUnanswered = 0;

  const topicStats = {};

  const evaluatedQuestions = (attempt.questions || []).map((q) => {
    const qIdStr = String(q.questionId?._id || q.questionId);
    const userAnswer = answers[qIdStr] ? String(answers[qIdStr]).trim() : null;
    const isAnswered = Boolean(userAnswer);
    const isCorrect = isAnswered && userAnswer.toLowerCase() === String(q.correctAnswer).trim().toLowerCase();

    // Track topic stats
    const topKey = q.topic || 'General';
    if (!topicStats[topKey]) {
      topicStats[topKey] = { total: 0, correct: 0, incorrect: 0, unanswered: 0 };
    }
    topicStats[topKey].total += 1;

    if (isAnswered) {
      if (isCorrect) {
        totalCorrect += 1;
        topicStats[topKey].correct += 1;
      } else {
        totalIncorrect += 1;
        topicStats[topKey].incorrect += 1;
      }
    } else {
      totalUnanswered += 1;
      topicStats[topKey].unanswered += 1;
    }

    return {
      questionId: q.questionId,
      questionText: q.questionText,
      options: q.options,
      topic: q.topic,
      subtopic: q.subtopic,
      difficulty: q.difficulty,
      company: q.company,
      examYear: q.examYear,
      sourceUrl: q.sourceUrl,
      sourceTitle: q.sourceTitle,
      userAnswer,
      isAnswered,
      isFlagged: Boolean(q.isFlagged),
      isCorrect,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    };
  });

  const totalQuestions = evaluatedQuestions.length;
  const rawScore = Math.max(
    0,
    parseFloat((totalCorrect * marksPerQuestion - totalIncorrect * negativeMarking).toFixed(2))
  );
  const maxScore = parseFloat((totalQuestions * marksPerQuestion).toFixed(2));
  const percentage = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;
  const passCutoff = attempt.passCutoffPercentage || 60;
  const passed = percentage >= passCutoff;

  // Topic breakdown analytics
  const topicBreakdown = Object.entries(topicStats).map(([topicName, stats]) => {
    const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    const score = parseFloat((stats.correct * marksPerQuestion - stats.incorrect * negativeMarking).toFixed(2));
    return {
      topic: topicName,
      total: stats.total,
      correct: stats.correct,
      incorrect: stats.incorrect,
      unanswered: stats.unanswered,
      score: Math.max(0, score),
      accuracy,
    };
  });

  const weakTopics = topicBreakdown
    .filter((t) => t.accuracy < 60)
    .map((t) => t.topic);

  const strongTopics = topicBreakdown
    .filter((t) => t.accuracy >= 75)
    .map((t) => t.topic);

  const recommendations = [];
  if (weakTopics.length > 0) {
    recommendations.push(
      `Focus on foundational speed drills and core formulas in: ${weakTopics.join(', ')}.`
    );
  }
  if (totalIncorrect > totalCorrect && negativeMarking > 0) {
    recommendations.push(
      `Negative marking deducted ${(totalIncorrect * negativeMarking).toFixed(2)} marks. Practice eliminating unlikely options before answering.`
    );
  }
  if (totalUnanswered > totalQuestions * 0.3) {
    recommendations.push(
      'Work on pacing and question selection to attempt all sections within the allotted timer.'
    );
  }
  if (percentage >= 80) {
    recommendations.push(
      'Superb performance! Your aptitude score meets top campus recruitment selection cutoffs.'
    );
  }

  return {
    questions: evaluatedQuestions,
    totalQuestions,
    totalAttempted: totalCorrect + totalIncorrect,
    totalCorrect,
    totalIncorrect,
    totalUnanswered,
    rawScore,
    maxScore,
    percentage,
    passed,
    timeSpentSeconds: Number(timeSpentSeconds) || 0,
    topicBreakdown,
    weakTopics,
    strongTopics,
    recommendations,
  };
};

/**
 * Aggregates candidate performance analytics across companies and categories
 */
export const getUserAptitudeAnalytics = async (userId) => {
  if (!userId) {
    return {
      totalTests: 0,
      totalQuestionsAttempted: 0,
      averageScore: 0,
      passRate: 0,
      companyStats: {},
      categoryStats: {},
      recentAttempts: [],
    };
  }

  let attempts = [];
  if (mongoose.connection.readyState === 1) {
    try {
      attempts = await AptitudeAttempt.find({
        user: userId,
        status: 'completed',
      })
        .sort({ completedAt: -1 })
        .lean();
    } catch (e) {
      console.warn('[PYQ Service] Analytics query error:', e.message);
    }
  }

  if (attempts.length === 0) {
    attempts = memoryAptitudeAttempts.filter(
      (a) => String(a.user) === String(userId) && a.status === 'completed'
    );
  }

  if (attempts.length === 0) {
    return {
      totalTests: 0,
      totalQuestionsAttempted: 0,
      averageScore: 0,
      passRate: 0,
      companyStats: {},
      categoryStats: {},
      recentAttempts: [],
    };
  }

  let totalScoreSum = 0;
  let passedCount = 0;
  let totalAttemptedQuestions = 0;
  const companyStats = {};
  const categoryStats = {};

  attempts.forEach((att) => {
    const comp = att.company || 'General Aptitude';
    const score = att.scorePercentage || 0;
    const isPassed = Boolean(att.passed);

    totalScoreSum += score;
    if (isPassed) passedCount += 1;
    totalAttemptedQuestions += att.totalQuestions || 0;

    // Company stats
    if (!companyStats[comp]) {
      companyStats[comp] = {
        attempts: 0,
        totalScore: 0,
        highestScore: 0,
        passed: 0,
      };
    }
    companyStats[comp].attempts += 1;
    companyStats[comp].totalScore += score;
    companyStats[comp].highestScore = Math.max(companyStats[comp].highestScore, score);
    if (isPassed) companyStats[comp].passed += 1;

    // Category breakdown from attempt evaluation
    if (Array.isArray(att.evaluation?.topicBreakdown)) {
      att.evaluation.topicBreakdown.forEach((tb) => {
        const top = tb.topic || 'General';
        if (!categoryStats[top]) {
          categoryStats[top] = { total: 0, correct: 0, incorrect: 0 };
        }
        categoryStats[top].total += tb.total || 0;
        categoryStats[top].correct += tb.correct || 0;
        categoryStats[top].incorrect += tb.incorrect || 0;
      });
    }
  });

  const totalTests = attempts.length;
  const averageScore = Math.round(totalScoreSum / totalTests);
  const passRate = Math.round((passedCount / totalTests) * 100);

  // Compute average score per company
  Object.keys(companyStats).forEach((comp) => {
    companyStats[comp].averageScore = Math.round(
      companyStats[comp].totalScore / companyStats[comp].attempts
    );
  });

  // Compute accuracy per category
  Object.keys(categoryStats).forEach((cat) => {
    const cs = categoryStats[cat];
    cs.accuracy = cs.total > 0 ? Math.round((cs.correct / cs.total) * 100) : 0;
  });

  return {
    totalTests,
    totalQuestionsAttempted: totalAttemptedQuestions,
    averageScore,
    passRate,
    companyStats,
    categoryStats,
    recentAttempts: attempts.slice(0, 5).map((a) => ({
      id: a._id,
      company: a.company,
      score: a.scorePercentage,
      passed: a.passed,
      date: a.completedAt || a.startedAt,
      totalQuestions: a.totalQuestions,
    })),
  };
};
