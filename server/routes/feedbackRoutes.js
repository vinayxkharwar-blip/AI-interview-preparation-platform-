import express from 'express';
import { getFeedbackBySession } from '../controllers/feedbackController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/session/:sessionId', getFeedbackBySession);

export default router;
