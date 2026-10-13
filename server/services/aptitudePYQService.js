import mongoose from 'mongoose';
import AptitudeQuestion, {
  VALID_COMPANIES,
  VALID_TOPICS,
  VALID_DIFFICULTIES,
  computeQuestionHash,
  normalizeQuestionContent,
} from '../models/AptitudeQuestion.js';
import AptitudeAttempt from '../models/AptitudeAttempt.js';

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
  const yearNum = Number(rawYear);
  if (!yearNum || isNaN(yearNum) || yearNum < 2010 || yearNum > new Date().getFullYear() + 1) {
    errors.push('Valid exam year between 2010 and present is required');
  }

  // 3. Exam Name (with smart fallback if omitted)
  let examName = getVal('examName', 'exam_name', 'exam', 'test_name', 'Exam Name');
  if (!examName || typeof examName !== 'string' || !examName.trim()) {
    if (company === 'TCS') examName = 'TCS NQT (National Qualifier Test)';
    else if (company === 'Infosys') examName = 'Infosys INFYTQ & Campus Qualifier';
    else if (company === 'Accenture') examName = 'Accenture Cognitive Assessment';
    else if (company === 'Capgemini') examName = 'Capgemini Excellence Aptitude';
    else if (company === 'Cognizant') examName = 'Cognizant GenC Quantitative Qualifier';
    else if (company === 'Wipro') examName = 'Wipro Elite National Talent Hunt (NTH)';
    else examName = `${company || 'Campus'} ${yearNum || ''} Recruitment Assessment`.trim();
  } else {
    examName = examName.trim();
  }

  // 4. Topic
  let topic = getVal('topic', 'category', 'subject', 'Topic', 'Category');
  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    errors.push(`Topic must be one of: ${VALID_TOPICS.join(', ')}`);
  } else {
    topic = topic.trim();
    const topicLower = topic.toLowerCase();
    if (topicLower.includes('quant') || topicLower.includes('math') || topicLower.includes('numerical') || topicLower.includes('arithmetic')) {
      topic = 'Quantitative Aptitude';
    } else if (topicLower.includes('logic') || topicLower.includes('reasoning') || topicLower.includes('analytical')) {
      topic = 'Logical Reasoning';
    } else if (topicLower.includes('verbal') || topicLower.includes('english') || topicLower.includes('grammar')) {
      topic = 'Verbal Ability';
    } else {
      const match = VALID_TOPICS.find((t) => t.toLowerCase() === topicLower);
      if (match) topic = match;
    }

    if (!VALID_TOPICS.includes(topic)) {
      errors.push(`Topic must be one of: ${VALID_TOPICS.join(', ')}`);
    }
  }

  // 5. Difficulty
  let difficulty = getVal('difficulty', 'level', 'Difficulty', 'Level');
  if (difficulty && typeof difficulty === 'string') {
    const diffLower = difficulty.trim().toLowerCase();
    if (diffLower === 'easy') difficulty = 'Easy';
    else if (diffLower === 'medium') difficulty = 'Medium';
    else if (diffLower === 'hard') difficulty = 'Hard';
  }
  if (!difficulty || !VALID_DIFFICULTIES.includes(difficulty)) {
    difficulty = 'Medium';
  }

  // 6. Question Text
  const questionText = getVal('questionText', 'question_text', 'question', 'text', 'Question Text', 'Question');
  if (!questionText || typeof questionText !== 'string' || questionText.trim().length < 5) {
    errors.push('Question text must be at least 5 characters');
  }

  // 7. Options
  let options = [];
  const rawOptions = getVal('options', 'choices', 'Options', 'Choices');
  const optA = getVal('optionA', 'option_a', 'option 1', 'Option A', 'opt_a');
  const optB = getVal('optionB', 'option_b', 'option 2', 'Option B', 'opt_b');
  const optC = getVal('optionC', 'option_c', 'option 3', 'Option C', 'opt_c');
  const optD = getVal('optionD', 'option_d', 'option 4', 'Option D', 'opt_d');

  if (optA && optB) {
    options = [optA, optB, optC, optD].filter(Boolean).map((o) => String(o).trim());
  } else if (Array.isArray(rawOptions)) {
    options = rawOptions.map((opt) => String(opt).trim()).filter(Boolean);
  } else if (typeof rawOptions === 'string') {
    try {
      const parsed = JSON.parse(rawOptions);
      if (Array.isArray(parsed)) {
        options = parsed.map((o) => String(o).trim()).filter(Boolean);
      }
    } catch {
      // Pipe, semicolon, or slash delimiter
      if (rawOptions.includes('|') || rawOptions.includes(';')) {
        options = rawOptions
          .split(/[|;]/)
          .map((o) => o.trim())
          .filter(Boolean);
      } else if (rawOptions.includes(',')) {
        options = rawOptions
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean);
      } else {
        options = [rawOptions.trim()];
      }
    }
  }

  if (options.length < 2) {
    errors.push('At least two non-empty options are required');
  }

  // 8. Correct Answer
  const rawCorrect = getVal('correctAnswer', 'correct_answer', 'answer', 'correct', 'Correct Answer', 'Answer');
  let correctAnswer = '';
  if (!rawCorrect || typeof rawCorrect !== 'string' || !rawCorrect.trim()) {
    errors.push('Correct answer is required');
  } else {
    let clean = rawCorrect.trim();

    // Map letter/index answers (e.g., 'A', 'Option A', '1') to option values
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
  const verificationStatus = getVal('verificationStatus', 'verification_status', 'status') || 'unverified';

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
 * Retrieves metadata of companies that actually have verified questions in MongoDB
 * "Display only the companies and years for which question data is actually available."
 */
export const getAvailableCompaniesMetadata = async () => {
  let verifiedQuestions = [];

  if (mongoose.connection.readyState === 1) {
    try {
      verifiedQuestions = await AptitudeQuestion.find({
        verificationStatus: 'verified',
        isArchived: false,
      }).select('company examYear topic difficulty examName');
    } catch (e) {
      console.warn('[PYQ Service] Error fetching companies metadata:', e.message);
    }
  }

  if (verifiedQuestions.length === 0) {
    verifiedQuestions = memoryAptitudeQuestions.filter(
      (q) => q.verificationStatus === 'verified' && !q.isArchived
    );
  }

  // Aggregate by company
  const companyMap = {};

  verifiedQuestions.forEach((q) => {
    const compName = q.company?.trim();
    if (!compName) return;

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

  const result = Object.values(companyMap).map((c) => ({
    company: c.company,
    examNames: Array.from(c.examNames),
    examYears: Array.from(c.examYears).sort((a, b) => b - a),
    topics: Array.from(c.topics),
    difficulties: Array.from(c.difficulties),
    totalQuestions: c.totalQuestions,
  }));

  return result;
};

/**
 * Selects eligible questions for starting a test attempt
 */
export const selectQuestionsForTest = async ({
  company,
  examYear,
  topic,
  difficulty,
  questionCount = 10,
  userId,
}) => {
  const query = {
    verificationStatus: 'verified',
    isArchived: false,
  };

  if (company && company !== 'All Companies') {
    query.company = new RegExp(`^${company.trim()}$`, 'i');
  }

  if (examYear && !isNaN(Number(examYear))) {
    query.examYear = Number(examYear);
  }

  if (topic && topic !== 'All Topics') {
    query.topic = topic.trim();
  }

  if (difficulty && difficulty !== 'All Difficulties') {
    query.difficulty = difficulty.trim();
  }

  let candidates = [];
  if (mongoose.connection.readyState === 1) {
    try {
      candidates = await AptitudeQuestion.find(query);
    } catch (e) {
      console.warn('[PYQ Service] Candidate query fallback:', e.message);
    }
  }

  if (candidates.length === 0) {
    // Memory fallback
    candidates = memoryAptitudeQuestions.filter((q) => {
      if (q.verificationStatus !== 'verified' || q.isArchived) return false;
      if (company && company !== 'All Companies' && q.company?.toLowerCase() !== company.toLowerCase()) {
        return false;
      }
      if (examYear && Number(q.examYear) !== Number(examYear)) return false;
      if (topic && topic !== 'All Topics' && q.topic !== topic) return false;
      if (difficulty && difficulty !== 'All Difficulties' && q.difficulty !== difficulty) return false;
      return true;
    });
  }

  if (candidates.length === 0) {
    return {
      availableCount: 0,
      selectedQuestions: [],
    };
  }

  // Shuffle candidates randomly
  const shuffled = [...candidates].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, Math.min(candidates.length, Number(questionCount) || 10));

  return {
    availableCount: candidates.length,
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
  const passed = percentage >= 60; // 60% default cutoff

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
      `Focus on foundational formulas and speed shortcuts in: ${weakTopics.join(', ')}.`
    );
  }
  if (totalIncorrect > totalCorrect && negativeMarking > 0) {
    recommendations.push(
      `Caution: Negative marking deducted ${(totalIncorrect * negativeMarking).toFixed(2)} marks. Practice eliminating unlikely options before guessing.`
    );
  }
  if (totalUnanswered > totalQuestions * 0.3) {
    recommendations.push(
      'Work on time management and speed drills to attempt all questions within the allocated timer.'
    );
  }
  if (percentage >= 80) {
    recommendations.push(
      'Outstanding performance! You are well within the benchmark cutoff for premier tier-1 campus drives.'
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
