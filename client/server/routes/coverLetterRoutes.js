import express from 'express';
import { generateCoverLetter } from '../controllers/coverLetterController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/', generateCoverLetter);

export default router;
