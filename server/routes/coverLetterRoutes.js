import express from 'express';
import { generateCoverLetter } from '../controllers/coverLetterController.js';
import { protect } from '../middleware/authMiddleware.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(protect);

router.post('/', aiLimiter, generateCoverLetter);

export default router;
