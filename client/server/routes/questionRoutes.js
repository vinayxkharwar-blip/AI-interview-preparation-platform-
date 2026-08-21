import express from 'express';
import { getQuestionsBySession } from '../controllers/questionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/session/:sessionId', getQuestionsBySession);

export default router;
