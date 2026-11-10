import express from 'express';
import {
  getAvailableCompanies,
  getCompanyPattern,
  getAptitudeCategories,
  getAptitudeAnalytics,
  getFilteredQuestionsInfo,
  startAptitudeTest,
  submitAptitudeTest,
  getAptitudeTestResult,
  getUserAttempts,
} from '../controllers/aptitudePYQController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public metadata of companies, patterns, categories, and available filters
router.get('/companies', getAvailableCompanies);
router.get('/companies/:company/pattern', getCompanyPattern);
router.get('/categories', getAptitudeCategories);
router.get('/questions', getFilteredQuestionsInfo);

// Protected student test sessions, attempts, and analytics
router.get('/analytics', protect, getAptitudeAnalytics);
router.post('/tests/start', protect, startAptitudeTest);
router.post('/tests/:testId/submit', protect, submitAptitudeTest);
router.get('/tests/:testId/result', protect, getAptitudeTestResult);
router.get('/attempts', protect, getUserAttempts);

export default router;
