import mongoose from 'mongoose';
import AptitudeQuestion, { computeQuestionHash } from '../models/AptitudeQuestion.js';
import {
  validateQuestionPayload,
  checkIsDuplicate,
  parseCSVToObjects,
  memoryAptitudeQuestions,
} from '../services/aptitudePYQService.js';

/**
 * @desc Import questions from JSON array, raw CSV text, or parsed payload
 * @route POST /api/admin/aptitude/import
 */
export const importAptitudeQuestions = async (req, res) => {
  try {
    let questionsToProcess = [];
    const autoVerify = Boolean(req.body.autoVerify);

    // Support raw array payload, questions property, or csvContent string
    if (Array.isArray(req.body)) {
      questionsToProcess = req.body;
    } else if (Array.isArray(req.body.questions) && req.body.questions.length > 0) {
      questionsToProcess = req.body.questions;
    } else if (typeof req.body.csvContent === 'string' && req.body.csvContent.trim()) {
      questionsToProcess = parseCSVToObjects(req.body.csvContent);
    }

    if (!Array.isArray(questionsToProcess) || questionsToProcess.length === 0) {
      return res.status(400).json({
        message: 'Invalid payload: provide a non-empty array in "questions" or valid CSV string in "csvContent".',
      });
    }

    const report = {
      totalProcessed: questionsToProcess.length,
      importedCount: 0,
      duplicateCount: 0,
      failedCount: 0,
      duplicates: [],
      errors: [],
      importedItems: [],
    };

    const validDocsToInsert = [];

    for (let i = 0; i < questionsToProcess.length; i++) {
      const raw = questionsToProcess[i];
      const validation = validateQuestionPayload(raw);

      if (!validation.isValid) {
        report.failedCount += 1;
        report.errors.push({
          index: i,
          questionText: raw.questionText?.substring(0, 50) || raw.question_text?.substring(0, 50) || 'Unknown',
          reasons: validation.errors,
        });
        continue;
      }

      const sanitized = validation.sanitized;

      // Duplicate detection in database / existing memory
      const dupCheck = await checkIsDuplicate(sanitized.company, sanitized.questionText);
      const contentHash = computeQuestionHash(sanitized.company, sanitized.questionText);
      const isBatchDuplicate = validDocsToInsert.some((d) => d.contentHash === contentHash);

      if (dupCheck.isDuplicate || isBatchDuplicate) {
        report.duplicateCount += 1;
        report.duplicates.push({
          index: i,
          company: sanitized.company,
          questionText: sanitized.questionText.substring(0, 60),
          existingId: dupCheck.existingId || 'intra_batch_duplicate',
        });
        continue;
      }

      const qId = new mongoose.Types.ObjectId().toString();

      const doc = {
        _id: qId,
        id: qId,
        ...sanitized,
        contentHash,
        verificationStatus: autoVerify ? 'verified' : sanitized.verificationStatus || 'unverified',
        isArchived: false,
        createdBy: req.user?._id || req.user?.id || null,
        verifiedBy: autoVerify ? req.user?._id || req.user?.id || null : null,
        verifiedAt: autoVerify ? new Date() : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      validDocsToInsert.push(doc);
    }

    if (validDocsToInsert.length > 0) {
      let insertedDocs = [...validDocsToInsert];

      if (mongoose.connection.readyState === 1) {
        try {
          await AptitudeQuestion.insertMany(validDocsToInsert, { ordered: false });
        } catch (dbErr) {
          // If bulk write encountered duplicate keys or specific record failures
          if (dbErr.writeErrors && dbErr.writeErrors.length > 0) {
            const failedIndexes = new Set(dbErr.writeErrors.map((we) => we.index));
            insertedDocs = validDocsToInsert.filter((_, idx) => !failedIndexes.has(idx));
            report.duplicateCount += dbErr.writeErrors.length;
            console.warn(`[Admin Import DB Warning] ${dbErr.writeErrors.length} duplicates intercepted at DB level.`);
          } else {
            console.warn('[Admin Import DB Warning]', dbErr.message);
          }
        }
      }

      insertedDocs.forEach((d) => {
        if (!memoryAptitudeQuestions.some((mq) => mq.contentHash === d.contentHash)) {
          memoryAptitudeQuestions.push(d);
        }
      });

      report.importedCount = insertedDocs.length;
      report.importedItems = insertedDocs.map((d) => ({
        id: d._id,
        company: d.company,
        examName: d.examName,
        examYear: d.examYear,
        topic: d.topic,
        questionText: d.questionText,
        verificationStatus: d.verificationStatus,
      }));
    }

    res.status(201).json({
      message: `Import completed: ${report.importedCount} imported, ${report.duplicateCount} duplicates skipped, ${report.failedCount} errors.`,
      report,
    });
  } catch (error) {
    console.error('[Admin Import Error]', error);
    res.status(500).json({ message: error.message || 'Server error during question import' });
  }
};

/**
 * @desc Get all questions with filters, search, and pagination for admin review
 * @route GET /api/admin/aptitude/questions
 */
export const getAdminAptitudeQuestions = async (req, res) => {
  try {
    const {
      company,
      examYear,
      topic,
      difficulty,
      verificationStatus,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = { isArchived: false };

    if (company && company !== 'all') {
      filter.company = new RegExp(`^${company.trim()}$`, 'i');
    }
    if (examYear && !isNaN(Number(examYear))) {
      filter.examYear = Number(examYear);
    }
    if (topic && topic !== 'all') {
      filter.topic = topic.trim();
    }
    if (difficulty && difficulty !== 'all') {
      filter.difficulty = difficulty.trim();
    }
    if (verificationStatus && verificationStatus !== 'all') {
      filter.verificationStatus = verificationStatus.trim();
    }
    if (search && search.trim()) {
      filter.questionText = new RegExp(search.trim(), 'i');
    }

    let questions = [];
    let total = 0;

    if (mongoose.connection.readyState === 1) {
      try {
        total = await AptitudeQuestion.countDocuments(filter);
        questions = await AptitudeQuestion.find(filter)
          .sort({ createdAt: -1 })
          .skip((Number(page) - 1) * Number(limit))
          .limit(Number(limit));
      } catch (e) {
        console.warn('[Admin DB Notice] Query fallback:', e.message);
      }
    }

    if (questions.length === 0 && memoryAptitudeQuestions.length > 0) {
      const filtered = memoryAptitudeQuestions.filter((q) => {
        if (q.isArchived) return false;
        if (company && company !== 'all' && q.company?.toLowerCase() !== company.toLowerCase()) return false;
        if (examYear && Number(q.examYear) !== Number(examYear)) return false;
        if (topic && topic !== 'all' && q.topic !== topic) return false;
        if (difficulty && difficulty !== 'all' && q.difficulty !== difficulty) return false;
        if (verificationStatus && verificationStatus !== 'all' && q.verificationStatus !== verificationStatus) return false;
        if (search && !q.questionText?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });
      total = filtered.length;
      questions = filtered.slice((Number(page) - 1) * Number(limit), Number(page) * Number(limit));
    }

    res.json({
      questions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  } catch (error) {
    console.error('[Admin getAdminAptitudeQuestions Error]', error);
    res.status(500).json({ message: error.message || 'Failed to fetch admin questions' });
  }
};

/**
 * @desc Verify an imported question
 * @route POST /api/admin/aptitude/questions/:id/verify
 */
export const verifyQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    let question = null;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      question = await AptitudeQuestion.findById(id);
    }
    if (!question) {
      question = memoryAptitudeQuestions.find((q) => String(q._id) === String(id) || String(q.id) === String(id));
    }

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    question.verificationStatus = 'verified';
    question.verifiedBy = req.user._id || req.user.id;
    question.verifiedAt = new Date();

    if (mongoose.connection.readyState === 1 && typeof question.save === 'function') {
      await question.save();
    }

    res.json({
      message: 'Question successfully verified and unlocked for student test engines.',
      question,
    });
  } catch (error) {
    console.error('[Admin verifyQuestion Error]', error);
    res.status(500).json({ message: error.message || 'Failed to verify question' });
  }
};

/**
 * @desc Update question details
 * @route PATCH /api/admin/aptitude/questions/:id
 */
export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    let question = null;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      question = await AptitudeQuestion.findById(id);
    }
    if (!question) {
      question = memoryAptitudeQuestions.find((q) => String(q._id) === String(id) || String(q.id) === String(id));
    }

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const allowedFields = [
      'company',
      'examName',
      'examYear',
      'topic',
      'subtopic',
      'difficulty',
      'questionText',
      'options',
      'correctAnswer',
      'explanation',
      'sourceUrl',
      'sourceTitle',
      'sourceType',
      'verificationStatus',
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        question[field] = updates[field];
      }
    });

    if (updates.questionText || updates.company) {
      question.contentHash = computeQuestionHash(question.company, question.questionText);
    }

    if (mongoose.connection.readyState === 1 && typeof question.save === 'function') {
      await question.save();
    }

    res.json({
      message: 'Question updated successfully',
      question,
    });
  } catch (error) {
    console.error('[Admin updateQuestion Error]', error);
    res.status(500).json({ message: error.message || 'Failed to update question' });
  }
};

/**
 * @desc Archive or remove question
 * @route DELETE /api/admin/aptitude/questions/:id
 */
export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    let question = null;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      question = await AptitudeQuestion.findById(id);
    }
    if (!question) {
      question = memoryAptitudeQuestions.find((q) => String(q._id) === String(id) || String(q.id) === String(id));
    }

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    question.isArchived = true;
    if (mongoose.connection.readyState === 1 && typeof question.save === 'function') {
      await question.save();
    }

    res.json({
      message: 'Question archived successfully and removed from student test pool.',
      id,
    });
  } catch (error) {
    console.error('[Admin deleteQuestion Error]', error);
    res.status(500).json({ message: error.message || 'Failed to archive question' });
  }
};
