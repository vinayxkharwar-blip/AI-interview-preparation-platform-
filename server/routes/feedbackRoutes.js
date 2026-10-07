import express from 'express';
import { getFeedbackBySession, handleCoachQuery } from '../controllers/feedbackController.js';
import { protect } from '../middleware/authMiddleware.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(protect);

router.get('/session/:sessionId', getFeedbackBySession);
router.post('/coach', aiLimiter, handleCoachQuery);

export default router;
